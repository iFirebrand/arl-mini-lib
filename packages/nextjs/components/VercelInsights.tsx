"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Automated browsers (our own hourly smoke tests, CI) set navigator.webdriver; leave them out of
// the numbers so they don't eat into the free monthly allowance or skew page views.
export const isAutomatedBrowser = () => typeof navigator !== "undefined" && navigator.webdriver === true;

// Cookie-free page views and real-visitor performance, collected by Vercel.
export const VercelInsights = () => (
  <>
    <Analytics beforeSend={event => (isAutomatedBrowser() ? null : event)} />
    <SpeedInsights beforeSend={event => (isAutomatedBrowser() ? null : event)} />
  </>
);
