"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
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
        <Dialog.Overlay className="storefront-overlay fixed inset-0 z-[110] bg-black/65 backdrop-blur-sm" />
        <Dialog.Content
          className="storefront-modal fixed left-1/2 top-1/2 z-[110] grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto bg-[var(--surface)] text-[var(--foreground)] shadow-2xl outline-none sm:grid-cols-[0.85fr_1.15fr]"
          onEscapeKeyDown={dismiss}
        >
          <Dialog.Title className="sr-only">Join the Velora newsletter</Dialog.Title>
          <Dialog.Description className="sr-only">
            Subscribe for collection previews, stories, and limited color releases.
          </Dialog.Description>
          <div className="relative hidden min-h-[520px] sm:block">
            <Image src="/images/velora/collection-after-hours.jpg" alt="" fill sizes="320px" className="object-cover" />
          </div>
          <div className="flex flex-col justify-center p-7 sm:p-10">
            <Dialog.Close
              aria-label="Close newsletter"
              className="storefront-action absolute end-4 top-4 grid size-10 place-items-center border border-[var(--border)] hover:bg-[var(--hover)]"
            >
              <X className="size-5" />
            </Dialog.Close>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Private access</p>
            <h2 className="mt-5 font-serif text-5xl leading-[0.95]">The next movement, first.</h2>
            <p className="mt-5 text-sm leading-7 text-[var(--muted)]">
              Collection previews, considered stories, and limited color before general release.
            </p>
            {status === "success" ? (
              <p role="status" className="mt-7 border border-[var(--border)] px-5 py-4 text-sm font-medium text-[var(--accent)]">
                {feedback}
              </p>
            ) : (
              <form className="mt-8 border-b border-[var(--foreground)]" onSubmit={handleSubmit}>
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
                    className="h-12 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm outline-none"
                  />
                  <button type="submit" disabled={status === "loading"} className="storefront-action text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-50">
                    {status === "loading" ? "Joining..." : "Join"}
                  </button>
                </div>
              </form>
            )}
            {status === "error" ? (
              <p role="alert" className="mt-2 text-xs text-red-600">{feedback}</p>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
