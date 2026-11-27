import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock3, GraduationCap } from "lucide-react";

import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/card";
import { serverApi } from "@/lib/api/server";
import type { Exam } from "@/lib/api/types";
import { hueAt } from "@/lib/palette";
import { cn } from "@/lib/utils";

/** Section colours for the weightage bar, in order. */
const SEG = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-orange-500", "bg-sky-500", "bg-rose-500"];

export async function generateMetadata({ params }: { params: Promise<{ exam: string }> }): Promise<Metadata> {
  const { exam } = await params;
  return { title: `${exam.toUpperCase()} categories` };
}

export default async function ExamPage({ params }: { params: Promise<{ exam: string }> }) {
  const { exam: examSlug } = await params;
  const exams = await serverApi<Exam[]>("/exams", { revalidate: 60, tags: ["catalog"] });
  const exam = exams.find((e) => e.code.toLowerCase() === examSlug.toLowerCase());
  if (!exam) notFound();

  return (
    <>
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { label: exam.code }]} />
      <PageHeader
        eyebrow="Choose your category"
        title={exam.name}
        description={
          exam.code === "HAT"
            ? "Pick the category that matches your academic discipline. Each category has its own section weightage."
            : "Pick your USAT category. Verbal and Quantitative are common, and the subject section depends on your category."
        }
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {exam.categories.map((c, i) => {
          const hue = hueAt(i);
          return (
            <Link
              key={c.id}
              href={`/prepare/${exam.code.toLowerCase()}/${c.code.toLowerCase()}`}
              className={cn(
                "group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1",
                hue.hover,
              )}
            >
              <div className={cn("relative overflow-hidden px-5 py-5 text-white", hue.grad)}>
                <GraduationCap
                  className="pointer-events-none absolute -bottom-5 -right-3 h-24 w-24 text-white/10 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110"
                  aria-hidden
                />
                <div className="relative flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30">
                    <GraduationCap className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xl font-extrabold leading-tight text-white">{c.code}</p>
                    {c.name !== c.code && <p className="truncate text-sm font-medium text-white/90">{c.name}</p>}
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col px-5 py-5">
                {c.disciplines.length > 0 && (
                  <div className="mb-5 flex flex-wrap gap-1.5">
                    {c.disciplines.map((d) => (
                      <span key={d} className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", hue.soft, hue.text)}>
                        {d}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-auto">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Section weightage</p>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-sage-100" aria-hidden>
                    {c.sections.map((s, j) => (
                      <span
                        key={s.code}
                        className={cn("h-full border-r-2 border-white last:border-r-0", SEG[j % SEG.length])}
                        style={{ width: `${c.total_mcqs ? (s.mcq_count * 100) / c.total_mcqs : 0}%` }}
                      />
                    ))}
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {c.sections.map((s, j) => (
                      <li key={s.code} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", SEG[j % SEG.length])} aria-hidden />
                          <span className="truncate text-ink-soft">{s.name}</span>
                        </span>
                        <span className="tabular font-bold text-forest-950">{s.mcq_count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3.5">
                <span className="flex flex-wrap gap-1.5">
                  <Badge>
                    <Clock3 className="h-3 w-3" aria-hidden /> {c.total_mcqs} MCQs, {c.mcq_duration_min} min
                  </Badge>
                  {c.essay_duration_min && <Badge tone="gold">+ essays {c.essay_duration_min} min</Badge>}
                </span>
                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full transition-transform group-hover:translate-x-1", hue.tile)}>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
