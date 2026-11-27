"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { api, errorMessage } from "@/lib/api/client";
import type { Exam } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Switch the test track (exam + category). The whole site follows it. */
export function TrackSwitcher({ exams, current }: { exams: Exam[]; current: string | null }) {
  const router = useRouter();
  const currentExam = exams.find((e) => e.categories.some((c) => c.code === current))?.code ?? exams[0]?.code;
  const [examCode, setExamCode] = useState(currentExam);
  const [category, setCategory] = useState(current);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const exam = exams.find((e) => e.code === examCode);
  const valid = exam?.categories.some((c) => c.code === category) ?? false;

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api("/me", { method: "PATCH", body: { preferred_category: category } });
      setMsg({ ok: true, text: `Your track is now ${category}. Dashboard, practice and mocks follow it.` });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {msg && <Alert tone={msg.ok ? "success" : "danger"}>{msg.text}</Alert>}
      <div className="flex rounded-xl bg-sage-100 p-1" role="radiogroup" aria-label="Test">
        {exams.map((e) => (
          <button
            key={e.id}
            type="button"
            role="radio"
            aria-checked={examCode === e.code}
            onClick={() => setExamCode(e.code)}
            className={cn(
              "h-10 flex-1 rounded-lg text-sm font-bold transition-colors",
              examCode === e.code ? "bg-linear-to-r from-blue-600 to-indigo-600 text-white" : "text-ink-soft hover:bg-white",
            )}
          >
            {e.code}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Category">
        {exam?.categories.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={category === c.code}
            onClick={() => setCategory(c.code)}
            className={cn(
              "rounded-xl border-2 px-3 py-2.5 text-left transition-colors",
              category === c.code ? "border-blue-500 bg-blue-50" : "border-line hover:border-blue-200",
            )}
          >
            <span className="block text-sm font-bold text-forest-950">{c.code}</span>
            {c.name !== c.code && <span className="block truncate text-xs text-muted">{c.name}</span>}
          </button>
        ))}
      </div>
      <Button onClick={save} loading={busy} disabled={!valid || category === current}>
        Switch track
      </Button>
    </div>
  );
}

const GOALS = [10, 20, 30, 40, 60, 100];

export function GoalForm({ current }: { current: number }) {
  const router = useRouter();
  const [goal, setGoal] = useState(current);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api("/me", { method: "PATCH", body: { daily_goal: goal } });
      setMsg({ ok: true, text: "Daily goal saved." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {msg && <Alert tone={msg.ok ? "success" : "danger"}>{msg.text}</Alert>}
      <div>
        <p className="text-sm font-semibold text-ink-soft">Questions per day</p>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6" role="radiogroup" aria-label="Daily goal">
          {GOALS.map((g) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={goal === g}
              onClick={() => setGoal(g)}
              className={cn(
                "tabular h-10 rounded-xl border-2 text-sm font-bold transition-colors",
                goal === g ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-line text-ink-soft hover:border-emerald-200",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      <Button onClick={save} loading={busy} disabled={goal === current}>
        Save goal
      </Button>
    </div>
  );
}
