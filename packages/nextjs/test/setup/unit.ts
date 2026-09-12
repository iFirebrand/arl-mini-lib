import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// Unit tests must never reach a real database or Supabase project.
// lib/supabase.ts throws at import time without these, so give it harmless values.
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.test";
process.env.NEXT_PUBLIC_SUPABASE_KEY = "test-key";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
delete process.env.DATABASE_URL;
delete process.env.DIRECT_URL;

// The app logs liberally (including expected errors); keep test output readable.
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  // API route tests opt into the node environment, which has no DOM.
  if (typeof window !== "undefined") {
    cleanup();
    window.localStorage.clear();
  }
});
