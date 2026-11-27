"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api/client";

export function StartButton({
  endpoint,
  body,
  children,
  variant,
  size,
  className,
  disabled,
  essays = false,
  confirmText,
}: {
  endpoint: "/practice" | "/attempts" | "/essay-practice";
  body: Record<string, unknown>;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  essays?: boolean;
  confirmText?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (confirmText && !window.confirm(confirmText)) return;
    setLoading(true);
    setError(null);
    try {
      const { id } = await api<{ id: string; resumed: boolean }>(endpoint, { method: "POST", body });
      router.push(essays ? `/attempt/${id}/essays` : `/attempt/${id}`);
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button variant={variant} size={size} onClick={start} loading={loading} disabled={disabled} className="w-full sm:w-auto">
        {children}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
