"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="text-2xl font-extrabold text-forest-950">Something went wrong</p>
        <p className="mt-2 text-ink-soft">Please try again. If the problem continues, check your internet connection.</p>
        <Button className="mt-6" onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
