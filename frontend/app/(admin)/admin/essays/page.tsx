import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { ActionButton } from "@/features/admin/action-button";
import { EssayTopicForm } from "@/features/admin/forms";
import { pageApi } from "@/lib/api/server";
import type { Page } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

interface QueueItem {
  attempt_id: string;
  title: string;
  category_code: string;
  submitted_at: string | null;
  student_name: string;
  student_email: string;
}
interface Topic {
  id: number;
  essay_type: string;
  prompt: string;
  status: string;
}

export default async function EssaysAdminPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status === "graded" ? "graded" : "submitted";
  const [queue, topics] = await Promise.all([
    pageApi<Page<QueueItem>>(`/admin/essays?status=${status}`, {}, "/admin/essays"),
    pageApi<Topic[]>("/admin/essay-topics", {}, "/admin/essays"),
  ]);
  const byType = (t: string) => topics.filter((x) => x.essay_type === t);

  return (
    <>
      <PageHeader eyebrow="USAT" title="Essays" description="Grade submitted essays and manage the topic pool (3 of each type are offered per attempt)." />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title="Grading queue"
            action={
              <div className="flex gap-1 text-sm">
                <Link href="/admin/essays" className={status === "submitted" ? "font-bold text-forest-900" : "text-muted hover:underline"}>
                  To grade
                </Link>
                <span className="text-muted">·</span>
                <Link href="/admin/essays?status=graded" className={status === "graded" ? "font-bold text-forest-900" : "text-muted hover:underline"}>
                  Graded
                </Link>
              </div>
            }
          />
          {queue.items.length === 0 ? (
            <EmptyState title={status === "submitted" ? "Nothing to grade" : "No graded essays yet"} />
          ) : (
            <ul className="divide-y divide-line">
              {queue.items.map((q) => (
                <li key={q.attempt_id}>
                  <Link href={`/admin/essays/${q.attempt_id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-paper">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-forest-950">{q.student_name}</p>
                      <p className="truncate text-xs text-muted">
                        {q.title} · {formatDate(q.submitted_at)}
                      </p>
                    </div>
                    <Badge tone={status === "graded" ? "success" : "gold"}>{status === "graded" ? "Graded" : "Grade"}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Add essay topic" />
            <div className="p-5">
              <EssayTopicForm />
            </div>
          </Card>
          {(["argument", "narrative"] as const).map((t) => (
            <Card key={t}>
              <CardHeader title={`${t === "argument" ? "Argument" : "Narrative"} topics`} description={`${byType(t).filter((x) => x.status === "published").length} published`} />
              <ul className="divide-y divide-line">
                {byType(t).map((x) => (
                  <li key={x.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                    <span className={x.status !== "published" ? "text-muted" : ""}>{x.prompt}</span>
                    <ActionButton
                      path={`/admin/essay-topics/${x.id}`}
                      method="PATCH"
                      body={{ status: x.status === "published" ? "archived" : "published" }}
                      variant="ghost"
                    >
                      {x.status === "published" ? "Archive" : "Publish"}
                    </ActionButton>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
