import type { Metadata } from "next";
import { MessagesSquare } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { HUES } from "@/lib/palette";

export const metadata: Metadata = { title: "Discussion Forum" };

export default function Page() {
  return (
    <ComingSoon
      icon={<MessagesSquare className="h-7 w-7" aria-hidden />}
      hue={HUES.orange}
      title="Discussion Forum"
      description="Ask questions, share tips and get announcements from the QADAM team."
      features={[
        "Discussions by subject and by test",
        "Ask about any question and get help from other students",
        "Pinned announcements from the QADAM team",
        "Moderated by admins to keep it helpful and safe",
      ]}
      meanwhile={[
        { href: "/practice", label: "Practise by subject" },
        { href: "/quizzes", label: "Take a quick quiz" },
        { href: "/mistakes", label: "Revise your mistakes" },
      ]}
    />
  );
}
