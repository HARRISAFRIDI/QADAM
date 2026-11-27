// Browser-side API client. Calls are same-origin (/api/v1 is proxied by Next.js),
// so the httpOnly session cookie is sent automatically and no CORS preflight occurs.

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

type Json = Record<string, unknown> | unknown[];

export async function api<T>(
  path: string,
  init: Omit<RequestInit, "body"> & { body?: Json | FormData } = {},
): Promise<T> {
  const { body, headers, ...rest } = init;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      credentials: "same-origin",
      ...rest,
      headers: {
        Accept: "application/json",
        ...(body && !isForm ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network_error", "You appear to be offline. Please check your connection.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error ?? {};
    throw new ApiError(res.status, err.code ?? "http_error", err.message ?? "Request failed", err.details);
  }
  return data as T;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === "validation_error" && Array.isArray(e.details) && e.details.length) {
      const d = e.details[0] as { loc?: string[]; msg?: string };
      return `${(d.loc ?? []).join(".") || "Field"}: ${d.msg ?? "invalid"}`;
    }
    return e.message;
  }
  return "Something went wrong. Please try again.";
}
