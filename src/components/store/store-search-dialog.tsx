"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, Clock3, Search, X } from "lucide-react";
import { trackSearchClick } from "@/lib/search-click-client";
import { formatAed } from "@/lib/utils";

type PredictiveResults = {
  query: string;
  redirect?: string;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const requestSequence = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PredictiveResults>(emptyResults);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const productLinks = results.products.map((product) => `/product/${product.slug}`);

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
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
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
  }, [open, query]);

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
          href: `/product/${product.slug}`,
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
    router.push(results.redirect || `/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={false}>
      {showTrigger ? (
        <Dialog.Trigger asChild>
          <button type="button" aria-label="Search" className="grid size-11 place-items-center">
            <Search className="size-5" />
          </button>
        </Dialog.Trigger>
      ) : null}
      <Dialog.Portal>
        <Dialog.Overlay className="storefront-overlay fixed inset-0 z-[110] bg-black/65 backdrop-blur-sm" />
        <Dialog.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            loadRecentSearches();
            inputRef.current?.focus();
          }}
          className="storefront-top-sheet fixed inset-x-0 top-0 z-[110] mx-auto flex max-h-dvh w-full flex-col overflow-hidden bg-[var(--surface)] text-[var(--foreground)] shadow-2xl outline-none sm:inset-x-5 sm:top-16 sm:max-h-[calc(100dvh-5rem)] sm:max-w-3xl"
        >
          <Dialog.Title className="sr-only">Search products and collections</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search products, categories, collections, colors, tags, and product codes.
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
              aria-label="Search products"
              aria-expanded={results.products.length > 0}
              aria-controls="predictive-search-results"
              aria-activedescendant={activeIndex >= 0 ? `search-product-${results.products[activeIndex]?.id}` : undefined}
              autoComplete="off"
              placeholder="Search products, colors, categories..."
              className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none sm:text-lg"
            />
            {loading && query.trim() ? <span className="text-xs uppercase tracking-widest text-[var(--muted)]">Searching</span> : null}
            <Dialog.Close asChild>
              <button type="button" aria-label="Close search" className="storefront-action grid size-10 shrink-0 place-items-center">
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </form>

          <div className="grid min-h-72 flex-1 overflow-y-auto sm:grid-cols-[200px_minmax(0,1fr)]">
            <aside className="border-b border-[var(--border)] p-4 sm:border-b-0 sm:border-r sm:pb-5">
              {recent.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Recent</p>
                  <div className="mt-3 grid gap-1">
                    {recent.map((term) => (
                      <button
                        type="button"
                        key={term}
                        onClick={() => updateQuery(term)}
                        className="storefront-action flex min-h-10 items-center gap-2 text-start text-sm hover:text-[var(--accent)]"
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
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Categories</p>
                  <div className="mt-3 grid gap-1">
                    {results.categories.map((category, index) => (
                      <Dialog.Close key={category} asChild>
                        <Link
                          href={`/shop?category=${encodeURIComponent(category)}`}
                          onClick={() => {
                            remember(query || category);
                            trackPredictiveClick({
                              resultType: "category",
                              resultId: category,
                              href: `/shop?category=${encodeURIComponent(category)}`,
                              position: index,
                            });
                          }}
                          className="storefront-action flex min-h-10 items-center text-sm hover:text-[var(--accent)]"
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
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Collections</p>
                  <div className="mt-3 grid gap-1">
                    {results.collections.map((collection, index) => (
                      <Dialog.Close key={collection.slug} asChild>
                        <Link
                          href={`/collections/${collection.slug}`}
                          onClick={() => {
                            remember(query || collection.name);
                            trackPredictiveClick({
                              resultType: "collection",
                              resultId: collection.slug,
                              href: `/collections/${collection.slug}`,
                              position: index,
                            });
                          }}
                          className="storefront-action flex min-h-10 items-center text-sm hover:text-[var(--accent)]"
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
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Help & content</p>
                  <div className="mt-3 grid gap-2">
                    {results.pages.map((page, index) => (
                      <Dialog.Close key={page.href} asChild>
                        <Link
                          href={page.href}
                          onClick={() => {
                            remember(query || page.title);
                            trackPredictiveClick({
                              resultType: "page",
                              resultId: page.href,
                              href: page.href,
                              position: index,
                            });
                          }}
                          className="storefront-action block rounded-none border border-transparent py-2 text-sm hover:text-[var(--accent)]"
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
                  {query.trim() ? "Products" : "Popular now"}
                </p>
                {query.trim() ? (
                  <button type="button" onClick={() => submit()} className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                    View all
                    <ArrowRight className="size-4" />
                  </button>
                ) : null}
              </div>

              <div id="predictive-search-results" role="listbox" className="grid gap-2">
                {results.products.map((product, index) => (
                  <Dialog.Close key={product.id} asChild>
                    <Link
                      id={`search-product-${product.id}`}
                      role="option"
                      aria-selected={activeIndex === index}
                      href={`/product/${product.slug}`}
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
                    className={`storefront-action grid grid-cols-[64px_1fr_auto] items-center gap-3 border-b border-[var(--border)] py-2.5 outline-none ${
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
                      <p className="text-sm">{formatAed(product.price)}</p>
                    </Link>
                  </Dialog.Close>
                ))}

                {!loading && query.trim() && !results.products.length ? (
                  <div className="py-12 text-center">
                    <p className="font-medium">No direct product matches</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">Try a category, color, material, support topic, or shorter term.</p>
                    <button type="button" onClick={() => submit()} className="mt-5 underline underline-offset-4">
                      Open full search
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
