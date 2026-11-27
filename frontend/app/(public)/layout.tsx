import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { LinkButton } from "@/components/ui/button";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-semibold text-ink-soft md:flex">
            <Link href="/#how" className="hover:text-forest-900">How it works</Link>
            <Link href="/#hat" className="hover:text-forest-900">HAT</Link>
            <Link href="/#usat" className="hover:text-forest-900">USAT</Link>
            <Link href="/#features" className="hover:text-forest-900">Features</Link>
          </nav>
          <div className="flex items-center gap-2">
            <LinkButton href="/login" variant="ghost" size="sm">Log in</LinkButton>
            <LinkButton href="/register" size="sm">Start free</LinkButton>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line bg-surface text-ink-soft">
        <div className="container-page flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo />
            <p className="mt-2 text-sm text-ink-soft">Your Next Step Starts Here.</p>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <p className="text-xs text-muted">© {new Date().getFullYear()} QADAM. Preparation platform for HAT &amp; USAT.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
