import { LRUCache } from "lru-cache";

type Options = {
  // How many distinct tokens (e.g. IPs) to track at once.
  uniqueTokenPerInterval?: number;
  interval?: number;
  // Requests allowed per token per interval. Defaults to uniqueTokenPerInterval for older callers.
  limit?: number;
};

export function rateLimit(options?: Options) {
  const tokenCache = new LRUCache<string, number>({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000,
  });
  const limit = options?.limit || options?.uniqueTokenPerInterval || 500;

  return {
    check: (token: string) => {
      // noUpdateTTL keeps the window fixed from the first request instead of sliding on every hit.
      const count = (tokenCache.get(token) || 0) + 1;
      tokenCache.set(token, count, { noUpdateTTL: count > 1 });
      return { success: count <= limit };
    },
  };
}
