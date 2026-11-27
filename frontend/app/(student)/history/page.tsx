import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { pageApi } from "@/lib/api/server";
import type { HistoryItem, Page } from "@/lib/api/types";
import { MODE_LABEL, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Test history" };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const data = await pageApi<Page<HistoryItem>>(`/me/history?page=${page}&page_size=20`, {}, "/history");

  return (
    <>
      <PageHeader eyebrow="History" title="Your attempts" description="Every practice session and mock test you have taken." />
      <Card>
        {data.items.length === 0 ? (
          <EmptyState
            icon={<History className="h-5 w-5" />}
            title="No attempts yet"
            description="Your practice sessions and mock tests will appear here."
            action={<LinkButton href="/dashboard">Start preparing</LinkButton>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Attempt</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 text-right font-semibold">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((h) => {
                  const href =
                    h.status === "in_progress"
                      ? `/attempt/${h.id}`
                      : h.essay_status === "pending" || h.essay_status === "in_progress"
                        ? `/attempt/${h.id}/essays`
                        : `/results/${h.id}`;
                  return (
                    <tr key={h.id} className="hover:bg-paper">
                      <td className="px-5 py-3">
                        <Link href={href} className="font-semibold text-forest-950 hover:underline">
                          {h.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-ink-soft">{MODE_LABEL[h.mode]}</td>
                      <td className="px-5 py-3 text-muted">{formatDate(h.started_at)}</td>
                      <td className="tabular px-5 py-3 text-right">
                        {h.status === "in_progress" ? (
                          <Badge tone="gold">In progress</Badge>
                        ) : h.total_marks ? (
                          <span className="font-bold text-forest-900">
                            {h.score}/{h.total_marks}
                            <span className="ml-1.5 text-xs font-semibold text-muted">
                              {Math.round(((h.score ?? 0) / h.total_marks) * 100)}%
                            </span>
                          </span>
                        ) : (
                          <Badge tone="forest">Essays</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Pagination page={data.page} pageSize={data.page_size} total={data.total} basePath="/history" />
    </>
  );
}
