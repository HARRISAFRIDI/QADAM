import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ActionButton } from "@/features/admin/action-button";
import { getMe, pageApi } from "@/lib/api/server";
import type { Page } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

interface Student {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  attempts: number;
}

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams({ page: sp.page ?? "1", page_size: "25" });
  if (sp.q) qs.set("q", sp.q);
  const [data, me] = await Promise.all([pageApi<Page<Student>>(`/admin/students?${qs}`, {}, "/admin/students"), getMe()]);

  return (
    <>
      <PageHeader eyebrow="Users" title="Students" />
      <form className="mb-4 flex gap-2">
        <Input name="q" defaultValue={sp.q ?? ""} placeholder="Search name or email…" aria-label="Search students" />
        <button type="submit" className={buttonClass("primary", "md")}>Search</button>
      </form>
      <Card>
        {data.items.length === 0 ? (
          <EmptyState title="No students found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 text-right font-semibold">Attempts</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-forest-950">{s.full_name}</p>
                      {s.role === "admin" && <Badge tone="gold">admin</Badge>}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {s.email}
                      <span className="block text-xs text-muted">{[s.phone, s.city].filter(Boolean).join(" · ")}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{formatDate(s.created_at)}</td>
                    <td className="tabular px-4 py-3 text-right font-semibold">{s.attempts}</td>
                    <td className="px-4 py-3">
                      {s.id === me?.id ? (
                        <span className="text-xs text-muted">You</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          <ActionButton
                            path={`/admin/students/${s.id}`}
                            method="PATCH"
                            body={{ is_active: !s.is_active }}
                            variant={s.is_active ? "ghost" : "primary"}
                            confirmText={s.is_active ? `Disable ${s.full_name}'s account?` : undefined}
                          >
                            {s.is_active ? "Disable" : "Enable"}
                          </ActionButton>
                          <ActionButton
                            path={`/admin/students/${s.id}`}
                            method="PATCH"
                            body={{ role: s.role === "admin" ? "student" : "admin" }}
                            variant="ghost"
                            confirmText={
                              s.role === "admin"
                                ? `Remove admin access from ${s.full_name}?`
                                : `Make ${s.full_name} an admin? They will be able to manage all questions, tests and students.`
                            }
                          >
                            {s.role === "admin" ? "Remove admin" : "Make admin"}
                          </ActionButton>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Pagination page={data.page} pageSize={data.page_size} total={data.total} basePath="/admin/students" params={{ q: sp.q }} />
    </>
  );
}
