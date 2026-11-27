import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { PracticePanel } from "@/features/prepare/practice-panel";
import { getTrack } from "@/lib/api/track";
import { hueAt } from "@/lib/palette";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Practice" };

export default async function PracticePage() {
  const { ov } = await getTrack("/practice");
  const c = ov.category;
  return (
    <>
      <PageHeader
        eyebrow={`${ov.exam.code} · ${c.code}`}
        title="Practice"
        description="Choose a section or a subject from your question bank. Check each answer as you go and read the explanation."
        action={
          <Link href={`/prepare/${ov.exam.code.toLowerCase()}`} className="text-sm font-semibold text-blue-700 hover:underline">
            Other categories
          </Link>
        }
      />
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
                {s.available}
                <span className="ml-1 text-sm font-semibold text-muted">ready</span>
              </p>
            </div>
          );
        })}
      </div>
      <PracticePanel category={c.code} sections={ov.sections} />
    </>
  );
}
