import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EssayEngine } from "@/features/essays/essay-engine";
import { ServerApiError, serverApi } from "@/lib/api/server";
import type { EssayState } from "@/lib/api/types";

export const metadata: Metadata = { title: "Essays", robots: { index: false } };

export default async function EssaysPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let state: EssayState;
  try {
    // Idempotent: the first call starts the 40-minute essay clock.
    state = await serverApi<EssayState>(`/attempts/${id}/essays/start`, { method: "POST" });
  } catch (e) {
    if (e instanceof ServerApiError) {
      if (e.status === 401) redirect(`/logout?next=/attempt/${id}/essays`);
      if (e.code === "mcq_not_submitted") redirect(`/attempt/${id}`);
      redirect(`/results/${id}`);
    }
    throw e;
  }
  if (state.status === "submitted" || state.status === "graded") redirect(`/results/${id}`);
  return <EssayEngine state={state} />;
}
