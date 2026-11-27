import type { Metadata } from "next";

import { AppHeader } from "@/components/shared/app-header";
import { requireAdmin } from "@/lib/api/server";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | QADAM Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader me={me} admin />
      <main className="container-page flex-1 py-6 md:py-8">{children}</main>
    </div>
  );
}
