"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, GraduationCap, School, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { api, errorMessage } from "@/lib/api/client";
import type { Exam } from "@/lib/api/types";
import { HUES, hueAt } from "@/lib/palette";
import { cn } from "@/lib/utils";

const EXAM_LOOK = {
  HAT: { icon: GraduationCap, hue: HUES.blue },
  USAT: { icon: School, hue: HUES.orange },
} as const;

const GOALS = [
  { n: 10, label: "Light", hint: "About 15 minutes a day" },
  { n: 20, label: "Steady", hint: "About 30 minutes a day" },
  { n: 40, label: "Serious", hint: "About 1 hour a day" },
  { n: 60, label: "Intense", hint: "About 1.5 hours a day" },
];

const STEPS = ["Your test", "Your category", "Daily goal"];

export function OnboardingWizard({
  firstName,
  exams,
  initialExam,
  initialCategory,
  initialGoal,
}: {
  firstName: string;
  exams: Exam[];
  initialExam: string | null;
  initialCategory: string | null;
  initialGoal: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState(initialExam ? 1 : 0);
  const [examCode, setExamCode] = useState<string | null>(initialExam);
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [goal, setGoal] = useState(GOALS.some((g) => g.n === initialGoal) ? initialGoal : 20);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exam = exams.find((e) => e.code === examCode);
  const categoryOk = exam?.categories.some((c) => c.code === category) ?? false;

  async function finish() {
    if (!category) return;
    setSaving(true);
    setError(null);
    try {
      await api("/me", { method: "PATCH", body: { preferred_category: category, daily_goal: goal } });
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 sm:mt-12">
      <p className="text-sm font-semibold text-blue-700">Welcome, {firstName}</p>
      <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Let&apos;s set up your preparation</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Everything on QADAM, from your dashboard to practice, quizzes and mocks, will follow the test you choose. You
        can switch any time from My Account.
      </p>

      {/* Stepper */}
      <ol className="mt-8 flex items-center gap-2 sm:gap-3" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2 sm:gap-3">
            <span
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                i < step && "bg-emerald-500 text-white",
                i === step && "bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-[0_4px_12px_-4px_rgb(79_70_229/0.7)]",
                i > step && "bg-sage-100 text-muted",
              )}
              aria-current={i === step ? "step" : undefined}
            >
              {i < step ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn("hidden text-sm font-semibold sm:block", i === step ? "text-forest-950" : "text-muted")}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className={cn("h-0.5 flex-1 rounded-full", i < step ? "bg-emerald-400" : "bg-sage-200")} />}
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-3xl border border-line bg-surface p-5 shadow-raised sm:p-8">
        {step === 0 && (
          <>
            <h2 className="text-xl font-bold">Which test are you preparing for?</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {exams.map((e) => {
                const look = EXAM_LOOK[e.code] ?? EXAM_LOOK.HAT;
                const Icon = look.icon;
                const selected = examCode === e.code;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      setExamCode(e.code);
                      if (!e.categories.some((c) => c.code === category)) setCategory(null);
                    }}
                    aria-pressed={selected}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border-2 text-left transition-[transform,border-color] duration-200 hover:-translate-y-0.5",
                      selected ? "border-blue-500" : "border-line hover:border-blue-200",
                    )}
                  >
                    <span className={cn("flex items-center gap-4 px-5 py-5 text-white", look.hue.grad)}>
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30">
                        <Icon className="h-6 w-6" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-2xl font-extrabold">{e.code}</span>
                        <span className="block truncate text-sm text-white/90">{e.name}</span>
                      </span>
                      {selected && (
                        <span className="ml-auto grid h-7 w-7 place-items-center rounded-full bg-white text-blue-600">
                          <Check className="h-4 w-4" aria-hidden />
                        </span>
                      )}
                    </span>
                    <span className="block px-5 py-4 text-sm text-muted">
                      {e.categories.length} categories · {e.categories[0]?.essay_duration_min ? "MCQs + essays" : "MCQs only"}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 1 && exam && (
          <>
            <h2 className="text-xl font-bold">Choose your {exam.code} category</h2>
            <p className="mt-1 text-sm text-muted">Pick the one that matches the programme you are applying for.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {exam.categories.map((c, i) => {
                const hue = hueAt(i);
                const selected = category === c.code;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.code)}
                    aria-pressed={selected}
                    className={cn(
                      "relative flex flex-col rounded-2xl border-2 p-4 text-left transition-[border-color,background-color] duration-200",
                      selected ? cn("border-blue-500", hue.soft) : "border-line hover:border-blue-200",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", hue.tile)}>
                        <Target className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-extrabold text-forest-950">{c.code}</span>
                        {c.name !== c.code && <span className="block truncate text-xs text-muted">{c.name}</span>}
                      </span>
                      {selected && <Check className="h-5 w-5 shrink-0 text-blue-600" aria-hidden />}
                    </span>
                    {c.disciplines.length > 0 && (
                      <span className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">{c.disciplines.join(", ")}</span>
                    )}
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink-soft">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden /> {c.total_mcqs} MCQs · {c.mcq_duration_min} min
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-bold">How many questions a day?</h2>
            <p className="mt-1 text-sm text-muted">Your dashboard tracks this goal and your study streak.</p>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" role="radiogroup" aria-label="Daily goal">
              {GOALS.map((g, i) => {
                const hue = hueAt(i + 2);
                const selected = goal === g.n;
                return (
                  <button
                    key={g.n}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setGoal(g.n)}
                    className={cn(
                      "rounded-2xl border-2 p-4 text-left transition-colors",
                      selected ? cn("border-blue-500", hue.soft) : "border-line hover:border-blue-200",
                    )}
                  >
                    <span className={cn("tabular block text-3xl font-extrabold", hue.text)}>{g.n}</span>
                    <span className="block text-sm font-bold text-forest-950">{g.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{g.hint}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {error && <Alert className="mt-5">{error}</Alert>}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
          <Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 ? !exam : !categoryOk}>
              Continue <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <Button onClick={finish} loading={saving} disabled={!categoryOk}>
              Start preparing <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
