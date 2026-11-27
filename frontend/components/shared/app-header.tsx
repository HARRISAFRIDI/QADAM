import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import type { Me } from "@/lib/api/types";

import { NavLinks } from "./nav-links";

export function AppHeader({ me, admin = false }: { me: Me; admin?: boolean }) {
  const links = admin
    ? [
        { href: "/admin", label: "Overview" },
        { href: "/admin/questions", label: "Questions" },
        { href: "/admin/import", label: "Import" },
        { href: "/admin/mocks", label: "Mock tests" },
        { href: "/admin/essays", label: "Essays" },
        { href: "/admin/papers", label: "Papers" },
        { href: "/admin/taxonomy", label: "Structure" },
        { href: "/admin/students", label: "Students" },
      ]
    : [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/history", label: "History" },
        { href: "/profile", label: "Profile" },
      ];
  const initials = me.full_name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="container-page flex h-14 items-center gap-4">
        <Logo href={admin ? "/admin" : "/dashboard"} />
        {admin && (
          <span className="rounded-full bg-forest-50 px-2 py-0.5 text-xs font-semibold text-forest-800">
            Admin
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {me.role === "admin" && (
            <Link
              href={admin ? "/dashboard" : "/admin"}
              className="hidden text-sm font-semibold text-forest-700 hover:underline sm:inline"
            >
              {admin ? "Student view" : "Admin panel"}
            </Link>
          )}
          <span
            title={me.full_name}
            className="grid h-8 w-8 place-items-center rounded-full bg-forest-900 text-xs font-bold text-white"
          >
            {initials}
          </span>
          {/* Plain <a>: a prefetching <Link> would log the user out. */}
          <a href="/logout" className="text-sm font-semibold text-muted hover:text-danger">
            Log out
          </a>
        </div>
      </div>
      <NavLinks links={links} />
    </header>
  );
}
