"use client";

import { memo } from "react";

import { cn } from "@/lib/utils";

export type CellState = "unanswered" | "answered" | "correct" | "incorrect";

export interface GridItem {
  position: number;
  sectionId: number;
  state: CellState;
  marked: boolean;
}

const Cell = memo(function Cell({
  position,
  state,
  marked,
  current,
  onJump,
}: {
  position: number;
  state: CellState;
  marked: boolean;
  current: boolean;
  onJump: (p: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onJump(position)}
      aria-label={`Question ${position}${marked ? ", marked for review" : ""}${state !== "unanswered" ? ", answered" : ""}`}
      aria-current={current ? "step" : undefined}
      className={cn(
        "tabular relative h-9 rounded-md border text-xs font-bold transition-colors",
        state === "unanswered" && "border-line-strong bg-surface text-ink-soft hover:border-forest-700",
        state === "answered" && "border-forest-700 bg-forest-700 text-white",
        state === "correct" && "border-success bg-success text-white",
        state === "incorrect" && "border-danger bg-danger text-white",
        current && "ring-2 ring-gold-500 ring-offset-1",
      )}
    >
      {position}
      {marked && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-gold-500" aria-hidden />}
    </button>
  );
});

export function QuestionGrid({
  items,
  sections,
  current,
  onJump,
}: {
  items: GridItem[];
  sections: { id: number; name: string }[];
  current: number;
  onJump: (p: number) => void;
}) {
  const answered = items.filter((i) => i.state !== "unanswered").length;
  const marked = items.filter((i) => i.marked).length;
  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <Count label="Answered" value={answered} className="text-forest-900" />
        <Count label="Unanswered" value={items.length - answered} className="text-ink-soft" />
        <Count label="Marked" value={marked} className="text-gold-700" />
      </div>
      {sections.map((s) => {
        const list = items.filter((i) => i.sectionId === s.id);
        if (!list.length) return null;
        return (
          <div key={s.id} className="mb-4">
            {sections.length > 1 && <p className="mb-2 text-xs font-bold text-muted">{s.name}</p>}
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-6 xl:grid-cols-7">
              {list.map((i) => (
                <Cell
                  key={i.position}
                  position={i.position}
                  state={i.state}
                  marked={i.marked}
                  current={i.position === current}
                  onJump={onJump}
                />
              ))}
            </div>
          </div>
        );
      })}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3 text-xs text-muted">
        <Legend className="bg-forest-700" label="Answered" />
        <Legend className="border border-line-strong bg-surface" label="Not answered" />
        <Legend className="bg-gold-500" label="Marked" round />
      </div>
    </div>
  );
}

function Count({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-md bg-paper px-2 py-2">
      <p className={cn("tabular text-lg font-extrabold", className)}>{value}</p>
      <p className="text-[11px] font-semibold text-muted">{label}</p>
    </div>
  );
}

function Legend({ className, label, round }: { className: string; label: string; round?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-3 w-3", round ? "rounded-full" : "rounded-sm", className)} aria-hidden />
      {label}
    </span>
  );
}
