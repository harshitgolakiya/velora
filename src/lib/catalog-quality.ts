import type { AdminMediaAsset, AdminProduct } from "./admin-catalog";

export type CatalogQualityWarning = {
  code:
    | "missing_product_images"
    | "missing_color_gallery"
    | "missing_hover_image"
    | "duplicate_media"
    | "low_resolution_media"
    | "inconsistent_gallery_ratio";
  severity: "warning" | "critical";
  title: string;
  detail: string;
};

function mediaByUrl(assets: AdminMediaAsset[]) {
  return new Map(assets.map((asset) => [asset.url, asset]));
}

function imageRatio(asset: AdminMediaAsset | undefined) {
  if (asset?.aspectRatio) return asset.aspectRatio;
  if (asset?.width && asset.height) return asset.width / asset.height;
  return undefined;
}

export function getCatalogQualityWarnings(product: AdminProduct, mediaAssets: AdminMediaAsset[]): CatalogQualityWarning[] {
  const warnings: CatalogQualityWarning[] = [];
  const assetByUrl = mediaByUrl(mediaAssets);
  const productImageUrls = product.images.filter(Boolean);
  const variantMediaUrls = product.variants.flatMap((variant) => variant.media.map((media) => media.url)).filter(Boolean);

  if (!product.images.length) {
    warnings.push({
      code: "missing_product_images",
      severity: "critical",
      title: "Missing product images",
      detail: "Cards, social previews, and fallback galleries need at least one product-level image.",
    });
  }

  const seen = new Map<string, number>();
  productImageUrls.forEach((url) => seen.set(`product:${url}`, (seen.get(`product:${url}`) ?? 0) + 1));
  variantMediaUrls.forEach((url) => seen.set(`variant:${url}`, (seen.get(`variant:${url}`) ?? 0) + 1));
  const duplicateUrls = [...seen.entries()].filter(([, count]) => count > 1).map(([url]) => url);
  if (duplicateUrls.length) {
    warnings.push({
      code: "duplicate_media",
      severity: "warning",
      title: "Duplicate media",
      detail: `${duplicateUrls.length} media URL${duplicateUrls.length === 1 ? " is" : "s are"} reused across product images or variant galleries.`,
    });
  }

  product.colors.forEach((color) => {
    const variants = product.variants.filter((variant) => variant.colorName === color.name);
    const gallery = variants.flatMap((variant) => variant.media);
    const imageGallery = gallery.filter((media) => media.type === "IMAGE");
    if (!imageGallery.length) {
      warnings.push({
        code: "missing_color_gallery",
        severity: "critical",
        title: `${color.name} gallery missing`,
        detail: "Every color should have at least one image so PDP color switching does not fall back unexpectedly.",
      });
      return;
    }

    if (!imageGallery.some((media) => media.isHoverImage)) {
      warnings.push({
        code: "missing_hover_image",
        severity: "warning",
        title: `${color.name} hover image missing`,
        detail: "Collection cards work better when each color has a designated hover image.",
      });
    }

    const lowResolution = imageGallery
      .map((media) => assetByUrl.get(media.url))
      .filter((asset): asset is AdminMediaAsset => Boolean(asset?.width && asset.width < 1200));
    if (lowResolution.length) {
      warnings.push({
        code: "low_resolution_media",
        severity: "warning",
        title: `${color.name} has low-resolution media`,
        detail: `${lowResolution.length} image${lowResolution.length === 1 ? " is" : "s are"} below 1200px wide.`,
      });
    }

    const ratios = imageGallery
      .map((media) => imageRatio(assetByUrl.get(media.url)))
      .filter((ratio): ratio is number => typeof ratio === "number");
    if (ratios.length > 1 && Math.max(...ratios) - Math.min(...ratios) > 0.22) {
      warnings.push({
        code: "inconsistent_gallery_ratio",
        severity: "warning",
        title: `${color.name} gallery ratios vary`,
        detail: "Large aspect-ratio differences can cause jumpy galleries and inconsistent product cards.",
      });
    }
  });

  return warnings;
}
