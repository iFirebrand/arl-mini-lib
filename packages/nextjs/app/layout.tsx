import { Figtree, Fraunces } from "next/font/google";
import Script from "next/script";
import "leaflet/dist/leaflet.css";
import { AppWithProviders } from "~~/components/AppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import { VercelInsights } from "~~/components/VercelInsights";
import { getMetadata } from "~~/lib/metadata";
import "~~/styles/globals.css";

// Fraunces for headings (a bookish serif), Figtree for everything else. Self-hosted by next/font.
const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz", "SOFT"] });
const body = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const viewport = {
  // Lets the bottom tab bar sit above the iPhone home indicator (env(safe-area-inset-bottom)).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#212638" },
  ],
};

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
    <html suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
      <body className="font-sans antialiased">
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
