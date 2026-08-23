"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Film, GripVertical, ImagePlus, Loader2, Plus, Save, Search, Star, Trash2, Upload, X } from "lucide-react";
import type {
  AdminCategoryOption,
  AdminCollectionOption,
  AdminMediaAsset,
  AdminProduct,
  AdminTag,
} from "@/lib/admin-catalog";

type ProductFormProps = {
  product?: AdminProduct;
  categories: AdminCategoryOption[];
  collections: AdminCollectionOption[];
  tags: AdminTag[];
  mediaAssets: AdminMediaAsset[];
  mode?: "create" | "edit";
  onSaved?: (product: AdminProduct) => void;
};

type ColorGroup = {
  id: string;
  name: string;
  hex: string;
  gallery: GalleryItem[];
  hoverGalleryId: string;
  primaryGalleryId: string;
  video: string;
  videoFile?: File;
  stockBySize: Record<string, number>;
  skuBySize: Record<string, string>;
};

type GalleryItem = {
  id: string;
  name: string;
  url?: string;
  file?: File;
  preview: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";
type PendingRemoval = {
  title: string;
  message: string;
  confirm: () => void;
};

const inputClass =
  "h-10 w-full border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]";

const textareaClass =
  "min-h-24 w-full resize-y border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm leading-6 outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]";

const panelClass = "border border-[var(--border)] bg-[var(--surface)]";
const panelHeaderClass =
  "border-b border-[var(--border)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]";
const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusToEnum(status?: AdminProduct["status"]) {
  if (status === "Published") return "PUBLISHED";
  if (status === "Scheduled") return "SCHEDULED";
  if (status === "Archived") return "ARCHIVED";
  return "DRAFT";
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function galleryItemFromUrl(url: string): GalleryItem {
  return {
    id: url,
    name: url.split("/").pop() || url,
    url,
    preview: url,
  };
}

function galleryItemsFromFiles(files: File[]) {
  return files.map((file) => ({
    id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
    name: file.name,
    file,
    preview: URL.createObjectURL(file),
  }));
}

function galleryItemFromAsset(asset: AdminMediaAsset): GalleryItem {
  return {
    id: asset.url,
    name: asset.name || asset.originalName,
    url: asset.url,
    preview: asset.url,
  };
}

function buildVariantSku(baseSku: string, sizeName: string, colorName: string, customSku?: string) {
  return (
    customSku?.trim() ||
    `${baseSku}-${sizeName}-${colorName}`.toUpperCase().replace(/\s+/g, "-")
  );
}

function findDuplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  values.forEach((value) => {
    const normalized = value.trim().toUpperCase();
    if (!normalized) return;
    if (seen.has(normalized)) duplicates.add(value.trim());
    seen.add(normalized);
  });

  return Array.from(duplicates);
}

function ProductMediaPicker({
  title,
  assets,
  mediaType,
  onClose,
  onPick,
}: {
  title: string;
  assets: AdminMediaAsset[];
  mediaType: AdminMediaAsset["mediaType"];
  onClose: () => void;
  onPick: (asset: AdminMediaAsset) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = assets
    .filter((asset) => asset.mediaType === mediaType)
    .filter((asset) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return [
        asset.name,
        asset.originalName,
        asset.url,
        asset.folder ?? "",
        asset.altText ?? "",
        asset.tags.join(" "),
      ].some((value) => value.toLowerCase().includes(q));
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-5xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em]">{title}</p>
          <button type="button" onClick={onClose} className="text-[var(--muted)] transition hover:text-[var(--foreground)]">
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[82vh] overflow-y-auto p-5">
          <label className="mb-4 flex h-11 items-center gap-2 border border-[var(--border)] bg-[var(--background)] px-3">
            <Search className="size-4 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, folder, tag..."
              className="h-full w-full bg-transparent text-sm outline-none"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => onPick(asset)}
                className="border border-[var(--border)] bg-[var(--background)] p-3 text-left transition hover:border-[var(--accent)]"
              >
                <div className="relative aspect-square overflow-hidden bg-[var(--card)]">
                  {asset.mediaType === "IMAGE" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.url} alt={asset.altText ?? asset.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Film className="size-8 text-[var(--muted)]" />
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate text-xs font-semibold">{asset.name}</p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {asset.folder ? `/${asset.folder}` : "No folder"} · {formatBytes(asset.sizeBytes)}
                </p>
              </button>
            ))}
            {filtered.length === 0 ? (
              <div className="col-span-full border border-dashed border-[var(--border)] bg-[var(--background)] p-8 text-center text-sm text-[var(--muted)]">
                No {mediaType.toLowerCase()} assets found.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function productToColorGroups(product?: AdminProduct): ColorGroup[] {
  if (!product) {
    return [
      {
        id: crypto.randomUUID(),
        name: "Black",
        hex: "#111111",
        gallery: [],
        hoverGalleryId: "",
        primaryGalleryId: "",
        video: "",
        stockBySize: { XS: 0, S: 0, M: 0, L: 0 },
        skuBySize: {},
      },
    ];
  }

  return product.colors.map((color) => {
    const variants = product.variants.filter((variant) => variant.colorId === color.id);
    const media = variants[0]?.media ?? [];
    const gallery = uniqueValues(
      media
        .filter((item) => item.type === "IMAGE")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => item.url),
    ).map(galleryItemFromUrl);
    const hoverImage = media.find((item) => item.isHoverImage)?.url ?? "";
    const video = media.find((item) => item.type === "VIDEO")?.url ?? "";

    return {
      id: color.id,
      name: color.name,
      hex: color.hex,
      gallery,
      hoverGalleryId: gallery.find((item) => item.url === hoverImage)?.id ?? "",
      primaryGalleryId: product.images.find((image) => gallery.some((item) => item.url === image)) ?? gallery[0]?.id ?? "",
      video,
      stockBySize: Object.fromEntries(variants.map((variant) => [variant.sizeName, variant.stock])),
      skuBySize: Object.fromEntries(variants.map((variant) => [variant.sizeName, variant.sku ?? ""])),
    };
  });
}

async function uploadFiles(files: File[], onProgress?: (percent: number) => void) {
  if (!files.length) return [];

  const body = new FormData();
  files.forEach((file) => body.append("files", file));
  return new Promise<string[]>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/admin/uploads");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    });
    request.addEventListener("load", () => {
      let result: { message?: string; files?: { url: string }[] } = {};
      try {
        result = JSON.parse(request.responseText);
      } catch {
        result = {};
      }
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(result.message ?? `Upload rejected (${request.status || "network error"}${request.statusText ? ` ${request.statusText}` : ""}).`));
        return;
      }
      onProgress?.(100);
      resolve((result.files ?? []).map((file) => file.url));
    });
    request.addEventListener("error", () => reject(new Error("The upload was interrupted. Check your connection and try again.")));
    request.addEventListener("abort", () => reject(new Error("The upload was cancelled.")));
    request.send(body);
  });
}

export function ProductEditForm({
  product,
  categories,
  collections,
  tags,
  mediaAssets,
  mode = product ? "edit" : "create",
  onSaved,
}: ProductFormProps) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [sizeInput, setSizeInput] = useState(
    product?.sizes.map((size) => size.name).join(", ") || "XS, S, M, L",
  );
  const [customSize, setCustomSize] = useState("");
  const [colorGroups, setColorGroups] = useState<ColorGroup[]>(() => productToColorGroups(product));
  const [imagePickerColorId, setImagePickerColorId] = useState<string | null>(null);
  const [videoPickerColorId, setVideoPickerColorId] = useState<string | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<Record<string, { percent: number; status: "ready" | "uploading" | "processing" | "complete" | "error"; message?: string }>>({});
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const [draggedGalleryItem, setDraggedGalleryItem] = useState<{ colorId: string; itemId: string } | null>(null);
  const selectedCollectionIds = useMemo(
    () => new Set(product?.collections.map((collection) => collection.id) ?? []),
    [product?.collections],
  );
  const selectedTagIds = useMemo(
    () => new Set(product?.tags.map((tag) => tag.id) ?? []),
    [product?.tags],
  );
  const sizeNames = useMemo(
    () =>
      uniqueValues(
        sizeInput
          .split(",")
          .map((size) => size.trim())
          .filter(Boolean),
      ),
    [sizeInput],
  );

  function patchColor(id: string, patch: Partial<ColorGroup>) {
    setColorGroups((prev) => prev.map((color) => (color.id === id ? { ...color, ...patch } : color)));
  }

  function addColor() {
    setColorGroups((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        hex: "#BCE3F4",
        gallery: [],
        hoverGalleryId: "",
        primaryGalleryId: "",
        video: "",
        stockBySize: Object.fromEntries(sizeNames.map((size) => [size, 0])),
        skuBySize: {},
      },
    ]);
  }

  function addSize(size: string) {
    const cleaned = size.trim();
    if (!cleaned) return;

    const nextSizes = uniqueValues([...sizeNames, cleaned]);
    setSizeInput(nextSizes.join(", "));
    setCustomSize("");
    setColorGroups((prev) =>
      prev.map((color) => ({
        ...color,
        stockBySize: { ...color.stockBySize, [cleaned]: color.stockBySize[cleaned] ?? 0 },
        skuBySize: { ...color.skuBySize, [cleaned]: color.skuBySize[cleaned] ?? "" },
      })),
    );
  }

  function addGalleryFiles(colorId: string, files: File[]) {
    if (!files.length) return;

    setColorGroups((prev) =>
      prev.map((color) => {
        if (color.id !== colorId) return color;

        const gallery = [...color.gallery, ...galleryItemsFromFiles(files)];

        return {
          ...color,
          gallery,
          primaryGalleryId: color.primaryGalleryId || gallery[0]?.id || "",
          hoverGalleryId: color.hoverGalleryId || gallery[1]?.id || gallery[0]?.id || "",
        };
      }),
    );
  }

  function addGalleryAsset(colorId: string, asset: AdminMediaAsset) {
    setColorGroups((prev) =>
      prev.map((color) => {
        if (color.id !== colorId) return color;
        if (color.gallery.some((item) => item.url === asset.url)) return color;

        const gallery = [...color.gallery, galleryItemFromAsset(asset)];

        return {
          ...color,
          gallery,
          primaryGalleryId: color.primaryGalleryId || asset.url,
          hoverGalleryId: color.hoverGalleryId || gallery[1]?.id || gallery[0]?.id || "",
        };
      }),
    );
  }

  function removeGalleryItem(colorId: string, itemId: string) {
    setColorGroups((prev) =>
      prev.map((color) => {
        if (color.id !== colorId) return color;

        const gallery = color.gallery.filter((item) => item.id !== itemId);

        return {
          ...color,
          gallery,
          primaryGalleryId: color.primaryGalleryId === itemId ? gallery[0]?.id || "" : color.primaryGalleryId,
          hoverGalleryId: color.hoverGalleryId === itemId ? gallery[1]?.id || gallery[0]?.id || "" : color.hoverGalleryId,
        };
      }),
    );
  }

  function moveGalleryItem(colorId: string, itemId: string, direction: -1 | 1) {
    setColorGroups((prev) =>
      prev.map((color) => {
        if (color.id !== colorId) return color;

        const index = color.gallery.findIndex((item) => item.id === itemId);
        const targetIndex = index + direction;
        if (index < 0 || targetIndex < 0 || targetIndex >= color.gallery.length) return color;

        const gallery = [...color.gallery];
        const [item] = gallery.splice(index, 1);
        gallery.splice(targetIndex, 0, item);

        return { ...color, gallery };
      }),
    );
  }

  function reorderGalleryItem(colorId: string, sourceItemId: string, targetItemId: string) {
    if (sourceItemId === targetItemId) return;

    setColorGroups((prev) =>
      prev.map((color) => {
        if (color.id !== colorId) return color;

        const sourceIndex = color.gallery.findIndex((item) => item.id === sourceItemId);
        const targetIndex = color.gallery.findIndex((item) => item.id === targetItemId);
        if (sourceIndex < 0 || targetIndex < 0) return color;

        const gallery = [...color.gallery];
        const [item] = gallery.splice(sourceIndex, 1);
        gallery.splice(targetIndex, 0, item);

        return { ...color, gallery };
      }),
    );
  }

  function startGalleryDrag(event: React.DragEvent<HTMLDivElement>, colorId: string, itemId: string) {
    setDraggedGalleryItem({ colorId, itemId });
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${colorId}:${itemId}`);
  }

  function dropGalleryItem(event: React.DragEvent<HTMLDivElement>, colorId: string, targetItemId: string) {
    event.preventDefault();
    const [sourceColorId, sourceItemId] = event.dataTransfer.getData("text/plain").split(":");
    const activeColorId = sourceColorId || draggedGalleryItem?.colorId;
    const activeItemId = sourceItemId || draggedGalleryItem?.itemId;

    if (activeColorId === colorId && activeItemId) {
      reorderGalleryItem(colorId, activeItemId, targetItemId);
    }

    setDraggedGalleryItem(null);
  }

  function markPrimaryImage(colorId: string, itemId: string) {
    setColorGroups((prev) =>
      prev.map((color) => ({
        ...color,
        primaryGalleryId: color.id === colorId ? itemId : "",
      })),
    );
  }

  function removeSize(size: string) {
    const nextSizes = sizeNames.filter((item) => item !== size);
    setSizeInput(nextSizes.join(", "));
    setColorGroups((prev) =>
      prev.map((color) => {
        const stockBySize = { ...color.stockBySize };
        const skuBySize = { ...color.skuBySize };
        delete stockBySize[size];
        delete skuBySize[size];
        return { ...color, stockBySize, skuBySize };
      }),
    );
  }

  async function buildColorPayload() {
    const uploadedColors = await Promise.all(
      colorGroups.map(async (color) => {
        const uploadedGallery = await Promise.all(
          color.gallery.map(async (item) => ({
            id: item.id,
            url: item.url ?? (await uploadFiles(item.file ? [item.file] : []))[0],
          })),
        );
        let videoUploads: string[] = [];
        if (color.videoFile) {
          setVideoUploadProgress((prev) => ({ ...prev, [color.id]: { percent: 0, status: "uploading" } }));
          try {
            videoUploads = await uploadFiles([color.videoFile], (percent) => {
              setVideoUploadProgress((prev) => ({ ...prev, [color.id]: { percent, status: percent === 100 ? "processing" : "uploading" } }));
            });
            setVideoUploadProgress((prev) => ({ ...prev, [color.id]: { percent: 100, status: "complete" } }));
          } catch (error) {
            const uploadMessage = error instanceof Error ? error.message : "Unable to upload video.";
            setVideoUploadProgress((prev) => ({ ...prev, [color.id]: { percent: 0, status: "error", message: uploadMessage } }));
            throw error;
          }
        }
        const images = uniqueValues(uploadedGallery.map((item) => item.url));
        const hoverImage = uploadedGallery.find((item) => item.id === color.hoverGalleryId)?.url || images[1] || images[0] || "";
        const primaryImage = uploadedGallery.find((item) => item.id === color.primaryGalleryId)?.url || "";

        return {
          name: color.name.trim(),
          hex: color.hex,
          images,
          hoverImage,
          video: videoUploads[0] ?? color.video,
          stockBySize: Object.fromEntries(sizeNames.map((size) => [size, Number(color.stockBySize[size] ?? 0)])),
          skuBySize: Object.fromEntries(sizeNames.map((size) => [size, color.skuBySize[size] ?? ""])),
          primaryImage,
        };
      }),
    );

    return {
      colors: uploadedColors.map((color) => ({
        name: color.name,
        hex: color.hex,
        images: color.images,
        hoverImage: color.hoverImage,
        video: color.video,
        stockBySize: color.stockBySize,
        skuBySize: color.skuBySize,
      })),
      primaryImage: uploadedColors.find((color) => color.primaryImage)?.primaryImage || uploadedColors[0]?.images[0] || "",
    };
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const baseSku = String(formData.get("sku") ?? "").trim();
    const variantSkus = colorGroups.flatMap((color) =>
      sizeNames.map((size) => buildVariantSku(baseSku, size, color.name, color.skuBySize[size])),
    );
    const duplicateVariantSkus = findDuplicateValues(variantSkus);

    if (duplicateVariantSkus.length) {
      setSaveState("error");
      setMessage(`Duplicate variant SKU${duplicateVariantSkus.length === 1 ? "" : "s"}: ${duplicateVariantSkus.join(", ")}`);
      return;
    }

    setSaveState("saving");
    setMessage("");

    try {
      const mediaPayload = await buildColorPayload();
      const payload = {
        name: String(formData.get("name") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        sku: String(formData.get("sku") ?? ""),
        price: Number(formData.get("price") ?? 0),
        salePrice: formData.get("salePrice") ? Number(formData.get("salePrice")) : null,
        status: String(formData.get("status") ?? "DRAFT"),
        scheduledAt: product?.scheduledAt ?? null,
        categoryId: String(formData.get("categoryId") ?? ""),
        collectionIds: formData.getAll("collectionIds").map(String),
        tagIds: formData.getAll("tagIds").map(String),
        description: String(formData.get("description") ?? ""),
        fabricDetails: String(formData.get("fabricDetails") ?? ""),
        careInstructions: String(formData.get("careInstructions") ?? ""),
        fitSummary: String(formData.get("fitSummary") ?? ""),
        modelReference: String(formData.get("modelReference") ?? ""),
        sizeAdvice: String(formData.get("sizeAdvice") ?? ""),
        dimensionNotes: String(formData.get("dimensionNotes") ?? "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        seoTitle: String(formData.get("seoTitle") ?? ""),
        seoDescription: String(formData.get("seoDescription") ?? ""),
        socialImage: String(formData.get("socialImage") ?? ""),
        featured: formData.get("featured") === "on",
        bestSeller: formData.get("bestSeller") === "on",
        newArrival: formData.get("newArrival") === "on",
        sizeNames,
        colors: mediaPayload.colors,
        primaryImage: mediaPayload.primaryImage,
      };

      const response = await fetch(mode === "edit" ? `/api/admin/products/${product?.id}` : "/api/admin/products", {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Unable to save product");
      }

      setSaveState("saved");
      setMessage("Product saved.");
      onSaved?.(result.product);
      router.refresh();
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "Unable to save product");
    }
  }

  return (
    <>
      {pendingRemoval ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setPendingRemoval(null)}
        >
          <div
            className="w-full max-w-sm border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6">
              <p className="text-base font-semibold">{pendingRemoval.title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{pendingRemoval.message}</p>
            </div>
            <div className="flex gap-3 border-t border-[var(--border)] p-4">
              <button
                type="button"
                onClick={() => setPendingRemoval(null)}
                className="h-10 flex-1 border border-[var(--border)] text-xs font-semibold uppercase tracking-[0.12em] hover:bg-[var(--hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  pendingRemoval.confirm();
                  setPendingRemoval(null);
                }}
                className="h-10 flex-1 bg-red-600 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {imagePickerColorId ? (
        <ProductMediaPicker
          title="Choose gallery image"
          assets={mediaAssets}
          mediaType="IMAGE"
          onClose={() => setImagePickerColorId(null)}
          onPick={(asset) => {
            addGalleryAsset(imagePickerColorId, asset);
            setImagePickerColorId(null);
          }}
        />
      ) : null}
      {videoPickerColorId ? (
        <ProductMediaPicker
          title="Choose product video"
          assets={mediaAssets}
          mediaType="VIDEO"
          onClose={() => setVideoPickerColorId(null)}
          onPick={(asset) => {
            patchColor(videoPickerColorId, { video: asset.url, videoFile: undefined });
            setVideoPickerColorId(null);
          }}
        />
      ) : null}
      <form onSubmit={onSubmit} className="space-y-5">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-[0.14em]">
            {mode === "edit" ? "Edit product" : "Add product"}
          </h1>
          <p className="mt-1 text-xs text-[var(--muted)]">Operational product form. Every saved value writes to Prisma.</p>
        </div>
        <button
          type="submit"
          disabled={saveState === "saving"}
          className="inline-flex h-10 items-center gap-2 bg-[var(--accent)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#17262D] disabled:cursor-wait disabled:opacity-70"
        >
          {saveState === "saving" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save
        </button>
      </div>

      {message ? (
        <div
          className={`border px-3 py-2 text-sm ${
            saveState === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-500"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
          }`}
        >
          {message}
        </div>
      ) : null}

      <section className={panelClass}>
        <div className={panelHeaderClass}>Product data</div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <Field label="Product name">
            <input name="name" required minLength={2} defaultValue={product?.name ?? ""} className={inputClass} />
          </Field>
          <Field label="Slug">
            <input name="slug" minLength={2} defaultValue={product?.slug ?? ""} className={inputClass} />
          </Field>
          <Field label="Base SKU">
            <input name="sku" required minLength={2} defaultValue={product?.sku ?? ""} className={inputClass} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={statusToEnum(product?.status)} className={inputClass}>
              <option value="DRAFT">Draft</option>
              {product?.scheduledAt ? <option value="SCHEDULED">Scheduled</option> : null}
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </Field>
          <Field label="Regular price">
            <input name="price" required min="0" step="0.01" type="number" defaultValue={product?.price ?? ""} className={inputClass} />
          </Field>
          <Field label="Sale price">
            <input name="salePrice" min="0" step="0.01" type="number" defaultValue={product?.salePrice ?? ""} className={inputClass} />
          </Field>
          <Field label="Category">
            <select name="categoryId" required defaultValue={product?.categoryId ?? ""} className={inputClass}>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Size options
            </span>
            <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
              <input
                aria-label="Comma-separated size options"
                value={sizeInput}
                onChange={(event) => setSizeInput(event.target.value)}
                className={inputClass}
                placeholder="XS, S, M, L"
              />
              <div className="flex gap-2">
                <input
                  aria-label="Custom size"
                  value={customSize}
                  onChange={(event) => setCustomSize(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addSize(customSize);
                    }
                  }}
                  className={inputClass}
                  placeholder="Custom size"
                />
                <button
                  type="button"
                  onClick={() => addSize(customSize)}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 border border-[var(--border)] px-3 text-xs font-semibold uppercase tracking-[0.1em] hover:bg-[var(--hover)]"
                >
                  <Plus className="size-3.5" />
                  Add
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {sizeNames.map((size) => (
                <span
                  key={size}
                  className="inline-flex h-8 items-center gap-2 border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-semibold"
                >
                  {size}
                  <button
                    type="button"
                    onClick={() =>
                      setPendingRemoval({
                        title: `Remove size ${size}?`,
                        message: "Saving the product after this change removes every variant and stock value for this size.",
                        confirm: () => removeSize(size),
                      })
                    }
                    className="text-[var(--muted)] hover:text-red-500"
                    aria-label={`Remove ${size}`}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className={panelHeaderClass}>Collections, tags, and flags</div>
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div>
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Collections
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {collections.map((collection) => (
                  <label key={collection.id} className="flex min-h-10 items-center gap-3 border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
                    <input name="collectionIds" type="checkbox" value={collection.id} defaultChecked={selectedCollectionIds.has(collection.id)} className="size-4 accent-[var(--accent)]" />
                    <span>{collection.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Product tags
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {tags.map((tag) => (
                  <label key={tag.id} className="flex min-h-10 items-center gap-3 border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
                    <input name="tagIds" type="checkbox" value={tag.id} defaultChecked={selectedTagIds.has(tag.id)} className="size-4 accent-[var(--accent)]" />
                    <span>{tag.name}</span>
                  </label>
                ))}
                {tags.length === 0 ? (
                  <div className="border border-dashed border-[var(--border)] bg-[var(--background)] px-3 py-4 text-sm text-[var(--muted)]">
                    Create tags from Admin / Attributes.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            {[
              ["featured", "Featured", product?.featured],
              ["bestSeller", "Best seller", product?.bestSeller],
              ["newArrival", "New arrival", product?.newArrival],
            ].map(([name, label, checked]) => (
              <label key={String(name)} className="flex min-h-10 items-center gap-3 border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
                <input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} className="size-4 accent-[var(--accent)]" />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className={panelHeaderClass}>Description</div>
        <div className="grid gap-4 p-4">
          <Field label="Description">
            <textarea name="description" required defaultValue={product?.description ?? ""} className={textareaClass} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Fabric details">
              <textarea name="fabricDetails" required defaultValue={product?.fabricDetails ?? ""} className={textareaClass} />
            </Field>
            <Field label="Care instructions">
              <textarea name="careInstructions" required defaultValue={product?.careInstructions ?? ""} className={textareaClass} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Fit summary">
              <textarea
                name="fitSummary"
                defaultValue={product?.fitSummary ?? ""}
                className={textareaClass}
                placeholder="Close, compressive hold with a smooth waistband."
              />
            </Field>
            <Field label="Model reference">
              <textarea
                name="modelReference"
                defaultValue={product?.modelReference ?? ""}
                className={textareaClass}
                placeholder="Model is 175 cm and wears size S."
              />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Size advice">
              <textarea
                name="sizeAdvice"
                defaultValue={product?.sizeAdvice ?? ""}
                className={textareaClass}
                placeholder="Choose your usual size; size up for a softer fit."
              />
            </Field>
            <Field label="Dimension notes">
              <textarea
                name="dimensionNotes"
                defaultValue={product?.dimensionNotes?.join("\n") ?? ""}
                className={textareaClass}
                placeholder={"High-rise waistband\nFull-length leg\nFour-way stretch recovery"}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">Variants</p>
          <button type="button" onClick={addColor} className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase underline">
            <Plus className="size-3.5" />
            Add color
          </button>
        </div>
        <div className="space-y-4 p-4">
          {colorGroups.map((color, colorIndex) => (
            <div key={color.id} className="border border-[var(--border)] bg-[var(--background)]">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="size-6 border border-[var(--border)]" style={{ backgroundColor: color.hex }} />
                  <p className="text-sm font-semibold">Color {colorIndex + 1}</p>
                </div>
                {colorGroups.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPendingRemoval({
                        title: `Remove ${color.name || `color ${colorIndex + 1}`}?`,
                        message: "Saving the product after this change removes this color's variants, stock, gallery, and video.",
                        confirm: () =>
                          setColorGroups((prev) => prev.filter((item) => item.id !== color.id)),
                      })
                    }
                    className="text-[var(--muted)] hover:text-red-500"
                    aria-label={`Remove ${color.name || `color ${colorIndex + 1}`}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </div>
              <div className="grid gap-4 p-4 lg:grid-cols-[280px_1fr]">
                <div className="space-y-4">
                  <Field label="Color name">
                    <input required value={color.name} onChange={(event) => patchColor(color.id, { name: event.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Hex">
                    <input required value={color.hex} onChange={(event) => patchColor(color.id, { hex: event.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Gallery images">
                    <div className="grid gap-2">
                      <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-[var(--border)] bg-[var(--surface)] px-3 text-center text-xs text-[var(--muted)]">
                        <Upload className="size-4" />
                        Upload gallery files
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) => addGalleryFiles(color.id, Array.from(event.target.files ?? []))}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setImagePickerColorId(color.id)}
                        className="inline-flex h-10 items-center justify-center gap-2 border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold uppercase tracking-[0.1em] transition hover:bg-[var(--hover)]"
                      >
                        <ImagePlus className="size-4" />
                        Choose from media library
                      </button>
                    </div>
                  </Field>
                  <Field label="Product video">
                    <div className="grid gap-2">
                      <input
                        value={color.video}
                        onChange={(event) => patchColor(color.id, { video: event.target.value.trim(), videoFile: undefined })}
                        placeholder="https://pub-...r2.dev/Core-Legging-black.mp4"
                        className={inputClass}
                      />
                      <label className="flex h-10 cursor-pointer items-center justify-center border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold uppercase tracking-[0.1em]">
                        {color.videoFile ? color.videoFile.name : color.video ? "Replace video" : "Upload video"}
                        <input
                          type="file"
                          accept="video/mp4,video/webm"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
                              patchColor(color.id, { videoFile: undefined });
                              setVideoUploadProgress((prev) => ({
                                ...prev,
                                [color.id]: {
                                  percent: 0,
                                  status: "error",
                                  message: `${formatBytes(file.size)} is too large. Videos must be 100 MB or smaller.`,
                                },
                              }));
                              event.target.value = "";
                              return;
                            }
                            patchColor(color.id, { videoFile: file, video: "" });
                            setVideoUploadProgress((prev) => ({ ...prev, [color.id]: { percent: 0, status: "ready" } }));
                          }}
                        />
                      </label>
                      {videoUploadProgress[color.id] ? (
                        <div className="grid gap-1.5" role="status" aria-live="polite">
                          <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-[var(--muted)]">
                            <span>
                              {videoUploadProgress[color.id].status === "ready" ? "Ready — upload starts when you save"
                                : videoUploadProgress[color.id].status === "processing" ? "Upload complete — processing"
                                  : videoUploadProgress[color.id].status === "complete" ? "Video uploaded"
                                    : videoUploadProgress[color.id].status === "error" ? (videoUploadProgress[color.id].message ?? "Upload failed")
                                      : "Uploading video"}
                            </span>
                            <span>{videoUploadProgress[color.id].percent}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[var(--card)]" aria-hidden="true">
                            <div className={`h-full rounded-full transition-[width] duration-200 ${videoUploadProgress[color.id].status === "error" ? "bg-red-500" : "bg-[var(--accent)]"}`} style={{ width: `${videoUploadProgress[color.id].percent}%` }} />
                          </div>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setVideoPickerColorId(color.id)}
                        className="inline-flex h-10 items-center justify-center gap-2 border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold uppercase tracking-[0.1em] transition hover:bg-[var(--hover)]"
                      >
                        <Film className="size-4" />
                        Choose existing video
                      </button>
                      {color.video ? (
                        <button
                          type="button"
                          onClick={() => patchColor(color.id, { video: "", videoFile: undefined })}
                          className="h-9 border border-[var(--border)] text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                        >
                          Remove video URL
                        </button>
                      ) : null}
                    </div>
                  </Field>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {color.gallery.map((item, index) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(event) => startGalleryDrag(event, color.id, item.id)}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(event) => dropGalleryItem(event, color.id, item.id)}
                        onDragEnd={() => setDraggedGalleryItem(null)}
                        className={`border border-[var(--border)] bg-[var(--surface)] p-2 transition ${
                          draggedGalleryItem?.colorId === color.id && draggedGalleryItem.itemId === item.id
                            ? "opacity-50"
                            : "hover:border-[var(--accent)]"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                          <span>Position {index + 1}</span>
                          <GripVertical className="size-3.5 cursor-grab" />
                        </div>
                        <div className="relative aspect-[4/5] overflow-hidden bg-[var(--card)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.preview} alt={item.name} className="h-full w-full object-cover" />
                        </div>
                        <p className="mt-2 truncate text-xs font-medium">{item.name}</p>
                        <div className="mt-2 grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => markPrimaryImage(color.id, item.id)}
                            className={`h-8 border px-2 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                              color.primaryGalleryId === item.id
                                ? "border-[var(--accent)] bg-[var(--accent)] text-[#17262D]"
                                : "border-[var(--border)] hover:bg-[var(--hover)]"
                            }`}
                          >
                            <Star className="mr-1 inline size-3" />
                            Primary
                          </button>
                          <button
                            type="button"
                            onClick={() => patchColor(color.id, { hoverGalleryId: item.id })}
                            className={`h-8 border px-2 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                              color.hoverGalleryId === item.id
                                ? "border-[var(--accent)] bg-[var(--accent)] text-[#17262D]"
                                : "border-[var(--border)] hover:bg-[var(--hover)]"
                            }`}
                          >
                            Hover
                          </button>
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveGalleryItem(color.id, item.id, -1)}
                            aria-label={`Move ${item.name} left`}
                            className="h-8 border border-[var(--border)] px-2 text-[10px] font-semibold uppercase tracking-[0.08em] hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowLeft className="mx-auto size-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === color.gallery.length - 1}
                            onClick={() => moveGalleryItem(color.id, item.id, 1)}
                            aria-label={`Move ${item.name} right`}
                            className="h-8 border border-[var(--border)] px-2 text-[10px] font-semibold uppercase tracking-[0.08em] hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowRight className="mx-auto size-3" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingRemoval({
                              title: `Remove ${item.name}?`,
                              message: "This image will be removed from the color gallery when the product is saved.",
                              confirm: () => removeGalleryItem(color.id, item.id),
                            })
                          }
                          className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 border border-[var(--border)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 className="size-3" />
                          Remove
                        </button>
                      </div>
                    ))}
                    {color.gallery.length === 0 ? (
                      <div className="flex min-h-40 items-center justify-center border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 text-center text-xs text-[var(--muted)]">
                        No gallery images uploaded for this color.
                      </div>
                    ) : null}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                          <th className="pb-2 pr-3">Size</th>
                          <th className="pb-2 pr-3">Variant SKU</th>
                          <th className="pb-2 pr-3">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {sizeNames.length ? (
                          sizeNames.map((size) => (
                            <tr key={size}>
                              <td className="py-2 pr-3 font-semibold">{size}</td>
                              <td className="py-2 pr-3">
                                <input
                                  aria-label={`${color.name || `Color ${colorIndex + 1}`} ${size} SKU`}
                                  value={color.skuBySize[size] ?? ""}
                                  onChange={(event) =>
                                    patchColor(color.id, {
                                      skuBySize: { ...color.skuBySize, [size]: event.target.value },
                                    })
                                  }
                                  className={inputClass}
                                  placeholder="Auto if empty"
                                />
                              </td>
                              <td className="py-2 pr-3">
                                <input
                                  aria-label={`${color.name || `Color ${colorIndex + 1}`} ${size} stock`}
                                  type="number"
                                  min="0"
                                  value={color.stockBySize[size] ?? 0}
                                  onChange={(event) =>
                                    patchColor(color.id, {
                                      stockBySize: { ...color.stockBySize, [size]: Number(event.target.value) },
                                    })
                                  }
                                  className={inputClass}
                                />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-sm text-[var(--muted)]">
                              Add at least one size to create sellable variants.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={panelClass}>
        <div className={panelHeaderClass}>SEO</div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <Field label="SEO title">
            <input name="seoTitle" defaultValue={product?.seoTitle ?? ""} className={inputClass} />
          </Field>
          <Field label="SEO description">
            <input name="seoDescription" defaultValue={product?.seoDescription ?? ""} className={inputClass} />
          </Field>
          <Field label="Social image">
            <input name="socialImage" defaultValue={product?.socialImage ?? product?.images[0] ?? ""} className={inputClass} placeholder="/images/..." />
          </Field>
          <div className="border border-[var(--border)] bg-[var(--background)] p-4 text-sm md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Preview</p>
            <p className="mt-3 font-semibold">{product?.seoTitle || product?.name || "SEO title preview"}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{product?.seoDescription || product?.description || "SEO description preview"}</p>
          </div>
        </div>
      </section>
      </form>
    </>
  );
}
