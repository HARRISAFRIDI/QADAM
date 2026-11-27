import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px select-none";

const variants = {
  primary: "bg-forest-900 text-white hover:bg-forest-800 shadow-card",
  secondary: "bg-surface text-forest-900 border border-line-strong hover:border-forest-700 hover:bg-forest-50",
  gold: "bg-gold-500 text-forest-950 hover:bg-gold-600 hover:text-white",
  ghost: "text-forest-900 hover:bg-forest-50",
  danger: "bg-danger text-white hover:bg-[#9a1d14]",
  link: "text-forest-700 underline-offset-4 hover:underline px-0 h-auto",
} as const;

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({ variant, size, loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
    />
  );
}
