"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useIsClient } from "~~/hooks/useIsClient";

export const SwitchTheme = () => {
  const { setTheme, resolvedTheme } = useTheme();
  // The theme is only known in the browser.
  const mounted = useIsClient();
  const isDarkMode = resolvedTheme === "dark";

  if (!mounted) return <span className="h-9 w-9" aria-hidden="true" />;

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm btn-circle"
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDarkMode ? "light" : "dark")}
    >
      {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  );
};
