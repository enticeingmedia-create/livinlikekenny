import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Livin' Like Kenny | Virtual Tiki Hut",
  description: "The always-open tropical hangout for Livin' Like Kenny listeners.",
  manifest: "/manifest.json",
  icons: [{ rel: "icon", url: "/icon.svg" }]
};

export const viewport: Viewport = {
  themeColor: "#02B8CF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
