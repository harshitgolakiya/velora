import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, CreditCard, Dumbbell, Flame, Play, Ruler, Sparkles, Star, SunMedium, Truck, Undo2 } from "lucide-react";
import { ProductScroller } from "@/components/store/product-scroller";
import { ProductCard } from "@/components/store/product-card";
import { compactProductsForList } from "@/lib/catalog-performance";
import { getCmsCategories, getCmsCollections, getCmsHomepageSections, getCmsProducts, requestLocale } from "@/lib/cms";
import type { Collection, Product } from "@/lib/catalog";
import type { StorefrontHomepageMediaItem, StorefrontHomepageSection } from "@/lib/catalog-db";
import { homeCopy, localizedPath } from "@/lib/i18n";
import { formatAed } from "@/lib/utils";

type HomeCopy = (typeof homeCopy)["en"];

function homeHref(copy: HomeCopy, href: string) {
  return localizedPath(href, copy === homeCopy.ar ? "ar" : "en");
}

const categoryImages: Record<string, string> = {
  Tops: "/images/activewear-demo/active-neutral.jpg",
  "Sports Bras": "/images/activewear-demo/studio-yoga.jpg",
  Jackets: "/images/activewear-demo/court-blue.jpg",
  Leggings: "/images/activewear-demo/active-duo.jpg",
  Accessories: "/images/activewear-demo/court-white.jpg",
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
    imageUrl: "/images/activewear-demo/active-duo.jpg",
    productIds: [],
    settings: {},
    categoryMediaItems: [],
  };
}

function productsForSection(section: StorefrontHomepageSection, products: Product[], fallback: Product[]) {
  if (!section.productIds.length) return fallback.slice(0, 12);
  const selected = section.productIds
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean) as Product[];
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

function cropStyle(
  section: StorefrontHomepageSection,
  fallback: { desktop: string; mobile: string },
): CSSProperties {
  return {
    "--homepage-mobile-crop-ratio": cropRatio(section, "mobile", fallback.mobile),
    "--homepage-desktop-crop-ratio": cropRatio(section, "desktop", fallback.desktop),
  } as CSSProperties;
}

function dynamicGridCountStyle(count: number): CSSProperties {
  return {
    "--homepage-media-count": Math.max(1, Math.min(count, 6)),
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

function firstProductVideo(product: Product) {
  for (const color of product.colors) {
    const media = product.variantMediaByColor?.[color]?.find((item) => item.type === "VIDEO");
    if (media?.url) return media.url;
  }
  return product.variants?.flatMap((variant) => variant.media).find((item) => item.type === "VIDEO")?.url;
}

function isCutoutMedia(url: string) {
  return url.includes("dummyjson.com") || url.includes("fakestoreapi.com");
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

export function HomepageHero({ section, copy }: { section: StorefrontHomepageSection; copy: HomeCopy }) {
  const desktopImage = section.imageUrl ?? "/images/activewear-demo/active-duo.jpg";

  return (
    <section className="relative h-svh min-h-[620px] overflow-hidden bg-stone-950 text-white">
      <Image
        src={desktopImage}
        alt={section.title}
        fill
        priority
        fetchPriority="high"
        loading="eager"
        sizes="100vw"
        quality={72}
        style={{ objectPosition: focalPoint(section, "desktop") }}
        className={section.mobileImageUrl ? "hidden object-cover sm:block" : "object-cover"}
      />
      {section.mobileImageUrl ? (
        <Image
          src={section.mobileImageUrl}
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
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,6,8,.76)_0%,rgba(5,6,8,.34)_42%,rgba(5,6,8,.08)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,6,8,.66)_0%,rgba(5,6,8,.14)_46%,transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(5,6,8,.55)_0%,transparent_100%)]" />

      <div className="storefront-container relative flex h-full items-end pb-10 pt-28 sm:pb-14 lg:items-center lg:pb-0 lg:pt-28">
        <div className="max-w-[700px] lg:-mt-4">
          {section.subtitle ? (
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.24em] text-white/75">{section.subtitle}</p>
          ) : null}
          <h1 className="max-w-[660px] font-serif text-[3.4rem] font-medium leading-[0.9] sm:text-7xl lg:text-[88px] xl:text-[96px]">
            {section.title}
          </h1>
          <div className="mt-7 flex max-w-xl flex-col items-stretch gap-5 sm:items-start">
            <p className="storefront-body-copy max-w-md text-white/78">
              {editorialBody(section, copy.heroBody)}
            </p>
            <Link
              href={homeHref(copy, section.ctaHref ?? "/shop")}
              className="storefront-action storefront-light-control inline-flex h-12 shrink-0 items-center justify-center gap-3 px-6 text-xs font-semibold uppercase tracking-[0.14em] transition hover:bg-[#BCE3F4] sm:w-auto"
            >
              {section.ctaLabel ?? copy.exploreTheEdit} <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
      <p className="absolute bottom-5 end-6 hidden text-[10px] uppercase tracking-[0.18em] text-white/55 sm:block">
        {copy.designedForUae}
      </p>
    </section>
  );
}

function buildFallbackCategoryMedia(categories: string[]): StorefrontHomepageMediaItem[] {
  return categories.slice(0, 6).map((category, index) => ({
    id: `fallback-category-${index}`,
    title: category,
    href: `/shop?category=${encodeURIComponent(category)}`,
    mediaType: "IMAGE",
    imageUrl: categoryImages[category] ?? "/images/activewear-demo/active-duo.jpg",
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
      const fallback = categoryImages[category] ?? "/images/activewear-demo/active-duo.jpg";
      return {
        ...item,
        imageUrl: item.imageUrl?.startsWith("/images/velora/") ? fallback : item.imageUrl,
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

    let iframeUrl: string;

    if (streamId.includes("cloudflarestream.com")) {
      // Full domain/path provided in UID field
      iframeUrl = `https://${streamId}/iframe?autoplay=true&muted=true&loop=true&controls=false${poster}`;
    } else if (streamId.includes("customer-")) {
      // Customer domain prefix provided
      iframeUrl = `https://${streamId}.cloudflarestream.com/iframe?autoplay=true&muted=true&loop=true&controls=false${poster}`;
    } else if (customerDomain) {
      // Just UID with customer domain from env
      iframeUrl = `https://${customerDomain}/${streamId}/iframe?autoplay=true&muted=true&loop=true&controls=false${poster}`;
    } else {
      // Just UID - use generic endpoint
      iframeUrl = `https://iframe.videodelivery.net/${streamId}?autoplay=true&muted=true&loop=true&controls=false${poster}`;
    }

    return (
      <iframe
        src={iframeUrl}
        title={item.title}
        className="absolute inset-0 h-full w-full scale-[1.01] border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (item.mediaType === "VIDEO" && item.videoUrl) {
    return (
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={item.videoUrl}
        poster={item.posterUrl}
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }

  return (
    <Image
      src={item.imageUrl || item.posterUrl || "/images/activewear-demo/active-duo.jpg"}
      alt={item.title}
      fill
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      sizes="(min-width: 1600px) 25vw, (min-width: 768px) 50vw, 86vw"
      quality={72}
      fetchPriority={priority ? "high" : "low"}
      className="object-cover transition duration-700 group-hover:scale-[1.025]"
    />
  );
}

export function HomepageCategoryDiscovery({
  section,
  categories,
  copy,
}: {
  section?: StorefrontHomepageSection;
  categories: string[];
  copy: HomeCopy;
}) {
  const cmsItems = currentCategoryMediaItems(section?.categoryMediaItems ?? [], categories);
  const fallbackItems = buildFallbackCategoryMedia(categories).filter(
    (item) => !cmsItems.some((cmsItem) => cmsItem.title === item.title || cmsItem.href === item.href),
  );
  const items = [...cmsItems, ...fallbackItems].slice(0, 6);
  if (!items.length) return null;

  return (
    <section data-testid="home-category-media" className="bg-[var(--background)] pb-8 pt-8 sm:pb-10 sm:pt-12">
      <div className="storefront-container">
        <div className="mb-5 flex items-end justify-between gap-4 px-1 sm:mb-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
              {section?.subtitle ?? copy.shopByCategory}
            </p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">
              {section?.title ?? copy.chooseYourRotation}
            </h2>
          </div>
          <Link
            href={homeHref(copy, section?.ctaHref ?? "/shop")}
            className="storefront-action -me-2 inline-flex min-h-10 shrink-0 items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] sm:text-xs sm:tracking-[0.14em]"
          >
            {section?.ctaLabel ?? copy.shopAll} <ArrowRight className="size-4" />
          </Link>
        </div>
        <div
          className="homepage-media-grid homepage-media-grid-fill -mx-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-3 lg:gap-3"
          style={dynamicGridCountStyle(items.length)}
        >
          {items.map((item, index) => (
            <Link
              key={item.id}
              href={homeHref(copy, item.href)}
              data-home-category-tile
              className="storefront-media-tile storefront-product-media group relative block aspect-[3/4.45] w-[62vw] max-w-[250px] shrink-0 snap-start bg-[var(--card)] min-[480px]:w-[44vw] sm:w-auto sm:max-w-none"
              style={{ borderRadius: "var(--radius-media)" }}
            >
              <CategoryMediaAsset item={item} priority={false} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/58 via-black/12 to-transparent p-4 pt-20 text-white">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
                  0{index + 1}
                </p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <h3 className="text-lg font-semibold leading-none sm:text-2xl">{item.title}</h3>
                  <ArrowUpRight className="size-4 shrink-0 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomepageCollectionSpotlight({ collection, copy }: { collection?: Collection; copy: HomeCopy }) {
  if (!collection) return null;

  return (
    <section data-testid="home-spotlight" className="bg-[var(--background)] py-0">
      <div>
        <Link
          data-testid="home-spotlight-banner"
          href={homeHref(copy, `/collections/${collection.slug}`)}
          className="group relative block min-h-svh overflow-hidden bg-stone-950 text-white"
        >
          <Image
            src={collection.image}
            alt={collection.name}
            fill
            loading="lazy"
            fetchPriority="low"
            sizes="100vw"
            quality={72}
            className="object-cover transition duration-1000 group-hover:scale-[1.015]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,6,8,.74)_0%,rgba(5,6,8,.35)_43%,rgba(5,6,8,.08)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,6,8,.58)_0%,rgba(5,6,8,.12)_52%,transparent_76%)]" />
          <div className="absolute inset-0">
            <div className="storefront-container flex h-full items-end pb-10 pt-28 sm:pb-14 lg:items-center lg:pb-0">
              <div className="max-w-[700px] lg:-mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72">
                  {collection.name}
                </p>
                <h2 className="mt-4 max-w-[660px] text-[3.4rem] font-medium uppercase leading-[0.9] sm:text-7xl lg:text-[88px] xl:text-[96px]">
                  {copy.spotlight}
                </h2>
                <p className="storefront-body-copy mt-6 max-w-md text-white/78">
                  {collection.summary}
                </p>
                <span className="storefront-action storefront-light-control mt-7 inline-flex h-12 items-center justify-center px-6 text-xs font-semibold uppercase tracking-[0.14em]">
                  {copy.heroCta} <ArrowUpRight className="ml-3 size-4" />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

export function HomepageSocialProof({ products, copy }: { products: Product[]; copy: HomeCopy }) {
  const ratedProducts = products.filter((product) => product.rating > 0);
  const averageRating = ratedProducts.length
    ? ratedProducts.reduce((sum, product) => sum + product.rating, 0) / ratedProducts.length
    : 0;
  const totalReviews = products.reduce((sum, product) => sum + (product.reviews ?? 0), 0);

  const stats = totalReviews > 0
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

  return (
    <section className="border-b border-[var(--border)] bg-[var(--background)]">
      <div className="storefront-container grid gap-10 border-t border-[var(--border)] py-16 sm:grid-cols-3 sm:py-20">
        {stats.map(([value, label]) => (
          <div key={label} className="flex items-start gap-3">
            <Star className="mt-2 size-4 shrink-0 fill-[var(--accent)] text-[var(--accent)]" />
            <div>
              <p className="font-serif text-5xl leading-none sm:text-6xl">{value}</p>
              <p className="mt-3 max-w-[16rem] text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomepageMotionEdit({ products, copy }: { products: Product[]; copy: HomeCopy }) {
  const motionProducts = products
    .map((product) => ({ product, videoUrl: firstProductVideo(product) }))
    .filter((item): item is { product: Product; videoUrl: string } => Boolean(item.videoUrl))
    .slice(0, 3);

  if (!motionProducts.length) return null;

  const [featured, ...supporting] = motionProducts;

  return (
    <section className="bg-[var(--foreground)] text-[var(--background)]">
      <div className="storefront-container grid gap-6 py-12 sm:py-16 lg:grid-cols-[1.25fr_0.75fr]">
        <Link href={homeHref(copy, `/product/${featured.product.slug}`)} className="storefront-product-media group relative min-h-[560px] overflow-hidden bg-black sm:min-h-[680px] lg:min-h-[760px]">
          <video
            src={featured.videoUrl}
            poster={featured.product.images[0]}
            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.015]"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,.68),rgba(0,0,0,.08)_58%,rgba(0,0,0,.26))]" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
            <div className="mb-5 inline-flex items-center gap-2 border border-white/35 bg-white/12 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
              <Play className="size-3 fill-current" />
              {copy.movementEdit}
            </div>
            <h2 className="max-w-2xl text-5xl font-medium leading-none text-white sm:text-7xl">
              {featured.product.name}
            </h2>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/82">
              <span>{featured.product.category}</span>
              <span>{formatAed(featured.product.salePrice ?? featured.product.price)}</span>
            </div>
          </div>
        </Link>

        <div className="grid gap-6 lg:grid-rows-[auto_1fr]">
          <div className="border-t border-white/20 pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">{copy.motionStudio}</p>
            <p className="mt-4 max-w-lg text-3xl font-medium leading-tight sm:text-4xl">
              {copy.motionStudioBody}
            </p>
          </div>
          <div className="grid gap-4 self-end">
            {supporting.map(({ product, videoUrl }) => (
              <Link key={product.id} href={homeHref(copy, `/product/${product.slug}`)} className="group grid grid-cols-[112px_1fr] gap-4 border-t border-white/16 pt-4">
                <div className="storefront-product-media relative aspect-[3/4] overflow-hidden bg-black">
                  <video
                    src={videoUrl}
                    poster={product.images[0]}
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                </div>
                <div className="min-w-0 self-end pb-1">
                  <p className="line-clamp-2 text-base font-medium text-white">{product.name}</p>
                  <p className="mt-1 text-sm text-white/62">{product.category}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">{copy.viewMotion}</p>
                </div>
              </Link>
            ))}
            {!supporting.length ? (
              <Link href={homeHref(copy, `/product/${featured.product.slug}`)} className="inline-flex items-center gap-2 border-b border-white/70 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                {copy.shopMotionEdit} <ArrowRight className="size-4 rtl:rotate-180" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomepageIntentionEdit({ copy }: { copy: HomeCopy }) {
  const intentions = [
    {
      title: copy.pilates,
      body: copy.pilatesBody,
      href: `/search?q=${encodeURIComponent(copy.pilates)}`,
      image: "/images/activewear-demo/studio-yoga.jpg",
      icon: Sparkles,
    },
    {
      title: copy.activeDays,
      body: copy.activeDaysBody,
      href: `/search?q=${encodeURIComponent(copy.activeDays)}`,
      image: "/images/activewear-demo/active-duo.jpg",
      icon: Dumbbell,
    },
    {
      title: copy.tennis,
      body: copy.tennisBody,
      href: `/search?q=${encodeURIComponent(copy.tennis)}`,
      image: "/images/activewear-demo/court-duo.jpg",
      icon: SunMedium,
    },
    {
      title: copy.yoga,
      body: copy.yogaBody,
      href: `/search?q=${encodeURIComponent(copy.yoga)}`,
      image: "/images/activewear-demo/flow-yoga.jpg",
      icon: Flame,
    },
  ];

  return (
    <section className="bg-[var(--background)] py-12 sm:py-16">
      <div className="storefront-container">
        <div className="mb-7 grid gap-4 border-t border-[var(--border)] pt-5 lg:grid-cols-[0.72fr_1.28fr]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
            {copy.shopByIntention}
          </p>
          <div className="max-w-3xl">
            <h2 className="text-4xl font-medium leading-tight sm:text-5xl">
              {copy.intentionTitle}
            </h2>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {intentions.map((intention) => {
            const Icon = intention.icon;
            return (
              <Link
                key={intention.title}
                href={homeHref(copy, intention.href)}
                data-home-intention-tile
                className="storefront-media-tile storefront-product-media group relative min-h-[420px] bg-stone-950 text-white sm:min-h-[480px]"
                style={{ borderRadius: "var(--radius-media)" }}
              >
                <Image
                  src={intention.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  quality={72}
                  className="object-cover transition duration-700 ease-out group-hover:scale-[1.035]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,.72),rgba(0,0,0,.1)_58%,rgba(0,0,0,.2))]" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <span className="mb-4 grid size-10 place-items-center rounded-[var(--radius-control)] bg-[var(--accent)] text-[#17262D]">
                    <Icon className="size-4" />
                  </span>
                  <h3 className="text-3xl font-medium leading-none">{intention.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/76">{intention.body}</p>
                  <span className="mt-5 inline-flex items-center gap-2 border-b border-white/75 pb-2 text-xs font-semibold uppercase tracking-[0.14em]">
                    {copy.shopEdit} <ArrowRight className="size-4 transition group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HomepageProductRail({
  section,
  products,
  featured = false,
  copy,
}: {
  section: StorefrontHomepageSection;
  products: Product[];
  featured?: boolean;
  copy: HomeCopy;
}) {
  const shownProducts = products.slice(0, 12);
  if (!shownProducts.length) return null;

  return (
    <section data-testid={`home-product-rail-${section.key}`} className={featured ? "bg-[var(--background)]" : "bg-[var(--card)]"}>
      <div className="storefront-container py-12 sm:py-16">
        <ProductScroller
          title={section.title}
          subtitle={section.subtitle}
          ctaHref={section.ctaHref ?? "/shop"}
          ctaLabel={section.ctaLabel ?? copy.viewTheCollection}
        >
          {shownProducts.map((product, index) => (
            <div
              key={product.id}
              className="homepage-product-slide min-w-0 shrink-0 snap-start"
              style={{ flex: "0 0 var(--homepage-product-slide-basis)" }}
            >
              <ProductCard
                product={product}
                priority={index < 5}
                className="h-full"
                imageSizes="(min-width: 1800px) 260px, (min-width: 1024px) 25vw, (min-width: 640px) 42vw, 78vw"
              />
            </div>
          ))}
        </ProductScroller>
      </div>
    </section>
  );
}

function collectionStoryImage(collection: Collection, products: Product[]) {
  const collectionProducts = productsForCollection(collection, products);
  return collectionProducts.find((product) => !isCutoutMedia(product.images[0] ?? ""))?.images[0]
    ?? collectionProducts[0]?.images[0]
    ?? collection.image;
}

export function HomepageCollectionStory({ collections, section, copy, products }: { collections: Collection[]; section: StorefrontHomepageSection; copy: HomeCopy; products: Product[] }) {
  const collectionList = (section.collection ? [section.collection] : collections).slice(0, 2);
  if (!collectionList.length) return null;

  return (
    <section data-testid="home-collection-story" className="overflow-hidden bg-[var(--surface)] py-14 text-[var(--foreground)] sm:py-18 lg:py-20">
      <div className="storefront-container">
        <div className="mb-10 grid gap-6 border-t border-[var(--border)] pt-5 sm:mb-14 lg:grid-cols-[0.75fr_1.25fr]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            {copy.collectionsInFocus}
          </p>
          <p className="max-w-3xl text-3xl font-medium leading-tight sm:text-4xl lg:text-5xl">
            {copy.rhythmsOfADay}
          </p>
        </div>

        <div className="space-y-12 sm:space-y-14 lg:space-y-16">
        {collectionList.map((collection, index) => {
          const storyImage = index === 0 && section.imageUrl ? section.imageUrl : collectionStoryImage(collection, products);
          return (
          <article
            key={collection.slug}
            className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10"
          >
            <Link
              href={homeHref(copy, `/collections/${collection.slug}`)}
              style={cropStyle(section, { mobile: "4 / 5", desktop: "16 / 10" })}
              className={`homepage-collection-story-frame homepage-crop-frame storefront-product-media group relative block overflow-hidden lg:col-span-8 ${
                index % 2 === 1 ? "lg:order-2" : ""
              }`}
            >
              {/* These story images use direct URLs so off-screen editorial media does not stall behind the image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={storyImage}
                alt={collection.name}
                loading="eager"
                fetchPriority="high"
                style={index === 0 && section.imageUrl ? { objectPosition: focalPoint(section, "desktop") } : undefined}
                className={`absolute inset-0 h-full w-full transition duration-1000 ease-out group-hover:scale-[1.025] ${
                  isCutoutMedia(storyImage)
                    ? "object-contain p-8 sm:p-12"
                    : "object-cover"
                }`}
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(17,19,21,.16),transparent_38%,rgba(255,255,255,.06))]" />
            </Link>

            <div
              className={`lg:col-span-4 ${
                index % 2 === 1 ? "lg:order-1 lg:pr-8" : "lg:pl-8"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                {index === 0 ? section.subtitle ?? copy.collectionStudy : copy.seasonalEdit}
              </p>
              <h2 className="mt-4 text-4xl font-medium leading-[1.02] sm:text-5xl">
                {section.collection && index === 0 ? section.title : collection.name}
              </h2>
              <p className="storefront-body-copy mt-6 max-w-md text-[var(--muted)]">
                {section.collection && index === 0
                  ? editorialBody(section, collection.summary)
                  : collection.summary}
              </p>
              <Link
                href={homeHref(copy, `/collections/${collection.slug}`)}
                className="mt-8 inline-flex items-center gap-3 border-b border-[var(--foreground)] pb-2 text-xs font-semibold uppercase tracking-[0.14em]"
              >
                {copy.exploreCollection}
                <ArrowUpRight className="size-4 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Link>
              <div className="mt-12 hidden h-px w-full bg-[var(--border)] lg:block" />
              <p className="mt-4 hidden text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] lg:block">
                0{index + 1} / 0{collectionList.length}
              </p>
            </div>
          </article>
        );
        })}
        </div>
      </div>
    </section>
  );
}

export function HomepageEditorialStory({ section, copy }: { section: StorefrontHomepageSection; copy: HomeCopy }) {
  return (
    <section className="bg-[var(--surface)]">
      <div className="storefront-container grid gap-8 py-12 sm:py-16 lg:grid-cols-[1.35fr_0.65fr] lg:py-20">
        <div
          className="homepage-crop-frame relative min-h-[520px] lg:min-h-0"
          style={cropStyle(section, { mobile: "4 / 5", desktop: "16 / 10" })}
        >
          <Image
            src={section.imageUrl ?? "/images/activewear-demo/active-neutral.jpg"}
            alt={section.title}
            fill
            loading="lazy"
            fetchPriority="low"
            sizes="(min-width: 1024px) 68vw, 100vw"
            quality={72}
            style={{ objectPosition: focalPoint(section, "desktop") }}
            className="object-cover"
          />
        </div>
        <div className="flex flex-col justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            {section.subtitle ?? copy.fitConsidered}
          </p>
          <div className="mt-20 lg:mt-0">
            <h2 className="font-serif text-5xl leading-[0.98] sm:text-6xl">{section.title}</h2>
            <p className="storefront-body-copy mt-7 text-[var(--muted)]">
              {editorialBody(section, copy.fitGuideBody)}
            </p>
            <Link
              href={homeHref(copy, section.ctaHref ?? "/fabric-guide")}
              className="mt-8 inline-flex items-center gap-3 border-b border-[var(--foreground)] pb-2 text-xs font-semibold uppercase tracking-[0.14em]"
            >
              {section.ctaLabel ?? copy.exploreTheFitGuide} <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomepageNewsletterHandoff({ section, copy }: { section: StorefrontHomepageSection; copy: HomeCopy }) {
  return (
    <section className="border-y border-[var(--border)] bg-[var(--background)]">
      <div className="storefront-container grid gap-8 py-16 lg:grid-cols-[1fr_1fr] lg:py-24">
        <h2 className="font-serif text-5xl leading-none sm:text-6xl">{section.title}</h2>
        <div className="lg:pt-2">
          <p className="storefront-body-copy max-w-lg text-[var(--muted)]">
            {editorialBody(section, copy.newsletterBody)}
          </p>
          <Link href={homeHref(copy, "/#newsletter")} className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
            {copy.joinTheList} <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HomepageServiceBenefits({ copy }: { copy: HomeCopy }) {
  const services = [
    [Truck, copy.complimentaryDelivery, copy.complimentaryDeliveryDetail],
    [Undo2, copy.consideredReturns, copy.consideredReturnsDetail],
    [Ruler, copy.personalFitGuidance, copy.personalFitGuidanceDetail],
    [CreditCard, copy.securePayment, copy.securePaymentDetail],
  ] as const;

  return (
    <section className="border-y border-[var(--border)] bg-[var(--surface)]">
      <div className="storefront-container grid gap-y-8 py-9 sm:grid-cols-2 lg:grid-cols-4">
        {services.map(([Icon, title, detail]) => (
          <div key={title} className="flex gap-4 lg:pe-8">
            <Icon className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
            <div>
              <p className="text-xs font-medium">{title}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function renderHomepageSection(
  section: StorefrontHomepageSection,
  products: Product[],
  collections: Collection[],
  bestSellers: Product[],
  arrivals: Product[],
  copy: HomeCopy,
) {
  switch (section.type) {
    case "FEATURED_PRODUCTS":
      return (
        <div key={section.id} className="homepage-section-enter">
          <HomepageProductRail
            section={section}
            products={productsForSection(section, products, bestSellers)}
            featured
            copy={copy}
          />
        </div>
      );
    case "COLLECTION_STORY":
      return (
        <div key={section.id} className="homepage-section-enter">
          <HomepageCollectionStory section={section} collections={collections} copy={copy} products={products} />
        </div>
      );
    case "PRODUCT_GRID":
      return (
        <div key={section.id} className="homepage-section-enter">
          <HomepageProductRail section={section} products={productsForSection(section, products, arrivals)} copy={copy} />
        </div>
      );
    case "STORY_BAND":
      return (
        <div key={section.id} className="homepage-section-enter">
          <HomepageEditorialStory section={section} copy={copy} />
        </div>
      );
    case "CUSTOM":
      return section.categoryMediaItems.length ? null : (
        <div key={section.id} className="homepage-section-enter">
          <HomepageEditorialStory section={section} copy={copy} />
        </div>
      );
    case "NEWSLETTER":
      return (
        <div key={section.id} className="homepage-section-enter">
          <HomepageNewsletterHandoff section={section} copy={copy} />
        </div>
      );
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
  const latestCollectionProducts = productsForCollection(latestCollection, products);
  const remainingSections = homepageSections.filter((section) => section.type !== "HERO");
  const collectionStorySection = remainingSections.find((section) => section.type === "COLLECTION_STORY");
  const supportingSections = remainingSections.filter(
    (section) =>
      section.id !== categoryMediaSection?.id &&
      section.id !== collectionStorySection?.id &&
      !["FEATURED_PRODUCTS", "PRODUCT_GRID"].includes(section.type),
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
    body: copy.bestSellers,
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
      <div className="homepage-section-enter">
        <HomepageCategoryDiscovery section={categoryMediaSection} categories={displayCategories} copy={copy} />
      </div>
      <div className="homepage-section-enter">
        <HomepageMotionEdit products={products} copy={copy} />
      </div>
      <div className="homepage-section-enter">
        <HomepageIntentionEdit copy={copy} />
      </div>
      <div className="homepage-section-enter">
        <HomepageCollectionSpotlight collection={latestCollection ?? collections[0]} copy={copy} />
      </div>
      <div className="homepage-section-enter">
        <HomepageProductRail
          section={newCollectionSection}
          products={compactProductsForList(fillProductSlider(latestCollectionProducts, arrivals.length ? arrivals : products))}
          featured
          copy={copy}
        />
      </div>
      <div className="homepage-section-enter">
        <HomepageCollectionStory section={collectionStorySection ?? defaultHomepageCollectionStory} collections={collections} copy={copy} products={products} />
      </div>
      <div className="homepage-section-enter">
        <HomepageProductRail section={bestSellerSection} products={listBestSellers.length ? listBestSellers : listProducts} copy={copy} />
      </div>
      {supportingSections.map((section) =>
        renderHomepageSection(section, listProducts, collections, listBestSellers.length ? listBestSellers : listProducts, listArrivals.length ? listArrivals : listProducts, copy),
      )}
      <div className="homepage-section-enter">
        <HomepageSocialProof products={products} copy={copy} />
      </div>
      <div className="homepage-section-enter">
        <HomepageServiceBenefits copy={copy} />
      </div>
    </>
  );
}


