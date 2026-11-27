import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Circular progress (pure SVG, no JS). `value` is 0-100. */
export function Ring({
  value,
  size = 72,
  stroke = 8,
  className,
  trackClass = "stroke-sage-100",
  barClass = "stroke-blue-600",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClass?: string;
  barClass?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClass} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className={barClass}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">{children}</span>
    </div>
  );
}
