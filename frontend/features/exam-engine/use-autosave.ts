"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api/client";
import type { Option } from "@/lib/api/types";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "offline" | "error";

export interface AnswerPayload {
  position: number;
  selected: Option | null;
  marked: boolean;
  seq: number;
}

const DEBOUNCE_MS = 1200;
const MAX_WAIT_MS = 8000;

export const storageKey = (attemptId: string) => `qadam:attempt:${attemptId}`;

export function readLocal(attemptId: string): Record<number, AnswerPayload> {
  try {
    const raw = localStorage.getItem(storageKey(attemptId));
    return raw ? (JSON.parse(raw) as Record<number, AnswerPayload>) : {};
  } catch {
    return {};
  }
}

function writeLocal(attemptId: string, a: AnswerPayload) {
  try {
    const all = readLocal(attemptId);
    all[a.position] = a;
    localStorage.setItem(storageKey(attemptId), JSON.stringify(all));
  } catch {
    /* storage full / private mode - server copy still works */
  }
}

export function clearLocal(attemptId: string) {
  try {
    localStorage.removeItem(storageKey(attemptId));
  } catch {
    /* ignore */
  }
}

/**
 * Batches answer changes and saves them in the background.
 * - Local copy first (survives refresh / crash / offline).
 * - Debounced batch PUT; newest seq per question wins on the server.
 * - Retries with backoff; flushes on reconnect and when the tab is hidden.
 */
export function useAutosave(attemptId: string, onFatal: (code: string) => void) {
  const pending = useRef(new Map<number, AnswerPayload>());
  const inflight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstPendingAt = useRef<number | null>(null);
  const backoff = useRef(0);
  const fatalRef = useRef(onFatal);
  const flushRef = useRef<(keepalive?: boolean) => Promise<boolean>>(async () => true);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const schedule = useCallback((delay = DEBOUNCE_MS) => {
    if (timer.current) clearTimeout(timer.current);
    const waited = firstPendingAt.current ? Date.now() - firstPendingAt.current : 0;
    const d = Math.max(0, Math.min(delay, MAX_WAIT_MS - waited));
    timer.current = setTimeout(() => void flushRef.current(), d);
  }, []);

  useEffect(() => {
    fatalRef.current = onFatal;
  }, [onFatal]);

  const flush = useCallback(
    async (keepalive = false): Promise<boolean> => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (pending.current.size === 0) return true;
      if (inflight.current && !keepalive) return false;

      const batch = Array.from(pending.current.values());
      pending.current.clear();
      firstPendingAt.current = null;
      inflight.current = true;
      setStatus("saving");
      try {
        const res = await fetch(`/api/v1/attempts/${attemptId}/answers`, {
          method: "PUT",
          credentials: "same-origin",
          keepalive,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: batch }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new ApiError(res.status, data?.error?.code ?? "http_error", data?.error?.message ?? "Save failed");
        }
        backoff.current = 0;
        inflight.current = false;
        if (pending.current.size === 0) setStatus("saved");
        else schedule(400);
        return true;
      } catch (e) {
        inflight.current = false;
        // Put the batch back unless a newer change for the same question exists.
        for (const a of batch) {
          const cur = pending.current.get(a.position);
          if (!cur || cur.seq < a.seq) pending.current.set(a.position, a);
        }
        if (e instanceof ApiError && (e.status === 409 || e.status === 404 || e.status === 401)) {
          setStatus("error");
          fatalRef.current(e.code);
          return false;
        }
        const offline = typeof navigator !== "undefined" && !navigator.onLine;
        setStatus(offline ? "offline" : "error");
        backoff.current = Math.min(30000, backoff.current ? backoff.current * 2 : 2000);
        schedule(backoff.current);
        return false;
      }
    },
    [attemptId, schedule],
  );

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const queue = useCallback(
    (a: AnswerPayload) => {
      pending.current.set(a.position, a);
      writeLocal(attemptId, a);
      if (firstPendingAt.current === null) firstPendingAt.current = Date.now();
      setStatus((s) => (s === "offline" ? s : "pending"));
      schedule();
    },
    [attemptId, schedule],
  );

  const drop = useCallback((position: number) => {
    pending.current.delete(position);
  }, []);

  useEffect(() => {
    const online = () => void flush();
    const hidden = () => {
      if (document.visibilityState === "hidden") void flush(true);
    };
    const pagehide = () => void flush(true);
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", pagehide);
    return () => {
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", pagehide);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flush]);

  const hasPending = useCallback(() => pending.current.size > 0 || inflight.current, []);

  return useMemo(() => ({ queue, flush, drop, status, hasPending }), [queue, flush, drop, status, hasPending]);
}
