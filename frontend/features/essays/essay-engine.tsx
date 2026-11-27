"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CloudOff, FileCheck2, Loader2, PenLine } from "lucide-react";

import { LogoMark } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Timer } from "@/features/exam-engine/timer";
import { api, errorMessage } from "@/lib/api/client";
import type { EssayState } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type EssayType = "argument" | "narrative";
const META: Record<EssayType, { title: string; marks: number; hint: string }> = {
  argument: { title: "Argument-based essay", marks: 15, hint: "Take a clear position and support it with reasons and examples." },
  narrative: { title: "Narrative-based essay", marks: 10, hint: "Tell a clear story with a beginning, middle and end." },
};

interface Draft {
  topicId: number | null;
  content: string;
  seq: number;
}

/** Self-score choices for students who wrote their essays on paper. null = random 70-90%. */
const SELF_SCORES: { label: string; percent: number | null }[] = [
  { label: "75%", percent: 75 },
  { label: "85%", percent: 85 },
  { label: "Random (70–90%)", percent: null },
];

const words = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
const localKey = (id: string) => `qadam:essays:${id}`;

export function EssayEngine({ state }: { state: EssayState }) {
  const router = useRouter();
  const readOnly = state.status !== "in_progress";
  const [offsetMs] = useState(() => new Date(state.server_now).getTime() - Date.now());
  const [tab, setTab] = useState<EssayType>("argument");
  const [drafts, setDrafts] = useState<Record<EssayType, Draft>>(() => {
    const init = {} as Record<EssayType, Draft>;
    for (const e of state.essays) init[e.essay_type] = { topicId: e.topic_id, content: e.content, seq: e.seq };
    return init;
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selfPick, setSelfPick] = useState<(typeof SELF_SCORES)[number] | null>(null);
  const dirty = useRef<Set<EssayType>>(new Set());
  const draftsRef = useRef(drafts);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(false);
  const flushRef = useRef<() => Promise<boolean>>(async () => true);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  // Restore newer local drafts (after mount, to keep hydration deterministic).
  useEffect(() => {
    if (readOnly) return;
    try {
      const raw = localStorage.getItem(localKey(state.attempt_id));
      if (!raw) return;
      const local = JSON.parse(raw) as Record<EssayType, Draft>;
      const merged = { ...draftsRef.current };
      let changed = false;
      (Object.keys(local) as EssayType[]).forEach((k) => {
        if (merged[k] && local[k].seq > merged[k].seq) {
          merged[k] = local[k];
          dirty.current.add(k);
          changed = true;
        }
      });
      if (changed) setDrafts(merged);
    } catch {
      /* ignore */
    }
  }, [readOnly, state.attempt_id]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    const types = Array.from(dirty.current);
    if (!types.length) return true;
    dirty.current.clear();
    setSaveState("saving");
    try {
      await Promise.all(
        types.map((t) => {
          const d = draftsRef.current[t];
          return api(`/attempts/${state.attempt_id}/essays/${t}`, {
            method: "PUT",
            body: { topic_id: d.topicId, content: d.content, seq: d.seq },
          });
        }),
      );
      setSaveState("saved");
      return true;
    } catch (e) {
      types.forEach((t) => dirty.current.add(t));
      setSaveState("error");
      setError(errorMessage(e));
      timer.current = setTimeout(() => void flushRef.current(), 4000);
      return false;
    }
  }, [state.attempt_id]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const update = (t: EssayType, patch: Partial<Draft>) => {
    setDrafts((prev) => {
      const next = { ...prev, [t]: { ...prev[t], ...patch, seq: Math.max(prev[t].seq + 1, Date.now()) } };
      try {
        localStorage.setItem(localKey(state.attempt_id), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    dirty.current.add(t);
    setSaveState("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushRef.current(), 2000);
  };

  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, [flush]);

  const submit = useCallback(async () => {
    if (done.current) return;
    done.current = true;
    setSubmitting(true);
    await flush();
    try {
      await api(`/attempts/${state.attempt_id}/essays/submit`, { method: "POST" });
      try {
        localStorage.removeItem(localKey(state.attempt_id));
      } catch {
        /* ignore */
      }
      router.replace(`/results/${state.attempt_id}`);
      router.refresh();
    } catch (e) {
      done.current = false;
      setSubmitting(false);
      setError(errorMessage(e));
    }
  }, [flush, router, state.attempt_id]);

  const selfScore = useCallback(async () => {
    if (!selfPick || done.current) return;
    done.current = true;
    setSubmitting(true);
    try {
      await api(`/attempts/${state.attempt_id}/essays/self-score`, {
        method: "POST",
        body: { percent: selfPick.percent },
      });
      try {
        localStorage.removeItem(localKey(state.attempt_id));
      } catch {
        /* ignore */
      }
      router.replace(`/results/${state.attempt_id}`);
      router.refresh();
    } catch (e) {
      done.current = false;
      setSubmitting(false);
      setSelfPick(null);
      setError(errorMessage(e));
    }
  }, [router, selfPick, state.attempt_id]);

  const ready = (t: EssayType) => drafts[t]?.topicId && words(drafts[t].content) > 0;

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <LogoMark className="hidden h-7 w-7 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-forest-950">{state.title}</p>
            <p className="text-xs text-muted">Essay section · 25 marks</p>
          </div>
          {!readOnly && (
            <span className="hidden items-center gap-1 text-xs font-semibold text-muted sm:inline-flex" aria-live="polite">
              {saveState === "saving" && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>}
              {saveState === "saved" && <><Check className="h-3.5 w-3.5 text-success" /> <span className="text-success">Saved</span></>}
              {saveState === "error" && <><CloudOff className="h-3.5 w-3.5 text-gold-700" /> <span className="text-gold-700">Retrying…</span></>}
            </span>
          )}
          {state.deadline_at && !readOnly && (
            <Timer deadline={state.deadline_at} offsetMs={offsetMs} onExpire={() => void submit()} compact />
          )}
          {!readOnly && (
            <Button size="sm" onClick={() => setConfirm(true)}>
              Submit essays
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {readOnly && (
          <p className="mb-4 rounded-md border border-forest-100 bg-forest-50 px-4 py-2.5 text-sm text-forest-800">
            Essays submitted. They will be reviewed and graded by our team.
          </p>
        )}
        {error && <p className="mb-4 rounded-md bg-danger-soft px-4 py-2.5 text-sm text-danger">{error}</p>}

        {!readOnly && (
          <section className="mb-5 flex flex-col gap-3 rounded-lg border border-line bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-forest-700" aria-hidden />
              <div>
                <p className="font-bold text-forest-950">Wrote your essays on paper?</p>
                <p className="text-sm text-muted">
                  The real test is on paper. Skip typing and give yourself a score out of 25.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {SELF_SCORES.map((o) => (
                <Button key={o.label} variant="secondary" size="sm" onClick={() => setSelfPick(o)}>
                  {o.label}
                </Button>
              ))}
            </div>
          </section>
        )}

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg border border-line bg-surface p-1" role="tablist">
          {(["argument", "narrative"] as EssayType[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold transition-colors",
                tab === t ? "bg-forest-900 text-white" : "text-ink-soft hover:bg-forest-50",
              )}
            >
              {ready(t) && <Check className="h-4 w-4" aria-hidden />}
              <span className="sm:hidden">{t === "argument" ? "Argument" : "Narrative"}</span>
              <span className="hidden sm:inline">{META[t].title}</span>
              <span className={cn("text-xs", tab === t ? "text-gold-200" : "text-muted")}>{META[t].marks} marks</span>
            </button>
          ))}
        </div>

        {(["argument", "narrative"] as EssayType[]).map((t) => {
          const d = drafts[t];
          if (!d || tab !== t) return null;
          return (
            <section key={t} className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6">
              <p className="text-sm font-semibold text-forest-700">Step 1: choose one topic</p>
              <div className="mt-3 grid gap-2">
                {state.options[t].map((opt, i) => (
                  <label
                    key={opt.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
                      d.topicId === opt.id ? "border-forest-700 bg-forest-50 ring-1 ring-forest-700" : "border-line-strong hover:border-forest-700",
                      readOnly && "cursor-default",
                    )}
                  >
                    <input
                      type="radio"
                      name={`topic-${t}`}
                      className="mt-1 h-4 w-4 accent-[#01411c]"
                      checked={d.topicId === opt.id}
                      disabled={readOnly}
                      onChange={() => update(t, { topicId: opt.id })}
                    />
                    <span className="text-[15px] leading-relaxed">
                      <span className="mr-1 font-bold text-forest-900">Topic {i + 1}.</span>
                      {opt.prompt}
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm font-semibold text-forest-700">Step 2: write your essay</p>
                <span className="tabular text-xs font-semibold text-muted">{words(d.content)} words</span>
              </div>
              <p className="mt-1 text-sm text-muted">{META[t].hint}</p>
              <textarea
                value={d.content}
                readOnly={readOnly}
                disabled={!d.topicId && !readOnly}
                onChange={(e) => update(t, { content: e.target.value })}
                placeholder={d.topicId ? "Start writing here…" : "Choose a topic above to start writing."}
                spellCheck
                className="mt-3 min-h-[45dvh] w-full resize-y rounded-lg border border-line-strong bg-surface p-4 text-[16px] leading-[1.8] text-ink focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-100 disabled:bg-paper"
              />
              {t === "argument" && !readOnly && (
                <div className="mt-4 flex justify-end">
                  <Button variant="secondary" size="sm" onClick={() => setTab("narrative")}>
                    <PenLine className="h-4 w-4" aria-hidden /> Next: narrative essay
                  </Button>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <Dialog open={confirm} onClose={() => !submitting && setConfirm(false)} title="Submit both essays?">
        <ul className="space-y-2 text-sm">
          {(["argument", "narrative"] as EssayType[]).map((t) => (
            <li key={t} className="flex items-center justify-between rounded-md bg-paper px-3 py-2">
              <span className="font-semibold">{META[t].title}</span>
              <span className={ready(t) ? "text-success" : "text-danger"}>
                {ready(t) ? `${words(drafts[t].content)} words` : "Not written"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">You cannot edit your essays after submitting.</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setConfirm(false)} disabled={submitting}>
            Keep writing
          </Button>
          <Button onClick={() => void submit()} loading={submitting}>
            Submit essays
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={selfPick !== null}
        onClose={() => !submitting && setSelfPick(null)}
        title="Use a self-assessed essay score?"
      >
        <p className="text-sm text-ink-soft">
          {selfPick?.percent
            ? `Both essays will be marked at ${selfPick.percent}% of their marks (about ${Math.round(25 * selfPick.percent / 100)} out of 25).`
            : "Both essays will be marked at a random score between 70% and 90% of their marks."}{" "}
          Anything typed here is not saved, and you cannot change the score afterwards.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setSelfPick(null)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void selfScore()} loading={submitting}>
            Submit with {selfPick?.label ?? ""}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
