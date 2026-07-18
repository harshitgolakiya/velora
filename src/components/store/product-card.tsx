"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, Heart } from "lucide-react";
import { useState } from "react";
import type { Product, ProductMedia } from "@/lib/catalog";
import { getDiscountPercentage, getProductBadges } from "@/lib/product-presentation";
import { trackSearchClick } from "@/lib/search-click-client";
import { useStore } from "@/lib/store";
import { cn, formatAed } from "@/lib/utils";
import { QuickView } from "./quick-view";

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
  const toggleWishlist = useStore((state) => state.toggleWishlist);
  const liked = wishlist.includes(product.slug);
  const [selectedColor, setSelectedColor] = useState(product.colors[0] ?? "");
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const selectedMedia = product.variantMediaByColor?.[selectedColor] ?? [];
  const selectedImages = selectedMedia.filter((media) => media.type === "IMAGE");
  const primaryMedia = selectedImages.find((media) => !media.isHoverImage);
  const image = primaryMedia?.url ?? product.images[0];
  const hoverMedia =
    selectedImages.find((media) => media.isHoverImage) ??
    selectedImages.find((media) => media.url !== image);
  const hoverImage =
    hoverMedia?.url ??
    (product.hoverImage && product.hoverImage !== image ? product.hoverImage : product.images[1]);
  const imageFit = productCardImageFit(primaryMedia);
  const badges = getProductBadges(product);
  const discount = getDiscountPercentage(product);

  function rememberPosition() {
    sessionStorage.setItem("velora-product-list-scroll", String(window.scrollY));
    sessionStorage.setItem("velora-product-list-path", `${window.location.pathname}${window.location.search}`);
    if (window.location.pathname === "/search") {
      const query = new URLSearchParams(window.location.search).get("q") ?? "";
      trackSearchClick({
        query,
        source: "results_page",
        resultType: "product",
        resultId: product.id,
        href: `/product/${product.slug}`,
      });
    }
  }

  return (
    <article className={cn("group relative min-w-0", className)}>
      <div className="storefront-product-media relative overflow-hidden">
        <Link href={`/product/${product.slug}`} className="block" onClick={rememberPosition}>
          <div className="relative aspect-[3/4]">
            <Image
              src={image}
              alt={`${product.name} in ${selectedColor || "selected color"}`}
              fill
              priority={priority}
              fetchPriority={priority ? "high" : "low"}
              loading={priority ? "eager" : "lazy"}
              decoding={priority ? "sync" : "async"}
              sizes={imageSizes}
              quality={priority ? 72 : 84}
              className={cn(
                !priority && "transition duration-700 ease-out motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.015]",
                imageFit,
              )}
            />
            {hoverImage ? (
              <Image
                src={hoverImage}
                alt=""
                aria-hidden="true"
                fill
                loading="lazy"
                fetchPriority="low"
                sizes={imageSizes}
                quality={84}
                className={cn(
                  "pointer-events-none opacity-0 transition duration-500 motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100",
                  imageFit,
                )}
              />
            ) : null}
            {badges.length ? (
              <div className="absolute start-3 top-3 flex max-w-[70%] flex-wrap gap-1.5">
                {badges.map((badge) => (
                  <span
                    key={badge.label}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                      badge.tone === "sale" && "bg-[#B42318] text-white",
                      badge.tone === "dark" && "bg-stone-950 text-white",
                      badge.tone === "light" && "storefront-light-chip",
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
          className="storefront-action storefront-light-control absolute end-2.5 top-2.5 grid size-9 place-items-center border shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-950 sm:end-3 sm:top-3 sm:size-10 motion-reduce:transition-none"
        >
          <Heart className={cn("size-4.5", liked && "fill-current")} />
        </button>
        <button
          type="button"
          aria-label={`Quick view ${product.name}`}
          onClick={() => setQuickViewOpen(true)}
          className="storefront-action storefront-light-control absolute end-2.5 top-[3.25rem] grid size-9 place-items-center border shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-950 sm:end-3 sm:top-14 sm:size-10 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 motion-reduce:transition-none"
        >
          <Eye className="size-4.5" />
        </button>
        {quickViewOpen ? (
          <QuickView product={product} open={quickViewOpen} onOpenChange={setQuickViewOpen} showTrigger={false} />
        ) : null}
      </div>
      <div className="mt-3 flex min-h-6 items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label={`Available colors for ${product.name}`}>
          {product.colors.map((color) => (
            <button
              type="button"
              key={color}
              aria-label={`Show ${product.name} in ${color}`}
              aria-pressed={selectedColor === color}
              title={color}
              onClick={() => setSelectedColor(color)}
              className={cn(
                "storefront-action storefront-swatch size-[18px] border p-0.5 outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--foreground)] focus-visible:ring-offset-2 motion-reduce:transition-none",
              )}
            >
              <span
                aria-hidden="true"
                style={{ backgroundColor: product.colorHex?.[color] ?? swatchColors[color] ?? "#C5A46D" }}
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
      <div className="mt-2.5 grid gap-2 sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <Link
            href={`/product/${product.slug}`}
            onClick={rememberPosition}
            className="line-clamp-2 break-words text-sm font-medium leading-5 text-[var(--foreground)] hover:underline sm:text-base sm:leading-6"
          >
            {product.name}
          </Link>
          <p className="mt-1 truncate text-xs text-[var(--muted)] sm:text-sm">{product.category}</p>
        </div>
        <div className="shrink-0 text-sm sm:text-end">
          {product.salePrice ? (
            <>
              <p className="font-medium text-[#B42318]">{formatAed(product.salePrice)}</p>
              <p className="text-xs text-[var(--muted)] line-through">{formatAed(product.price)}</p>
              {discount ? <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[#B42318]">Save {discount}%</p> : null}
            </>
          ) : (
            <p>{formatAed(product.price)}</p>
          )}
        </div>
      </div>
    </article>
  );
}
