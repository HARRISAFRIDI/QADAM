import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";
import { QuestionEditor } from "@/features/admin/question-editor";
import type { Taxonomy } from "@/features/admin/types";
import { pageApi } from "@/lib/api/server";

export default async function NewQuestionPage() {
  const taxonomy = await pageApi<Taxonomy>("/admin/taxonomy", {}, "/admin/questions/new");
  return (
    <>
      <Breadcrumbs items={[{ href: "/admin/questions", label: "Questions" }, { label: "New" }]} />
      <PageHeader title="New question" />
      <QuestionEditor taxonomy={taxonomy} />
    </>
  );
}
