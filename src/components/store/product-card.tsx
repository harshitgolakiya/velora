"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Play } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import type { Product, ProductMedia } from "@/lib/catalog";
import { getDiscountPercentage, getProductBadges } from "@/lib/product-presentation";
import { trackSearchClick } from "@/lib/search-click-client";
import { useStore } from "@/lib/store";
import { cn, formatAed } from "@/lib/utils";
import { localeFromPathname, localizedPath } from "@/lib/i18n-shell";

const swatchColors: Record<string, string> = {
  Black: "#2C2824",
  Ink: "#1F2630",
  Sage: "#9FA895",
  Oat: "#D7CBB9",
  Pearl: "#E7E1D6",
  Espresso: "#4C3529",
  Stone: "#B8B2A7",
  Fig: "#5C3F4F",
  Midnight: "#151B26",
  Taupe: "#A99683",
  Sand: "#CDBB9F",
  Sea: "#8FA8AE",
};

export function productCardImageFit(media: Pick<ProductMedia, "width" | "height"> | undefined) {
  if (!media?.width || !media.height) return "object-cover";
  const ratio = media.width / media.height;
  return ratio < 0.72 ? "object-contain" : "object-cover";
}

export function ProductCard({
  product,
  priority = false,
  className,
  imageSizes = "(min-width: 1600px) 280px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
}: {
  product: Product;
  priority?: boolean;
  className?: string;
  imageSizes?: string;
}) {
  const wishlist = useStore((state) => state.wishlist);
  const pathname = usePathname();
  const productHref = localizedPath(`/product/${product.slug}`, localeFromPathname(pathname));
  const toggleWishlist = useStore((state) => state.toggleWishlist);
  const liked = wishlist.includes(product.slug);
  const [selectedColor, setSelectedColor] = useState(product.colors[0] ?? "");
  const selectedMedia = product.variantMediaByColor?.[selectedColor] ?? [];
  const selectedImages = selectedMedia.filter((media) => media.type === "IMAGE");
  const motionMedia = selectedMedia.find((media) => media.type === "VIDEO");
  const primaryMedia = selectedImages.find((media) => !media.isHoverImage);
  const image = primaryMedia?.url ?? product.images[0];
  const hoverMedia =
    selectedImages.find((media) => media.isHoverImage) ??
    selectedImages.find((media) => media.url !== image);
  const hoverImage =
    hoverMedia?.url ??
    (!selectedImages.length && product.hoverImage && product.hoverImage !== image ? product.hoverImage : undefined) ??
    (!selectedImages.length ? product.images[1] : undefined);
  const imageFit = productCardImageFit(primaryMedia);
  const badges = getProductBadges(product);
  const discount = getDiscountPercentage(product);

  function rememberPosition() {
    sessionStorage.setItem("velora-product-list-scroll", String(window.scrollY));
    sessionStorage.setItem("velora-product-list-path", `${window.location.pathname}${window.location.search}`);
    if (window.location.pathname === "/search" || window.location.pathname === "/ar/search") {
      const query = new URLSearchParams(window.location.search).get("q") ?? "";
      trackSearchClick({
        query,
        source: "results_page",
        resultType: "product",
        resultId: product.id,
        href: productHref,
      });
    }
  }

  return (
    <article className={cn("storefront-product-card relative min-w-0", className)}>
      <div className="storefront-product-card-media storefront-product-media relative">
        <Link href={productHref} className="storefront-product-media-link block" onClick={rememberPosition}>
          <div className="relative aspect-[3/4]">
            <Image
              key={`primary-${selectedColor}-${image}`}
              src={image}
              alt={`${product.name} in ${selectedColor || "selected color"}`}
              fill
              priority={priority}
              fetchPriority={priority ? "high" : "low"}
              loading={priority ? "eager" : "lazy"}
              decoding={priority ? "sync" : "async"}
              sizes={imageSizes}
              quality={priority ? 72 : 84}
              draggable={false}
              className={cn(
                !priority && "storefront-product-primary-image transition duration-700 ease-out motion-reduce:transition-none",
                imageFit,
              )}
            />
            {hoverImage ? (
              <Image
                key={`hover-${selectedColor}-${hoverImage}`}
                src={hoverImage}
                alt=""
                aria-hidden="true"
                fill
                loading="lazy"
                fetchPriority="low"
                sizes={imageSizes}
                quality={84}
                draggable={false}
                className={cn(
                  "storefront-product-hover-image pointer-events-none opacity-0 transition duration-500 motion-reduce:transition-none",
                  imageFit,
                )}
              />
            ) : null}
            {motionMedia ? (
              <>
                <video
                  src={motionMedia.url}
                  poster={image}
                  className="storefront-product-motion-media pointer-events-none absolute inset-0 hidden h-full w-full object-cover opacity-0 transition duration-500 motion-reduce:hidden"
                  muted
                  loop
                  playsInline
                  autoPlay
                  preload="none"
                  aria-hidden="true"
                />
                <span className="storefront-light-chip absolute bottom-3 left-3 hidden items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] [@media(hover:hover)_and_(pointer:fine)]:inline-flex">
                  <Play className="size-3 fill-current" />
                  Motion
                </span>
              </>
            ) : null}
            {badges.length ? (
              <div className="absolute start-3 top-3 flex max-w-[calc(100%-4.5rem)] flex-wrap gap-1.5">
                {badges.map((badge) => (
                  <span
                    key={badge.label}
                    className={cn(
                      "storefront-light-chip px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-sm",
                      badge.tone === "sale" && "bg-[#B42318] text-white",
                      badge.tone === "dark" && "bg-stone-950 text-white",
                    )}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </Link>
        <button
          type="button"
          aria-label={liked ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={liked}
          onClick={() => toggleWishlist(product.slug)}
          className="storefront-action storefront-icon-button storefront-product-overlay-control absolute end-3 top-3 grid size-9 place-items-center transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17262D] sm:size-10 motion-reduce:transition-none"
        >
          <Heart className={cn("size-5", liked && "fill-[#d12b2b] text-[#d12b2b]")} />
        </button>
      </div>
      <div className="mt-2.5 flex min-h-8 items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Available colors for ${product.name}`}>
          {product.colors.map((color) => (
            <button
              type="button"
              key={color}
              aria-label={`Show ${product.name} in ${color}`}
              aria-pressed={selectedColor === color}
              title={color}
              onClick={() => setSelectedColor(color)}
              className={cn(
                "storefront-action storefront-swatch grid size-9 place-items-center p-0 outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--foreground)] focus-visible:ring-offset-2 sm:size-8 motion-reduce:transition-none",
              )}
            >
              <span
                aria-hidden="true"
                style={{ backgroundColor: product.colorHex?.[color] ?? swatchColors[color] ?? "#BCE3F4" }}
              />
            </button>
          ))}
        </div>
        {product.stock > 0 && product.stock <= 5 ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            {product.stock} left
          </span>
        ) : null}
      </div>
      <div className="mt-0.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-4">
        <div className="min-w-0">
          <Link
            href={productHref}
            onClick={rememberPosition}
            className="line-clamp-2 min-h-10 break-words text-sm font-medium leading-5 text-[var(--foreground)] hover:underline sm:min-h-12 sm:text-base sm:leading-6"
          >
            {product.name}
          </Link>
        </div>
        <div className="shrink-0 text-sm sm:text-end">
          {product.salePrice ? (
            <>
              <p className="font-medium text-[#B42318]">{formatAed(product.salePrice, localeFromPathname(pathname))}</p>
              <p className="text-xs text-[var(--muted)] line-through">{formatAed(product.price, localeFromPathname(pathname))}</p>
              {discount ? <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[#B42318]">Save {discount}%</p> : null}
            </>
          ) : (
            <p>{formatAed(product.price, localeFromPathname(pathname))}</p>
          )}
        </div>
      </div>
    </article>
  );
}
