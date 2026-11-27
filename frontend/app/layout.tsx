import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

// One variable font file covers every weight we use (400-800).
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: { default: "QADAM - HAT & USAT Preparation", template: "%s | QADAM" },
  description:
    "QADAM (قدم) - Your Next Step Starts Here. Topic-wise practice, full-length mock tests, USAT essays, results and detailed solutions for HAT and USAT.",
  applicationName: "QADAM",
};

export const viewport: Viewport = {
  themeColor: "#0f3d2e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
