"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";

import { Spinner, buttonClass } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type Busy = "status" | "delete" | null;

/** Edit / publish-unpublish / delete for one question (list rows and the edit page). */
export function QuestionActions({
  id,
  status,
  showEdit = true,
  afterDelete,
}: {
  id: number;
  status: string;
  showEdit?: boolean;
  afterDelete?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const published = status === "published";

  async function toggle() {
    setBusy("status");
    setMsg(null);
    try {
      await api(`/admin/questions/${id}`, { method: "PATCH", body: { status: published ? "draft" : "published" } });
      router.refresh();
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete question #${id}? This cannot be undone.`)) return;
    setBusy("delete");
    setMsg(null);
    try {
      const res = await api<{ deleted: boolean; archived: boolean }>(`/admin/questions/${id}`, { method: "DELETE" });
      if (res.archived) {
        window.alert("Students have already used this question, so it was archived instead. It is now hidden everywhere.");
      }
      if (afterDelete) router.push(afterDelete);
      router.refresh();
    } catch (e) {
      setMsg(errorMessage(e));
      setBusy(null);
    }
  }

  const icon = "h-3.5 w-3.5";
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="inline-flex items-center gap-1.5">
        {showEdit && (
          <Link href={`/admin/questions/${id}`} className={buttonClass("secondary", "sm")} title="Edit">
            <Pencil className={icon} aria-hidden /> Edit
          </Link>
        )}
        <button
          type="button"
          onClick={toggle}
          disabled={busy !== null}
          className={buttonClass("secondary", "sm")}
          title={published ? "Hide from students (back to draft)" : "Show to students"}
        >
          {busy === "status" ? <Spinner className={icon} /> : published ? <EyeOff className={icon} aria-hidden /> : <Eye className={icon} aria-hidden />}
          {published ? "Unpublish" : "Publish"}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy !== null}
          className={cn(buttonClass("ghost", "sm"), "text-danger hover:bg-danger-soft")}
          title="Delete"
        >
          {busy === "delete" ? <Spinner className={icon} /> : <Trash2 className={icon} aria-hidden />}
          <span className="sr-only sm:not-sr-only">Delete</span>
        </button>
      </span>
      {msg && <span className="text-xs text-danger">{msg}</span>}
    </span>
  );
}
