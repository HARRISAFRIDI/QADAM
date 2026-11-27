import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { CreateDeckForm } from "@/features/admin/deck-forms";
import type { Taxonomy } from "@/features/admin/types";
import { pageApi } from "@/lib/api/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Flashcards" };

interface DeckRow {
  id: number;
  kind: string;
  title: string;
  status: string;
  exam: string | null;
  subject: string | null;
  card_count: number;
  updated_at: string;
}

const KIND_LABEL: Record<string, string> = { vocabulary: "Vocabulary", formula: "Formulas", fact: "Facts" };

export default async function DecksPage() {
  const [decks, tax] = await Promise.all([
    pageApi<DeckRow[]>("/admin/decks", {}, "/admin/decks"),
    pageApi<Taxonomy>("/admin/taxonomy", {}, "/admin/decks"),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Memorize"
        title="Flashcard decks"
        description="Vocabulary, formulas and facts for the Memorize section. Students see published decks for their test and category."
      />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title={`All decks (${decks.length})`} />
          {decks.length === 0 ? (
            <EmptyState title="No decks yet" description="Create one with the form, or run: python -m scripts.seed_starter" />
          ) : (
            <ul className="divide-y divide-line">
              {decks.map((d) => (
                <li key={d.id}>
                  <Link href={`/admin/decks/${d.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-paper">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-forest-950">{d.title}</p>
                      <p className="text-xs text-muted">
                        {KIND_LABEL[d.kind] ?? d.kind} · {d.exam ?? "HAT + USAT"} · {d.subject ?? "every category"} · {d.card_count} cards ·{" "}
                        {formatDate(d.updated_at)}
                      </p>
                    </div>
                    <Badge tone={d.status === "published" ? "success" : "gold"}>{d.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="New deck" />
          <div className="p-5">
            <CreateDeckForm subjects={tax.subjects.map((s) => ({ id: s.id, name: s.name }))} />
          </div>
        </Card>
      </div>
    </>
  );
}
