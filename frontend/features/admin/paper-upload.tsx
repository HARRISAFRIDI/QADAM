"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { api, errorMessage } from "@/lib/api/client";

import { subjectsForExam, type Taxonomy } from "./types";

type Kind = "paper" | "answer_sheet" | "solution";
const ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Upload straight to Supabase Storage via a short-lived signed URL (bypasses the API body limit). */
async function uploadFile(kind: Kind, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = file.type || MIME_BY_EXT[ext] || "application/octet-stream";
  const { file_id, upload_url } = await api<{ file_id: string; upload_url: string }>("/admin/files/upload-url", {
    method: "POST",
    body: { kind, filename: file.name, mime, size_bytes: file.size },
  });
  const fd = new FormData();
  fd.append("cacheControl", "3600");
  fd.append("", file);
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(upload_url, { method: "PUT", body: fd, headers: { "x-upsert": "false" } });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      await api(`/admin/files/${file_id}/complete`, { method: "POST" });
      return file_id;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Upload failed");
}

export function PaperUploadForm({ taxonomy }: { taxonomy: Taxonomy }) {
  const router = useRouter();
  const [examId, setExamId] = useState(taxonomy.exams[0]?.id ?? 0);
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const categories = taxonomy.categories.filter((c) => c.exam_id === examId);
  const sections = taxonomy.sections.filter((s) => s.exam_id === examId);
  const subjects = useMemo(() => subjectsForExam(taxonomy, examId), [taxonomy, examId]);
  const topics = taxonomy.topics.filter((t) => t.subject_id === subjectId);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const files: Partial<Record<Kind, File>> = {};
    (["paper", "answer_sheet", "solution"] as Kind[]).forEach((k) => {
      const v = f.get(k);
      if (v instanceof File && v.size > 0) files[k] = v;
    });
    if (!files.paper) {
      setMsg({ ok: false, text: "Please choose the question paper file." });
      return;
    }
    setMsg(null);
    try {
      const ids: Partial<Record<Kind, string>> = {};
      for (const k of Object.keys(files) as Kind[]) {
        setBusy(`Uploading ${k.replace("_", " ")}…`);
        ids[k] = await uploadFile(k, files[k]!);
      }
      setBusy("Saving…");
      const num = (k: string) => (f.get(k) ? Number(f.get(k)) : null);
      await api("/admin/papers", {
        method: "POST",
        body: {
          title: f.get("title"),
          exam_id: examId,
          category_id: num("category_id"),
          section_id: num("section_id"),
          subject_id: subjectId || null,
          topic_id: num("topic_id"),
          year: num("year"),
          duration_min: num("duration_min"),
          total_marks: num("total_marks"),
          status: f.get("status"),
          paper_file_id: ids.paper,
          answer_sheet_file_id: ids.answer_sheet ?? null,
          solution_file_id: ids.solution ?? null,
        },
      });
      form.reset();
      setMsg({ ok: true, text: "Paper uploaded and linked with its answer sheet." });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {msg && <Alert tone={msg.ok ? "success" : "danger"}>{msg.text}</Alert>}
      <Field label="Title" htmlFor="title">
        <Input id="title" name="title" required minLength={2} placeholder="e.g. HAT-I Past Paper 2024" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="1 · Test" htmlFor="exam">
          <Select id="exam" value={examId} onChange={(e) => { setExamId(Number(e.target.value)); setSubjectId(""); }}>
            {taxonomy.exams.map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}
          </Select>
        </Field>
        <Field label="2 · Category" htmlFor="category_id">
          <Select id="category_id" name="category_id" defaultValue="">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
          </Select>
        </Field>
        <Field label="3 · Section" htmlFor="section_id">
          <Select id="section_id" name="section_id" defaultValue="">
            <option value="">Full paper</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="4 · Subject" htmlFor="subject_id">
          <Select id="subject_id" value={subjectId} onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Any subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="5 · Topic" htmlFor="topic_id">
          <Select id="topic_id" name="topic_id" defaultValue="" disabled={!subjectId}>
            <option value="">No topic</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Year" htmlFor="year">
          <Input id="year" name="year" type="number" min={1990} max={2100} />
        </Field>
        <Field label="Duration (min)" htmlFor="duration_min">
          <Input id="duration_min" name="duration_min" type="number" min={1} max={600} />
        </Field>
        <Field label="Total marks" htmlFor="total_marks">
          <Input id="total_marks" name="total_marks" type="number" min={1} max={1000} />
        </Field>
      </div>
      <Field label="6 · Question paper (PDF, DOC, DOCX)" htmlFor="paper">
        <Input id="paper" name="paper" type="file" accept={ACCEPT} required className="py-2" />
      </Field>
      <Field label="7 · Answer sheet (private)" htmlFor="answer_sheet" hint="Stored privately and never shown to students.">
        <Input id="answer_sheet" name="answer_sheet" type="file" accept={ACCEPT} className="py-2" />
      </Field>
      <Field label="8 · Detailed solution file (optional, private)" htmlFor="solution">
        <Input id="solution" name="solution" type="file" accept={ACCEPT} className="py-2" />
      </Field>
      <Field label="Status" htmlFor="status">
        <Select id="status" name="status" defaultValue="draft">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </Select>
      </Field>
      <Button type="submit" loading={!!busy}>{busy ?? "Upload paper"}</Button>
    </form>
  );
}

export function DownloadLink({ fileId, name }: { fileId: string; name: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className="text-left text-sm font-semibold text-forest-700 hover:underline disabled:opacity-50"
      onClick={async () => {
        setBusy(true);
        try {
          const { url } = await api<{ url: string }>(`/admin/files/${fileId}/download`);
          window.open(url, "_blank", "noopener");
        } catch (e) {
          alert(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      {name}
    </button>
  );
}
