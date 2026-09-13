import React from "react";
import Image from "next/image";
import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="border-t border-base-300/70 bg-base-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-base-content/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Image alt="" src="/logo.svg" width={28} height={28} className="h-7 w-7" />
          <p>
            Experimental public goods community project{" "}
            <span role="img" aria-label="Ukraine and United States flags">
              🇺🇦 🇺🇸
            </span>
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          <li>
            <Link href="/about" className="hover:text-base-content">
              About
            </Link>
          </li>
          <li>
            <Link href="/watch" className="hover:text-base-content">
              How it works
            </Link>
          </li>
          <li>
            <Link href="/account" className="hover:text-base-content">
              Your account
            </Link>
          </li>
          <li>
            <a
              href="https://github.com/iFirebrand/arl-mini-lib"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-base-content"
            >
              Source code
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
};
