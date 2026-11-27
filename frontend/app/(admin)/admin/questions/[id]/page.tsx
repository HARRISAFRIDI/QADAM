import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";
import { Alert } from "@/components/ui/card";
import { QuestionEditor } from "@/features/admin/question-editor";
import type { AdminQuestion, Taxonomy } from "@/features/admin/types";
import { pageApi } from "@/lib/api/server";

export default async function EditQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [taxonomy, question] = await Promise.all([
    pageApi<Taxonomy>("/admin/taxonomy", {}, `/admin/questions/${id}`),
    pageApi<AdminQuestion>(`/admin/questions/${encodeURIComponent(id)}`, {}, `/admin/questions/${id}`),
  ]);
  return (
    <>
      <Breadcrumbs items={[{ href: "/admin/questions", label: "Questions" }, { label: `#${question.id}` }]} />
      <PageHeader title={`Question #${question.id}`} description={question.import_batch ? `Imported in batch ${question.import_batch}` : undefined} />
      {sp.created && <Alert tone="success" className="mb-4">Question created.</Alert>}
      <QuestionEditor key={question.updated_at} taxonomy={taxonomy} question={question} />
    </>
  );
}
