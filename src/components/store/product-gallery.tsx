"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Expand, Pause, Play, Share2 } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { usePathname } from "next/navigation";
import { catalogCopy, localeFromPathname } from "@/lib/i18n";
import {
  canZoomSource,
  focalObjectPosition,
  galleryViewerWidth,
  resolveProductGalleryMedia,
  sourceResolutionLabel,
  type GalleryPresentationMedia,
} from "@/lib/product-gallery-presentation";
import { cn } from "@/lib/utils";

const ProductGalleryViewer = dynamic(() => import("./product-gallery-viewer").then((mod) => mod.ProductGalleryViewer), {
  ssr: false,
});

function mediaFit(media: GalleryPresentationMedia | undefined) {
  if (!media || media.type !== "IMAGE" || !media.width || !media.height) return "object-cover";
  const ratio = media.width / media.height;
  return ratio < 0.72 || ratio > 1.1 ? "object-contain" : "object-cover";
}

export function ProductGallery({ product, selectedColor }: { product: Product; selectedColor?: string }) {
  const locale = localeFromPathname(usePathname());
  const copy = catalogCopy[locale];
  const rtl = locale === "ar";
  const media = useMemo<GalleryPresentationMedia[]>(() => resolveProductGalleryMedia(product, selectedColor), [product, selectedColor]);
  const [active, setActive] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [viewportRef, embla] = useEmblaCarousel({
    loop: media.length > 1,
    align: "start",
    direction: rtl ? "rtl" : "ltr",
    skipSnaps: false,
    duration: 22,
    watchDrag: media.length > 1,
  });

  const activeMedia = media[active] ?? media[0];
  const activeImageWidth = activeMedia?.type === "IMAGE" ? activeMedia.width : undefined;
  const canSourceZoom = canZoomSource(activeMedia);
  const viewerWidth = galleryViewerWidth(activeMedia, zoomed);
  const resolutionLabel = sourceResolutionLabel(activeMedia);

  const onSelect = useCallback(() => {
    if (!embla) return;
    setActive(embla.selectedScrollSnap());
    setZoomed(false);
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    embla.on("select", onSelect).on("reInit", onSelect).on("init", onSelect);
    return () => {
      embla.off("select", onSelect).off("reInit", onSelect).off("init", onSelect);
    };
  }, [embla, onSelect]);

  useEffect(() => {
    embla?.reInit();
    embla?.scrollTo(0, true);
  }, [embla, media]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!embla || media.length < 2) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft") (rtl ? embla.scrollNext : embla.scrollPrev)();
      if (event.key === "ArrowRight") (rtl ? embla.scrollPrev : embla.scrollNext)();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [embla, media.length, rtl]);

  const previous = () => embla?.scrollPrev();
  const next = () => embla?.scrollNext();

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

  function toggleVideo() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;

  return (
    <div className="min-w-0 lg:grid lg:grid-cols-[72px_minmax(0,1fr)] lg:gap-4">
      {media.length > 1 ? (
        <div className="order-2 mt-3 flex gap-2 overflow-x-auto lg:order-1 lg:mt-0 lg:max-h-[min(80vh,760px)] lg:flex-col lg:overflow-y-auto lg:pe-1" role="tablist" aria-label="Product media">
          {media.map((item, index) => (
            <button
              type="button"
              key={`${item.url}-${index}`}
              role="tab"
              aria-selected={index === active}
              aria-current={index === active}
              aria-label={`View media ${index + 1}`}
              onClick={() => embla?.scrollTo(index)}
              className="gallery-thumb aspect-[3/4] w-16 shrink-0 lg:w-full"
            >
              {item.type === "VIDEO" ? (
                <span className="absolute inset-0 grid place-items-center bg-[var(--card)] text-[var(--foreground)]"><Play className="size-4 fill-current" /></span>
              ) : (
                <Image src={item.url} alt="" fill sizes="72px" quality={60} className="object-cover" style={{ objectPosition: focalObjectPosition(item) }} />
              )}
            </button>
          ))}
        </div>
      ) : null}

      <div className="group/gallery relative order-1 lg:order-2">
        <div ref={viewportRef} className="storefront-product-media relative overflow-hidden" dir={rtl ? "rtl" : "ltr"}>
          <div className="flex touch-pan-y">
            {media.map((item, index) => (
              <div key={`${item.url}-${index}`} className="relative min-w-0 shrink-0 grow-0 basis-full">
                <div className="relative aspect-[4/5] sm:aspect-[3/4]">
                  {item.type === "VIDEO" ? (
                    <video
                      ref={index === active ? videoRef : undefined}
                      src={item.url}
                      poster={product.images[0]}
                      className="absolute inset-0 size-full object-cover"
                      autoPlay={!reduceMotion && index === active}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      onPlay={() => setPlaying(true)}
                      onPause={() => setPlaying(false)}
                      style={{ objectPosition: focalObjectPosition(item) }}
                    />
                  ) : (
                    <Image
                      src={item.url}
                      alt={item.altText ?? `${product.name}${selectedColor ? ` in ${selectedColor}` : ""}`}
                      fill
                      sizes="(min-width: 1440px) 680px, (min-width: 1024px) 52vw, 100vw"
                      quality={80}
                      priority={index === 0}
                      fetchPriority={index === 0 ? "high" : "low"}
                      loading={index === 0 ? "eager" : "lazy"}
                      draggable={false}
                      className={cn("select-none", mediaFit(item))}
                      style={{ objectPosition: focalObjectPosition(item) }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {media.length > 1 ? (
          <>
            <button
              type="button"
              onClick={previous}
              aria-label={copy.previousMedia}
              className="btn btn-on-photo btn-icon btn-round absolute start-3 top-1/2 z-10 hidden -translate-y-1/2 opacity-0 transition-opacity group-hover/gallery:opacity-100 focus-visible:opacity-100 sm:grid"
            >
              <PrevIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label={copy.nextMedia}
              className="btn btn-on-photo btn-icon btn-round absolute end-3 top-1/2 z-10 hidden -translate-y-1/2 opacity-0 transition-opacity group-hover/gallery:opacity-100 focus-visible:opacity-100 sm:grid"
            >
              <NextIcon className="size-5" />
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5 sm:hidden">
              {media.map((item, index) => (
                <span key={`${item.url}-dot-${index}`} aria-current={index === active} className="gallery-dot" />
              ))}
            </div>
          </>
        ) : null}

        <div className="absolute end-3 top-3 z-10 flex gap-2">
          <button type="button" onClick={shareProduct} aria-label={copied ? `Product link copied for ${product.name}` : `Share ${product.name}`} className="btn btn-on-photo btn-icon btn-sm btn-round">
            {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
          </button>
          {activeMedia?.type === "IMAGE" ? (
            <button type="button" onClick={() => setViewerOpen(true)} aria-label={`Open media gallery for ${product.name}`} className="btn btn-on-photo btn-icon btn-sm btn-round">
              <Expand className="size-4" />
            </button>
          ) : null}
        </div>

        {activeMedia?.type === "VIDEO" ? (
          <button type="button" onClick={toggleVideo} className="btn btn-on-photo btn-sm absolute bottom-4 start-4 z-10" aria-label={playing ? "Pause video" : "Play video"}>
            {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
            Motion
          </button>
        ) : null}
      </div>

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
