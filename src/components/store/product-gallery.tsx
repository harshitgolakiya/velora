"use client";

import * as Dialog from "@radix-ui/react-dialog";
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
  X,
  ZoomIn,
  ZoomOut,
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
  const canSourceZoom = canZoomSource(activeMedia);
  const viewerWidth = galleryViewerWidth(activeMedia, zoomed);
  const resolutionLabel = sourceResolutionLabel(activeMedia);

  const previous = () => {
    setZoomed(false);
    setActive((index) => (index - 1 + media.length) % media.length);
  };

  const next = () => {
    setZoomed(false);
    setActive((index) => (index + 1) % media.length);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

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
            className="absolute left-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center border border-white/65 bg-white/88 text-stone-950 shadow-sm backdrop-blur transition hover:bg-white motion-reduce:transition-none"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next media"
            className="absolute right-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center border border-white/65 bg-white/88 text-stone-950 shadow-sm backdrop-blur transition hover:bg-white motion-reduce:transition-none"
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
        className="relative aspect-square overflow-hidden bg-[var(--card)]"
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
              className="absolute left-1/2 top-1/2 z-10 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center border border-white/65 bg-white/90 text-stone-950 shadow"
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
            quality={92}
            className="object-contain"
            style={{ objectPosition: focalObjectPosition(activeMedia) }}
            priority
            loading="eager"
          />
        )}

        {controls}

        <div className="absolute left-3 right-3 top-3 z-10 flex justify-between">
          <button
            type="button"
            onClick={shareProduct}
            aria-label={copied ? "Product link copied" : "Share product"}
            className="grid size-10 place-items-center border border-white/65 bg-white/88 text-stone-950 shadow-sm backdrop-blur transition hover:bg-white motion-reduce:transition-none"
          >
            {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
          </button>
          {activeMedia?.type === "IMAGE" ? (
            <button
              type="button"
              onClick={() => setViewerOpen(true)}
              aria-label="Open full-screen image"
              className="grid size-10 place-items-center border border-white/65 bg-white/88 text-stone-950 shadow-sm backdrop-blur transition hover:bg-white motion-reduce:transition-none"
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
                className={`h-1.5 bg-white shadow transition-all motion-reduce:transition-none ${
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
              className={`relative aspect-square w-18 shrink-0 overflow-hidden border bg-[var(--card)] transition ${
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

      <Dialog.Root open={viewerOpen} onOpenChange={(open) => {
        setViewerOpen(open);
        if (!open) setZoomed(false);
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/82 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-0 z-[101] overflow-auto bg-[var(--background)]/96">
            <Dialog.Title className="sr-only">{product.name} full-screen image</Dialog.Title>
            <Dialog.Description className="sr-only">
              Use the arrow controls or keyboard arrow keys to browse product images.
            </Dialog.Description>
            <div className="fixed end-4 top-4 z-[103] flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (canSourceZoom) setZoomed((value) => !value);
              }}
              aria-label={canSourceZoom ? (zoomed ? "Zoom out" : "Zoom in") : "Source image is not large enough to zoom"}
              disabled={!canSourceZoom}
              className="grid size-11 place-items-center border border-white/65 bg-white text-stone-950 shadow disabled:cursor-not-allowed disabled:opacity-45"
            >
              {zoomed ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
            </button>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close full-screen image"
                  className="grid size-11 place-items-center border border-white/65 bg-white text-stone-950 shadow"
                >
                  <X className="size-5" />
                </button>
              </Dialog.Close>
            </div>
            <div
              className={`relative mx-auto min-h-screen transition-[width] duration-300 motion-reduce:transition-none ${
                zoomed && canSourceZoom ? "cursor-zoom-out" : canSourceZoom ? "cursor-zoom-in" : "cursor-default"
              }`}
              style={{ width: viewerWidth }}
              onClick={() => {
                if (canSourceZoom) setZoomed((value) => !value);
              }}
            >
              <Image
                src={activeMedia?.url ?? product.images[0]}
                alt={activeMedia?.altText ?? `${product.name} full-screen`}
                fill
                sizes={activeImageWidth ? `${activeImageWidth}px` : zoomed ? "150vw" : "100vw"}
                quality={92}
                className="object-contain"
                style={{ objectPosition: focalObjectPosition(activeMedia) }}
              />
              {controls}
            </div>
            {resolutionLabel && !canSourceZoom ? (
              <p className="fixed bottom-4 left-1/2 z-[103] -translate-x-1/2 bg-white px-4 py-2 text-center text-xs font-medium text-stone-950 shadow">
                {resolutionLabel}
              </p>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
