import { LinkButton } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="text-center">
        <Logo className="justify-center" />
        <p className="mt-8 text-6xl font-extrabold text-forest-900">404</p>
        <p className="mt-2 text-ink-soft">This page does not exist or was moved.</p>
        <LinkButton href="/dashboard" className="mt-6">Go to dashboard</LinkButton>
      </div>
    </div>
  );
}
