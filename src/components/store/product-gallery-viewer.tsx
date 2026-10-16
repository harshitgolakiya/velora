"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { focalObjectPosition, type GalleryPresentationMedia } from "@/lib/product-gallery-presentation";
import { usePathname } from "next/navigation";
import { catalogCopy, localeFromPathname } from "@/lib/i18n";

export function ProductGalleryViewer({
  productName,
  open,
  onOpenChange,
  activeMedia,
  activeImageWidth,
  canSourceZoom,
  viewerWidth,
  zoomed,
  setZoomed,
  resolutionLabel,
  previous,
  next,
}: {
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeMedia?: GalleryPresentationMedia;
  activeImageWidth?: number;
  canSourceZoom: boolean;
  viewerWidth: string;
  zoomed: boolean;
  setZoomed: (value: boolean | ((current: boolean) => boolean)) => void;
  resolutionLabel?: string | null;
  previous: () => void;
  next: () => void;
}) {
  const locale = localeFromPathname(usePathname());
  const copy = catalogCopy[locale];
  const PrevIcon = locale === "ar" ? ChevronRight : ChevronLeft;
  const NextIcon = locale === "ar" ? ChevronLeft : ChevronRight;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="storefront-overlay fixed inset-0 z-[100] bg-[var(--scrim)] backdrop-blur-sm" />
        <Dialog.Content aria-label="Product media gallery" className="storefront-gallery-viewer fixed inset-0 z-[120] overflow-auto bg-[var(--background)]">
          <Dialog.Title className="sr-only">{productName} full-screen image</Dialog.Title>
          <Dialog.Description className="sr-only">Use the arrow controls or keyboard arrow keys to browse product images.</Dialog.Description>
          <div className="fixed end-4 top-4 z-[103] flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (canSourceZoom) setZoomed((value) => !value);
              }}
              aria-label={canSourceZoom ? (zoomed ? "Zoom out" : "Zoom in") : "Source image is not large enough to zoom"}
              disabled={!canSourceZoom}
              className="btn btn-soft btn-icon btn-round"
            >
              {zoomed ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
            </button>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close full-screen image" className="btn btn-soft btn-icon btn-round">
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
              src={activeMedia?.url ?? "/images/campaign/hero-courtyard.webp"}
              alt={activeMedia?.altText ?? `${productName} full-screen`}
              fill
              sizes={activeImageWidth ? `${activeImageWidth}px` : zoomed ? "150vw" : "100vw"}
              quality={84}
              className="object-contain p-5 sm:p-10"
              style={{ objectPosition: focalObjectPosition(activeMedia) }}
            />
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                previous();
              }}
              aria-label={copy.previousMedia}
              className="btn btn-soft btn-icon btn-round absolute start-4 top-1/2 z-10 -translate-y-1/2"
            >
              <PrevIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                next();
              }}
              aria-label={copy.nextMedia}
              className="btn btn-soft btn-icon btn-round absolute end-4 top-1/2 z-10 -translate-y-1/2"
            >
              <NextIcon className="size-5" />
            </button>
          </div>
          {resolutionLabel && !canSourceZoom ? <p className="badge fixed bottom-4 left-1/2 z-[103] -translate-x-1/2">{resolutionLabel}</p> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
