"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ABOUT, AT_A_LIBRARY, HOME, MAP, type NavLink, STATS, isActive } from "./navigation";

const TABS: NavLink[] = [HOME, MAP, AT_A_LIBRARY, STATS, ABOUT];

// Phone and tablet navigation, within thumb reach. "At a library" is the main action, so it stands out.
export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-base-300/70 bg-base-100/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm xl:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(tab => {
          const active = isActive(tab, pathname) || (tab === STATS && pathname.startsWith("/stats"));
          const Icon = tab.icon;
          const primary = tab === AT_A_LIBRARY;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 pb-2 pt-1.5 text-[0.7rem] font-medium ${
                  active ? "text-base-content" : "text-base-content/60"
                }`}
              >
                <span
                  className={
                    primary
                      ? "-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-neutral text-neutral-content shadow-card ring-4 ring-base-100"
                      : `flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-secondary" : ""}`
                  }
                >
                  <Icon className={primary ? "h-6 w-6" : "h-5 w-5"} aria-hidden="true" />
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
