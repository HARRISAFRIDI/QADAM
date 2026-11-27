import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookMarked, CalendarDays, FileText, HelpCircle, History, LayoutList, Megaphone, MessageSquareHeart } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/api/server";
import { hueAt } from "@/lib/palette";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "More" };

export default async function MorePage() {
  const me = await requireUser("/more");
  const exam = (me.target_exam ?? "HAT").toLowerCase();
  const items = [
    { href: "/history", label: "My history", body: "Every practice session, quiz and mock with its score.", icon: History },
    { href: `/prepare/${exam}`, label: "Test structure", body: `${me.target_exam} categories, sections, number of MCQs and timing.`, icon: LayoutList },
    { label: "Past papers", body: "Real papers with answer keys and solutions.", icon: FileText, soon: true },
    { label: "Test syllabus", body: "Topic-by-topic syllabus for your category.", icon: BookMarked, soon: true },
    { label: "Test dates", body: "Upcoming test dates and registration deadlines.", icon: CalendarDays, soon: true },
    { label: "Announcements", body: "News and updates from the QADAM team.", icon: Megaphone, soon: true },
    { label: "Guides & FAQs", body: "How the tests work, scoring, and preparation tips.", icon: HelpCircle, soon: true },
    { label: "Feedback", body: "Tell us what to improve or report a wrong question.", icon: MessageSquareHeart, soon: true },
  ];
  return (
    <>
      <PageHeader eyebrow="Resources" title="More" description="Your history, test information and student resources." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => {
          const hue = hueAt(i);
          const inner = (
            <>
              <span className={cn("absolute inset-x-0 top-0 h-1", hue.line)} aria-hidden />
              <span className="flex items-start gap-3">
                <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", it.soon ? "bg-sage-100 text-sage-500" : hue.tile)}>
                  <it.icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-bold text-forest-950">
                    {it.label}
                    {it.soon && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">Soon</span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm text-muted">{it.body}</span>
                </span>
                {!it.soon && <ArrowRight className={cn("h-5 w-5 shrink-0", hue.text)} aria-hidden />}
              </span>
            </>
          );
          const cls = "relative block overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card";
          return it.href ? (
            <Link key={it.label} href={it.href} className={cn(cls, "transition-[transform,border-color] duration-200 hover:-translate-y-0.5", hue.hover)}>
              {inner}
            </Link>
          ) : (
            <div key={it.label} className={cn(cls, "opacity-80")} aria-disabled>
              {inner}
            </div>
          );
        })}
      </div>
    </>
  );
}
