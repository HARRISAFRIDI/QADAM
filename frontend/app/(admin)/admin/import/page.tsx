import { PageHeader } from "@/components/shared/page-header";
import { ImportForm } from "@/features/admin/import-form";
import type { Taxonomy } from "@/features/admin/types";
import { pageApi } from "@/lib/api/server";

export default async function ImportPage() {
  const taxonomy = await pageApi<Taxonomy>("/admin/taxonomy", {}, "/admin/import");
  return (
    <>
      <PageHeader
        eyebrow="Question bank"
        title="Import MCQs"
        description="Upload a question paper (PDF, Word, TXT) or a spreadsheet. Check it first. Questions are imported as drafts, and you publish them after review."
      />
      <ImportForm taxonomy={taxonomy} />
    </>
  );
}
