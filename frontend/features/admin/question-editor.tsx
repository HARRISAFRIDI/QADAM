"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Alert, Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { api, errorMessage } from "@/lib/api/client";
import { OPTIONS, type Option } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import { subjectsForExam, type AdminQuestion, type Taxonomy } from "./types";

type Draft = Omit<AdminQuestion, "id" | "import_batch" | "created_at" | "updated_at" | "published_at">;

const EMPTY: Draft = {
  exam_id: 0,
  subject_id: 0,
  topic_id: null,
  stem: "",
  image_url: null,
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: "A",
  explanation: null,
  solution: null,
  difficulty: "medium",
  marks: 1,
  status: "draft",
  source: null,
};

export function QuestionEditor({ taxonomy, question }: { taxonomy: Taxonomy; question?: AdminQuestion }) {
  const router = useRouter();
  const [q, setQ] = useState<Draft>(() =>
    question ? { ...question } : { ...EMPTY, exam_id: taxonomy.exams[0]?.id ?? 0 },
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const subjects = useMemo(() => subjectsForExam(taxonomy, q.exam_id), [taxonomy, q.exam_id]);
  const topics = useMemo(
    () => taxonomy.topics.filter((t) => t.subject_id === q.subject_id && t.is_active),
    [taxonomy.topics, q.subject_id],
  );
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setQ((prev) => ({ ...prev, [k]: v }));

  async function save(e: FormEvent, status?: Draft["status"]) {
    e.preventDefault();
    if (!q.subject_id) {
      setError("Please choose a subject.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(null);
    const body = {
      ...q,
      status: status ?? q.status,
      explanation: q.explanation || null,
      solution: q.solution || null,
      source: q.source || null,
      image_url: q.image_url || null,
    };
    try {
      if (question) {
        await api(`/admin/questions/${question.id}`, { method: "PATCH", body });
        setQ((p) => ({ ...p, status: body.status }));
        setSaved("Saved.");
        router.refresh();
      } else {
        const created = await api<AdminQuestion>("/admin/questions", { method: "POST", body });
        router.replace(`/admin/questions/${created.id}?created=1`);
        router.refresh();
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const optionKey = (o: Option) => `option_${o.toLowerCase()}` as "option_a" | "option_b" | "option_c" | "option_d";

  return (
    <form onSubmit={(e) => save(e)} className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Placement" description="Where this question belongs in the hierarchy." />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Exam" htmlFor="exam">
              <Select
                id="exam"
                value={q.exam_id}
                onChange={(e) => setQ((p) => ({ ...p, exam_id: Number(e.target.value), subject_id: 0, topic_id: null }))}
              >
                {taxonomy.exams.map((x) => (
                  <option key={x.id} value={x.id}>{x.code}</option>
                ))}
              </Select>
            </Field>
            <Field label="Subject" htmlFor="subject">
              <Select
                id="subject"
                value={q.subject_id || ""}
                onChange={(e) => setQ((p) => ({ ...p, subject_id: Number(e.target.value), topic_id: null }))}
                required
              >
                <option value="">Choose subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Topic" htmlFor="topic">
              <Select
                id="topic"
                value={q.topic_id ?? ""}
                onChange={(e) => set("topic_id", e.target.value ? Number(e.target.value) : null)}
                disabled={!q.subject_id}
              >
                <option value="">No topic</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Difficulty" htmlFor="difficulty">
                <Select id="difficulty" value={q.difficulty} onChange={(e) => set("difficulty", e.target.value as Draft["difficulty"])}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Select>
              </Field>
              <Field label="Marks" htmlFor="marks">
                <Input id="marks" type="number" min={1} max={10} value={q.marks} onChange={(e) => set("marks", Number(e.target.value) || 1)} />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Question" />
          <div className="space-y-4 p-5">
            <Field label="Question text" htmlFor="stem">
              <Textarea id="stem" value={q.stem} onChange={(e) => set("stem", e.target.value)} required rows={4} />
            </Field>
            <Field label="Image URL (optional)" htmlFor="image" hint="Public image link (e.g. from Supabase Storage).">
              <Input id="image" value={q.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} placeholder="https://…" />
            </Field>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-ink-soft">Options · select the correct one</p>
              {OPTIONS.map((o) => (
                <div key={o} className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => set("correct_option", o)}
                    aria-pressed={q.correct_option === o}
                    aria-label={`Mark option ${o} as correct`}
                    className={cn(
                      "mt-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-bold transition-colors",
                      q.correct_option === o ? "border-success bg-success text-white" : "border-line-strong text-muted hover:border-success",
                    )}
                  >
                    {o}
                  </button>
                  <Textarea
                    value={q[optionKey(o)]}
                    onChange={(e) => set(optionKey(o), e.target.value)}
                    required
                    rows={1}
                    className="min-h-11"
                    aria-label={`Option ${o}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Explanation & solution" description="Shown to students only after they submit." />
          <div className="space-y-4 p-5">
            <Field label="Short explanation" htmlFor="explanation">
              <Textarea id="explanation" value={q.explanation ?? ""} onChange={(e) => set("explanation", e.target.value)} rows={3} />
            </Field>
            <Field label="Detailed solution" htmlFor="solution">
              <Textarea id="solution" value={q.solution ?? ""} onChange={(e) => set("solution", e.target.value)} rows={5} />
            </Field>
            <Field label="Source / reference" htmlFor="source">
              <Input id="source" value={q.source ?? ""} onChange={(e) => set("source", e.target.value)} placeholder="e.g. Past paper 2023" />
            </Field>
          </div>
        </Card>
      </div>

      {/* Preview + actions */}
      <div className="space-y-4 xl:sticky xl:top-28 xl:self-start">
        <Card className="p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Student preview</p>
          <p className="whitespace-pre-wrap font-semibold leading-relaxed">{q.stem || <span className="text-muted">Question text…</span>}</p>
          <div className="mt-4 space-y-2">
            {OPTIONS.map((o) => (
              <div
                key={o}
                className={cn(
                  "flex gap-3 rounded-md border px-3 py-2 text-sm",
                  q.correct_option === o ? "border-success bg-success-soft" : "border-line",
                )}
              >
                <span className="font-bold">{o}</span>
                <span className="whitespace-pre-wrap">{q[optionKey(o)] || <span className="text-muted">…</span>}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-soft">Status</span>
            <Select value={q.status} onChange={(e) => set("status", e.target.value as Draft["status"])} className="h-9 w-40">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
          {error && <Alert>{error}</Alert>}
          {saved && <Alert tone="success">{saved}</Alert>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={saving}>
              {question ? "Save changes" : "Create question"}
            </Button>
            {q.status !== "published" && (
              <Button type="button" variant="gold" disabled={saving} onClick={(e) => save(e, "published")}>
                Save & publish
              </Button>
            )}
          </div>
          <p className="text-xs text-muted">Published questions become available to students within about a minute.</p>
        </Card>
      </div>
    </form>
  );
}
