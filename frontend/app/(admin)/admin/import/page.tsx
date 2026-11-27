import { PageHeader } from "@/components/shared/page-header";
import { ImportForm } from "@/features/admin/import-form";

export default function ImportPage() {
  return (
    <>
      <PageHeader
        eyebrow="Question bank"
        title="Import MCQs"
        description="Check the file first. Valid rows are imported as drafts, and you publish them after review."
      />
      <ImportForm />
    </>
  );
}
