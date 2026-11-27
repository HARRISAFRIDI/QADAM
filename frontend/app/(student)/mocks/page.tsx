import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { MockOptions } from "@/features/prepare/mock-options";
import { getTrack } from "@/lib/api/track";

export const metadata: Metadata = { title: "Mock Tests" };

export default async function MocksPage() {
  const { ov } = await getTrack("/mocks");
  return (
    <>
      <PageHeader
        eyebrow={`${ov.exam.code} · ${ov.category.code}`}
        title="Mock Tests"
        description={`Full-length papers with the official ${ov.category.code} sections, number of questions and timing.`}
      />
      <MockOptions ov={ov} heading={null} />
    </>
  );
}
