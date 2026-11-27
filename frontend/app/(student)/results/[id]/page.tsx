import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";

import { Breadcrumbs } from "@/components/shared/page-header";
import { Badge, Card, CardHeader, ProgressBar, StatTile } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { ServerApiError, serverApi } from "@/lib/api/server";
import type { Breakdown, Result, ReviewItem } from "@/lib/api/types";
import { OPTIONS } from "@/lib/api/types";
import { MODE_LABEL, cn, formatDate, humanMinutes } from "@/lib/utils";

export const metadata: Metadata = { title: "Results", robots: { index: false } };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "incorrect", label: "Incorrect" },
  { key: "unanswered", label: "Unanswered" },
  { key: "correct", label: "Correct" },
  { key: "marked", label: "Marked" },
] as const;

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const [{ id }, { filter = "all" }] = await Promise.all([params, searchParams]);
  let result: Result;
  let review: { items: ReviewItem[] };
  try {
    [result, review] = await Promise.all([
      serverApi<Result>(`/results/${id}`),
      serverApi<{ items: ReviewItem[] }>(`/results/${id}/review`),
    ]);
  } catch (e) {
    if (e instanceof ServerApiError) {
      if (e.status === 401) redirect(`/logout?next=/results/${id}`);
      if (e.code === "not_submitted") redirect(`/attempt/${id}`);
    }
    throw e;
  }

  const items = review.items.filter((i) => {
    if (filter === "incorrect") return i.selected && !i.is_correct;
    if (filter === "unanswered") return !i.selected;
    if (filter === "correct") return i.is_correct;
    if (filter === "marked") return i.marked;
    return true;
  });
  const hasMcq = result.question_count > 0;
  const examSlug = result.category.exam.toLowerCase();
  const catSlug = result.category.code.toLowerCase();

  return (
    <>
      <Breadcrumbs
        items={[
          { href: "/dashboard", label: "Dashboard" },
          { href: `/prepare/${examSlug}/${catSlug}`, label: result.category.code },
          { label: "Result" },
        ]}
      />

      {/* Score hero */}
      <Card className="overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr] md:items-center md:p-8">
          {hasMcq && <ScoreRing pct={result.percentage} />}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-600">{MODE_LABEL[result.mode]}</p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{result.title}</h1>
            <p className="mt-1 text-sm text-muted">Submitted {formatDate(result.submitted_at)}</p>
            {hasMcq && (
              <p className="tabular mt-4 text-4xl font-extrabold text-forest-950">
                {result.score}
                <span className="text-xl text-muted"> / {result.total_marks}</span>
                {result.essay_total ? (
                  <span className="ml-3 text-base font-semibold text-ink-soft">
                    + essays {result.essay_score ?? "-"}/{result.essay_total}
                  </span>
                ) : null}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <LinkButton href={`/prepare/${examSlug}/${catSlug}`} variant="secondary" size="sm">
                Practise again
              </LinkButton>
              <LinkButton href="/history" variant="ghost" size="sm">
                All attempts
              </LinkButton>
            </div>
          </div>
        </div>
      </Card>

      {hasMcq && (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatTile label="Correct" value={result.correct} tone="success" />
          <StatTile label="Incorrect" value={result.incorrect} tone="danger" />
          <StatTile label="Unanswered" value={result.unanswered} />
          <StatTile label="Accuracy" value={`${result.accuracy}%`} sub="of attempted" tone="gold" />
          <StatTile label="Time used" value={humanMinutes(result.time_used_sec)} />
        </div>
      )}

      {hasMcq && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <BreakdownCard title="Section-wise performance" rows={result.sections} />
          <BreakdownCard title="Subject-wise performance" rows={result.subjects} />
        </div>
      )}

      {result.essays.length > 0 && (
        <Card className="mt-6">
          <CardHeader
            title="Essays"
            description={
              result.essay_status === "graded"
                ? `Graded · ${result.essay_score}/${result.essay_total}`
                : "Submitted for review. Your essay marks will appear here once graded."
            }
            action={<Badge tone={result.essay_status === "graded" ? "success" : "gold"}>{result.essay_status === "graded" ? "Graded" : "Awaiting review"}</Badge>}
          />
          <div className="divide-y divide-line">
            {result.essays.map((e) => (
              <details key={e.essay_type} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                  <div>
                    <p className="font-bold capitalize text-forest-950">{e.essay_type} essay</p>
                    <p className="mt-0.5 text-sm text-ink-soft">{e.topic ?? "No topic selected"}</p>
                    <p className="mt-1 text-xs text-muted">{e.word_count} words</p>
                  </div>
                  <span className="tabular shrink-0 font-bold text-forest-900">
                    {e.score ?? "-"}/{e.max_score}
                  </span>
                </summary>
                {e.feedback && (
                  <p className="mt-3 rounded-md bg-forest-50 px-3 py-2 text-sm text-forest-800">
                    <span className="font-semibold">Feedback: </span>
                    {e.feedback}
                  </p>
                )}
                <p className="mt-3 whitespace-pre-wrap rounded-md border border-line bg-paper p-4 text-sm leading-relaxed">
                  {e.content || <em className="text-muted">Nothing written.</em>}
                </p>
              </details>
            ))}
          </div>
        </Card>
      )}

      {hasMcq && (
        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-extrabold">Solution review</h2>
            <nav className="flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1" aria-label="Filter questions">
              {FILTERS.map((f) => (
                <Link
                  key={f.key}
                  href={f.key === "all" ? `/results/${id}` : `/results/${id}?filter=${f.key}`}
                  scroll={false}
                  className={cn(
                    "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold",
                    filter === f.key ? "bg-forest-900 text-white" : "text-ink-soft hover:bg-forest-50",
                  )}
                >
                  {f.label}
                </Link>
              ))}
            </nav>
          </div>
          {items.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted">No questions in this view.</Card>
          ) : (
            <ol className="space-y-4">
              {items.map((it) => (
                <ReviewCard key={it.position} item={it} />
              ))}
            </ol>
          )}
        </section>
      )}
    </>
  );
}

function ScoreRing({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-36 w-36 md:mx-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e7efe9" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={pct >= 50 ? "#1e5a44" : "#b8923e"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="tabular text-3xl font-extrabold text-forest-950">{Math.round(pct)}%</p>
          <p className="text-xs font-semibold text-muted">score</p>
        </div>
      </div>
    </div>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: Breakdown[] }) {
  return (
    <Card>
      <CardHeader title={title} />
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const pct = r.max_score ? (r.score / r.max_score) * 100 : 0;
          return (
            <li key={r.id} className="px-5 py-3.5">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-forest-950">{r.name}</span>
                <span className="tabular font-bold text-forest-900">
                  {r.score}/{r.max_score}
                </span>
              </div>
              <ProgressBar value={pct} tone={pct >= 50 ? "forest" : "gold"} />
              <div className="tabular mt-1.5 flex gap-3 text-xs text-muted">
                <span className="text-success">{r.correct} correct</span>
                <span className="text-danger">{r.incorrect} wrong</span>
                <span>{r.unanswered} skipped</span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ReviewCard({ item }: { item: ReviewItem }) {
  const status = !item.selected ? "unanswered" : item.is_correct ? "correct" : "incorrect";
  const Icon = status === "correct" ? CheckCircle2 : status === "incorrect" ? XCircle : MinusCircle;
  return (
    <li className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="tabular rounded-md bg-forest-900 px-2 py-1 text-white">Q{item.position}</span>
        <span className="rounded-md bg-sage-100 px-2 py-1 text-forest-800">{item.subject}</span>
        {item.topic && <span className="rounded-md bg-paper px-2 py-1 text-ink-soft">{item.topic}</span>}
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1",
            status === "correct" ? "text-success" : status === "incorrect" ? "text-danger" : "text-muted",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {status === "correct" ? "Correct" : status === "incorrect" ? "Incorrect" : "Not answered"}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-wrap font-semibold leading-relaxed">{item.stem}</p>
      {item.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image_url} alt="" loading="lazy" className="mt-3 max-h-72 rounded-md border border-line" />
      )}
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((o) => {
          const correct = item.correct === o;
          const chosen = item.selected === o;
          return (
            <li
              key={o}
              className={cn(
                "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                correct ? "border-success bg-success-soft" : chosen ? "border-danger bg-danger-soft" : "border-line",
              )}
            >
              <span className={cn("font-bold", correct ? "text-success" : chosen ? "text-danger" : "text-muted")}>{o}.</span>
              <span className="whitespace-pre-wrap">{item.options[o]}</span>
              {chosen && <span className="ml-auto shrink-0 text-xs font-semibold text-muted">Your answer</span>}
            </li>
          );
        })}
      </ul>
      {(item.explanation || item.solution) && (
        <div className="mt-3 rounded-md bg-forest-50 px-4 py-3 text-sm leading-relaxed text-ink-soft">
          {item.explanation && (
            <p className="whitespace-pre-wrap">
              <span className="font-bold text-forest-900">Explanation: </span>
              {item.explanation}
            </p>
          )}
          {item.solution && (
            <details className="mt-2">
              <summary className="cursor-pointer font-semibold text-forest-800">Detailed solution</summary>
              <p className="mt-1.5 whitespace-pre-wrap">{item.solution}</p>
            </details>
          )}
        </div>
      )}
    </li>
  );
}

