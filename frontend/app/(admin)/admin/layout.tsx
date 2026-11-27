import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AppShell, SIDEBAR_COOKIE } from "@/components/shared/app-shell";
import { requireAdmin } from "@/lib/api/server";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | QADAM Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [me, jar] = await Promise.all([requireAdmin(), cookies()]);
  return (
    <AppShell me={me} admin initialCollapsed={jar.get(SIDEBAR_COOKIE)?.value === "collapsed"}>
      {children}
    </AppShell>
  );
}
