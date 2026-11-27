import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/features/admin/action-button";
import { InlineNumber, TopicManager } from "@/features/admin/forms";
import type { Taxonomy } from "@/features/admin/types";
import { pageApi } from "@/lib/api/server";

export default async function TaxonomyPage() {
  const t = await pageApi<Taxonomy>("/admin/taxonomy", {}, "/admin/taxonomy");
  const sec = Object.fromEntries(t.sections.map((s) => [s.id, s.name]));
  const sub = Object.fromEntries(t.subjects.map((s) => [s.id, s.name]));

  return (
    <>
      <PageHeader
        eyebrow="Structure"
        title="Tests, categories & topics"
        description="Changes apply to new attempts within about a minute. The official weightage is pre-configured, so edit it only if the official pattern changes."
      />

      <div className="space-y-6">
        {t.exams.map((exam) => (
          <Card key={exam.id}>
            <CardHeader title={`${exam.code} categories`} description="Durations (minutes) and MCQs per subject" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Category</th>
                    <th className="px-4 py-2.5 font-semibold">MCQ min</th>
                    {exam.code === "USAT" && <th className="px-4 py-2.5 font-semibold">Essay min</th>}
                    <th className="px-4 py-2.5 font-semibold">Weightage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {t.categories
                    .filter((c) => c.exam_id === exam.id)
                    .map((c) => {
                      const bps = t.blueprints.filter((b) => b.category_id === c.id);
                      return (
                        <tr key={c.id} className="align-top">
                          <td className="px-4 py-3">
                            <p className="font-bold text-forest-900">{c.code}</p>
                            <p className="tabular text-xs text-muted">{bps.reduce((a, b) => a + b.mcq_count, 0)} MCQs</p>
                          </td>
                          <td className="px-4 py-3">
                            <InlineNumber path={`/admin/categories/${c.id}`} field="mcq_duration_min" value={c.mcq_duration_min} label={`${c.code} MCQ minutes`} />
                          </td>
                          {exam.code === "USAT" && (
                            <td className="px-4 py-3">
                              <InlineNumber path={`/admin/categories/${c.id}`} field="essay_duration_min" value={c.essay_duration_min} label={`${c.code} essay minutes`} />
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="grid gap-1.5 sm:grid-cols-2">
                              {bps.map((b) => (
                                <div key={b.id} className="flex items-center justify-between gap-2 rounded-md bg-paper px-2 py-1">
                                  <span className="truncate text-xs">
                                    <span className="text-muted">{sec[b.section_id]} · </span>
                                    {sub[b.subject_id]}
                                  </span>
                                  <InlineNumber path={`/admin/blueprints/${b.id}`} field="mcq_count" value={b.mcq_count} max={200} label={`${c.code} ${sub[b.subject_id]} count`} />
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}

        <h2 className="pt-2 text-lg font-extrabold">Subjects & topics</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {t.subjects.map((s) => {
            const topics = t.topics.filter((tp) => tp.subject_id === s.id);
            return (
              <Card key={s.id}>
                <CardHeader title={s.name} description={`${topics.filter((x) => x.is_active).length} active topics`} />
                <div className="p-4">
                  <TopicManager subjectId={s.id}>
                    <ul className="flex flex-wrap gap-1.5">
                      {topics.map((tp) => (
                        <li key={tp.id} className="flex items-center gap-1 rounded-full border border-line bg-paper py-0.5 pl-2.5 pr-0.5 text-xs">
                          <span className={tp.is_active ? "" : "text-muted line-through"}>{tp.name}</span>
                          <ActionButton path={`/admin/topics/${tp.id}`} method="PATCH" body={{ is_active: !tp.is_active }} variant="ghost" size="sm">
                            <span className="text-[11px]">{tp.is_active ? "Hide" : "Show"}</span>
                          </ActionButton>
                        </li>
                      ))}
                    </ul>
                  </TopicManager>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
