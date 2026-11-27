import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function humanMinutes(totalSec: number): string {
  const m = Math.round(totalSec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

const dateFmt = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  return dateFmt.format(new Date(iso));
}

export const MODE_LABEL: Record<string, string> = {
  topic: "Topic practice",
  subject: "Subject practice",
  section: "Section practice",
  full_mock: "Full mock test",
  essay: "Essay practice",
};
