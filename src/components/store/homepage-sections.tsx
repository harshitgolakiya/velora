import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, CreditCard, Ruler, Truck, Undo2 } from "lucide-react";
import { ProductScroller } from "@/components/store/product-scroller";
import { ProductCard } from "@/components/store/product-card";
import { compactProductsForList } from "@/lib/catalog-performance";
import { getCmsCategories, getCmsCollections, getCmsHomepageSections, getCmsProducts, requestLocale } from "@/lib/cms";
import type { Collection, Product } from "@/lib/catalog";
import type { StorefrontHomepageMediaItem, StorefrontHomepageSection } from "@/lib/catalog-db";
import { homeCopy, localizedPath } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type HomeCopy = (typeof homeCopy)["en"];

const C = "/images/campaign/";

function homeHref(copy: HomeCopy, href: string) {
  return localizedPath(href, copy === homeCopy.ar ? "ar" : "en");
}

const categoryImages: Record<string, string> = {
  Tops: `${C}tank-oat-front.webp`,
  "Sports Bras": `${C}bra-sage-front.webp`,
  Jackets: `${C}jacket-stone-zip.webp`,
  Leggings: `${C}legging-sage-back.webp`,
  Accessories: `${C}accessories-still.webp`,
};

const collectionImages: Record<string, string> = {
  "pilates-studio": `${C}campaign-reformer.webp`,
  "court-club": `${C}campaign-tennis.webp`,
  "everyday-motion": `${C}campaign-street.webp`,
  "training-core": `${C}hero-track.webp`,
};

function buildDefaultHomepageHero(copy: HomeCopy): StorefrontHomepageSection {
  return {
    id: "default-home-hero",
    key: "default-home-hero",
    type: "HERO",
    status: "PUBLISHED",
    title: copy.heroTitle,
    subtitle: copy.heroSubtitle,
    body: copy.heroBody,
    ctaLabel: copy.heroCta,
    ctaHref: "/shop",
    imageUrl: `${C}hero-courtyard.webp`,
    mobileImageUrl: `${C}campaign-sage-portrait.webp`,
    productIds: [],
    settings: {},
    categoryMediaItems: [],
  };
}

function productsForSection(section: StorefrontHomepageSection, products: Product[], fallback: Product[]) {
  if (!section.productIds.length) return fallback.slice(0, 12);
  const selected = section.productIds.map((id) => products.find((product) => product.id === id)).filter(Boolean) as Product[];
  const remaining = fallback.filter((product) => !selected.some((item) => item.id === product.id));
  return [...selected, ...remaining].slice(0, 12);
}

function editorialBody(section: StorefrontHomepageSection, fallback: string) {
  if (!section.body || section.body.toLowerCase().includes("merchandising rail")) return fallback;
  return section.body;
}

function focalPoint(section: StorefrontHomepageSection, target: "desktop" | "mobile" = "desktop") {
  const key = target === "mobile" ? "mobileFocalPoint" : "desktopFocalPoint";
  const value = section.settings[key];
  return typeof value === "string" && value.trim() ? value : "50% 50%";
}

function cropRatio(section: StorefrontHomepageSection, target: "desktop" | "mobile", fallback: string) {
  const key = target === "mobile" ? "mobileCropRatio" : "desktopCropRatio";
  const value = section.settings[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function cropStyle(section: StorefrontHomepageSection, fallback: { desktop: string; mobile: string }): CSSProperties {
  return {
    "--homepage-mobile-crop-ratio": cropRatio(section, "mobile", fallback.mobile),
    "--homepage-desktop-crop-ratio": cropRatio(section, "desktop", fallback.desktop),
  } as CSSProperties;
}

function productsForCollection(collection: Collection | undefined, products: Product[]) {
  if (!collection) return [];
  return products.filter((product) => product.collections?.includes(collection.slug) || product.collection === collection.slug);
}

function fillProductSlider(primary: Product[], fallback: Product[]) {
  const seen = new Set(primary.map((product) => product.id));
  return [...primary, ...fallback.filter((product) => !seen.has(product.id))].slice(0, 12);
}

function collectionImage(collection: Collection | undefined) {
  if (!collection) return `${C}hero-track.webp`;
  return collection.image || collectionImages[collection.slug] || `${C}hero-track.webp`;
}

function latestCollectionByProductActivity(collections: Collection[], products: Product[]) {
  if (!collections.length) return undefined;
  const scoreBySlug = new Map<string, number>();
  for (const product of products) {
    const updatedAt = product.updatedAt ? Date.parse(product.updatedAt) : 0;
    for (const slug of product.collections ?? [product.collection]) {
      scoreBySlug.set(slug, Math.max(scoreBySlug.get(slug) ?? 0, Number.isFinite(updatedAt) ? updatedAt : 0));
    }
  }
  return [...collections].sort((a, b) => (scoreBySlug.get(b.slug) ?? 0) - (scoreBySlug.get(a.slug) ?? 0))[0];
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

export function HomepageHero({ section, copy }: { section: StorefrontHomepageSection; copy: HomeCopy }) {
  const desktopImage = section.imageUrl ?? `${C}hero-courtyard.webp`;
  const mobileImage = section.mobileImageUrl ?? `${C}campaign-sage-portrait.webp`;

  return (
    <section className="relative h-svh min-h-[640px] overflow-hidden bg-[var(--card)] text-[var(--paper)]">
      <Image
        src={desktopImage}
        alt={section.title}
        fill
        priority
        fetchPriority="high"
        loading="eager"
        sizes="100vw"
        quality={78}
        style={{ objectPosition: focalPoint(section, "desktop") }}
        className="hidden object-cover sm:block"
      />
      <Image
        src={mobileImage}
        alt=""
        fill
        priority
        fetchPriority="high"
        loading="eager"
        sizes="100vw"
        quality={72}
        style={{ objectPosition: focalPoint(section, "mobile") }}
        className="object-cover sm:hidden"
      />
      <div className="photo-scrim-side absolute inset-0 hidden sm:block" />
      <div className="photo-scrim-bottom absolute inset-0" />

      <div className="storefront-container relative flex h-full items-end pb-12 pt-28 sm:pb-16 lg:items-center lg:pb-0">
        <div className="max-w-[720px]">
          {section.subtitle ? <p className="eyebrow eyebrow-light">{section.subtitle}</p> : null}
          <h1 className="display-xl mt-5 max-w-[11ch] text-[var(--paper)]">{section.title}</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-[var(--paper)]/82 sm:text-lg">{editorialBody(section, copy.heroBody)}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href={homeHref(copy, section.ctaHref ?? "/shop")} className="btn btn-on-photo btn-lg">
              {section.ctaLabel ?? copy.heroCta}
            </Link>
            <Link href={homeHref(copy, "/collections/pilates-studio")} className="btn btn-link text-[var(--paper)] hover:text-[var(--paper)]/80">
              {copy.viewTheCollection} <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </div>
      <p className="eyebrow eyebrow-light absolute bottom-6 end-6 hidden sm:block">{copy.designedForUae}</p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Value strip                                                         */
/* ------------------------------------------------------------------ */

export function HomepageValueStrip({ copy }: { copy: HomeCopy }) {
  const items = [copy.complimentaryDelivery, copy.consideredReturns, copy.personalFitGuidance, copy.securePayment, copy.designedForUae];
  const track = [...items, ...items];
  return (
    <div className="overflow-hidden border-b border-[var(--border)] bg-[var(--background)] py-4" aria-hidden="true">
      <div className="marquee">
        {track.map((item, index) => (
          <span key={`${item}-${index}`} className="eyebrow eyebrow-muted inline-flex items-center gap-12 whitespace-nowrap">
            {item}
            <span className="size-1 rounded-full bg-[var(--accent)]" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Category discovery                                                  */
/* ------------------------------------------------------------------ */

function buildFallbackCategoryMedia(categories: string[]): StorefrontHomepageMediaItem[] {
  return categories.slice(0, 6).map((category, index) => ({
    id: `fallback-category-${index}`,
    title: category,
    href: `/shop?category=${encodeURIComponent(category)}`,
    mediaType: "IMAGE",
    imageUrl: categoryImages[category] ?? `${C}campaign-sage-portrait.webp`,
  }));
}

function categoryNameFromMediaItem(item: StorefrontHomepageMediaItem) {
  try {
    const url = new URL(item.href, "https://velora.local");
    const category = url.searchParams.get("category");
    return category ? decodeURIComponent(category).trim() : item.title.trim();
  } catch {
    return item.title.trim();
  }
}

function normalizeCategoryName(category: string) {
  return category.trim().toLowerCase();
}

function currentCategoryMediaItems(items: StorefrontHomepageMediaItem[], categories: string[]) {
  const categorySet = new Set(categories.map(normalizeCategoryName));
  const referencesStaleCategory = items.some((item) => !categorySet.has(normalizeCategoryName(categoryNameFromMediaItem(item))));
  if (referencesStaleCategory) return [];
  return items
    .filter((item) => categorySet.has(normalizeCategoryName(categoryNameFromMediaItem(item))))
    .map((item) => {
      const category = categoryNameFromMediaItem(item);
      const fallback = categoryImages[category] ?? `${C}campaign-sage-portrait.webp`;
      return {
        ...item,
        imageUrl: item.imageUrl?.startsWith("/images/velora/") || item.imageUrl?.includes("activewear-demo") ? fallback : item.imageUrl,
        posterUrl: item.posterUrl?.startsWith("/images/velora/") ? fallback : item.posterUrl,
      };
    });
}

function productDisplayCategories(products: Product[], fallbackCategories: string[]) {
  const seen = new Set<string>();
  const productCategories = products
    .map((product) => product.category.trim())
    .filter(Boolean)
    .filter((category) => {
      const normalized = normalizeCategoryName(category);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  return productCategories.length ? productCategories : fallbackCategories;
}

function CategoryMediaAsset({ item, priority }: { item: StorefrontHomepageMediaItem; priority: boolean }) {
  if (item.mediaType === "CLOUDFLARE_STREAM" && item.cloudflareStreamId) {
    const streamId = item.cloudflareStreamId;
    const poster = item.posterUrl ? `&poster=${encodeURIComponent(item.posterUrl)}` : "";
    const customerDomain = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN;
    const iframeUrl = streamId.includes("cloudflarestream.com")
      ? `https://${streamId}/iframe?autoplay=true&muted=true&loop=true&controls=false${poster}`
      : streamId.includes("customer-")
        ? `https://${streamId}.cloudflarestream.com/iframe?autoplay=true&muted=true&loop=true&controls=false${poster}`
        : customerDomain
          ? `https://${customerDomain}/${streamId}/iframe?autoplay=true&muted=true&loop=true&controls=false${poster}`
          : `https://iframe.videodelivery.net/${streamId}?autoplay=true&muted=true&loop=true&controls=false${poster}`;
    return <iframe src={iframeUrl} title={item.title} className="absolute inset-0 h-full w-full scale-[1.01] border-0" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen />;
  }

  if (item.mediaType === "VIDEO" && item.videoUrl) {
    return <video className="absolute inset-0 h-full w-full object-cover" src={item.videoUrl} poster={item.posterUrl} autoPlay muted loop playsInline />;
  }

  return (
    <Image
      src={item.imageUrl || item.posterUrl || `${C}campaign-sage-portrait.webp`}
      alt={item.title}
      fill
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 70vw"
      quality={72}
      className="object-cover transition duration-700 ease-out group-hover:scale-[1.03]"
    />
  );
}

export function HomepageCategoryDiscovery({ section, categories, copy }: { section?: StorefrontHomepageSection; categories: string[]; copy: HomeCopy }) {
  const cmsItems = currentCategoryMediaItems(section?.categoryMediaItems ?? [], categories);
  const fallbackItems = buildFallbackCategoryMedia(categories).filter((item) => !cmsItems.some((cmsItem) => cmsItem.title === item.title || cmsItem.href === item.href));
  const items = [...cmsItems, ...fallbackItems].slice(0, 5);
  if (!items.length) return null;

  return (
    <section data-testid="home-category-media" className="section bg-[var(--background)]">
      <div className="storefront-container">
        <div className="section-head">
          <div>
            <p className="eyebrow">{section?.subtitle ?? copy.shopByCategory}</p>
            <h2 className="display-lg mt-3">{section?.title ?? copy.chooseYourRotation}</h2>
          </div>
          <Link href={homeHref(copy, section?.ctaHref ?? "/shop")} className="btn btn-link btn-sm">
            {section?.ctaLabel ?? copy.shopAll} <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
        </div>
        <div className="homepage-media-grid -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
          {items.map((item, index) => (
            <Link
              key={item.id}
              href={homeHref(copy, item.href)}
              data-home-category-tile
              className="storefront-media-tile storefront-product-media group relative block aspect-[3/4] w-[68vw] shrink-0 snap-start overflow-hidden sm:w-auto"
            >
              <CategoryMediaAsset item={item} priority={index < 2} />
              <div className="photo-scrim-bottom absolute inset-0" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-[var(--paper)]">
                <div>
                  <p className="eyebrow eyebrow-light">0{index + 1}</p>
                  <h3 className="display-md mt-1 text-[var(--paper)]">{item.title}</h3>
                </div>
                <span className="btn btn-on-photo btn-icon btn-sm btn-round shrink-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="size-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Editorial split (collection focus)                                  */
/* ------------------------------------------------------------------ */

export function HomepageEditorialSplit({ collection, copy, products }: { collection?: Collection; copy: HomeCopy; products: Product[] }) {
  if (!collection) return null;
  const count = productsForCollection(collection, products).length;
  return (
    <section className="border-y border-[var(--border)] bg-[var(--surface)]">
      <div className="grid lg:grid-cols-2">
        <Link href={homeHref(copy, `/collections/${collection.slug}`)} className="group relative block aspect-[4/5] overflow-hidden bg-[var(--card)] lg:aspect-auto lg:min-h-[720px]">
          <Image src={collectionImage(collection)} alt={collection.name} fill sizes="(min-width: 1024px) 50vw, 100vw" quality={78} className="object-cover transition duration-1000 group-hover:scale-[1.02]" />
        </Link>
        <div className="flex flex-col justify-center px-5 py-14 sm:px-10 lg:px-16 xl:px-24">
          <p className="eyebrow">{copy.collectionStudy}</p>
          <h2 className="display-lg mt-4 max-w-xl">{collection.name}</h2>
          <p className="storefront-body-copy mt-6 max-w-md text-[var(--muted)]">{collection.summary}</p>
          <dl className="mt-8 grid max-w-sm grid-cols-2 gap-6 border-t border-[var(--border)] pt-6 text-sm">
            <div>
              <dt className="eyebrow eyebrow-muted">{copy.performanceStyles}</dt>
              <dd className="display-md mt-2">{count || products.length}</dd>
            </div>
            <div>
              <dt className="eyebrow eyebrow-muted">{copy.seasonalEdit}</dt>
              <dd className="display-md mt-2">2026</dd>
            </div>
          </dl>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href={homeHref(copy, `/collections/${collection.slug}`)} className="btn btn-primary">
              {copy.exploreCollection}
            </Link>
            <Link href={homeHref(copy, "/fabric-guide")} className="btn btn-secondary">
              {copy.exploreTheFitGuide}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Intention edit                                                      */
/* ------------------------------------------------------------------ */

export function HomepageIntentionEdit({ copy }: { copy: HomeCopy }) {
  const intentions = [
    { title: copy.pilates, body: copy.pilatesBody, href: `/collections/pilates-studio`, image: `${C}campaign-reformer.webp` },
    { title: copy.activeDays, body: copy.activeDaysBody, href: `/collections/everyday-motion`, image: `${C}campaign-street.webp` },
    { title: copy.tennis, body: copy.tennisBody, href: `/collections/court-club`, image: `${C}campaign-tennis.webp` },
    { title: copy.yoga, body: copy.yogaBody, href: `/search?q=${encodeURIComponent(copy.yoga)}`, image: `${C}campaign-yoga.webp` },
  ];

  return (
    <section className="section bg-[var(--background)]">
      <div className="storefront-container">
        <div className="section-head">
          <div className="max-w-2xl">
            <p className="eyebrow">{copy.shopByIntention}</p>
            <h2 className="display-lg mt-3">{copy.intentionTitle}</h2>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {intentions.map((intention, index) => (
            <Link key={intention.title} href={homeHref(copy, intention.href)} data-home-intention-tile className="storefront-media-tile storefront-product-media group relative block aspect-[3/4] overflow-hidden text-[var(--paper)]">
              <Image src={intention.image} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" quality={72} className="object-cover transition duration-700 ease-out group-hover:scale-[1.03]" />
              <div className="photo-scrim-bottom absolute inset-0" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="eyebrow eyebrow-light">0{index + 1}</p>
                <h3 className="display-md mt-2 text-[var(--paper)]">{intention.title}</h3>
                <p className="mt-3 max-w-xs text-sm leading-6 text-[var(--paper)]/78">{intention.body}</p>
                <span className="btn btn-link mt-5 text-[var(--paper)] hover:text-[var(--paper)]/80">
                  {copy.shopEdit} <ArrowRight className="size-4 transition group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Full-bleed statement                                                */
/* ------------------------------------------------------------------ */

export function HomepageCollectionSpotlight({ collection, copy }: { collection?: Collection; copy: HomeCopy }) {
  if (!collection) return null;
  return (
    <section data-testid="home-spotlight" className="bg-[var(--background)]">
      <Link data-testid="home-spotlight-banner" href={homeHref(copy, `/collections/${collection.slug}`)} className="group relative block min-h-[70svh] overflow-hidden bg-[var(--card)] text-[var(--paper)] lg:min-h-[86svh]">
        <Image src={collectionImage(collection)} alt={collection.name} fill loading="lazy" fetchPriority="low" sizes="100vw" quality={76} className="object-cover transition duration-1000 group-hover:scale-[1.015]" />
        <div className="photo-scrim-side absolute inset-0" />
        <div className="photo-scrim-bottom absolute inset-0" />
        <div className="storefront-container relative flex min-h-[70svh] items-end pb-12 pt-24 lg:min-h-[86svh] lg:items-center lg:pb-0">
          <div className="max-w-[640px]">
            <p className="eyebrow eyebrow-light">{copy.spotlight}</p>
            <h2 className="display-xl mt-5 text-[var(--paper)]">{collection.name}</h2>
            <p className="mt-6 max-w-md text-base leading-7 text-[var(--paper)]/82">{collection.summary}</p>
            <span className="btn btn-on-photo btn-lg mt-8">{copy.viewTheCollection}</span>
          </div>
        </div>
      </Link>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Product rails                                                        */
/* ------------------------------------------------------------------ */

export function HomepageProductRail({ section, products, featured = false, copy }: { section: StorefrontHomepageSection; products: Product[]; featured?: boolean; copy: HomeCopy }) {
  const shownProducts = products.slice(0, 12);
  if (!shownProducts.length) return null;

  return (
    <section data-testid={`home-product-rail-${section.key}`} className={cn("section", featured ? "bg-[var(--background)]" : "border-y border-[var(--border)] bg-[var(--surface)]")}>
      <div className="storefront-container">
        <ProductScroller title={section.title} subtitle={section.subtitle} body={featured ? editorialBody(section, "") || undefined : undefined} ctaHref={section.ctaHref ?? "/shop"} ctaLabel={section.ctaLabel ?? copy.viewTheCollection}>
          {shownProducts.map((product, index) => (
            <div key={product.id} className="homepage-product-slide min-w-0 shrink-0 snap-start" style={{ flex: "0 0 var(--homepage-product-slide-basis)" }}>
              <ProductCard product={product} priority={index < 4} className="h-full" imageSizes="(min-width: 1800px) 260px, (min-width: 1024px) 25vw, (min-width: 640px) 42vw, 78vw" />
            </div>
          ))}
        </ProductScroller>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Collection story                                                     */
/* ------------------------------------------------------------------ */

export function HomepageCollectionStory({ collections, section, copy, products }: { collections: Collection[]; section: StorefrontHomepageSection; copy: HomeCopy; products: Product[] }) {
  const collectionList = (section.collection ? [section.collection] : collections).slice(0, 2);
  if (!collectionList.length) return null;

  return (
    <section data-testid="home-collection-story" className="section overflow-hidden bg-[var(--background)]">
      <div className="storefront-container">
        <div className="section-head">
          <div className="max-w-3xl">
            <p className="eyebrow">{copy.collectionsInFocus}</p>
            <h2 className="display-lg mt-3">{copy.rhythmsOfADay}</h2>
          </div>
        </div>

        <div className="space-y-16 lg:space-y-24">
          {collectionList.map((collection, index) => {
            const storyImage = index === 0 && section.imageUrl ? section.imageUrl : collectionImage(collection);
            const items = productsForCollection(collection, products).slice(0, 3);
            return (
              <article key={collection.slug} className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
                <Link
                  href={homeHref(copy, `/collections/${collection.slug}`)}
                  style={cropStyle(section, { mobile: "4 / 5", desktop: "4 / 3" })}
                  className={cn("homepage-crop-frame storefront-product-media group relative block overflow-hidden lg:col-span-7", index % 2 === 1 && "lg:order-2")}
                >
                  <Image src={storyImage} alt={collection.name} fill sizes="(min-width: 1024px) 58vw, 100vw" quality={76} style={index === 0 && section.imageUrl ? { objectPosition: focalPoint(section, "desktop") } : undefined} className="object-cover transition duration-1000 ease-out group-hover:scale-[1.02]" />
                </Link>
                <div className={cn("lg:col-span-5", index % 2 === 1 ? "lg:order-1 lg:pe-8" : "lg:ps-8")}>
                  <p className="eyebrow eyebrow-muted">0{index + 1} / 0{collectionList.length}</p>
                  <h3 className="display-lg mt-4">{section.collection && index === 0 ? section.title : collection.name}</h3>
                  <p className="storefront-body-copy mt-6 max-w-md text-[var(--muted)]">{section.collection && index === 0 ? editorialBody(section, collection.summary) : collection.summary}</p>
                  {items.length ? (
                    <ul className="mt-8 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                      {items.map((product) => (
                        <li key={product.id}>
                          <Link href={homeHref(copy, `/product/${product.slug}`)} className="group/item flex items-center justify-between gap-4 py-3 text-sm">
                            <span className="min-w-0 truncate font-medium">{product.name}</span>
                            <span className="flex shrink-0 items-center gap-3 text-[var(--muted)]">
                              {product.category}
                              <ArrowRight className="size-4 transition group-hover/item:translate-x-1 rtl:rotate-180" />
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <Link href={homeHref(copy, `/collections/${collection.slug}`)} className="btn btn-secondary mt-8">
                    {copy.exploreCollection}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Editorial story (CMS STORY_BAND / CUSTOM)                            */
/* ------------------------------------------------------------------ */

export function HomepageEditorialStory({ section, copy }: { section: StorefrontHomepageSection; copy: HomeCopy }) {
  return (
    <section data-home-editorial-story className="section border-y border-[var(--border)] bg-[var(--surface)]">
      <div className="storefront-container grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:gap-16">
        <div className="homepage-crop-frame storefront-product-media relative min-h-[460px] overflow-hidden lg:min-h-0" style={cropStyle(section, { mobile: "4 / 5", desktop: "16 / 10" })}>
          <Image src={section.imageUrl ?? `${C}campaign-sage-portrait.webp`} alt={section.title} fill loading="lazy" fetchPriority="low" sizes="(min-width: 1024px) 64vw, 100vw" quality={74} style={{ objectPosition: focalPoint(section, "desktop") }} className="object-cover" />
        </div>
        <div className="flex flex-col justify-end">
          <p className="eyebrow">{section.subtitle ?? copy.fitConsidered}</p>
          <h2 className="display-lg mt-4">{section.title}</h2>
          <p className="storefront-body-copy mt-6 text-[var(--muted)]">{editorialBody(section, copy.fitGuideBody)}</p>
          <Link href={homeHref(copy, section.ctaHref ?? "/fabric-guide")} className="btn btn-secondary mt-8 w-fit">
            {section.ctaLabel ?? copy.exploreTheFitGuide}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HomepageNewsletterHandoff({ section, copy }: { section: StorefrontHomepageSection; copy: HomeCopy }) {
  return (
    <section className="section border-y border-[var(--border)] bg-[var(--background)]">
      <div className="storefront-container grid gap-8 lg:grid-cols-2">
        <h2 className="display-lg">{section.title}</h2>
        <div className="lg:pt-2">
          <p className="storefront-body-copy max-w-lg text-[var(--muted)]">{editorialBody(section, copy.newsletterBody)}</p>
          <Link href={homeHref(copy, "/#newsletter")} className="btn btn-link mt-6">
            {copy.joinTheList} <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Proof + service                                                      */
/* ------------------------------------------------------------------ */

export function HomepageSocialProof({ products, copy }: { products: Product[]; copy: HomeCopy }) {
  const ratedProducts = products.filter((product) => product.rating > 0);
  const averageRating = ratedProducts.length ? ratedProducts.reduce((sum, product) => sum + product.rating, 0) / ratedProducts.length : 0;
  const totalReviews = products.reduce((sum, product) => sum + (product.reviews ?? 0), 0);
  const stats =
    totalReviews > 0
      ? ([
          [averageRating.toFixed(1), copy.averageRating],
          [`${totalReviews.toLocaleString()}+`, copy.customerReviews],
          [`${products.length}+`, copy.performanceStyles],
        ] as const)
      : ([
          [`${products.length}+`, copy.performanceStyles],
          ["AED 300+", copy.complimentaryDelivery],
          ["14 days", copy.consideredReturns],
        ] as const);
  const services = [
    [Truck, copy.complimentaryDelivery, copy.complimentaryDeliveryDetail],
    [Undo2, copy.consideredReturns, copy.consideredReturnsDetail],
    [Ruler, copy.personalFitGuidance, copy.personalFitGuidanceDetail],
    [CreditCard, copy.securePayment, copy.securePaymentDetail],
  ] as const;

  return (
    <section className="section border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="storefront-container grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <div className="grid gap-10 sm:grid-cols-3">
          {stats.map(([value, label]) => (
            <div key={label}>
              <p className="display-lg">{value}</p>
              <p className="mt-3 max-w-[14rem] text-sm leading-6 text-[var(--muted)]">{label}</p>
            </div>
          ))}
        </div>
        <ul className="grid gap-x-8 gap-y-6 border-t border-[var(--border)] pt-8 sm:grid-cols-2 lg:border-s lg:border-t-0 lg:ps-16 lg:pt-0">
          {services.map(([Icon, title, detail]) => (
            <li key={title} className="flex gap-4">
              <Icon className="mt-0.5 size-4 shrink-0 text-[var(--accent-text)]" />
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

function renderHomepageSection(section: StorefrontHomepageSection, products: Product[], collections: Collection[], bestSellers: Product[], arrivals: Product[], copy: HomeCopy) {
  switch (section.type) {
    case "FEATURED_PRODUCTS":
      return <HomepageProductRail key={section.id} section={section} products={productsForSection(section, products, bestSellers)} featured copy={copy} />;
    case "COLLECTION_STORY":
      return <HomepageCollectionStory key={section.id} section={section} collections={collections} copy={copy} products={products} />;
    case "PRODUCT_GRID":
      return <HomepageProductRail key={section.id} section={section} products={productsForSection(section, products, arrivals)} copy={copy} />;
    case "STORY_BAND":
      return <HomepageEditorialStory key={section.id} section={section} copy={copy} />;
    case "CUSTOM":
      return section.categoryMediaItems.length ? null : <HomepageEditorialStory key={section.id} section={section} copy={copy} />;
    case "NEWSLETTER":
      return <HomepageNewsletterHandoff key={section.id} section={section} copy={copy} />;
    case "HERO":
      return null;
  }
}

export async function HomepageMerchandising() {
  const [products, categories, collections, homepageSections, locale] = await Promise.all([
    getCmsProducts(),
    getCmsCategories(),
    getCmsCollections(),
    getCmsHomepageSections(),
    requestLocale(),
  ]);
  const copy = homeCopy[locale];
  const preferredBestSellers = products.filter((product) => product.bestSeller || product.featured);
  const preferredArrivals = products.filter((product) => product.newArrival || product.salePrice);
  const bestSellers = [...preferredBestSellers, ...products.filter((product) => !preferredBestSellers.includes(product))].slice(0, 12);
  const arrivals = [...preferredArrivals, ...products.filter((product) => !preferredArrivals.includes(product))].slice(0, 12);
  const listProducts = compactProductsForList(products);
  const listBestSellers = compactProductsForList(bestSellers);
  const listArrivals = compactProductsForList(arrivals);
  const displayCategories = productDisplayCategories(products, categories);
  const hero = homepageSections.find((section) => section.type === "HERO") ?? buildDefaultHomepageHero(copy);
  const categoryMediaSection = homepageSections.find((section) => section.categoryMediaItems.length > 0);
  const latestCollection = latestCollectionByProductActivity(collections, products);
  const spotlightCollection =
    collections.find((collection) => collection.slug !== latestCollection?.slug && collection.slug === "training-core") ??
    collections.find((collection) => collection.slug !== latestCollection?.slug) ??
    latestCollection;
  const storyCollections = collections.filter((collection) => collection.slug !== latestCollection?.slug && collection.slug !== spotlightCollection?.slug);
  const latestCollectionProducts = productsForCollection(latestCollection, products);
  const remainingSections = homepageSections.filter((section) => section.type !== "HERO");
  const collectionStorySection = remainingSections.find((section) => section.type === "COLLECTION_STORY");
  const supportingSections = remainingSections.filter(
    (section) => section.id !== categoryMediaSection?.id && section.id !== collectionStorySection?.id && !["FEATURED_PRODUCTS", "PRODUCT_GRID"].includes(section.type),
  );
  const newCollectionSection: StorefrontHomepageSection = {
    id: "home-new-collection-slider",
    key: "home-new-collection-slider",
    type: "PRODUCT_GRID",
    status: "PUBLISHED",
    title: latestCollection ? latestCollection.name : copy.newCollection,
    subtitle: copy.newCollection,
    body: latestCollection?.summary ?? copy.newCollectionBody,
    ctaLabel: copy.shopCollection,
    ctaHref: latestCollection ? `/collections/${latestCollection.slug}` : "/shop",
    productIds: [],
    settings: {},
    categoryMediaItems: [],
  };
  const bestSellerSection: StorefrontHomepageSection = {
    id: "home-best-sellers-slider",
    key: "home-best-sellers-slider",
    type: "FEATURED_PRODUCTS",
    status: "PUBLISHED",
    title: copy.mostWanted,
    subtitle: copy.bestSellers,
    ctaLabel: copy.shopBestSellers,
    ctaHref: "/shop?sort=popular",
    productIds: [],
    settings: {},
    categoryMediaItems: [],
  };
  const defaultHomepageCollectionStory: StorefrontHomepageSection = {
    id: "home-collection-focus",
    key: "home-collection-focus",
    type: "COLLECTION_STORY",
    status: "PUBLISHED",
    title: copy.collectionsInFocus,
    subtitle: copy.collectionsInFocus,
    productIds: [],
    settings: {},
    categoryMediaItems: [],
  };

  return (
    <>
      <HomepageHero section={hero} copy={copy} />
      <HomepageValueStrip copy={copy} />
      <HomepageCategoryDiscovery section={categoryMediaSection} categories={displayCategories} copy={copy} />
      <HomepageProductRail section={bestSellerSection} products={listBestSellers.length ? listBestSellers : listProducts} copy={copy} />
      <HomepageEditorialSplit collection={latestCollection} copy={copy} products={products} />
      <HomepageIntentionEdit copy={copy} />
      <HomepageProductRail section={newCollectionSection} products={compactProductsForList(fillProductSlider(latestCollectionProducts, arrivals.length ? arrivals : products))} featured copy={copy} />
      <HomepageCollectionSpotlight collection={spotlightCollection} copy={copy} />
      <HomepageCollectionStory section={collectionStorySection ?? defaultHomepageCollectionStory} collections={storyCollections.length ? storyCollections : collections} copy={copy} products={products} />
      {supportingSections.map((section) => renderHomepageSection(section, listProducts, collections, listBestSellers.length ? listBestSellers : listProducts, listArrivals.length ? listArrivals : listProducts, copy))}
      <HomepageSocialProof products={products} copy={copy} />
    </>
  );
}
