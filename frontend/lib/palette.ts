/**
 * Colour families for cards. Each card picks one hue so neighbouring cards are
 * easy to tell apart. Class strings are written out in full so Tailwind sees them.
 * White text is only used on the 600+ gradient stops (WCAG AA for bold text).
 */
export const HUES = {
  blue: {
    grad: "bg-linear-to-br from-blue-600 via-blue-600 to-indigo-600",
    tile: "bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-[0_6px_14px_-4px_rgb(37_99_235/0.55)]",
    soft: "bg-blue-50",
    softBorder: "border-blue-100",
    text: "text-blue-700",
    bar: "bg-blue-500",
    dot: "bg-blue-500",
    line: "bg-linear-to-r from-blue-500 to-indigo-500",
    hover: "hover:border-blue-300 hover:shadow-[0_18px_36px_-14px_rgb(37_99_235/0.45)]",
  },
  violet: {
    grad: "bg-linear-to-br from-violet-600 via-purple-600 to-fuchsia-600",
    tile: "bg-linear-to-br from-violet-500 to-fuchsia-600 text-white shadow-[0_6px_14px_-4px_rgb(139_92_246/0.55)]",
    soft: "bg-violet-50",
    softBorder: "border-violet-100",
    text: "text-violet-700",
    bar: "bg-violet-500",
    dot: "bg-violet-500",
    line: "bg-linear-to-r from-violet-500 to-fuchsia-500",
    hover: "hover:border-violet-300 hover:shadow-[0_18px_36px_-14px_rgb(139_92_246/0.45)]",
  },
  emerald: {
    grad: "bg-linear-to-br from-emerald-600 via-emerald-600 to-teal-700",
    tile: "bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-[0_6px_14px_-4px_rgb(16_185_129/0.55)]",
    soft: "bg-emerald-50",
    softBorder: "border-emerald-100",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
    line: "bg-linear-to-r from-emerald-500 to-teal-500",
    hover: "hover:border-emerald-300 hover:shadow-[0_18px_36px_-14px_rgb(16_185_129/0.45)]",
  },
  orange: {
    grad: "bg-linear-to-br from-orange-600 via-orange-600 to-rose-600",
    tile: "bg-linear-to-br from-amber-500 to-orange-600 text-white shadow-[0_6px_14px_-4px_rgb(249_115_22/0.55)]",
    soft: "bg-orange-50",
    softBorder: "border-orange-100",
    text: "text-orange-700",
    bar: "bg-orange-500",
    dot: "bg-orange-500",
    line: "bg-linear-to-r from-amber-500 to-orange-500",
    hover: "hover:border-orange-300 hover:shadow-[0_18px_36px_-14px_rgb(249_115_22/0.45)]",
  },
  sky: {
    grad: "bg-linear-to-br from-sky-600 via-sky-600 to-cyan-700",
    tile: "bg-linear-to-br from-sky-500 to-cyan-600 text-white shadow-[0_6px_14px_-4px_rgb(14_165_233/0.55)]",
    soft: "bg-sky-50",
    softBorder: "border-sky-100",
    text: "text-sky-700",
    bar: "bg-sky-500",
    dot: "bg-sky-500",
    line: "bg-linear-to-r from-sky-500 to-cyan-500",
    hover: "hover:border-sky-300 hover:shadow-[0_18px_36px_-14px_rgb(14_165_233/0.45)]",
  },
  rose: {
    grad: "bg-linear-to-br from-rose-600 via-rose-600 to-pink-600",
    tile: "bg-linear-to-br from-rose-500 to-pink-600 text-white shadow-[0_6px_14px_-4px_rgb(244_63_94/0.55)]",
    soft: "bg-rose-50",
    softBorder: "border-rose-100",
    text: "text-rose-700",
    bar: "bg-rose-500",
    dot: "bg-rose-500",
    line: "bg-linear-to-r from-rose-500 to-pink-500",
    hover: "hover:border-rose-300 hover:shadow-[0_18px_36px_-14px_rgb(244_63_94/0.45)]",
  },
} as const;

export type HueName = keyof typeof HUES;
export type Hue = (typeof HUES)[HueName];

const ORDER: HueName[] = ["blue", "violet", "emerald", "orange", "sky", "rose"];

/** Stable hue for the n-th card in a list. */
export function hueAt(i: number): Hue {
  return HUES[ORDER[((i % ORDER.length) + ORDER.length) % ORDER.length]];
}

/** Colour for a score or accuracy percentage: green 70+, amber 40+, red below. */
export function scoreTone(p: number) {
  if (p >= 70) return { text: "text-emerald-700", bar: "bg-emerald-500", soft: "bg-emerald-50" };
  if (p >= 40) return { text: "text-amber-700", bar: "bg-amber-500", soft: "bg-amber-50" };
  return { text: "text-rose-700", bar: "bg-rose-500", soft: "bg-rose-50" };
}
