import "server-only";

import { redirect } from "next/navigation";

import { pageApi, requireUser } from "./server";
import type { CategoryOverview } from "./types";

/** The student's selected test track and its category overview. */
export async function getTrack(next: string) {
  const me = await requireUser(next);
  if (!me.preferred_category) redirect("/onboarding");
  const ov = await pageApi<CategoryOverview>(`/categories/${encodeURIComponent(me.preferred_category)}/overview`, {
    revalidate: 30,
    tags: ["catalog"],
  });
  return { me, ov };
}
