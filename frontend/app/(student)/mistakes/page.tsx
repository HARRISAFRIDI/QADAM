import type { Metadata } from "next";
import Link from "next/link";
import { CircleSlash, Flag, NotebookPen, RotateCcw, XCircle } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Card, EmptyState } from "@/components/ui/card";
import { StartButton } from "@/features/prepare/start-button";
import { pageApi, requireUser } from "@/lib/api/server";
import type { MistakeItem, Mistakes, Option } from "@/lib/api/types";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Mistake Notebook" };

const TABS = [
  { key: undefined, label: "All", icon: NotebookPen, tone: "from-blue-600 to-indigo-600" },
  { key: "wrong", label: "Wrong", icon: XCircle, tone: "from-rose-500 to-pink-600" },
  { key: "skipped", label: "Skipped", icon: CircleSlash, tone: "from-slate-500 to-slate-700" },
  { key: "flagged", label: "Flagged", icon: Flag, tone: "from-amber-500 to-orange-600" },
] as const;

const KIND_BADGE: Record<MistakeItem["kind"], string> = {
  wrong: "bg-rose-50 text-rose-700",
  skipped: "bg-slate-100 text-slate-700",
  flagged: "bg-amber-50 text-amber-700",
};

export default async function MistakesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; subject?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const kind = TABS.some((t) => t.key === sp.kind) ? sp.kind : undefined;
  const subject = sp.subject && /^\d+$/.test(sp.subject) ? sp.subject : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = new URLSearchParams({ page: String(page), page_size: "10" });
  if (kind) q.set("kind", kind);
  if (subject) q.set("subject_id", subject);
  const [me, data] = await Promise.all([requireUser("/mistakes"), pageApi<Mistakes>(`/me/mistakes?${q}`)]);

  const href = (k?: string, s?: string) => {
    const p = new URLSearchParams();
    if (k) p.set("kind", k);
    if (s) p.set("subject", s);
    const str = p.toString();
    return str ? `/mistakes?${str}` : "/mistakes";
  };

  return (
    <>
      <PageHeader
        eyebrow="Revise and improve"
        title="Mistake Notebook"
        description="Every question you got wrong, skipped or flagged is saved here. Answer it correctly in a later session and it leaves the notebook."
        action={
          data.counts.all > 0 ? (
            <StartButton
              endpoint="/practice"
              body={{ category: me.preferred_category, mode: "mistakes", ref_id: subject ? Number(subject) : null, count: 20 }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Practise these mistakes
            </StartButton>
          ) : undefined
        }
      />

      {/* Kind tabs */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TABS.map((t) => {
          const active = kind === t.key;
          const n = data.counts[(t.key ?? "all") as keyof Mistakes["counts"]];
          return (
            <Link
              key={t.label}
              href={href(t.key, subject)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3.5 transition-colors",
                active ? "border-blue-300 bg-blue-50 shadow-card" : "border-line bg-surface hover:border-blue-200",
              )}
            >
              <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-linear-to-br text-white", t.tone)}>
                <t.icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="tabular block text-xl font-extrabold text-forest-950">{n}</span>
                <span className="block text-xs font-semibold text-muted">{t.label}</span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* Subject filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <FilterChip href={href(kind)} active={!subject} label="All subjects" />
        {data.subjects
          .filter((s) => s.count > 0)
          .map((s) => (
            <FilterChip key={s.id} href={href(kind, String(s.id))} active={subject === String(s.id)} label={`${s.name} (${s.count})`} />
          ))}
      </div>

      {data.items.length === 0 ? (
        <Card className="rounded-3xl">
          <EmptyState
            icon={<NotebookPen className="h-5 w-5" />}
            title={data.counts.all === 0 ? "Your notebook is empty" : "Nothing here"}
            description={
              data.counts.all === 0
                ? "Take a quiz or practice session. Questions you miss, skip or flag will appear here."
                : "No saved questions match this filter."
            }
          />
        </Card>
      ) : (
        <ul className="space-y-4">
          {data.items.map((it, i) => (
            <li key={it.question_id}>
              <MistakeCard item={it} n={(page - 1) * data.page_size + i + 1} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} pageSize={data.page_size} total={data.total} basePath="/mistakes" params={{ kind, subject }} />
    </>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
        active ? "border-blue-500 bg-blue-600 text-white" : "border-line bg-surface text-ink-soft hover:border-blue-200",
      )}
    >
      {label}
    </Link>
  );
}

function MistakeCard({ item, n }: { item: MistakeItem; n: number }) {
  return (
    <Card className="overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper px-5 py-2.5 text-xs">
        <span className="tabular font-bold text-ink-soft">Q{n}</span>
        <span className="font-semibold text-forest-950">{item.subject}</span>
        <span className={cn("rounded-full px-2 py-0.5 font-bold capitalize", KIND_BADGE[item.kind])}>{item.kind}</span>
        {item.flagged && item.kind !== "flagged" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-700">
            <Flag className="h-3 w-3" aria-hidden /> Flagged
          </span>
        )}
        <span className="capitalize text-muted">· {item.difficulty}</span>
        <span className="ml-auto text-muted">{formatDate(item.seen_at)}</span>
      </div>
      <div className="p-5">
        <p className="whitespace-pre-line font-medium leading-relaxed text-forest-950">{item.stem}</p>
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt="" loading="lazy" className="mt-3 max-h-64 rounded-lg border border-line" />
        )}
        <details className="group mt-4">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show answer</span>
            <span className="hidden group-open:inline">Hide answer</span>
          </summary>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {(Object.keys(item.options) as Option[]).map((k) => {
              const correct = k === item.correct;
              const picked = k === item.selected;
              return (
                <li
                  key={k}
                  className={cn(
                    "flex gap-2.5 rounded-xl border px-3 py-2.5 text-sm",
                    correct ? "border-emerald-300 bg-emerald-50" : picked ? "border-rose-300 bg-rose-50" : "border-line",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                      correct ? "bg-emerald-500 text-white" : picked ? "bg-rose-500 text-white" : "bg-sage-100 text-ink-soft",
                    )}
                  >
                    {k}
                  </span>
                  <span className="min-w-0 flex-1 text-ink-soft">
                    {item.options[k]}
                    {correct && <span className="ml-1.5 text-xs font-bold text-emerald-700">Correct</span>}
                    {picked && !correct && <span className="ml-1.5 text-xs font-bold text-rose-700">Your answer</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          {!item.selected && <p className="mt-2 text-xs font-semibold text-slate-600">You skipped this question.</p>}
          {(item.explanation || item.solution) && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-relaxed text-ink-soft">
              <p className="mb-1 font-bold text-blue-800">Explanation</p>
              <p className="whitespace-pre-line">{item.explanation || item.solution}</p>
              {item.explanation && item.solution && <p className="mt-2 whitespace-pre-line">{item.solution}</p>}
            </div>
          )}
        </details>
      </div>
    </Card>
  );
}
