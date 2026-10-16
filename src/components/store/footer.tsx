"use client";

import * as Accordion from "@radix-ui/react-accordion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/store/language-switcher";
import { ThemeToggle } from "@/components/store/theme-toggle";
import { enabledSorted, localText, type GlobalContent } from "@/lib/global-content";
import { localeFromPathname, localizedPath, shellCopy } from "@/lib/i18n-shell";

export function Footer({ globalContent }: { globalContent: GlobalContent }) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const copy = shellCopy[locale];
  const localize = (href: string) => localizedPath(href, locale);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const footerGroups = enabledSorted(globalContent.footerGroups).map((group) => ({
    ...group,
    titleText: localText(group.title, locale),
    links: enabledSorted(group.links).map((link) => ({
      href: link.href,
      label: localText(link.label, locale),
    })),
  }));
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("loading");
    try {
      const body = new FormData();
      body.set("email", email);
      body.set("source", "storefront-footer");
      const res = await fetch("/api/newsletter", { method: "POST", body });
      const result = await res.json();
      setStatus(res.ok ? "success" : "error");
      setFeedback(result.message ?? (res.ok ? "You are subscribed." : "Unable to subscribe right now."));
    } catch {
      setStatus("error");
      setFeedback("Unable to connect. Check your connection and try again.");
    }
  };

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]">
      {globalContent.newsletter.enabled ? (
        <div id="newsletter" className="storefront-container border-b border-[var(--border)] py-12 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1fr] lg:items-end">
            <div>
              <p className="eyebrow">{localText(globalContent.newsletter.eyebrow, locale)}</p>
              <p className="display-lg mt-3 max-w-xl">{localText(globalContent.newsletter.headline, locale)}</p>
            </div>
            {status === "success" ? (
              <p className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base">{feedback}</p>
            ) : (
              <form className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-1.5 transition focus-within:border-[var(--accent)] motion-reduce:transition-none" onSubmit={handleSubmit}>
                <label htmlFor="footer-email" className="sr-only">{localText(globalContent.newsletter.placeholder, locale)}</label>
                <div className="flex items-center gap-3 sm:gap-4">
                  <input
                    id="footer-email"
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={localText(globalContent.newsletter.placeholder, locale)}
                    suppressHydrationWarning
                    className="h-11 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-none placeholder:text-[var(--muted)]"
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    aria-label={String(copy.joinNewsletter)}
                    className="btn btn-primary btn-icon"
                  >
                    <ArrowRight className="size-5" />
                  </button>
                </div>
                {status === "error" ? <p className="mt-2 text-xs text-[var(--sale)]">{feedback}</p> : null}
              </form>
            )}
          </div>
        </div>
      ) : null}

      <div className="storefront-container grid gap-10 py-12 lg:grid-cols-[1.25fr_0.75fr_0.75fr] lg:gap-12 lg:py-16">
        <div>
          <Link href={localize("/")} className="font-serif text-[2.75rem] leading-none tracking-[0.02em] text-[var(--foreground)]">Velora</Link>
          <p className="mt-5 max-w-sm text-sm leading-6 text-[var(--muted)]">
            {localText(globalContent.footer.body, locale)}
          </p>
        </div>

        {/* Desktop: static columns */}
        {footerGroups.slice(0, 2).map((group) => (
          <div key={group.id} className="hidden lg:block">
            <p className="eyebrow eyebrow-muted">{group.titleText}</p>
            <div className="mt-5 grid gap-3 text-sm text-[var(--foreground)]/80">
              {group.links.map((link) => <Link key={link.href} href={localize(link.href)} className="hover:text-[var(--accent-text)]">{link.label}</Link>)}
            </div>
          </div>
        ))}

        {/* Mobile/tablet: collapsible accordions */}
        <Accordion.Root type="multiple" className="divide-y divide-[var(--border)] border-y border-[var(--border)] lg:hidden">
          {footerGroups.map((group) => (
            <Accordion.Item key={group.id} value={group.id}>
              <Accordion.Trigger className="eyebrow eyebrow-muted group flex min-h-12 w-full items-center justify-between text-left">
                {group.titleText}
                <Plus className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-45" />
              </Accordion.Trigger>
              <Accordion.Content>
                <div className="grid gap-3 pb-5 text-sm text-[var(--foreground)]/80">
                  {group.links.map((link) => <Link key={link.href} href={localize(link.href)} className="hover:text-[var(--accent-text)]">{link.label}</Link>)}
                </div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>

      <div className="border-t border-[var(--border)]">
        <div className="storefront-container flex flex-col gap-4 py-5 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] md:flex-row md:items-center md:justify-between">
          <p>{localText(globalContent.footer.location, locale)}</p>
          <div className="flex items-center gap-5 md:hidden">
            <LanguageSwitcher />
            <ThemeToggle className="!size-9 text-[var(--foreground)]" />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href={localize("/privacy")} className="hover:text-[var(--foreground)]">{copy.privacy}</Link>
            <Link href={localize("/terms")} className="hover:text-[var(--foreground)]">{copy.terms}</Link>
            <span>{localText(globalContent.footer.copyright, locale)}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
