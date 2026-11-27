"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, Layers, Play } from "lucide-react";

import { Badge } from "@/components/ui/card";
import { Spinner } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api/client";
import type { SectionOut } from "@/lib/api/types";
import { hueAt, type Hue } from "@/lib/palette";
import { cn } from "@/lib/utils";

const COUNTS = [10, 20, 30, 50];

export function PracticePanel({ category, sections }: { category: string; sections: SectionOut[] }) {
  const router = useRouter();
  const [count, setCount] = useState(20);
  const [timed, setTimed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const multiSubject = sections.filter((s) => s.subjects.length > 1);

  async function start(mode: "subject" | "section", refId: number, key: string) {
    setBusy(key);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/practice", {
        method: "POST",
        body: { category, mode, ref_id: refId, count, timed },
      });
      router.push(`/attempt/${id}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  }

  return (
    <div>
      {/* Session settings */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink-soft">Questions</span>
          <div className="flex rounded-xl bg-sage-100 p-1" role="radiogroup" aria-label="Questions per session">
            {COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={count === n}
                onClick={() => setCount(n)}
                className={cn(
                  "tabular h-8 rounded-lg px-3 text-sm font-bold transition-colors",
                  count === n
                    ? "bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_10px_-4px_rgb(79_70_229/0.7)]"
                    : "text-ink-soft hover:bg-white",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-soft">
          <input
            type="checkbox"
            checked={timed}
            onChange={(e) => setTimed(e.target.checked)}
            className="h-4 w-4 accent-[#2563eb]"
          />
          Timed (72 sec per question)
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {/* Section-wise */}
      <h3 className="mb-3 mt-8 flex items-center gap-2 text-sm font-bold text-ink-soft">
        <Layers className="h-4 w-4" aria-hidden /> Section-wise practice
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s, i) => {
          const key = `section-${s.id}`;
          return (
            <PracticeCard
              key={s.id}
              hue={hueAt(i)}
              icon={<Layers className="h-5 w-5" aria-hidden />}
              title={s.name}
              sub={`${s.mcq_count} MCQs in the exam`}
              available={s.available}
              needed={s.mcq_count}
              busy={busy === key}
              disabled={!s.available || busy !== null}
              onClick={() => start("section", s.id, key)}
            />
          );
        })}
      </div>

      {/* Subject-wise: only sections with several subjects. A one-subject section
          (e.g. English / Verbal) is already covered by section-wise practice. */}
      {multiSubject.length > 0 && (
      <>
      <h3 className="mb-3 mt-8 flex items-center gap-2 text-sm font-bold text-ink-soft">
        <BookOpen className="h-4 w-4" aria-hidden /> Subject-wise practice
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {multiSubject
          .flatMap((s) => s.subjects.map((sub) => ({ s, sub })))
          .map(({ s, sub }, i) => {
            const key = `subject-${sub.id}`;
            return (
              <PracticeCard
                key={sub.id}
                hue={hueAt(i + 2)}
                icon={<BookOpen className="h-5 w-5" aria-hidden />}
                title={sub.name}
                sub={`${s.name}, ${sub.mcq_count} in the exam`}
                available={sub.available}
                needed={sub.mcq_count}
                busy={busy === key}
                disabled={!sub.available || busy !== null}
                onClick={() => start("subject", sub.id, key)}
              />
            );
          })}
      </div>
      </>
      )}
    </div>
  );
}

function PracticeCard({
  hue,
  icon,
  title,
  sub,
  available,
  needed,
  busy,
  disabled,
  onClick,
}: {
  hue: Hue;
  icon: React.ReactNode;
  title: string;
  sub: string;
  available: number;
  needed: number;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const ready = needed ? Math.min(100, Math.round((available * 100) / needed)) : 0;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-line bg-surface p-4 pt-5 text-left shadow-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 disabled:pointer-events-none disabled:opacity-60",
        hue.hover,
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-1", hue.line)} aria-hidden />
      <span className="flex items-start gap-3">
        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", hue.tile)}>{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold leading-snug text-forest-950">{title}</span>
          <span className="block truncate text-xs text-muted">{sub}</span>
        </span>
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-full transition-[transform,background-color,color] duration-300 group-hover:scale-110",
            hue.soft,
            hue.text,
          )}
        >
          {busy ? <Spinner className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" aria-hidden />}
        </span>
      </span>
      <span className="mt-auto block">
        <span className="flex items-center justify-between text-xs">
          <span className="text-muted">Question bank</span>
          <span className="tabular font-semibold text-ink-soft">{available} ready</span>
        </span>
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-sage-100">
          <span
            className={cn("block h-full rounded-full", ready >= 100 ? "bg-emerald-500" : ready > 0 ? hue.bar : "bg-sage-300")}
            style={{ width: `${Math.max(ready, available ? 4 : 0)}%` }}
          />
        </span>
      </span>
    </button>
  );
}

/** Remembers the student's chosen category (fire-and-forget, after paint). */
export function RememberCategory({ code, current }: { code: string; current: string | null }) {
  useEffect(() => {
    if (current === code) return;
    api("/me", { method: "PATCH", body: { preferred_category: code } }).catch(() => {});
  }, [code, current]);
  return null;
}

export function AvailabilityBadge({ available, required }: { available: number; required: number }) {
  if (available >= required) return <Badge tone="success">Full question bank ready</Badge>;
  if (available === 0) return <Badge tone="danger">No questions published yet</Badge>;
  return (
    <Badge tone="gold">
      {available} of {required} questions available
    </Badge>
  );
}
