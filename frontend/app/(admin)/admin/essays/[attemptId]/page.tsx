import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { GradeForm } from "@/features/admin/forms";
import { pageApi } from "@/lib/api/server";

interface Detail {
  attempt_id: string;
  title: string;
  essay_status: string;
  student_name: string;
  essays: {
    id: number;
    essay_type: string;
    topic: string | null;
    content: string;
    word_count: number;
    status: string;
    score: number | null;
    max_score: number;
    feedback: string | null;
  }[];
}

export default async function GradeEssayPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const d = await pageApi<Detail>(`/admin/essays/${encodeURIComponent(attemptId)}`, {}, `/admin/essays/${attemptId}`);
  return (
    <>
      <Breadcrumbs items={[{ href: "/admin/essays", label: "Essays" }, { label: d.student_name }]} />
      <PageHeader eyebrow={d.title} title={`Essays by ${d.student_name}`} action={<Badge tone={d.essay_status === "graded" ? "success" : "gold"}>{d.essay_status}</Badge>} />
      <div className="space-y-6">
        {d.essays.map((e) => (
          <Card key={e.id}>
            <CardHeader
              title={`${e.essay_type === "argument" ? "Argument" : "Narrative"} essay · ${e.max_score} marks`}
              description={e.topic ?? "No topic selected"}
              action={<span className="tabular text-sm text-muted">{e.word_count} words</span>}
            />
            <div className="space-y-5 p-5">
              <p className="whitespace-pre-wrap rounded-md border border-line bg-paper p-4 text-[15px] leading-[1.8]">
                {e.content || <em className="text-muted">Nothing written.</em>}
              </p>
              {e.status === "draft" ? (
                <p className="text-sm text-muted">Not submitted yet.</p>
              ) : (
                <GradeForm submissionId={e.id} maxScore={e.max_score} score={e.score} feedback={e.feedback} />
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
