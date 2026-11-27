"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Clock3 } from "lucide-react";

import { cn, formatDuration } from "@/lib/utils";

/**
 * Isolated countdown: only this component re-renders every second.
 * Remaining time = server deadline - (device now + clock offset), so a wrong
 * device clock cannot extend the exam. The server enforces the deadline anyway.
 */
export const Timer = memo(function Timer({
  deadline,
  offsetMs,
  onExpire,
  compact = false,
}: {
  deadline: string;
  offsetMs: number;
  onExpire: () => void;
  compact?: boolean;
}) {
  const end = new Date(deadline).getTime();
  const calc = () => Math.max(0, Math.round((end - (Date.now() + offsetMs)) / 1000));
  const [left, setLeft] = useState(calc);
  const fired = useRef(false);
  const expireRef = useRef(onExpire);

  useEffect(() => {
    expireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const tick = () => {
      const l = Math.max(0, Math.round((end - (Date.now() + offsetMs)) / 1000));
      setLeft(l);
      if (l === 0 && !fired.current) {
        fired.current = true;
        expireRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [end, offsetMs]);

  const warn = left <= 300;
  const critical = left <= 60;
  return (
    <span
      role="timer"
      aria-live={critical ? "assertive" : "off"}
      aria-label={`Time remaining ${formatDuration(left)}`}
      className={cn(
        "tabular inline-flex items-center gap-1.5 rounded-md font-bold transition-colors",
        compact ? "px-2 py-1 text-sm" : "px-3 py-1.5 text-base",
        critical ? "animate-pulse bg-danger text-white" : warn ? "bg-gold-500 text-forest-950" : "bg-forest-900 text-white",
      )}
    >
      <Clock3 className="h-4 w-4" aria-hidden />
      {formatDuration(left)}
    </span>
  );
});
