import { createPrismaClient } from "../../lib/prismaClient";
import prepareTestDatabase from "../../test/setup/integrationGlobal";
import { getTestDatabaseUrl } from "../../test/setup/testDatabaseUrl";
import { type BrowserContext, type CDPSession, type Page, expect, test } from "@playwright/test";

// Real passkey ceremonies in Chrome, using its virtual authenticator in place of Face ID or a
// password manager. Runs only against the local test database (see playwright.config.ts).

const db = createPrismaClient(getTestDatabaseUrl());

type Credential = {
  credentialId: string;
  isResidentCredential: boolean;
  rpId?: string;
  privateKey: string;
  userHandle?: string;
  signCount: number;
};

// A browser profile with its own passkey device, like a separate phone.
async function newDevice(context: BrowserContext): Promise<{ page: Page; cdp: CDPSession; authenticatorId: string }> {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return { page, cdp, authenticatorId };
}

// An anonymous account with some points, as if this device had just scanned books.
async function earnPointsAnonymously(page: Page, points: number) {
  await page.goto("/");
  // Starting passkey setup creates the anonymous account and its session cookie.
  await page.request.post("/api/passkey/register/options", { headers: { referer: "http://localhost:3000/" } });
  const account = await db.account.findFirstOrThrow({ orderBy: { createdAt: "desc" } });
  await db.account.update({ where: { id: account.id }, data: { points } });
  await page.reload();
  return account;
}

test.beforeAll(() => {
  prepareTestDatabase();
});
test.beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE TABLE "PointEvent", "Passkey", "Account" CASCADE');
});
test.afterAll(() => db.$disconnect());

test("save points with a passkey, then sign in on another device", async ({ browser }) => {
  // Phone: earn points, then save them with a passkey.
  const phoneContext = await browser.newContext();
  const phone = await newDevice(phoneContext);
  const account = await earnPointsAnonymously(phone.page, 45);

  await expect(phone.page.getByText("45 points")).toBeVisible();
  await phone.page.getByRole("button", { name: "Save with passkey" }).click();
  await expect(phone.page.getByText("Points saved to your passkey")).toBeVisible();
  await expect(phone.page.getByText(account.displayName)).toBeVisible();
  await expect(phone.page.getByRole("button", { name: "Save with passkey" })).toHaveCount(0);

  const stored = await db.passkey.findMany({ where: { accountId: account.id } });
  expect(stored).toHaveLength(1);
  expect(await db.account.count()).toBe(1);

  // The passkey syncs to a laptop (as iCloud Keychain or a password manager would).
  const { credentials } = (await phone.cdp.send("WebAuthn.getCredentials", {
    authenticatorId: phone.authenticatorId,
  })) as { credentials: Credential[] };
  const laptopContext = await browser.newContext();
  const laptop = await newDevice(laptopContext);
  await laptop.cdp.send("WebAuthn.addCredential", {
    authenticatorId: laptop.authenticatorId,
    credential: credentials[0],
  });

  // Laptop: a new visitor, until they sign in.
  await laptop.page.goto("/");
  await expect(laptop.page.getByText("0 points")).toBeVisible();
  await laptop.page.getByRole("button", { name: "Sign in" }).click();
  await expect(laptop.page.getByText("Signed in")).toBeVisible();
  await expect(laptop.page.getByText("45 points")).toBeVisible();
  await expect(laptop.page.getByText(account.displayName)).toBeVisible();

  await phoneContext.close();
  await laptopContext.close();
});

test("points earned before signing in join the passkey account", async ({ browser }) => {
  const phoneContext = await browser.newContext();
  const phone = await newDevice(phoneContext);
  const owner = await earnPointsAnonymously(phone.page, 100);
  await phone.page.getByRole("button", { name: "Save with passkey" }).click();
  await expect(phone.page.getByText("Points saved to your passkey")).toBeVisible();
  const { credentials } = (await phone.cdp.send("WebAuthn.getCredentials", {
    authenticatorId: phone.authenticatorId,
  })) as { credentials: Credential[] };

  // A tablet earns 10 points anonymously, then signs in with the same passkey.
  const tabletContext = await browser.newContext();
  const tablet = await newDevice(tabletContext);
  await tablet.cdp.send("WebAuthn.addCredential", {
    authenticatorId: tablet.authenticatorId,
    credential: credentials[0],
  });
  const anonymous = await earnPointsAnonymously(tablet.page, 10);
  await expect(tablet.page.getByText("10 points")).toBeVisible();

  await tablet.page.getByRole("button", { name: "Sign in" }).click();
  await expect(tablet.page.getByText("Signed in")).toBeVisible();

  await expect(tablet.page.getByText("110 points")).toBeVisible();
  expect((await db.account.findUniqueOrThrow({ where: { id: owner.id } })).points).toBe(110);
  expect((await db.account.findUniqueOrThrow({ where: { id: anonymous.id } })).points).toBe(0);

  await phoneContext.close();
  await tabletContext.close();
});

test("a new visitor creates an account with a passkey, without earning points first", async ({ browser }) => {
  const phoneContext = await browser.newContext();
  const phone = await newDevice(phoneContext);

  await phone.page.goto("/");
  await expect(phone.page.getByText("0 points")).toBeVisible();
  await phone.page.getByRole("button", { name: "Create account" }).click();
  await expect(phone.page.getByText("Account created. Your passkey signs you in on any device.")).toBeVisible();

  const account = await db.account.findFirstOrThrow({ include: { passkeys: true } });
  expect(account.passkeys).toHaveLength(1);
  await expect(phone.page.getByText(account.displayName)).toBeVisible();
  await expect(phone.page.getByRole("button", { name: "Create account" })).toHaveCount(0);
  await expect(phone.page.getByRole("button", { name: "Sign in" })).toHaveCount(0);

  await phoneContext.close();
});

test("rename and remove a passkey on the account page; a removed passkey no longer signs in", async ({ browser }) => {
  const phoneContext = await browser.newContext();
  const phone = await newDevice(phoneContext);
  await phone.page.goto("/");
  await phone.page.getByRole("button", { name: "Create account" }).click();
  await expect(phone.page.getByText("Account created. Your passkey signs you in on any device.")).toBeVisible();

  const { credentials } = (await phone.cdp.send("WebAuthn.getCredentials", {
    authenticatorId: phone.authenticatorId,
  })) as { credentials: Credential[] };
  expect(credentials).toHaveLength(1);

  await phone.page.goto("/account");
  const passkeys = phone.page.getByRole("region", { name: "Your passkeys" });
  await expect(passkeys.getByText(/Added .+ from Chrome on/)).toBeVisible();
  await expect(passkeys.getByText("Not used to sign in yet.", { exact: false })).toBeVisible();

  await passkeys.getByRole("button", { name: /^Rename / }).click();
  await passkeys.getByLabel("Passkey name").fill("Test phone");
  await passkeys.getByRole("button", { name: "Save" }).click();
  await expect(passkeys.getByText("Test phone")).toBeVisible();
  expect((await db.passkey.findFirstOrThrow()).name).toBe("Test phone");

  await passkeys.getByRole("button", { name: "Remove Test phone" }).click();
  await expect(passkeys.getByText(/This is your only passkey/)).toBeVisible();
  await passkeys.getByRole("button", { name: "Remove passkey" }).click();
  await expect(phone.page.getByText("Passkey removed. It no longer signs in.")).toBeVisible();
  await expect(phone.page.getByText(/Only on this browser for now/)).toBeVisible();
  expect((await db.passkey.findFirstOrThrow()).revokedAt).not.toBeNull();

  // Chrome passes the site's signal on to the device, which forgets the removed passkey.
  await expect
    .poll(async () => {
      const left = (await phone.cdp.send("WebAuthn.getCredentials", { authenticatorId: phone.authenticatorId })) as {
        credentials: Credential[];
      };
      return left.credentials.length;
    })
    .toBe(0);

  // A password manager that missed the signal still offers it, but the site no longer accepts it.
  await phone.cdp.send("WebAuthn.addCredential", {
    authenticatorId: phone.authenticatorId,
    credential: credentials[0],
  });
  await phone.page.getByRole("button", { name: "I already have a passkey: Sign in" }).click();
  await expect(phone.page.getByText(/This passkey was removed from its ArLib.me account/)).toBeVisible();

  await phoneContext.close();
});
