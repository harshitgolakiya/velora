"use client";

import * as Accordion from "@radix-ui/react-accordion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/store/language-switcher";
import { ThemeToggle } from "@/components/store/theme-toggle";
import { enabledSorted, localText, type GlobalContent } from "@/lib/global-content";
import { localeFromPathname, localizedPath, shellCopy } from "@/lib/i18n";

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
    <footer className="bg-stone-950 text-white">
      {globalContent.newsletter.enabled ? (
      <div id="newsletter" className="mx-auto max-w-[1440px] border-b border-white/15 px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">{localText(globalContent.newsletter.eyebrow, locale)}</p>
            <p className="mt-4 max-w-2xl font-serif text-5xl leading-[0.95] sm:text-7xl">{localText(globalContent.newsletter.headline, locale)}</p>
          </div>
          {status === "success" ? (
            <p className="border-b border-white/45 pb-3 text-base text-white">{feedback}</p>
          ) : (
            <form className="border-b border-white/45 pb-3" onSubmit={handleSubmit}>
              <label htmlFor="footer-email" className="sr-only">{localText(globalContent.newsletter.placeholder, locale)}</label>
              <div className="flex items-center gap-4">
                <input
                  id="footer-email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={localText(globalContent.newsletter.placeholder, locale)}
                  className="h-12 min-w-0 flex-1 border-0 bg-transparent text-base text-white outline-none placeholder:text-white/45"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  aria-label={String(copy.joinNewsletter)}
                  className="grid size-11 place-items-center transition hover:text-[var(--accent)] disabled:opacity-50"
                >
                  <ArrowRight className="size-5" />
                </button>
              </div>
              {status === "error" ? <p className="mt-2 text-xs text-red-400">{feedback}</p> : null}
            </form>
          )}
        </div>
      </div>
      ) : null}

      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.5fr_0.7fr_0.7fr] lg:gap-12 lg:px-12 lg:py-20">
        <div>
          <Link href={localize("/")} className="font-serif text-5xl font-medium tracking-[0.04em] text-[var(--accent)]">Velora</Link>
          <p className="mt-5 max-w-sm text-sm leading-7 text-white/58">
            {localText(globalContent.footer.body, locale)}
          </p>
        </div>

        {/* Desktop: static columns */}
        {footerGroups.slice(0, 2).map((group) => (
          <div key={group.id} className="hidden lg:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{group.titleText}</p>
            <div className="mt-5 grid gap-3 text-sm text-white/72">
              {group.links.map((link) => <Link key={link.href} href={localize(link.href)} className="hover:text-white">{link.label}</Link>)}
            </div>
          </div>
        ))}

        {/* Mobile/tablet: collapsible accordions */}
        <Accordion.Root type="multiple" className="divide-y divide-white/15 border-y border-white/15 lg:hidden">
          {footerGroups.map((group) => (
          <Accordion.Item key={group.id} value={group.id}>
            <Accordion.Trigger className="group flex min-h-12 w-full items-center justify-between text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
              {group.titleText}
              <Plus className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-45" />
            </Accordion.Trigger>
            <Accordion.Content>
              <div className="grid gap-3 pb-5 text-sm text-white/72">
                {group.links.map((link) => <Link key={link.href} href={localize(link.href)} className="hover:text-white">{link.label}</Link>)}
              </div>
            </Accordion.Content>
          </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-6 text-[10px] uppercase tracking-[0.14em] text-white/45 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <p>{localText(globalContent.footer.location, locale)}</p>
          <div className="flex items-center gap-5 md:hidden">
            <LanguageSwitcher />
            <ThemeToggle className="text-white" />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href={localize("/privacy")} className="hover:text-white">{copy.privacy}</Link>
            <Link href={localize("/terms")} className="hover:text-white">{copy.terms}</Link>
            <span>{localText(globalContent.footer.copyright, locale)}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
