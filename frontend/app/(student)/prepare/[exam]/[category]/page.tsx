import type { Metadata } from "next";
import { Layers, PenLine } from "lucide-react";

import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";
import { PracticePanel, RememberCategory } from "@/features/prepare/practice-panel";
import { MockOptions } from "@/features/prepare/mock-options";
import { getMe, pageApi } from "@/lib/api/server";
import type { CategoryOverview } from "@/lib/api/types";
import { hueAt } from "@/lib/palette";
import { cn } from "@/lib/utils";

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
        {ov.sections.map((s, i) => {
          const hue = hueAt(i);
          return (
            <div key={s.id} className={cn("relative overflow-hidden rounded-2xl border px-4 py-3.5 shadow-card", hue.soft, hue.softBorder)}>
              <span className={cn("absolute inset-x-0 top-0 h-1", hue.line)} aria-hidden />
              <p className={cn("flex items-center gap-1.5 truncate text-xs font-semibold", hue.text)}>
                <Layers className="h-3.5 w-3.5" aria-hidden /> {s.name}
              </p>
              <p className="tabular mt-1 text-2xl font-extrabold text-forest-950">
                {s.mcq_count}
                <span className="ml-1 text-sm font-semibold text-muted">MCQs</span>
              </p>
            </div>
          );
        })}
        {ov.essays && (
          <div className="relative overflow-hidden rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3.5 shadow-card">
            <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-amber-500 to-orange-500" aria-hidden />
            <p className="flex items-center gap-1.5 text-xs font-semibold text-orange-700">
              <PenLine className="h-3.5 w-3.5" aria-hidden /> Essays
            </p>
            <p className="tabular mt-1 text-2xl font-extrabold text-forest-950">
              2<span className="ml-1 text-sm font-semibold text-muted">25 marks</span>
            </p>
          </div>
        )}
      </div>

      <MockOptions ov={ov} />

      <PracticePanel category={c.code} sections={ov.sections} />
    </>
  );
}
