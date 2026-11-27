import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params = {},
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && q.set(k, v));
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const cls = "inline-flex h-9 items-center gap-1 rounded-md border border-line-strong bg-surface px-3 text-sm font-semibold";
  return (
    <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Pagination">
      <p className="tabular text-sm text-muted">
        Page {page} of {pages} · {total} total
      </p>
      <div className="flex gap-2">
        <Link href={href(page - 1)} aria-disabled={page <= 1} className={cn(cls, page <= 1 && "pointer-events-none opacity-40")}>
          <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
        </Link>
        <Link href={href(page + 1)} aria-disabled={page >= pages} className={cn(cls, page >= pages && "pointer-events-none opacity-40")}>
          Next <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </nav>
  );
}
