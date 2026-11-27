import type { Metadata } from "next";
import { CalendarCheck } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { HUES } from "@/lib/palette";

export const metadata: Metadata = { title: "Study Plans" };

export default function Page() {
  return (
    <ComingSoon
      icon={<CalendarCheck className="h-7 w-7" aria-hidden />}
      hue={HUES.blue}
      title="Study Plans"
      description="Day-by-day preparation plans for your test, built around your exam date and weak subjects."
      features={[
        "30-day and 14-day plans for your selected test",
        "A custom plan from your exam date and free hours",
        "Daily tasks: lessons, practice sets, quizzes and mocks",
        "Plans that adjust when a subject needs more work",
      ]}
      meanwhile={[
        { href: "/practice", label: "Practise by subject" },
        { href: "/quizzes", label: "Take a quick quiz" },
        { href: "/mistakes", label: "Revise your mistakes" },
      ]}
    />
  );
}
