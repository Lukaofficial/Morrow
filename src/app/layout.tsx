import type { Metadata, Viewport } from "next";
import { Newsreader, Sofia_Sans, Sofia_Sans_Condensed, Sofia_Sans_Extra_Condensed } from "next/font/google";
import "./globals.css";

const extraCondensed = Sofia_Sans_Extra_Condensed({
  subsets: ["latin", "latin-ext"],
  variable: "--font-extra-condensed",
  display: "swap",
});

const condensed = Sofia_Sans_Condensed({
  subsets: ["latin", "latin-ext"],
  variable: "--font-condensed",
  display: "swap",
});

const sans = Sofia_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Newsreader({
  subsets: ["latin", "latin-ext"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Morrow — Go to bed in one city. Wake up in another.",
    template: "%s — Morrow",
  },
  description:
    "Morrow runs sleeper trains across Europe: six lines, twenty-four cities, and a real bed. A fictional company and a working booking system.",
};

export const viewport: Viewport = {
  themeColor: "#ff4f23",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${extraCondensed.variable} ${condensed.variable} ${sans.variable} ${serif.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
