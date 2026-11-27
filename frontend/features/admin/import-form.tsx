"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileText, UploadCloud } from "lucide-react";

import { Button, LinkButton } from "@/components/ui/button";
import { Alert, Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { ApiError, api, errorMessage } from "@/lib/api/client";

import { subjectsForExam, type Taxonomy } from "./types";

interface Summary {
  total_rows: number;
  valid: number;
  invalid: number;
  errors: { row: number | string; message: string }[];
  new_topics: string[];
  warnings: string[];
  kind: "sheet" | "document";
  preview: { stem: string; options: Record<string, string>; correct: string; explanation: string | null }[];
  batch: string | null;
  inserted: number;
}

const SHEET = [".csv", ".xlsx"];
const DOCS = [".pdf", ".docx", ".doc", ".txt"];
const ACCEPT = [...SHEET, ...DOCS].join(",");
const isDoc = (f: File | null) => !!f && DOCS.some((ext) => f.name.toLowerCase().endsWith(ext));

export function ImportForm({ taxonomy }: { taxonomy: Taxonomy }) {
  const [file, setFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [exam, setExam] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [createTopics, setCreateTopics] = useState(true);
  const [skipInvalid, setSkipInvalid] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"check" | "import" | "publish" | null>(null);
  const [published, setPublished] = useState<number | null>(null);

  const doc = isDoc(file);
  const examObj = taxonomy.exams.find((e) => e.code === exam);
  const subjects = useMemo(() => (examObj ? subjectsForExam(taxonomy, examObj.id) : taxonomy.subjects), [taxonomy, examObj]);
  const subjectObj = taxonomy.subjects.find((s) => s.slug === subject);
  const topics = taxonomy.topics.filter((t) => t.subject_id === subjectObj?.id && t.is_active);

  function reset() {
    setSummary(null);
    setError(null);
    setPublished(null);
  }

  async function run(dryRun: boolean) {
    if (!file) return;
    setBusy(dryRun ? "check" : "import");
    setError(null);
    setPublished(null);
    const fd = new FormData();
    fd.set("file", file);
    if (doc && answerFile) fd.set("answer_file", answerFile);
    if (exam) fd.set("exam", exam);
    if (doc && subject) fd.set("subject", subject);
    if (doc && topic) fd.set("topic", topic);
    fd.set("dry_run", String(dryRun));
    fd.set("create_topics", String(createTopics));
    fd.set("skip_invalid", String(skipInvalid));
    try {
      setSummary(await api<Summary>("/admin/questions/import", { method: "POST", body: fd }));
    } catch (e) {
      if (e instanceof ApiError && e.code === "import_has_errors" && e.details) setSummary(e.details as Summary);
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function publishBatch() {
    if (!summary?.batch) return;
    setBusy("publish");
    try {
      const r = await api<{ updated: number }>("/admin/questions/bulk-status", {
        method: "POST",
        body: { batch: summary.batch, status: "published" },
      });
      setPublished(r.updated);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void run(true);
  }

  const FileIcon = doc ? FileText : file ? FileSpreadsheet : UploadCloud;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader
          title="1 · Upload your file"
          description="PDF, Word (DOCX/DOC), TXT, CSV or Excel. Up to 5,000 questions / 4 MB per file."
          action={
            <a href="/templates/qadam-mcq-template.csv" download className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:underline">
              <Download className="h-4 w-4" aria-hidden /> CSV template
            </a>
          }
        />
        <form onSubmit={onSubmit} className="space-y-4 p-5">
          <label
            htmlFor="file"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-strong bg-paper px-4 py-8 text-center hover:border-forest-700"
          >
            <FileIcon className={file ? "h-8 w-8 text-forest-700" : "h-8 w-8 text-muted"} />
            <span className="font-semibold text-forest-950">{file ? file.name : "Choose a question file"}</span>
            <span className="text-xs text-muted">
              {file ? `${(file.size / 1024).toFixed(0)} KB · ${doc ? "document (questions are detected automatically)" : "spreadsheet"}` : "PDF · DOCX · DOC · TXT · CSV · XLSX"}
            </span>
            <input
              id="file"
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                reset();
              }}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={doc ? "Exam" : "Exam (if the file has no 'exam' column)"} htmlFor="exam">
              <Select id="exam" value={exam} onChange={(e) => { setExam(e.target.value); setSubject(""); setTopic(""); reset(); }}>
                <option value="">{doc ? "Choose exam…" : "Use the exam column"}</option>
                <option value="HAT">HAT</option>
                <option value="USAT">USAT</option>
              </Select>
            </Field>
            {doc && (
              <Field label="Subject" htmlFor="subject" hint="Not needed if the file has 'Subject: …' lines.">
                <Select id="subject" value={subject} onChange={(e) => { setSubject(e.target.value); setTopic(""); reset(); }}>
                  <option value="">Choose subject…</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.slug}>{s.name}</option>
                  ))}
                </Select>
              </Field>
            )}
            {doc && (
              <Field label="Topic (optional)" htmlFor="topic">
                <Select id="topic" value={topic} onChange={(e) => { setTopic(e.target.value); reset(); }} disabled={!subjectObj}>
                  <option value="">No topic</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </Select>
              </Field>
            )}
            {doc && (
              <Field label="Answer sheet (optional)" htmlFor="answer_file" hint="Only if answers are in a separate file.">
                <Input
                  id="answer_file"
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  className="py-2"
                  onChange={(e) => {
                    setAnswerFile(e.target.files?.[0] ?? null);
                    reset();
                  }}
                />
              </Field>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={createTopics} onChange={(e) => setCreateTopics(e.target.checked)} className="h-4 w-4 accent-[#01411c]" />
            Create topics that don&apos;t exist yet
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={skipInvalid} onChange={(e) => setSkipInvalid(e.target.checked)} className="h-4 w-4 accent-[#01411c]" />
            Skip invalid questions (import only the valid ones)
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="secondary" disabled={!file || (doc && !exam)} loading={busy === "check"}>
              Check file
            </Button>
            <Button
              type="button"
              disabled={!file || !summary || summary.valid === 0 || (summary.invalid > 0 && !skipInvalid) || !!summary.batch}
              loading={busy === "import"}
              onClick={() => run(false)}
            >
              Import {summary?.valid ? `${summary.valid} questions` : ""} as drafts
            </Button>
          </div>
          {doc && !exam && <p className="text-xs text-muted">Choose the exam for this document first.</p>}
        </form>
      </Card>

      <Card>
        <CardHeader title="2 · Review & publish" description="Imported questions stay as drafts until you publish them." />
        <div className="space-y-4 p-5">
          {error && <Alert>{error}</Alert>}
          {!summary && !error && <p className="text-sm text-muted">Check a file to see what was found here.</p>}
          {summary && (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Mini label={summary.kind === "document" ? "Questions found" : "Rows"} value={summary.total_rows} />
                <Mini label="Valid" value={summary.valid} tone="text-success" />
                <Mini label="Need fixing" value={summary.invalid} tone={summary.invalid ? "text-danger" : undefined} />
              </div>
              {summary.warnings?.map((w) => (
                <p key={w} className="flex items-start gap-2 text-sm text-gold-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {w}
                </p>
              ))}
              {summary.new_topics.length > 0 && (
                <p className="text-sm text-ink-soft">
                  <span className="font-semibold">New topics:</span> {summary.new_topics.join(", ")}
                </p>
              )}
              {summary.errors.length > 0 && (
                <div className="max-h-56 overflow-y-auto rounded-md border border-line">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-line">
                      {summary.errors.map((e) => (
                        <tr key={String(e.row)}>
                          <td className="tabular w-20 px-3 py-2 font-semibold text-danger">
                            {typeof e.row === "number" ? `Row ${e.row}` : e.row}
                          </td>
                          <td className="px-3 py-2 text-ink-soft">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {summary.kind === "document" && summary.preview?.length > 0 && !summary.batch && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Preview · first {summary.preview.length} detected</p>
                  <ol className="space-y-2">
                    {summary.preview.map((p, i) => (
                      <li key={i} className="rounded-md border border-line p-3 text-sm">
                        <p className="font-semibold">{p.stem}</p>
                        <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                          {Object.entries(p.options).map(([k, v]) => (
                            <li key={k} className={k === p.correct ? "font-semibold text-success" : "text-ink-soft"}>
                              {k}. {v}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {summary.batch && (
                <div className="rounded-lg border border-[#cfe6d8] bg-success-soft p-4">
                  <p className="flex items-center gap-2 font-bold text-success">
                    <CheckCircle2 className="h-5 w-5" aria-hidden /> Imported {summary.inserted} questions as drafts
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    Batch <code className="font-semibold">{summary.batch}</code>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <LinkButton href={`/admin/questions?batch=${summary.batch}`} variant="secondary" size="sm">
                      Review questions
                    </LinkButton>
                    {published === null ? (
                      <Button size="sm" onClick={publishBatch} loading={busy === "publish"}>
                        Publish all {summary.inserted}
                      </Button>
                    ) : (
                      <span className="self-center text-sm font-semibold text-success">
                        {published} published. Students can practise them now.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          <details className="rounded-md bg-paper p-3 text-xs leading-relaxed text-muted" open={doc}>
            <summary className="cursor-pointer font-semibold text-ink-soft">How should a PDF / Word / TXT paper look?</summary>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-ink-soft">{`Subject: Physics          (optional)
Topic: Kinematics         (optional)

1. What is the SI unit of force?
A) Joule
B) Newton
C) Watt
D) Pascal
Answer: B
Explanation: F = m x a    (optional)

2. 20% of 150 is
(a) 20  (b) 25  (c) 30  (d) 35
Ans: c`}</pre>
            <p className="mt-2">
              Answers can also be in an <b>Answer Key</b> at the end (e.g. <code>1-B 2-C</code>) or in a separate answer-sheet
              file. Scanned (image) PDFs can&apos;t be read, so use a text PDF, DOCX or TXT. DOCX gives the best results.
            </p>
          </details>
          <div className="rounded-md bg-paper p-3 text-xs leading-relaxed text-muted">
            <p className="font-semibold text-ink-soft">CSV / Excel columns</p>
            <p>
              <b>exam</b>, <b>subject</b>, topic, <b>question</b>, <b>option_a</b>…<b>option_d</b>, <b>correct</b>, explanation,
              solution, difficulty, marks, source.{" "}
              <Link href="/admin/taxonomy" className="font-semibold text-forest-700 hover:underline">View subjects</Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-md bg-paper py-2">
      <p className={`tabular text-xl font-extrabold ${tone ?? "text-forest-950"}`}>{value}</p>
      <p className="text-xs font-semibold text-muted">{label}</p>
    </div>
  );
}
