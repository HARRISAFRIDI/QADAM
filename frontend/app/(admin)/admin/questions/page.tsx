import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { LinkButton, buttonClass } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { ActionButton } from "@/features/admin/action-button";
import { QuestionActions } from "@/features/admin/question-actions";
import type { QuestionRow, Taxonomy } from "@/features/admin/types";
import { pageApi } from "@/lib/api/server";
import type { Page } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

type SP = { exam_id?: string; subject_id?: string; status?: string; q?: string; batch?: string; page?: string };

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  (["exam_id", "subject_id", "status", "q", "batch"] as const).forEach((k) => sp[k] && params.set(k, sp[k]!));
  params.set("page", sp.page ?? "1");
  params.set("page_size", "25");

  const [data, tax] = await Promise.all([
    pageApi<Page<QuestionRow>>(`/admin/questions?${params}`, {}, "/admin/questions"),
    pageApi<Taxonomy>("/admin/taxonomy", {}, "/admin/questions"),
  ]);
  const statusTone = { draft: "gold", published: "success", archived: "neutral" } as const;
  const canBulkPublish = (sp.batch || sp.status === "draft") && data.total > 0;

  return (
    <>
      <PageHeader
        eyebrow="Question bank"
        title="Questions"
        description="Only published questions are shown to students."
        action={
          <div className="flex gap-2">
            <LinkButton href="/admin/import" variant="secondary">Import</LinkButton>
            <LinkButton href="/admin/questions/new">New question</LinkButton>
          </div>
        }
      />

      <form className="mb-4 grid gap-2 rounded-lg border border-line bg-surface p-3 shadow-card sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_2fr_auto]">
        <Select name="exam_id" defaultValue={sp.exam_id ?? ""} aria-label="Exam">
          <option value="">All exams</option>
          {tax.exams.map((e) => (
            <option key={e.id} value={e.id}>{e.code}</option>
          ))}
        </Select>
        <Select name="subject_id" defaultValue={sp.subject_id ?? ""} aria-label="Subject">
          <option value="">All subjects</option>
          {tax.subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <Select name="status" defaultValue={sp.status ?? ""} aria-label="Status">
          <option value="">Draft + published</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </Select>
        <Input name="q" defaultValue={sp.q ?? ""} placeholder="Search text or ID…" aria-label="Search" />
        {sp.batch && <input type="hidden" name="batch" value={sp.batch} />}
        <button className={buttonClass("primary", "md")} type="submit">Filter</button>
      </form>

      {(sp.batch || canBulkPublish) && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gold-200 bg-gold-100/60 px-4 py-3 text-sm">
          {sp.batch && (
            <span>
              Import batch <code className="font-bold">{sp.batch}</code> ·{" "}
              <Link href="/admin/questions" className="font-semibold text-forest-700 hover:underline">clear</Link>
            </span>
          )}
          {canBulkPublish && sp.batch && (
            <ActionButton
              path="/admin/questions/bulk-status"
              body={{ batch: sp.batch, status: "published" }}
              variant="primary"
              confirmText="Publish every question in this import batch? Students will be able to see them."
              onDoneMessage="Published {updated} questions."
            >
              Publish this batch
            </ActionButton>
          )}
          {canBulkPublish && !sp.batch && (
            <ActionButton
              path="/admin/questions/bulk-status"
              body={{ ids: data.items.filter((i) => i.status === "draft").map((i) => i.id), status: "published" }}
              variant="primary"
              confirmText="Publish the draft questions on this page?"
              onDoneMessage="Published {updated} questions."
            >
              Publish drafts on this page
            </ActionButton>
          )}
        </div>
      )}

      <Card>
        {data.items.length === 0 ? (
          <EmptyState
            icon={<FileQuestion className="h-5 w-5" />}
            title="No questions found"
            description="Try another filter, or import your MCQs."
            action={<LinkButton href="/admin/import">Import MCQs</LinkButton>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="border-b border-line bg-paper text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Question</th>
                  <th className="px-4 py-3 font-semibold">Subject / Topic</th>
                  <th className="px-4 py-3 text-center font-semibold">Ans</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((q) => (
                  <tr key={q.id} className="hover:bg-paper">
                    <td className="tabular px-4 py-3 text-muted">{q.id}</td>
                    <td className="max-w-md px-4 py-3">
                      <Link href={`/admin/questions/${q.id}`} className="line-clamp-2 font-medium text-forest-950 hover:underline">
                        {q.stem}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{q.exam}</span> · {q.subject}
                      {q.topic && <span className="block text-xs text-muted">{q.topic}</span>}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-forest-900">{q.correct_option}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone[q.status as keyof typeof statusTone] ?? "neutral"}>{q.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{formatDate(q.updated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <QuestionActions id={q.id} status={q.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Pagination
        page={data.page}
        pageSize={data.page_size}
        total={data.total}
        basePath="/admin/questions"
        params={{ exam_id: sp.exam_id, subject_id: sp.subject_id, status: sp.status, q: sp.q, batch: sp.batch }}
      />
    </>
  );
}
