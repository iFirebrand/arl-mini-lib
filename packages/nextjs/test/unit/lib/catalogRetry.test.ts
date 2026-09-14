import { jsonResponse } from "../../fixtures/openLibrary";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogsUnavailableError, RETRY_DELAY_MS, withOneRetry } from "~~/app/libs/[id]/catalogRetry";

const DOWN = () => jsonResponse({ error: "Could not reach the book catalogs" }, 502);
const OK = () => jsonResponse({ book: null });

describe("withOneRetry", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // Runs the request while letting the retry delay pass.
  const run = async (promise: Promise<Response>) => {
    const settled = promise.then(
      value => ({ value }),
      error => ({ error }),
    );
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
    return settled;
  };

  it("returns the first answer when the catalogs answered", async () => {
    const send = vi.fn().mockImplementation(async () => OK());
    expect(await run(withOneRetry(send))).toMatchObject({ value: { status: 200 } });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("tries once more, a second later, when the catalogs were down", async () => {
    const send = vi
      .fn()
      .mockImplementationOnce(async () => DOWN())
      .mockImplementationOnce(async () => OK());
    expect(await run(withOneRetry(send))).toMatchObject({ value: { status: 200 } });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("gives up after the second try", async () => {
    const send = vi.fn().mockImplementation(async () => DOWN());
    const { error } = (await run(withOneRetry(send))) as { error: unknown };
    expect(error).toBeInstanceOf(CatalogsUnavailableError);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it.each([400, 404, 429, 500])("doesn't retry a %i, which retrying won't fix", async status => {
    const send = vi.fn().mockImplementation(async () => jsonResponse({}, status));
    expect(await run(withOneRetry(send))).toMatchObject({ value: { status } });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("retries network errors only when asked to", async () => {
    const offline = () => vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const once = offline();
    expect(await run(withOneRetry(once))).toMatchObject({ error: expect.any(TypeError) });
    expect(once).toHaveBeenCalledTimes(1);

    const twice = offline();
    const { error } = (await run(withOneRetry(twice, { retryNetworkErrors: true }))) as { error: unknown };
    expect(error).toBeInstanceOf(CatalogsUnavailableError);
    expect(twice).toHaveBeenCalledTimes(2);
  });
});
