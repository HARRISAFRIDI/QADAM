import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock3 } from "lucide-react";

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
        eyebrow="Step 2 · Choose your category"
        title={exam.name}
        description={
          exam.code === "HAT"
            ? "Pick the category that matches your academic discipline. Each category has its own section weightage."
            : "Pick your USAT category. Verbal and Quantitative are common, and the subject section depends on your category."
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {exam.categories.map((c) => (
          <Link
            key={c.id}
            href={`/prepare/${exam.code.toLowerCase()}/${c.code.toLowerCase()}`}
            className="group flex flex-col rounded-xl border border-line bg-surface p-5 shadow-card transition-[border-color,box-shadow] hover:border-forest-700 hover:shadow-raised"
          >
            <div className="flex items-center justify-between">
              <p className="text-xl font-extrabold text-forest-950">{c.code}</p>
              <ArrowRight className="h-5 w-5 text-muted transition-transform group-hover:translate-x-1 group-hover:text-forest-900" aria-hidden />
            </div>
            {c.name !== c.code && <p className="text-sm font-medium text-ink-soft">{c.name}</p>}
            {c.disciplines.length > 0 && (
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.disciplines.join(" · ")}</p>
            )}
            <div className="mt-4 space-y-1.5 border-t border-line pt-4">
              {c.sections.map((s) => (
                <div key={s.code} className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{s.name}</span>
                  <span className="tabular font-bold text-forest-900">{s.mcq_count}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>
                <Clock3 className="h-3 w-3" aria-hidden /> {c.total_mcqs} MCQs · {c.mcq_duration_min} min
              </Badge>
              {c.essay_duration_min && <Badge tone="gold">Essays · {c.essay_duration_min} min</Badge>}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
