import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock3,
  FileText,
  Flame,
  History,
  Layers,
  Lock,
  NotebookPen,
  PenLine,
  PlayCircle,
  Sparkles,
  Target,
  Timer,
  TrendingDown,
  Zap,
} from "lucide-react";

import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Ring } from "@/components/ui/ring";
import { StartButton } from "@/features/prepare/start-button";
import { pageApi, requireUser } from "@/lib/api/server";
import type { HistoryItem, Overview, Page } from "@/lib/api/types";
import { HUES, scoreTone, type Hue } from "@/lib/palette";
import { MODE_LABEL, cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const MODE_ICON: Record<string, { icon: typeof Timer; hue: Hue }> = {
  full_mock: { icon: Timer, hue: HUES.blue },
  section: { icon: Layers, hue: HUES.violet },
  subject: { icon: BookOpen, hue: HUES.emerald },
  topic: { icon: BookOpen, hue: HUES.emerald },
  quiz: { icon: Zap, hue: HUES.sky },
  mistakes: { icon: NotebookPen, hue: HUES.rose },
  essay: { icon: PenLine, hue: HUES.orange },
};

const REC_STYLE: Record<string, { icon: typeof Timer; hue: Hue }> = {
  start: { icon: Sparkles, hue: HUES.blue },
  weak: { icon: TrendingDown, hue: HUES.rose },
  mistakes: { icon: NotebookPen, hue: HUES.orange },
  new: { icon: Target, hue: HUES.emerald },
  mock: { icon: Timer, hue: HUES.violet },
  goal: { icon: Zap, hue: HUES.sky },
};

function pct(h: HistoryItem): number | null {
  return h.total_marks ? Math.round(((h.score ?? 0) * 100) / h.total_marks) : null;
}

export default async function DashboardPage() {
  const [me, ov, history] = await Promise.all([
    requireUser(),
    pageApi<Overview>("/me/overview"),
    pageApi<Page<HistoryItem>>("/me/history?page_size=5"),
  ]);
  const firstName = me.full_name.split(" ")[0] ?? "";
  const cat = ov.category;
  const inProgress = history.items.find((h) => h.status === "in_progress" || h.essay_status === "in_progress");
  const daily = ov.goals.find((g) => g.key === "daily")!;
  const dailyPct = Math.min(100, Math.round((daily.current * 100) / daily.target));
  const earned = ov.achievements.filter((a) => a.earned).length;

  return (
    <>
      {/* Welcome banner */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-[0_24px_48px_-20px_rgb(79_70_229/0.55)]">
        <span
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgb(56_189_248/0.35),transparent_40%),radial-gradient(circle_at_80%_110%,rgb(232_121_249/0.35),transparent_45%)]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 px-5 py-7 sm:px-8 sm:py-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p lang="ur" dir="rtl" className="urdu text-left text-xl text-sky-100">
              السلام علیکم، خوش آمدید
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-4xl">Welcome back, {firstName}</h1>
            <p className="mt-2 max-w-xl text-blue-50/90">
              Your {cat.exam} preparation for <span className="font-bold text-white">{cat.code}</span>
              {cat.name !== cat.code ? ` (${cat.name})` : ""}.{" "}
              {ov.streak.active_today ? "Great work today, keep going." : "Answer a few questions today to keep your streak."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <LinkButton href="/quizzes" variant="gold" size="sm">
                <Zap className="h-4 w-4" aria-hidden /> Quick quiz
              </LinkButton>
              <Link
                href="/mocks"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/30 bg-white/15 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/25"
              >
                <Timer className="h-4 w-4" aria-hidden /> Full mock
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-white/20 bg-white/10 p-4 lg:min-w-[260px]">
            <Ring value={dailyPct} size={84} stroke={9} trackClass="stroke-white/20" barClass="stroke-amber-300">
              <span className="tabular text-lg font-extrabold">{dailyPct}%</span>
            </Ring>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Today&apos;s goal</p>
              <p className="tabular mt-0.5 text-2xl font-extrabold">
                {daily.current}
                <span className="text-base font-semibold text-blue-100"> / {daily.target}</span>
              </p>
              <p className="text-sm text-blue-50/90">questions answered</p>
            </div>
          </div>
        </div>
      </section>

      {inProgress && (
        <div className="relative mb-6 flex flex-col gap-4 overflow-hidden rounded-2xl border border-orange-100 bg-linear-to-r from-amber-50 via-white to-orange-50 p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <span className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-amber-400 to-orange-500" aria-hidden />
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", HUES.orange.tile)}>
              <PlayCircle className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-orange-700">Not finished yet</p>
              <p className="truncate font-bold text-forest-950">{inProgress.title}</p>
              <p className="text-xs text-muted">Started {formatDate(inProgress.started_at)}</p>
            </div>
          </div>
          <LinkButton
            href={inProgress.status === "in_progress" ? `/attempt/${inProgress.id}` : `/attempt/${inProgress.id}/essays`}
            variant="gold"
            className="shrink-0"
          >
            Resume <ArrowRight className="h-4 w-4" aria-hidden />
          </LinkButton>
        </div>
      )}

      {/* KPI row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi hue={HUES.blue} label="Overall progress" sub={`${ov.progress.seen} of ${ov.progress.bank} questions practised`}>
          <Ring value={ov.progress.percent} size={56} stroke={7}>
            <Target className="h-5 w-5 text-blue-600" aria-hidden />
          </Ring>
          <p className="tabular text-3xl font-extrabold text-forest-950">{Math.round(ov.progress.percent)}%</p>
        </Kpi>
        <Kpi hue={HUES.orange} label="Study streak" sub={`Best: ${ov.streak.best} day${ov.streak.best === 1 ? "" : "s"}`}>
          <span className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-2xl", ov.streak.current ? HUES.orange.tile : "bg-sage-100 text-sage-500")}>
            <Flame className="h-7 w-7" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="tabular text-3xl font-extrabold text-forest-950">
              {ov.streak.current}
              <span className="ml-1 text-base font-semibold text-muted">day{ov.streak.current === 1 ? "" : "s"}</span>
            </p>
            <div className="mt-1 flex gap-0.5" role="img" aria-label="Activity in the last 14 days">
              {ov.streak.last14.map((d) => (
                <span
                  key={d.date}
                  title={`${d.date}: ${d.count} questions`}
                  className={cn("h-2.5 w-2 rounded-sm", !d.active ? "bg-sage-200" : d.count >= daily.target ? "bg-orange-500" : "bg-amber-300")}
                />
              ))}
            </div>
          </div>
        </Kpi>
        <Kpi hue={HUES.emerald} label="Accuracy" sub={`${ov.progress.answered} answers · ${ov.completed.attempts} sessions done`}>
          <Ring value={ov.progress.accuracy} size={56} stroke={7} barClass="stroke-emerald-500">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
          </Ring>
          <p className="tabular text-3xl font-extrabold text-forest-950">{Math.round(ov.progress.accuracy)}%</p>
        </Kpi>
        <Kpi
          hue={HUES.violet}
          label="Average score"
          sub={ov.scores.best !== null ? `Best: ${ov.scores.best}% · last ${ov.scores.recent.length} sessions` : "Finish a session to see scores"}
        >
          <p className="tabular text-3xl font-extrabold text-forest-950">{ov.scores.average !== null ? `${ov.scores.average}%` : "-"}</p>
          <div className="ml-auto flex h-12 items-end gap-1" aria-hidden>
            {ov.scores.recent.map((s) => (
              <span key={s.id} className={cn("w-2 rounded-t-sm", scoreTone(s.percent).bar)} style={{ height: `${Math.max(8, s.percent)}%` }} />
            ))}
          </div>
        </Kpi>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* Recommendations */}
          <Card className="overflow-hidden rounded-3xl">
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600" aria-hidden /> Recommended for you
                </span>
              }
              description="Based on your recent answers"
            />
            {ov.recommendations.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">You are on track. Keep practising to get new suggestions.</p>
            ) : (
              <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                {ov.recommendations.map((r) => {
                  const st = REC_STYLE[r.kind] ?? REC_STYLE.start;
                  const Icon = st.icon;
                  return (
                    <li key={r.title} className={cn("flex flex-col rounded-2xl border p-4", st.hue.soft, st.hue.softBorder)}>
                      <div className="flex items-start gap-3">
                        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", st.hue.tile)}>
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold leading-snug text-forest-950">{r.title}</p>
                          <p className="mt-1 text-sm text-ink-soft">{r.body}</p>
                        </div>
                      </div>
                      <div className="mt-auto pt-4">
                        {r.action.type === "practice" ? (
                          <StartButton
                            endpoint="/practice"
                            size="sm"
                            body={{ category: cat.code, mode: r.action.mode, ref_id: r.action.ref_id, count: r.action.count }}
                          >
                            Start {r.action.count} questions <ArrowRight className="h-4 w-4" aria-hidden />
                          </StartButton>
                        ) : (
                          <LinkButton href={r.action.href} size="sm" variant="secondary">
                            Open <ArrowRight className="h-4 w-4" aria-hidden />
                          </LinkButton>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Subject performance */}
          <Card className="overflow-hidden rounded-3xl">
            <CardHeader
              title="Subject performance"
              description="Accuracy, and how much of each question bank you have covered"
              action={
                <Link href="/practice" className="text-sm font-semibold text-blue-700 hover:underline">
                  Practise
                </Link>
              }
            />
            <ul className="divide-y divide-line">
              {ov.subjects.map((s) => {
                const weak = ov.weak_subjects.some((w) => w.id === s.id);
                const tone = s.answered ? scoreTone(s.accuracy) : null;
                return (
                  <li
                    key={s.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_160px_56px]"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold text-forest-950">
                        <span className="truncate">{s.name}</span>
                        {weak && <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">Needs work</span>}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {s.section} · {s.seen}/{s.bank} covered
                      </p>
                    </div>
                    <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                      <div className="h-2 overflow-hidden rounded-full bg-sage-100">
                        <div
                          className={cn("h-full rounded-full", tone?.bar ?? "bg-sage-300")}
                          style={{ width: `${s.answered ? Math.max(4, s.accuracy) : 0}%` }}
                        />
                      </div>
                    </div>
                    <p className={cn("tabular text-right text-sm font-bold", tone?.text ?? "text-muted")}>
                      {s.answered ? `${Math.round(s.accuracy)}%` : "New"}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Recent activity */}
          <Card className="overflow-hidden rounded-3xl">
            <CardHeader
              title="Recent activity"
              action={
                history.total > 0 ? (
                  <Link href="/history" className="text-sm font-semibold text-blue-700 hover:underline">
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
                    <span lang="ur" dir="rtl" className="urdu block text-base text-forest-700">
                      پہلا قدم اٹھائیں
                    </span>
                    Start a quick quiz or practise one subject.
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
                        className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50"
                      >
                        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", hue.tile)}>
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-forest-950">{h.title}</p>
                          <p className="text-xs text-muted">
                            {MODE_LABEL[h.mode] ?? h.mode} · {formatDate(h.started_at)}
                          </p>
                        </div>
                        {h.status === "in_progress" ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">In progress</span>
                        ) : p !== null && tone ? (
                          <span className={cn("tabular rounded-full px-3 py-1 text-sm font-bold", tone.soft, tone.text)}>{p}%</span>
                        ) : (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Essays</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          {/* Goals */}
          <Card className="rounded-3xl p-5">
            <h3 className="flex items-center gap-2 text-base font-bold">
              <Target className="h-4 w-4 text-blue-600" aria-hidden /> Upcoming goals
            </h3>
            <ul className="mt-4 space-y-4">
              {ov.goals.map((g, i) => {
                const hue = [HUES.blue, HUES.violet, HUES.emerald][i % 3];
                const done = g.current >= g.target;
                const p = Math.min(100, Math.round((g.current * 100) / g.target));
                return (
                  <li key={g.key}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5 font-semibold text-ink-soft">
                        {done && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />} {g.label}
                      </span>
                      <span className="tabular font-bold text-forest-950">
                        {Math.min(g.current, g.target)}/{g.target}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sage-100">
                      <div
                        className={cn("h-full rounded-full", done ? "bg-emerald-500" : hue.line)}
                        style={{ width: `${Math.max(p, g.current ? 4 : 0)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link href="/account#preferences" className="mt-4 inline-block text-xs font-semibold text-blue-700 hover:underline">
              Change daily goal
            </Link>
          </Card>

          {/* Quick actions */}
          <Card className="rounded-3xl p-5">
            <h3 className="text-base font-bold">Quick actions</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { href: "/practice", label: "Practice", icon: Target, hue: HUES.emerald },
                { href: "/quizzes", label: "Quizzes", icon: Zap, hue: HUES.sky },
                { href: "/mocks", label: "Mock tests", icon: Timer, hue: HUES.violet },
                { href: "/mistakes", label: `Mistakes${ov.mistakes.total ? ` (${ov.mistakes.total})` : ""}`, icon: NotebookPen, hue: HUES.rose },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-2xl border p-3 transition-transform duration-200 hover:-translate-y-0.5",
                    a.hue.soft,
                    a.hue.softBorder,
                  )}
                >
                  <span className={cn("grid h-9 w-9 place-items-center rounded-xl", a.hue.tile)}>
                    <a.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="text-sm font-bold text-forest-950">{a.label}</span>
                </Link>
              ))}
            </div>
          </Card>

          {/* Achievements */}
          <Card className="rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <Award className="h-4 w-4 text-amber-600" aria-hidden /> Achievements
              </h3>
              <Link href="/account#achievements" className="tabular text-sm font-semibold text-muted hover:text-blue-700">
                {earned}/{ov.achievements.length}
              </Link>
            </div>
            <ul className="mt-4 grid grid-cols-4 gap-2">
              {ov.achievements.map((a) => (
                <li key={a.key} title={`${a.title}: ${a.description}`} className="flex flex-col items-center text-center">
                  <span
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-2xl",
                      a.earned
                        ? "bg-linear-to-br from-amber-400 to-orange-500 text-white shadow-[0_6px_14px_-6px_rgb(249_115_22/0.7)]"
                        : "bg-sage-100 text-sage-500",
                    )}
                  >
                    {a.earned ? <Award className="h-5 w-5" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
                  </span>
                  <span className={cn("mt-1 line-clamp-2 text-[11px] font-semibold leading-tight", a.earned ? "text-forest-950" : "text-muted")}>
                    {a.title}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="rounded-3xl border-dashed p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-forest-950">
              <Brain className="h-4 w-4 text-violet-600" aria-hidden /> Coming next
            </p>
            <p className="mt-1 text-sm text-muted">Study plans, lessons and flashcards for {cat.exam} are on the way.</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {["Study Plans", "Learn", "Memorize", "Forum"].map((x) => (
                <span key={x} className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-2.5 py-1 font-semibold text-ink-soft">
                  <Clock3 className="h-3 w-3" aria-hidden /> {x}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Kpi({ hue, label, sub, children }: { hue: Hue; label: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-card">
      <span className={cn("absolute inset-x-0 top-0 h-1", hue.line)} aria-hidden />
      <p className={cn("text-xs font-bold uppercase tracking-wide", hue.text)}>{label}</p>
      <div className="mt-2 flex items-center gap-3">{children}</div>
      <p className="mt-2 truncate text-xs text-muted">{sub}</p>
    </div>
  );
}
