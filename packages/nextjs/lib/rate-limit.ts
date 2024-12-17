import { LRUCache } from "lru-cache";

type Options = {
  uniqueTokenPerInterval?: number;
  interval?: number;
};

export function rateLimit(options?: Options) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000,
  });

  return {
    check: (token: string) => {
      const tokenCount = (tokenCache.get(token) as number[]) || [0];
      if (tokenCount[0] === 0) {
        tokenCache.set(token, [1]);
        return { success: true };
      }
      tokenCount[0] += 1;
      tokenCache.set(token, tokenCount);
      const currentUsage = tokenCount[0];
      const isRateLimited = currentUsage >= (options?.uniqueTokenPerInterval || 500);
      return { success: !isRateLimited };
    },
  };
}
