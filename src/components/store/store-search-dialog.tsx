"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, Clock3, Search, X } from "lucide-react";
import { trackSearchClick } from "@/lib/search-click-client";
import { localeFromPathname, searchCopy } from "@/lib/i18n";
import { formatAed } from "@/lib/utils";
import { useLocalizedHref } from "@/lib/use-localized-href";

type PredictiveResults = {
  query: string;
  redirect?: string;
  suggestedQuery?: string;
  products: Array<{
    id: string;
    slug: string;
    name: string;
    category: string;
    price: number;
    image: string;
    colors: string[];
  }>;
  categories: string[];
  collections: Array<{ slug: string; name: string }>;
  pages: Array<{
    title: string;
    href: string;
    category: "Support" | "Editorial" | "Legal";
    excerpt: string;
  }>;
};

const emptyResults: PredictiveResults = {
  query: "",
  redirect: undefined,
  products: [],
  categories: [],
  collections: [],
  pages: [],
};

const popularSearches = ["pilates", "sports bra", "black leggings", "tennis"];
const quickCategories = ["Sports Bras", "Leggings", "Jackets", "Tops"];

function Highlight({ text, query }: { text: string; query: string }) {
  const term = query.trim();
  if (!term) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return parts.map((part, index) =>
    part.toLowerCase() === term.toLowerCase()
      ? <mark key={`${part}-${index}`} className="bg-[var(--accent)]/35 text-inherit">{part}</mark>
      : part,
  );
}

export function StoreSearchDialog({
  open,
  onOpenChange,
  showTrigger = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showTrigger?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const copy = searchCopy[locale];
  const localize = useLocalizedHref();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestSequence = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PredictiveResults>(emptyResults);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const localizedPopularSearches = locale === "ar" ? ["بيلاتس", "حمالة رياضية", "ليقنز أسود", "تنس"] : popularSearches;
  const localizedQuickCategories = locale === "ar" ? ["حمالات رياضية", "ليقنز", "جاكيتات", "توبات"] : quickCategories;

  const productLinks = results.products.map((product) => localize(`/product/${product.slug}`));

  function loadRecentSearches() {
    try {
      setRecent(JSON.parse(localStorage.getItem("velora-recent-searches") ?? "[]").slice(0, 5));
    } catch {
      setRecent([]);
    }
  }

  useEffect(() => {
    if (!open) return;
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&locale=${locale}`);
        if (response.ok && requestSequence.current === requestId) setResults(await response.json());
      } catch {
        if (requestSequence.current === requestId) setResults(emptyResults);
      } finally {
        if (requestSequence.current === requestId) setLoading(false);
      }
    }, query.trim() ? 180 : 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [locale, open, query]);

  function updateQuery(value: string) {
    setQuery(value);
    setActiveIndex(-1);
    setResults(emptyResults);
  }

  function remember(term: string) {
    const normalized = term.trim();
    if (!normalized) return;
    const next = [normalized, ...recent.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 5);
    setRecent(next);
    localStorage.setItem("velora-recent-searches", JSON.stringify(next));
  }

  function trackPredictiveClick({
    resultType,
    resultId,
    href,
    position,
  }: {
    resultType: "product" | "category" | "collection" | "page";
    resultId?: string;
    href: string;
    position: number;
  }) {
    trackSearchClick({
      query: query || results.query,
      source: "predictive",
      resultType,
      resultId,
      href,
      position,
    });
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (activeIndex >= 0 && productLinks[activeIndex]) {
      remember(query || results.products[activeIndex]?.name || "");
      const product = results.products[activeIndex];
      if (product) {
        trackPredictiveClick({
          resultType: "product",
          resultId: product.id,
          href: localize(`/product/${product.slug}`),
          position: activeIndex,
        });
      }
      onOpenChange(false);
      router.push(productLinks[activeIndex]);
      return;
    }
    const term = query.trim();
    if (!term) return;
    remember(term);
    onOpenChange(false);
    router.push(localize(results.redirect || `/search?q=${encodeURIComponent(term)}`));
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {showTrigger ? (
        <Dialog.Trigger asChild>
          <button type="button" aria-label={copy.search} className="grid size-11 place-items-center">
            <Search className="size-5" />
          </button>
        </Dialog.Trigger>
      ) : null}
      <Dialog.Portal>
        <Dialog.Overlay className="storefront-overlay fixed inset-0 z-[110] bg-[var(--scrim)] backdrop-blur-sm" />
        <Dialog.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            loadRecentSearches();
            inputRef.current?.focus();
          }}
          className="storefront-top-sheet storefront-panel fixed inset-x-0 top-0 z-[110] mx-auto flex max-h-dvh w-full flex-col overflow-hidden bg-[var(--surface)] text-[var(--foreground)] outline-none sm:inset-x-5 sm:top-16 sm:max-h-[calc(100dvh-5rem)] sm:max-w-4xl"
        >
          <Dialog.Title className="sr-only">{copy.title}</Dialog.Title>
          <Dialog.Description className="sr-only">
            {copy.description}
          </Dialog.Description>
          <form onSubmit={submit} className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
            <Search className="size-5 shrink-0 text-[var(--muted)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                updateQuery(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((index) => Math.min(index + 1, productLinks.length - 1));
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((index) => Math.max(index - 1, -1));
                }
              }}
              role="combobox"
              aria-label={copy.title}
              aria-expanded={results.products.length > 0}
              aria-controls="predictive-search-results"
              aria-activedescendant={activeIndex >= 0 ? `search-product-${results.products[activeIndex]?.id}` : undefined}
              autoComplete="off"
              placeholder={copy.placeholder}
              className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none sm:text-lg"
            />
            {loading && query.trim() ? <span className="hidden text-xs uppercase tracking-widest text-[var(--muted)] sm:inline">{copy.searching}</span> : null}
            <Dialog.Close asChild>
              <button type="button" aria-label={copy.close} className="storefront-action storefront-icon-button grid size-10 shrink-0 place-items-center">
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </form>

          <div className="grid min-h-72 flex-1 overflow-y-auto sm:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="border-b border-[var(--border)] bg-[var(--card)]/45 p-4 sm:border-b-0 sm:border-r sm:pb-5">
              {!query.trim() ? (
                <div className="mb-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{copy.popularSearches}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {localizedPopularSearches.map((term) => (
                      <button
                        type="button"
                        key={term}
                        onClick={() => updateQuery(term)}
                        className="storefront-action storefront-panel-row inline-flex min-h-10 items-center rounded-full border border-[var(--border)] px-3 text-xs font-medium hover:border-[var(--foreground)]"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {recent.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{copy.recent}</p>
                  <div className="mt-3 grid gap-1">
                    {recent.map((term) => (
                      <button
                        type="button"
                        key={term}
                        onClick={() => updateQuery(term)}
                        className="storefront-action flex min-h-10 items-center gap-2 text-start text-sm hover:text-[var(--accent-text)]"
                      >
                        <Clock3 className="size-3.5" />
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {results.categories.length ? (
                <div className={recent.length ? "mt-7" : ""}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{copy.categories}</p>
                  <div className="mt-3 grid gap-1">
                    {results.categories.map((category, index) => (
                      <Dialog.Close key={category} asChild>
                        <Link
                          href={localize(`/shop?category=${encodeURIComponent(category)}`)}
                          onClick={() => {
                            remember(query || category);
                            trackPredictiveClick({
                              resultType: "category",
                              resultId: category,
                              href: `/shop?category=${encodeURIComponent(category)}`,
                              position: index,
                            });
                          }}
                          className="storefront-action flex min-h-10 items-center text-sm hover:text-[var(--accent-text)]"
                        >
                          {category}
                        </Link>
                      </Dialog.Close>
                    ))}
                  </div>
                </div>
              ) : null}

              {results.collections.length ? (
                <div className="mt-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{copy.collections}</p>
                  <div className="mt-3 grid gap-1">
                    {results.collections.map((collection, index) => (
                      <Dialog.Close key={collection.slug} asChild>
                        <Link
                          href={localize(`/collections/${collection.slug}`)}
                          onClick={() => {
                            remember(query || collection.name);
                            trackPredictiveClick({
                              resultType: "collection",
                              resultId: collection.slug,
                              href: `/collections/${collection.slug}`,
                              position: index,
                            });
                          }}
                          className="storefront-action flex min-h-10 items-center text-sm hover:text-[var(--accent-text)]"
                        >
                          {collection.name}
                        </Link>
                      </Dialog.Close>
                    ))}
                  </div>
                </div>
              ) : null}

              {results.pages.length ? (
                <div className="mt-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{copy.helpContent}</p>
                  <div className="mt-3 grid gap-2">
                    {results.pages.map((page, index) => (
                      <Dialog.Close key={page.href} asChild>
                        <Link
                          href={localize(page.href)}
                          onClick={() => {
                            remember(query || page.title);
                            trackPredictiveClick({
                              resultType: "page",
                              resultId: page.href,
                              href: localize(page.href),
                              position: index,
                            });
                          }}
                          className="storefront-action block min-h-11 rounded-none border border-transparent py-2 text-sm hover:text-[var(--accent-text)]"
                        >
                          <span className="block font-medium">{page.title}</span>
                          <span className="mt-0.5 block text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                            {page.category}
                          </span>
                        </Link>
                      </Dialog.Close>
                    ))}
                  </div>
                </div>
              ) : null}
            </aside>

            <div className="p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  {query.trim() ? copy.products : copy.popularNow}
                </p>
                {query.trim() ? (
                  <button type="button" onClick={() => submit()} className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                    {copy.viewAll}
                    <ArrowRight className="size-4" />
                  </button>
                ) : null}
              </div>

              {!query.trim() ? (
                <div className="mb-5 grid gap-2 sm:grid-cols-4">
                  {localizedQuickCategories.map((category) => (
                    <Dialog.Close key={category} asChild>
                      <Link
                        href={localize(`/shop?category=${encodeURIComponent(category)}`)}
                        className="storefront-action storefront-panel-row flex min-h-11 items-center justify-between border border-[var(--border)] px-3 text-sm hover:border-[var(--foreground)]"
                      >
                        {category}
                        <ArrowRight className="size-4" />
                      </Link>
                    </Dialog.Close>
                  ))}
                </div>
              ) : null}

              <div id="predictive-search-results" role="listbox" className="grid gap-2">
                {results.products.map((product, index) => (
                  <Dialog.Close key={product.id} asChild>
                    <Link
                      id={`search-product-${product.id}`}
                      role="option"
                      aria-selected={activeIndex === index}
                      href={localize(`/product/${product.slug}`)}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => {
                        remember(query || product.name);
                        trackPredictiveClick({
                          resultType: "product",
                          resultId: product.id,
                          href: `/product/${product.slug}`,
                          position: index,
                        });
                      }}
                    className={`storefront-action grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--border)] px-2 py-2.5 outline-none sm:grid-cols-[64px_minmax(0,1fr)_auto] ${
                        activeIndex === index ? "bg-[var(--hover)]" : ""
                      }`}
                    >
                      <div className="storefront-product-media relative aspect-square overflow-hidden">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="64px"
                          quality={85}
                          priority={index === 0}
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium"><Highlight text={product.name} query={query} /></p>
                        <p className="mt-1 truncate text-xs text-[var(--muted)]">
                          {product.category}{product.colors.length ? ` · ${product.colors.join(", ")}` : ""}
                        </p>
                      </div>
                    <p className="whitespace-nowrap text-sm">{formatAed(product.price, locale)}</p>
                    </Link>
                  </Dialog.Close>
                ))}

                {!loading && query.trim() && !results.products.length ? (
                  <div className="py-12 text-center">
                    <p className="font-medium">{copy.noDirectMatches}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">{copy.noDirectMatchesBody}</p>
                    {results.suggestedQuery ? (
                      <button type="button" onClick={() => updateQuery(results.suggestedQuery ?? "")} className="storefront-action mt-3 font-semibold underline underline-offset-4">
                        {copy.didYouMean} “{results.suggestedQuery}”?
                      </button>
                    ) : null}
                    <button type="button" onClick={() => submit()} className="storefront-action mt-5 min-h-10 px-2 underline underline-offset-4">
                      {copy.openFullSearch}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
