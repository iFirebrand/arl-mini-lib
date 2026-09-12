import { vi } from "vitest";

// In-memory stand-in for next/headers' cookies(): remembers what the code sets so the next call
// reads it back, the way a browser would.
export function createCookieJar() {
  const values = new Map<string, string>();
  const options = new Map<string, Record<string, unknown>>();
  return {
    values,
    options,
    get: vi.fn((name: string) => (values.has(name) ? { name, value: values.get(name) as string } : undefined)),
    set: vi.fn((name: string, value: string, opts: Record<string, unknown> = {}) => {
      values.set(name, value);
      options.set(name, opts);
    }),
    delete: vi.fn((name: string) => {
      values.delete(name);
    }),
    clear() {
      values.clear();
      options.clear();
    },
  };
}
