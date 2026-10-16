"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Sparkles, TicketPercent, X } from "lucide-react";
import { consentStorageKey } from "@/lib/consent-preferences";

export function NewsletterModal({ initialDelayMs = 8000 }: { initialDelayMs?: number }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let timer: number | undefined;

    const schedule = () => {
      window.clearTimeout(timer);
      const seen = window.localStorage.getItem("velora-newsletter");
      const hasPrivacyChoice = window.localStorage.getItem(consentStorageKey);
      if (seen || !hasPrivacyChoice) return;

      timer = window.setTimeout(() => {
        if (!window.localStorage.getItem("velora-newsletter") && window.localStorage.getItem(consentStorageKey)) {
          setOpen(true);
        }
      }, initialDelayMs);
    };

    schedule();
    window.addEventListener("velora:consent", schedule);
    window.addEventListener("storage", schedule);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("velora:consent", schedule);
      window.removeEventListener("storage", schedule);
    };
  }, [initialDelayMs]);

  const dismiss = () => {
    window.localStorage.setItem("velora-newsletter", "dismissed");
    setOpen(false);
  };
  const benefits = [
    "Limited color previews",
    "Fit and fabric notes",
    "Early sale access",
  ];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("loading");
    try {
      const body = new FormData();
      body.set("email", email);
      body.set("source", "storefront-modal");
      const res = await fetch("/api/newsletter", { method: "POST", body });
      const result = await res.json();
      if (res.ok) {
        setStatus("success");
        setFeedback(result.message);
        window.localStorage.setItem("velora-newsletter", "subscribed");
        window.setTimeout(dismiss, 2200);
      } else {
        setStatus("error");
        setFeedback(result.message ?? "Unable to subscribe right now.");
      }
    } catch {
      setStatus("error");
      setFeedback("Unable to connect. Check your connection and try again.");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : dismiss())}>
      <Dialog.Portal>
        <Dialog.Overlay className="storefront-overlay fixed inset-0 z-[110] bg-[var(--scrim)] backdrop-blur-sm" />
        <Dialog.Content
          className="storefront-modal storefront-panel fixed left-1/2 top-1/2 z-[110] grid max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-4xl overflow-y-auto bg-[var(--surface)] text-[var(--foreground)] outline-none sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:grid-cols-[0.9fr_1.1fr]"
          style={{ backgroundColor: "var(--surface)" }}
          onEscapeKeyDown={dismiss}
        >
          <Dialog.Title className="sr-only">Join the Velora newsletter</Dialog.Title>
          <Dialog.Description className="sr-only">
            Subscribe for collection previews, stories, and limited color releases.
          </Dialog.Description>
          <div className="relative hidden min-h-[560px] sm:block">
            <Image src="/images/campaign/campaign-sage-portrait.webp" alt="" fill sizes="320px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/66 via-[var(--ink)]/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-[var(--paper)]">
              <p className="eyebrow eyebrow-light">Members edit</p>
              <p className="display-md mt-3 text-[var(--paper)]">First look, cleaner styling.</p>
            </div>
          </div>
          <div className="flex flex-col justify-center p-5 pt-16 sm:p-10">
            <Dialog.Close
              aria-label="Close newsletter"
              className="btn btn-soft btn-icon btn-sm btn-round absolute end-4 top-4"
            >
              <X className="size-5" />
            </Dialog.Close>
            <p className="badge badge-outline gap-2 h-8">
              <TicketPercent className="size-3.5 text-[var(--accent-text)]" />
              Private access
            </p>
            <h2 className="display-lg mt-5">The next movement, first.</h2>
            <p className="storefront-body-copy mt-4 text-[var(--muted)] sm:mt-5">
              Collection previews, considered stories, and limited color before general release.
            </p>
            <div className="mt-5 grid gap-2 sm:mt-6">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-2 text-sm">
                  <Sparkles className="size-3.5 text-[var(--accent-text)]" />
                  {benefit}
                </div>
              ))}
            </div>
            {status === "success" ? (
              <p role="status" className="mt-7 border border-[var(--border)] px-5 py-4 text-sm font-medium text-[var(--accent-text)]">
                {feedback}
              </p>
            ) : (
              <form className="mt-7 border-b border-[var(--foreground)] transition focus-within:border-[var(--accent)] motion-reduce:transition-none sm:mt-8" onSubmit={handleSubmit}>
                <div className="flex items-center gap-3">
                  <label htmlFor="newsletter-modal-email" className="sr-only">Email address</label>
                  <input
                    id="newsletter-modal-email"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    suppressHydrationWarning
                    className="h-12 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm outline-none placeholder:text-[var(--muted)]"
                  />
                  <button type="submit" disabled={status === "loading"} className="storefront-action inline-flex min-h-10 items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-50">
                    {status === "loading" ? "Joining..." : "Join"}
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </form>
            )}
            {status === "error" ? (
              <p role="alert" className="mt-2 text-xs text-[var(--sale)]">{feedback}</p>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
