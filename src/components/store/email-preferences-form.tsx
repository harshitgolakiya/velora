"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle, MailCheck } from "lucide-react";
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

  if (loading) {
    return (
      <div className="storefront-railed flex min-h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
          <LoaderCircle className="size-5 animate-spin" />
          Loading preferences
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div role="alert" className="storefront-railed border-red-500/30 bg-red-500/5 px-5 py-8 text-sm leading-6 text-red-600">
        {message || "This preference link is invalid or has expired."}
      </div>
    );
  }

  const options: Array<[keyof NewsletterPreferences, string, string]> = [
    ["editorial", "Editorial stories", "Campaign edits, fabric guides, and considered product stories."],
    ["product", "Product updates", "New collections, restocks, and limited color releases."],
    ["offers", "Private offers", "Early access and occasional subscriber-only offers."],
  ];

  return (
    <div className="storefront-railed">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-5 text-sm sm:px-6">
        <span className="inline-flex items-center gap-2 text-[var(--muted)]">
          <MailCheck className="size-4" />
          Managing
        </span>
        <strong className="min-w-0 break-all text-end">{state.email}</strong>
      </div>
      {options.map(([key, title, description]) => (
        <label
          key={key}
          className="storefront-action flex cursor-pointer items-start gap-4 border-b border-[var(--border)] px-5 py-5 hover:bg-[var(--hover)] sm:px-6"
        >
          <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-[var(--foreground)] transition peer-disabled:opacity-40">
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
            <Check className="size-3 opacity-0 transition peer-checked:opacity-100" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">{title}</span>
            <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">{description}</span>
          </span>
        </label>
      ))}
      <div className="flex flex-col gap-3 px-5 py-6 sm:flex-row sm:px-6">
        {state.status === "SUBSCRIBED" ? (
          <>
            <button disabled={saving} onClick={() => save("SUBSCRIBED")} className="storefront-action h-12 bg-[var(--foreground)] px-6 text-sm font-semibold text-[var(--background)] disabled:opacity-50">Save preferences</button>
            <button disabled={saving} onClick={() => save("UNSUBSCRIBED")} className="storefront-action h-12 border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-50">Unsubscribe from all</button>
          </>
        ) : (
          <button disabled={saving} onClick={() => save("SUBSCRIBED")} className="storefront-action h-12 bg-[var(--foreground)] px-6 text-sm font-semibold text-[var(--background)] disabled:opacity-50">Resubscribe</button>
        )}
      </div>
      {message ? <p role="status" className="border-t border-[var(--border)] px-5 py-4 text-sm text-[var(--muted)] sm:px-6">{message}</p> : null}
    </div>
  );
}
