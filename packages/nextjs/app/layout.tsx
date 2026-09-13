import Script from "next/script";
import "leaflet/dist/leaflet.css";
import { AppWithProviders } from "~~/components/AppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import { VercelInsights } from "~~/components/VercelInsights";
import { getMetadata } from "~~/lib/metadata";
import "~~/styles/globals.css";

export const metadata = {
  ...getMetadata({
    title: "ArLib.me",
    description: "Arlington Mini Library App",
  }),
  icons: {
    icon: "/logo.svg",
    apple: "/apple-touch-icon.png",
  },
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <body>
        {/* next/script places these itself; inside a hand-written <head> React 19 warns. */}
        <Script strategy="afterInteractive" src="https://www.googletagmanager.com/gtag/js?id=G-205LFRGM0L" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            // Automated browsers (smoke tests) aren't visitors.
            if (!navigator.webdriver) gtag('config', 'G-205LFRGM0L');
          `}
        </Script>
        <ThemeProvider enableSystem>
          <AppWithProviders>{children}</AppWithProviders>
        </ThemeProvider>
        <VercelInsights />
      </body>
    </html>
  );
};

export default RootLayout;
