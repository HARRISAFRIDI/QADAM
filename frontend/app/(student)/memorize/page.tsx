import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Brain, CheckCircle2, Clock3, Eye, Lightbulb, Play, Sigma, Sparkles, SpellCheck } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { pageApi } from "@/lib/api/server";
import type { DeckKind, Decks } from "@/lib/api/types";
import { HUES, type Hue } from "@/lib/palette";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Memorize" };

const KIND: Record<DeckKind, { label: string; icon: typeof Brain; hue: Hue; blurb: string }> = {
  vocabulary: { label: "Vocabulary", icon: SpellCheck, hue: HUES.violet, blurb: "Words with meanings and example sentences" },
  formula: { label: "Formulas", icon: Sigma, hue: HUES.blue, blurb: "Formula sheets you can drill" },
  fact: { label: "Important facts", icon: Lightbulb, hue: HUES.orange, blurb: "Rules, definitions and quick facts" },
};

export default async function MemorizePage() {
  const data = await pageApi<Decks>("/memorize/decks");
  const { totals } = data;
  const toReview = totals.due + Math.min(10, totals.new);
  const kinds = (Object.keys(KIND) as DeckKind[]).filter((k) => data.decks.some((d) => d.kind === k));

  return (
    <>
      <PageHeader
        eyebrow="Revise"
        title="Memorize"
        description="Flashcards with spaced repetition: each card comes back just before you would forget it."
      />

      <section className="relative mb-8 overflow-hidden rounded-3xl bg-linear-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-[0_24px_48px_-20px_rgb(139_92_246/0.55)]">
        <span
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgb(255_255_255/0.18),transparent_40%)]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 px-5 py-7 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-100">
              <Sparkles className="h-4 w-4" aria-hidden /> Today&apos;s review
            </p>
            <p className="mt-1 text-3xl font-extrabold text-white sm:text-4xl">
              {totals.due > 0 ? `${totals.due} card${totals.due === 1 ? "" : "s"} due` : totals.new > 0 ? "Learn new cards" : "All caught up"}
            </p>
            <p className="mt-1.5 max-w-lg text-violet-50/90">
              {totals.due > 0
                ? "Review them now, then add up to 10 new cards."
                : totals.new > 0
                  ? "Each session adds up to 10 new cards so you are never overloaded."
                  : "Nothing is due. Come back tomorrow, or browse a deck."}
            </p>
            {toReview > 0 && (
              <LinkButton href="/memorize/review" variant="gold" className="mt-5">
                <Play className="h-4 w-4" aria-hidden /> Start review ({toReview})
              </LinkButton>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[460px]">
            {[
              { k: "Due", v: totals.due, icon: Clock3 },
              { k: "New", v: totals.new, icon: Sparkles },
              { k: "Mastered", v: totals.mastered, icon: CheckCircle2 },
              { k: "Reviewed today", v: totals.reviewed_today, icon: Brain },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border border-white/20 bg-white/10 px-3 py-3">
                <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-violet-100">
                  <s.icon className="h-3.5 w-3.5" aria-hidden /> {s.k}
                </dt>
                <dd className="tabular mt-0.5 text-2xl font-extrabold">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {data.decks.length === 0 ? (
        <Card className="rounded-3xl">
          <EmptyState icon={<Brain className="h-5 w-5" />} title="No decks yet" description="Flashcard decks for your test will appear here." />
        </Card>
      ) : (
        kinds.map((k) => {
          const meta = KIND[k];
          return (
            <section key={k} className="mb-8">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <span className={cn("grid h-8 w-8 place-items-center rounded-lg", meta.hue.tile)}>
                  <meta.icon className="h-4 w-4" aria-hidden />
                </span>
                {meta.label}
                <span className="text-sm font-normal text-muted">· {meta.blurb}</span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.decks
                  .filter((d) => d.kind === k)
                  .map((d) => {
                    const learning = d.total - d.new - d.mastered;
                    return (
                      <div key={d.id} className="relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card">
                        <span className={cn("absolute inset-x-0 top-0 h-1", meta.hue.line)} aria-hidden />
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold leading-snug text-forest-950">{d.title}</p>
                            <p className="mt-0.5 text-xs text-muted">
                              {d.subject ?? "All subjects"} · {d.total} cards
                            </p>
                          </div>
                          {d.due > 0 && (
                            <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">{d.due} due</span>
                          )}
                        </div>
                        {d.description && <p className="mt-3 line-clamp-2 text-sm text-ink-soft">{d.description}</p>}
                        <div className="mt-4">
                          <div className="flex h-2 overflow-hidden rounded-full bg-sage-100" aria-hidden>
                            <span className="h-full bg-emerald-500" style={{ width: `${(d.mastered * 100) / d.total}%` }} />
                            <span className={cn("h-full", meta.hue.bar)} style={{ width: `${(learning * 100) / d.total}%` }} />
                          </div>
                          <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-muted">
                            <span>
                              <b className="text-emerald-700">{d.mastered}</b> mastered
                            </span>
                            <span>
                              <b className={meta.hue.text}>{learning}</b> learning
                            </span>
                            <span>
                              <b className="text-ink-soft">{d.new}</b> new
                            </span>
                          </p>
                        </div>
                        <div className="mt-5 flex gap-2 pt-1">
                          <LinkButton href={`/memorize/review?deck=${d.id}`} size="sm" className="flex-1" aria-disabled={!d.due && !d.new}>
                            <Play className="h-4 w-4" aria-hidden /> Review
                          </LinkButton>
                          <Link
                            href={`/memorize/${d.id}`}
                            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong px-3 text-sm font-semibold text-forest-900 hover:bg-forest-50"
                          >
                            <Eye className="h-4 w-4" aria-hidden /> Browse
                          </Link>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          );
        })
      )}

      <p className="flex items-center gap-1.5 text-sm text-muted">
        How it works: rate each card honestly. <b>Again</b> brings it back in 10 minutes, <b>Good</b> in a day, then 3 days, then longer and
        longer. <ArrowRight className="h-3.5 w-3.5" aria-hidden /> A card with a gap of 3 weeks counts as mastered.
      </p>
    </>
  );
}
