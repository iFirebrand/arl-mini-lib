import prepareTestDatabase from "../../test/setup/integrationGlobal";
import { getTestDatabaseUrl } from "../../test/setup/testDatabaseUrl";
import { type BrowserContext, type CDPSession, type Page, expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

// Real passkey ceremonies in Chrome, using its virtual authenticator in place of Face ID or a
// password manager. Runs only against the local test database (see playwright.config.ts).

const db = new PrismaClient({ datasourceUrl: getTestDatabaseUrl() });

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
