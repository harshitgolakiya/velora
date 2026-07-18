import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, CreditCard, Ruler, Star, Truck, Undo2 } from "lucide-react";
import { MotionReveal } from "@/components/store/motion-reveal";
import { ProductScroller } from "@/components/store/product-scroller";
import { compactProductsForList } from "@/lib/catalog-performance";
import { getCmsCategories, getCmsCollections, getCmsHomepageSections, getCmsProducts, requestLocale } from "@/lib/cms";
import type { Collection, Product } from "@/lib/catalog";
import type { StorefrontHomepageMediaItem, StorefrontHomepageSection } from "@/lib/catalog-db";
import { homeCopy } from "@/lib/i18n";
import { formatAed } from "@/lib/utils";

type HomeCopy = (typeof homeCopy)["en"];

const categoryImages: Record<string, string> = {
  Leggings: "/images/velora/collection-studio-sculpt.jpg",
  "Sports Bras": "/images/velora/zephyr-bra-1.jpg",
  Jackets: "/images/velora/mira-jacket-1.jpg",
  Tops: "/images/velora/noor-crop-1.jpg",
  Pants: "/images/velora/selene-pant-1.jpg",
  Accessories: "/images/velora/terra-bottle-1.jpg",
};

function buildDefaultHeroSection(copy: HomeCopy): StorefrontHomepageSection {
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
    imageUrl: "/images/velora/hero-sculpted-essentials.jpg",
    productIds: [],
    settings: {},
    categoryMediaItems: [],
  };
}

function productsForSection(section: StorefrontHomepageSection, products: Product[], fallback: Product[]) {
  if (!section.productIds.length) return fallback.slice(0, 5);
  const selected = section.productIds
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean) as Product[];
  const remaining = fallback.filter((product) => !selected.some((item) => item.id === product.id));
  return [...selected, ...remaining].slice(0, 5);
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

function productsForCollection(collection: Collection | undefined, products: Product[]) {
  if (!collection) return [];
  return products.filter((product) => product.collections?.includes(collection.slug) || product.collection === collection.slug);
}

function fillProductSlider(primary: Product[], fallback: Product[]) {
  const seen = new Set(primary.map((product) => product.id));
  return [...primary, ...fallback.filter((product) => !seen.has(product.id))].slice(0, 12);
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

function HeroSection({ section, copy }: { section: StorefrontHomepageSection; copy: HomeCopy }) {
  const desktopImage = section.imageUrl ?? "/images/velora/hero-sculpted-essentials.jpg";

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

      <div className="relative mx-auto flex h-full max-w-[1440px] items-end px-5 pb-10 pt-28 sm:px-8 sm:pb-14 lg:items-center lg:px-12 lg:pb-0 lg:pt-28">
        <div className="max-w-[700px] lg:-mt-4">
          {section.subtitle ? (
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.24em] text-white/75">{section.subtitle}</p>
          ) : null}
          <h1 className="max-w-[660px] font-serif text-[3.4rem] font-medium leading-[0.9] sm:text-7xl lg:text-[88px] xl:text-[96px]">
            {section.title}
          </h1>
          <div className="mt-7 flex max-w-xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-md text-sm leading-6 text-white/78 sm:text-base sm:leading-7">
              {editorialBody(section, copy.heroBody)}
            </p>
            <Link
              href={section.ctaHref ?? "/shop"}
              className="storefront-action storefront-light-control inline-flex h-12 shrink-0 items-center justify-center gap-3 px-6 text-xs font-semibold uppercase tracking-[0.14em] transition hover:bg-[#C5A46D] sm:w-auto"
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
    imageUrl: categoryImages[category] ?? "/images/velora/hero-sculpted-essentials.jpg",
  }));
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
      src={item.imageUrl || item.posterUrl || "/images/velora/hero-sculpted-essentials.jpg"}
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

function CategoryMediaSection({
  section,
  categories,
  copy,
}: {
  section?: StorefrontHomepageSection;
  categories: string[];
  copy: HomeCopy;
}) {
  const cmsItems = section?.categoryMediaItems ?? [];
  const fallbackItems = buildFallbackCategoryMedia(categories).filter(
    (item) => !cmsItems.some((cmsItem) => cmsItem.title === item.title || cmsItem.href === item.href),
  );
  const items = [...cmsItems, ...fallbackItems].slice(0, 6);
  if (!items.length) return null;

  return (
    <section data-testid="home-category-media" className="bg-[var(--background)] pb-8 pt-10 sm:pb-10 sm:pt-16">
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8">
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
            href={section?.ctaHref ?? "/shop"}
            className="hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] sm:inline-flex"
          >
            {section?.ctaLabel ?? copy.shopAll} <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="homepage-media-grid -mx-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-3 lg:grid-cols-6 lg:gap-3">
          {items.map((item, index) => (
            <Link
              key={item.id}
              href={item.href}
              className="group relative block aspect-[3/4.45] w-[76vw] shrink-0 snap-start overflow-hidden bg-[var(--card)] sm:w-auto"
            >
              <CategoryMediaAsset item={item} priority={false} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/58 via-black/12 to-transparent p-4 pt-20 text-white">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
                  0{index + 1}
                </p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <h3 className="text-xl font-semibold leading-none sm:text-2xl">{item.title}</h3>
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

function CollectionSpotlightBanner({ collection, copy }: { collection?: Collection; copy: HomeCopy }) {
  if (!collection) return null;

  return (
    <section data-testid="home-spotlight" className="bg-[var(--background)] py-4 sm:py-6">
      <div>
        <Link
          data-testid="home-spotlight-banner"
          href={`/collections/${collection.slug}`}
          className="group relative block min-h-[72svh] overflow-hidden bg-[var(--card)] sm:min-h-[76svh]"
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
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(245,241,232,.66)_0%,rgba(245,241,232,.18)_42%,rgba(245,241,232,0)_100%)] dark:bg-[linear-gradient(90deg,rgba(5,6,8,.66)_0%,rgba(5,6,8,.25)_42%,rgba(5,6,8,0)_100%)]" />
          <div className="absolute inset-0">
            <div className="mx-auto flex h-full max-w-[1440px] items-end px-5 pb-8 sm:px-8 sm:pb-12 lg:px-12 lg:pb-16">
              <div className="max-w-lg text-[#2d2925] dark:text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#2d2925]/70 dark:text-white/70">
                  {collection.name}
                </p>
                <h2 className="mt-3 text-5xl font-semibold uppercase leading-[0.92] sm:text-7xl lg:text-8xl">
                  {copy.spotlight}
                </h2>
                <p className="mt-5 max-w-md text-sm leading-6 text-[#2d2925]/78 dark:text-white/78">
                  {collection.summary}
                </p>
                <span className="mt-7 inline-flex border-b border-current pb-1 text-sm font-medium">
                  {copy.heroCta}
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

function SocialProofSection({ products, copy }: { products: Product[]; copy: HomeCopy }) {
  const ratedProducts = products.filter((product) => product.rating > 0);
  const averageRating = ratedProducts.length
    ? ratedProducts.reduce((sum, product) => sum + product.rating, 0) / ratedProducts.length
    : 0;
  const totalReviews = products.reduce((sum, product) => sum + (product.reviews ?? 0), 0);

  const stats = [
    [averageRating.toFixed(1), copy.averageRating],
    [`${totalReviews.toLocaleString()}+`, copy.customerReviews],
    [`${products.length}+`, copy.performanceStyles],
  ] as const;

  return (
    <section className="border-b border-[var(--border)] bg-[var(--background)]">
      <div className="mx-auto grid max-w-[1440px] gap-10 border-t border-[var(--border)] px-5 py-16 sm:grid-cols-3 sm:px-8 sm:py-20 lg:px-12">
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

function HomeProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const selectedColor = product.colors[0] ?? "";
  const selectedMedia = product.variantMediaByColor?.[selectedColor] ?? [];
  const primaryMedia = selectedMedia.find((media) => media.type === "IMAGE" && !media.isHoverImage);
  const image = primaryMedia?.url ?? product.images[0] ?? "/images/velora/hero-sculpted-essentials.jpg";
  const price = product.salePrice ?? product.price;

  return (
    <article className="group min-w-0">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="storefront-product-media relative aspect-[3/4] overflow-hidden">
          <Image
            src={image}
            alt={`${product.name}${selectedColor ? ` in ${selectedColor}` : ""}`}
            fill
            priority={priority}
            fetchPriority={priority ? "high" : "low"}
            loading={priority ? "eager" : "lazy"}
            sizes="(min-width: 1800px) 260px, (min-width: 1024px) 25vw, (min-width: 640px) 42vw, 78vw"
            quality={72}
            className="object-cover transition duration-700 group-hover:scale-[1.015] motion-reduce:transition-none"
          />
          {product.badge ? (
            <span className="storefront-light-chip absolute start-3 top-3 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
              {product.badge}
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex min-h-6 items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" aria-hidden="true">
            {product.colors.slice(0, 4).map((color) => (
              <span
                key={color}
                className="storefront-swatch block size-[18px] border p-0.5"
                data-selected="false"
                style={{ backgroundColor: product.colorHex?.[color] ?? "#C5A46D" }}
              >
                <span />
              </span>
            ))}
          </div>
          {product.colors.length > 4 ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              +{product.colors.length - 4}
            </span>
          ) : null}
        </div>
          <div className="mt-2.5 grid gap-2 sm:flex sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h3 className="line-clamp-2 break-words text-sm font-medium leading-5 text-[var(--foreground)] sm:text-base sm:leading-6">{product.name}</h3>
              <p className="mt-1 truncate text-xs text-[var(--muted)] sm:text-sm">{product.category}</p>
            </div>
            <div className="shrink-0 text-sm sm:text-end">
            {product.salePrice ? (
              <>
                <p className="font-medium text-[#B42318]">{formatAed(product.salePrice)}</p>
                <p className="text-xs text-[var(--muted)] line-through">{formatAed(product.price)}</p>
              </>
            ) : (
              <p>{formatAed(price)}</p>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}

function ProductRail({
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
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <ProductScroller
          title={section.title}
          subtitle={section.subtitle}
          ctaHref={section.ctaHref ?? "/shop"}
          ctaLabel={section.ctaLabel ?? copy.viewTheCollection}
        >
          {shownProducts.map((product) => (
            <div
              key={product.id}
              className="homepage-product-slide min-w-0 shrink-0 snap-start"
              style={{ flex: "0 0 var(--homepage-product-slide-basis)" }}
            >
              <HomeProductCard product={product} />
            </div>
          ))}
        </ProductScroller>
      </div>
    </section>
  );
}

function CollectionStorySection({ collections, section, copy }: { collections: Collection[]; section: StorefrontHomepageSection; copy: HomeCopy }) {
  const collectionList = (section.collection ? [section.collection] : collections).slice(0, 2);
  if (!collectionList.length) return null;

  return (
    <section data-testid="home-collection-story" className="overflow-hidden bg-[var(--surface)] py-16 text-[var(--foreground)] sm:py-24 lg:py-32">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="mb-14 grid gap-6 border-t border-[var(--border)] pt-5 sm:mb-20 lg:grid-cols-[0.75fr_1.25fr]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            {copy.collectionsInFocus}
          </p>
          <p className="max-w-3xl text-3xl font-medium leading-tight sm:text-4xl lg:text-5xl">
            {copy.rhythmsOfADay}
          </p>
        </div>

        <div className="space-y-20 sm:space-y-28 lg:space-y-36">
        {collectionList.map((collection, index) => (
          <article
            key={collection.slug}
            className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12"
          >
            <Link
              href={`/collections/${collection.slug}`}
              style={cropStyle(section, { mobile: "4 / 5", desktop: "16 / 10" })}
              className={`homepage-collection-story-frame homepage-crop-frame group relative block overflow-hidden lg:col-span-8 ${
                index % 2 === 1 ? "lg:order-2" : ""
              }`}
            >
              <Image
                src={index === 0 && section.imageUrl ? section.imageUrl : collection.image}
                alt={collection.name}
                fill
                loading="lazy"
                fetchPriority="low"
                sizes="(min-width: 1024px) 66vw, 100vw"
                quality={72}
                style={index === 0 && section.imageUrl ? { objectPosition: focalPoint(section, "desktop") } : undefined}
                className="object-cover transition duration-1000 ease-out group-hover:scale-[1.025]"
              />
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
              <p className="mt-6 max-w-md text-sm leading-7 text-[var(--muted)]">
                {section.collection && index === 0
                  ? editorialBody(section, collection.summary)
                  : collection.summary}
              </p>
              <Link
                href={`/collections/${collection.slug}`}
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
        ))}
        </div>
      </div>
    </section>
  );
}

function StoryBandSection({ section, copy }: { section: StorefrontHomepageSection; copy: HomeCopy }) {
  return (
    <section className="bg-[var(--surface)]">
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[1.35fr_0.65fr]">
        <div
          className="homepage-crop-frame relative min-h-[520px] lg:min-h-0"
          style={cropStyle(section, { mobile: "4 / 5", desktop: "16 / 10" })}
        >
          <Image
            src={section.imageUrl ?? "/images/velora/fit-guide.jpg"}
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
        <div className="flex flex-col justify-between px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            {section.subtitle ?? copy.fitConsidered}
          </p>
          <div className="mt-20 lg:mt-0">
            <h2 className="font-serif text-5xl leading-[0.98] sm:text-6xl">{section.title}</h2>
            <p className="mt-7 text-sm leading-7 text-[var(--muted)]">
              {editorialBody(section, copy.fitGuideBody)}
            </p>
            <Link
              href={section.ctaHref ?? "/fabric-guide"}
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

function NewsletterSection({ section, copy }: { section: StorefrontHomepageSection; copy: HomeCopy }) {
  return (
    <section className="border-y border-[var(--border)] bg-[var(--background)]">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1fr] lg:px-12 lg:py-24">
        <h2 className="font-serif text-5xl leading-none sm:text-6xl">{section.title}</h2>
        <div className="lg:pt-2">
          <p className="max-w-lg text-sm leading-7 text-[var(--muted)]">
            {editorialBody(section, copy.newsletterBody)}
          </p>
          <Link href="/#newsletter" className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
            {copy.joinTheList} <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ServiceStrip({ copy }: { copy: HomeCopy }) {
  const services = [
    [Truck, copy.complimentaryDelivery, copy.complimentaryDeliveryDetail],
    [Undo2, copy.consideredReturns, copy.consideredReturnsDetail],
    [Ruler, copy.personalFitGuidance, copy.personalFitGuidanceDetail],
    [CreditCard, copy.securePayment, copy.securePaymentDetail],
  ] as const;

  return (
    <section className="border-y border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto grid max-w-[1440px] gap-y-8 px-5 py-9 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-12">
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
        <MotionReveal key={section.id}>
          <ProductRail
            section={section}
            products={productsForSection(section, products, bestSellers)}
            featured
            copy={copy}
          />
        </MotionReveal>
      );
    case "COLLECTION_STORY":
      return (
        <MotionReveal key={section.id}>
          <CollectionStorySection section={section} collections={collections} copy={copy} />
        </MotionReveal>
      );
    case "PRODUCT_GRID":
      return (
        <MotionReveal key={section.id}>
          <ProductRail section={section} products={productsForSection(section, products, arrivals)} copy={copy} />
        </MotionReveal>
      );
    case "STORY_BAND":
      return (
        <MotionReveal key={section.id}>
          <StoryBandSection section={section} copy={copy} />
        </MotionReveal>
      );
    case "CUSTOM":
      return section.categoryMediaItems.length ? null : (
        <MotionReveal key={section.id}>
          <StoryBandSection section={section} copy={copy} />
        </MotionReveal>
      );
    case "NEWSLETTER":
      return (
        <MotionReveal key={section.id}>
          <NewsletterSection section={section} copy={copy} />
        </MotionReveal>
      );
    case "HERO":
      return null;
  }
}

export default async function Home() {
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
  const hero = homepageSections.find((section) => section.type === "HERO") ?? buildDefaultHeroSection(copy);
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
  const defaultCollectionStorySection: StorefrontHomepageSection = {
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
      <HeroSection section={hero} copy={copy} />
      <MotionReveal className="homepage-deferred-section">
        <CategoryMediaSection section={categoryMediaSection} categories={categories} copy={copy} />
      </MotionReveal>
      <MotionReveal className="homepage-deferred-section">
        <CollectionSpotlightBanner collection={latestCollection ?? collections[0]} copy={copy} />
      </MotionReveal>
      <MotionReveal className="homepage-deferred-section">
        <ProductRail
          section={newCollectionSection}
          products={compactProductsForList(fillProductSlider(latestCollectionProducts, arrivals.length ? arrivals : products))}
          featured
          copy={copy}
        />
      </MotionReveal>
      <MotionReveal className="homepage-deferred-section">
        <CollectionStorySection section={collectionStorySection ?? defaultCollectionStorySection} collections={collections} copy={copy} />
      </MotionReveal>
      <MotionReveal className="homepage-deferred-section">
        <ProductRail section={bestSellerSection} products={listBestSellers.length ? listBestSellers : listProducts} copy={copy} />
      </MotionReveal>
      {supportingSections.map((section) =>
        renderHomepageSection(section, listProducts, collections, listBestSellers.length ? listBestSellers : listProducts, listArrivals.length ? listArrivals : listProducts, copy),
      )}
      <MotionReveal className="homepage-deferred-section">
        <SocialProofSection products={products} copy={copy} />
      </MotionReveal>
      <MotionReveal className="homepage-deferred-section">
        <ServiceStrip copy={copy} />
      </MotionReveal>
    </>
  );
}
