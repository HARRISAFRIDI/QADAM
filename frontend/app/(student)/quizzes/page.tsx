import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, TrendingDown, TrendingUp, Zap } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { QuizBuilder } from "@/features/quizzes/quiz-builder";
import { pageApi } from "@/lib/api/server";
import { getTrack } from "@/lib/api/track";
import type { Overview } from "@/lib/api/types";
import { scoreTone } from "@/lib/palette";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Quizzes" };

export default async function QuizzesPage() {
  const [{ ov }, stats] = await Promise.all([getTrack("/quizzes"), pageApi<Overview>("/me/overview")]);
  const subjects = ov.sections.flatMap((s) => s.subjects.map((sub) => ({ id: sub.id, name: sub.name, available: sub.available })));
  const quizzes = stats.scores.recent.filter((s) => s.mode === "quiz").reverse();

  return (
    <>
      <PageHeader
        eyebrow={`${ov.exam.code} · ${ov.category.code}`}
        title="Quizzes"
        description="Short, focused quizzes with instant feedback, explanations and a score at the end."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="relative overflow-hidden rounded-3xl p-5 sm:p-7">
          <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-500 via-blue-500 to-indigo-500" aria-hidden />
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br from-sky-500 to-blue-600 text-white shadow-[0_6px_14px_-4px_rgb(14_165_233/0.6)]">
              <Zap className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-extrabold">Build a quiz</h2>
              <p className="text-sm text-muted">Pick a subject, length and level.</p>
            </div>
          </div>
          <QuizBuilder category={ov.category.code} subjects={subjects} />
        </Card>

        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden rounded-3xl">
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-violet-600" aria-hidden /> Your quiz scores
                </span>
              }
            />
            {quizzes.length === 0 ? (
              <EmptyState icon={<Zap className="h-5 w-5" />} title="No quizzes yet" description="Your scores appear here after your first quiz." />
            ) : (
              <ul className="divide-y divide-line">
                {quizzes.map((q) => {
                  const tone = scoreTone(q.percent);
                  return (
                    <li key={q.id}>
                      <Link href={`/results/${q.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-forest-950">{q.title.replace(/^[^:]+:\s*/, "")}</p>
                          <p className="text-xs text-muted">{formatDate(q.date)}</p>
                        </div>
                        <div className="w-20">
                          <p className={cn("tabular text-right text-sm font-bold", tone.text)}>{q.percent}%</p>
                          <div className={cn("mt-1 h-1.5 overflow-hidden rounded-full", tone.soft)}>
                            <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${Math.max(4, q.percent)}%` }} />
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="rounded-3xl p-5">
            <h3 className="text-base font-bold">Performance by subject</h3>
            {stats.strong_subjects.length === 0 && stats.weak_subjects.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Answer at least 5 questions in a subject to see how you are doing.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {stats.strong_subjects.length > 0 && (
                  <SubjectList title="Strong" icon={<TrendingUp className="h-4 w-4 text-emerald-600" aria-hidden />} items={stats.strong_subjects} />
                )}
                {stats.weak_subjects.length > 0 && (
                  <SubjectList title="Needs work" icon={<TrendingDown className="h-4 w-4 text-rose-600" aria-hidden />} items={stats.weak_subjects} />
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function SubjectList({ title, icon, items }: { title: string; icon: React.ReactNode; items: Overview["subjects"] }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
        {icon} {title}
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((s) => {
          const tone = scoreTone(s.accuracy);
          return (
            <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-semibold text-forest-950">{s.name}</span>
              <span className={cn("tabular rounded-full px-2 py-0.5 text-xs font-bold", tone.soft, tone.text)}>{Math.round(s.accuracy)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
