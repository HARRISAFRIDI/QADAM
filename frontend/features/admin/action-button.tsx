"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api/client";

/** Small client island: runs one admin API call, then refreshes server data. */
export function ActionButton({
  path,
  method = "POST",
  body,
  children,
  variant = "secondary",
  size = "sm",
  confirmText,
  redirectTo,
  onDoneMessage,
}: {
  path: string;
  method?: "POST" | "PATCH" | "DELETE" | "PUT";
  body?: Record<string, unknown>;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  confirmText?: string;
  redirectTo?: string;
  onDoneMessage?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await api<Record<string, unknown>>(path, { method, body });
      if (onDoneMessage) setMsg(onDoneMessage.replace("{updated}", String(res?.updated ?? "")));
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button type="button" variant={variant} size={size} loading={loading} onClick={run}>
        {children}
      </Button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </span>
  );
}
