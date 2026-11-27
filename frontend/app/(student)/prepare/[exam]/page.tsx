import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock3, GraduationCap } from "lucide-react";

import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/card";
import { serverApi } from "@/lib/api/server";
import type { Exam } from "@/lib/api/types";

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
        {exam.categories.map((c) => (
          <Link
            key={c.id}
            href={`/prepare/${exam.code.toLowerCase()}/${c.code.toLowerCase()}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-forest-600 hover:shadow-hover"
          >
            <div className="flex items-start gap-3 border-b border-line bg-forest-50/70 px-5 py-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest-900 text-white shadow-card">
                <GraduationCap className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-extrabold leading-tight text-forest-950">{c.code}</p>
                {c.name !== c.code && <p className="truncate text-sm font-medium text-ink-soft">{c.name}</p>}
              </div>
            </div>
            <div className="flex flex-1 flex-col px-5 py-4">
              {c.disciplines.length > 0 && (
                <p className="mb-4 text-sm leading-relaxed text-muted">{c.disciplines.join(", ")}</p>
              )}
              <div className="mt-auto space-y-2.5">
                {c.sections.map((s) => (
                  <div key={s.code}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate text-ink-soft">{s.name}</span>
                      <span className="tabular font-bold text-forest-950">{s.mcq_count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sage-100">
                      <div
                        className="h-full rounded-full bg-forest-600"
                        style={{ width: `${c.total_mcqs ? Math.round((s.mcq_count * 100) / c.total_mcqs) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3.5">
              <span className="flex flex-wrap gap-1.5">
                <Badge>
                  <Clock3 className="h-3 w-3" aria-hidden /> {c.total_mcqs} MCQs, {c.mcq_duration_min} min
                </Badge>
                {c.essay_duration_min && <Badge tone="gold">+ essays {c.essay_duration_min} min</Badge>}
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-forest-700 transition-transform group-hover:translate-x-1" aria-hidden />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
