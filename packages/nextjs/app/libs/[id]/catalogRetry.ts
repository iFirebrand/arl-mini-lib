// The book catalogs (OpenLibrary, Google Books) sometimes fail for a moment; one quiet retry
// usually gets through, so people don't have to scan the same book twice.

/** Thrown when the catalogs still didn't answer after a retry. */
export class CatalogsUnavailableError extends Error {
  constructor() {
    super("The book catalogs didn't answer");
    this.name = "CatalogsUnavailableError";
  }
}

export const RETRY_DELAY_MS = 1000;

// Our API answers 502 when a catalog it needed didn't answer.
const CATALOG_DOWN = new Set([502, 503, 504]);

/**
 * Sends a request, and once more after a second if the catalogs were down (or, when
 * `retryNetworkErrors` is set, if the request never arrived). Returns the final response.
 */
export async function withOneRetry(
  send: () => Promise<Response>,
  { retryNetworkErrors = false } = {},
): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    let response: Response | null = null;
    try {
      response = await send();
    } catch (error) {
      if (!retryNetworkErrors) throw error;
      if (attempt === 2) throw new CatalogsUnavailableError();
    }
    if (response && !CATALOG_DOWN.has(response.status)) return response;
    if (attempt === 2) throw new CatalogsUnavailableError();
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
  }
}
