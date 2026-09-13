import React from "react";
import {
  ChartBarIcon,
  HomeIcon,
  InformationCircleIcon,
  MapIcon,
  MapPinIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

export type NavLink = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Also active on these path prefixes. */
  matches?: string[];
};

export const HOME: NavLink = { label: "Home", href: "/", icon: HomeIcon };
export const MAP: NavLink = { label: "Map", href: "/browse", icon: MapIcon, matches: ["/browse/"] };
// Finds the library you're standing at, or adds it; then you scan its books.
export const AT_A_LIBRARY: NavLink = { label: "At a library", href: "/libs", icon: MapPinIcon, matches: ["/libs/"] };
export const STATS: NavLink = { label: "Stats", href: "/stats", icon: ChartBarIcon };
export const CHARACTER: NavLink = { label: "Character", href: "/stats/personality", icon: SparklesIcon };
export const ABOUT: NavLink = { label: "About", href: "/about", icon: InformationCircleIcon, matches: ["/watch"] };
export const MODERATE: NavLink = { label: "Moderate", href: "/moderate", icon: ShieldCheckIcon };

export const isActive = (link: NavLink, pathname: string) =>
  pathname === link.href || (link.matches ?? []).some(prefix => pathname.startsWith(prefix));
