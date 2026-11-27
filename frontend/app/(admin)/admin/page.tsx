import Link from "next/link";
import { FilePlus2, FileUp, ListChecks, PenLine, Timer } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, EmptyState, StatTile } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { pageApi } from "@/lib/api/server";

interface Stats {
  students: number;
  published: number;
  drafts: number;
  attempts: number;
  attempts_24h: number;
  essays_pending: number;
  mocks: number;
  bank: { exam: string; subject: string; count: number }[];
}

export default async function AdminHome() {
  const s = await pageApi<Stats>("/admin/stats", {}, "/admin");
  const quick = [
    { href: "/admin/import", icon: FileUp, title: "Import MCQs", body: "Upload a CSV or Excel file" },
    { href: "/admin/questions/new", icon: FilePlus2, title: "Add a question", body: "Write one MCQ manually" },
    { href: "/admin/questions?status=draft", icon: ListChecks, title: "Review drafts", body: `${s.drafts} waiting to publish` },
    { href: "/admin/essays", icon: PenLine, title: "Grade essays", body: `${s.essays_pending} submitted` },
    { href: "/admin/mocks", icon: Timer, title: "Mock tests", body: `${s.mocks} published` },
  ];
  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" action={<LinkButton href="/admin/import">Import MCQs</LinkButton>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Students" value={s.students} />
        <StatTile label="Published MCQs" value={s.published} tone="success" />
        <StatTile label="Draft MCQs" value={s.drafts} tone="gold" />
        <StatTile label="Attempts" value={s.attempts} />
        <StatTile label="Last 24h" value={s.attempts_24h} />
        <StatTile label="Essays to grade" value={s.essays_pending} tone={s.essays_pending ? "danger" : "neutral"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader title="Quick actions" />
          <ul className="divide-y divide-line">
            {quick.map(({ href, icon: Icon, title, body }) => (
              <li key={href}>
                <Link href={href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-paper">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-forest-50 text-forest-800">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold text-forest-950">{title}</span>
                    <span className="text-xs text-muted">{body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Published question bank" description="By exam and subject" />
          {s.bank.length === 0 ? (
            <EmptyState title="No published questions yet" description="Import MCQs, then publish them so students can practise." />
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {s.bank.map((b) => (
                  <tr key={`${b.exam}-${b.subject}`}>
                    <td className="px-5 py-2.5 font-semibold text-forest-900">{b.exam}</td>
                    <td className="px-5 py-2.5">{b.subject}</td>
                    <td className="tabular px-5 py-2.5 text-right font-bold">{b.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
