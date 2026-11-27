import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="hidden border-r border-forest-100 bg-forest-50 p-10 text-forest-950 lg:flex lg:flex-col lg:justify-between">
        <Logo />
        <div>
          <p lang="ur" dir="rtl" className="font-urdu text-6xl leading-[1.6] text-forest-700">
            قدم
          </p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight text-forest-950">Your next step starts here.</h2>
          <p className="mt-4 max-w-md text-ink-soft">
            Official HAT and USAT weightage, timed mocks, essays and detailed solutions in one calm, focused place.
          </p>
        </div>
        <div className="flex items-end gap-2" aria-hidden>
          <span className="h-10 w-10 rounded-md bg-forest-100" />
          <span className="h-20 w-10 rounded-md bg-sage-300" />
          <span className="h-32 w-10 rounded-md bg-forest-700" />
        </div>
      </aside>
      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
