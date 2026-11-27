import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  FileText,
  GraduationCap,
  History,
  Layers,
  PenLine,
  PlayCircle,
  School,
  Timer,
} from "lucide-react";

import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { getMe, pageApi, serverApi } from "@/lib/api/server";
import type { Exam, HistoryItem, Page } from "@/lib/api/types";
import { MODE_LABEL, cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const MODE_ICON: Record<string, typeof Timer> = {
  full_mock: Timer,
  section: Layers,
  subject: BookOpen,
  topic: BookOpen,
  essay: PenLine,
};

/** Each test gets its own accent so the two cards are easy to tell apart. */
const EXAM_STYLE = {
  HAT: { icon: GraduationCap, band: "bg-forest-50", tile: "bg-forest-900 text-white", ring: "group-hover:border-forest-600" },
  USAT: { icon: School, band: "bg-gold-100", tile: "bg-gold-500 text-forest-950", ring: "group-hover:border-gold-500" },
} as const;

function pct(h: HistoryItem): number | null {
  return h.total_marks ? Math.round(((h.score ?? 0) * 100) / h.total_marks) : null;
}

function scoreTone(p: number) {
  if (p >= 70) return { text: "text-success", bar: "bg-success", soft: "bg-success-soft" };
  if (p >= 40) return { text: "text-gold-700", bar: "bg-gold-500", soft: "bg-gold-100" };
  return { text: "text-danger", bar: "bg-danger", soft: "bg-danger-soft" };
}

export default async function DashboardPage() {
  // Independent requests run in parallel (no waterfall).
  const [me, exams, history] = await Promise.all([
    getMe(),
    serverApi<Exam[]>("/exams", { revalidate: 60, tags: ["catalog"] }),
    pageApi<Page<HistoryItem>>("/me/history?page_size=5"),
  ]);
  const firstName = me?.full_name.split(" ")[0] ?? "";
  const inProgress = history.items.find((h) => h.status === "in_progress" || h.essay_status === "in_progress");
  const preferred = me?.preferred_category
    ? exams.flatMap((e) => e.categories.map((c) => ({ ...c, exam: e.code }))).find((c) => c.code === me.preferred_category)
    : undefined;
  const lastScored = history.items.find((h) => h.status !== "in_progress" && pct(h) !== null);

  const stats = [
    { label: "Attempts", value: String(history.total) },
    { label: "Last score", value: lastScored ? `${pct(lastScored)}%` : "-" },
    { label: "Target", value: preferred?.code ?? "Not set" },
  ];

  return (
    <>
      {/* Welcome banner */}
      <section className="relative mb-8 overflow-hidden rounded-2xl border border-forest-100 bg-forest-50">
        <StepsArt className="pointer-events-none absolute -right-6 bottom-0 hidden h-44 w-auto md:block lg:right-6" />
        <div className="relative px-5 py-7 sm:px-8 sm:py-8 md:pr-72">
          <p lang="ur" dir="rtl" className="urdu text-left text-xl text-forest-700">
            السلام علیکم، خوش آمدید
          </p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Welcome back, {firstName}</h1>
          <p className="mt-1.5 max-w-xl text-ink-soft">Choose your test to see the mocks and practice for your category.</p>
          <dl className="mt-6 grid max-w-lg grid-cols-3 divide-x divide-forest-100 rounded-xl border border-forest-100 bg-surface shadow-card">
            {stats.map((s) => (
              <div key={s.label} className="min-w-0 px-3 py-3 sm:px-4">
                <dt className="text-xs font-medium text-muted">{s.label}</dt>
                <dd className="tabular mt-0.5 truncate text-base font-bold text-forest-950 sm:text-lg">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Continue / resume */}
      {(inProgress || preferred) && (
        <div className="mb-10 grid gap-4 md:grid-cols-2">
          {inProgress && (
            <ActionCard
              accent="gold"
              icon={<PlayCircle className="h-5 w-5" aria-hidden />}
              eyebrow="Not finished yet"
              title={inProgress.title}
              chips={[
                { icon: Clock3, text: `Started ${formatDate(inProgress.started_at)}` },
                { icon: FileText, text: MODE_LABEL[inProgress.mode] ?? inProgress.mode },
              ]}
              href={inProgress.status === "in_progress" ? `/attempt/${inProgress.id}` : `/attempt/${inProgress.id}/essays`}
              cta="Resume"
            />
          )}
          {preferred && (
            <ActionCard
              accent="blue"
              icon={<BookOpen className="h-5 w-5" aria-hidden />}
              eyebrow={
                <>
                  Continue preparing <span lang="ur" className="urdu text-forest-700">· تیاری جاری رکھیں</span>
                </>
              }
              title={preferred.name}
              chips={[
                { icon: FileText, text: `${preferred.total_mcqs} MCQs` },
                { icon: Clock3, text: `${preferred.mcq_duration_min} min` },
              ]}
              href={`/prepare/${preferred.exam.toLowerCase()}/${preferred.code.toLowerCase()}`}
              cta={`Open ${preferred.code}`}
            />
          )}
        </div>
      )}

      {/* Exams */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold">Choose your test</h2>
          <p className="text-sm text-muted">Pick one to see its categories, mocks and practice.</p>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {exams.map((exam) => {
          const style = EXAM_STYLE[exam.code] ?? EXAM_STYLE.HAT;
          const Icon = style.icon;
          const first = exam.categories[0];
          const cells = [
            { k: "Categories", v: String(exam.categories.length) },
            { k: "MCQs", v: first ? String(first.total_mcqs) : "-" },
            { k: "Minutes", v: first ? String(first.mcq_duration_min + (first.essay_duration_min ?? 0)) : "-" },
          ];
          return (
            <Link
              key={exam.id}
              href={`/prepare/${exam.code.toLowerCase()}`}
              className={cn(
                "group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-hover",
                style.ring,
              )}
            >
              <div className={cn("flex items-center gap-4 px-6 py-5", style.band)}>
                <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl shadow-card", style.tile)}>
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-2xl font-extrabold tracking-tight text-forest-950">{exam.code}</p>
                  <p className="truncate text-sm font-medium text-ink-soft">{exam.name}</p>
                </div>
              </div>
              <dl className="grid grid-cols-3 divide-x divide-line border-y border-line">
                {cells.map((c) => (
                  <div key={c.k} className="px-5 py-4">
                    <dt className="text-xs font-medium text-muted">{c.k}</dt>
                    <dd className="tabular mt-0.5 text-xl font-bold text-forest-950">{c.v}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-1 items-center justify-between gap-3 px-6 py-4">
                <span className="text-sm text-muted">
                  {first?.essay_duration_min ? "MCQs plus 2 essays" : "MCQs only, no essays"}
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700">
                  Start preparing
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent attempts */}
      <Card className="mt-10 overflow-hidden rounded-2xl">
        <CardHeader
          title="Recent attempts"
          description={history.total > 0 ? "Your latest practice and mocks" : undefined}
          action={
            history.total > 0 ? (
              <Link href="/history" className="text-sm font-semibold text-forest-700 hover:underline">
                View all
              </Link>
            ) : undefined
          }
        />
        {history.items.length === 0 ? (
          <EmptyState
            icon={<History className="h-5 w-5" />}
            title="Take your first step"
            description={
              <>
                <span lang="ur" dir="rtl" className="urdu block text-base text-forest-700">پہلا قدم اٹھائیں</span>
                Choose HAT or USAT above and start a practice session or a full mock.
              </>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {history.items.map((h) => {
              const Icon = MODE_ICON[h.mode] ?? FileText;
              const p = pct(h);
              const tone = p !== null ? scoreTone(p) : null;
              return (
                <li key={h.id}>
                  <Link
                    href={h.status === "in_progress" ? `/attempt/${h.id}` : `/results/${h.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-forest-50/60"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-forest-950">{h.title}</p>
                      <p className="text-xs text-muted">
                        {MODE_LABEL[h.mode] ?? h.mode}, {formatDate(h.started_at)}
                      </p>
                    </div>
                    {h.status === "in_progress" ? (
                      <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-700">In progress</span>
                    ) : p !== null && tone ? (
                      <div className="w-20 shrink-0 text-right sm:w-36">
                        <p className="tabular text-sm font-bold">
                          <span className={tone.text}>{p}%</span>
                          <span className="ml-1.5 hidden font-medium text-muted sm:inline">
                            {h.score}/{h.total_marks}
                          </span>
                        </p>
                        <div className={cn("mt-1.5 h-1.5 overflow-hidden rounded-full", tone.soft)}>
                          <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${Math.max(4, p)}%` }} />
                        </div>
                      </div>
                    ) : (
                      <span className="rounded-full bg-forest-50 px-3 py-1 text-xs font-semibold text-forest-800">Essays</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

function ActionCard({
  accent,
  icon,
  eyebrow,
  title,
  chips,
  href,
  cta,
}: {
  accent: "blue" | "gold";
  icon: React.ReactNode;
  eyebrow: React.ReactNode;
  title: string;
  chips: { icon: typeof Clock3; text: string }[];
  href: string;
  cta: string;
}) {
  const blue = accent === "blue";
  return (
    <div className="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <span className={cn("absolute inset-y-0 left-0 w-1", blue ? "bg-forest-900" : "bg-gold-500")} aria-hidden />
      <div className="flex min-w-0 gap-4">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
            blue ? "bg-forest-50 text-forest-700" : "bg-gold-100 text-gold-700",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className={cn("text-sm font-semibold", blue ? "text-muted" : "text-gold-700")}>{eyebrow}</p>
          <p className="mt-0.5 truncate text-lg font-bold text-forest-950">{title}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {chips.map(({ icon: ChipIcon, text }) => (
              <span key={text} className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-ink-soft">
                <ChipIcon className="h-3.5 w-3.5 text-muted" aria-hidden /> {text}
              </span>
            ))}
          </div>
        </div>
      </div>
      <LinkButton href={href} variant={blue ? "primary" : "gold"} className="shrink-0">
        {cta} <ArrowRight className="h-4 w-4" aria-hidden />
      </LinkButton>
    </div>
  );
}

/** "Qadam" means step: flat ascending steps with a flag on top. Inline SVG, no download. */
function StepsArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 180" className={className} aria-hidden>
      <rect x="20" y="120" width="60" height="60" rx="10" fill="#dbeafe" />
      <rect x="90" y="84" width="60" height="96" rx="10" fill="#93c5fd" />
      <rect x="160" y="46" width="60" height="134" rx="10" fill="#2563eb" />
      <rect x="188" y="6" width="4" height="42" rx="2" fill="#0f172a" />
      <path d="M192 8 L226 18 L192 28 Z" fill="#f59e0b" />
      <circle cx="50" cy="104" r="7" fill="#f59e0b" />
    </svg>
  );
}
