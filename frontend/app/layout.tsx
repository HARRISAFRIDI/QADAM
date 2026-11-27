import type { Metadata, Viewport } from "next";
import { Noto_Nastaliq_Urdu, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

// One variable font file covers every weight we use (400-800).
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

// Urdu phrases on the landing page and dashboard only. Not preloaded: the file is
// large, and the browser fetches it only on pages that actually render Urdu text
// (the `urdu` utility). One weight, because only 400 is used.
const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-nastaliq",
});

export const metadata: Metadata = {
  title: { default: "QADAM - HAT & USAT Preparation", template: "%s | QADAM" },
  description:
    "QADAM (قدم) - Your Next Step Starts Here. Subject and section practice, full-length mock tests, USAT essays, results and detailed solutions for HAT and USAT.",
  applicationName: "QADAM",
};

export const viewport: Viewport = {
  themeColor: "#0b6b3a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${nastaliq.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
