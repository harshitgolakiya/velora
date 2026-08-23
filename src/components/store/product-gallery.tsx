"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { motion, useDragControls, type PanInfo } from "framer-motion";
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
  const locale = localeFromPathname(usePathname());
  const copy = catalogCopy[locale];
  const media = useMemo<GalleryPresentationMedia[]>(
    () => resolveProductGalleryMedia(product, selectedColor),
    [product, selectedColor],
  );
  const [active, setActive] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const dragControls = useDragControls();
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
        setActive((index) => (index + (locale === "ar" ? 1 : -1) + media.length) % media.length);
      }
      if (event.key === "ArrowRight") {
        setZoomed(false);
        setActive((index) => (index + (locale === "ar" ? -1 : 1) + media.length) % media.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [locale, media.length]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

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

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    setDragging(false);
    const shouldChange = Math.abs(info.offset.x) > 54 || Math.abs(info.velocity.x) > 260;
    if (!shouldChange) return;
    if (info.offset.x > 0) {
      if (locale === "ar") next();
      else previous();
    } else if (locale === "ar") previous();
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
            aria-label={copy.previousMedia}
            className="storefront-action storefront-light-control absolute left-2 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center border shadow-sm transition sm:left-3 sm:size-11 motion-reduce:transition-none"
          >
            {locale === "ar" ? <ChevronRight className="size-4 sm:size-5" /> : <ChevronLeft className="size-4 sm:size-5" />}
          </button>
          <button
            type="button"
            onClick={next}
            aria-label={copy.nextMedia}
            className="storefront-action storefront-light-control absolute right-2 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center border shadow-sm transition sm:right-3 sm:size-11 motion-reduce:transition-none"
          >
            {locale === "ar" ? <ChevronLeft className="size-4 sm:size-5" /> : <ChevronRight className="size-4 sm:size-5" />}
          </button>
        </>
      ) : null}
    </>
  );

  return (
    <div className="min-w-0">
      <motion.div
        drag={media.length > 1 ? "x" : false}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        dragMomentum={false}
        onDragStart={() => setDragging(true)}
        onDragEnd={handleDragEnd}
        onPointerDownCapture={(event) => {
          if (media.length < 2) return;
          if ((event.target as HTMLElement).closest("button")) return;
          dragControls.start(event.nativeEvent);
        }}
        className={`storefront-product-media relative aspect-[4/3] overflow-hidden select-none sm:aspect-square ${
          media.length > 1 ? dragging ? "cursor-grabbing" : "cursor-grab" : ""
        }`}
      >
        {activeMedia?.type === "VIDEO" ? (
          <>
            <video
              key={`${activeMedia.url}-${activeIndex}`}
              ref={videoRef}
              src={activeMedia.url}
              poster={product.images[0]}
              className="gallery-image-enter size-full object-cover"
              autoPlay={!reduceMotion}
              muted
              loop
              playsInline
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              style={{ objectPosition: focalObjectPosition(activeMedia) }}
            />
            <button
              type="button"
              onClick={toggleVideo}
              className="storefront-action storefront-light-control absolute bottom-4 left-4 z-10 inline-flex h-10 items-center gap-2 border px-3 text-xs font-semibold uppercase tracking-[0.12em] shadow sm:h-11"
              aria-label={playing ? "Pause video" : "Play video"}
            >
              {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
              Motion
            </button>
            <span className="storefront-light-chip pointer-events-none absolute right-4 top-4 z-10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] shadow">
              Video
            </span>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(0deg,rgba(0,0,0,.32),transparent)]" />
          </>
        ) : (
          <Image
            key={`${activeMedia?.url ?? "fallback"}-${activeIndex}`}
            src={activeMedia?.url ?? product.images[0]}
            alt={activeMedia?.altText ?? `${product.name}${selectedColor ? ` in ${selectedColor}` : ""}`}
            fill
            sizes="(min-width: 1440px) 620px, (min-width: 1024px) calc(50vw - 48px), 100vw"
            quality={72}
            decoding="sync"
            className={
              "gallery-image-enter " +
              (shouldEnlargePackshot
                ? isAccessoryPackshot
                  ? "object-cover"
                  : "object-contain scale-[1.08]"
                : "object-contain")
            }
            draggable={false}
            style={{ objectPosition: focalObjectPosition(activeMedia) }}
            priority
            fetchPriority="high"
            loading="eager"
          />
        )}

        {controls}

        <div className="absolute left-2 right-2 top-2 z-10 flex justify-between sm:left-3 sm:right-3 sm:top-3">
          <button
            type="button"
            onClick={shareProduct}
            aria-label={copied ? `Product link copied for ${product.name}` : `Share ${product.name}`}
            className="storefront-action storefront-light-control grid size-10 place-items-center border shadow-sm transition sm:size-11 motion-reduce:transition-none"
          >
            {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
          </button>
          {activeMedia?.type === "IMAGE" ? (
            <button
              type="button"
              onClick={() => setViewerOpen(true)}
              aria-label={`Open media gallery for ${product.name}`}
              className="storefront-action storefront-light-control grid size-10 place-items-center border shadow-sm transition sm:size-11 motion-reduce:transition-none"
            >
              <Expand className="size-4" />
            </button>
          ) : null}
        </div>

        {media.length > 1 ? (
          <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-0.5 rounded-full bg-black/10 px-1 py-0.5 backdrop-blur-sm sm:bottom-3">
            {media.map((item, index) => (
              <button
                type="button"
                key={`${item.url}-${index}`}
                onClick={() => setActive(index)}
                aria-label={`View media ${index + 1}`}
                aria-current={index === activeIndex}
                className="storefront-action grid size-10 place-items-center"
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 rounded-full bg-[#fff] shadow transition-all motion-reduce:transition-none ${
                    index === activeIndex ? "w-5 opacity-100" : "w-1.5 opacity-65"
                  }`}
                />
              </button>
            ))}
          </div>
        ) : null}
      </motion.div>

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
