"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react";
import type { Category, Collection, Product } from "@/lib/catalog";
import { trackFilterEvent } from "@/lib/filter-analytics-client";
import { defaultFilterSettings } from "@/lib/filter-settings";
import { deriveFilterOptions, filterProducts } from "@/lib/product-filters";
import { ProductCard } from "./product-card";
import { ShopFilterDrawer } from "./shop-filter-drawer";
import { catalogCopy, localeFromPathname } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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

const initialProductCount = 24;

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
  const locale = localeFromPathname(pathname);
  const copy = catalogCopy[locale];
  const localizedSortOptions = sortOptions.map((option, index) => ({
    ...option,
    label: [copy.sortRecommended, copy.sortNewest, copy.sortNameAsc, copy.sortNameDesc, copy.sortPriceLow, copy.sortPriceHigh][index],
  }));
  const searchParams = useSearchParams();
  const [activeGroup, setActiveGroup] = useState<FilterGroup | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(initialProductCount);
  const drawerUnmountTimer = useRef<number | undefined>(undefined);

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
  const { colors, sizes, genders, materials, styles } = filterOptions;
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

  useEffect(() => {
    const closeForSurface = () => {
      setActiveGroup(null);
      setDrawerOpen(false);
      if (drawerUnmountTimer.current) window.clearTimeout(drawerUnmountTimer.current);
      drawerUnmountTimer.current = window.setTimeout(() => setDrawerMounted(false), 260);
    };
    window.addEventListener("velora:surface-open", closeForSurface);
    return () => window.removeEventListener("velora:surface-open", closeForSurface);
  }, []);

  function updateFilter(key: FilterKey, nextValue: string) {
    setVisibleCount(initialProductCount);
    const params = new URLSearchParams(searchParams.toString());
    const clearing = nextValue === defaults[key] || (key === "collection" && collection);
    if (clearing) params.delete(key);
    else params.set(key, nextValue);
    trackFilterEvent({ path: pathname, filterKey: key, value: nextValue, action: clearing ? "clear" : "apply", resultCount: filtered.length });
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function reset() {
    setVisibleCount(initialProductCount);
    const params = new URLSearchParams();
    for (const key of preserveParams) {
      const preserved = searchParams.get(key);
      if (preserved) params.set(key, preserved);
    }
    trackFilterEvent({ path: pathname, filterKey: "all", value: "all", action: "reset", resultCount: products.length });
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    setActiveGroup(null);
  }

  function openFilterDrawer(group: FilterGroup) {
    if (drawerUnmountTimer.current) window.clearTimeout(drawerUnmountTimer.current);
    setActiveGroup(group);
    setDrawerMounted(true);
    setDrawerOpen(true);
  }

  function handleDrawerOpenChange(open: boolean) {
    setDrawerOpen(open);
    if (!open) drawerUnmountTimer.current = window.setTimeout(() => setDrawerMounted(false), 260);
  }

  const activeFilterSettings = useMemo(() => {
    const collectionSettings = collection
      ? collections.find((item) => item.slug === collection)?.filterSettings
      : selectedCollection !== "All"
        ? collections.find((item) => item.slug === selectedCollection)?.filterSettings
        : undefined;
    const categorySettings = category !== "All" ? categoryDetails.find((item) => item.name === category || item.slug === category)?.filterSettings : undefined;
    return collectionSettings ?? categorySettings ?? defaultFilterSettings;
  }, [category, categoryDetails, collection, collections, selectedCollection]);

  const groupOrderIndex = new Map(activeFilterSettings.groupOrder.map((group, index) => [group, index]));
  const groupLabels = [
    { label: copy.sort, value: "sort" as const, visible: true },
    { label: copy.gender, value: "gender" as const, visible: genders.length > 0 },
    { label: copy.size, value: "size" as const, visible: sizes.length > 0 },
    { label: copy.type, value: "type" as const, visible: visibleCategories.length > 0 },
    { label: copy.style, value: "style" as const, visible: styles.length > 0 },
    { label: copy.color, value: "color" as const, visible: colors.length > 0 },
    { label: copy.collection, value: "collection" as const, visible: !collection && visibleCollections.length > 0 },
    { label: copy.material, value: "material" as const, visible: materials.length > 0 },
  ]
    .filter((group) => group.visible && !activeFilterSettings.hiddenGroups.includes(group.value))
    .sort((a, b) => (groupOrderIndex.get(a.value) ?? 99) - (groupOrderIndex.get(b.value) ?? 99));

  const optionButton = (active: boolean, label: string, onClick: () => void) => (
    <button type="button" key={label} onClick={onClick} aria-pressed={active} className="chip justify-start text-start">
      {label}
    </button>
  );

  const panel = (group: FilterGroup) => {
    if (group === "sort") return localizedSortOptions.map((option) => optionButton(sort === option.value, option.label, () => updateFilter("sort", option.value)));
    if (group === "gender") return ["All", ...genders].map((item) => optionButton(gender === item, item === "All" ? copy.all : item, () => updateFilter("gender", item)));
    if (group === "size") return ["All", ...sizes].map((item) => optionButton(size === item, item === "All" ? copy.allSizes : item, () => updateFilter("size", item)));
    if (group === "type") return ["All", ...visibleCategories].map((item) => optionButton(category === item, item === "All" ? copy.allTypes : item, () => updateFilter("category", item)));
    if (group === "style") return ["All", ...styles].map((item) => optionButton(style === item, item === "All" ? copy.allStyles : item, () => updateFilter("style", item)));
    if (group === "collection") {
      return ["All", ...visibleCollections.map((item) => item.slug)].map((item) => {
        const label = item === "All" ? copy.allCollections : visibleCollections.find((entry) => entry.slug === item)?.name ?? item;
        return optionButton(selectedCollection === item, label, () => updateFilter("collection", item));
      });
    }
    if (group === "color") return ["All", ...colors].map((item) => optionButton(color === item, item === "All" ? copy.allColors : item, () => updateFilter("color", item)));
    return ["All", ...materials].map((item) => optionButton(material === item, item === "All" ? copy.allMaterials : item, () => updateFilter("material", item)));
  };

  const activeCategoryDescription = category !== "All" ? categoryDetails.find((item) => item.name === category)?.description : undefined;
  const drawerSections = groupLabels.map((group) => group.value);
  const chips = [
    category !== "All" ? { key: "category" as const, label: category } : null,
    size !== "All" ? { key: "size" as const, label: size } : null,
    color !== "All" ? { key: "color" as const, label: color } : null,
    !collection && selectedCollection !== "All" ? { key: "collection" as const, label: collections.find((item) => item.slug === selectedCollection)?.name ?? selectedCollection } : null,
    sort !== "popular" ? { key: "sort" as const, label: localizedSortOptions.find((item) => item.value === sort)?.label ?? sort } : null,
    gender !== "All" ? { key: "gender" as const, label: gender } : null,
    style !== "All" ? { key: "style" as const, label: style } : null,
    material !== "All" ? { key: "material" as const, label: material } : null,
  ].filter(Boolean) as { key: FilterKey; label: string }[];
  const suggestedEdits =
    locale === "ar"
      ? []
      : ([
          visibleCategories.includes("Sports Bras") ? { label: "Sports bras", body: "Support for training and studio movement", key: "category" as const, value: "Sports Bras" } : null,
          visibleCategories.includes("Leggings") ? { label: "Leggings", body: "Sculpting comfort from workouts to everyday wear", key: "category" as const, value: "Leggings" } : null,
          visibleCategories.includes("Jackets") ? { label: "Active layers", body: "Lightweight coverage for warm-ups and active days", key: "category" as const, value: "Jackets" } : null,
          materials.includes("Cotton") ? { label: "Soft cotton", body: "Breathable comfort for low-impact days", key: "material" as const, value: "Cotton" } : null,
        ].filter(Boolean).slice(0, 3) as Array<{ label: string; body: string; key: FilterKey; value: string }>);

  const chipList = (prefix: string, extraClass?: string) =>
    chips.map((chip) => (
      <button type="button" key={`${prefix}-${chip.key}-${chip.label}`} onClick={() => updateFilter(chip.key, defaults[chip.key])} aria-pressed className={cn("chip chip-sm chip-pill gap-2", extraClass)}>
        <span className="min-w-0 break-words">{chip.label}</span>
        <X className="size-3.5 shrink-0" />
      </button>
    ));

  return (
    <div>
      {activeCategoryDescription ? <p className="mb-6 max-w-2xl text-sm leading-6 text-[var(--muted)]">{activeCategoryDescription}</p> : null}

      {!chips.length && suggestedEdits.length ? (
        <div className="mb-8 grid gap-px overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
          {suggestedEdits.map((edit) => (
            <button
              type="button"
              key={`${edit.key}-${edit.value}`}
              onClick={() => updateFilter(edit.key, edit.value)}
              className="group flex min-h-20 items-center justify-between gap-4 bg-[var(--surface)] px-5 py-4 text-left transition hover:bg-[var(--hover)]"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">{edit.label}</span>
                <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{edit.body}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--foreground)] rtl:rotate-180" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="sticky top-16 z-20 -mx-5 mb-8 border-y border-[var(--border)] bg-[var(--background)]/92 px-5 backdrop-blur sm:-mx-8 sm:px-8 md:top-[72px] lg:-mx-12 lg:px-12">
        <div className="flex flex-wrap items-center gap-3 py-3">
          <button type="button" onClick={() => openFilterDrawer("sort")} className="btn btn-soft btn-sm lg:hidden">
            <SlidersHorizontal className="size-4" />
            {copy.filterSort}
            {chips.length ? <span className="storefront-count-badge">{chips.length}</span> : null}
          </button>
          <div className="hidden min-w-0 flex-1 items-center gap-2 overflow-x-auto lg:flex">
            {groupLabels.map((group) => (
              <button
                type="button"
                key={group.value}
                data-filter-trigger={group.value}
                onClick={() => setActiveGroup(activeGroup === group.value ? null : group.value)}
                aria-expanded={activeGroup === group.value}
                aria-pressed={activeGroup === group.value}
                className="chip chip-sm chip-pill gap-1.5"
              >
                {group.label}
                <ChevronDown className={cn("size-3.5 transition-transform", activeGroup === group.value && "rotate-180")} />
              </button>
            ))}
          </div>
          <p className="ms-auto shrink-0 text-sm text-[var(--muted)]" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? copy.productFound : copy.productsFound}
          </p>
          {chips.length ? (
            <button type="button" onClick={reset} className="btn btn-link btn-sm hidden sm:inline-flex">
              {copy.clear}
            </button>
          ) : null}
        </div>

        {activeGroup ? (
          <div className="storefront-expand-in hidden border-t border-[var(--border)] py-5 lg:block" data-filter-panel={activeGroup} aria-label={`${groupLabels.find((group) => group.value === activeGroup)?.label ?? activeGroup} filter options`}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="eyebrow eyebrow-muted">{groupLabels.find((group) => group.value === activeGroup)?.label ?? activeGroup}</p>
              <button type="button" onClick={() => setActiveGroup(null)} className="btn btn-ghost btn-sm">
                {copy.close}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">{panel(activeGroup)}</div>
          </div>
        ) : null}

        {chips.length ? <div className="flex min-w-0 flex-wrap gap-2 border-t border-[var(--border)] py-3">{chipList("bar")}</div> : null}
      </div>

      {drawerMounted ? (
        <ShopFilterDrawer
          open={drawerOpen}
          onOpenChange={handleDrawerOpenChange}
          matchCount={filtered.length}
          chips={
            chips.length ? (
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-5 py-4">
                {chipList("drawer")}
                <button type="button" onClick={reset} className="btn btn-link btn-sm ms-auto">
                  {copy.clearAll}
                </button>
              </div>
            ) : null
          }
        >
          {drawerSections.map((section) => (
            <div key={section} className="border-b border-[var(--border)]">
              <button type="button" onClick={() => setActiveGroup(activeGroup === section ? null : section)} aria-expanded={activeGroup === section} className="flex w-full items-center justify-between px-5 py-5 text-start text-base font-medium hover:bg-[var(--hover)]">
                {groupLabels.find((group) => group.value === section)?.label ?? section}
                {activeGroup === section ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
              </button>
              {activeGroup === section ? <div className="storefront-expand-in flex flex-wrap gap-2 px-5 pb-6">{panel(section)}</div> : null}
            </div>
          ))}
        </ShopFilterDrawer>
      ) : null}

      {filtered.length ? (
        <>
          <div className="storefront-stagger grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 sm:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} imageSizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw" />
            ))}
          </div>
          {visibleProducts.length < filtered.length ? (
            <div className="mt-16 flex flex-col items-center gap-4 border-t border-[var(--border)] pt-10">
              <p className="text-sm text-[var(--muted)]">
                {copy.showing} {visibleProducts.length} {copy.of} {filtered.length} {copy.productsFound}
              </p>
              <button type="button" onClick={() => setVisibleCount((count) => count + initialProductCount)} className="btn btn-secondary">
                {copy.loadMore}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="card px-6 py-20 text-center">
          <p className="display-md">{copy.noFilterMatches}</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">{copy.noFilterMatchesBody}</p>
          {chips.length ? <div className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2">{chipList("empty")}</div> : null}
          <button type="button" onClick={reset} className="btn btn-primary mt-8">
            {copy.resetFilters}
          </button>
        </div>
      )}
    </div>
  );
}
