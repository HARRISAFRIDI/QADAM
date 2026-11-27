import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { HUES } from "@/lib/palette";

export const metadata: Metadata = { title: "Learn" };

export default function Page() {
  return (
    <ComingSoon
      icon={<BookOpen className="h-7 w-7" aria-hidden />}
      hue={HUES.emerald}
      title="Learn"
      description="Lessons for every subject in your test, from basic concepts to exam strategies."
      features={[
        "Subjects, chapters, topics and concepts in one place",
        "Clear notes with worked examples and formulas",
        "Short strategies and shortcuts for the exam",
        "Learning paths that track what you have finished",
      ]}
      meanwhile={[
        { href: "/practice", label: "Practise by subject" },
        { href: "/quizzes", label: "Take a quick quiz" },
        { href: "/mistakes", label: "Revise your mistakes" },
      ]}
    />
  );
}
