"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountWidget } from "./AccountWidget";
import { ABOUT, AT_A_LIBRARY, CHARACTER, MAP, MODERATE, STATS, isActive } from "./navigation";
import { useAccountContext } from "~~/app/contexts/AccountContext";
import { SwitchTheme } from "~~/components/SwitchTheme";

// Top bar on every page. Below 1280px wide the page links move to the bottom tab bar (BottomNav).
export const Header = () => {
  const pathname = usePathname();
  const { account } = useAccountContext();
  const links = [MAP, AT_A_LIBRARY, STATS, CHARACTER, ABOUT, ...(account?.isModerator ? [MODERATE] : [])];

  return (
    <header className="sticky top-0 z-30 border-b border-base-300/70 bg-base-100/90 backdrop-blur supports-[backdrop-filter]:bg-base-100/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="ArLib.me home">
          <Image alt="" src="/logo.svg" width={36} height={36} className="h-9 w-9" priority />
          <span className="flex flex-col leading-none">
            <span className="flex items-center gap-1.5 font-display text-lg font-semibold tracking-tight">
              ArLib.me
              <span className="rounded-full bg-secondary px-1.5 py-0.5 font-sans text-[0.625rem] font-semibold uppercase tracking-wider text-secondary-content">
                alpha
              </span>
            </span>
            <span className="mt-1 hidden text-xs text-base-content/70 sm:block">Arlington Mini Libraries</span>
          </span>
        </Link>

        <nav aria-label="Main" className="ml-4 hidden xl:block">
          <ul className="flex items-center gap-1">
            {links.map(link => {
              const active = isActive(link, pathname);
              const Icon = link.icon;
              return (
                <li key={link.href} className="whitespace-nowrap">
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      active ? "bg-secondary text-secondary-content" : "text-base-content/80 hover:bg-base-200"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <SwitchTheme />
          <AccountWidget />
        </div>
      </div>
    </header>
  );
};
