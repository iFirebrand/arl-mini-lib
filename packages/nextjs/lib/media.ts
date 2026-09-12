import IMAGE_HOSTS from "./imageHosts.json";

// Stored links and image URLs come from users, so every page renders them through these helpers.

export const PLACEHOLDER_BOOK_COVER =
  "https://dtmqxpohipopgolmirik.supabase.co/storage/v1/object/public/altbucket/ARLib.png";
export const PLACEHOLDER_LIBRARY_IMAGE =
  "https://dtmqxpohipopgolmirik.supabase.co/storage/v1/object/public/library-images/site-images/placeholder-library.jpeg?t=2024-12-15T15%3A45%3A04.162Z";

const parse = (url: string | null | undefined) => {
  try {
    return url ? new URL(url) : null;
  } catch {
    return null;
  }
};

/**
 * An image URL next/image can load, or the fallback. next/image throws on hosts missing from
 * next.config.js, which would take the whole page down.
 */
export function safeImageSrc(src: string | null | undefined, fallback: string): string {
  const url = parse(src);
  return url && url.protocol === "https:" && IMAGE_HOSTS.includes(url.hostname) ? url.href : fallback;
}

/** An http(s) link, or "#". Blocks javascript:, data: and other script-capable URLs. */
export function safeLinkHref(href: string | null | undefined): string {
  const url = parse(href);
  return url && (url.protocol === "https:" || url.protocol === "http:") ? url.href : "#";
}
