"use client";

import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "react-hot-toast";
import { AccountProvider } from "~~/app/contexts/AccountContext";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";

export const AppWithProviders = ({ children }: { children: React.ReactNode }) => (
  <>
    <ProgressBar height="3px" color="#2299dd" />
    <AccountProvider>
      <div className={`flex flex-col min-h-screen `}>
        <Header />
        <main className="relative flex flex-col flex-1">{children}</main>
        <Footer />
      </div>
      <Toaster />
    </AccountProvider>
  </>
);
