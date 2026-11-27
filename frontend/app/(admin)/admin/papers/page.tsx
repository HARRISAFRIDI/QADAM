import { PageHeader } from "@/components/shared/page-header";
import { Alert, Badge, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { DownloadLink, PaperUploadForm } from "@/features/admin/paper-upload";
import type { Taxonomy } from "@/features/admin/types";
import { pageApi } from "@/lib/api/server";

interface FileRef {
  id: string;
  name: string;
  size: number;
  status: string;
}
interface PaperRow {
  id: number;
  title: string;
  exam: string;
  category: string | null;
  subject: string | null;
  year: number | null;
  status: string;
  paper: FileRef | null;
  answer_sheet: FileRef | null;
  solution: FileRef | null;
}

export default async function PapersPage() {
  const [system, tax, papers] = await Promise.all([
    pageApi<{ storage_enabled: boolean }>("/admin/system", {}, "/admin/papers"),
    pageApi<Taxonomy>("/admin/taxonomy", {}, "/admin/papers"),
    pageApi<PaperRow[]>("/admin/papers", {}, "/admin/papers"),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Question papers & answer sheets"
        description="Upload a paper with its linked answer sheet and solution. Answer sheets and solutions are stored privately."
      />
      {!system.storage_enabled && (
        <Alert tone="info" className="mb-6">
          File storage is not configured yet. Add <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> to the
          backend environment, then run <code>python -m scripts.setup_storage</code>. MCQ import (CSV/Excel) works without it.
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Uploaded papers" />
          {papers.length === 0 ? (
            <EmptyState title="No papers uploaded" />
          ) : (
            <ul className="divide-y divide-line">
              {papers.map((p) => (
                <li key={p.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-forest-950">{p.title}</p>
                      <p className="text-xs text-muted">
                        {[p.exam, p.category, p.subject, p.year].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Badge tone={p.status === "published" ? "success" : "gold"}>{p.status}</Badge>
                  </div>
                  <div className="mt-2 grid gap-1 text-sm sm:grid-cols-3">
                    {(["paper", "answer_sheet", "solution"] as const).map((k) => (
                      <div key={k}>
                        <span className="block text-xs text-muted">{k.replace("_", " ")}</span>
                        {p[k] ? <DownloadLink fileId={p[k]!.id} name={p[k]!.name} /> : <span className="text-muted">-</span>}
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Upload a paper" />
          <div className="p-5">
            {system.storage_enabled ? (
              <PaperUploadForm taxonomy={tax} />
            ) : (
              <p className="text-sm text-muted">Configure storage to enable uploads.</p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
