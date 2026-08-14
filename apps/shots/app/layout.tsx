import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const sans = Geist({ variable: "--font-sans-src", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono-src", subsets: ["latin"] });

const SITE = "https://design-shots.com";
const TITLE = "Design Shots — turn a screenshot into a product shot";
const DESCRIPTION =
  "Drop in a screenshot and get a clean product shot back. Four neutral " +
  "backgrounds, a handful of good settings, and nothing else. Free, open " +
  "source, and composed entirely in your browser.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Design Shots",
  authors: [{ name: "Bridger Tower", url: "https://bridger.to" }],
  creator: "Bridger Tower",
  keywords: [
    "screenshot",
    "product shot",
    "mockup generator",
    "screenshot beautifier",
    "og image",
    "design tool",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Design Shots",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#151515" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
