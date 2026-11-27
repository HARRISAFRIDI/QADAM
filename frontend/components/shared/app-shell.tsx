"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BookOpen,
  Brain,
  CalendarCheck,
  ClipboardList,
  FileQuestion,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  MessagesSquare,
  Network,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Repeat,
  Target,
  Timer,
  Upload,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";

import { Logo, LogoMark } from "@/components/shared/logo";
import type { Me } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const SIDEBAR_COOKIE = "qadam_sidebar";

type Item = { href: string; label: string; icon: typeof Target; soon?: boolean; exact?: boolean };
type Group = { title?: string; items: Item[] };

const STUDENT: Group[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true }] },
  {
    title: "Prepare",
    items: [
      { href: "/study-plans", label: "Study Plans", icon: CalendarCheck },
      { href: "/learn", label: "Learn", icon: BookOpen, soon: true },
      { href: "/practice", label: "Practice", icon: Target },
      { href: "/quizzes", label: "Quizzes", icon: Zap },
      { href: "/mocks", label: "Mock Tests", icon: Timer },
      { href: "/memorize", label: "Memorize", icon: Brain },
      { href: "/mistakes", label: "Mistake Notebook", icon: NotebookPen },
    ],
  },
  {
    title: "Community",
    items: [
      { href: "/forum", label: "Discussion Forum", icon: MessagesSquare, soon: true },
      { href: "/more", label: "More", icon: LayoutGrid },
    ],
  },
];

const ADMIN: Group[] = [
  { items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true }] },
  {
    title: "Content",
    items: [
      { href: "/admin/questions", label: "Questions", icon: FileQuestion },
      { href: "/admin/import", label: "Import", icon: Upload },
      { href: "/admin/mocks", label: "Mock tests", icon: ClipboardList },
      { href: "/admin/essays", label: "Essays", icon: PenLine },
      { href: "/admin/papers", label: "Papers", icon: FileText },
      { href: "/admin/decks", label: "Flashcards", icon: Brain },
      { href: "/admin/taxonomy", label: "Structure", icon: Network },
    ],
  },
  { title: "People", items: [{ href: "/admin/students", label: "Students", icon: Users }] },
];

export function AppShell({
  me,
  admin = false,
  initialCollapsed = false,
  children,
}: {
  me: Me;
  admin?: boolean;
  initialCollapsed?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  // The phone drawer remembers the page it was opened on, so it closes by itself after navigating.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const mobileOpen = openOn === pathname;
  const setMobileOpen = (open: boolean) => setOpenOn(open ? pathname : null);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
  }

  const groups = admin ? ADMIN : STUDENT;
  const home = admin ? "/admin" : "/dashboard";

  return (
    <div className="min-h-dvh">
      {/* Phone top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/95 px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-sage-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <Logo href={home} />
      </header>

      {/* Drawer backdrop (phones) */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-ink/40 md:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-surface transition-[width,transform] duration-200 md:z-30",
          mobileOpen ? "translate-x-0 shadow-raised" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-[76px]" : "md:w-64",
        )}
        aria-label="Main navigation"
      >
        {/* Brand + collapse */}
        <div className={cn("flex h-16 shrink-0 items-center gap-2 px-4", collapsed && "md:justify-center md:px-0")}>
          <span className={cn(collapsed && "md:hidden")}>
            <Logo href={home} />
          </span>
          {collapsed && (
            <Link href={home} className="hidden md:block" aria-label="QADAM home">
              <LogoMark />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-sage-100 md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Test track */}
        {!admin && me.preferred_category && (
          <div className={cn("px-3 pb-2", collapsed && "md:hidden")}>
            <Link
              href="/account#track"
              className="flex items-center gap-3 rounded-xl border border-blue-100 bg-linear-to-r from-blue-50 to-indigo-50 px-3 py-2.5 transition-colors hover:border-blue-200"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 text-[11px] font-extrabold text-white">
                {me.target_exam}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Your track</span>
                <span className="block truncate text-sm font-bold text-forest-950">{me.preferred_category}</span>
              </span>
              <Repeat className="h-4 w-4 shrink-0 text-blue-600" aria-label="Switch test" />
            </Link>
          </div>
        )}
        {admin && (
          <p className={cn("px-5 pb-2 text-xs font-bold uppercase tracking-wide text-indigo-600", collapsed && "md:hidden")}>
            Admin panel
          </p>
        )}

        <nav className="flex-1 overflow-y-auto px-3 pb-4 [scrollbar-width:thin]">
          {groups.map((g, gi) => (
            <div key={gi} className={cn(gi > 0 && "mt-5")}>
              {g.title && (
                <p className={cn("mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-sage-500", collapsed && "md:hidden")}>
                  {g.title}
                </p>
              )}
              {g.title && collapsed && <hr className="mx-3 mb-2 hidden border-line md:block" />}
              <ul className="space-y-0.5">
                {g.items.map((it) => (
                  <li key={it.href}>
                    <NavItem item={it} active={isActive(pathname, it)} collapsed={collapsed} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer: account */}
        <div className="shrink-0 space-y-1 border-t border-line p-3">
          {!admin && (
            <NavItem
              item={{ href: "/account", label: "My Account", icon: UserRound }}
              active={pathname.startsWith("/account")}
              collapsed={collapsed}
            />
          )}
          {me.role === "admin" && (
            <NavItem
              item={{ href: admin ? "/dashboard" : "/admin", label: admin ? "Student view" : "Admin panel", icon: admin ? UserRound : LayoutGrid }}
              active={false}
              collapsed={collapsed}
            />
          )}
          <div className={cn("flex items-center gap-3 rounded-xl px-2 py-2", collapsed && "md:justify-center md:px-0")}>
            <span
              title={me.full_name}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-violet-500 to-fuchsia-600 text-xs font-bold text-white"
            >
              {initials(me.full_name)}
            </span>
            <span className={cn("min-w-0 flex-1", collapsed && "md:hidden")}>
              <span className="block truncate text-sm font-bold text-forest-950">{me.full_name}</span>
              <span className="block truncate text-xs text-muted">{me.email}</span>
            </span>
            {/* Plain <a>: a prefetching <Link> would log the user out. */}
            <a
              href="/logout"
              title="Log out"
              aria-label="Log out"
              className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-rose-50 hover:text-rose-600", collapsed && "md:hidden")}
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </a>
          </div>
          <button
            type="button"
            onClick={toggle}
            className="hidden w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-sage-100 hover:text-forest-950 md:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="mx-auto h-5 w-5" aria-hidden /> : <PanelLeftClose className="h-5 w-5" aria-hidden />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      <div className={cn("transition-[padding] duration-200", collapsed ? "md:pl-[76px]" : "md:pl-64")}>
        <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 md:py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function isActive(pathname: string, it: Item) {
  if (it.exact) return pathname === it.href;
  if (it.href === "/practice") return pathname.startsWith("/practice") || pathname.startsWith("/prepare");
  return pathname === it.href || pathname.startsWith(`${it.href}/`);
}

function NavItem({ item, active, collapsed }: { item: Item; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
        active ? "bg-blue-50 text-blue-700" : "text-ink-soft hover:bg-sage-100 hover:text-forest-950",
        collapsed && "md:justify-center md:px-0",
      )}
    >
      {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-linear-to-b from-blue-500 to-indigo-600" aria-hidden />}
      <Icon
        className={cn("h-5 w-5 shrink-0", active ? "text-blue-600" : "text-sage-500 group-hover:text-ink-soft")}
        aria-hidden
      />
      <span className={cn("flex-1 truncate", collapsed && "md:sr-only")}>{item.label}</span>
      {item.soon && (
        <span className={cn("rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700", collapsed && "md:hidden")}>
          Soon
        </span>
      )}
    </Link>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
