import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ExamEngine } from "@/features/exam-engine/exam-engine";
import { pageApi } from "@/lib/api/server";
import type { Attempt } from "@/lib/api/types";

export const metadata: Metadata = { title: "Test in progress", robots: { index: false } };

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // One request loads the entire paper; navigation never hits the network again.
  const attempt = await pageApi<Attempt>(`/attempts/${id}`, {}, `/attempt/${id}`);
  if (attempt.mode === "essay") redirect(`/attempt/${id}/essays`);
  if (attempt.status === "submitted") {
    redirect(attempt.essay_status === "pending" || attempt.essay_status === "in_progress" ? `/attempt/${id}/essays` : `/results/${id}`);
  }
  return <ExamEngine attempt={attempt} />;
}
