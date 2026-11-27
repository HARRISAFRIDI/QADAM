import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { AddCardsForm, CardRow, DeckStatusButtons, EditDeckForm, type AdminDeck } from "@/features/admin/deck-forms";
import type { Taxonomy } from "@/features/admin/types";
import { pageApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Edit deck" };

type DeckFull = AdminDeck & { card_count: number; cards: { id: number; front: string; back: string; example: string | null }[] };

export default async function DeckEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [deck, tax] = await Promise.all([
    pageApi<DeckFull>(`/admin/decks/${id}`, {}, "/admin/decks"),
    pageApi<Taxonomy>("/admin/taxonomy", {}, "/admin/decks"),
  ]);
  const subjects = tax.subjects.map((s) => ({ id: s.id, name: s.name }));
  return (
    <>
      <Breadcrumbs items={[{ href: "/admin/decks", label: "Flashcards" }, { label: deck.title }]} />
      <PageHeader
        eyebrow={<Badge tone={deck.status === "published" ? "success" : "gold"}>{deck.status}</Badge>}
        title={deck.title}
        description={`${deck.card_count} cards`}
        action={<DeckStatusButtons deck={deck} />}
      />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader title="Cards" description="Edits apply straight away. Students keep their progress on edited cards." />
          {deck.cards.length === 0 ? (
            <EmptyState title="No cards yet" description="Add some with the form." />
          ) : (
            <div className="divide-y divide-line">
              {deck.cards.map((c, i) => (
                <CardRow key={c.id} card={c} n={i + 1} />
              ))}
            </div>
          )}
        </Card>
        <div className="space-y-6">
          <Card>
            <div className="p-5">
              <AddCardsForm deckId={deck.id} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Deck details" />
            <div className="p-5">
              <EditDeckForm deck={deck} subjects={subjects} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
