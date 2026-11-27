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
import { HUES, type Hue } from "@/lib/palette";
import { MODE_LABEL, cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const MODE_ICON: Record<string, { icon: typeof Timer; hue: Hue }> = {
  full_mock: { icon: Timer, hue: HUES.blue },
  section: { icon: Layers, hue: HUES.violet },
  subject: { icon: BookOpen, hue: HUES.emerald },
  topic: { icon: BookOpen, hue: HUES.emerald },
  essay: { icon: PenLine, hue: HUES.orange },
};

/** Each test gets its own colour family so the two cards are easy to tell apart. */
const EXAM_STYLE = {
  HAT: { icon: GraduationCap, hue: HUES.blue },
  USAT: { icon: School, hue: HUES.orange },
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
      <section className="relative mb-8 overflow-hidden rounded-3xl bg-linear-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-[0_24px_48px_-20px_rgb(79_70_229/0.55)]">
        <span
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgb(56_189_248/0.35),transparent_40%),radial-gradient(circle_at_80%_110%,rgb(232_121_249/0.35),transparent_45%)]"
          aria-hidden
        />
        <StepsArt className="pointer-events-none absolute -right-6 bottom-0 hidden h-48 w-auto md:block lg:right-8" />
        <div className="relative px-5 py-7 sm:px-8 sm:py-9 md:pr-72">
          <p lang="ur" dir="rtl" className="urdu text-left text-xl text-sky-100">
            السلام علیکم، خوش آمدید
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-4xl">Welcome back, {firstName}</h1>
          <p className="mt-2 max-w-xl text-blue-50/90">Choose your test to see the mocks and practice for your category.</p>
          <dl className="mt-7 grid max-w-lg grid-cols-3 gap-2 sm:gap-3">
            {stats.map((s) => (
              <div key={s.label} className="min-w-0 rounded-2xl border border-white/20 bg-white/15 px-3 py-3 sm:px-4">
                <dt className="text-xs font-medium text-blue-50/85">{s.label}</dt>
                <dd className="tabular mt-0.5 truncate text-lg font-extrabold text-white sm:text-xl">{s.value}</dd>
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
          const { hue } = style;
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
                "group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-card transition-[transform,border-color] duration-200 hover:-translate-y-1",
                hue.hover,
              )}
            >
              <div className={cn("relative overflow-hidden px-6 pb-6 pt-5 text-white", hue.grad)}>
                <Icon
                  className="pointer-events-none absolute -bottom-6 -right-4 h-32 w-32 text-white/10"
                  aria-hidden
                />
                <span className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" aria-hidden />
                <div className="relative flex items-center gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-3xl font-extrabold tracking-tight text-white">{exam.code}</p>
                    <p className="truncate text-sm font-medium text-white/90">{exam.name}</p>
                  </div>
                </div>
                <span className="relative mt-4 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold ring-1 ring-white/25">
                  {first?.essay_duration_min ? "MCQs + 2 essays" : "MCQs only, no essays"}
                </span>
              </div>
              <dl className="grid grid-cols-3 gap-2 p-4 sm:gap-3 sm:p-5">
                {cells.map((c) => (
                  <div key={c.k} className={cn("rounded-2xl border px-3 py-3 sm:px-4", hue.soft, hue.softBorder)}>
                    <dt className="text-xs font-medium text-muted">{c.k}</dt>
                    <dd className={cn("tabular mt-0.5 text-xl font-extrabold sm:text-2xl", hue.text)}>{c.v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-line px-6 py-4">
                <span className="text-sm text-muted">Categories, mocks and practice</span>
                <span className={cn("inline-flex items-center gap-2 text-sm font-bold", hue.text)}>
                  Start preparing
                  <span className={cn("grid h-8 w-8 place-items-center rounded-full transition-transform group-hover:translate-x-1", hue.tile)}>
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent attempts */}
      <Card className="mt-10 overflow-hidden rounded-3xl">
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
              const { icon: Icon, hue } = MODE_ICON[h.mode] ?? { icon: FileText, hue: HUES.sky };
              const p = pct(h);
              const tone = p !== null ? scoreTone(p) : null;
              return (
                <li key={h.id}>
                  <Link
                    href={h.status === "in_progress" ? `/attempt/${h.id}` : `/results/${h.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                  >
                    <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", hue.tile)}>
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
  const hue = blue ? HUES.blue : HUES.orange;
  return (
    <div
      className={cn(
        "relative flex flex-col gap-5 overflow-hidden rounded-3xl border p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6",
        blue
          ? "border-blue-100 bg-linear-to-br from-blue-50 via-white to-indigo-50"
          : "border-orange-100 bg-linear-to-br from-amber-50 via-white to-orange-50",
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-1", hue.line)} aria-hidden />
      <div className="flex min-w-0 gap-4">
        <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", hue.tile)}>{icon}</span>
        <div className="min-w-0">
          <p className={cn("text-sm font-semibold", hue.text)}>{eyebrow}</p>
          <p className="mt-0.5 truncate text-lg font-bold text-forest-950">{title}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {chips.map(({ icon: ChipIcon, text }) => (
              <span key={text} className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-soft">
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
      <rect x="20" y="120" width="60" height="60" rx="10" fill="#ffffff" fillOpacity="0.18" />
      <rect x="90" y="84" width="60" height="96" rx="10" fill="#ffffff" fillOpacity="0.32" />
      <rect x="160" y="46" width="60" height="134" rx="10" fill="#ffffff" fillOpacity="0.9" />
      <rect x="188" y="6" width="4" height="42" rx="2" fill="#ffffff" />
      <path d="M192 8 L226 18 L192 28 Z" fill="#fbbf24" />
      <circle cx="50" cy="104" r="7" fill="#fbbf24" />
    </svg>
  );
}
