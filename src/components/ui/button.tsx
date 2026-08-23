import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "dark";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "storefront-action inline-flex h-11 items-center justify-center gap-2 border px-5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
        variant === "primary" && "border-[var(--accent)] bg-[var(--accent)] text-[#17262D] hover:bg-[var(--foreground)] hover:text-[var(--background)]",
        variant === "secondary" && "border-[var(--border)] bg-transparent text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
        variant === "ghost" && "border-transparent bg-transparent text-[var(--foreground)] hover:bg-[var(--hover)]",
        variant === "dark" && "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--accent)] hover:text-[#17262D]",
        className,
      )}
      {...props}
    />
  );
}
