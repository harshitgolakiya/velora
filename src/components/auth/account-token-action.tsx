"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

export function AccountTokenAction({ mode, token }: { mode: "verify" | "reset"; token: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(mode === "verify" ? "loading" : "idle");
  const [message, setMessage] = useState(mode === "verify" ? "Verifying your email address..." : "");

  useEffect(() => {
    if (mode !== "verify") return;
    let active = true;
    void fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => ({ response, body: await response.json() }))
      .then(({ response, body }) => {
        if (!active) return;
        setStatus(response.ok ? "success" : "error");
        setMessage(response.ok ? "Your email is verified. You can now sign in." : body.message ?? "Unable to verify this email.");
      })
      .catch(() => {
        if (active) {
          setStatus("error");
          setMessage("Unable to verify this email right now.");
        }
      });
    return () => {
      active = false;
    };
  }, [mode, token]);

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    if (password !== confirmation) {
      setStatus("error");
      setMessage("The passwords do not match.");
      return;
    }

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const body = await response.json();
    setStatus(response.ok ? "success" : "error");
    setMessage(response.ok ? "Your password has been updated. You can now sign in." : body.message ?? "Unable to reset your password.");
  }

  return (
    <div className="mx-auto max-w-lg border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Account security</p>
      <h1 className="mt-3 text-3xl font-semibold">{mode === "verify" ? "Email verification" : "Choose a new password"}</h1>
      {mode === "reset" && status !== "success" ? (
        <form onSubmit={resetPassword} className="mt-7 grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            New password
            <input required name="password" type="password" autoComplete="new-password" className="h-12 border border-[var(--border)] bg-[var(--background)] px-4 outline-none focus:border-[var(--accent)]" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Confirm new password
            <input required name="confirmation" type="password" autoComplete="new-password" className="h-12 border border-[var(--border)] bg-[var(--background)] px-4 outline-none focus:border-[var(--accent)]" />
          </label>
          <p className="text-xs leading-5 text-[var(--muted)]">Use 12+ characters with uppercase, lowercase, number, and symbol.</p>
          <button disabled={status === "loading"} className="h-12 bg-[var(--foreground)] text-sm font-semibold uppercase tracking-[0.14em] text-[var(--background)] disabled:opacity-60">
            {status === "loading" ? "Updating" : "Update password"}
          </button>
        </form>
      ) : null}
      {message ? <p role="status" className={`mt-6 text-sm leading-6 ${status === "error" ? "text-red-600" : "text-[var(--muted)]"}`}>{message}</p> : null}
      {status === "success" ? <Link href="/account" className="mt-6 inline-flex h-11 items-center bg-[var(--foreground)] px-5 text-sm font-semibold text-[var(--background)]">Go to sign in</Link> : null}
    </div>
  );
}
