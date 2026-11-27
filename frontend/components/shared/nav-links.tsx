"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="container-page -mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]">
      {links.map((l) => {
        const root = l.href === "/admin" || l.href === "/dashboard";
        const active = root ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
              active ? "border-forest-900 text-forest-950" : "border-transparent text-muted hover:text-forest-900",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
