"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import type { NewsletterPreferences } from "@/lib/newsletter-consent";

type State = {
  email: string;
  status: "SUBSCRIBED" | "UNSUBSCRIBED";
  preferences: NewsletterPreferences;
};

export function EmailPreferencesForm({ token }: { token: string }) {
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/newsletter/preferences?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? "Unable to load preferences.");
        setState(result);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load preferences."))
      .finally(() => setLoading(false));
  }, [token]);

  async function save(status: State["status"]) {
    if (!state) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/newsletter/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, status, preferences: state.preferences }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to save preferences.");
      setState(result);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save preferences.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex min-h-64 items-center justify-center"><LoaderCircle className="size-5 animate-spin" /></div>;
  if (!state) return <p role="alert" className="border-y border-[var(--border)] py-8 text-sm text-red-600">{message}</p>;

  const options: Array<[keyof NewsletterPreferences, string, string]> = [
    ["editorial", "Editorial stories", "Campaign edits, fabric guides, and considered product stories."],
    ["product", "Product updates", "New collections, restocks, and limited color releases."],
    ["offers", "Private offers", "Early access and occasional subscriber-only offers."],
  ];

  return (
    <div className="border-t border-[var(--border)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] py-5 text-sm">
        <span className="text-[var(--muted)]">Managing</span>
        <strong>{state.email}</strong>
      </div>
      {options.map(([key, title, description]) => (
        <label key={key} className="flex cursor-pointer items-start gap-4 border-b border-[var(--border)] py-6">
          <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center border border-[var(--foreground)]">
            <input
              type="checkbox"
              className="peer absolute inset-0 opacity-0"
              checked={state.preferences[key]}
              disabled={state.status === "UNSUBSCRIBED"}
              onChange={(event) => setState((current) => current ? {
                ...current,
                preferences: { ...current.preferences, [key]: event.target.checked },
              } : current)}
            />
            <Check className="size-3 opacity-0 peer-checked:opacity-100" />
          </span>
          <span>
            <span className="block font-semibold">{title}</span>
            <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">{description}</span>
          </span>
        </label>
      ))}
      <div className="flex flex-col gap-3 pt-7 sm:flex-row">
        {state.status === "SUBSCRIBED" ? (
          <>
            <button disabled={saving} onClick={() => save("SUBSCRIBED")} className="h-12 bg-[var(--foreground)] px-6 text-sm font-semibold text-[var(--background)] disabled:opacity-50">Save preferences</button>
            <button disabled={saving} onClick={() => save("UNSUBSCRIBED")} className="h-12 px-4 text-sm font-semibold underline underline-offset-4 disabled:opacity-50">Unsubscribe from all</button>
          </>
        ) : (
          <button disabled={saving} onClick={() => save("SUBSCRIBED")} className="h-12 bg-[var(--foreground)] px-6 text-sm font-semibold text-[var(--background)] disabled:opacity-50">Resubscribe</button>
        )}
      </div>
      {message ? <p role="status" className="mt-5 text-sm text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}
