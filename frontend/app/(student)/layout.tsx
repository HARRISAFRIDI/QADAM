import { AppHeader } from "@/components/shared/app-header";
import { requireUser } from "@/lib/api/server";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader me={me} />
      <main className="container-page flex-1 py-6 md:py-10">{children}</main>
    </div>
  );
}
