import Script from "next/script";
import "leaflet/dist/leaflet.css";
import { AppWithProviders } from "~~/components/AppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
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
      <head>
        <Script strategy="afterInteractive" src="https://www.googletagmanager.com/gtag/js?id=G-205LFRGM0L" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-205LFRGM0L');
          `}
        </Script>
      </head>
      <body>
        <ThemeProvider enableSystem>
          <AppWithProviders>{children}</AppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
