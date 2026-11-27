import { BarChart3, BookOpenCheck, CheckCircle2, Clock3, PenLine, Target } from "lucide-react";

import { LinkButton } from "@/components/ui/button";
import { HAT, USAT } from "@/lib/exam-data";

export const dynamic = "force-static";

// A real sequence, so numbering is meaningful here.
const steps = [
  { title: "Choose your test", body: "Pick HAT or USAT, then your category. You only see what is in your exam." },
  { title: "Practise or take a mock", body: "Practise one subject or section, or sit a full mock with the real timer." },
  { title: "Check your result", body: "See your score by section and subject, with the correct answer and solution for every question." },
];

const features = [
  { icon: Target, title: "Official weightage", body: "Every full mock follows the section and subject split of your category." },
  { icon: Clock3, title: "Real exam timing", body: "120 minutes for HAT. 100 minutes plus 40 for essays in USAT." },
  { icon: PenLine, title: "USAT essays", body: "Type your essays here, or write them on paper and give yourself a score." },
  { icon: BarChart3, title: "Clear results", body: "Score, accuracy and weak areas after every attempt." },
  { icon: BookOpenCheck, title: "Worked solutions", body: "Learn from an explanation for each question once you submit." },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-surface">
        <div className="container-page grid gap-12 py-14 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-20">
          <div>
            <p lang="ur" dir="rtl" className="urdu text-left text-2xl text-forest-700 sm:text-3xl">
              آپ کا اگلا قدم یہیں سے شروع ہوتا ہے
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] sm:text-5xl">
              Prepare for HAT and USAT with real, timed mock tests.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              QADAM gives Pakistani students full-length mocks with the official weightage, subject practice and a
              worked solution for every question. It is free.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/register" size="lg">Create free account</LinkButton>
              <LinkButton href="/login" size="lg" variant="secondary">Log in</LinkButton>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
              {["11 test categories", "Works on any phone", "Answers saved as you go"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Product preview (markup only, no image download) */}
          <div className="hidden md:block" aria-hidden>
            <div className="rounded-xl border border-line bg-surface p-5 shadow-raised">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <p className="text-xs font-semibold text-muted">USAT-E full mock</p>
                  <p className="text-sm font-bold text-forest-950">Question 18 of 75</p>
                </div>
                <span className="tabular rounded-md bg-forest-900 px-2.5 py-1 text-sm font-bold text-white">72:14</span>
              </div>
              <p className="mt-4 text-[15px] font-medium leading-relaxed text-ink">
                If 3x + 7 = 25, what is the value of 2x − 1?
              </p>
              <div className="mt-4 space-y-2">
                {["9", "11", "13", "15"].map((o, i) => (
                  <div
                    key={o}
                    className={
                      i === 1
                        ? "flex items-center gap-3 rounded-md border-2 border-forest-700 bg-forest-50 px-3 py-2.5"
                        : "flex items-center gap-3 rounded-md border border-line px-3 py-2.5"
                    }
                  >
                    <span
                      className={
                        i === 1
                          ? "grid h-6 w-6 place-items-center rounded-full bg-forest-900 text-xs font-bold text-white"
                          : "grid h-6 w-6 place-items-center rounded-full border border-line-strong text-xs font-bold text-muted"
                      }
                    >
                      {"ABCD"[i]}
                    </span>
                    <span className="text-sm">{o}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-10 gap-1.5">
                {Array.from({ length: 30 }).map((_, i) => (
                  <span
                    key={i}
                    className={
                      i < 17
                        ? "h-5 rounded-sm bg-forest-700"
                        : i === 17
                          ? "h-5 rounded-sm ring-2 ring-forest-900"
                          : i === 21
                            ? "h-5 rounded-sm bg-gold-500"
                            : "h-5 rounded-sm bg-sage-100"
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container-page scroll-mt-20 py-14 md:py-20">
        <h2 className="text-3xl font-extrabold">How it works</h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="border-t-2 border-forest-900 pt-4">
              <span className="tabular text-sm font-bold text-forest-700">Step {i + 1}</span>
              <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
              <p className="mt-1.5 leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* HAT */}
      <section id="hat" className="scroll-mt-20 border-y border-line bg-surface py-14 md:py-20">
        <div className="container-page">
          <h2 className="text-3xl font-extrabold">{HAT.name}</h2>
          <p className="mt-2 max-w-2xl text-ink-soft">{HAT.summary}</p>
          <div className="mt-8 overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-paper text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Disciplines</th>
                  <th className="px-4 py-3 text-center font-semibold">English</th>
                  <th className="px-4 py-3 text-center font-semibold">Analytical</th>
                  <th className="px-4 py-3 text-center font-semibold">Quantitative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {HAT.categories.map((c) => (
                  <tr key={c.code}>
                    <td className="px-4 py-3 font-bold text-forest-900">{c.code}</td>
                    <td className="px-4 py-3 text-ink-soft">{c.disciplines}</td>
                    {c.split.map((n, i) => (
                      <td key={i} className="tabular px-4 py-3 text-center font-semibold">{n}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* USAT */}
      <section id="usat" className="container-page scroll-mt-20 py-14 md:py-20">
        <h2 className="text-3xl font-extrabold">{USAT.name}</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">{USAT.summary}</p>
        <div className="mt-8 overflow-hidden rounded-lg border border-line bg-surface">
          <ul className="divide-y divide-line">
            {USAT.categories.map((c) => (
              <li key={c.code} className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-6">
                <span className="w-24 shrink-0 font-bold text-forest-900">{c.code}</span>
                <span className="flex-1 text-sm text-ink-soft">{c.subjects}</span>
                <span className="text-sm text-muted">Verbal 20, Quantitative 25, 2 essays</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-t border-line bg-surface py-14 md:py-20">
        <div className="container-page">
          <h2 className="text-3xl font-extrabold">What you get</h2>
          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-forest-700" aria-hidden />
                <div>
                  <h3 className="font-bold">{title}</h3>
                  <p className="mt-1 leading-relaxed text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="border-y border-gold-200 bg-gold-100">
        <div className="container-page flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <p lang="ur" dir="rtl" className="urdu text-left text-2xl text-forest-950 sm:text-3xl">
              محنت کا پھل میٹھا ہوتا ہے
            </p>
            <p className="mt-1 text-ink-soft">Hard work pays off. Start with one mock today.</p>
          </div>
          <LinkButton href="/register" size="lg">
            Create free account
          </LinkButton>
        </div>
      </section>
    </>
  );
}
