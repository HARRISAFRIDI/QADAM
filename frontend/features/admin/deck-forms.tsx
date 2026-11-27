"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Pencil, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { api, errorMessage } from "@/lib/api/client";

type Subject = { id: number; name: string };
export type AdminDeck = {
  id: number;
  kind: "vocabulary" | "formula" | "fact";
  title: string;
  description: string | null;
  status: "draft" | "published";
  sort_order: number;
  exam: "HAT" | "USAT" | null;
  subject_id: number | null;
};

const LINES_HINT = "One card per line: front | back | example (example is optional).";

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function run<T>(fn: () => Promise<T>, ok?: string): Promise<T | null> {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fn();
      if (ok) setMsg({ ok: true, text: ok });
      router.refresh();
      return r;
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { busy, msg, run, router };
}

function DeckFields({ subjects, deck }: { subjects: Subject[]; deck?: AdminDeck }) {
  return (
    <>
      <Field label="Title" htmlFor="title">
        <Input id="title" name="title" required minLength={2} defaultValue={deck?.title} placeholder="e.g. Essential Vocabulary III" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="kind">
          <Select id="kind" name="kind" defaultValue={deck?.kind ?? "vocabulary"}>
            <option value="vocabulary">Vocabulary</option>
            <option value="formula">Formulas</option>
            <option value="fact">Important facts</option>
          </Select>
        </Field>
        <Field label="Test" htmlFor="exam">
          <Select id="exam" name="exam" defaultValue={deck?.exam ?? ""}>
            <option value="">Both HAT and USAT</option>
            <option value="HAT">HAT only</option>
            <option value="USAT">USAT only</option>
          </Select>
        </Field>
      </div>
      <Field label="Subject" htmlFor="subject_id" hint="Students only see a deck if its subject is in their category.">
        <Select id="subject_id" name="subject_id" defaultValue={deck?.subject_id ?? ""}>
          <option value="">Every category</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Description (optional)" htmlFor="description">
        <Textarea id="description" name="description" rows={2} defaultValue={deck?.description ?? ""} />
      </Field>
    </>
  );
}

function deckBody(f: FormData) {
  return {
    title: f.get("title"),
    kind: f.get("kind"),
    exam: f.get("exam") || null,
    subject_id: f.get("subject_id") ? Number(f.get("subject_id")) : null,
    description: f.get("description") || null,
  };
}

export function CreateDeckForm({ subjects }: { subjects: Subject[] }) {
  const { busy, msg, run, router } = useAction();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await run(() =>
      api<{ id: number }>("/admin/decks", { method: "POST", body: { ...deckBody(f), cards: f.get("cards") || null } }),
    );
    if (r) router.push(`/admin/decks/${r.id}`);
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {msg && <Alert tone={msg.ok ? "success" : "danger"}>{msg.text}</Alert>}
      <DeckFields subjects={subjects} />
      <Field label="Cards (optional)" htmlFor="cards" hint={LINES_HINT}>
        <Textarea id="cards" name="cards" rows={6} placeholder={"Abate | to become less intense | The storm abated.\nCandid | honest and direct"} />
      </Field>
      <Button type="submit" loading={busy}>
        Create deck (draft)
      </Button>
    </form>
  );
}

export function EditDeckForm({ deck, subjects }: { deck: AdminDeck; subjects: Subject[] }) {
  const { busy, msg, run } = useAction();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await run(() => api(`/admin/decks/${deck.id}`, { method: "PATCH", body: deckBody(f) }), "Deck saved.");
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {msg && <Alert tone={msg.ok ? "success" : "danger"}>{msg.text}</Alert>}
      <DeckFields subjects={subjects} deck={deck} />
      <Button type="submit" loading={busy}>
        Save deck
      </Button>
    </form>
  );
}

export function DeckStatusButtons({ deck }: { deck: AdminDeck }) {
  const { busy, msg, run, router } = useAction();
  const publish = deck.status !== "published";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant={publish ? "primary" : "secondary"}
        loading={busy}
        onClick={() => run(() => api(`/admin/decks/${deck.id}`, { method: "PATCH", body: { status: publish ? "published" : "draft" } }))}
      >
        {publish ? "Publish" : "Unpublish"}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm(`Delete "${deck.title}" and all its cards? Students lose their progress on it.`)) return;
          const ok = await run(() => api(`/admin/decks/${deck.id}`, { method: "DELETE" }));
          if (ok) router.push("/admin/decks");
        }}
      >
        <Trash2 className="h-4 w-4" aria-hidden /> Delete
      </Button>
      {msg && !msg.ok && <span className="text-sm text-danger">{msg.text}</span>}
    </div>
  );
}

export function AddCardsForm({ deckId }: { deckId: number }) {
  const { busy, msg, run } = useAction();
  const [text, setText] = useState("");
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const r = await run(() => api<{ added: number }>(`/admin/decks/${deckId}/cards`, { method: "POST", body: { lines: text } }));
    if (r) setText("");
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {msg && <Alert tone={msg.ok ? "success" : "danger"}>{msg.text}</Alert>}
      <Field label="Add cards" htmlFor="lines" hint={LINES_HINT}>
        <Textarea id="lines" value={text} onChange={(e) => setText(e.target.value)} rows={5} required />
      </Field>
      <Button type="submit" loading={busy} disabled={!text.trim()}>
        Add cards
      </Button>
    </form>
  );
}

export function CardRow({ card, n }: { card: { id: number; front: string; back: string; example: string | null }; n: number }) {
  const { busy, msg, run } = useAction();
  const [editing, setEditing] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const ok = await run(() =>
      api(`/admin/cards/${card.id}`, {
        method: "PATCH",
        body: { front: f.get("front"), back: f.get("back"), example: f.get("example") ?? "" },
      }),
    );
    if (ok) setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={onSubmit} className="space-y-2 px-5 py-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input name="front" defaultValue={card.front} required aria-label="Front" />
          <Input name="back" defaultValue={card.back} required aria-label="Back" />
        </div>
        <Input name="example" defaultValue={card.example ?? ""} placeholder="Example (optional)" aria-label="Example" />
        <div className="flex gap-2">
          <Button size="sm" type="submit" loading={busy}>
            Save
          </Button>
          <Button size="sm" type="button" variant="secondary" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" aria-hidden /> Cancel
          </Button>
        </div>
        {msg && !msg.ok && <p className="text-sm text-danger">{msg.text}</p>}
      </form>
    );
  }
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <span className="tabular w-6 shrink-0 pt-0.5 text-xs font-bold text-muted">{n}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-forest-950">{card.front}</p>
        <p className="text-sm text-ink-soft">{card.back}</p>
        {card.example && <p className="text-xs italic text-muted">{card.example}</p>}
      </div>
      <button type="button" onClick={() => setEditing(true)} className="rounded-lg p-1.5 text-muted hover:bg-sage-100 hover:text-forest-950" aria-label="Edit card">
        <Pencil className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => window.confirm("Delete this card?") && run(() => api(`/admin/cards/${card.id}`, { method: "DELETE" }))}
        className="rounded-lg p-1.5 text-muted hover:bg-rose-50 hover:text-rose-600"
        aria-label="Delete card"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
