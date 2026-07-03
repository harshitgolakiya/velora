import type { FilterSettings } from "./filter-settings";

export type Collection = {
  slug: string;
  name: string;
  summary: string;
  image: string;
  status?: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  scheduledAt?: string;
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  socialImage?: string;
  filterSettings?: FilterSettings;
};

export type Category = {
  slug: string;
  name: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  socialImage?: string;
  filterSettings?: FilterSettings;
};

export type ProductMedia = {
  type: "IMAGE" | "VIDEO";
  url: string;
  sortOrder: number;
  isHoverImage: boolean;
  width?: number;
  height?: number;
  altText?: string;
  focalPointX?: number;
  focalPointY?: number;
};

export type ProductVariant = {
  id: string;
  sku?: string;
  stock: number;
  reservedStock?: number;
  lowStockThreshold?: number;
  allowBackorder?: boolean;
  backorderLimit?: number;
  backorderAvailable?: number;
  backorderShipsAt?: string;
  backorderMessage?: string;
  color: {
    id: string;
    name: string;
    hex: string;
  };
  size: {
    id: string;
    name: string;
  };
  media: ProductMedia[];
};

export type Product = {
  id: string;
  sku?: string;
  slug: string;
  name: string;
  category: string;
  collection: string;
  collections?: string[];
  collectionMerchandising?: Record<string, { sortOrder: number; pinned: boolean }>;
  collectionDetails?: Collection[];
  price: number;
  salePrice?: number;
  rating: number;
  reviews: number;
  reviewItems?: Array<{
    id: string;
    rating: number;
    title: string;
    body: string;
    createdAt: string;
    verifiedPurchase?: boolean;
    customerName?: string;
    media?: Array<{ id: string; url: string; altText?: string }>;
    adminResponse?: string;
    respondedAt?: string;
  }>;
  tags?: string[];
  stock: number;
  colors: string[];
  sizes: string[];
  badge?: string;
  featured?: boolean;
  bestSeller?: boolean;
  newArrival?: boolean;
  images: string[];
  hoverImage?: string;
  colorHex?: Record<string, string>;
  variantMediaByColor?: Record<string, ProductMedia[]>;
  variants?: ProductVariant[];
  description: string;
  fabric: string;
  care: string;
  fitSummary?: string;
  modelReference?: string;
  sizeAdvice?: string;
  dimensionNotes?: string[];
  seoTitle?: string;
  seoDescription?: string;
  socialImage?: string;
  updatedAt?: string;
};

export const categories = ["Leggings", "Sports Bras", "Jackets", "Tops", "Pants", "Accessories"];

export const categoryDescriptions: Record<string, string> = {
  Leggings: "Compressive, four-way stretch leggings built for studio sessions, long runs, and everyday wear.",
  "Sports Bras": "Supportive bras engineered for every impact level, from restorative flows to high-intensity training.",
  Jackets: "Lightweight layers that move with you between the studio, the street, and cooler evenings.",
  Tops: "Breathable tanks and tees designed to pair with leggings or stand on their own.",
  Pants: "Relaxed and tapered fits for warm-ups, travel, and easing into the day.",
  Accessories: "Bags, bottles, and finishing pieces that round out the Velora kit.",
};

export const collections: Collection[] = [
  {
    slug: "studio-sculpt",
    name: "Studio Sculpt",
    summary: "Compression essentials built for reformer, barre, and slow training.",
    image: "/images/velora/collection-studio-sculpt.jpg",
  },
  {
    slug: "desert-run",
    name: "Desert Run",
    summary: "Breathable layers designed for warm UAE mornings and coastal evenings.",
    image: "/images/velora/aura-legging-2.jpg",
  },
  {
    slug: "after-hours",
    name: "After Hours",
    summary: "Soft technical pieces that move from training to dinner without changing pace.",
    image: "/images/velora/collection-after-hours.jpg",
  },
];

export const products: Product[] = [
  {
    id: "prd-001",
    slug: "aura-compressive-legging",
    name: "Aura Compressive Legging",
    category: "Leggings",
    collection: "studio-sculpt",
    price: 340,
    rating: 4.9,
    reviews: 128,
    stock: 42,
    colors: ["Ink", "Sage", "Oat"],
    sizes: ["XS", "S", "M", "L", "XL"],
    badge: "Best seller",
    featured: true,
    bestSeller: true,
    images: [
      "/images/velora/collection-studio-sculpt.jpg",
      "/images/velora/aura-legging-2.jpg",
    ],
    description: "A sculpting high-rise legging with a clean matte handfeel, engineered stretch, and no front seam.",
    fabric: "72% recycled nylon, 28% elastane. Cool-touch compression with four-way stretch.",
    care: "Machine wash cold with similar colors. Air dry to preserve elasticity.",
  },
  {
    id: "prd-002",
    slug: "noor-rib-crop",
    name: "Noor Rib Crop",
    category: "Tops",
    collection: "after-hours",
    price: 210,
    rating: 4.8,
    reviews: 86,
    stock: 31,
    colors: ["Pearl", "Espresso", "Black"],
    sizes: ["XS", "S", "M", "L"],
    newArrival: true,
    images: [
      "/images/velora/noor-crop-1.jpg",
      "/images/velora/noor-crop-2.jpg",
    ],
    description: "A softly structured rib crop with removable cups and a refined square neckline.",
    fabric: "Ribbed performance knit with moisture management and a cotton-soft surface.",
    care: "Remove cups before washing. Wash inside out and line dry.",
  },
  {
    id: "prd-003",
    slug: "mira-wrap-jacket",
    name: "Mira Wrap Jacket",
    category: "Jackets",
    collection: "desert-run",
    price: 420,
    salePrice: 365,
    rating: 4.7,
    reviews: 64,
    stock: 16,
    colors: ["Stone", "Black"],
    sizes: ["S", "M", "L"],
    badge: "Limited",
    featured: true,
    images: [
      "/images/velora/mira-jacket-1.jpg",
      "/images/velora/mira-jacket-2.jpg",
    ],
    description: "A cropped technical wrap jacket with wind resistance, hidden pockets, and adjustable waist shaping.",
    fabric: "Featherweight recycled shell with a water-repellent finish.",
    care: "Spot clean or machine wash gentle. Do not tumble dry.",
  },
  {
    id: "prd-004",
    slug: "zephyr-training-bra",
    name: "Zephyr Training Bra",
    category: "Sports Bras",
    collection: "studio-sculpt",
    price: 245,
    rating: 4.9,
    reviews: 102,
    stock: 38,
    colors: ["Sage", "Fig", "Black"],
    sizes: ["XS", "S", "M", "L", "XL"],
    bestSeller: true,
    images: [
      "/images/velora/zephyr-bra-1.jpg",
      "/images/velora/zephyr-bra-2.jpg",
    ],
    description: "Medium support bra with bonded edges, a longline silhouette, and removable padding.",
    fabric: "Sweat-wicking compression knit lined with soft mesh.",
    care: "Cold wash in a garment bag. Dry flat.",
  },
  {
    id: "prd-005",
    slug: "selene-wide-leg-pant",
    name: "Selene Wide Leg Pant",
    category: "Pants",
    collection: "after-hours",
    price: 390,
    rating: 4.8,
    reviews: 73,
    stock: 24,
    colors: ["Midnight", "Taupe"],
    sizes: ["XS", "S", "M", "L"],
    featured: true,
    images: [
      "/images/velora/selene-pant-1.jpg",
      "/images/velora/selene-pant-2.jpg",
    ],
    description: "A draped wide-leg pant with technical recovery, hidden drawcord, and polished movement.",
    fabric: "Double-knit modal blend with elastane and a fluid face.",
    care: "Wash cold. Hang to dry. Steam if needed.",
  },
  {
    id: "prd-006",
    slug: "terra-insulated-bottle",
    name: "Terra Insulated Bottle",
    category: "Accessories",
    collection: "desert-run",
    price: 135,
    rating: 4.6,
    reviews: 51,
    stock: 55,
    colors: ["Sand", "Black", "Sea"],
    sizes: ["750ml"],
    newArrival: true,
    images: [
      "/images/velora/terra-bottle-1.jpg",
      "/images/velora/terra-bottle-2.jpg",
    ],
    description: "A powder-coated stainless bottle that keeps drinks cold through long UAE training days.",
    fabric: "BPA-free 18/8 stainless steel with double-wall insulation.",
    care: "Hand wash only. Do not freeze or microwave.",
  },
];

export const policyPages = {
  shipping: {
    title: "Shipping",
    body: "Free UAE shipping above AED 300. Dubai and Abu Dhabi orders usually arrive within 1-2 business days. GCC delivery is supported through tracked courier partners.",
  },
  returns: {
    title: "Returns + Exchanges",
    body: "Full-price pieces can be returned within 14 days when unworn, unwashed, and tagged. Exchanges are free within the UAE, subject to stock availability.",
  },
  privacy: {
    title: "Privacy Policy",
    body: "Velora stores only the data needed to process orders, support accounts, and improve the shopping experience. Payment details are handled by PCI-compliant processors.",
  },
  terms: {
    title: "Terms & Conditions",
    body: "Using Velora means accepting our order, payment, delivery, returns, and account terms. Product availability and pricing may change without notice.",
  },
};

export const getProduct = (slug: string) => products.find((product) => product.slug === slug);
export const getCollection = (slug: string) => collections.find((collection) => collection.slug === slug);
