import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock3, Flag, Repeat } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Ring } from "@/components/ui/ring";
import { DeletePlanButton, PlanChooser, TASK_LOOK, TaskRow } from "@/features/plans/plan-client";
import { ServerApiError, requireUser, serverApi } from "@/lib/api/server";
import type { StudyPlan } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Study Plans" };

const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Karachi" });
const fmt = (d: string) => dayFmt.format(new Date(`${d}T12:00:00+05:00`));

async function getPlan(): Promise<StudyPlan | null> {
  try {
    return await serverApi<StudyPlan>("/study-plans/current");
  } catch (e) {
    if (e instanceof ServerApiError && e.status === 404) return null;
    if (e instanceof ServerApiError && e.status === 401) redirect("/logout?next=/study-plans");
    throw e;
  }
}

export default async function StudyPlansPage() {
  const [me, plan] = await Promise.all([requireUser("/study-plans"), getPlan()]);

  if (!plan) {
    return (
      <>
        <PageHeader
          eyebrow={`${me.target_exam} · ${me.preferred_category}`}
          title="Study Plans"
          description="Get a day-by-day plan for your test: what to practise, when to take mocks and when to revise."
        />
        <PlanChooser />
      </>
    );
  }

  const today = plan.schedule.find((d) => d.day === plan.today);
  const weeks: StudyPlan["schedule"][] = [];
  plan.schedule.forEach((d, i) => {
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push(d);
  });
  // Counted from the plan's own "today" (server, Pakistan time), so rendering stays pure.
  const daysToExam =
    plan.exam_date && today ? Math.round((Date.parse(plan.exam_date) - Date.parse(today.date)) / 86_400_000) : null;

  return (
    <>
      <PageHeader
        eyebrow={`${plan.category} · ${plan.kind === "custom" ? "Custom" : `${plan.kind}-day`} plan`}
        title="Study Plan"
        description={`${fmt(plan.start_date)} to ${fmt(plan.end_date)} · about ${plan.daily_minutes} minutes a day`}
        action={<DeletePlanButton />}
      />

      {!plan.matches_track && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          This plan is for {plan.category}, but your track is now {me.preferred_category}. Create a new plan below to match it.
        </div>
      )}

      <section className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-[0_24px_48px_-20px_rgb(79_70_229/0.55)]">
        <span
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgb(255_255_255/0.16),transparent_40%)]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 px-5 py-7 sm:flex-row sm:items-center sm:px-8">
          <Ring value={plan.progress.percent} size={104} stroke={10} trackClass="stroke-white/20" barClass="stroke-amber-300">
            <span className="text-center">
              <span className="tabular block text-2xl font-extrabold">{plan.progress.percent}%</span>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-blue-100">done</span>
            </span>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-blue-100">{plan.finished ? "Plan finished" : "Today"}</p>
            <p className="text-3xl font-extrabold text-white">
              Day {plan.today} <span className="text-xl font-semibold text-blue-100">of {plan.days}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                <CheckCircle2 className="h-4 w-4" aria-hidden /> {plan.progress.done}/{plan.progress.total} tasks
              </span>
              {plan.progress.behind > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/90 px-3 py-1 font-semibold text-forest-950">
                  <Clock3 className="h-4 w-4" aria-hidden /> {plan.progress.behind} earlier task{plan.progress.behind === 1 ? "" : "s"} to catch up
                </span>
              )}
              {daysToExam !== null && daysToExam >= 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                  <Flag className="h-4 w-4" aria-hidden /> Exam in {daysToExam} day{daysToExam === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {today && !plan.finished && (
            <Card className="rounded-3xl p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <CalendarCheck className="h-5 w-5 text-blue-600" aria-hidden /> Today · {fmt(today.date)}
              </h2>
              <div className="mt-4 space-y-2">
                {today.tasks.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            </Card>
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-bold">Full schedule</h2>
            {weeks.map((week, wi) => {
              const open = week.some((d) => d.day === plan.today);
              const doneDays = week.filter((d) => d.done).length;
              return (
                <details key={wi} open={open} className="group rounded-3xl border border-line bg-surface shadow-card">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                    <span className="font-bold text-forest-950">
                      Week {wi + 1}
                      <span className="ml-2 text-sm font-normal text-muted">
                        {fmt(week[0].date)} – {fmt(week[week.length - 1].date)}
                      </span>
                    </span>
                    <span className="tabular rounded-full bg-sage-100 px-2.5 py-0.5 text-xs font-bold text-ink-soft">
                      {doneDays}/{week.length} days
                    </span>
                  </summary>
                  <ol className="space-y-4 border-t border-line px-5 py-4">
                    {week.map((d) => {
                      const past = d.day < plan.today;
                      return (
                        <li key={d.day}>
                          <p className={cn("mb-2 flex items-center gap-2 text-sm font-bold", d.day === plan.today ? "text-blue-700" : "text-ink-soft")}>
                            Day {d.day} · {fmt(d.date)}
                            {d.day === plan.today && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] uppercase text-white">Today</span>}
                            {d.done && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Done" />}
                            {past && !d.done && <span className="text-xs font-semibold text-amber-700">Missed tasks</span>}
                          </p>
                          <div className="space-y-2">
                            {d.tasks.map((t) => (
                              <TaskRow key={t.id} task={t} compact />
                            ))}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </details>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          <Card className="rounded-3xl p-5">
            <h3 className="text-base font-bold">What&apos;s in your plan</h3>
            <ul className="mt-4 space-y-2.5">
              {(Object.keys(TASK_LOOK) as (keyof typeof TASK_LOOK)[]).map((k) => {
                const n = plan.schedule.reduce((a, d) => a + d.tasks.filter((t) => t.kind === k).length, 0);
                if (!n) return null;
                const look = TASK_LOOK[k];
                const label = {
                  practice_subject: "Subject practice",
                  practice_section: "Section practice (exam mode)",
                  quiz: "Quizzes",
                  mock: "Full mock tests",
                  mistakes: "Mistake revision",
                  memorize: "Flashcard reviews",
                  essay: "Essay practice",
                }[k];
                return (
                  <li key={k} className="flex items-center gap-3 text-sm">
                    <span className={cn("grid h-8 w-8 place-items-center rounded-lg", look.hue.tile)}>
                      <look.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="flex-1 font-semibold text-ink-soft">{label}</span>
                    <span className="tabular font-bold text-forest-950">{n}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card className="rounded-3xl p-5">
            <h3 className="flex items-center gap-2 text-base font-bold">
              <Repeat className="h-4 w-4 text-violet-600" aria-hidden /> Start a different plan
            </h3>
            <p className="mt-1 text-sm text-muted">Replaces this plan. Sessions you already finished stay in your history.</p>
            <div className="mt-4">
              <PlanChooser hasPlan />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
