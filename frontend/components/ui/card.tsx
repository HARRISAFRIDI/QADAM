import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-lg border border-line bg-surface shadow-card", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h3 className="text-base font-bold">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const tones = {
  neutral: "bg-paper text-ink-soft border-line",
  forest: "bg-forest-50 text-forest-800 border-forest-100",
  gold: "bg-gold-100 text-gold-700 border-gold-200",
  success: "bg-success-soft text-success border-[#cfe6d8]",
  danger: "bg-danger-soft text-danger border-[#f2cfcb]",
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Alert({
  tone = "danger",
  children,
  className,
}: {
  tone?: "danger" | "success" | "info";
  children: ReactNode;
  className?: string;
}) {
  const t = {
    danger: "border-[#f2cfcb] bg-danger-soft text-danger",
    success: "border-[#cfe6d8] bg-success-soft text-success",
    info: "border-forest-100 bg-forest-50 text-forest-800",
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-md border px-3.5 py-2.5 text-sm", t, className)}>
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-forest-50 text-forest-700">{icon}</div>}
      <p className="font-bold text-forest-950">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-line/70", className)} />;
}

export function StatTile({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "neutral" | "success" | "danger" | "gold";
}) {
  const color = { neutral: "text-forest-950", success: "text-success", danger: "text-danger", gold: "text-gold-700" }[tone];
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3.5 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("tabular mt-1 text-2xl font-bold", color)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function ProgressBar({ value, className, tone = "forest" }: { value: number; className?: string; tone?: "forest" | "gold" }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-sage-100", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", tone === "gold" ? "bg-gold-500" : "bg-forest-700")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
