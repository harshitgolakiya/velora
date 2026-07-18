"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { focalObjectPosition, type GalleryPresentationMedia } from "@/lib/product-gallery-presentation";

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
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="storefront-overlay fixed inset-0 z-[100] bg-black/82 backdrop-blur-sm" />
        <Dialog.Content
          aria-label="Product media gallery"
          className="storefront-gallery-viewer fixed inset-0 z-[120] overflow-auto bg-[var(--background)]/96"
        >
          <Dialog.Title className="sr-only">{productName} full-screen image</Dialog.Title>
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
              className="storefront-action storefront-light-control grid size-11 place-items-center border shadow disabled:cursor-not-allowed disabled:opacity-45"
            >
              {zoomed ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
            </button>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close full-screen image"
                className="storefront-action storefront-light-control grid size-11 place-items-center border shadow"
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
            <div className="absolute inset-4 bg-[#E6E4DE] shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:inset-8" aria-hidden="true" />
            <Image
              src={activeMedia?.url ?? "/images/velora/hero-sculpted-essentials.jpg"}
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
              aria-label="Previous media"
              className="storefront-action storefront-light-control absolute left-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center border shadow-sm transition motion-reduce:transition-none"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                next();
              }}
              aria-label="Next media"
              className="storefront-action storefront-light-control absolute right-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center border shadow-sm transition motion-reduce:transition-none"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
          {resolutionLabel && !canSourceZoom ? (
            <p className="storefront-light-chip fixed bottom-4 left-1/2 z-[103] -translate-x-1/2 px-4 py-2 text-center text-xs font-medium shadow">
              {resolutionLabel}
            </p>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
