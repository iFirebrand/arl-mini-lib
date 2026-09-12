"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useIsClient } from "~~/hooks/useIsClient";

export const SwitchTheme = ({ className }: { className?: string }) => {
  const { setTheme, resolvedTheme } = useTheme();
  // The theme is only known in the browser.
  const mounted = useIsClient();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const isDarkMode = resolvedTheme === "dark";

  const handleToggle = () => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    if (isDarkMode) {
      setTheme("light");
    } else {
      setTheme("dark");
    }

    // Prevent multiple toggles for 500ms
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };

  if (!mounted) return null;

  return (
    <div className={`h-5 w-5 ${className}`}>
      <div onClick={handleToggle} className="cursor-pointer">
        {isDarkMode ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-5 w-5" />}
      </div>
    </div>
  );
};
