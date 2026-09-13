"use client";

import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "react-hot-toast";
import { AccountProvider } from "~~/app/contexts/AccountContext";
import { BottomNav } from "~~/components/BottomNav";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";

export const AppWithProviders = ({ children }: { children: React.ReactNode }) => (
  <>
    <ProgressBar height="3px" color="#0057B7" options={{ showSpinner: false }} />
    <AccountProvider>
      {/* Bottom padding on phones keeps content clear of the tab bar. */}
      <div className="flex min-h-screen flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] xl:pb-0">
        <Header />
        <main className="relative flex flex-1 flex-col">{children}</main>
        <Footer />
      </div>
      <BottomNav />
      <Toaster position="top-center" containerStyle={{ top: 72 }} />
    </AccountProvider>
  </>
);
