"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import type { Product, ProductMedia } from "@/lib/catalog";
import { getProductBadges } from "@/lib/product-presentation";
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
  return ratio < 0.72 || ratio > 1.1 ? "object-contain" : "object-cover";
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
  const locale = localeFromPathname(pathname);
  const productHref = localizedPath(`/product/${product.slug}`, locale);
  const toggleWishlist = useStore((state) => state.toggleWishlist);
  const liked = wishlist.includes(product.slug);
  const [selectedColor, setSelectedColor] = useState(product.colors[0] ?? "");
  const selectedMedia = product.variantMediaByColor?.[selectedColor] ?? [];
  const selectedImages = selectedMedia.filter((media) => media.type === "IMAGE");
  const primaryMedia = selectedImages.find((media) => !media.isHoverImage);
  const image = primaryMedia?.url ?? product.images[0];
  const hoverMedia =
    selectedImages.find((media) => media.isHoverImage) ??
    selectedImages.find((media) => media.url !== image);
  const hoverImage =
    hoverMedia?.url ??
    (!selectedImages.length && product.hoverImage && product.hoverImage !== image ? product.hoverImage : undefined) ??
    (!selectedImages.length ? product.images[1] : undefined);
  const motionMedia = selectedMedia.find((media) => media.type === "VIDEO");
  const imageFit = productCardImageFit(primaryMedia);
  const badges = getProductBadges(product);

  function rememberPosition() {
    sessionStorage.setItem("velora-product-list-scroll", String(window.scrollY));
    sessionStorage.setItem("velora-product-list-path", `${window.location.pathname}${window.location.search}`);
    if (window.location.pathname === "/search" || window.location.pathname === "/ar/search") {
      const query = new URLSearchParams(window.location.search).get("q") ?? "";
      trackSearchClick({ query, source: "results_page", resultType: "product", resultId: product.id, href: productHref });
    }
  }

  return (
    <article className={cn("storefront-product-card group/card relative min-w-0", className)}>
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
              sizes={imageSizes}
              quality={78}
              draggable={false}
              className={cn("storefront-product-primary-image transition duration-700 ease-out motion-reduce:transition-none", imageFit)}
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
                quality={78}
                draggable={false}
                className={cn("storefront-product-hover-image pointer-events-none opacity-0 transition duration-500 motion-reduce:transition-none", imageFit)}
              />
            ) : null}
            {motionMedia ? (
              <video
                key={`motion-${selectedColor}-${motionMedia.url}`}
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
            ) : null}
            {badges.length ? (
              <div className="absolute start-3 top-3 flex max-w-[calc(100%-4rem)] flex-wrap gap-1.5">
                {badges.map((badge) => (
                  <span key={badge.label} className={cn("badge", badge.tone === "sale" && "badge-sale", badge.tone === "dark" && "badge-accent")}>
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
          className={cn(
            "btn btn-on-photo btn-icon btn-sm btn-round absolute end-2.5 top-2.5 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100",
            liked && "[@media(hover:hover)]:opacity-100",
          )}
        >
          <Heart className={cn("size-4", liked && "fill-[var(--sale)] text-[var(--sale)]")} />
        </button>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={productHref} onClick={rememberPosition} className="line-clamp-2 text-[15px] font-medium leading-5 text-[var(--foreground)]">
            {product.name}
          </Link>
          <p className="mt-1 text-xs text-[var(--muted)]">{product.category}</p>
        </div>
        <div className="shrink-0 text-end text-sm">
          {product.salePrice ? (
            <>
              <p className="font-medium price-sale">{formatAed(product.salePrice, locale)}</p>
              <p className="text-xs text-[var(--muted)] line-through">{formatAed(product.price, locale)}</p>
            </>
          ) : (
            <p className="font-medium">{formatAed(product.price, locale)}</p>
          )}
        </div>
      </div>

      {product.colors.length > 1 ? (
        <div className="mt-2 flex items-center gap-1" role="group" aria-label={`Available colors for ${product.name}`}>
          {product.colors.map((color) => (
            <button
              type="button"
              key={color}
              aria-label={`Show ${product.name} in ${color}`}
              aria-pressed={selectedColor === color}
              title={color}
              onClick={() => setSelectedColor(color)}
              className="swatch swatch-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              <span aria-hidden="true" style={{ backgroundColor: product.colorHex?.[color] ?? swatchColors[color] ?? "#B8B2A7" }} />
            </button>
          ))}
          {product.stock > 0 && product.stock <= 5 ? <span className="ms-auto text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{product.stock} left</span> : null}
        </div>
      ) : null}
    </article>
  );
}
