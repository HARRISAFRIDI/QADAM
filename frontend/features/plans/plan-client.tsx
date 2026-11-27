"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  Layers,
  NotebookPen,
  PenLine,
  Play,
  Rocket,
  Timer,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { api, errorMessage } from "@/lib/api/client";
import type { PlanTask, PlanTaskKind } from "@/lib/api/types";
import { HUES, type Hue } from "@/lib/palette";
import { cn } from "@/lib/utils";

export const TASK_LOOK: Record<PlanTaskKind, { icon: typeof Zap; hue: Hue }> = {
  practice_subject: { icon: BookOpen, hue: HUES.emerald },
  practice_section: { icon: Layers, hue: HUES.violet },
  quiz: { icon: Zap, hue: HUES.sky },
  mock: { icon: Timer, hue: HUES.blue },
  mistakes: { icon: NotebookPen, hue: HUES.rose },
  memorize: { icon: Brain, hue: HUES.violet },
  essay: { icon: PenLine, hue: HUES.orange },
};

/** One task: start/resume its session, or tick it done. */
export function TaskRow({ task, compact = false }: { task: PlanTask; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"start" | "done" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const look = TASK_LOOK[task.kind];

  async function start() {
    setBusy("start");
    setError(null);
    try {
      const r = await api<{ href: string }>(`/study-plans/tasks/${task.id}/start`, { method: "POST" });
      router.push(r.href);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  }

  async function toggle() {
    setBusy("done");
    setError(null);
    try {
      await api(`/study-plans/tasks/${task.id}/done`, { method: "PUT", body: { done: !task.done } });
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border px-3 py-3 sm:px-4", task.done ? "border-emerald-100 bg-emerald-50/50" : "border-line bg-surface")}>
      <button
        type="button"
        onClick={toggle}
        disabled={busy !== null}
        aria-pressed={task.done}
        aria-label={task.done ? "Mark as not done" : "Mark as done"}
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
          task.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-line-strong hover:border-emerald-400",
        )}
      >
        {task.done && <Check className="h-3.5 w-3.5" aria-hidden />}
      </button>
      {!compact && (
        <span className={cn("hidden h-9 w-9 shrink-0 place-items-center rounded-xl sm:grid", look.hue.tile)}>
          <look.icon className="h-4 w-4" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold", task.done ? "text-muted line-through" : "text-forest-950")}>{task.title}</p>
        <p className="text-xs text-muted">
          About {task.minutes} min{task.in_progress ? " · in progress" : ""}
        </p>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
      {!task.done && (
        <Button size="sm" variant={task.in_progress ? "gold" : "primary"} onClick={start} loading={busy === "start"} disabled={busy !== null}>
          <Play className="h-3.5 w-3.5" aria-hidden /> {task.in_progress ? "Resume" : "Start"}
        </Button>
      )}
    </div>
  );
}

const MINUTES = [30, 60, 90, 120];

export function PlanChooser({ hasPlan = false }: { hasPlan?: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<"30" | "14" | "custom">("30");
  const [minutes, setMinutes] = useState(60);
  const [examDate, setExamDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (hasPlan && !window.confirm("Replace your current plan? Your finished sessions stay in your history.")) return;
    setBusy(true);
    setError(null);
    try {
      await api("/study-plans", {
        method: "POST",
        body: { kind, daily_minutes: minutes, exam_date: kind === "custom" && examDate ? examDate : null, days: kind === "custom" && !examDate ? 21 : null },
      });
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const options = [
    { k: "30" as const, title: "30-day plan", body: "Steady preparation: every subject, a weekly mock and revision days.", icon: CalendarDays, hue: HUES.blue },
    { k: "14" as const, title: "14-day plan", body: "A fast track: more practice per day and two full mocks.", icon: Rocket, hue: HUES.orange },
    { k: "custom" as const, title: "Custom plan", body: "Pick your exam date and the plan fits the days you have.", icon: Timer, hue: HUES.violet },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3" role="radiogroup" aria-label="Plan length">
        {options.map((o) => (
          <button
            key={o.k}
            type="button"
            role="radio"
            aria-checked={kind === o.k}
            onClick={() => setKind(o.k)}
            className={cn(
              "relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-[border-color,transform] duration-200 hover:-translate-y-0.5",
              kind === o.k ? cn("border-blue-500", o.hue.soft) : "border-line bg-surface hover:border-blue-200",
            )}
          >
            <span className={cn("grid h-11 w-11 place-items-center rounded-2xl", o.hue.tile)}>
              <o.icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="mt-3 block text-lg font-extrabold text-forest-950">{o.title}</span>
            <span className="mt-1 block text-sm text-ink-soft">{o.body}</span>
            {kind === o.k && (
              <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-white">
                <Check className="h-3.5 w-3.5" aria-hidden />
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-5 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2">
        <div>
          <p className="text-sm font-bold text-forest-950">Time per day</p>
          <div className="mt-2 flex rounded-xl bg-sage-100 p-1" role="radiogroup" aria-label="Minutes per day">
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={minutes === m}
                onClick={() => setMinutes(m)}
                className={cn(
                  "h-9 flex-1 rounded-lg text-sm font-bold transition-colors",
                  minutes === m ? "bg-linear-to-r from-blue-600 to-indigo-600 text-white" : "text-ink-soft hover:bg-white",
                )}
              >
                {m < 60 ? `${m} min` : `${m / 60} h`}
              </button>
            ))}
          </div>
        </div>
        {kind === "custom" && (
          <div>
            <label htmlFor="exam_date" className="text-sm font-bold text-forest-950">
              Exam date
            </label>
            <Input id="exam_date" type="date" className="mt-2" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            <p className="mt-1 text-xs text-muted">7 to 120 days from today. Leave empty for a 21-day plan.</p>
          </div>
        )}
      </div>

      {error && <Alert>{error}</Alert>}
      <Button size="lg" onClick={create} loading={busy}>
        <Rocket className="h-4 w-4" aria-hidden /> {hasPlan ? "Create new plan" : "Create my plan"}
      </Button>
      <p className="text-xs text-muted">
        The plan follows your category&apos;s official weightage and gives extra days to the subjects where your accuracy is lowest.
      </p>
    </div>
  );
}

export function DeletePlanButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={busy}
      onClick={async () => {
        if (!window.confirm("Delete this study plan?")) return;
        setBusy(true);
        await api("/study-plans/current", { method: "DELETE" }).catch(() => {});
        router.refresh();
        setBusy(false);
      }}
    >
      Delete plan
    </Button>
  );
}
