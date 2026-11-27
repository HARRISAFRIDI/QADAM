"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Brain, CheckCircle2, RotateCcw } from "lucide-react";

import { Button, LinkButton, Spinner } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { api, errorMessage } from "@/lib/api/client";
import type { Grade, QueueCard } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const GRADES: { g: Grade; label: string; key: string; cls: string }[] = [
  { g: "again", label: "Again", key: "1", cls: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" },
  { g: "hard", label: "Hard", key: "2", cls: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" },
  { g: "good", label: "Good", key: "3", cls: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
  { g: "easy", label: "Easy", key: "4", cls: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" },
];

type State = { cards: QueueCard[]; index: number; flipped: boolean; requeued: Set<number> };

export function Reviewer({ deckId }: { deckId: number | null }) {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tally, setTally] = useState<Record<Grade, number>>({ again: 0, hard: 0, good: 0, easy: 0 });

  const load = useCallback(async () => {
    setError(null);
    setState(null);
    try {
      const q = await api<{ cards: QueueCard[] }>(`/memorize/queue?limit=20${deckId ? `&deck_id=${deckId}` : ""}`);
      setState({ cards: q.cards, index: 0, flipped: false, requeued: new Set() });
      setTally({ again: 0, hard: 0, good: 0, easy: 0 });
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [deckId]);

  useEffect(() => {
    // Fetch once on mount (client-only data).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const card = state && state.index < state.cards.length ? state.cards[state.index] : null;

  const grade = useCallback(
    async (g: Grade) => {
      if (!state || !card || busy) return;
      setBusy(true);
      try {
        await api(`/memorize/cards/${card.id}/review`, { method: "POST", body: { grade: g } });
        setTally((t) => ({ ...t, [g]: t[g] + 1 }));
        setState((s) => {
          if (!s) return s;
          const cards = [...s.cards];
          const requeued = new Set(s.requeued);
          // "Again": show it once more at the end of this session.
          if (g === "again" && !requeued.has(card.id)) {
            requeued.add(card.id);
            cards.push({ ...card, status: "learning" });
          }
          return { cards, index: s.index + 1, flipped: false, requeued };
        });
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [state, card, busy],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!card || (e.target as HTMLElement)?.closest("input, textarea")) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!state?.flipped) setState((s) => (s ? { ...s, flipped: true } : s));
        return;
      }
      const hit = GRADES.find((x) => x.key === e.key);
      if (hit && state?.flipped) void grade(hit.g);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, state?.flipped, grade]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Alert>{error}</Alert>
        <Button variant="secondary" onClick={load}>
          Try again
        </Button>
      </div>
    );
  }
  if (!state) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const total = state.cards.length;
  if (!card) {
    const reviewed = Object.values(tally).reduce((a, b) => a + b, 0);
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-line bg-surface p-8 text-center shadow-raised">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white">
          {reviewed ? <CheckCircle2 className="h-8 w-8" aria-hidden /> : <Brain className="h-8 w-8" aria-hidden />}
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">{reviewed ? "Session complete" : "Nothing to review"}</h1>
        <p className="mt-2 text-ink-soft">
          {reviewed ? `You reviewed ${reviewed} card${reviewed === 1 ? "" : "s"}.` : "No cards are due right now. Come back tomorrow."}
        </p>
        {reviewed > 0 && (
          <div className="mt-5 grid grid-cols-4 gap-2">
            {GRADES.map((x) => (
              <div key={x.g} className={cn("rounded-xl border px-2 py-2", x.cls)}>
                <p className="tabular text-xl font-extrabold">{tally[x.g]}</p>
                <p className="text-xs font-semibold">{x.label}</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={load}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Review more
          </Button>
          <LinkButton href="/memorize" variant="secondary">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to decks
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-semibold text-ink-soft">{card.deck}</span>
        <span className="tabular text-muted">
          {state.index + 1} / {total}
        </span>
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-sage-100">
        <div className="h-full rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-300" style={{ width: `${(state.index * 100) / total}%` }} />
      </div>

      <button
        type="button"
        onClick={() => setState((s) => (s ? { ...s, flipped: true } : s))}
        disabled={state.flipped}
        className="relative flex min-h-[300px] w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-line bg-surface p-8 text-center shadow-raised disabled:cursor-default"
        aria-label={state.flipped ? "Answer shown" : "Show answer"}
      >
        <span className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-violet-500 via-purple-500 to-fuchsia-500" aria-hidden />
        <span
          className={cn(
            "absolute right-4 top-4 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize",
            card.status === "new" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700",
          )}
        >
          {card.status}
        </span>
        <p className="text-2xl font-extrabold leading-snug text-forest-950 sm:text-3xl">{card.front}</p>
        {state.flipped ? (
          <div className="mt-6 w-full border-t border-dashed border-line pt-6">
            <p className="text-lg font-semibold text-violet-800">{card.back}</p>
            {card.example && <p className="mt-3 text-sm italic text-muted">{card.example}</p>}
          </div>
        ) : (
          <p className="mt-6 text-sm font-semibold text-muted">Tap or press Space to show the answer</p>
        )}
      </button>

      {state.flipped && (
        <div className="mt-5">
          <p className="mb-2 text-center text-sm text-muted">How well did you remember it?</p>
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map((x) => (
              <button
                key={x.g}
                type="button"
                disabled={busy}
                onClick={() => grade(x.g)}
                className={cn("rounded-2xl border px-2 py-3 text-center transition-colors disabled:opacity-60", x.cls)}
              >
                <span className="block text-sm font-extrabold">{x.label}</span>
                <span className="tabular block text-xs font-semibold opacity-80">{card.preview[x.g]}</span>
                <span className="mt-0.5 hidden text-[10px] opacity-60 sm:block">key {x.key}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="mt-6 text-center text-xs text-muted">
        <Link href="/memorize" className="hover:underline">
          End session
        </Link>
      </p>
    </div>
  );
}
