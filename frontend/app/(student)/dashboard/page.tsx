import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3, GraduationCap, History, School } from "lucide-react";

import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { getMe, pageApi, serverApi } from "@/lib/api/server";
import type { Exam, HistoryItem, Page } from "@/lib/api/types";
import { MODE_LABEL, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // Independent requests run in parallel (no waterfall).
  const [me, exams, history] = await Promise.all([
    getMe(),
    serverApi<Exam[]>("/exams", { revalidate: 60, tags: ["catalog"] }),
    pageApi<Page<HistoryItem>>("/me/history?page_size=5"),
  ]);
  const firstName = me?.full_name.split(" ")[0] ?? "";
  const inProgress = history.items.find((h) => h.status === "in_progress" || h.essay_status === "in_progress");
  const preferred = me?.preferred_category
    ? exams.flatMap((e) => e.categories.map((c) => ({ ...c, exam: e.code }))).find((c) => c.code === me.preferred_category)
    : undefined;

  return (
    <>
      <div className="mb-8 rounded-xl border border-forest-100 bg-forest-50 px-5 py-6 sm:px-8">
        <p lang="ur" dir="rtl" className="urdu text-left text-xl text-forest-700">
          السلام علیکم، خوش آمدید
        </p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Welcome back, {firstName}</h1>
        <p className="mt-1.5 max-w-2xl text-ink-soft">Choose your test to see the mocks and practice for your category.</p>
      </div>

      {(inProgress || preferred) && (
        <div className="mb-8 grid gap-3 md:grid-cols-2">
          {inProgress && (
            <Card className="flex items-center justify-between gap-4 border-gold-200 bg-gold-100/60 p-5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gold-700">Not finished yet</p>
                <p className="mt-0.5 truncate font-bold text-forest-950">{inProgress.title}</p>
                <p className="text-sm text-ink-soft">Started {formatDate(inProgress.started_at)}</p>
              </div>
              <LinkButton
                href={inProgress.status === "in_progress" ? `/attempt/${inProgress.id}` : `/attempt/${inProgress.id}/essays`}
                size="sm"
                className="shrink-0"
              >
                Resume
              </LinkButton>
            </Card>
          )}
          {preferred && (
            <Card className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-muted">
                  Continue preparing <span lang="ur" className="urdu text-forest-700">· تیاری جاری رکھیں</span>
                </p>
                <p className="mt-0.5 truncate font-bold text-forest-950">{preferred.name}</p>
                <p className="text-sm text-ink-soft">
                  {preferred.total_mcqs} MCQs in {preferred.mcq_duration_min} minutes
                </p>
              </div>
              <LinkButton
                href={`/prepare/${preferred.exam.toLowerCase()}/${preferred.code.toLowerCase()}`}
                size="sm"
                variant="secondary"
                className="shrink-0"
              >
                Open {preferred.code}
              </LinkButton>
            </Card>
          )}
        </div>
      )}

      <h2 className="mb-3 text-lg font-bold">Choose your test</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {exams.map((exam) => {
          const Icon = exam.code === "HAT" ? GraduationCap : School;
          const first = exam.categories[0];
          return (
            <Link
              key={exam.id}
              href={`/prepare/${exam.code.toLowerCase()}`}
              className="group flex items-center gap-4 rounded-lg border border-line bg-surface p-5 transition-colors hover:border-forest-700"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-forest-50 text-forest-900">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xl font-extrabold text-forest-950">{exam.code}</span>
                <span className="block truncate text-sm text-ink-soft">{exam.name}</span>
                <span className="mt-1 flex items-center gap-1 text-xs text-muted">
                  <Clock3 className="h-3 w-3" aria-hidden />
                  {exam.categories.length} categories
                  {first && `, ${first.total_mcqs} MCQs in ${first.mcq_duration_min} min`}
                  {first?.essay_duration_min ? " plus 2 essays" : ""}
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted group-hover:text-forest-900" aria-hidden />
            </Link>
          );
        })}
      </div>

      <Card className="mt-10">
        <CardHeader
          title="Recent attempts"
          action={
            history.total > 0 ? (
              <Link href="/history" className="text-sm font-semibold text-forest-700 hover:underline">
                View all
              </Link>
            ) : undefined
          }
        />
        {history.items.length === 0 ? (
          <EmptyState
            icon={<History className="h-5 w-5" />}
            title="Take your first step"
            description={
              <>
                <span lang="ur" dir="rtl" className="urdu block text-base text-forest-700">پہلا قدم اٹھائیں</span>
                Choose HAT or USAT above and start a practice session or a full mock.
              </>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {history.items.map((h) => (
              <li key={h.id}>
                <Link
                  href={h.status === "in_progress" ? `/attempt/${h.id}` : `/results/${h.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-paper"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-forest-950">{h.title}</p>
                    <p className="text-xs text-muted">
                      {MODE_LABEL[h.mode]}, {formatDate(h.started_at)}
                    </p>
                  </div>
                  {h.status === "in_progress" ? (
                    <Badge tone="gold">In progress</Badge>
                  ) : h.total_marks ? (
                    <span className="tabular text-sm font-bold text-forest-900">
                      {h.score}/{h.total_marks}
                    </span>
                  ) : (
                    <Badge tone="forest">Essays</Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
