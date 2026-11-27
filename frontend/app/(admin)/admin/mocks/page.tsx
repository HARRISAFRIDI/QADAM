import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { CreateMockForm } from "@/features/admin/forms";
import type { Taxonomy } from "@/features/admin/types";
import { pageApi } from "@/lib/api/server";
import { formatDate } from "@/lib/utils";

interface MockRow {
  id: number;
  category_code: string;
  title: string;
  status: string;
  duration_min: number;
  question_count: number;
  created_at: string;
}

export default async function MocksPage() {
  const [mocks, tax] = await Promise.all([
    pageApi<MockRow[]>("/admin/mock-tests", {}, "/admin/mocks"),
    pageApi<Taxonomy>("/admin/taxonomy", {}, "/admin/mocks"),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Tests"
        title="Fixed mock tests"
        description="Students can always take a random full mock. Fixed mocks are frozen papers you curate and publish."
      />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="All mock tests" />
          {mocks.length === 0 ? (
            <EmptyState title="No fixed mocks yet" description="Generate one from the question bank using the form." />
          ) : (
            <ul className="divide-y divide-line">
              {mocks.map((m) => (
                <li key={m.id}>
                  <Link href={`/admin/mocks/${m.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-paper">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-forest-950">{m.title}</p>
                      <p className="text-xs text-muted">
                        {m.category_code} · {m.question_count} MCQs · {m.duration_min} min · {formatDate(m.created_at)}
                      </p>
                    </div>
                    <Badge tone={m.status === "published" ? "success" : "gold"}>{m.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Generate a new mock" />
          <div className="p-5">
            <CreateMockForm categories={tax.categories.filter((c) => c.is_active).map((c) => ({ code: c.code, name: c.name }))} />
          </div>
        </Card>
      </div>
    </>
  );
}
