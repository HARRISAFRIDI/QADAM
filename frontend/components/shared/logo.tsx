import Link from "next/link";

import { cn } from "@/lib/utils";

/** Mark: three ascending steps - "Qadam" means step. Pure SVG, no image request. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("h-8 w-8", className)}>
      <rect width="32" height="32" rx="8" fill="#2563eb" />
      <rect x="6" y="19" width="6" height="7" rx="1.5" fill="#93c5fd" />
      <rect x="13" y="13" width="6" height="13" rx="1.5" fill="#dbeafe" />
      <rect x="20" y="6" width="6" height="20" rx="1.5" fill="#ffffff" />
    </svg>
  );
}

export function Logo({ href = "/", inverted = false, className }: { href?: string; inverted?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label="QADAM home">
      <LogoMark />
      <span className="flex items-baseline gap-2">
        <span className={cn("text-lg font-extrabold tracking-[0.08em]", inverted ? "text-white" : "text-forest-950")}>
          QADAM
        </span>
        <span lang="ur" dir="rtl" className={cn("font-urdu text-base leading-none", inverted ? "text-forest-100" : "text-forest-700")}>
          قدم
        </span>
      </span>
    </Link>
  );
}
