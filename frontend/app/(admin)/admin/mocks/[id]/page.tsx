import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";
import { Badge, Card } from "@/components/ui/card";
import { ActionButton } from "@/features/admin/action-button";
import { pageApi } from "@/lib/api/server";
import { OPTIONS, type Option } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface MockDetail {
  id: number;
  category_code: string;
  title: string;
  description: string | null;
  status: string;
  duration_min: number;
  question_count: number;
  questions: {
    position: number;
    question_id: number;
    section: string;
    subject: string;
    stem: string;
    options: Record<Option, string>;
    correct: Option;
    status: string;
  }[];
}

export default async function MockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await pageApi<MockDetail>(`/admin/mock-tests/${encodeURIComponent(id)}`, {}, `/admin/mocks/${id}`);
  return (
    <>
      <Breadcrumbs items={[{ href: "/admin/mocks", label: "Mock tests" }, { label: m.title }]} />
      <PageHeader
        eyebrow={`${m.category_code} · preview`}
        title={m.title}
        description={`${m.question_count} MCQs · ${m.duration_min} minutes`}
        action={
          <div className="flex flex-wrap items-start gap-2">
            <Badge tone={m.status === "published" ? "success" : "gold"} className="mt-2">{m.status}</Badge>
            {m.status !== "published" ? (
              <ActionButton path={`/admin/mock-tests/${m.id}`} method="PATCH" body={{ status: "published" }} variant="primary" confirmText="Publish this mock test to students?">
                Publish
              </ActionButton>
            ) : (
              <ActionButton path={`/admin/mock-tests/${m.id}`} method="PATCH" body={{ status: "draft" }}>
                Unpublish
              </ActionButton>
            )}
            <ActionButton path={`/admin/mock-tests/${m.id}`} method="DELETE" variant="danger" confirmText="Delete this mock test? (It is archived if students already took it.)" redirectTo="/admin/mocks">
              Delete
            </ActionButton>
          </div>
        }
      />
      <ol className="space-y-3">
        {m.questions.map((q) => (
          <Card key={q.position} className="p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="tabular rounded bg-forest-900 px-2 py-0.5 text-white">Q{q.position}</span>
              <span className="text-ink-soft">{q.section} · {q.subject}</span>
              <span className="text-muted">#{q.question_id}</span>
              {q.status !== "published" && <Badge tone="danger">{q.status}</Badge>}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold">{q.stem}</p>
            <div className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
              {OPTIONS.map((o) => (
                <p key={o} className={cn("rounded px-2 py-1", q.correct === o ? "bg-success-soft font-semibold text-success" : "text-ink-soft")}>
                  {o}. {q.options[o]}
                </p>
              ))}
            </div>
          </Card>
        ))}
      </ol>
    </>
  );
}
