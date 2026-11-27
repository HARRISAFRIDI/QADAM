import type { Metadata } from "next";
import { Brain } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { HUES } from "@/lib/palette";

export const metadata: Metadata = { title: "Memorize" };

export default function Page() {
  return (
    <ComingSoon
      icon={<Brain className="h-7 w-7" aria-hidden />}
      hue={HUES.violet}
      title="Memorize"
      description="Flashcards and revision tools that bring back what you are about to forget."
      features={[
        "Vocabulary flashcards for the verbal section",
        "Formula sheets for maths, physics and chemistry",
        "Important facts for quick revision",
        "Spaced repetition: cards come back just in time",
      ]}
      meanwhile={[
        { href: "/practice", label: "Practise by subject" },
        { href: "/quizzes", label: "Take a quick quiz" },
        { href: "/mistakes", label: "Revise your mistakes" },
      ]}
    />
  );
}
