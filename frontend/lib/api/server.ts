import "server-only";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import type { Me } from "./types";

// Server Components call the backend directly (server-to-server, same region),
// forwarding the student's session cookie.
const API = (process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000").replace(/\/$/, "") + "/api/v1";
export const SESSION_COOKIE = "qadam_session";

export class ServerApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

interface Opts {
  /** Seconds to cache public data (shared). Omit for private, uncached data. */
  revalidate?: number;
  tags?: string[];
  method?: string;
  body?: unknown;
}

export async function serverApi<T>(path: string, opts: Opts = {}): Promise<T> {
  const isPublic = opts.revalidate !== undefined;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (!isPublic) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) headers.Cookie = `${SESSION_COOKIE}=${token}`;
  }
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    ...(isPublic
      ? { next: { revalidate: opts.revalidate, tags: opts.tags } }
      : { cache: "no-store" as const }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error ?? {};
    throw new ServerApiError(res.status, err.code ?? "http_error", err.message ?? "Request failed");
  }
  return data as T;
}

/** Fetch for pages: maps 401 -> login, 404 -> not-found. */
export async function pageApi<T>(path: string, opts: Opts = {}, next = "/dashboard"): Promise<T> {
  try {
    return await serverApi<T>(path, opts);
  } catch (e) {
    if (e instanceof ServerApiError) {
      if (e.status === 401) redirect(`/logout?next=${encodeURIComponent(next)}`);
      if (e.status === 404) notFound();
    }
    throw e;
  }
}

/** Current user, de-duplicated per request. Returns null when signed out. */
export const getMe = cache(async (): Promise<Me | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await serverApi<Me>("/me");
  } catch (e) {
    if (e instanceof ServerApiError && e.status === 401) return null;
    throw e;
  }
});

export async function requireUser(next = "/dashboard"): Promise<Me> {
  const me = await getMe();
  if (!me) redirect(`/logout?next=${encodeURIComponent(next)}`);
  return me;
}

export async function requireAdmin(): Promise<Me> {
  const me = await requireUser("/admin");
  if (me.role !== "admin") redirect("/dashboard");
  return me;
}
