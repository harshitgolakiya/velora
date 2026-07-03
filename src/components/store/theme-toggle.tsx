"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    window.queueMicrotask(() => {
      const saved = window.localStorage.getItem("velora-theme") as Theme | null;
      const preferred: Theme = saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      setTheme(preferred);
      setMounted(true);
      document.documentElement.dataset.theme = preferred;
    });
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("velora-theme", next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={`grid size-9 place-items-center border border-current/25 transition hover:bg-current/10 motion-reduce:transition-none ${className}`}
    >
      {mounted && theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
