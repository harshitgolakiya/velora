"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

export function AdminLoginForm({ callbackUrl = "/admin" }: { callbackUrl?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      callbackUrl,
      redirect: false,
    });

    if (!result?.ok) {
      setError("The email or password is incorrect.");
      setSubmitting(false);
      return;
    }

    window.location.assign(result.url ?? callbackUrl);
  }

  return (
    <form onSubmit={submit} className="mt-8 grid gap-5">
      <label className="grid gap-2 text-sm font-medium">
        Email address
        <input
          required
          autoComplete="email"
          name="email"
          type="email"
          className="h-12 border border-[var(--border)] bg-[var(--background)] px-4 outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Password
        <span className="flex h-12 border border-[var(--border)] bg-[var(--background)] focus-within:border-[var(--accent)]">
          <input
            required
            autoComplete="current-password"
            name="password"
            type={showPassword ? "text" : "password"}
            className="min-w-0 flex-1 bg-transparent px-4 outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="grid w-12 place-items-center"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
      </label>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      <button
        disabled={submitting}
        className="inline-flex h-12 items-center justify-center gap-2 bg-[var(--foreground)] px-5 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--background)] disabled:opacity-60"
      >
        <LockKeyhole className="size-4" />
        {submitting ? "Signing in" : "Sign in securely"}
      </button>
    </form>
  );
}

