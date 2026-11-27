import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Check, Clock3 } from "lucide-react";

import type { Hue } from "@/lib/palette";
import { cn } from "@/lib/utils";

/** Placeholder for a section that ships in a later phase. */
export function ComingSoon({
  icon,
  hue,
  title,
  description,
  features,
  meanwhile,
}: {
  icon: ReactNode;
  hue: Hue;
  title: string;
  description: string;
  features: string[];
  meanwhile: { href: string; label: string }[];
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className={cn("relative overflow-hidden rounded-3xl px-6 py-8 text-white sm:px-10 sm:py-10", hue.grad)}>
        <span className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" aria-hidden />
        <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30">{icon}</span>
        <p className="relative mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">
          <Clock3 className="h-3.5 w-3.5" aria-hidden /> Coming soon
        </p>
        <h1 className="relative mt-3 text-3xl font-extrabold text-white sm:text-4xl">{title}</h1>
        <p className="relative mt-2 max-w-xl text-white/90">{description}</p>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-card">
          <h2 className="text-base font-bold">What you will get</h2>
          <ul className="mt-4 space-y-3">
            {features.map((f) => (
              <li key={f} className="flex gap-3 text-sm text-ink-soft">
                <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full", hue.soft, hue.text)}>
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-card">
          <h2 className="text-base font-bold">Meanwhile, you can</h2>
          <ul className="mt-4 space-y-2">
            {meanwhile.map((m) => (
              <li key={m.href}>
                <Link
                  href={m.href}
                  className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm font-semibold text-forest-950 transition-colors hover:border-blue-200 hover:bg-blue-50"
                >
                  {m.label} <ArrowRight className="h-4 w-4 text-blue-600" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
