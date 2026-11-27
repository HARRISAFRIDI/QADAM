import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell, SIDEBAR_COOKIE } from "@/components/shared/app-shell";
import { requireUser } from "@/lib/api/server";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const [me, jar] = await Promise.all([requireUser(), cookies()]);
  // Everything is personalised to the student's test: choose it first.
  if (!me.preferred_category) redirect("/onboarding");
  return (
    <AppShell me={me} initialCollapsed={jar.get(SIDEBAR_COOKIE)?.value === "collapsed"}>
      {children}
    </AppShell>
  );
}
