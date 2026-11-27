"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, Layers, Play } from "lucide-react";

import { Badge } from "@/components/ui/card";
import { Spinner } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api/client";
import type { SectionOut } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const COUNTS = [10, 20, 30, 50];

export function PracticePanel({ category, sections }: { category: string; sections: SectionOut[] }) {
  const router = useRouter();
  const [count, setCount] = useState(20);
  const [timed, setTimed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-paper px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink-soft">Questions</span>
          <div className="flex rounded-md border border-line-strong bg-surface p-0.5" role="radiogroup" aria-label="Questions per session">
            {COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={count === n}
                onClick={() => setCount(n)}
                className={cn(
                  "tabular h-8 rounded px-3 text-sm font-bold transition-colors",
                  count === n ? "bg-forest-900 text-white" : "text-ink-soft hover:bg-forest-50",
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
            className="h-4 w-4 accent-[#01411c]"
          />
          Timed (72 sec per question)
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {/* Section-wise */}
      <h3 className="mb-3 mt-8 flex items-center gap-2 text-sm font-bold text-ink-soft">
        <Layers className="h-4 w-4" aria-hidden /> Section-wise practice
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => {
          const key = `section-${s.id}`;
          return (
            <button
              key={s.id}
              type="button"
              disabled={!s.available || busy !== null}
              onClick={() => start("section", s.id, key)}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3.5 text-left transition-colors hover:border-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="min-w-0">
                <span className="block font-bold text-forest-950">{s.name}</span>
                <span className="text-xs text-muted">
                  {s.mcq_count} in the exam, {s.available} available
                </span>
              </span>
              {busy === key ? <Spinner className="text-forest-900" /> : <Play className="h-4 w-4 text-forest-700" aria-hidden />}
            </button>
          );
        })}
      </div>

      {/* Subject-wise (topic-wise practice removed: too few questions per topic) */}
      <h3 className="mb-3 mt-8 flex items-center gap-2 text-sm font-bold text-ink-soft">
        <BookOpen className="h-4 w-4" aria-hidden /> Subject-wise practice
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.flatMap((s) =>
          s.subjects.map((sub) => {
            const key = `subject-${sub.id}`;
            return (
              <button
                key={sub.id}
                type="button"
                disabled={!sub.available || busy !== null}
                onClick={() => start("subject", sub.id, key)}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3.5 text-left transition-colors hover:border-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="min-w-0">
                  <span className="block font-bold text-forest-950">{sub.name}</span>
                  <span className="text-xs text-muted">
                    {s.name}, {sub.available} questions available
                  </span>
                </span>
                {busy === key ? <Spinner className="text-forest-900" /> : <Play className="h-4 w-4 text-forest-700" aria-hidden />}
              </button>
            );
          }),
        )}
      </div>
    </div>
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
