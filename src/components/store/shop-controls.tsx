"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react";
import type { Category, Collection, Product } from "@/lib/catalog";
import { trackFilterEvent } from "@/lib/filter-analytics-client";
import { defaultFilterSettings } from "@/lib/filter-settings";
import { deriveFilterOptions, filterProducts } from "@/lib/product-filters";
import { ProductCard } from "./product-card";

type FilterGroup = "sort" | "gender" | "size" | "type" | "style" | "color" | "collection" | "material";
type FilterKey = Exclude<FilterGroup, "type"> | "category";

const sortOptions = [
  { label: "Recommended", value: "popular" },
  { label: "Newest", value: "latest" },
  { label: "Name: A - Z", value: "name-asc" },
  { label: "Name: Z - A", value: "name-desc" },
  { label: "Price: Low to High", value: "low" },
  { label: "Price: High to Low", value: "high" },
] as const;

const defaults: Record<FilterKey, string> = {
  sort: "popular",
  gender: "All",
  size: "All",
  category: "All",
  style: "All",
  color: "All",
  collection: "All",
  material: "All",
};

export function stableSort(products: Product[], sort: string, collection?: string) {
  return [...products].sort((a, b) => {
    let result = 0;
    if (sort === "latest") result = Number(Boolean(b.newArrival)) - Number(Boolean(a.newArrival));
    else if (sort === "name-asc") result = a.name.localeCompare(b.name);
    else if (sort === "name-desc") result = b.name.localeCompare(a.name);
    else if (sort === "low") result = (a.salePrice ?? a.price) - (b.salePrice ?? b.price);
    else if (sort === "high") result = (b.salePrice ?? b.price) - (a.salePrice ?? a.price);
    else if (collection) {
      const aMerchandising = a.collectionMerchandising?.[collection];
      const bMerchandising = b.collectionMerchandising?.[collection];
      result =
        Number(Boolean(bMerchandising?.pinned)) - Number(Boolean(aMerchandising?.pinned)) ||
        (aMerchandising?.sortOrder ?? 10_000) - (bMerchandising?.sortOrder ?? 10_000) ||
        Number(Boolean(b.bestSeller)) - Number(Boolean(a.bestSeller)) ||
        b.rating - a.rating;
    } else result = Number(Boolean(b.bestSeller)) - Number(Boolean(a.bestSeller)) || b.rating - a.rating;
    return result || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
}

export function ShopControls({
  collection,
  products,
  categories,
  categoryDetails = [],
  collections,
  preserveParams = [],
}: {
  collection?: string;
  products: Product[];
  categories: string[];
  categoryDetails?: Category[];
  collections: Collection[];
  preserveParams?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeGroup, setActiveGroup] = useState<FilterGroup | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

  const value = (key: FilterKey) => searchParams.get(key) ?? defaults[key];
  const category = value("category");
  const size = value("size");
  const color = value("color");
  const selectedCollection = collection ?? value("collection");
  const sort = value("sort");
  const gender = value("gender");
  const style = value("style");
  const material = value("material");

  const filterOptions = useMemo(
    () => deriveFilterOptions({ products, categories, collections, currentCollection: collection }),
    [categories, collection, collections, products],
  );
  const colors = filterOptions.colors;
  const sizes = filterOptions.sizes;
  const genders = filterOptions.genders;
  const materials = filterOptions.materials;
  const styles = filterOptions.styles;
  const visibleCategories = filterOptions.categories;
  const visibleCollections = filterOptions.collections;

  const filtered = useMemo(() => {
    const list = filterProducts({ products, collection, selectedCollection, category, size, color, gender, style, material });
    return stableSort(list, sort, collection);
  }, [category, collection, color, gender, material, products, selectedCollection, size, sort, style]);
  const visibleProducts = filtered.slice(0, visibleCount);

  useEffect(() => {
    const savedPath = sessionStorage.getItem("velora-product-list-path");
    const currentPath = `${window.location.pathname}${window.location.search}`;
    const savedScroll = Number(sessionStorage.getItem("velora-product-list-scroll"));
    if (savedPath !== currentPath || !Number.isFinite(savedScroll)) return;

    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: savedScroll }));
    sessionStorage.removeItem("velora-product-list-path");
    sessionStorage.removeItem("velora-product-list-scroll");
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function updateFilter(key: FilterKey, nextValue: string) {
    setVisibleCount(20);
    const params = new URLSearchParams(searchParams.toString());
    const action = nextValue === defaults[key] || (key === "collection" && collection) ? "clear" : "apply";
    if (nextValue === defaults[key] || (key === "collection" && collection)) params.delete(key);
    else params.set(key, nextValue);
    trackFilterEvent({
      path: pathname,
      filterKey: key,
      value: nextValue,
      action,
      resultCount: filtered.length,
    });
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function reset() {
    setVisibleCount(20);
    const params = new URLSearchParams();
    for (const key of preserveParams) {
      const preserved = searchParams.get(key);
      if (preserved) params.set(key, preserved);
    }
    trackFilterEvent({
      path: pathname,
      filterKey: "all",
      value: "all",
      action: "reset",
      resultCount: products.length,
    });
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    setActiveGroup(null);
  }

  function openDrawer(group: FilterGroup) {
    setActiveGroup(group);
    setDrawerOpen(true);
  }

  const activeFilterSettings = useMemo(() => {
    const collectionSettings = collection
      ? collections.find((item) => item.slug === collection)?.filterSettings
      : selectedCollection !== "All"
      ? collections.find((item) => item.slug === selectedCollection)?.filterSettings
      : undefined;
    const categorySettings = category !== "All"
      ? categoryDetails.find((item) => item.name === category || item.slug === category)?.filterSettings
      : undefined;
    return collectionSettings ?? categorySettings ?? defaultFilterSettings;
  }, [category, categoryDetails, collection, collections, selectedCollection]);

  const groupOrderIndex = new Map(activeFilterSettings.groupOrder.map((group, index) => [group, index]));
  const groupLabels = [
    { label: "Sort", value: "sort" as const, visible: true },
    { label: "Gender", value: "gender" as const, visible: genders.length > 0 },
    { label: "Size", value: "size" as const, visible: sizes.length > 0 },
    { label: "Type", value: "type" as const, visible: visibleCategories.length > 0 },
    { label: "Style", value: "style" as const, visible: styles.length > 0 },
    { label: "Color", value: "color" as const, visible: colors.length > 0 },
    { label: "Collection", value: "collection" as const, visible: !collection && visibleCollections.length > 0 },
    { label: "Material", value: "material" as const, visible: materials.length > 0 },
  ]
    .filter((group) => group.visible && !activeFilterSettings.hiddenGroups.includes(group.value))
    .sort((a, b) => (groupOrderIndex.get(a.value) ?? 99) - (groupOrderIndex.get(b.value) ?? 99));

  const optionButton = (active: boolean, label: string, onClick: () => void) => (
    <button
      type="button"
      key={label}
      onClick={onClick}
      aria-pressed={active}
      className={`min-w-0 border px-4 py-3 text-start text-sm transition motion-reduce:transition-none ${
        active ? "border-[var(--foreground)] bg-[var(--hover)]" : "border-[var(--border)] hover:bg-[var(--hover)]"
      }`}
    >
      <span className="block break-words">{label}</span>
    </button>
  );

  const panel = (group: FilterGroup) => {
    if (group === "sort") {
      return sortOptions.map((option) => optionButton(sort === option.value, option.label, () => updateFilter("sort", option.value)));
    }
    if (group === "gender") {
      return ["All", ...genders].map((item) => optionButton(gender === item, item, () => updateFilter("gender", item)));
    }
    if (group === "size") {
      return ["All", ...sizes].map((item) => optionButton(size === item, item === "All" ? "All sizes" : item, () => updateFilter("size", item)));
    }
    if (group === "type") {
      return ["All", ...visibleCategories].map((item) => optionButton(category === item, item === "All" ? "All types" : item, () => updateFilter("category", item)));
    }
    if (group === "style") {
      return ["All", ...styles].map((item) => optionButton(style === item, item === "All" ? "All styles" : item, () => updateFilter("style", item)));
    }
    if (group === "collection") {
      return ["All", ...visibleCollections.map((item) => item.slug)].map((item) => {
        const label = item === "All" ? "All collections" : visibleCollections.find((entry) => entry.slug === item)?.name ?? item;
        return optionButton(selectedCollection === item, label, () => updateFilter("collection", item));
      });
    }
    if (group === "color") {
      return ["All", ...colors].map((item) => optionButton(color === item, item === "All" ? "All colors" : item, () => updateFilter("color", item)));
    }
    return ["All", ...materials].map((item) => optionButton(material === item, item === "All" ? "All materials" : item, () => updateFilter("material", item)));
  };

  const activeCategoryDescription =
    category !== "All" ? categoryDetails.find((item) => item.name === category)?.description : undefined;

  const drawerSections = groupLabels.map((group) => group.value);
  const chips = [
    category !== "All" ? { key: "category" as const, label: category } : null,
    size !== "All" ? { key: "size" as const, label: size } : null,
    color !== "All" ? { key: "color" as const, label: color } : null,
    !collection && selectedCollection !== "All"
      ? { key: "collection" as const, label: collections.find((item) => item.slug === selectedCollection)?.name ?? selectedCollection }
      : null,
    sort !== "popular" ? { key: "sort" as const, label: sortOptions.find((item) => item.value === sort)?.label ?? sort } : null,
    gender !== "All" ? { key: "gender" as const, label: gender } : null,
    style !== "All" ? { key: "style" as const, label: style } : null,
    material !== "All" ? { key: "material" as const, label: material } : null,
  ].filter(Boolean) as { key: FilterKey; label: string }[];

  return (
    <div>
      {activeCategoryDescription ? (
        <p className="mb-6 max-w-2xl text-sm leading-6 text-[var(--muted)]">{activeCategoryDescription}</p>
      ) : null}
      <div className="mb-8 border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-5 px-1 py-4 sm:px-4">
          <button
            type="button"
            onClick={() => openDrawer("sort")}
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] lg:hidden"
          >
            <SlidersHorizontal className="size-4" />
            Filter & sort
            {chips.length ? <span className="grid size-5 place-items-center bg-[var(--foreground)] text-[10px] text-[var(--background)]">{chips.length}</span> : null}
          </button>
          <div className="hidden min-w-0 flex-1 items-center gap-7 overflow-x-auto lg:flex">
            {groupLabels.map((group) => (
              <button
                type="button"
                key={group.value}
                onClick={() => openDrawer(group.value)}
                className="shrink-0 text-sm font-semibold uppercase tracking-[0.12em] transition hover:text-[var(--accent)] motion-reduce:transition-none"
              >
                {group.label}
              </button>
            ))}
          </div>
          <p className="ml-auto shrink-0 text-sm text-[var(--muted)]" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "product" : "products"}
          </p>
          {chips.length ? (
            <button
              type="button"
              onClick={reset}
              className="hidden shrink-0 text-sm font-semibold uppercase tracking-[0.12em] underline underline-offset-4 hover:text-[var(--accent)] sm:block"
            >
              Clear
            </button>
          ) : null}
        </div>

        {chips.length ? (
          <div className="flex min-w-0 flex-wrap gap-2 border-t border-[var(--border)] px-3 py-4 sm:px-4">
            {chips.map((chip) => (
              <button
                type="button"
                key={`${chip.key}-${chip.label}`}
                onClick={() => updateFilter(chip.key, defaults[chip.key])}
                className="inline-flex max-w-full min-w-0 items-center gap-2 bg-[var(--foreground)] px-3 py-2 text-left text-xs font-semibold text-[var(--background)]"
              >
                <span className="min-w-0 break-words">{chip.label}</span>
                <X className="size-3.5 shrink-0 text-[var(--accent)]" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-y-0 end-0 z-50 flex w-full max-w-xl flex-col bg-[var(--surface)] text-[var(--foreground)] shadow-2xl">
            <Dialog.Title className="sr-only">Filter and sort products</Dialog.Title>
            <Dialog.Description className="sr-only">
              Refine the product grid by sort order, category, size, color, collection, style, gender, and material.
            </Dialog.Description>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-5">
              <div>
                <p className="font-semibold">Filter & sort</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{filtered.length} matching {filtered.length === 1 ? "product" : "products"}</p>
              </div>
              <Dialog.Close asChild>
                <button type="button" aria-label="Close filters" className="grid size-10 place-items-center">
                  <X className="size-6" />
                </button>
              </Dialog.Close>
            </div>
            {chips.length ? (
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-5 py-4">
                {chips.map((chip) => (
                  <button
                    type="button"
                    key={`drawer-${chip.key}-${chip.label}`}
                    onClick={() => updateFilter(chip.key, defaults[chip.key])}
                    className="inline-flex max-w-full min-w-0 items-center gap-2 bg-[var(--foreground)] px-3 py-2 text-left text-xs font-semibold text-[var(--background)]"
                  >
                    <span className="min-w-0 break-words">{chip.label}</span>
                    <X className="size-3.5 shrink-0 text-[var(--accent)]" />
                  </button>
                ))}
                <button type="button" onClick={reset} className="ms-auto text-xs font-semibold uppercase underline underline-offset-4">
                  Clear all
                </button>
              </div>
            ) : null}
            <div className="flex-1 overflow-y-auto">
              {drawerSections.map((section) => (
                <div key={section} className="border-b border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setActiveGroup(activeGroup === section ? null : section)}
                    aria-expanded={activeGroup === section}
                    className="flex w-full items-center justify-between px-5 py-6 text-start text-lg font-semibold capitalize"
                  >
                    {groupLabels.find((group) => group.value === section)?.label ?? section}
                    {activeGroup === section ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
                  </button>
                  {activeGroup === section ? <div className="grid gap-3 px-5 pb-6 sm:grid-cols-2">{panel(section)}</div> : null}
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--border)] p-5">
              <Dialog.Close asChild>
                <button type="button" className="h-14 w-full bg-[var(--foreground)] text-sm font-semibold uppercase tracking-[0.16em] text-[var(--background)]">
                  View {filtered.length} {filtered.length === 1 ? "product" : "products"}
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {filtered.length ? (
        <>
          <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
            {visibleProducts.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 5} />)}
          </div>
          {visibleProducts.length < filtered.length ? (
            <div className="mt-14 flex flex-col items-center border-t border-[var(--border)] pt-8">
              <p className="text-sm text-[var(--muted)]">
                Showing {visibleProducts.length} of {filtered.length} products
              </p>
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + 20)}
                className="mt-4 min-h-12 border border-[var(--foreground)] px-8 text-sm font-semibold uppercase tracking-[0.12em] transition hover:bg-[var(--foreground)] hover:text-[var(--background)] motion-reduce:transition-none"
              >
                Load more
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="border-y border-[var(--border)] px-4 py-20 text-center">
          <p className="text-3xl font-medium">No products match these filters</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Clear the current filters or remove one selected value to return to available products.
          </p>
          {chips.length ? (
            <div className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
              {chips.map((chip) => (
                <button
                  type="button"
                  key={`empty-${chip.key}-${chip.label}`}
                  onClick={() => updateFilter(chip.key, defaults[chip.key])}
                  className="inline-flex max-w-full min-w-0 items-center gap-2 border border-[var(--border)] px-3 py-2 text-left text-xs font-semibold"
                >
                  <span className="min-w-0 break-words">{chip.label}</span>
                  <X className="size-3.5 shrink-0 text-[var(--accent)]" />
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="mt-6 bg-[var(--foreground)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--background)]"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
