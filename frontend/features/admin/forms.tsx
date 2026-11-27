"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { api, errorMessage } from "@/lib/api/client";

/** Generic JSON form: collects named fields, sends them, refreshes the page. */
function useSubmit() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(path: string, method: "POST" | "PATCH", body: Record<string, unknown>, ok: string, then?: (r: unknown) => void) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api(path, { method, body });
      setMsg({ ok: true, text: ok });
      then?.(r);
      router.refresh();
      return true;
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, msg, submit };
}

function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  return msg ? <Alert tone={msg.ok ? "success" : "danger"}>{msg.text}</Alert> : null;
}

export function CreateMockForm({ categories }: { categories: { code: string; name: string }[] }) {
  const router = useRouter();
  const { busy, msg, submit } = useSubmit();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await submit(
      "/admin/mock-tests",
      "POST",
      {
        category: f.get("category"),
        title: f.get("title"),
        description: f.get("description") || null,
        duration_min: f.get("duration") ? Number(f.get("duration")) : null,
      },
      "Mock test generated as a draft.",
      (r) => router.push(`/admin/mocks/${(r as { id: number }).id}`),
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Msg msg={msg} />
      <Field label="Category" htmlFor="category">
        <Select id="category" name="category" required>
          {categories.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Title" htmlFor="title">
        <Input id="title" name="title" required minLength={2} placeholder="e.g. HAT-I Mock Paper 1" />
      </Field>
      <Field label="Description (optional)" htmlFor="description">
        <Textarea id="description" name="description" rows={2} />
      </Field>
      <Field label="Duration in minutes (optional)" htmlFor="duration" hint="Defaults to the official duration.">
        <Input id="duration" name="duration" type="number" min={1} max={600} />
      </Field>
      <Button type="submit" loading={busy}>Generate from question bank</Button>
      <p className="text-xs text-muted">
        Questions are picked at random from published questions using the category&apos;s official weightage, then frozen.
      </p>
    </form>
  );
}

export function EssayTopicForm() {
  const { busy, msg, submit } = useSubmit();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const ok = await submit(
      "/admin/essay-topics",
      "POST",
      { exam: "USAT", essay_type: f.get("essay_type"), prompt: f.get("prompt") },
      "Essay topic added.",
    );
    if (ok) form.reset();
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Msg msg={msg} />
      <Field label="Type" htmlFor="essay_type">
        <Select id="essay_type" name="essay_type">
          <option value="argument">Argument-based (15 marks)</option>
          <option value="narrative">Narrative-based (10 marks)</option>
        </Select>
      </Field>
      <Field label="Topic / prompt" htmlFor="prompt">
        <Textarea id="prompt" name="prompt" required minLength={5} rows={3} />
      </Field>
      <Button type="submit" loading={busy}>Add topic</Button>
    </form>
  );
}

export function GradeForm({ submissionId, maxScore, score, feedback }: { submissionId: number; maxScore: number; score: number | null; feedback: string | null }) {
  const { busy, msg, submit } = useSubmit();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await submit(
      `/admin/essays/submissions/${submissionId}/grade`,
      "POST",
      { score: Number(f.get("score")), feedback: f.get("feedback") || null },
      "Grade saved.",
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Msg msg={msg} />
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <Field label={`Score (0-${maxScore})`} htmlFor={`score-${submissionId}`}>
          <Input id={`score-${submissionId}`} name="score" type="number" min={0} max={maxScore} defaultValue={score ?? ""} required />
        </Field>
        <Field label="Feedback for the student" htmlFor={`fb-${submissionId}`}>
          <Textarea id={`fb-${submissionId}`} name="feedback" rows={2} defaultValue={feedback ?? ""} />
        </Field>
      </div>
      <Button type="submit" size="sm" loading={busy}>Save grade</Button>
    </form>
  );
}

export function InlineNumber({
  path,
  field,
  value,
  min = 1,
  max = 600,
  label,
}: {
  path: string;
  field: string;
  value: number | null;
  min?: number;
  max?: number;
  label: string;
}) {
  const { busy, msg, submit } = useSubmit();
  const [v, setV] = useState(value ?? "");
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(path, "PATCH", { [field]: Number(v) }, "Saved");
      }}
    >
      <Input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="h-8 w-20 px-2 text-sm"
      />
      {String(v) !== String(value ?? "") && (
        <Button type="submit" size="sm" loading={busy}>Save</Button>
      )}
      {msg && !msg.ok && <span className="text-xs text-danger">{msg.text}</span>}
    </form>
  );
}

export function TopicManager({ subjectId, children }: { subjectId: number; children?: ReactNode }) {
  const { busy, msg, submit } = useSubmit();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = new FormData(form).get("name");
    const ok = await submit("/admin/topics", "POST", { subject_id: subjectId, name }, "Topic added.");
    if (ok) form.reset();
  }
  return (
    <div>
      {children}
      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <Input name="name" placeholder="New topic name" required className="h-9 text-sm" aria-label="New topic name" />
        <Button type="submit" size="sm" loading={busy}>Add</Button>
      </form>
      {msg && !msg.ok && <p className="mt-1 text-xs text-danger">{msg.text}</p>}
    </div>
  );
}
