"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Clock3, Play, Shuffle, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { api, errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const LENGTHS = [10, 15, 20, 30];
const LEVELS = [
  { v: null, label: "Any" },
  { v: "easy", label: "Easy" },
  { v: "medium", label: "Medium" },
  { v: "hard", label: "Hard" },
] as const;

type Subject = { id: number; name: string; available: number };

export function QuizBuilder({ category, subjects }: { category: string; subjects: Subject[] }) {
  const router = useRouter();
  const [subject, setSubject] = useState<number | null>(null);
  const [count, setCount] = useState(10);
  const [level, setLevel] = useState<(typeof LEVELS)[number]["v"]>(null);
  const [timed, setTimed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalAvailable = subjects.reduce((n, s) => n + s.available, 0);
  const pool = subject === null ? totalAvailable : (subjects.find((s) => s.id === subject)?.available ?? 0);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/practice", {
        method: "POST",
        body: { category, mode: "quiz", ref_id: subject, count, timed, difficulty: level },
      });
      router.push(`/attempt/${id}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  const chip = (active: boolean) =>
    cn(
      "rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
      active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-line bg-surface text-ink-soft hover:border-blue-200",
    );

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-sm font-bold text-forest-950">Subject</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className={cn(chip(subject === null), "inline-flex items-center gap-1.5")} onClick={() => setSubject(null)} aria-pressed={subject === null}>
            <Shuffle className="h-4 w-4" aria-hidden /> Mixed (all subjects)
          </button>
          {subjects.map((s) => (
            <button
              key={s.id}
              type="button"
              className={chip(subject === s.id)}
              onClick={() => setSubject(s.id)}
              aria-pressed={subject === s.id}
              disabled={!s.available}
            >
              {s.name}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <fieldset>
          <legend className="text-sm font-bold text-forest-950">Questions</legend>
          <div className="mt-2 flex rounded-xl bg-sage-100 p-1" role="radiogroup" aria-label="Questions">
            {LENGTHS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={count === n}
                onClick={() => setCount(n)}
                className={cn(
                  "tabular h-9 flex-1 rounded-lg text-sm font-bold transition-colors",
                  count === n ? "bg-linear-to-r from-blue-600 to-indigo-600 text-white" : "text-ink-soft hover:bg-white",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-bold text-forest-950">Difficulty</legend>
          <div className="mt-2 flex rounded-xl bg-sage-100 p-1" role="radiogroup" aria-label="Difficulty">
            {LEVELS.map((l) => (
              <button
                key={l.label}
                type="button"
                role="radio"
                aria-checked={level === l.v}
                onClick={() => setLevel(l.v)}
                className={cn(
                  "h-9 flex-1 rounded-lg text-sm font-bold transition-colors",
                  level === l.v ? "bg-linear-to-r from-violet-600 to-fuchsia-600 text-white" : "text-ink-soft hover:bg-white",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-paper p-4">
        <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#2563eb]" />
        <span>
          <span className="flex items-center gap-1.5 text-sm font-bold text-forest-950">
            <Clock3 className="h-4 w-4 text-blue-600" aria-hidden /> Timed quiz
          </span>
          <span className="mt-0.5 block text-sm text-muted">
            {timed ? `${Math.round((count * 72) / 60)} minutes (72 seconds per question, like the real test).` : "No timer. Take as long as you need."}
          </span>
        </span>
      </label>

      {error && <Alert>{error}</Alert>}

      <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted">
          <Zap className="h-4 w-4 text-amber-500" aria-hidden />
          Instant feedback: check each answer and see the explanation.
          <span className="tabular hidden font-semibold text-ink-soft sm:inline">({pool} in pool)</span>
        </p>
        <Button size="lg" onClick={start} loading={busy} disabled={!pool}>
          <Play className="h-4 w-4" aria-hidden /> Start quiz
        </Button>
      </div>
    </div>
  );
}
