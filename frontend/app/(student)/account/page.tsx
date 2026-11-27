import type { Metadata } from "next";
import { Award, Check, Crown, KeyRound, Lock, Repeat, Settings2, UserRound } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { GoalForm, TrackSwitcher } from "@/features/account/account-forms";
import { PasswordForm, ProfileForm } from "@/features/auth/profile-forms";
import { pageApi, requireUser, serverApi } from "@/lib/api/server";
import type { Exam, Overview } from "@/lib/api/types";
import { HUES, type Hue } from "@/lib/palette";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "My Account" };

export default async function AccountPage() {
  const [me, exams, ov] = await Promise.all([
    requireUser("/account"),
    serverApi<Exam[]>("/exams", { revalidate: 60, tags: ["catalog"] }),
    pageApi<Overview>("/me/overview"),
  ]);
  const earned = ov.achievements.filter((a) => a.earned).length;

  return (
    <>
      <PageHeader eyebrow="My Account" title={me.full_name} description={`${me.email} · member since ${formatDate(me.created_at)}`} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section id="track" icon={<Repeat className="h-5 w-5" aria-hidden />} hue={HUES.blue} title="Test track" sub={`Currently ${me.target_exam} · ${me.preferred_category}`}>
          <TrackSwitcher exams={exams} current={me.preferred_category} />
        </Section>

        <Section id="plan" icon={<Crown className="h-5 w-5" aria-hidden />} hue={HUES.orange} title="Plan" sub="Your subscription">
          <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-lg font-extrabold text-forest-950">Free plan</p>
              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">Active</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
              {["Unlimited practice and quizzes", "Full mock tests and essays", "Mistake Notebook and progress tracking"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden /> {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-4">
            <p className="flex items-center gap-2 font-bold text-forest-950">
              <Crown className="h-4 w-4 text-orange-600" aria-hidden /> Premium
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold uppercase text-orange-700">Coming soon</span>
            </p>
            <p className="mt-1 text-sm text-muted">Study plans, full lesson library and flashcards. Everything you use today stays free.</p>
          </div>
        </Section>

        <Section id="preferences" icon={<Settings2 className="h-5 w-5" aria-hidden />} hue={HUES.emerald} title="Preferences" sub="Your daily goal drives the dashboard rings and streak">
          <GoalForm current={me.daily_goal} />
        </Section>

        <Section id="achievements" icon={<Award className="h-5 w-5" aria-hidden />} hue={HUES.violet} title="Achievements" sub={`${earned} of ${ov.achievements.length} earned`}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ov.achievements.map((a) => (
              <li key={a.key} className={cn("flex items-center gap-3 rounded-xl border p-3", a.earned ? "border-amber-200 bg-amber-50" : "border-line")}>
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                    a.earned ? "bg-linear-to-br from-amber-400 to-orange-500 text-white" : "bg-sage-100 text-sage-500",
                  )}
                >
                  {a.earned ? <Award className="h-5 w-5" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-sm font-bold", a.earned ? "text-forest-950" : "text-ink-soft")}>{a.title}</span>
                  <span className="block text-xs text-muted">{a.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="profile" icon={<UserRound className="h-5 w-5" aria-hidden />} hue={HUES.sky} title="Personal details">
          <ProfileForm me={me} />
        </Section>

        <Section id="password" icon={<KeyRound className="h-5 w-5" aria-hidden />} hue={HUES.rose} title="Change password" sub="Other devices will be signed out">
          <PasswordForm />
        </Section>
      </div>
    </>
  );
}

function Section({
  id,
  icon,
  hue,
  title,
  sub,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  hue: Hue;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="relative scroll-mt-20 overflow-hidden rounded-3xl">
      <span className={cn("absolute inset-x-0 top-0 h-1", hue.line)} aria-hidden />
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", hue.tile)}>{icon}</span>
        <div className="min-w-0">
          <h2 className="text-base font-bold">{title}</h2>
          {sub && <p className="truncate text-sm text-muted">{sub}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}
