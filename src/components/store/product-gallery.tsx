"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Expand,
  Pause,
  Play,
  Share2,
} from "lucide-react";
import type { Product } from "@/lib/catalog";
import {
  canZoomSource,
  focalObjectPosition,
  galleryViewerWidth,
  resolveProductGalleryMedia,
  sourceResolutionLabel,
  type GalleryPresentationMedia,
} from "@/lib/product-gallery-presentation";

const ProductGalleryViewer = dynamic(() => import("./product-gallery-viewer").then((mod) => mod.ProductGalleryViewer), {
  ssr: false,
});

export function ProductGallery({
  product,
  selectedColor,
}: {
  product: Product;
  selectedColor?: string;
}) {
  const media = useMemo<GalleryPresentationMedia[]>(
    () => resolveProductGalleryMedia(product, selectedColor),
    [product, selectedColor],
  );
  const [active, setActive] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeIndex = active < media.length ? active : 0;
  const activeMedia = media[activeIndex] ?? media[0];
  const activeImageWidth = activeMedia?.type === "IMAGE" ? activeMedia.width : undefined;
  const activeImageRatio =
    activeMedia?.type === "IMAGE" && activeMedia.width && activeMedia.height
      ? activeMedia.width / activeMedia.height
      : undefined;
  const shouldEnlargePackshot = activeImageRatio !== undefined && activeImageRatio < 0.72;
  const isAccessoryPackshot = product.category.toLowerCase().includes("tumbler");
  const canSourceZoom = canZoomSource(activeMedia);
  const viewerWidth = galleryViewerWidth(activeMedia, zoomed);
  const resolutionLabel = sourceResolutionLabel(activeMedia);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setZoomed(false);
        setActive((index) => (index - 1 + media.length) % media.length);
      }
      if (event.key === "ArrowRight") {
        setZoomed(false);
        setActive((index) => (index + 1) % media.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [media.length]);

  const previous = () => {
    setZoomed(false);
    setActive((index) => (index - 1 + media.length) % media.length);
  };

  const next = () => {
    setZoomed(false);
    setActive((index) => (index + 1) % media.length);
  };

  async function shareProduct() {
    const shareData = { title: product.name, url: window.location.href };
    if (navigator.share) {
      await navigator.share(shareData).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(shareData.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 45) return;
    if (distance > 0) previous();
    else next();
  }

  function toggleVideo() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  const controls = (
    <>
      {media.length > 1 ? (
        <>
          <button
            type="button"
            onClick={previous}
            aria-label="Previous media"
            className="storefront-action storefront-light-control absolute left-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center border shadow-sm transition motion-reduce:transition-none"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next media"
            className="storefront-action storefront-light-control absolute right-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center border shadow-sm transition motion-reduce:transition-none"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      ) : null}
    </>
  );

  return (
    <div className="min-w-0">
      <div
        className="storefront-product-media relative aspect-[4/3] overflow-hidden sm:aspect-square"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0].clientX;
        }}
        onTouchEnd={handleTouchEnd}
      >
        {activeMedia?.type === "VIDEO" ? (
          <>
            <video
              ref={videoRef}
              src={activeMedia.url}
              className="size-full object-contain"
              playsInline
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
            <button
              type="button"
              onClick={toggleVideo}
              className="storefront-action storefront-light-control absolute left-1/2 top-1/2 z-10 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center border shadow"
              aria-label={playing ? "Pause video" : "Play video"}
            >
              {playing ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
            </button>
          </>
        ) : (
          <Image
            src={activeMedia?.url ?? product.images[0]}
            alt={activeMedia?.altText ?? `${product.name}${selectedColor ? ` in ${selectedColor}` : ""}`}
            fill
            sizes="(min-width: 1440px) 735px, (min-width: 1024px) calc(55vw - 48px), 100vw"
            quality={72}
            decoding="sync"
            className={
              shouldEnlargePackshot
                ? isAccessoryPackshot
                  ? "object-cover"
                  : "object-contain scale-[1.08]"
                : "object-contain"
            }
            style={{ objectPosition: focalObjectPosition(activeMedia) }}
            priority
            fetchPriority="high"
            loading="eager"
          />
        )}

        {controls}

        <div className="absolute left-3 right-3 top-3 z-10 flex justify-between">
          <button
            type="button"
            onClick={shareProduct}
            aria-label={copied ? `Product link copied for ${product.name}` : `Share ${product.name}`}
            className="storefront-action storefront-light-control grid size-10 place-items-center border shadow-sm transition motion-reduce:transition-none"
          >
            {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
          </button>
          {activeMedia?.type === "IMAGE" ? (
            <button
              type="button"
              onClick={() => setViewerOpen(true)}
              aria-label={`Open media gallery for ${product.name}`}
              className="storefront-action storefront-light-control grid size-10 place-items-center border shadow-sm transition motion-reduce:transition-none"
            >
              <Expand className="size-4" />
            </button>
          ) : null}
        </div>

        {media.length > 1 ? (
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {media.map((item, index) => (
              <button
                type="button"
                key={`${item.url}-${index}`}
                onClick={() => setActive(index)}
                aria-label={`View media ${index + 1}`}
                className={`h-1.5 bg-[#fff] shadow transition-all motion-reduce:transition-none ${
                  index === activeIndex ? "w-6 opacity-100" : "w-1.5 opacity-55"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {media.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Product media thumbnails">
          {media.map((item, index) => (
            <button
              type="button"
              key={`${item.url}-${index}`}
              onClick={() => setActive(index)}
              aria-label={`View ${item.type === "VIDEO" ? "video" : "image"} ${index + 1}`}
              aria-current={index === activeIndex}
              className={`storefront-product-media relative aspect-square w-18 shrink-0 overflow-hidden border transition ${
                index === activeIndex ? "border-[var(--foreground)]" : "border-[var(--border)] opacity-65 hover:opacity-100"
              }`}
            >
              {item.type === "VIDEO" ? (
                <>
                  <video src={item.url} className="size-full object-cover" preload="metadata" muted />
                  <span className="absolute inset-0 grid place-items-center bg-black/15 text-white">
                    <Play className="size-5 fill-current" />
                  </span>
                </>
              ) : (
                <Image
                  src={item.url}
                  alt={item.altText ?? `${product.name} ${index + 1}`}
                  fill
                  className="object-cover"
                  style={{ objectPosition: focalObjectPosition(item) }}
                  sizes="72px"
                  quality={85}
                />
              )}
            </button>
          ))}
        </div>
      ) : null}

      {viewerOpen ? (
        <ProductGalleryViewer
          productName={product.name}
          open={viewerOpen}
          onOpenChange={(open) => {
            setViewerOpen(open);
            if (!open) setZoomed(false);
          }}
          activeMedia={activeMedia}
          activeImageWidth={activeImageWidth}
          canSourceZoom={canSourceZoom}
          viewerWidth={viewerWidth}
          zoomed={zoomed}
          setZoomed={setZoomed}
          resolutionLabel={resolutionLabel}
          previous={previous}
          next={next}
        />
      ) : null}
    </div>
  );
}
