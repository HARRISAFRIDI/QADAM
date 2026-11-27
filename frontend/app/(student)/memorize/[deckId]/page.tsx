import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Play } from "lucide-react";

import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/button";
import { pageApi } from "@/lib/api/server";
import type { CardStatus, DeckDetail } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Deck" };

const STATUS: Record<CardStatus, string> = {
  new: "bg-sage-100 text-ink-soft",
  learning: "bg-violet-50 text-violet-700",
  mastered: "bg-emerald-50 text-emerald-700",
};

export default async function DeckPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  if (!/^\d+$/.test(deckId)) notFound();
  const deck = await pageApi<DeckDetail>(`/memorize/decks/${deckId}`);
  const formula = deck.kind === "formula";
  return (
    <>
      <Breadcrumbs items={[{ href: "/memorize", label: "Memorize" }, { label: deck.title }]} />
      <PageHeader
        eyebrow={`${deck.subject ?? "All subjects"} · ${deck.cards.length} cards`}
        title={deck.title}
        description={deck.description ?? undefined}
        action={
          <LinkButton href={`/memorize/review?deck=${deck.id}`}>
            <Play className="h-4 w-4" aria-hidden /> Review this deck
          </LinkButton>
        }
      />
      <ul className={cn("grid gap-3", formula ? "md:grid-cols-2" : "")}>
        {deck.cards.map((c, i) => (
          <li key={c.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <div className="flex items-start gap-3">
              <span className="tabular mt-0.5 w-6 shrink-0 text-xs font-bold text-muted">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold text-forest-950">{c.front}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold capitalize", STATUS[c.status])}>{c.status}</span>
                </div>
                <p className={cn("mt-1 text-ink-soft", formula && "font-semibold text-blue-800")}>{c.back}</p>
                {c.example && <p className="mt-1.5 text-sm italic text-muted">{c.example}</p>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
