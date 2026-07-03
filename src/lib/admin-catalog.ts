import "server-only";

import { prisma } from "./prisma";
import { publishDueScheduledCollections, publishDueScheduledHomepageSections, publishDueScheduledProducts } from "./scheduled-publishing";
import { getProductAlertQueueRows, type ProductAlertQueueRow } from "./product-alert-queue";
import {
  ABANDONED_CART_HOURS,
  expireStaleCartReservations,
} from "./cart-reservations";
import {
  getCheckoutSettings,
  getRecommendationSettings,
  getReturnSettings,
  type CheckoutSettings,
  type RecommendationSettings,
  type ReturnSettings,
} from "./store-settings";
import { getGlobalContentSettings } from "./global-content-store";
import type { GlobalContentSettings } from "./global-content";
import { parseFilterSettings, type FilterSettings } from "./filter-settings";
import { getSearchMerchandisingSettings } from "./search-merchandising-store";
import type { SearchMerchandisingSettings } from "./search-merchandising";
import { parseCouponList } from "./coupon-eligibility";

export type AdminCategoryOption = {
  id: string;
  name: string;
  slug: string;
};

export type AdminCategory = AdminCategoryOption & {
  parentId?: string;
  parentName?: string;
  seoTitle?: string;
  seoDescription?: string;
  socialImage?: string;
  filterSettings: FilterSettings;
  productCount: number;
  childCount: number;
};

export type AdminCollectionOption = {
  id: string;
  name: string;
  slug: string;
};

export type AdminCollection = AdminCollectionOption & {
  summary: string;
  bannerImage?: string;
  seoTitle?: string;
  seoDescription?: string;
  socialImage?: string;
  filterSettings: FilterSettings;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  scheduledAt?: string;
  publishedAt?: string;
  productCount: number;
  productIds: string[];
  productAssignments: AdminCollectionProductAssignment[];
};

export type AdminCollectionProductAssignment = {
  productId: string;
  sortOrder: number;
  pinned: boolean;
};

export type AdminColor = {
  id: string;
  name: string;
  hex: string;
  variantCount: number;
};

export type AdminSize = {
  id: string;
  name: string;
  variantCount: number;
};

export type AdminTag = {
  id: string;
  name: string;
  productCount: number;
};

export type AdminCoupon = {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minimumAmount?: number;
  usageLimit?: number;
  usageCount: number;
  expiresAt?: string;
  combinable: boolean;
  eligibleProductIds: string[];
  eligibleCategories: string[];
  eligibleCollections: string[];
  excludedProductIds: string[];
  createdAt: string;
};

export type AdminGiftCard = {
  id: string;
  codeLast4: string;
  initialBalance: number;
  balance: number;
  currency: string;
  status: string;
  recipientEmail?: string;
  purchaserEmail?: string;
  note?: string;
  expiresAt?: string;
  issuedAt: string;
  createdAt: string;
  ledgerEntries: Array<{
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    actor: string;
    note?: string;
    orderNumber?: string;
    createdAt: string;
  }>;
};

export type AdminNewsletterSubscriber = {
  id: string;
  email: string;
  locale: string;
  source: string;
  status: string;
  subscribedAt: string;
};

export type AdminEmailIntegration = {
  id: string;
  provider: string;
  enabled: boolean;
  listId?: string;
  apiKeyEnv?: string;
};

export type AdminAutomationWorkflow = {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  provider?: string;
  delayHours: number;
  subject?: string;
};

export type AdminEmailDelivery = {
  id: string;
  recipient: string;
  subject: string;
  provider: string;
  status: string;
  error?: string;
  eventType?: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string;
  suppressionReason?: string;
  clickedAt?: string;
  convertedAt?: string;
  conversionValue?: number;
  sentAt?: string;
  createdAt: string;
  workflowName?: string;
  orderNumber?: string;
};

export type AdminAutomationEvent = {
  id: string;
  type: string;
  sourceKey: string;
  recipient: string;
  status: string;
  scheduledAt: string;
  processedAt?: string;
  skippedAt?: string;
  error?: string;
  orderId?: string;
  cartId?: string;
  createdAt: string;
};

export type AdminEmailProviderEvent = {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  recipient: string;
  severity: string;
  alertStatus: string;
  message?: string;
  deliveryId?: string;
  sourceKey?: string;
  occurredAt: string;
  createdAt: string;
};

export type AdminPaymentProviderEvent = {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  orderId?: string;
  orderNumber?: string;
  paymentRef?: string;
  severity: string;
  status: string;
  message?: string;
  occurredAt: string;
  processedAt?: string;
  createdAt: string;
};

export type AdminAutomationReportRow = {
  type: string;
  sent: number;
  suppressed: number;
  failed: number;
  clicked: number;
  converted: number;
  revenue: number;
  clickRate: number;
  conversionRate: number;
};

export type AdminScheduledReport = {
  id: string;
  name: string;
  reportType: string;
  frequency: string;
  recipients: string;
  enabled: boolean;
  nextRunAt?: string;
};

export type AdminAbandonedCart = {
  id: string;
  email?: string;
  itemCount: number;
  value: number;
  updatedAt: string;
  status: string;
};

export type AdminCartAnalytics = {
  cartsStarted: number;
  checkoutsStarted: number;
  completedCarts: number;
  abandonedCarts: number;
  conversionRate: number;
  checkoutConversionRate: number;
  abandonedValue: number;
  recentAbandoned: AdminAbandonedCart[];
};

export type AdminCartReservationSummary = {
  activeCarts: number;
  checkoutCarts: number;
  reservedUnits: number;
  expiringSoonCarts: number;
  expiringSoonUnits: number;
  oldestExpiresAt?: string;
};

export type AdminEventDiagnostics = {
  searchEvents: number;
  zeroResultSearches: number;
  searchClicks: number;
  searchConversions: number;
  searchConversionValue: number;
  filterEvents: number;
  recommendationEvents: number;
  topSearches: Array<{
    query: string;
    count: number;
    zeroResults: number;
    clicks: number;
    clickThroughRate: number;
    conversions: number;
    conversionRate: number;
    conversionValue: number;
  }>;
  zeroResultQueries: Array<{ query: string; count: number }>;
  topFilters: Array<{ filterKey: string; value: string; count: number; avgResultCount: number }>;
  recommendationSummary: Array<{ eventType: string; count: number }>;
};

export type AdminTranslationCoverageEntity = {
  entity: "Products" | "Categories" | "Collections" | "Homepage sections";
  total: number;
  translated: number;
  missing: number;
  stale: number;
  percent: number;
  missingItems: string[];
  staleItems: string[];
};

export type AdminTranslationCoverage = {
  locale: string;
  overallPercent: number;
  entities: AdminTranslationCoverageEntity[];
};

export type AdminCheckoutSettings = CheckoutSettings;
export type AdminReturnSettings = ReturnSettings;
export type AdminRecommendationSettings = RecommendationSettings;
export type AdminSearchMerchandisingSettings = SearchMerchandisingSettings;
export type AdminGlobalContentSettings = GlobalContentSettings;
export type AdminProductAlertDelivery = ProductAlertQueueRow;

export type AdminReview = {
  id: string;
  rating: number;
  title: string;
  body: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  verifiedPurchase: boolean;
  customerName: string;
  customerEmail?: string;
  productId: string;
  productName: string;
  productSlug: string;
  createdAt: string;
  updatedAt: string;
  adminResponse?: string;
  respondedAt?: string;
  editableUntil?: string;
  media: Array<{ id: string; url: string; originalName: string; status: string; altText?: string }>;
  reports: Array<{ id: string; reason: string; details?: string; status: string; reporterEmail: string; createdAt: string }>;
  events: Array<{ id: string; action: string; actor: string; message?: string; createdAt: string }>;
};

export type AdminActivityLog = {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "MANAGER" | "ORDER_MANAGER" | "CONTENT_EDITOR";
  adminRoleName?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminHomepageSection = {
  id: string;
  key: string;
  type:
    | "HERO"
    | "FEATURED_PRODUCTS"
    | "COLLECTION_STORY"
    | "PRODUCT_GRID"
    | "STORY_BAND"
    | "NEWSLETTER"
    | "CUSTOM";
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  title: string;
  subtitle?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  sortOrder: number;
  enabled: boolean;
  settings: Record<string, unknown>;
  scheduledAt?: string;
  publishedAt?: string;
  collectionId?: string;
  collectionName?: string;
  productIds: string[];
  productCount: number;
  createdAt: string;
  updatedAt: string;
  versions?: AdminHomepageSectionVersion[];
};

export type AdminHomepageSectionVersion = {
  id: string;
  version: number;
  title: string;
  status: AdminHomepageSection["status"];
  createdBy: string;
  createdAt: string;
};

export type AdminMediaAsset = {
  id: string;
  name: string;
  originalName: string;
  url: string;
  originalUrl?: string;
  mimeType: string;
  mediaType: "IMAGE" | "VIDEO";
  sizeBytes: number;
  width?: number;
  height?: number;
  aspectRatio?: number;
  optimizedFormat?: string;
  responsiveWidths: number[];
  derivativeManifest: Array<{ width: number; url: string; format?: string }>;
  optimizationNotes?: string;
  altText?: string;
  focalPointX: number;
  focalPointY: number;
  folder?: string;
  tags: string[];
  uploadedBy: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminInventoryLog = {
  id: string;
  variantId: string;
  sku?: string;
  productName: string;
  colorName: string;
  sizeName: string;
  oldStock: number;
  newStock: number;
  delta: number;
  reason: string;
  note?: string;
  actor: string;
  createdAt: string;
};

export type AdminInventoryRow = {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  sku?: string;
  colorName: string;
  colorHex: string;
  sizeName: string;
  stock: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number;
  allowBackorder: boolean;
  backorderLimit?: number;
  backorderShipsAt?: string;
  backorderMessage?: string;
  status: "Out of stock" | "Low stock" | "In stock";
  updatedAt: string;
  logs: AdminInventoryLog[];
};

export type AdminInventoryAnomaly = {
  variantId: string;
  sku?: string;
  productName: string;
  variantLabel: string;
  severity: "warning" | "critical";
  message: string;
  reservedStock: number;
  sellableCapacity: number;
};

export type AdminOrderItem = {
  id: string;
  productId: string;
  title: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
};

export type AdminOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  phone?: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  total: number;
  internalNote?: string;
  customerNote?: string;
  orderTags: string[];
  refundAmount?: number;
  shippingAddress?: string;
  billingAddress?: string;
  paymentProvider?: string;
  paymentRef?: string;
  shipmentCarrier?: string;
  trackingNo?: string;
  shippingLabelId?: string;
  shippingLabelCreatedAt?: string;
  items: AdminOrderItem[];
  createdAt: string;
  updatedAt: string;
};

export type AdminReturnRequest = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  email: string;
  phone?: string;
  resolution: string;
  reason: string;
  notes?: string;
  adminNote?: string;
  status: string;
  integrationStatus: string;
  externalReference?: string;
  replacementOrder?: {
    id: string;
    orderNumber: string;
    status: string;
    fulfillmentStatus: string;
    shipmentStatus?: string;
    trackingNo?: string;
  };
  returnShipment?: {
    status: string;
    carrier?: string;
    trackingNo?: string;
    pickupStart?: string;
    pickupEnd?: string;
    labelId?: string;
  };
  inspection?: {
    condition: string;
    disposition: string;
    notes?: string;
    inspectedBy: string;
    inspectedAt: string;
  };
  refund?: {
    id: string;
    amount: number;
    status: string;
    provider: string;
    providerRef?: string;
    note?: string;
    updatedAt: string;
  };
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  updatedAt: string;
  decisionAt?: string;
  completedAt?: string;
  items: Array<{
    id: string;
    orderItemId: string;
    title: string;
    color: string;
    originalSize: string;
    requestedSize?: string;
    requestedVariantId?: string;
    requestedSku?: string;
    replacementAvailable?: boolean;
    quantity: number;
  }>;
  events: Array<{
    id: string;
    status: string;
    message?: string;
    actor: string;
    createdAt: string;
  }>;
  evidence: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy: string;
    createdAt: string;
    scanStatus: string;
    scanProvider?: string;
    scanReference?: string;
  }>;
  integrationAttempts: Array<{
    id: string;
    provider: string;
    action: string;
    status: string;
    attempts: number;
    errorMessage?: string;
    externalRef?: string;
    nextRetryAt?: string;
    lastAttemptAt?: string;
    createdAt: string;
  }>;
};

export type AdminCustomerOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  total: number;
  internalNote?: string;
  customerNote?: string;
  orderTags: string[];
  refundAmount?: number;
  createdAt: string;
};

export type AdminCustomerAlert = {
  id: string;
  type: string;
  status: string;
  productTitle: string;
  productSlug: string;
  variantLabel?: string;
  targetPrice?: number;
  lastNotifiedAt?: string;
  createdAt: string;
};

export type AdminCustomerPrivacyRequest = {
  id: string;
  type: string;
  status: string;
  legalHold: boolean;
  retentionUntil?: string;
  completedAt?: string;
  createdAt: string;
};

export type AdminCustomer = {
  id: string;
  userId?: string;
  type: "Account" | "Guest";
  name: string;
  email: string;
  phone?: string;
  orderCount: number;
  lifetimeValue: number;
  lastOrderAt?: string;
  addresses: string[];
  tags: string[];
  notes?: string;
  orders: AdminCustomerOrder[];
  communicationPreferences?: {
    marketingEmails?: boolean;
    productAlertEmails?: boolean;
    postPurchaseEmails?: boolean;
  };
  fitPreferences?: {
    preferredSize?: string;
    fitPreference?: string;
    compressionPreference?: string;
  };
  privacy?: {
    emailVerifiedAt?: string;
    deletedAt?: string;
    deletionState: "ACTIVE" | "PENDING_DELETION";
    requests: AdminCustomerPrivacyRequest[];
  };
  productAlerts?: AdminCustomerAlert[];
};

export type AdminProductVariantMedia = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  sortOrder: number;
  isHoverImage: boolean;
};

export type AdminProductVariant = {
  id: string;
  sku?: string;
  stock: number;
  colorId: string;
  colorName: string;
  colorHex: string;
  sizeId: string;
  sizeName: string;
  media: AdminProductVariantMedia[];
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  fabricDetails: string;
  careInstructions: string;
  fitSummary?: string;
  modelReference?: string;
  sizeAdvice?: string;
  dimensionNotes: string[];
  category: string;
  categoryId: string;
  collections: AdminCollectionOption[];
  price: number;
  salePrice?: number;
  stock: number;
  status: "Draft" | "Scheduled" | "Published" | "Archived";
  scheduledAt?: string;
  publishedAt?: string;
  featured: boolean;
  bestSeller: boolean;
  newArrival: boolean;
  seoTitle?: string;
  seoDescription?: string;
  socialImage?: string;
  images: string[];
  tags: AdminTag[];
  colors: { id: string; name: string; hex: string }[];
  sizes: { id: string; name: string }[];
  variants: AdminProductVariant[];
  updatedAt: string;
};

type ProductRow = Awaited<ReturnType<typeof getAdminProductRows>>[number];

type TranslationBaseItem = { id: string; label: string; updatedAt: Date };
type TranslationRow = { ownerId: string; updatedAt: Date };

function decimalToNumber(value: { toNumber?: () => number } | number | null | undefined) {
  if (typeof value === "number") return value;
  return value?.toNumber?.() ?? 0;
}

function parseStringArray(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function buildTranslationCoverageEntity(
  entity: AdminTranslationCoverageEntity["entity"],
  baseItems: TranslationBaseItem[],
  translations: TranslationRow[],
): AdminTranslationCoverageEntity {
  const translationByOwner = new Map(translations.map((translation) => [translation.ownerId, translation]));
  const missingItems = baseItems.filter((item) => !translationByOwner.has(item.id)).map((item) => item.label);
  const staleItems = baseItems
    .filter((item) => {
      const translation = translationByOwner.get(item.id);
      return translation ? translation.updatedAt < item.updatedAt : false;
    })
    .map((item) => item.label);
  const translated = baseItems.length - missingItems.length;

  return {
    entity,
    total: baseItems.length,
    translated,
    missing: missingItems.length,
    stale: staleItems.length,
    percent: baseItems.length ? Math.round((translated / baseItems.length) * 100) : 100,
    missingItems: missingItems.slice(0, 8),
    staleItems: staleItems.slice(0, 8),
  };
}

function buildTranslationCoverage(input: {
  products: ProductRow[];
  categories: Array<{ id: string; name: string; updatedAt?: Date | null }>;
  collections: Array<{ id: string; name: string; updatedAt?: Date | null }>;
  homepageSections: Array<{ id: string; title: string; updatedAt: Date }>;
  productTranslations: TranslationRow[];
  categoryTranslations: TranslationRow[];
  collectionTranslations: TranslationRow[];
  homepageTranslations: TranslationRow[];
}): AdminTranslationCoverage {
  const now = new Date(0);
  const entities = [
    buildTranslationCoverageEntity(
      "Products",
      input.products.map((product) => ({ id: product.id, label: product.title, updatedAt: product.updatedAt })),
      input.productTranslations,
    ),
    buildTranslationCoverageEntity(
      "Categories",
      input.categories.map((category) => ({ id: category.id, label: category.name, updatedAt: category.updatedAt ?? now })),
      input.categoryTranslations,
    ),
    buildTranslationCoverageEntity(
      "Collections",
      input.collections.map((collection) => ({ id: collection.id, label: collection.name, updatedAt: collection.updatedAt ?? now })),
      input.collectionTranslations,
    ),
    buildTranslationCoverageEntity(
      "Homepage sections",
      input.homepageSections.map((section) => ({ id: section.id, label: section.title, updatedAt: section.updatedAt })),
      input.homepageTranslations,
    ),
  ];
  const total = entities.reduce((sum, entity) => sum + entity.total, 0);
  const translated = entities.reduce((sum, entity) => sum + entity.translated, 0);

  return {
    locale: "ar",
    overallPercent: total ? Math.round((translated / total) * 100) : 100,
    entities,
  };
}

function formatAddress(address?: {
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  country: string;
  postalCode: string | null;
} | null) {
  if (!address) return undefined;
  return [address.name, address.line1, address.line2, address.city, address.postalCode, address.country]
    .filter(Boolean)
    .join(", ");
}

function mapStatus(status: string): AdminProduct["status"] {
  if (status === "PUBLISHED") return "Published";
  if (status === "SCHEDULED") return "Scheduled";
  if (status === "ARCHIVED") return "Archived";
  return "Draft";
}

export function mapAdminCategory(row: {
  id: string;
  name: string;
  slug: string;
  seoTitle: string | null;
  seoDescription: string | null;
  socialImage: string | null;
  filterSettings: string;
  parentId: string | null;
  parent?: { name: string } | null;
  _count: { products: number; children: number };
}): AdminCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    seoTitle: row.seoTitle ?? undefined,
    seoDescription: row.seoDescription ?? undefined,
    socialImage: row.socialImage ?? undefined,
    filterSettings: parseFilterSettings(row.filterSettings),
    parentId: row.parentId ?? undefined,
    parentName: row.parent?.name ?? undefined,
    productCount: row._count.products,
    childCount: row._count.children,
  };
}

export function mapAdminCollection(row: {
  id: string;
  name: string;
  slug: string;
  summary: string;
  bannerImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  socialImage: string | null;
  filterSettings: string;
  status: AdminCollection["status"];
  scheduledAt: Date | null;
  publishedAt: Date | null;
  products?: { id: string }[];
  productSettings?: Array<{ productId: string; sortOrder: number; pinned: boolean }>;
  _count: { products: number };
}): AdminCollection {
  const settingByProductId = new Map(row.productSettings?.map((setting) => [setting.productId, setting]));
  const productAssignments = (row.products?.map((product, index) => {
    const setting = settingByProductId.get(product.id);
    return {
      productId: product.id,
      sortOrder: setting?.sortOrder ?? index,
      pinned: setting?.pinned ?? false,
    };
  }) ?? []).sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || a.sortOrder - b.sortOrder || a.productId.localeCompare(b.productId),
  );

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    summary: row.summary,
    bannerImage: row.bannerImage ?? undefined,
    seoTitle: row.seoTitle ?? undefined,
    seoDescription: row.seoDescription ?? undefined,
    socialImage: row.socialImage ?? undefined,
    filterSettings: parseFilterSettings(row.filterSettings),
    status: row.status,
    scheduledAt: row.scheduledAt?.toISOString() ?? undefined,
    publishedAt: row.publishedAt?.toISOString() ?? undefined,
    productCount: row._count.products,
    productIds: productAssignments.map((assignment) => assignment.productId),
    productAssignments,
  };
}

export function mapAdminHomepageSection(row: {
  id: string;
  key: string;
  type: AdminHomepageSection["type"];
  status: AdminHomepageSection["status"];
  title: string;
  subtitle: string | null;
  body: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  sortOrder: number;
  enabled: boolean;
  settings: string;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  collectionId: string | null;
  collection?: { name: string } | null;
  products?: { id: string }[];
  versions?: Array<{
    id: string;
    version: number;
    title: string;
    status: AdminHomepageSection["status"];
    createdBy: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}): AdminHomepageSection {
  let settings: Record<string, unknown> = {};

  try {
    settings = JSON.parse(row.settings) as Record<string, unknown>;
  } catch {
    settings = {};
  }

  return {
    id: row.id,
    key: row.key,
    type: row.type,
    status: row.status,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    body: row.body ?? undefined,
    ctaLabel: row.ctaLabel ?? undefined,
    ctaHref: row.ctaHref ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    mobileImageUrl: row.mobileImageUrl ?? undefined,
    sortOrder: row.sortOrder,
    enabled: row.enabled,
    settings,
    scheduledAt: row.scheduledAt?.toISOString() ?? undefined,
    publishedAt: row.publishedAt?.toISOString() ?? undefined,
    collectionId: row.collectionId ?? undefined,
    collectionName: row.collection?.name ?? undefined,
    productIds: row.products?.map((product) => product.id) ?? [],
    productCount: row.products?.length ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    versions: row.versions?.map((version) => ({
      id: version.id,
      version: version.version,
      title: version.title,
      status: version.status,
      createdBy: version.createdBy,
      createdAt: version.createdAt.toISOString(),
    })),
  };
}

function mapAdminMediaAsset(
  row: {
    id: string;
    name: string;
    originalName: string;
    url: string;
    originalUrl: string | null;
    mimeType: string;
    mediaType: "IMAGE" | "VIDEO";
    sizeBytes: number;
    width: number | null;
    height: number | null;
    aspectRatio: number | null;
    optimizedFormat: string | null;
    responsiveWidths: string;
    derivativeManifest: string;
    optimizationNotes: string | null;
    altText: string | null;
    focalPointX: number;
    focalPointY: number;
    folder: string | null;
    tags: string;
    uploadedBy: string;
    createdAt: Date;
    updatedAt: Date;
  },
  usageCount: number,
): AdminMediaAsset {
  let tags: string[] = [];
  let responsiveWidths: number[] = [];
  let derivativeManifest: Array<{ width: number; url: string; format?: string }> = [];

  try {
    tags = JSON.parse(row.tags) as string[];
  } catch {
    tags = [];
  }

  try {
    responsiveWidths = JSON.parse(row.responsiveWidths) as number[];
  } catch {
    responsiveWidths = [];
  }
  try {
    derivativeManifest = JSON.parse(row.derivativeManifest) as Array<{ width: number; url: string; format?: string }>;
  } catch {
    derivativeManifest = [];
  }

  return {
    id: row.id,
    name: row.name,
    originalName: row.originalName,
    url: row.url,
    originalUrl: row.originalUrl ?? undefined,
    mimeType: row.mimeType,
    mediaType: row.mediaType,
    sizeBytes: row.sizeBytes,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    aspectRatio: row.aspectRatio ?? undefined,
    optimizedFormat: row.optimizedFormat ?? undefined,
    responsiveWidths,
    derivativeManifest,
    optimizationNotes: row.optimizationNotes ?? undefined,
    altText: row.altText ?? undefined,
    focalPointX: row.focalPointX,
    focalPointY: row.focalPointY,
    folder: row.folder ?? undefined,
    tags,
    uploadedBy: row.uploadedBy,
    usageCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapAdminColor(row: {
  id: string;
  name: string;
  hex: string;
  _count: { variants: number };
}): AdminColor {
  return {
    id: row.id,
    name: row.name,
    hex: row.hex,
    variantCount: row._count.variants,
  };
}

export function mapAdminSize(row: {
  id: string;
  name: string;
  _count: { variants: number };
}): AdminSize {
  return {
    id: row.id,
    name: row.name,
    variantCount: row._count.variants,
  };
}

export function mapAdminTag(row: {
  id: string;
  name: string;
  _count: { products: number };
}): AdminTag {
  return {
    id: row.id,
    name: row.name,
    productCount: row._count.products,
  };
}

function mapInventoryStatus(stock: number, reservedStock: number, lowStockThreshold: number): AdminInventoryRow["status"] {
  const availableStock = Math.max(0, stock - reservedStock);
  if (availableStock <= 0) return "Out of stock";
  if (availableStock <= lowStockThreshold) return "Low stock";
  return "In stock";
}

export function mapAdminActivityLog(row: {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: string | null;
  createdAt: Date;
}): AdminActivityLog {
  let metadata: Record<string, unknown> | undefined;

  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata) as Record<string, unknown>;
    } catch {
      metadata = { raw: row.metadata };
    }
  }

  return {
    id: row.id,
    actor: row.actor,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId ?? undefined,
    metadata,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapAdminUser(row: {
  id: string;
  name: string | null;
  email: string;
  role: string;
  adminRole: { name: string } | null;
  createdAt: Date;
  updatedAt: Date;
}): AdminUser {
  return {
    id: row.id,
    name: row.name ?? row.email,
    email: row.email,
    role: row.role as AdminUser["role"],
    adminRoleName: row.adminRole?.name ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapInventoryLog(row: {
  id: string;
  variantId: string;
  oldStock: number;
  newStock: number;
  delta: number;
  reason: string;
  note: string | null;
  actor: string;
  createdAt: Date;
  variant: {
    sku: string | null;
    product: { title: string };
    color: { name: string };
    size: { name: string };
  };
}): AdminInventoryLog {
  return {
    id: row.id,
    variantId: row.variantId,
    sku: row.variant.sku ?? undefined,
    productName: row.variant.product.title,
    colorName: row.variant.color.name,
    sizeName: row.variant.size.name,
    oldStock: row.oldStock,
    newStock: row.newStock,
    delta: row.delta,
    reason: row.reason,
    note: row.note ?? undefined,
    actor: row.actor,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapAdminInventoryRow(row: {
  id: string;
  sku: string | null;
  stock: number;
  reservedStock: number;
  lowStockThreshold: number;
  allowBackorder: boolean;
  backorderLimit: number | null;
  backorderShipsAt: Date | null;
  backorderMessage: string | null;
  product: { id: string; title: string; slug: string; updatedAt: Date };
  color: { name: string; hex: string };
  size: { name: string };
  inventoryLogs: {
    id: string;
    variantId: string;
    oldStock: number;
    newStock: number;
    delta: number;
    reason: string;
    note: string | null;
    actor: string;
    createdAt: Date;
    variant: {
      sku: string | null;
      product: { title: string };
      color: { name: string };
      size: { name: string };
    };
  }[];
}): AdminInventoryRow {
  return {
    variantId: row.id,
    productId: row.product.id,
    productName: row.product.title,
    productSlug: row.product.slug,
    sku: row.sku ?? undefined,
    colorName: row.color.name,
    colorHex: row.color.hex,
    sizeName: row.size.name,
    stock: row.stock,
    reservedStock: row.reservedStock,
    availableStock: Math.max(0, row.stock - row.reservedStock),
    lowStockThreshold: row.lowStockThreshold,
    allowBackorder: row.allowBackorder,
    backorderLimit: row.backorderLimit ?? undefined,
    backorderShipsAt: row.backorderShipsAt?.toISOString() ?? undefined,
    backorderMessage: row.backorderMessage ?? undefined,
    status: mapInventoryStatus(row.stock, row.reservedStock, row.lowStockThreshold),
    updatedAt: row.product.updatedAt.toISOString(),
    logs: row.inventoryLogs.map(mapInventoryLog),
  };
}

function mapAdminOrder(row: {
  id: string;
  orderNumber: string;
  email: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotal: { toNumber?: () => number } | number;
  shippingTotal: { toNumber?: () => number } | number;
  discountTotal: { toNumber?: () => number } | number;
  total: { toNumber?: () => number } | number;
  internalNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { name: string | null } | null;
  shippingAddress: {
    name: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    country: string;
    postalCode: string | null;
  } | null;
  billingAddress: {
    name: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    country: string;
    postalCode: string | null;
  } | null;
  payment: { provider: string; providerRef: string | null; status: string } | null;
  shipment: {
    carrier: string | null;
    trackingNo: string | null;
    status: string;
    labelId: string | null;
    labelCreatedAt: Date | null;
  } | null;
  customerNote: string | null;
  orderTags: string | null;
  refundAmount?: { toNumber?: () => number } | number | null;
  items: {
    id: string;
    productId: string;
    title: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: { toNumber?: () => number } | number;
  }[];
}): AdminOrder {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    customerName: row.user?.name ?? row.shippingAddress?.name ?? row.billingAddress?.name ?? "Guest customer",
    email: row.email,
    phone: row.shippingAddress?.phone ?? row.billingAddress?.phone ?? undefined,
    status: row.status,
    paymentStatus: row.payment?.status ?? row.paymentStatus,
    fulfillmentStatus: row.shipment?.status ?? row.fulfillmentStatus,
    subtotal: decimalToNumber(row.subtotal),
    shippingTotal: decimalToNumber(row.shippingTotal),
    discountTotal: decimalToNumber(row.discountTotal),
    total: decimalToNumber(row.total),
    internalNote: row.internalNote ?? undefined,
    customerNote: row.customerNote ?? undefined,
    orderTags: parseOrderTags(row.orderTags),
    refundAmount: row.refundAmount ? decimalToNumber(row.refundAmount) : undefined,
    shippingAddress: formatAddress(row.shippingAddress),
    billingAddress: formatAddress(row.billingAddress),
    paymentProvider: row.payment?.provider,
    paymentRef: row.payment?.providerRef ?? undefined,
    shipmentCarrier: row.shipment?.carrier ?? undefined,
    trackingNo: row.shipment?.trackingNo ?? undefined,
    shippingLabelId: row.shipment?.labelId ?? undefined,
    shippingLabelCreatedAt: row.shipment?.labelCreatedAt?.toISOString(),
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      title: item.title,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unitPrice: decimalToNumber(item.unitPrice),
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type CustomerOrderRow = {
  id: string;
  orderNumber: string;
  email: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  total: { toNumber?: () => number } | number;
  internalNote: string | null;
  customerNote: string | null;
  orderTags: string | null;
  refundAmount?: { toNumber?: () => number } | number | null;
  createdAt: Date;
  userId: string | null;
  shippingAddress: {
    name: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    country: string;
    postalCode: string | null;
  } | null;
  billingAddress: {
    name: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    country: string;
    postalCode: string | null;
  } | null;
};

function mapCustomerOrder(row: CustomerOrderRow): AdminCustomerOrder {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    paymentStatus: row.paymentStatus,
    fulfillmentStatus: row.fulfillmentStatus,
    total: decimalToNumber(row.total),
    internalNote: row.internalNote ?? undefined,
    customerNote: row.customerNote ?? undefined,
    orderTags: parseOrderTags(row.orderTags),
    refundAmount: row.refundAmount ? decimalToNumber(row.refundAmount) : undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function makeCustomerTags(orderCount: number, lifetimeValue: number, lastOrderAt?: Date) {
  const tags: string[] = [];

  if (orderCount >= 3) tags.push("Returning");
  if (lifetimeValue >= 1000) tags.push("VIP");
  if (lastOrderAt) {
    const daysSinceLastOrder = (Date.now() - lastOrderAt.getTime()) / 86_400_000;
    if (daysSinceLastOrder <= 30) tags.push("Active");
  }
  if (!tags.length) tags.push("New");

  return tags;
}

function parseOrderTags(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function parseCustomerTags(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function buildCustomerFromOrders({
  id,
  type,
  userId,
  name,
  email,
  addresses,
  orders,
  customerNotes,
  customerTags,
}: {
  id: string;
  type: AdminCustomer["type"];
  userId?: string;
  name: string;
  email: string;
  addresses: string[];
  orders: CustomerOrderRow[];
  customerNotes?: string;
  customerTags?: string[];
}): AdminCustomer {
  const sortedOrders = [...orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const lifetimeValue = sortedOrders.reduce((sum, order) => sum + decimalToNumber(order.total), 0);
  const lastOrder = sortedOrders[0];
  const phone =
    sortedOrders.find((order) => order.shippingAddress?.phone || order.billingAddress?.phone)?.shippingAddress?.phone ??
    sortedOrders.find((order) => order.billingAddress?.phone)?.billingAddress?.phone;
  const derivedNotes = sortedOrders
    .map((order) => order.internalNote)
    .filter((note): note is string => Boolean(note))
    .join("\n");

  return {
    id,
    userId,
    type,
    name: name || "Guest customer",
    email,
    phone,
    orderCount: sortedOrders.length,
    lifetimeValue,
    lastOrderAt: lastOrder?.createdAt.toISOString(),
    addresses: Array.from(new Set(addresses.filter(Boolean))),
    tags: Array.from(new Set([...(customerTags ?? []), ...makeCustomerTags(sortedOrders.length, lifetimeValue, lastOrder?.createdAt)])),
    notes: customerNotes?.trim() || derivedNotes || undefined,
    orders: sortedOrders.map(mapCustomerOrder),
  };
}

export function mapAdminCustomers(
  users: {
    id: string;
    email: string;
    name: string | null;
    addresses: {
      name: string;
      phone: string;
      line1: string;
      line2: string | null;
      city: string;
      country: string;
      postalCode: string | null;
    }[];
    orders: CustomerOrderRow[];
    customerNotes?: string | null;
    customerTags?: string;
    marketingEmails?: boolean;
    productAlertEmails?: boolean;
    postPurchaseEmails?: boolean;
    preferredSize?: string | null;
    fitPreference?: string | null;
    compressionPreference?: string | null;
    emailVerifiedAt?: Date | null;
    deletedAt?: Date | null;
    productAlerts?: {
      id: string;
      type: string;
      status: string;
      targetPrice: { toNumber?: () => number } | number | null;
      lastNotifiedAt: Date | null;
      createdAt: Date;
      product: { title: string; slug: string };
      variant: {
        sku: string | null;
        color: { name: string };
        size: { name: string };
      } | null;
    }[];
    privacyRequests?: {
      id: string;
      type: string;
      status: string;
      legalHold: boolean;
      retentionUntil: Date | null;
      completedAt: Date | null;
      createdAt: Date;
    }[];
  }[],
  guestOrders: CustomerOrderRow[],
): AdminCustomer[] {
  const accountCustomers = users.map((user) => {
    const orderAddresses = user.orders.flatMap((order) => [
      formatAddress(order.shippingAddress),
      formatAddress(order.billingAddress),
    ]);
    const profileAddresses = user.addresses.map((address) => formatAddress(address));

    const customer = buildCustomerFromOrders({
      id: user.id,
      userId: user.id,
      type: "Account",
      name: user.name ?? user.email,
      email: user.email,
      addresses: [...profileAddresses, ...orderAddresses].filter((address): address is string => Boolean(address)),
      orders: user.orders,
      customerNotes: user.customerNotes ?? undefined,
      customerTags: parseCustomerTags(user.customerTags),
    });
    return {
      ...customer,
      communicationPreferences: {
        marketingEmails: user.marketingEmails ?? false,
        productAlertEmails: user.productAlertEmails ?? true,
        postPurchaseEmails: user.postPurchaseEmails ?? true,
      },
      fitPreferences: {
        preferredSize: user.preferredSize ?? undefined,
        fitPreference: user.fitPreference ?? undefined,
        compressionPreference: user.compressionPreference ?? undefined,
      },
      privacy: {
        emailVerifiedAt: user.emailVerifiedAt?.toISOString(),
        deletedAt: user.deletedAt?.toISOString(),
        deletionState: user.deletedAt ? "PENDING_DELETION" as const : "ACTIVE" as const,
        requests: (user.privacyRequests ?? []).map((request) => ({
          id: request.id,
          type: request.type,
          status: request.status,
          legalHold: request.legalHold,
          retentionUntil: request.retentionUntil?.toISOString(),
          completedAt: request.completedAt?.toISOString(),
          createdAt: request.createdAt.toISOString(),
        })),
      },
      productAlerts: (user.productAlerts ?? []).map((alert) => ({
        id: alert.id,
        type: alert.type,
        status: alert.status,
        productTitle: alert.product.title,
        productSlug: alert.product.slug,
        variantLabel: alert.variant
          ? [alert.variant.color.name, alert.variant.size.name, alert.variant.sku].filter(Boolean).join(" / ")
          : undefined,
        targetPrice: alert.targetPrice ? decimalToNumber(alert.targetPrice) : undefined,
        lastNotifiedAt: alert.lastNotifiedAt?.toISOString(),
        createdAt: alert.createdAt.toISOString(),
      })),
    };
  });

  const guestGroups = new Map<string, CustomerOrderRow[]>();
  guestOrders.forEach((order) => {
    const key = order.email.toLowerCase();
    guestGroups.set(key, [...(guestGroups.get(key) ?? []), order]);
  });

  const guestCustomers = Array.from(guestGroups.entries()).map(([email, orders]) => {
    const firstOrder = [...orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    const addresses = orders.flatMap((order) => [formatAddress(order.shippingAddress), formatAddress(order.billingAddress)]);

    return buildCustomerFromOrders({
      id: `guest:${email}`,
      type: "Guest",
      name: firstOrder?.shippingAddress?.name ?? firstOrder?.billingAddress?.name ?? "Guest customer",
      email,
      addresses: addresses.filter((address): address is string => Boolean(address)),
      orders,
    });
  });

  return [...accountCustomers, ...guestCustomers].sort((a, b) => {
    const aTime = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
    const bTime = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
    return bTime - aTime || b.lifetimeValue - a.lifetimeValue;
  });
}

async function getAdminProductRows() {
  await Promise.all([publishDueScheduledProducts(), publishDueScheduledCollections()]);

  return prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      category: true,
      collections: true,
      tags: { include: { _count: { select: { products: true } } } },
      images: { orderBy: { position: "asc" } },
      variants: {
        orderBy: [{ color: { name: "asc" } }, { size: { name: "asc" } }],
        include: {
          color: true,
          size: true,
          medias: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
}

export function mapAdminProduct(row: ProductRow): AdminProduct {
  const colors = Array.from(
    new Map(row.variants.map((variant) => [variant.color.id, variant.color])).values(),
  ).map((color) => ({ id: color.id, name: color.name, hex: color.hex }));
  const sizes = Array.from(
    new Map(row.variants.map((variant) => [variant.size.id, variant.size])).values(),
  ).map((size) => ({ id: size.id, name: size.name }));

  return {
    id: row.id,
    name: row.title,
    slug: row.slug,
    sku: row.sku,
    description: row.description,
    fabricDetails: row.fabricDetails,
    careInstructions: row.careInstructions,
    fitSummary: row.fitSummary ?? undefined,
    modelReference: row.modelReference ?? undefined,
    sizeAdvice: row.sizeAdvice ?? undefined,
    dimensionNotes: parseStringArray(row.dimensionNotes),
    category: row.category.name,
    categoryId: row.categoryId,
    collections: row.collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
    })),
    price: decimalToNumber(row.price),
    salePrice: row.salePrice ? decimalToNumber(row.salePrice) : undefined,
    stock: row.variants.reduce((sum, variant) => sum + variant.stock, 0),
    status: mapStatus(row.status),
    scheduledAt: row.scheduledAt?.toISOString() ?? undefined,
    publishedAt: row.publishedAt?.toISOString() ?? undefined,
    featured: row.featured,
    bestSeller: row.bestSeller,
    newArrival: row.newArrival,
    seoTitle: row.seoTitle ?? undefined,
    seoDescription: row.seoDescription ?? undefined,
    socialImage: row.socialImage ?? undefined,
    images: row.images.map((image) => image.url),
    tags: row.tags.map(mapAdminTag),
    colors,
    sizes,
    variants: row.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku ?? undefined,
      stock: variant.stock,
      colorId: variant.colorId,
      colorName: variant.color.name,
      colorHex: variant.color.hex,
      sizeId: variant.sizeId,
      sizeName: variant.size.name,
      media: variant.medias.map((media) => ({
        id: media.id,
        type: media.type,
        url: media.url,
        sortOrder: media.sortOrder,
        isHoverImage: media.isHoverImage,
      })),
    })),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAdminCatalog() {
  await expireStaleCartReservations();
  await publishDueScheduledHomepageSections();
  const [
    products,
    reviews,
    returnRequests,
    categories,
    collections,
    colors,
    sizes,
    tags,
    inventory,
    orders,
    customerUsers,
    guestOrders,
    couponRows,
    giftCardRows,
    activityLogs,
    adminUsers,
    homepageSections,
    mediaAssets,
    newsletterSubscribers,
    emailIntegrations,
    automationWorkflows,
    scheduledReports,
    cartRows,
    searchEvents,
    searchClickEvents,
    searchConversionEvents,
    storefrontFilterEvents,
    recommendationEvents,
    emailDeliveries,
    automationEvents,
    emailProviderEvents,
    paymentProviderEvents,
    automationReportDeliveries,
    checkoutSettings,
    returnSettings,
    recommendationSettings,
    searchMerchandisingSettings,
    globalContentSettings,
    productAlertDeliveries,
    productTranslations,
    categoryTranslations,
    collectionTranslations,
    homepageTranslations,
  ] = await Promise.all([
    getAdminProductRows(),
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { id: true, title: true, slug: true } },
        media: { orderBy: { createdAt: "asc" } },
        reports: { orderBy: { createdAt: "desc" } },
        events: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    }),
    prisma.returnRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        order: {
          include: {
            user: { select: { name: true } },
            shippingAddress: true,
            billingAddress: true,
            payment: true,
            shipment: true,
          },
        },
        items: {
          include: {
            orderItem: true,
            requestedVariant: { include: { color: true, size: true } },
          },
        },
        events: { orderBy: { createdAt: "asc" } },
        evidence: { orderBy: { createdAt: "asc" } },
        integrationAttempts: { orderBy: { createdAt: "desc" } },
        replacementOrder: { include: { shipment: true } },
        returnShipment: true,
        inspection: true,
        refund: true,
      },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        parent: true,
        _count: { select: { products: true, children: true } },
      },
    }),
    prisma.collection.findMany({
      orderBy: { name: "asc" },
      include: {
        products: { select: { id: true } },
        productSettings: { orderBy: [{ pinned: "desc" }, { sortOrder: "asc" }] },
        _count: { select: { products: true } },
      },
    }),
    prisma.color.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { variants: true } } },
    }),
    prisma.size.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { variants: true } } },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.productVariant.findMany({
      orderBy: [{ product: { title: "asc" } }, { color: { name: "asc" } }, { size: { name: "asc" } }],
      include: {
        product: { select: { id: true, title: true, slug: true, updatedAt: true } },
        color: { select: { name: true, hex: true } },
        size: { select: { name: true } },
        inventoryLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            variant: {
              select: {
                sku: true,
                product: { select: { title: true } },
                color: { select: { name: true } },
                size: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true } },
        shippingAddress: true,
        billingAddress: true,
        payment: true,
        shipment: true,
        items: true,
      },
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
      include: {
        addresses: true,
        productAlerts: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            product: { select: { title: true, slug: true } },
            variant: {
              select: {
                sku: true,
                color: { select: { name: true } },
                size: { select: { name: true } },
              },
            },
          },
        },
        privacyRequests: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            shippingAddress: true,
            billingAddress: true,
          },
        },
      },
    }),
    prisma.order.findMany({
      where: { userId: null },
      orderBy: { createdAt: "desc" },
      include: {
        shippingAddress: true,
        billingAddress: true,
      },
    }),
    prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true } } },
    }),
    prisma.giftCard.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        ledgerEntries: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { order: { select: { orderNumber: true } } },
        },
      },
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "MANAGER", "ORDER_MANAGER", "CONTENT_EDITOR"] } },
      orderBy: { createdAt: "desc" },
      include: { adminRole: { select: { name: true } } },
    }),
    prisma.homepageSection.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        collection: { select: { name: true } },
        products: { select: { id: true } },
        versions: { orderBy: { version: "desc" }, take: 10 },
      },
    }),
    prisma.mediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.newsletterSubscriber.findMany({
      orderBy: { subscribedAt: "desc" },
      take: 500,
    }),
    prisma.emailIntegration.findMany({
      orderBy: { provider: "asc" },
    }),
    prisma.automationWorkflow.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.scheduledReport.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.cart.findMany({
      where: { items: { some: {} } },
      orderBy: { updatedAt: "desc" },
      include: {
        items: {
          include: { product: { select: { title: true } } },
        },
      },
    }),
    prisma.searchEvent.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60_000) } },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.searchClickEvent.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60_000) } },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.searchConversionEvent.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60_000) } },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.storefrontFilterEvent.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60_000) } },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.recommendationEvent.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60_000) } },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.emailDelivery.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        workflow: { select: { name: true } },
        order: { select: { orderNumber: true } },
      },
    }),
    prisma.automationEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.emailProviderEvent.findMany({
      orderBy: { occurredAt: "desc" },
      take: 100,
    }),
    prisma.paymentProviderEvent.findMany({
      orderBy: { occurredAt: "desc" },
      take: 100,
    }),
    prisma.emailDelivery.findMany({
      where: {
        eventType: { not: null },
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60_000) },
      },
      select: {
        eventType: true,
        status: true,
        clickedAt: true,
        convertedAt: true,
        conversionValue: true,
      },
      take: 5000,
    }),
    getCheckoutSettings(),
    getReturnSettings(),
    getRecommendationSettings(),
    getSearchMerchandisingSettings(),
    getGlobalContentSettings(),
    getProductAlertQueueRows(),
    prisma.productTranslation.findMany({
      where: { locale: "ar" },
      select: { productId: true, updatedAt: true },
    }),
    prisma.categoryTranslation.findMany({
      where: { locale: "ar" },
      select: { categoryId: true, updatedAt: true },
    }),
    prisma.collectionTranslation.findMany({
      where: { locale: "ar" },
      select: { collectionId: true, updatedAt: true },
    }),
    prisma.homepageSectionTranslation.findMany({
      where: { locale: "ar" },
      select: { homepageSectionId: true, updatedAt: true },
    }),
  ]);

  const mediaUsageEntries = await Promise.all(
    mediaAssets.map(async (asset) => {
      const [productImages, variantMedia, collectionBanners, homepageImages, homepageMobileImages] =
        await Promise.all([
          prisma.productImage.count({ where: { url: asset.url } }),
          prisma.variantMedia.count({ where: { url: asset.url } }),
          prisma.collection.count({ where: { bannerImage: asset.url } }),
          prisma.homepageSection.count({ where: { imageUrl: asset.url } }),
          prisma.homepageSection.count({ where: { mobileImageUrl: asset.url } }),
        ]);

      return [
        asset.url,
        productImages + variantMedia + collectionBanners + homepageImages + homepageMobileImages,
      ] as const;
    }),
  );
  const mediaUsageByUrl = new Map(mediaUsageEntries);
  const abandonedCutoff = Date.now() - ABANDONED_CART_HOURS * 60 * 60_000;
  const completedCarts = cartRows.filter((cart) => cart.status === "COMPLETED");
  const checkoutCarts = cartRows.filter((cart) => cart.checkoutStartedAt);
  const abandonedCarts = cartRows.filter(
    (cart) =>
      cart.status === "ABANDONED" ||
      (cart.status === "CHECKOUT" &&
        cart.updatedAt.getTime() <= abandonedCutoff),
  );
  const mapCartValue = (cart: (typeof cartRows)[number]) =>
    cart.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );
  const cartAnalytics: AdminCartAnalytics = {
    cartsStarted: cartRows.length,
    checkoutsStarted: checkoutCarts.length,
    completedCarts: completedCarts.length,
    abandonedCarts: abandonedCarts.length,
    conversionRate: cartRows.length
      ? (completedCarts.length / cartRows.length) * 100
      : 0,
    checkoutConversionRate: checkoutCarts.length
      ? (completedCarts.length / checkoutCarts.length) * 100
      : 0,
    abandonedValue: abandonedCarts.reduce(
      (sum, cart) => sum + mapCartValue(cart),
      0,
    ),
    recentAbandoned: abandonedCarts.slice(0, 20).map((cart) => ({
      id: cart.id,
      email: cart.email ?? undefined,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      value: mapCartValue(cart),
      updatedAt: cart.updatedAt.toISOString(),
      status: cart.status,
    })),
  };
  const activeReservationCarts = cartRows.filter((cart) =>
    ["ACTIVE", "CHECKOUT"].includes(cart.status),
  );
  const expiringSoonCutoff = Date.now() + 10 * 60_000;
  const expiringSoonCarts = activeReservationCarts.filter(
    (cart) => cart.expiresAt.getTime() <= expiringSoonCutoff,
  );
  const sumCartUnits = (rows: typeof activeReservationCarts) =>
    rows.reduce(
      (sum, cart) => sum + cart.items.reduce((lineSum, item) => lineSum + item.quantity, 0),
      0,
    );
  const cartReservationSummary: AdminCartReservationSummary = {
    activeCarts: activeReservationCarts.filter((cart) => cart.status === "ACTIVE").length,
    checkoutCarts: activeReservationCarts.filter((cart) => cart.status === "CHECKOUT").length,
    reservedUnits: sumCartUnits(activeReservationCarts),
    expiringSoonCarts: expiringSoonCarts.length,
    expiringSoonUnits: sumCartUnits(expiringSoonCarts),
    oldestExpiresAt: activeReservationCarts
      .map((cart) => cart.expiresAt)
      .sort((a, b) => a.getTime() - b.getTime())[0]
      ?.toISOString(),
  };
  const inventoryAnomalies: AdminInventoryAnomaly[] = inventory.flatMap((variant) => {
    const sellableCapacity = variant.allowBackorder && variant.backorderLimit != null
      ? variant.stock + variant.backorderLimit
      : variant.stock;
    const anomalies: AdminInventoryAnomaly[] = [];
    if (variant.reservedStock > sellableCapacity) {
      anomalies.push({
        variantId: variant.id,
        sku: variant.sku ?? undefined,
        productName: variant.product.title,
        variantLabel: `${variant.color.name} / ${variant.size.name}`,
        severity: "critical",
        message: "Reserved stock is higher than sellable capacity.",
        reservedStock: variant.reservedStock,
        sellableCapacity,
      });
    }
    if (variant.stock < 0) {
      anomalies.push({
        variantId: variant.id,
        sku: variant.sku ?? undefined,
        productName: variant.product.title,
        variantLabel: `${variant.color.name} / ${variant.size.name}`,
        severity: "critical",
        message: "Stock is below zero.",
        reservedStock: variant.reservedStock,
        sellableCapacity,
      });
    }
    return anomalies;
  });
  const automationReportByType = new Map<string, AdminAutomationReportRow>();
  for (const delivery of automationReportDeliveries) {
    const type = delivery.eventType ?? "UNKNOWN";
    const row = automationReportByType.get(type) ?? {
      type,
      sent: 0,
      suppressed: 0,
      failed: 0,
      clicked: 0,
      converted: 0,
      revenue: 0,
      clickRate: 0,
      conversionRate: 0,
    };
    if (["SENT", "DRY_RUN"].includes(delivery.status)) row.sent += 1;
    if (delivery.status === "SUPPRESSED") row.suppressed += 1;
    if (["FAILED", "BOUNCED", "COMPLAINED"].includes(delivery.status)) row.failed += 1;
    if (delivery.clickedAt) row.clicked += 1;
    if (delivery.convertedAt) row.converted += 1;
    row.revenue += delivery.conversionValue ? Number(delivery.conversionValue) : 0;
    automationReportByType.set(type, row);
  }
  const automationReport = Array.from(automationReportByType.values())
    .map((row) => ({
      ...row,
      clickRate: row.sent ? (row.clicked / row.sent) * 100 : 0,
      conversionRate: row.sent ? (row.converted / row.sent) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || a.type.localeCompare(b.type));
  const clicksByQuery = new Map<string, number>();
  for (const click of searchClickEvents) {
    clicksByQuery.set(click.normalizedQuery, (clicksByQuery.get(click.normalizedQuery) ?? 0) + 1);
  }
  const conversionsByQuery = new Map<string, { conversions: number; conversionValue: number }>();
  for (const conversion of searchConversionEvents) {
    const row = conversionsByQuery.get(conversion.normalizedQuery) ?? { conversions: 0, conversionValue: 0 };
    row.conversions += 1;
    row.conversionValue += conversion.conversionValue ? Number(conversion.conversionValue) : 0;
    conversionsByQuery.set(conversion.normalizedQuery, row);
  }
  const searchesByQuery = new Map<string, {
    query: string;
    count: number;
    zeroResults: number;
    clicks: number;
    conversions: number;
    conversionValue: number;
  }>();
  for (const event of searchEvents) {
    const conversions = conversionsByQuery.get(event.normalizedQuery);
    const row = searchesByQuery.get(event.normalizedQuery) ?? {
      query: event.query,
      count: 0,
      zeroResults: 0,
      clicks: clicksByQuery.get(event.normalizedQuery) ?? 0,
      conversions: conversions?.conversions ?? 0,
      conversionValue: conversions?.conversionValue ?? 0,
    };
    row.count += 1;
    if (event.zeroResults) row.zeroResults += 1;
    searchesByQuery.set(event.normalizedQuery, row);
  }
  for (const [normalizedQuery, conversions] of conversionsByQuery) {
    if (searchesByQuery.has(normalizedQuery)) continue;
    searchesByQuery.set(normalizedQuery, {
      query: normalizedQuery,
      count: 0,
      zeroResults: 0,
      clicks: clicksByQuery.get(normalizedQuery) ?? 0,
      conversions: conversions.conversions,
      conversionValue: conversions.conversionValue,
    });
  }
  const filtersByKey = new Map<string, { filterKey: string; value: string; count: number; resultTotal: number }>();
  for (const event of storefrontFilterEvents) {
    const key = `${event.filterKey}:${event.value}`.toLowerCase();
    const row = filtersByKey.get(key) ?? {
      filterKey: event.filterKey,
      value: event.value,
      count: 0,
      resultTotal: 0,
    };
    row.count += 1;
    row.resultTotal += event.resultCount;
    filtersByKey.set(key, row);
  }
  const recommendationsByType = new Map<string, number>();
  for (const event of recommendationEvents) {
    recommendationsByType.set(event.eventType, (recommendationsByType.get(event.eventType) ?? 0) + 1);
  }
  const eventDiagnostics: AdminEventDiagnostics = {
    searchEvents: searchEvents.length,
    zeroResultSearches: searchEvents.filter((event) => event.zeroResults).length,
    searchClicks: searchClickEvents.length,
    searchConversions: searchConversionEvents.length,
    searchConversionValue: searchConversionEvents.reduce((sum, event) => sum + (event.conversionValue ? Number(event.conversionValue) : 0), 0),
    filterEvents: storefrontFilterEvents.length,
    recommendationEvents: recommendationEvents.length,
    topSearches: Array.from(searchesByQuery.values())
      .map((row) => ({
        ...row,
        clickThroughRate: row.count ? (row.clicks / row.count) * 100 : 0,
        conversionRate: row.clicks ? (row.conversions / row.clicks) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count || b.clicks - a.clicks || a.query.localeCompare(b.query))
      .slice(0, 8),
    zeroResultQueries: Array.from(searchesByQuery.values())
      .filter((row) => row.zeroResults > 0)
      .map((row) => ({ query: row.query, count: row.zeroResults }))
      .sort((a, b) => b.count - a.count || a.query.localeCompare(b.query))
      .slice(0, 8),
    topFilters: Array.from(filtersByKey.values())
      .map((row) => ({
        filterKey: row.filterKey,
        value: row.value,
        count: row.count,
        avgResultCount: row.count ? row.resultTotal / row.count : 0,
      }))
      .sort((a, b) => b.count - a.count || a.filterKey.localeCompare(b.filterKey))
      .slice(0, 8),
    recommendationSummary: Array.from(recommendationsByType.entries())
      .map(([eventType, count]) => ({ eventType, count }))
      .sort((a, b) => b.count - a.count || a.eventType.localeCompare(b.eventType)),
  };

  return {
    products: products.map(mapAdminProduct),
    reviews: reviews.map((review): AdminReview => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      status: review.status as AdminReview["status"],
      verifiedPurchase: review.verifiedPurchase,
      customerName: review.user?.name ?? "Customer",
      customerEmail: review.user?.email,
      productId: review.product.id,
      productName: review.product.title,
      productSlug: review.product.slug,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      adminResponse: review.adminResponse ?? undefined,
      respondedAt: review.respondedAt?.toISOString(),
      editableUntil: review.editableUntil?.toISOString(),
      media: review.media.map((media) => ({
        id: media.id,
        url: `/api/reviews/media/${media.id}`,
        originalName: media.originalName,
        status: media.status,
        altText: media.altText ?? undefined,
      })),
      reports: review.reports.map((report) => ({
        id: report.id,
        reason: report.reason,
        details: report.details ?? undefined,
        status: report.status,
        reporterEmail: report.reporterEmail,
        createdAt: report.createdAt.toISOString(),
      })),
      events: review.events.map((event) => ({
        id: event.id,
        action: event.action,
        actor: event.actor,
        message: event.message ?? undefined,
        createdAt: event.createdAt.toISOString(),
      })),
    })),
    returnRequests: returnRequests.map((request): AdminReturnRequest => ({
      id: request.id,
      orderId: request.orderId,
      orderNumber: request.order.orderNumber,
      customerName: request.order.user?.name ?? request.order.shippingAddress?.name ?? request.order.billingAddress?.name ?? "Guest customer",
      email: request.order.email,
      phone: request.order.shippingAddress?.phone ?? request.order.billingAddress?.phone ?? undefined,
      resolution: request.resolution,
      reason: request.reason,
      notes: request.notes || undefined,
      adminNote: request.adminNote ?? undefined,
      status: request.status,
      integrationStatus: request.integrationStatus,
      externalReference: request.externalReference ?? undefined,
      replacementOrder: request.replacementOrder ? {
        id: request.replacementOrder.id,
        orderNumber: request.replacementOrder.orderNumber,
        status: request.replacementOrder.status,
        fulfillmentStatus: request.replacementOrder.fulfillmentStatus,
        shipmentStatus: request.replacementOrder.shipment?.status,
        trackingNo: request.replacementOrder.shipment?.trackingNo ?? undefined,
      } : undefined,
      returnShipment: request.returnShipment ? {
        status: request.returnShipment.status,
        carrier: request.returnShipment.carrier ?? undefined,
        trackingNo: request.returnShipment.trackingNo ?? undefined,
        pickupStart: request.returnShipment.pickupStart?.toISOString(),
        pickupEnd: request.returnShipment.pickupEnd?.toISOString(),
        labelId: request.returnShipment.labelId ?? undefined,
      } : undefined,
      inspection: request.inspection ? {
        condition: request.inspection.condition,
        disposition: request.inspection.disposition,
        notes: request.inspection.notes ?? undefined,
        inspectedBy: request.inspection.inspectedBy,
        inspectedAt: request.inspection.inspectedAt.toISOString(),
      } : undefined,
      refund: request.refund ? {
        id: request.refund.id,
        amount: decimalToNumber(request.refund.amount),
        status: request.refund.status,
        provider: request.refund.provider,
        providerRef: request.refund.providerRef ?? undefined,
        note: request.refund.note ?? undefined,
        updatedAt: request.refund.updatedAt.toISOString(),
      } : undefined,
      orderStatus: request.order.status,
      paymentStatus: request.order.payment?.status ?? request.order.paymentStatus,
      fulfillmentStatus: request.order.shipment?.status ?? request.order.fulfillmentStatus,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      decisionAt: request.decisionAt?.toISOString(),
      completedAt: request.completedAt?.toISOString(),
      items: request.items.map((item) => ({
        id: item.id,
        orderItemId: item.orderItemId,
        title: item.orderItem.title,
        color: item.orderItem.color,
        originalSize: item.orderItem.size,
        requestedSize: item.requestedSize ?? item.requestedVariant?.size.name ?? undefined,
        requestedVariantId: item.requestedVariantId ?? undefined,
        requestedSku: item.requestedVariant?.sku ?? undefined,
        replacementAvailable: item.requestedVariant
          ? item.requestedVariant.allowBackorder || item.requestedVariant.stock - item.requestedVariant.reservedStock > 0
          : undefined,
        quantity: item.quantity,
      })),
      events: request.events.map((event) => ({
        id: event.id,
        status: event.status,
        message: event.message ?? undefined,
        actor: event.actor,
        createdAt: event.createdAt.toISOString(),
      })),
      evidence: request.evidence.map((item) => ({
        id: item.id,
        originalName: item.originalName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        uploadedBy: item.uploadedBy,
        createdAt: item.createdAt.toISOString(),
        scanStatus: item.scanStatus,
        scanProvider: item.scanProvider ?? undefined,
        scanReference: item.scanReference ?? undefined,
      })),
      integrationAttempts: request.integrationAttempts.map((attempt) => ({
        id: attempt.id,
        provider: attempt.provider,
        action: attempt.action,
        status: attempt.status,
        attempts: attempt.attempts,
        errorMessage: attempt.errorMessage ?? undefined,
        externalRef: attempt.externalRef ?? undefined,
        nextRetryAt: attempt.nextRetryAt?.toISOString(),
        lastAttemptAt: attempt.lastAttemptAt?.toISOString(),
        createdAt: attempt.createdAt.toISOString(),
      })),
    })),
    categories: categories.map(mapAdminCategory),
    collections: collections.map(mapAdminCollection),
    colors: colors.map(mapAdminColor),
    sizes: sizes.map(mapAdminSize),
    tags: tags.map(mapAdminTag),
    inventory: inventory.map(mapAdminInventoryRow),
    orders: orders.map(mapAdminOrder),
    customers: mapAdminCustomers(customerUsers, guestOrders),
    coupons: couponRows.map(
      (c): AdminCoupon => ({
        id: c.id,
        code: c.code,
        type: c.type as AdminCoupon["type"],
        value: decimalToNumber(c.value),
        minimumAmount: c.minimumAmount ? decimalToNumber(c.minimumAmount) : undefined,
        usageLimit: c.usageLimit ?? undefined,
        usageCount: c._count.orders,
        expiresAt: c.expiresAt?.toISOString() ?? undefined,
        combinable: c.combinable,
        eligibleProductIds: parseCouponList(c.eligibleProductIds),
        eligibleCategories: parseCouponList(c.eligibleCategories),
        eligibleCollections: parseCouponList(c.eligibleCollections),
        excludedProductIds: parseCouponList(c.excludedProductIds),
        createdAt: c.createdAt.toISOString(),
      }),
    ),
    giftCards: giftCardRows.map(
      (card): AdminGiftCard => ({
        id: card.id,
        codeLast4: card.codeLast4,
        initialBalance: decimalToNumber(card.initialBalance),
        balance: decimalToNumber(card.balance),
        currency: card.currency,
        status: card.status,
        recipientEmail: card.recipientEmail ?? undefined,
        purchaserEmail: card.purchaserEmail ?? undefined,
        note: card.note ?? undefined,
        expiresAt: card.expiresAt?.toISOString(),
        issuedAt: card.issuedAt.toISOString(),
        createdAt: card.createdAt.toISOString(),
        ledgerEntries: card.ledgerEntries.map((entry) => ({
          id: entry.id,
          type: entry.type,
          amount: decimalToNumber(entry.amount),
          balanceAfter: decimalToNumber(entry.balanceAfter),
          actor: entry.actor,
          note: entry.note ?? undefined,
          orderNumber: entry.order?.orderNumber,
          createdAt: entry.createdAt.toISOString(),
        })),
      }),
    ),
    activityLogs: activityLogs.map(mapAdminActivityLog),
    adminUsers: adminUsers.map(mapAdminUser),
    homepageSections: homepageSections.map(mapAdminHomepageSection),
    mediaAssets: mediaAssets.map((asset) => mapAdminMediaAsset(asset, mediaUsageByUrl.get(asset.url) ?? 0)),
    cartAnalytics,
    cartReservationSummary,
    inventoryAnomalies,
    eventDiagnostics,
    automationReport,
    emailDeliveries: emailDeliveries.map(
      (delivery): AdminEmailDelivery => ({
        id: delivery.id,
        recipient: delivery.recipient,
        subject: delivery.subject,
        provider: delivery.provider,
        status: delivery.status,
        error: delivery.error ?? undefined,
        eventType: delivery.eventType ?? undefined,
        attempts: delivery.attempts,
        maxAttempts: delivery.maxAttempts,
        nextAttemptAt: delivery.nextAttemptAt?.toISOString(),
        suppressionReason: delivery.suppressionReason ?? undefined,
        clickedAt: delivery.clickedAt?.toISOString(),
        convertedAt: delivery.convertedAt?.toISOString(),
        conversionValue: delivery.conversionValue ? Number(delivery.conversionValue) : undefined,
        sentAt: delivery.sentAt?.toISOString(),
        createdAt: delivery.createdAt.toISOString(),
        workflowName: delivery.workflow?.name,
        orderNumber: delivery.order?.orderNumber,
      }),
    ),
    automationEvents: automationEvents.map(
      (event): AdminAutomationEvent => ({
        id: event.id,
        type: event.type,
        sourceKey: event.sourceKey,
        recipient: event.recipient,
        status: event.status,
        scheduledAt: event.scheduledAt.toISOString(),
        processedAt: event.processedAt?.toISOString(),
        skippedAt: event.skippedAt?.toISOString(),
        error: event.error ?? undefined,
        orderId: event.orderId ?? undefined,
        cartId: event.cartId ?? undefined,
        createdAt: event.createdAt.toISOString(),
      }),
    ),
    emailProviderEvents: emailProviderEvents.map(
      (event): AdminEmailProviderEvent => ({
        id: event.id,
        provider: event.provider,
        providerEventId: event.providerEventId,
        eventType: event.eventType,
        recipient: event.recipient,
        severity: event.severity,
        alertStatus: event.alertStatus,
        message: event.message ?? undefined,
        deliveryId: event.deliveryId ?? undefined,
        sourceKey: event.sourceKey ?? undefined,
        occurredAt: event.occurredAt.toISOString(),
        createdAt: event.createdAt.toISOString(),
      }),
    ),
    paymentProviderEvents: paymentProviderEvents.map(
      (event): AdminPaymentProviderEvent => ({
        id: event.id,
        provider: event.provider,
        providerEventId: event.providerEventId,
        eventType: event.eventType,
        orderId: event.orderId ?? undefined,
        orderNumber: event.orderNumber ?? undefined,
        paymentRef: event.paymentRef ?? undefined,
        severity: event.severity,
        status: event.status,
        message: event.message ?? undefined,
        occurredAt: event.occurredAt.toISOString(),
        processedAt: event.processedAt?.toISOString(),
        createdAt: event.createdAt.toISOString(),
      }),
    ),
    newsletterSubscribers: newsletterSubscribers.map((subscriber) => ({
      id: subscriber.id,
      email: subscriber.email,
      locale: subscriber.locale,
      source: subscriber.source,
      status: subscriber.status,
      subscribedAt: subscriber.subscribedAt.toISOString(),
    })),
    emailIntegrations: emailIntegrations.map((integration) => ({
      id: integration.id,
      provider: integration.provider,
      enabled: integration.enabled,
      listId: integration.listId ?? undefined,
      apiKeyEnv: integration.apiKeyEnv ?? undefined,
    })),
    automationWorkflows: automationWorkflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      type: workflow.type,
      enabled: workflow.enabled,
      provider: workflow.provider ?? undefined,
      delayHours: workflow.delayHours,
      subject: workflow.subject ?? undefined,
    })),
    scheduledReports: scheduledReports.map((report) => ({
      id: report.id,
      name: report.name,
      reportType: report.reportType,
      frequency: report.frequency,
      recipients: report.recipients,
      enabled: report.enabled,
      nextRunAt: report.nextRunAt?.toISOString() ?? undefined,
    })),
    checkoutSettings,
    returnSettings,
    recommendationSettings,
    searchMerchandisingSettings,
    globalContentSettings,
    productAlertDeliveries,
    translationCoverage: buildTranslationCoverage({
      products,
      categories,
      collections,
      homepageSections,
      productTranslations: productTranslations.map((translation) => ({ ownerId: translation.productId, updatedAt: translation.updatedAt })),
      categoryTranslations: categoryTranslations.map((translation) => ({ ownerId: translation.categoryId, updatedAt: translation.updatedAt })),
      collectionTranslations: collectionTranslations.map((translation) => ({ ownerId: translation.collectionId, updatedAt: translation.updatedAt })),
      homepageTranslations: homepageTranslations.map((translation) => ({ ownerId: translation.homepageSectionId, updatedAt: translation.updatedAt })),
    }),
  };
}

export async function getAdminProduct(id: string) {
  const row = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      collections: true,
      tags: { include: { _count: { select: { products: true } } } },
      images: { orderBy: { position: "asc" } },
      variants: {
        orderBy: [{ color: { name: "asc" } }, { size: { name: "asc" } }],
        include: {
          color: true,
          size: true,
          medias: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  return row ? mapAdminProduct(row) : null;
}

export async function getAdminProductActivityLogs(id: string): Promise<AdminActivityLog[]> {
  const logs = await prisma.activityLog.findMany({
    where: {
      OR: [
        { entityType: "product", entityId: id },
        { entityType: "inventory", metadata: { contains: id } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return logs.map(mapAdminActivityLog);
}

export async function getAdminCatalogOptions() {
  const [categories, collections, tags, mediaAssets] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.collection.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
  ]);

  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    })),
    collections: collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
    })),
    tags: tags.map(mapAdminTag),
    mediaAssets: mediaAssets.map((asset) => mapAdminMediaAsset(asset, 0)),
  };
}
