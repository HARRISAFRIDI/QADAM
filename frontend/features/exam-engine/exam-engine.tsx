"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  CloudUpload,
  Check,
  Grid3x3,
  Lightbulb,
  Loader2,
} from "lucide-react";

import { LogoMark } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { api, errorMessage } from "@/lib/api/client";
import type { Attempt, CheckResult, Option } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import { QuestionGrid, type GridItem } from "./question-grid";
import { QuestionView, type AnswerState } from "./question-view";
import { Timer } from "./timer";
import { clearLocal, readLocal, useAutosave, type SaveStatus } from "./use-autosave";

type State = { current: number; answers: Record<number, AnswerState> };
type Action =
  | { type: "go"; position: number }
  | { type: "select"; position: number; option: Option; seq: number }
  | { type: "mark"; position: number; seq: number }
  | { type: "checked"; result: CheckResult }
  | { type: "restore"; entries: { position: number; selected: Option | null; marked: boolean; seq: number }[] };

function reducer(state: State, a: Action): State {
  switch (a.type) {
    case "go":
      return state.current === a.position ? state : { ...state, current: a.position };
    case "select": {
      const prev = state.answers[a.position];
      if (prev.checked) return state;
      const selected = prev.selected === a.option ? null : a.option; // tap again to clear
      return { ...state, answers: { ...state.answers, [a.position]: { ...prev, selected, seq: a.seq } } };
    }
    case "mark": {
      const prev = state.answers[a.position];
      return { ...state, answers: { ...state.answers, [a.position]: { ...prev, marked: !prev.marked, seq: a.seq } } };
    }
    case "restore": {
      const answers = { ...state.answers };
      for (const e of a.entries) answers[e.position] = { ...answers[e.position], selected: e.selected, marked: e.marked, seq: e.seq };
      return { ...state, answers };
    }
    case "checked": {
      const prev = state.answers[a.result.position];
      return {
        ...state,
        answers: {
          ...state.answers,
          [a.result.position]: {
            ...prev,
            selected: a.result.selected,
            checked: true,
            correct: a.result.correct,
            explanation: a.result.explanation,
            solution: a.result.solution,
          },
        },
      };
    }
  }
}

function init(attempt: Attempt): State {
  const answers: Record<number, AnswerState> = {};
  for (const q of attempt.questions) {
    answers[q.position] = {
      selected: q.selected,
      marked: q.marked,
      seq: q.seq,
      checked: q.checked,
      correct: q.correct,
      explanation: q.explanation,
    };
  }
  const firstOpen = attempt.questions.find((q) => !answers[q.position].selected)?.position ?? 1;
  return { current: firstOpen, answers };
}

export function ExamEngine({ attempt }: { attempt: Attempt }) {
  const router = useRouter();
  const isPractice = attempt.mode !== "full_mock";
  const questions = attempt.questions;
  const total = questions.length;
  const [state, dispatch] = useReducer(reducer, attempt, init);
  const { current: currentPos, answers: allAnswers } = state;
  const [gridOpen, setGridOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const lastSeq = useRef(0);
  const submittedRef = useRef(false);
  const submitRef = useRef<(auto?: boolean) => Promise<void>>(async () => {});

  // Clock offset between server and device (computed once on load).
  const [offsetMs] = useState(() => new Date(attempt.server_now).getTime() - Date.now());

  const nextSeq = useCallback(() => {
    lastSeq.current = Math.max(lastSeq.current + 1, Date.now());
    return lastSeq.current;
  }, []);

  // If the server says the attempt is closed (submitted elsewhere / time up), finish it;
  // otherwise (session expired) keep answers locally and show a notice.
  const onFatal = useCallback((code: string) => {
    if (code === "attempt_submitted" || code === "attempt_expired") void submitRef.current(true);
    else setFatal(code);
  }, []);
  const save = useAutosave(attempt.id, onFatal);

  // After mount: restore answers saved on this device that are newer than the
  // server copy (e.g. made while offline) and push them to the server.
  const restored = useRef(false);
  const { queue } = save;
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const local = readLocal(attempt.id);
    const entries = [];
    for (const q of questions) {
      lastSeq.current = Math.max(lastSeq.current, q.seq);
      const l = local[q.position];
      if (l && l.seq > q.seq && !q.checked) {
        entries.push(l);
        lastSeq.current = Math.max(lastSeq.current, l.seq);
      }
    }
    if (entries.length) {
      dispatch({ type: "restore", entries });
      entries.forEach(queue);
    }
  }, [attempt.id, questions, queue]);

  const sectionName = useMemo(() => Object.fromEntries(attempt.sections.map((s) => [s.id, s.name])), [attempt.sections]);
  const subjectName = useMemo(() => Object.fromEntries(attempt.subjects.map((s) => [s.id, s.name])), [attempt.subjects]);

  const select = useCallback(
    (position: number, option: Option) => {
      const prev = state.answers[position];
      if (prev.checked) return;
      const seq = nextSeq();
      const selected = prev.selected === option ? null : option;
      dispatch({ type: "select", position, option, seq });
      save.queue({ position, selected, marked: prev.marked, seq });
    },
    [nextSeq, save, state.answers],
  );

  const toggleMark = useCallback(() => {
    const p = currentPos;
    const prev = allAnswers[p];
    const seq = nextSeq();
    dispatch({ type: "mark", position: p, seq });
    if (!prev.checked) save.queue({ position: p, selected: prev.selected, marked: !prev.marked, seq });
  }, [nextSeq, save, currentPos, allAnswers]);

  const go = useCallback(
    (p: number) => {
      if (p < 1 || p > total) return;
      dispatch({ type: "go", position: p });
      setGridOpen(false);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    },
    [total],
  );

  const check = useCallback(async () => {
    const p = currentPos;
    const a = allAnswers[p];
    if (!a.selected || a.checked) return;
    setChecking(true);
    save.drop(p);
    try {
      const result = await api<CheckResult>(`/attempts/${attempt.id}/check/${p}`, {
        method: "POST",
        body: { selected: a.selected, seq: nextSeq() },
      });
      dispatch({ type: "checked", result });
    } catch (e) {
      setSubmitError(errorMessage(e));
    } finally {
      setChecking(false);
    }
  }, [attempt.id, nextSeq, save, currentPos, allAnswers]);

  const submit = useCallback(
    async (auto = false) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setSubmitError(null);
      await save.flush();
      try {
        const res = await api<{ next: "results" | "essays" }>(`/attempts/${attempt.id}/submit`, { method: "POST" });
        clearLocal(attempt.id);
        router.replace(res.next === "essays" ? `/attempt/${attempt.id}/essays` : `/results/${attempt.id}`);
        router.refresh();
      } catch (e) {
        submittedRef.current = false;
        setSubmitting(false);
        setSubmitError(errorMessage(e));
        if (auto) setTimeout(() => void submitRef.current(true), 3000); // keep trying when time is up
      }
    },
    [attempt.id, router, save],
  );

  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  // Keyboard shortcuts: A-D / 1-4 select, arrows navigate, M marks.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmOpen || gridOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = e.key.toUpperCase();
      const map: Record<string, Option> = { A: "A", B: "B", C: "C", D: "D", "1": "A", "2": "B", "3": "C", "4": "D" };
      if (map[k]) select(state.current, map[k]);
      else if (e.key === "ArrowRight") go(state.current + 1);
      else if (e.key === "ArrowLeft") go(state.current - 1);
      else if (k === "M") toggleMark();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen, go, gridOpen, select, state, toggleMark]);

  // Warn before leaving with unsaved answers.
  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (save.hasPending() && !submittedRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [save]);

  const gridItems: GridItem[] = useMemo(
    () =>
      questions.map((q) => {
        const a = state.answers[q.position];
        return {
          position: q.position,
          sectionId: q.section_id,
          marked: a.marked,
          state: a.checked ? (a.selected === a.correct ? "correct" : "incorrect") : a.selected ? "answered" : "unanswered",
        };
      }),
    [questions, state.answers],
  );

  const q = questions[state.current - 1];
  const answer = state.answers[state.current];
  const answeredCount = gridItems.filter((g) => g.state !== "unanswered").length;
  const markedCount = gridItems.filter((g) => g.marked).length;
  const progress = Math.round((answeredCount / total) * 100);

  const grid = (
    <QuestionGrid items={gridItems} sections={attempt.sections} current={state.current} onJump={go} />
  );

  return (
    <div className="min-h-dvh bg-paper pb-24 lg:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4">
          <LogoMark className="hidden h-7 w-7 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-forest-950">{attempt.title}</p>
            <p className="text-xs text-muted">
              <span className="tabular">{answeredCount}</span>/{total} answered
              {markedCount > 0 && <> · <span className="tabular">{markedCount}</span> marked</>}
            </p>
          </div>
          <SaveIndicator status={save.status} />
          {attempt.deadline_at && (
            <Timer deadline={attempt.deadline_at} offsetMs={offsetMs} onExpire={() => void submit(true)} compact />
          )}
          <button
            type="button"
            onClick={() => setGridOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-md border border-line-strong text-forest-900 lg:hidden"
            aria-label="Open question navigator"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={submitting} className="hidden sm:inline-flex">
            {isPractice ? "Finish" : "Submit"}
          </Button>
        </div>
        <div className="h-0.5 bg-sage-100">
          <div className="h-full bg-forest-700 transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {fatal && fatal !== "attempt_submitted" && fatal !== "attempt_expired" && (
        <div className="mx-auto max-w-[1400px] px-4 pt-4">
          <div className="flex items-center gap-2 rounded-md border border-[#f2cfcb] bg-danger-soft px-4 py-2.5 text-sm text-danger">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Your session has ended. Your answers are kept on this device. Please log in again to continue.
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 lg:grid-cols-[1fr_340px]">
        {/* Question */}
        <main className="min-w-0">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-8">
            <QuestionView
              q={q}
              answer={answer}
              total={total}
              sectionName={sectionName[q.section_id] ?? ""}
              subjectName={subjectName[q.subject_id] ?? ""}
              onSelect={select}
            />
            {isPractice && !answer.checked && (
              <div className="mt-5">
                <Button variant="secondary" size="sm" onClick={check} disabled={!answer.selected} loading={checking}>
                  <Lightbulb className="h-4 w-4" aria-hidden /> Check answer
                </Button>
              </div>
            )}
          </div>

          {/* Desktop nav */}
          <div className="mt-4 hidden items-center justify-between gap-3 lg:flex">
            <Button variant="secondary" onClick={() => go(state.current - 1)} disabled={state.current === 1}>
              <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
            </Button>
            <Button variant={answer.marked ? "gold" : "ghost"} onClick={toggleMark}>
              {answer.marked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {answer.marked ? "Marked for review" : "Mark for review"}
            </Button>
            {state.current < total ? (
              <Button onClick={() => go(state.current + 1)}>
                Next <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            ) : (
              <Button onClick={() => setConfirmOpen(true)}>{isPractice ? "Finish" : "Submit test"}</Button>
            )}
          </div>
          <p className="mt-3 hidden text-center text-xs text-muted lg:block">
            Shortcuts: <kbd className="font-sans font-semibold">A–D</kbd> select · <kbd className="font-semibold">← →</kbd>{" "}
            navigate · <kbd className="font-semibold">M</kbd> mark
          </p>
        </main>

        {/* Desktop navigator */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-xl border border-line bg-surface p-4 shadow-card">
            <p className="mb-3 text-sm font-bold text-forest-950">Question navigator</p>
            {grid}
            <Button className="mt-4 w-full" onClick={() => setConfirmOpen(true)} disabled={submitting}>
              {isPractice ? "Finish practice" : "Submit test"}
            </Button>
          </div>
        </aside>
      </div>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-3 py-2.5 lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <Button variant="secondary" size="lg" className="px-3" onClick={() => go(state.current - 1)} disabled={state.current === 1} aria-label="Previous question">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant={answer.marked ? "gold" : "secondary"} size="lg" className="px-3" onClick={toggleMark} aria-label="Mark for review">
            {answer.marked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
          </Button>
          {state.current < total ? (
            <Button size="lg" className="flex-1" onClick={() => go(state.current + 1)}>
              Next <ChevronRight className="h-5 w-5" aria-hidden />
            </Button>
          ) : (
            <Button size="lg" className="flex-1" onClick={() => setConfirmOpen(true)}>
              {isPractice ? "Finish" : "Submit"}
            </Button>
          )}
        </div>
      </nav>

      <Dialog open={gridOpen} onClose={() => setGridOpen(false)} title="Question navigator" sheet>
        {grid}
        <Button className="mt-4 w-full" onClick={() => { setGridOpen(false); setConfirmOpen(true); }}>
          {isPractice ? "Finish practice" : "Submit test"}
        </Button>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => !submitting && setConfirmOpen(false)} title={isPractice ? "Finish practice?" : "Submit your test?"}>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Answered" value={answeredCount} />
          <Stat label="Unanswered" value={total - answeredCount} tone={total - answeredCount > 0 ? "danger" : undefined} />
          <Stat label="Marked" value={markedCount} tone={markedCount ? "gold" : undefined} />
        </div>
        <p className="mt-4 text-sm text-ink-soft">
          {isPractice
            ? "You will see your score and the solutions for every question."
            : "Once submitted, you cannot change your answers. Unanswered questions score zero."}
          {attempt.category.exam === "USAT" && attempt.essay_status === "pending" && " The essay section starts right after."}
        </p>
        {submitError && <p className="mt-3 text-sm text-danger">{submitError}</p>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={submitting}>
            Keep working
          </Button>
          <Button onClick={() => void submit()} loading={submitting}>
            {isPractice ? "Finish & see results" : "Submit test"}
          </Button>
        </div>
      </Dialog>

      {submitting && !confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40">
          <div className="flex items-center gap-3 rounded-lg bg-surface px-5 py-4 shadow-raised">
            <Loader2 className="h-5 w-5 animate-spin text-forest-900" />
            <span className="font-semibold">Submitting your answers…</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "danger" | "gold" }) {
  return (
    <div className="rounded-md bg-paper px-2 py-2.5">
      <p className={cn("tabular text-xl font-extrabold", tone === "danger" ? "text-danger" : tone === "gold" ? "text-gold-700" : "text-forest-950")}>
        {value}
      </p>
      <p className="text-xs font-semibold text-muted">{label}</p>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const map = {
    pending: { icon: CloudUpload, text: "Saving…", cls: "text-muted" },
    saving: { icon: Loader2, text: "Saving…", cls: "text-muted" },
    saved: { icon: Check, text: "Saved", cls: "text-success" },
    offline: { icon: CloudOff, text: "Offline · kept on device", cls: "text-gold-700" },
    error: { icon: CloudOff, text: "Retrying…", cls: "text-gold-700" },
  }[status];
  const Icon = map.icon;
  return (
    <span className={cn("hidden items-center gap-1 text-xs font-semibold md:inline-flex", map.cls)} aria-live="polite">
      <Icon className={cn("h-3.5 w-3.5", status === "saving" && "animate-spin")} aria-hidden />
      {map.text}
    </span>
  );
}
