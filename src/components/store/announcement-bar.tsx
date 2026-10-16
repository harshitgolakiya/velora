"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/store/language-switcher";
import { enabledSorted, localText, type GlobalContent } from "@/lib/global-content";
import { localeFromPathname } from "@/lib/i18n-shell";
import { cn } from "@/lib/utils";

export function AnnouncementBar({
  isOverlay,
  globalContent,
}: {
  isOverlay: boolean;
  globalContent: GlobalContent;
}) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const messages = globalContent.announcementEnabled
    ? enabledSorted(globalContent.announcements).map((item) => localText(item.message, locale))
    : [];
  const [index, setIndex] = useState(0);
  const visibleIndex = messages.length ? index % messages.length : 0;

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-40 hidden h-8 border-b text-[10px] font-medium uppercase tracking-[0.2em] transition-colors md:block",
        !messages.length && "md:hidden",
        isOverlay
          ? "border-[var(--paper)]/15 bg-[var(--ink)]/15 text-[var(--paper)]"
          : "border-[var(--border)] bg-[var(--background)] text-[var(--accent-text)]",
      )}
    >
      <div className="storefront-container grid h-full grid-cols-[96px_1fr_96px] items-center">
        <span aria-hidden="true" />
        <div className="relative h-full overflow-hidden">
          <span
            key={`${locale}-${messages[visibleIndex]}`}
            className="announcement-message absolute inset-0 flex items-center justify-center text-center"
            aria-live="polite"
          >
            {messages[visibleIndex]}
          </span>
        </div>
        <LanguageSwitcher className="justify-self-end" />
      </div>
    </div>
  );
}
