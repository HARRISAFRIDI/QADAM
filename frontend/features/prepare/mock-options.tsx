import { Clock3, FileText, PenLine, Timer } from "lucide-react";

import { Badge, Card } from "@/components/ui/card";
import { AvailabilityBadge } from "@/features/prepare/practice-panel";
import { StartButton } from "@/features/prepare/start-button";
import type { CategoryOverview } from "@/lib/api/types";

/** Full mock, fixed mock papers and essay practice for one category. */
export function MockOptions({ ov, heading = "Choose how to prepare" }: { ov: CategoryOverview; heading?: string | null }) {
  const c = ov.category;
  return (
    <>
      {/* Full mock */}
      <section className="mb-10">
        {heading && <h2 className="mb-3 text-sm font-bold text-muted">{heading}</h2>}
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Card className="relative overflow-hidden rounded-3xl border-indigo-100 bg-linear-to-br from-blue-50 via-indigo-50 to-violet-100 p-6 shadow-card sm:p-7">
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgb(196_181_253/0.45),transparent_40%)]" aria-hidden />
            <Timer className="pointer-events-none absolute -bottom-6 right-4 h-36 w-36 text-indigo-500/10" aria-hidden />
            <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-[0_6px_14px_-4px_rgb(79_70_229/0.6)]">
              <Timer className="h-6 w-6" aria-hidden />
            </span>
            <p className="relative mt-4 text-sm font-semibold text-indigo-700">Full mock test</p>
            <h3 className="relative mt-1 text-2xl font-extrabold text-forest-950">Real exam conditions</h3>
            <p className="relative mt-1.5 max-w-lg text-sm text-ink-soft">
              {ov.total_mcqs} MCQs in {c.mcq_duration_min} minutes with the official {c.code} weightage
              {ov.essays ? `, then two essays in ${ov.essays.duration_min} minutes (type them, or write on paper and self-score)` : ""}.
              Refreshing the page will not stop the timer or lose your answers.
            </p>
            <div className="relative mt-4 flex flex-wrap items-center gap-2">
              <AvailabilityBadge available={ov.total_available} required={ov.total_mcqs} />
              <Badge>
                <Clock3 className="h-3 w-3" aria-hidden /> {c.mcq_duration_min} min
              </Badge>
            </div>
            <StartButton
              endpoint="/attempts"
              body={{ category: c.code }}
              size="lg"
              className="relative mt-6"
              disabled={ov.total_available === 0}
              confirmText={`Start the ${c.code} full mock now? The ${c.mcq_duration_min}-minute timer starts immediately.`}
            >
              Start full mock
            </StartButton>
          </Card>

          <div className="space-y-4">
            {ov.mocks.length > 0 && (
              <Card className="overflow-hidden rounded-3xl">
                <p className="flex items-center gap-3 border-b border-line bg-linear-to-r from-emerald-50 to-white px-5 py-3.5 text-sm font-bold text-forest-950">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 text-white">
                    <FileText className="h-4 w-4" aria-hidden />
                  </span>
                  Fixed mock papers
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
              <Card className="relative overflow-hidden rounded-3xl border-orange-100 bg-linear-to-br from-amber-50 via-white to-orange-50 p-5">
                <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-amber-500 to-orange-500" aria-hidden />
                <p className="flex items-center gap-3 text-sm font-bold text-forest-950">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-linear-to-br from-amber-500 to-orange-600 text-white">
                    <PenLine className="h-4 w-4" aria-hidden />
                  </span>
                  Essay practice
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

    </>
  );
}
