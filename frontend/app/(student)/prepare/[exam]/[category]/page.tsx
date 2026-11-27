import type { Metadata } from "next";
import { Clock3, FileText, PenLine, Timer } from "lucide-react";

import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";
import { Badge, Card } from "@/components/ui/card";
import { AvailabilityBadge, PracticePanel, RememberCategory } from "@/features/prepare/practice-panel";
import { StartButton } from "@/features/prepare/start-button";
import { getMe, pageApi } from "@/lib/api/server";
import type { CategoryOverview } from "@/lib/api/types";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  return { title: `${category.toUpperCase()} preparation` };
}

export default async function CategoryPage({ params }: { params: Promise<{ exam: string; category: string }> }) {
  const { category } = await params;
  const [ov, me] = await Promise.all([
    pageApi<CategoryOverview>(`/categories/${encodeURIComponent(category)}/overview`, {
      revalidate: 30,
      tags: ["catalog"],
    }),
    getMe(),
  ]);
  const c = ov.category;
  const examSlug = ov.exam.code.toLowerCase();

  return (
    <>
      <RememberCategory code={c.code} current={me?.preferred_category ?? null} />
      <Breadcrumbs
        items={[
          { href: "/dashboard", label: "Dashboard" },
          { href: `/prepare/${examSlug}`, label: ov.exam.code },
          { label: c.code },
        ]}
      />
      <PageHeader
        eyebrow={`${ov.exam.code} preparation`}
        title={c.name}
        description={c.disciplines.length ? c.disciplines.join(" · ") : undefined}
      />

      {/* Exam structure strip */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ov.sections.map((s) => (
          <div key={s.id} className="rounded-lg border border-line bg-surface px-4 py-3 shadow-card">
            <p className="truncate text-xs font-semibold text-muted">{s.name}</p>
            <p className="tabular text-xl font-extrabold text-forest-950">{s.mcq_count}</p>
          </div>
        ))}
        {ov.essays && (
          <div className="rounded-lg border border-gold-200 bg-gold-100/60 px-4 py-3">
            <p className="text-xs font-semibold text-gold-700">Essays</p>
            <p className="text-xl font-extrabold text-forest-950">2 · 25 marks</p>
          </div>
        )}
      </div>

      {/* Full mock */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-bold text-muted">Choose how to prepare</h2>
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Card className="border-forest-100 bg-forest-50 p-6">
            <p className="flex items-center gap-2 text-sm font-semibold text-forest-700">
              <Timer className="h-4 w-4" aria-hidden /> Full mock test
            </p>
            <h3 className="mt-2 text-2xl font-extrabold text-forest-950">Real exam conditions</h3>
            <p className="mt-1.5 max-w-lg text-sm text-ink-soft">
              {ov.total_mcqs} MCQs in {c.mcq_duration_min} minutes with the official {c.code} weightage
              {ov.essays ? `, then two essays in ${ov.essays.duration_min} minutes (type them, or write on paper and self-score)` : ""}.
              Refreshing the page will not stop the timer or lose your answers.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <AvailabilityBadge available={ov.total_available} required={ov.total_mcqs} />
              <Badge>
                <Clock3 className="h-3 w-3" aria-hidden /> {c.mcq_duration_min} min
              </Badge>
            </div>
            <StartButton
              endpoint="/attempts"
              body={{ category: c.code }}
              size="lg"
              className="mt-6"
              disabled={ov.total_available === 0}
              confirmText={`Start the ${c.code} full mock now? The ${c.mcq_duration_min}-minute timer starts immediately.`}
            >
              Start full mock
            </StartButton>
          </Card>

          <div className="space-y-4">
            {ov.mocks.length > 0 && (
              <Card>
                <p className="flex items-center gap-2 border-b border-line px-5 py-3 text-sm font-bold text-forest-950">
                  <FileText className="h-4 w-4 text-forest-700" aria-hidden /> Fixed mock papers
                </p>
                <ul className="divide-y divide-line">
                  {ov.mocks.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-forest-950">{m.title}</p>
                        <p className="text-xs text-muted">
                          {m.question_count} MCQs · {m.duration_min} min
                        </p>
                      </div>
                      <StartButton
                        endpoint="/attempts"
                        body={{ category: c.code, mock_test_id: m.id }}
                        size="sm"
                        variant="secondary"
                        confirmText={`Start "${m.title}"? The timer starts immediately.`}
                      >
                        Start
                      </StartButton>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {ov.essays && (
              <Card className="p-5">
                <p className="flex items-center gap-2 text-sm font-bold text-forest-950">
                  <PenLine className="h-4 w-4 text-gold-600" aria-hidden /> Essay practice
                </p>
                <p className="mt-1 text-sm text-muted">
                  One argument essay (15 marks) and one narrative essay (10 marks) in {ov.essays.duration_min} minutes.
                </p>
                <StartButton
                  endpoint="/essay-practice"
                  body={{ category: c.code }}
                  essays
                  size="sm"
                  variant="secondary"
                  className="mt-4"
                  disabled={!ov.essays.argument || !ov.essays.narrative}
                >
                  Start essay practice
                </StartButton>
              </Card>
            )}
          </div>
        </div>
      </section>

      <PracticePanel category={c.code} sections={ov.sections} />
    </>
  );
}
