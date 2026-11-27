import {
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Layers,
  PenLine,
  ShieldCheck,
  Smartphone,
  Target,
} from "lucide-react";

import { LinkButton } from "@/components/ui/button";
import { HAT, USAT } from "@/lib/exam-data";

export const dynamic = "force-static";

const steps = [
  { n: "01", title: "Choose your test", body: "HAT or USAT. We only show what matters for your exam." },
  { n: "02", title: "Pick your category", body: "HAT-I to HAT-General, USAT-E to USAT-A, with the official weightage." },
  { n: "03", title: "Practise your way", body: "Topic, subject or section practice, or a full timed mock." },
  { n: "04", title: "Review & improve", body: "Section-wise analysis, correct answers and detailed solutions." },
];

const features = [
  { icon: Clock3, title: "Real exam timing", body: "Server-timed mocks: 120 minutes for HAT, 100 + 40 minutes for USAT." },
  { icon: Target, title: "Official weightage", body: "Every mock follows the exact section and subject distribution of your category." },
  { icon: PenLine, title: "USAT essays", body: "Choose from three argument and three narrative topics, with autosave and word count." },
  { icon: BarChart3, title: "Clear analytics", body: "Score, accuracy, and section- and subject-wise performance after every attempt." },
  { icon: BookOpenCheck, title: "Detailed solutions", body: "Review every question with the correct answer, explanation and worked solution." },
  { icon: Smartphone, title: "Built for mobile", body: "A fast, focused exam interface that works on any phone, even on slow networks." },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="steps-motif pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div className="container-page relative grid gap-12 py-16 md:grid-cols-[1.15fr_0.85fr] md:items-center md:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold-200 bg-gold-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-700">
              HAT &amp; USAT preparation
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              Your next step
              <br />
              <span className="text-forest-700">starts here.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              QADAM <span lang="ur" className="font-urdu text-gold-600">قدم</span> is a focused preparation platform for
              Pakistan&apos;s HAT and USAT. Practise by topic, take full-length timed mocks, and learn from detailed
              solutions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/register" size="lg">Create free account</LinkButton>
              <LinkButton href="/login" size="lg" variant="secondary">I already have an account</LinkButton>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
              {["11 test categories", "Official weightage", "Free to use"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Product preview (pure markup - no image download) */}
          <div className="relative hidden md:block" aria-hidden>
            <div className="rounded-xl border border-line bg-surface p-5 shadow-raised">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <p className="text-xs font-semibold text-muted">USAT-E · Full Mock</p>
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
                          ? "h-5 rounded-sm ring-2 ring-gold-500"
                          : i === 21
                            ? "h-5 rounded-sm bg-gold-500"
                            : "h-5 rounded-sm bg-sage-100"
                    }
                  />
                ))}
              </div>
            </div>
            <div className="absolute -bottom-6 -left-8 rounded-lg border border-line bg-surface px-4 py-3 shadow-raised">
              <p className="text-xs font-semibold text-muted">Accuracy</p>
              <p className="tabular text-xl font-extrabold text-success">86%</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container-page scroll-mt-20 py-16 md:py-20">
        <SectionHeading eyebrow="How it works" title="Four steps. No clutter." />
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="rounded-lg border border-line bg-surface p-5 shadow-card">
              <span className="tabular text-sm font-extrabold text-gold-600">{s.n}</span>
              <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* HAT */}
      <section id="hat" className="scroll-mt-20 border-y border-line bg-surface py-16 md:py-20">
        <div className="container-page">
          <SectionHeading eyebrow="HAT" title={HAT.name} sub={HAT.summary} />
          <div className="mt-8 overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-paper text-xs uppercase tracking-wide text-muted">
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
      <section id="usat" className="container-page scroll-mt-20 py-16 md:py-20">
        <SectionHeading eyebrow="USAT" title={USAT.name} sub={USAT.summary} />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {USAT.categories.map((c) => (
            <div key={c.code} className="rounded-lg border border-line bg-surface p-5 shadow-card">
              <p className="font-extrabold text-forest-900">{c.code}</p>
              <p className="mt-1 text-sm text-ink-soft">{c.subjects}</p>
              <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
                <span className="rounded-full bg-sage-100 px-2 py-0.5 font-semibold text-forest-800">Verbal 20</span>
                <span className="rounded-full bg-sage-100 px-2 py-0.5 font-semibold text-forest-800">Quantitative 25</span>
                <span className="rounded-full bg-gold-100 px-2 py-0.5 font-semibold text-gold-700">2 Essays</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-t border-line bg-forest-950 py-16 text-white md:py-20">
        <div className="container-page">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-500">Why QADAM</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold text-white sm:text-4xl">
            Everything you need to prepare. Nothing you don&apos;t.
          </h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-forest-950 p-6">
                <Icon className="h-5 w-5 text-gold-500" aria-hidden />
                <h3 className="mt-3 font-bold text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-sage-300">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <LinkButton href="/register" variant="gold" size="lg">Start preparing now</LinkButton>
            <span className="flex items-center gap-2 text-sm text-sage-300">
              <ShieldCheck className="h-4 w-4" aria-hidden /> Free · No card required
            </span>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-6 py-14 sm:grid-cols-3">
        {[
          { icon: Layers, k: "5-level structure", v: "Test → Category → Section → Subject → Topic" },
          { icon: FileText, k: "Admin-verified content", v: "Only verified, published questions reach students" },
          { icon: Clock3, k: "Autosave", v: "Your answers are kept even if the network drops" },
        ].map(({ icon: Icon, k, v }) => (
          <div key={k} className="flex gap-3">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-forest-700" aria-hidden />
            <div>
              <p className="font-bold text-forest-950">{k}</p>
              <p className="text-sm text-muted">{v}</p>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">{title}</h2>
      {sub && <p className="mt-2 text-ink-soft">{sub}</p>}
    </div>
  );
}
