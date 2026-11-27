import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const field =
  "w-full rounded-md border border-line-strong bg-surface px-3 text-[15px] text-ink placeholder:text-muted/70 transition-colors focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-100 disabled:bg-paper disabled:text-muted";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(field, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(field, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(field, "h-11 cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-semibold text-ink-soft", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
