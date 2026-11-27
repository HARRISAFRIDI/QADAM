import type { Metadata } from "next";

import { Logo } from "@/components/shared/logo";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { requireUser, serverApi } from "@/lib/api/server";
import type { Exam } from "@/lib/api/types";

export const metadata: Metadata = { title: "Choose your test" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ exam?: string }> }) {
  const [me, exams, sp] = await Promise.all([
    requireUser("/onboarding"),
    serverApi<Exam[]>("/exams", { revalidate: 60, tags: ["catalog"] }),
    searchParams,
  ]);
  const initialExam = (sp.exam ?? me.target_exam ?? "").toUpperCase();
  return (
    <div className="min-h-dvh bg-linear-to-br from-blue-50 via-white to-violet-50">
      <div className="mx-auto flex max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <Logo href="/onboarding" />
        <OnboardingWizard
          firstName={me.full_name.split(" ")[0]}
          exams={exams}
          initialExam={exams.some((e) => e.code === initialExam) ? initialExam : null}
          initialCategory={me.preferred_category}
          initialGoal={me.daily_goal}
        />
      </div>
    </div>
  );
}
