"use client";

import { memo } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { OPTIONS, type AttemptQuestion, type Option } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export interface AnswerState {
  selected: Option | null;
  marked: boolean;
  seq: number;
  checked: boolean;
  correct: Option | null;
  explanation: string | null;
  solution?: string | null;
}

export const QuestionView = memo(function QuestionView({
  q,
  answer,
  total,
  subjectName,
  sectionName,
  onSelect,
}: {
  q: AttemptQuestion;
  answer: AnswerState;
  total: number;
  subjectName: string;
  sectionName: string;
  onSelect: (position: number, option: Option) => void;
}) {
  const locked = answer.checked;
  return (
    <article aria-labelledby={`q-${q.position}`}>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="tabular rounded-md bg-forest-900 px-2 py-1 text-white">
          Q{q.position}
          <span className="text-sage-300"> / {total}</span>
        </span>
        <span className="rounded-md bg-sage-100 px-2 py-1 text-forest-800">{sectionName}</span>
        {subjectName !== sectionName && <span className="rounded-md bg-paper px-2 py-1 text-ink-soft">{subjectName}</span>}
      </div>

      <h2 id={`q-${q.position}`} className="whitespace-pre-wrap text-[17px] font-semibold leading-relaxed text-ink sm:text-lg">
        {q.stem}
      </h2>
      {q.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={q.image_url}
          alt=""
          loading="lazy"
          decoding="async"
          className="mt-4 max-h-80 w-auto max-w-full rounded-md border border-line object-contain"
        />
      )}

      <div className="mt-6 space-y-2.5" role="radiogroup" aria-labelledby={`q-${q.position}`}>
        {OPTIONS.map((opt) => {
          const selected = answer.selected === opt;
          const isCorrect = locked && answer.correct === opt;
          const isWrong = locked && selected && answer.correct !== opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={locked}
              onClick={() => onSelect(q.position, opt)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border px-4 py-3.5 text-left transition-[border-color,background-color] duration-100",
                !locked && !selected && "border-line-strong bg-surface hover:border-forest-700 hover:bg-forest-50/50",
                !locked && selected && "border-forest-700 bg-forest-50 ring-1 ring-forest-700",
                isCorrect && "border-success bg-success-soft ring-1 ring-success",
                isWrong && "border-danger bg-danger-soft ring-1 ring-danger",
                locked && !isCorrect && !isWrong && "border-line bg-surface opacity-70",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold",
                  selected && !locked ? "bg-forest-900 text-white" : "border border-line-strong text-ink-soft",
                  isCorrect && "border-0 bg-success text-white",
                  isWrong && "border-0 bg-danger text-white",
                )}
              >
                {opt}
              </span>
              <span className="whitespace-pre-wrap pt-0.5 text-[15px] leading-relaxed text-ink">{q.options[opt]}</span>
              {isCorrect && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-success" aria-label="Correct answer" />}
              {isWrong && <XCircle className="ml-auto h-5 w-5 shrink-0 text-danger" aria-label="Your answer" />}
            </button>
          );
        })}
      </div>

      {locked && (
        <div
          className={cn(
            "mt-5 rounded-lg border px-4 py-3.5",
            answer.selected === answer.correct ? "border-[#cfe6d8] bg-success-soft" : "border-[#f2cfcb] bg-danger-soft",
          )}
        >
          <p className={cn("font-bold", answer.selected === answer.correct ? "text-success" : "text-danger")}>
            {answer.selected === answer.correct ? "Correct!" : `Not quite. The correct answer is ${answer.correct}.`}
          </p>
          {answer.explanation && <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{answer.explanation}</p>}
          {answer.solution && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-semibold text-forest-800">Detailed solution</summary>
              <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-ink-soft">{answer.solution}</p>
            </details>
          )}
        </div>
      )}
    </article>
  );
});
