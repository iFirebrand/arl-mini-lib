"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LoginOrCreateAccountModal } from "./PointsModal";
import { RainbowKitCustomConnectButton } from "./scaffold-eth";
import { useAccount } from "wagmi";
import {
  Bars3Icon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  MapIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { usePoints } from "~~/app/contexts/PointsContext";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { useOutsideClick } from "~~/hooks/scaffold-eth";
import { decrypt, encrypt } from "~~/lib/encryption";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Map",
    href: "/browse",
    icon: <MapIcon className="h-4 w-4" />,
  },
  {
    label: "@Lib",
    href: "/libs",
    icon: <span className="loading loading-ring loading-sm"></span>,
  },
  {
    label: "About",
    href: "/about",
    icon: <InformationCircleIcon className="h-4 w-4" />,
  },
  {
    label: "",
    href: "#",
    icon: <SwitchTheme className="h-4 w-4" />,
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "bg-secondary shadow-md" : ""
              } hover:bg-secondary hover:shadow-md focus:!bg-secondary active:!text-neutral py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

const fetchUserPoints = async (address: string) => {
  try {
    const response = await fetch(`/api/points/${address}`);
    const data = await response.json();
    return data.points || 0;
  } catch (error) {
    console.error("Error fetching points:", error);
    return 0;
  }
};

export const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const burgerMenuRef = useRef<HTMLDivElement>(null);
  const { address, isConnected } = useAccount();
  const [userPoints, setUserPoints] = useState(0);

  // Fetch points when wallet connection changes
  useEffect(() => {
    const updatePoints = async () => {
      if (isConnected && address) {
        const points = await fetchUserPoints(address);
        setUserPoints(points);
      } else {
        setUserPoints(0);
      }
    };

    updatePoints();
  }, [isConnected, address]);

  const openPointsModal = () => {
    const modal = document.getElementById("points-modal") as HTMLDialogElement;
    if (modal) {
      modal.showModal();
    }
  };

  useOutsideClick(
    burgerMenuRef,
    useCallback(() => setIsDrawerOpen(false), []),
  );

  const bankPoints = async () => {
    const { points, getPointActions, clearTemporaryPoints } = usePoints();

    if (points > 0) {
      const response = await fetch("/api/points/bank", {
        method: "POST",
        body: JSON.stringify({
          address: userAddress,
          pointActions: getPointActions(),
        }),
      });

      if (response.ok) {
        clearTemporaryPoints();
      }
    }
  };

  return (
    <div className="sticky lg:static top-0 navbar bg-base-100 min-h-0 flex-shrink-0 justify-between z-20 shadow-md shadow-secondary px-0 sm:px-2">
      <div className="navbar-start w-auto lg:w-1/2">
        <div className="lg:hidden dropdown" ref={burgerMenuRef}>
          <label
            tabIndex={0}
            className={`ml-1 btn btn-ghost ${isDrawerOpen ? "hover:bg-secondary" : "hover:bg-transparent"}`}
            onClick={() => {
              setIsDrawerOpen(prevIsOpenState => !prevIsOpenState);
            }}
          >
            <Bars3Icon className="h-1/2" />
          </label>
          {isDrawerOpen && (
            <ul
              tabIndex={0}
              className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52 z-30"
              onClick={() => {
                setIsDrawerOpen(false);
              }}
            >
              <HeaderMenuLinks />
            </ul>
          )}
        </div>
        <Link href="/" passHref className="hidden lg:flex items-center gap-2 ml-4 mr-6 shrink-0">
          <div className="flex relative w-10 h-10">
            <Image alt="logo" className="cursor-pointer" fill src="/logo.svg" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold leading-tight">ARLib.me (alpha)</span>
            <span className="text-xs">Arlington Mini Libraries</span>
          </div>
        </Link>
        <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end flex-grow mr-4">
        <div className="flex gap-3 items-center">
          {isConnected ? (
            <button className="btn btn-primary btn-sm px-4 rounded-full">
              <StarIcon className="h-4 w-4 mr-1" />
              <span>{userPoints} points</span>
            </button>
          ) : (
            <button className="btn btn-primary btn-sm px-4 rounded-full" onClick={openPointsModal}>
              <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
              <span>0 points</span>
            </button>
          )}
          <RainbowKitCustomConnectButton />
        </div>
      </div>
      <LoginOrCreateAccountModal id="points-modal" />
    </div>
  );
};
