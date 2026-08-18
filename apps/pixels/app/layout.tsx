import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans-src" });
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-src",
});

const SITE = "https://pixels.vercel.app";
const TITLE = "Design Pixels";
const DESCRIPTION =
  "Build small pixel scenes with patterns, stamps, palettes, and layers.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: TITLE,
  authors: [{ name: "Bridger Tower", url: "https://bridger.to" }],
  creator: "Bridger Tower",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eeeeee" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
