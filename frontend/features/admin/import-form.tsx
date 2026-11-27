"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CheckCircle2, Download, FileSpreadsheet, UploadCloud } from "lucide-react";

import { Button, LinkButton } from "@/components/ui/button";
import { Alert, Card, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/form";
import { ApiError, api, errorMessage } from "@/lib/api/client";

interface Summary {
  total_rows: number;
  valid: number;
  invalid: number;
  errors: { row: number; message: string }[];
  new_topics: string[];
  batch: string | null;
  inserted: number;
}

export function ImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [exam, setExam] = useState("");
  const [createTopics, setCreateTopics] = useState(true);
  const [skipInvalid, setSkipInvalid] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"check" | "import" | "publish" | null>(null);
  const [published, setPublished] = useState<number | null>(null);

  async function run(dryRun: boolean) {
    if (!file) return;
    setBusy(dryRun ? "check" : "import");
    setError(null);
    setPublished(null);
    const fd = new FormData();
    fd.set("file", file);
    if (exam) fd.set("exam", exam);
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader
          title="1 · Upload your file"
          description="CSV or Excel (.xlsx), up to 5,000 rows / 4 MB per file."
          action={
            <a href="/templates/qadam-mcq-template.csv" download className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:underline">
              <Download className="h-4 w-4" aria-hidden /> Template
            </a>
          }
        />
        <form onSubmit={onSubmit} className="space-y-4 p-5">
          <label
            htmlFor="file"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-strong bg-paper px-4 py-8 text-center hover:border-forest-700"
          >
            {file ? <FileSpreadsheet className="h-8 w-8 text-forest-700" /> : <UploadCloud className="h-8 w-8 text-muted" />}
            <span className="font-semibold text-forest-950">{file ? file.name : "Choose a .csv or .xlsx file"}</span>
            <span className="text-xs text-muted">{file ? `${(file.size / 1024).toFixed(0)} KB` : "Click to browse"}</span>
            <input
              id="file"
              type="file"
              accept=".csv,.xlsx"
              className="sr-only"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setSummary(null);
                setError(null);
              }}
            />
          </label>
          <Field label="Exam (if the file has no 'exam' column)" htmlFor="exam">
            <Select id="exam" value={exam} onChange={(e) => setExam(e.target.value)}>
              <option value="">Use the exam column</option>
              <option value="HAT">HAT</option>
              <option value="USAT">USAT</option>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={createTopics} onChange={(e) => setCreateTopics(e.target.checked)} className="h-4 w-4 accent-[#0f3d2e]" />
            Create topics that don&apos;t exist yet
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={skipInvalid} onChange={(e) => setSkipInvalid(e.target.checked)} className="h-4 w-4 accent-[#0f3d2e]" />
            Skip invalid rows (import only the valid ones)
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="secondary" disabled={!file} loading={busy === "check"}>
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
        </form>
      </Card>

      <Card>
        <CardHeader title="2 · Review & publish" description="Imported questions stay as drafts until you publish them." />
        <div className="space-y-4 p-5">
          {error && <Alert>{error}</Alert>}
          {!summary && !error && <p className="text-sm text-muted">Check a file to see the validation report here.</p>}
          {summary && (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Mini label="Rows" value={summary.total_rows} />
                <Mini label="Valid" value={summary.valid} tone="text-success" />
                <Mini label="Errors" value={summary.invalid} tone={summary.invalid ? "text-danger" : undefined} />
              </div>
              {summary.new_topics.length > 0 && (
                <p className="text-sm text-ink-soft">
                  <span className="font-semibold">New topics:</span> {summary.new_topics.join(", ")}
                </p>
              )}
              {summary.errors.length > 0 && (
                <div className="max-h-64 overflow-y-auto rounded-md border border-line">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-line">
                      {summary.errors.map((e) => (
                        <tr key={e.row}>
                          <td className="tabular w-16 px-3 py-2 font-semibold text-danger">Row {e.row}</td>
                          <td className="px-3 py-2 text-ink-soft">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
          <div className="rounded-md bg-paper p-3 text-xs leading-relaxed text-muted">
            <p className="font-semibold text-ink-soft">Columns</p>
            <p>
              <b>exam</b> (HAT/USAT), <b>subject</b>, topic, <b>question</b>, <b>option_a</b>…<b>option_d</b>, <b>correct</b> (A–D),
              explanation, solution, difficulty (easy/medium/hard), marks, source.
            </p>
            <p className="mt-1">
              Subjects: English/Verbal, Analytical, Quantitative, Physics, Chemistry, Mathematics, Biology, Computer Science,
              Statistics, Economics, Accounting, Commerce, Islamiat/Ethics, Pakistan Studies, General Knowledge.{" "}
              <Link href="/admin/taxonomy" className="font-semibold text-forest-700 hover:underline">View structure</Link>
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
