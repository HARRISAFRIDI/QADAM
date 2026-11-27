import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3, GraduationCap, History, School } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
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
      <PageHeader
        eyebrow="Dashboard"
        title={`Assalam-o-Alaikum, ${firstName}`}
        description="Choose your test to see only the sections, subjects and mocks that matter for you."
      />

      {(inProgress || preferred) && (
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          {inProgress && (
            <Card className="border-gold-200 bg-gold-100/60 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-gold-700">In progress</p>
              <p className="mt-1 font-bold text-forest-950">{inProgress.title}</p>
              <p className="text-sm text-ink-soft">Started {formatDate(inProgress.started_at)}</p>
              <LinkButton
                href={inProgress.status === "in_progress" ? `/attempt/${inProgress.id}` : `/attempt/${inProgress.id}/essays`}
                className="mt-4"
                size="sm"
              >
                Resume <ArrowRight className="h-4 w-4" aria-hidden />
              </LinkButton>
            </Card>
          )}
          {preferred && (
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Continue preparing</p>
              <p className="mt-1 font-bold text-forest-950">{preferred.name}</p>
              <p className="text-sm text-ink-soft">
                {preferred.total_mcqs} MCQs · {preferred.mcq_duration_min} min
              </p>
              <LinkButton
                href={`/prepare/${preferred.exam.toLowerCase()}/${preferred.code.toLowerCase()}`}
                className="mt-4"
                size="sm"
                variant="secondary"
              >
                Open {preferred.code} <ArrowRight className="h-4 w-4" aria-hidden />
              </LinkButton>
            </Card>
          )}
        </div>
      )}

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Step 1 · Choose your test</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {exams.map((exam) => {
          const Icon = exam.code === "HAT" ? GraduationCap : School;
          const first = exam.categories[0];
          return (
            <Link
              key={exam.id}
              href={`/prepare/${exam.code.toLowerCase()}`}
              className="group rounded-xl border border-line bg-surface p-6 shadow-card transition-[border-color,box-shadow] hover:border-forest-700 hover:shadow-raised"
            >
              <div className="flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-forest-900 text-white">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <ArrowRight className="h-5 w-5 text-muted transition-transform group-hover:translate-x-1 group-hover:text-forest-900" aria-hidden />
              </div>
              <p className="mt-4 text-2xl font-extrabold text-forest-950">{exam.code}</p>
              <p className="text-sm font-medium text-ink-soft">{exam.name}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="forest">{exam.categories.length} categories</Badge>
                {first && (
                  <Badge>
                    <Clock3 className="h-3 w-3" aria-hidden />
                    {first.total_mcqs} MCQs · {first.mcq_duration_min} min
                  </Badge>
                )}
                {first?.essay_duration_min && <Badge tone="gold">+ 2 essays</Badge>}
              </div>
            </Link>
          );
        })}
      </div>

      <Card className="mt-10">
        <CardHeader
          title="Recent activity"
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
            title="No attempts yet"
            description="Pick HAT or USAT above and start your first practice session."
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
                      {MODE_LABEL[h.mode]} · {formatDate(h.started_at)}
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
