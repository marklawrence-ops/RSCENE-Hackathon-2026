import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import { AppShell } from "@/components/shell/app-shell";
import Script from "next/script";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AGOS · Circular Water",
  description:
    "Plan safe reuse of greywater and rain per barangay, and keep non-potable needs running when the main supply fails.",
  applicationName: "AGOS",
  appleWebApp: { capable: true, title: "AGOS", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#168d98",
  width: "device-width",
  initialScale: 1,
};

// Registered by an inline script so it is in the HTML itself (install checkers such as PWABuilder
// look there), and only in production so dev hot reload is never served from a stale cache.
const REGISTER_SW = `if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(function (err) {
      console.error("Service worker registration failed", err);
    });
  });
}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
        {process.env.NODE_ENV === "production" && (
          <Script id="register-sw" strategy="beforeInteractive">
            {REGISTER_SW}
          </Script>
        )}
      </body>
    </html>
  );
}
