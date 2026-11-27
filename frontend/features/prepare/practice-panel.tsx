"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, Layers, ListChecks, Play } from "lucide-react";

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

  async function start(mode: "topic" | "subject" | "section", refId: number, key: string) {
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
            className="h-4 w-4 accent-[#0f3d2e]"
          />
          Timed (72 sec per question)
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {/* Section-wise */}
      <h3 className="mb-3 mt-8 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
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
              className="group flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3.5 text-left shadow-card transition-colors hover:border-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="min-w-0">
                <span className="block font-bold text-forest-950">{s.name}</span>
                <span className="text-xs text-muted">
                  {s.mcq_count} in exam · {s.available} available
                </span>
              </span>
              {busy === key ? <Spinner className="text-forest-900" /> : <Play className="h-4 w-4 text-forest-700" aria-hidden />}
            </button>
          );
        })}
      </div>

      {/* Subject & topic-wise */}
      <h3 className="mb-3 mt-8 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
        <BookOpen className="h-4 w-4" aria-hidden /> Subject &amp; topic practice
      </h3>
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.flatMap((s) =>
          s.subjects.map((sub) => (
            <div key={sub.id} className="rounded-lg border border-line bg-surface shadow-card">
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div className="min-w-0">
                  <p className="font-bold text-forest-950">{sub.name}</p>
                  <p className="text-xs text-muted">
                    {s.name} · {sub.mcq_count} in exam · {sub.available} available
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!sub.available || busy !== null}
                  onClick={() => start("subject", sub.id, `subject-${sub.id}`)}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-forest-900 px-3 text-xs font-bold text-white hover:bg-forest-800 disabled:opacity-50"
                >
                  {busy === `subject-${sub.id}` ? <Spinner className="h-3 w-3" /> : <Play className="h-3 w-3" aria-hidden />}
                  Practise
                </button>
              </div>
              <TopicList
                topics={sub.topics}
                busy={busy}
                onStart={(id) => start("topic", id, `topic-${id}`)}
              />
            </div>
          )),
        )}
      </div>
    </div>
  );
}

function TopicList({
  topics,
  busy,
  onStart,
}: {
  topics: SectionOut["subjects"][number]["topics"];
  busy: string | null;
  onStart: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (topics.length === 0) return <p className="px-4 py-3 text-sm text-muted">No topics yet.</p>;
  const visible = expanded ? topics : topics.slice(0, 8);
  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {visible.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!t.available || busy !== null}
            onClick={() => onStart(t.id)}
            title={t.available ? `Practise ${t.name}` : "No questions yet"}
            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1 text-sm font-medium text-ink-soft transition-colors hover:border-forest-700 hover:bg-forest-50 hover:text-forest-900 disabled:cursor-not-allowed disabled:border-line disabled:text-muted/60 disabled:hover:bg-surface"
          >
            {busy === `topic-${t.id}` ? <Spinner className="h-3 w-3" /> : <ListChecks className="h-3.5 w-3.5" aria-hidden />}
            {t.name}
            <span className="tabular text-xs text-muted">{t.available}</span>
          </button>
        ))}
      </div>
      {topics.length > 8 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs font-semibold text-forest-700 hover:underline"
        >
          {expanded ? "Show fewer" : `Show all ${topics.length} topics`}
        </button>
      )}
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
