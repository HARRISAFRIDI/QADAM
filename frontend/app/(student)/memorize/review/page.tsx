import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/shared/page-header";
import { Reviewer } from "@/features/memorize/reviewer";

export const metadata: Metadata = { title: "Flashcard review" };

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ deck?: string }> }) {
  const { deck } = await searchParams;
  const deckId = deck && /^\d+$/.test(deck) ? Number(deck) : null;
  return (
    <>
      <Breadcrumbs items={[{ href: "/memorize", label: "Memorize" }, { label: "Review" }]} />
      <Reviewer deckId={deckId} />
    </>
  );
}
