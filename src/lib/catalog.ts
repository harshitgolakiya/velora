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

export const legacyCategories = ["Dresses", "Jackets", "Tops", "Pants", "Skirts"];

export const legacyCategoryDescriptions: Record<string, string> = {
  Dresses: "Evening gowns, midi dresses, and polished day dresses chosen for a feminine, elevated wardrobe.",
  Jackets: "Tailored layers, trench shapes, and soft outerwear for refined city dressing.",
  Tops: "Boat neck knits, compact tees, and light layering tops with clean feminine proportions.",
  Pants: "Jeans, trousers, and complete looks with a polished everyday line.",
  Skirts: "Corset sets, full skirts, and feminine separates for dressed-up moments.",
};

export const legacyCollections: Collection[] = [
  {
    slug: "evening-edit",
    name: "Evening Edit",
    summary: "Gowns, corset sets, and occasion pieces with a confident feminine line.",
    image: "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/1.webp",
  },
  {
    slug: "city-layers",
    name: "City Layers",
    summary: "Jackets, coats, and polished tops for everyday movement through the city.",
    image: "https://images.pexels.com/photos/2584269/pexels-photo-2584269.jpeg",
  },
  {
    slug: "soft-tailoring",
    name: "Soft Tailoring",
    summary: "Denim, skirts, and feminine basics with structure that still feels easy.",
    image: "https://images.pexels.com/photos/3672825/pexels-photo-3672825.jpeg",
  },
];

export const legacyProducts: Product[] = [
  {
    "id": "prd-001",
    "slug": "noir-column-gown",
    "name": "Noir Column Gown",
    "category": "Dresses",
    "collection": "evening-edit",
    "price": 520,
    "rating": 4.8,
    "reviews": 25,
    "stock": 25,
    "colors": [
      "Black",
      "Onyx",
      "Pearl"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L"
    ],
    "featured": true,
    "bestSeller": true,
    "newArrival": true,
    "images": [
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/1.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/2.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/3.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/4.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/corset-leather-with-skirt/1.webp"
    ],
    "description": "A clean black column gown with a long refined line, soft structure, and an evening silhouette made for gallery openings and formal dinners.",
    "fabric": "Satin-backed stretch crepe with a smooth lining and light internal support.",
    "care": "Dry clean recommended. Steam on low from the reverse side."
  },
  {
    "id": "prd-002",
    "slug": "corset-leather-skirt-set",
    "name": "Corset Leather Skirt Set",
    "category": "Skirts",
    "collection": "evening-edit",
    "price": 430,
    "rating": 4.7,
    "reviews": 30,
    "stock": 30,
    "colors": [
      "Black",
      "Espresso",
      "Stone"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L"
    ],
    "featured": false,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://cdn.dummyjson.com/product-images/womens-dresses/corset-leather-with-skirt/1.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/corset-leather-with-skirt/2.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/corset-leather-with-skirt/3.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/corset-leather-with-skirt/4.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/corset-with-black-skirt/1.webp"
    ],
    "description": "A sharp corset and skirt set with a fitted waist, sculpted seams, and a confident after-dark finish.",
    "fabric": "Vegan leather face with soft stretch backing and a lined skirt interior.",
    "care": "Wipe clean with a damp cloth. Store flat or hung."
  },
  {
    "id": "prd-003",
    "slug": "black-corset-midi-set",
    "name": "Black Corset Midi Set",
    "category": "Skirts",
    "collection": "evening-edit",
    "price": 395,
    "rating": 4.9,
    "reviews": 33,
    "stock": 33,
    "colors": [
      "Black",
      "Pearl",
      "Fig"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L"
    ],
    "featured": false,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://cdn.dummyjson.com/product-images/womens-dresses/corset-with-black-skirt/1.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/corset-with-black-skirt/2.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/corset-with-black-skirt/3.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/corset-with-black-skirt/4.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/dress-pea/1.webp"
    ],
    "description": "A coordinated corset midi set with polished contrast, a close bodice, and an easy skirt line.",
    "fabric": "Structured woven blend with stretch panels and smooth lining.",
    "care": "Dry clean or cold hand wash separately."
  },
  {
    "id": "prd-004",
    "slug": "pea-print-day-dress",
    "name": "Pea Print Day Dress",
    "category": "Dresses",
    "collection": "soft-tailoring",
    "price": 285,
    "rating": 4.6,
    "reviews": 26,
    "stock": 26,
    "colors": [
      "Pearl",
      "Sage",
      "Black"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "featured": false,
    "bestSeller": false,
    "newArrival": true,
    "images": [
      "https://cdn.dummyjson.com/product-images/womens-dresses/dress-pea/1.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/dress-pea/2.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/dress-pea/3.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/dress-pea/4.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/marni-red-&-black-suit/1.webp"
    ],
    "description": "A playful printed day dress with a soft waist shape and breathable ease for warm city afternoons.",
    "fabric": "Lightweight viscose blend with a soft matte finish.",
    "care": "Machine wash cold on gentle. Hang to dry."
  },
  {
    "id": "prd-005",
    "slug": "marni-red-black-suit",
    "name": "Red Black Tailored Suit",
    "category": "Jackets",
    "collection": "city-layers",
    "price": 690,
    "rating": 4.8,
    "reviews": 22,
    "stock": 22,
    "colors": [
      "Red",
      "Black",
      "Onyx"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L"
    ],
    "featured": true,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://cdn.dummyjson.com/product-images/womens-dresses/marni-red-&-black-suit/1.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/marni-red-&-black-suit/2.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/marni-red-&-black-suit/3.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/marni-red-&-black-suit/4.webp",
      "https://fakestoreapi.com/img/51Y5NI-I5jL._AC_UX679_t.png"
    ],
    "description": "A modern red and black tailored suit with a strong shoulder, narrow waist, and clean fashion-week energy.",
    "fabric": "Structured suiting twill with stretch lining.",
    "care": "Dry clean only. Steam between wears."
  },
  {
    "id": "prd-006",
    "slug": "alpine-shell-coat",
    "name": "Alpine Shell Coat",
    "category": "Jackets",
    "collection": "city-layers",
    "price": 360,
    "rating": 4.5,
    "reviews": 36,
    "stock": 36,
    "colors": [
      "Cloud",
      "Black",
      "Navy"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "featured": false,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://fakestoreapi.com/img/51Y5NI-I5jL._AC_UX679_t.png",
      "https://fakestoreapi.com/img/81XH0e8fefL._AC_UY879_t.png",
      "https://fakestoreapi.com/img/71HblAHs5xL._AC_UY879_-2t.png",
      "https://fakestoreapi.com/img/71z3kpMAYsL._AC_UY879_t.png",
      "https://fakestoreapi.com/img/51eg55uWmdL._AC_UX679_t.png"
    ],
    "description": "A weather-ready women’s shell coat refined for travel, layering, and cold city mornings.",
    "fabric": "Water-resistant polyester shell with removable fleece liner.",
    "care": "Machine wash cold with technical detergent."
  },
  {
    "id": "prd-007",
    "slug": "faux-leather-moto-jacket",
    "name": "Faux Leather Moto Jacket",
    "category": "Jackets",
    "collection": "city-layers",
    "price": 315,
    "rating": 4.7,
    "reviews": 30,
    "stock": 30,
    "colors": [
      "Black",
      "Espresso",
      "Cream"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L"
    ],
    "featured": true,
    "bestSeller": true,
    "newArrival": false,
    "images": [
      "https://fakestoreapi.com/img/71z3kpMAYsL._AC_UY879_t.png",
      "https://fakestoreapi.com/img/51eg55uWmdL._AC_UX679_t.png",
      "https://fakestoreapi.com/img/61pHAEJ4NML._AC_UX679_t.png",
      "https://images.pexels.com/photos/2584269/pexels-photo-2584269.jpeg",
      "https://images.pexels.com/photos/2681751/pexels-photo-2681751.jpeg"
    ],
    "description": "A cropped faux leather moto jacket with a removable hood, neat hardware, and a soft streetwear edge.",
    "fabric": "Faux leather shell with soft knit hood and smooth lining.",
    "care": "Spot clean only. Do not tumble dry."
  },
  {
    "id": "prd-008",
    "slug": "striped-rain-trench",
    "name": "Striped Rain Trench",
    "category": "Jackets",
    "collection": "city-layers",
    "price": 340,
    "rating": 4.6,
    "reviews": 32,
    "stock": 32,
    "colors": [
      "Stripe",
      "Cloud",
      "Sage"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "featured": false,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://fakestoreapi.com/img/51eg55uWmdL._AC_UX679_t.png",
      "https://fakestoreapi.com/img/61pHAEJ4NML._AC_UX679_t.png",
      "https://images.pexels.com/photos/2584269/pexels-photo-2584269.jpeg",
      "https://images.pexels.com/photos/2681751/pexels-photo-2681751.jpeg",
      "https://images.pexels.com/photos/2752045/pexels-photo-2752045.jpeg"
    ],
    "description": "A lightweight striped rain trench with a feminine cut and polished coverage for unpredictable days.",
    "fabric": "Water-resistant technical shell with breathable mesh lining.",
    "care": "Machine wash cold. Hang to dry."
  },
  {
    "id": "prd-009",
    "slug": "boat-neck-knit-top",
    "name": "Boat Neck Knit Top",
    "category": "Tops",
    "collection": "soft-tailoring",
    "price": 175,
    "rating": 4.5,
    "reviews": 48,
    "stock": 48,
    "colors": [
      "Black",
      "Pearl",
      "Blush"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "featured": false,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://fakestoreapi.com/img/61pHAEJ4NML._AC_UX679_t.png",
      "https://images.pexels.com/photos/2584269/pexels-photo-2584269.jpeg",
      "https://images.pexels.com/photos/2681751/pexels-photo-2681751.jpeg",
      "https://images.pexels.com/photos/2752045/pexels-photo-2752045.jpeg",
      "https://images.pexels.com/photos/1485031/pexels-photo-1485031.jpeg"
    ],
    "description": "A soft boat-neck knit with an elegant neckline, clean sleeve, and close-but-easy fit.",
    "fabric": "Fine rib knit with stretch recovery and a smooth handfeel.",
    "care": "Machine wash cold. Lay flat to dry."
  },
  {
    "id": "prd-010",
    "slug": "moisture-short-sleeve-top",
    "name": "Moisture Short Sleeve Top",
    "category": "Tops",
    "collection": "city-layers",
    "price": 155,
    "rating": 4.4,
    "reviews": 52,
    "stock": 52,
    "colors": [
      "White",
      "Black",
      "Sage"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "featured": false,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://images.pexels.com/photos/2584269/pexels-photo-2584269.jpeg",
      "https://images.pexels.com/photos/2681751/pexels-photo-2681751.jpeg",
      "https://images.pexels.com/photos/2752045/pexels-photo-2752045.jpeg",
      "https://images.pexels.com/photos/1485031/pexels-photo-1485031.jpeg",
      "https://images.pexels.com/photos/1631181/pexels-photo-1631181.jpeg"
    ],
    "description": "A minimal short sleeve top with breathable comfort and a slim fashion-basic profile.",
    "fabric": "Moisture-wicking jersey with cotton-soft touch.",
    "care": "Machine wash cold. Line dry."
  },
  {
    "id": "prd-011",
    "slug": "casual-cotton-tee",
    "name": "Casual Cotton Tee",
    "category": "Tops",
    "collection": "soft-tailoring",
    "price": 145,
    "rating": 4.5,
    "reviews": 50,
    "stock": 50,
    "colors": [
      "White",
      "Black",
      "Taupe"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "featured": false,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://images.pexels.com/photos/2681751/pexels-photo-2681751.jpeg",
      "https://images.pexels.com/photos/2752045/pexels-photo-2752045.jpeg",
      "https://images.pexels.com/photos/1485031/pexels-photo-1485031.jpeg",
      "https://images.pexels.com/photos/1631181/pexels-photo-1631181.jpeg",
      "https://images.pexels.com/photos/2010812/pexels-photo-2010812.jpeg"
    ],
    "description": "An elevated cotton tee with a flattering short sleeve and clean everyday drape.",
    "fabric": "Soft cotton jersey with a little stretch for shape retention.",
    "care": "Machine wash cold. Tumble low."
  },
  {
    "id": "prd-012",
    "slug": "long-sleeve-fashion-jacket",
    "name": "Long Sleeve Fashion Jacket",
    "category": "Jackets",
    "collection": "city-layers",
    "price": 420,
    "rating": 4.8,
    "reviews": 28,
    "stock": 28,
    "colors": [
      "Stone",
      "Black",
      "Pearl"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L"
    ],
    "featured": true,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://images.pexels.com/photos/2752045/pexels-photo-2752045.jpeg",
      "https://images.pexels.com/photos/1485031/pexels-photo-1485031.jpeg",
      "https://images.pexels.com/photos/1631181/pexels-photo-1631181.jpeg",
      "https://images.pexels.com/photos/2010812/pexels-photo-2010812.jpeg",
      "https://images.pexels.com/photos/2233703/pexels-photo-2233703.jpeg"
    ],
    "description": "A long sleeve fashion jacket with refined proportions, soft structure, and a quiet luxury feel.",
    "fabric": "Structured woven blend with smooth satin lining.",
    "care": "Dry clean recommended."
  },
  {
    "id": "prd-013",
    "slug": "wool-hat-jacket",
    "name": "Wool Hat Jacket",
    "category": "Jackets",
    "collection": "city-layers",
    "price": 330,
    "rating": 4.4,
    "reviews": 24,
    "stock": 24,
    "colors": [
      "Camel",
      "Cream",
      "Black"
    ],
    "sizes": [
      "S",
      "M",
      "L",
      "XL"
    ],
    "featured": false,
    "bestSeller": true,
    "newArrival": false,
    "images": [
      "https://images.pexels.com/photos/1485031/pexels-photo-1485031.jpeg",
      "https://images.pexels.com/photos/1631181/pexels-photo-1631181.jpeg",
      "https://images.pexels.com/photos/2010812/pexels-photo-2010812.jpeg",
      "https://images.pexels.com/photos/2233703/pexels-photo-2233703.jpeg",
      "https://images.pexels.com/photos/2065195/pexels-photo-2065195.jpeg"
    ],
    "description": "A cozy jacket styled with a soft hooded profile and cold-weather texture for layered winter looks.",
    "fabric": "Warm brushed blend with quilted lining.",
    "care": "Dry clean or spot clean."
  },
  {
    "id": "prd-014",
    "slug": "compact-fashion-tee",
    "name": "Compact Fashion Tee",
    "category": "Tops",
    "collection": "soft-tailoring",
    "price": 165,
    "rating": 4.4,
    "reviews": 58,
    "stock": 58,
    "colors": [
      "Pink",
      "White",
      "Black"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L"
    ],
    "featured": false,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://images.pexels.com/photos/1631181/pexels-photo-1631181.jpeg",
      "https://images.pexels.com/photos/2010812/pexels-photo-2010812.jpeg",
      "https://images.pexels.com/photos/2233703/pexels-photo-2233703.jpeg",
      "https://images.pexels.com/photos/2065195/pexels-photo-2065195.jpeg",
      "https://images.pexels.com/photos/3363204/pexels-photo-3363204.jpeg"
    ],
    "description": "A compact fashion tee with a close shape, clean neckline, and polished casual finish.",
    "fabric": "Stretch cotton rib with soft recovery.",
    "care": "Machine wash cold. Lay flat to dry."
  },
  {
    "id": "prd-015",
    "slug": "light-blue-straight-jean",
    "name": "Light Blue Straight Jean",
    "category": "Pants",
    "collection": "soft-tailoring",
    "price": 295,
    "rating": 4.6,
    "reviews": 44,
    "stock": 44,
    "colors": [
      "Light Blue",
      "Indigo",
      "Black"
    ],
    "sizes": [
      "28",
      "30",
      "32",
      "34"
    ],
    "featured": false,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://images.pexels.com/photos/2010812/pexels-photo-2010812.jpeg",
      "https://images.pexels.com/photos/2233703/pexels-photo-2233703.jpeg",
      "https://images.pexels.com/photos/2065195/pexels-photo-2065195.jpeg",
      "https://images.pexels.com/photos/3363204/pexels-photo-3363204.jpeg",
      "https://images.pexels.com/photos/3672825/pexels-photo-3672825.jpeg"
    ],
    "description": "A straight-leg jean in soft light blue denim with a flattering mid-rise and clean ankle break.",
    "fabric": "Cotton denim with comfort stretch.",
    "care": "Wash inside out cold. Line dry."
  },
  {
    "id": "prd-016",
    "slug": "full-skirt-set",
    "name": "Full Skirt Set",
    "category": "Skirts",
    "collection": "evening-edit",
    "price": 560,
    "rating": 4.9,
    "reviews": 20,
    "stock": 20,
    "colors": [
      "Ivory",
      "Black",
      "Blush"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L"
    ],
    "featured": true,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://images.pexels.com/photos/2233703/pexels-photo-2233703.jpeg",
      "https://images.pexels.com/photos/2065195/pexels-photo-2065195.jpeg",
      "https://images.pexels.com/photos/3363204/pexels-photo-3363204.jpeg",
      "https://images.pexels.com/photos/3672825/pexels-photo-3672825.jpeg",
      "https://images.pexels.com/photos/2738792/pexels-photo-2738792.jpeg"
    ],
    "description": "A full skirt set with a defined waist, soft volume, and a feminine occasionwear finish.",
    "fabric": "Textured woven set with lightweight lining.",
    "care": "Dry clean only."
  },
  {
    "id": "prd-017",
    "slug": "black-essential-tee",
    "name": "Black Essential Tee",
    "category": "Tops",
    "collection": "soft-tailoring",
    "price": 120,
    "rating": 4.3,
    "reviews": 60,
    "stock": 60,
    "colors": [
      "Black",
      "White",
      "Taupe"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "featured": false,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://images.pexels.com/photos/2065195/pexels-photo-2065195.jpeg",
      "https://images.pexels.com/photos/3363204/pexels-photo-3363204.jpeg",
      "https://images.pexels.com/photos/3672825/pexels-photo-3672825.jpeg",
      "https://images.pexels.com/photos/2738792/pexels-photo-2738792.jpeg",
      "https://images.pexels.com/photos/2010925/pexels-photo-2010925.jpeg"
    ],
    "description": "A black essential tee with a neat feminine shape and soft everyday comfort.",
    "fabric": "Combed cotton jersey with light elastane.",
    "care": "Machine wash cold. Tumble low."
  },
  {
    "id": "prd-018",
    "slug": "red-velvet-gown",
    "name": "Red Velvet Gown",
    "category": "Dresses",
    "collection": "evening-edit",
    "price": 640,
    "rating": 4.8,
    "reviews": 15,
    "stock": 18,
    "colors": [
      "Red",
      "Black",
      "Plum"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L"
    ],
    "featured": true,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://images.pexels.com/photos/3363204/pexels-photo-3363204.jpeg",
      "https://images.pexels.com/photos/3672825/pexels-photo-3672825.jpeg",
      "https://images.pexels.com/photos/2738792/pexels-photo-2738792.jpeg",
      "https://images.pexels.com/photos/2010925/pexels-photo-2010925.jpeg",
      "https://images.pexels.com/photos/3054973/pexels-photo-3054973.jpeg"
    ],
    "description": "A red velvet gown with a fluid fall, evening drama, and a soft luminous surface.",
    "fabric": "Stretch velvet with smooth lining and concealed back zip.",
    "care": "Dry clean only."
  },
  {
    "id": "prd-019",
    "slug": "pink-midi-dress",
    "name": "Pink Midi Dress",
    "category": "Dresses",
    "collection": "evening-edit",
    "price": 345,
    "rating": 4.7,
    "reviews": 26,
    "stock": 26,
    "colors": [
      "Pink",
      "Rose",
      "Pearl"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L"
    ],
    "featured": false,
    "bestSeller": true,
    "newArrival": false,
    "images": [
      "https://images.pexels.com/photos/3672825/pexels-photo-3672825.jpeg",
      "https://images.pexels.com/photos/2738792/pexels-photo-2738792.jpeg",
      "https://images.pexels.com/photos/2010925/pexels-photo-2010925.jpeg",
      "https://images.pexels.com/photos/3054973/pexels-photo-3054973.jpeg",
      "https://images.pexels.com/photos/2693849/pexels-photo-2693849.jpeg"
    ],
    "description": "A pink midi dress with a graceful line, soft movement, and easy occasion polish.",
    "fabric": "Lightweight woven blend with gentle drape.",
    "care": "Cold hand wash or dry clean."
  },
  {
    "id": "prd-020",
    "slug": "black-top-straight-jean-set",
    "name": "Black Top Straight Jean Set",
    "category": "Pants",
    "collection": "soft-tailoring",
    "price": 390,
    "rating": 4.7,
    "reviews": 35,
    "stock": 35,
    "colors": [
      "Black",
      "Indigo",
      "White"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L"
    ],
    "featured": false,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://images.pexels.com/photos/2010925/pexels-photo-2010925.jpeg",
      "https://images.pexels.com/photos/3054973/pexels-photo-3054973.jpeg",
      "https://images.pexels.com/photos/2693849/pexels-photo-2693849.jpeg",
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/1.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/2.webp"
    ],
    "description": "A black top and straight jean set designed as an effortless complete look for casual evenings.",
    "fabric": "Stretch denim paired with soft rib knit.",
    "care": "Wash denim separately. Cold wash top."
  },
  {
    "id": "prd-021",
    "slug": "light-blue-fashion-jean",
    "name": "Light Blue Fashion Jean",
    "category": "Pants",
    "collection": "soft-tailoring",
    "price": 310,
    "rating": 4.6,
    "reviews": 42,
    "stock": 42,
    "colors": [
      "Light Blue",
      "Indigo",
      "Stone"
    ],
    "sizes": [
      "28",
      "30",
      "32"
    ],
    "featured": false,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://images.pexels.com/photos/3054973/pexels-photo-3054973.jpeg",
      "https://images.pexels.com/photos/2693849/pexels-photo-2693849.jpeg",
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/1.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/2.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/3.webp"
    ],
    "description": "A light blue fashion jean with a clean waist, soft leg shape, and polished weekend finish.",
    "fabric": "Washed cotton denim with comfort stretch.",
    "care": "Machine wash cold inside out."
  },
  {
    "id": "prd-022",
    "slug": "light-layered-top",
    "name": "Light Layered Top",
    "category": "Tops",
    "collection": "city-layers",
    "price": 210,
    "rating": 4.5,
    "reviews": 46,
    "stock": 46,
    "colors": [
      "Cream",
      "White",
      "Sage"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L"
    ],
    "featured": false,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://images.pexels.com/photos/2693849/pexels-photo-2693849.jpeg",
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/1.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/2.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/3.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/4.webp"
    ],
    "description": "A light layered top with soft transparency, delicate proportion, and an elegant day-to-night feel.",
    "fabric": "Airy woven blend over a soft inner camisole.",
    "care": "Hand wash cold. Hang to dry."
  },
  {
    "id": "prd-023",
    "slug": "khaki-straight-jean",
    "name": "Khaki Straight Jean",
    "category": "Pants",
    "collection": "soft-tailoring",
    "price": 320,
    "rating": 4.6,
    "reviews": 38,
    "stock": 38,
    "colors": [
      "Khaki",
      "Olive",
      "Black"
    ],
    "sizes": [
      "28",
      "30",
      "32",
      "34"
    ],
    "featured": false,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/1.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/2.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/3.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/4.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/corset-leather-with-skirt/1.webp"
    ],
    "description": "A khaki straight jean with a clean waist and a warmer neutral tone for refined casual dressing.",
    "fabric": "Cotton twill denim with soft stretch.",
    "care": "Machine wash cold. Line dry."
  },
  {
    "id": "prd-024",
    "slug": "black-full-sleeve-top",
    "name": "Black Full Sleeve Top",
    "category": "Tops",
    "collection": "city-layers",
    "price": 240,
    "rating": 4.5,
    "reviews": 40,
    "stock": 40,
    "colors": [
      "Black",
      "Pearl",
      "Espresso"
    ],
    "sizes": [
      "XS",
      "S",
      "M",
      "L"
    ],
    "featured": false,
    "bestSeller": false,
    "newArrival": false,
    "images": [
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/2.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/3.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/4.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/corset-leather-with-skirt/1.webp",
      "https://cdn.dummyjson.com/product-images/womens-dresses/corset-leather-with-skirt/2.webp"
    ],
    "description": "A black full sleeve top with a smooth fit, elegant coverage, and a refined tucked-in line.",
    "fabric": "Soft jersey knit with stretch recovery.",
    "care": "Machine wash cold. Lay flat to dry."
  }
];

export const categories = ["Tops", "Sports Bras", "Jackets", "Leggings", "Accessories"];

export const categoryDescriptions: Record<string, string> = {
  Tops: "Breathable tanks, tees, and studio layers designed to move from training to the rest of your day.",
  "Sports Bras": "Supportive, sculpting sports bras for Pilates, yoga, tennis, and higher-impact sessions.",
  Jackets: "Lightweight performance layers and polished warm-ups for courts, commutes, and cool studios.",
  Leggings: "Second-skin leggings with confident coverage, soft compression, and all-day comfort.",
  Accessories: "Purposeful finishing pieces for studio sessions, active days, and everyday movement.",
};

export const collections: Collection[] = [
  {
    slug: "pilates-studio",
    name: "Pilates Studio",
    summary: "Soft-touch sets and elegant layers made for low-impact movement and the moments after class.",
    image: "/images/campaign/campaign-reformer.webp",
  },
  {
    slug: "court-club",
    name: "Court Club",
    summary: "Breathable support, polished warm-ups, and accessories designed for tennis days.",
    image: "/images/campaign/campaign-tennis.webp",
  },
  {
    slug: "everyday-motion",
    name: "Everyday Motion",
    summary: "Versatile active essentials that feel considered from the morning walk to casual plans.",
    image: "/images/campaign/campaign-street.webp",
  },
  {
    slug: "training-core",
    name: "Training Core",
    summary: "Sculpting support and breathable performance pieces for focused workouts and active days.",
    image: "/images/campaign/hero-track.webp",
  },
];

const activewearImages = {
  studio: ["/images/campaign/campaign-reformer.webp", "/images/campaign/bra-longline-espresso.webp", "/images/campaign/tank-oat-front.webp"],
  court: ["/images/campaign/campaign-tennis.webp", "/images/campaign/jacket-ivory-court.webp", "/images/campaign/bra-sage-front.webp"],
  everyday: ["/images/campaign/campaign-street.webp", "/images/campaign/tank-oat-sage.webp", "/images/campaign/jacket-stone-zip.webp"],
  training: ["/images/campaign/hero-track.webp", "/images/campaign/legging-sage-set.webp", "/images/campaign/bra-oat-front.webp"],
} as const;

type ActiveProductInput = Pick<Product, "id" | "slug" | "name" | "category" | "collection" | "price" | "colors" | "sizes" | "description" | "fabric"> &
  Partial<Pick<Product, "salePrice" | "badge" | "featured" | "bestSeller" | "newArrival" | "fitSummary" | "sizeAdvice">> & {
    imageSet: keyof typeof activewearImages;
    photos?: string[];
    videos?: Record<string, string>;
    tags: string[];
  };

function activeProduct(input: ActiveProductInput): Product {
  return {
    ...input,
    collections: [input.collection],
    rating: 4.7,
    reviews: 32,
    stock: input.sizes.includes("One Size") ? 28 : 48,
    images: input.photos ? [...input.photos] : [...activewearImages[input.imageSet]],
    hoverImage: input.photos ? input.photos[1] : activewearImages[input.imageSet][1],
    variantMediaByColor: input.videos
      ? Object.fromEntries(
          Object.entries(input.videos).map(([color, url]) => [
            color,
            [
              ...(input.photos ?? activewearImages[input.imageSet]).map((image, index) => ({ type: "IMAGE" as const, url: image, sortOrder: index, isHoverImage: index === 1 })),
              { type: "VIDEO" as const, url, sortOrder: 9, isHoverImage: false },
            ],
          ]),
        )
      : undefined,
    care: "Machine wash cold with similar colours. Do not tumble dry. Do not use fabric softener.",
    colorHex: { Black: "#171717", Espresso: "#352822", Oat: "#ded0bb", Sage: "#81917b", Navy: "#26344d", White: "#f4f2ed", Rose: "#cda8aa", "Light Blue": "#a9cddd" },
    fitSummary: input.fitSummary ?? "Designed for a close, supportive fit with four-way stretch.",
    sizeAdvice: input.sizeAdvice ?? "Choose your usual size. Size up if you prefer a more relaxed feel.",
    updatedAt: "2026-08-22T00:00:00.000Z",
  };
}

export const products: Product[] = [
  activeProduct({ id: "aw-001", slug: "studio-longline-bra", photos: ["/images/campaign/bra-longline-espresso.webp", "/images/campaign/bra-longline-espresso-side.webp", "/images/campaign/campaign-reformer.webp"], name: "Studio Longline Bra", category: "Sports Bras", collection: "pilates-studio", price: 245, colors: ["Black", "Rose", "Oat"], sizes: ["XS", "S", "M", "L", "XL"], imageSet: "studio", tags: ["Pilates", "Yoga", "Low impact", "Removable cups"], featured: true, bestSeller: true, badge: "Best seller", description: "A softly sculpting longline bra with a clean neckline and comfortable underband for Pilates, yoga, and everyday layering.", fabric: "Buttery-soft recycled nylon blend with four-way stretch and moisture management." }),
  activeProduct({ id: "aw-002", slug: "court-support-bra", photos: ["/images/campaign/bra-sage-front.webp", "/images/campaign/bra-sage-back.webp", "/images/campaign/campaign-sage-portrait.webp"], name: "Court Support Bra", category: "Sports Bras", collection: "court-club", price: 275, colors: ["White", "Navy", "Light Blue"], sizes: ["XS", "S", "M", "L", "XL"], imageSet: "court", tags: ["Tennis", "Medium support", "Breathable"], newArrival: true, description: "Medium support with a secure racerback and breathable panels, refined for training sessions and long afternoons on court.", fabric: "Smooth performance jersey with mesh ventilation and quick-dry finish." }),
  activeProduct({ id: "aw-003", slug: "flow-crossback-bra", photos: ["/images/campaign/bra-clay-back.webp", "/images/campaign/bra-clay-front.webp", "/images/campaign/campaign-yoga.webp"], name: "Flow Crossback Bra", category: "Sports Bras", collection: "pilates-studio", price: 225, colors: ["Sage", "Black", "Oat"], sizes: ["XS", "S", "M", "L"], imageSet: "studio", tags: ["Yoga", "Pilates", "Light support"], description: "A light-support crossback silhouette with minimal seams for unrestricted movement and an elegant studio look.", fabric: "Peached stretch jersey with breathable lining." }),
  activeProduct({ id: "aw-004", slug: "tempo-high-support-bra", photos: ["/images/campaign/bra-oat-front.webp", "/images/campaign/bra-oat-side.webp", "/images/campaign/tank-oat-detail.webp"], name: "Tempo High-Support Bra", category: "Sports Bras", collection: "training-core", price: 295, colors: ["Black", "Navy", "Rose"], sizes: ["XS", "S", "M", "L", "XL"], imageSet: "training", tags: ["Training", "High support", "Adjustable"], description: "High-support performance with adjustable straps and a supportive underband for confident, focused workouts.", fabric: "Compressive recycled performance knit with ventilated back panel." }),
  activeProduct({ id: "aw-005", slug: "sculpt-7-8-legging", photos: ["/images/campaign/legging-sage-set.webp", "/images/campaign/legging-sage-back-walk.webp", "/images/campaign/legging-sage-78.webp"], name: "Sculpt 7/8 Legging", category: "Leggings", collection: "training-core", price: 340, colors: ["Black", "Espresso", "Sage"], sizes: ["XS", "S", "M", "L", "XL"], imageSet: "training", tags: ["Training", "Sculpting", "Squat proof"], featured: true, bestSeller: true, badge: "Best seller", description: "Our signature 7/8 legging balances smooth compression, dependable coverage, and a high waist that stays in place.", fabric: "Dense four-way stretch knit with sweat-wicking finish and soft matte handfeel." }),
  activeProduct({ id: "aw-006", slug: "align-flare-legging", photos: ["/images/campaign/legging-flare-stone.webp", "/images/campaign/legging-espresso-back.webp", "/images/campaign/bra-longline-espresso-side.webp"], name: "Align Flare Legging", category: "Leggings", collection: "everyday-motion", price: 365, colors: ["Black", "Espresso", "Navy"], sizes: ["XS", "S", "M", "L", "XL"], imageSet: "everyday", tags: ["Everyday", "Pilates", "Flare"], newArrival: true, description: "A softly flared studio legging with a clean high rise, made to move easily into everyday plans.", fabric: "Soft-touch stretch jersey with resilient shape recovery." }),
  activeProduct({ id: "aw-007", slug: "core-pocket-legging", photos: ["/images/campaign/legging-pocket-espresso.webp", "/images/campaign/legging-espresso-back.webp", "/images/campaign/bra-longline-espresso.webp"], name: "Core Pocket Legging", category: "Leggings", collection: "training-core", price: 355, colors: ["Black", "Navy", "Rose"], sizes: ["XS", "S", "M", "L", "XL"], imageSet: "training", tags: ["Training", "Pocket", "Full length"], description: "A full-length training legging with discreet side pockets, sculpting support, and a no-slip waistband.", fabric: "Moisture-wicking interlock with four-way stretch and matte finish." }),
  activeProduct({ id: "aw-008", slug: "airlift-full-length-legging", photos: ["/images/campaign/legging-navy-full.webp", "/images/campaign/legging-sage-back.webp", "/images/campaign/legging-flare-stone.webp"], name: "Airlift Full-Length Legging", category: "Leggings", collection: "pilates-studio", price: 325, colors: ["Light Blue", "Black", "Oat"], sizes: ["XS", "S", "M", "L"], imageSet: "studio", tags: ["Yoga", "Pilates", "Soft touch"], description: "Lightweight full-length leggings with a barely-there feel for yoga flows, Pilates, and recovery days.", fabric: "Ultra-soft recycled nylon jersey with gentle compression." }),
  activeProduct({ id: "aw-009", slug: "motion-rib-tank", photos: ["/images/campaign/tank-oat-front.webp", "/images/campaign/tank-oat-detail.webp", "/images/campaign/tank-oat-sage.webp"], name: "Motion Rib Tank", category: "Tops", collection: "everyday-motion", price: 195, colors: ["White", "Black", "Oat"], sizes: ["XS", "S", "M", "L", "XL"], imageSet: "everyday", tags: ["Everyday", "Layering", "Rib"], bestSeller: true, description: "A fitted rib tank with a polished neckline, comfortable enough for movement and clean enough for casual outings.", fabric: "Breathable stretch rib with a soft cotton handfeel." }),
  activeProduct({ id: "aw-010", slug: "studio-wrap-top", videos: { Rose: "/images/admin/products/1787486514684-4eebe8c7-0836-4b53-8edd-232f90969755.mp4" }, photos: ["/images/campaign/wrap-clay-front.webp", "/images/campaign/wrap-clay-alt.webp", "/images/campaign/bra-clay-front.webp"], name: "Studio Wrap Top", category: "Tops", collection: "pilates-studio", price: 260, colors: ["Oat", "Black", "Rose"], sizes: ["XS", "S", "M", "L"], imageSet: "studio", tags: ["Pilates", "Yoga", "Layering"], featured: true, description: "An elegant wrap layer with slim sleeves and adjustable coverage for warm-ups, cool-downs, and coffee after class.", fabric: "Lightweight modal-rich jersey with comfortable stretch." }),
  activeProduct({ id: "aw-011", slug: "court-breathe-tee", photos: ["/images/campaign/tee-ivory.webp", "/images/campaign/tank-oat-detail.webp", "/images/campaign/campaign-tennis.webp"], name: "Court Breathe Tee", category: "Tops", collection: "court-club", price: 215, colors: ["White", "Light Blue", "Navy"], sizes: ["XS", "S", "M", "L", "XL"], imageSet: "court", tags: ["Tennis", "Quick dry", "Breathable"], description: "A clean performance tee with laser-cut ventilation and an easy shape for training or match days.", fabric: "Featherweight quick-dry jersey with bonded seams." }),
  activeProduct({ id: "aw-012", slug: "transit-zip-jacket", photos: ["/images/campaign/jacket-stone-zip.webp", "/images/campaign/jacket-stone-hood.webp", "/images/campaign/campaign-street.webp"], name: "Transit Zip Jacket", category: "Jackets", collection: "everyday-motion", price: 465, colors: ["Black", "Espresso", "Sage"], sizes: ["XS", "S", "M", "L", "XL"], imageSet: "everyday", tags: ["Everyday", "Commute", "Lightweight"], bestSeller: true, description: "A streamlined zip jacket with a flattering seam line and useful pockets for commutes, warm-ups, and everyday wear.", fabric: "Smooth double-knit performance fabric with soft brushed interior." }),
  activeProduct({ id: "aw-013", slug: "court-warm-up-jacket", photos: ["/images/campaign/jacket-ivory-court.webp", "/images/campaign/jacket-stone-zip.webp", "/images/campaign/campaign-tennis.webp"], name: "Court Warm-Up Jacket", category: "Jackets", collection: "court-club", price: 495, colors: ["White", "Navy", "Light Blue"], sizes: ["XS", "S", "M", "L"], imageSet: "court", tags: ["Tennis", "Warm up", "Wind resistant"], newArrival: true, description: "A lightweight court layer with a high collar and breathable back vent, cut for effortless movement.", fabric: "Wind-resistant woven shell with moisture-wicking mesh lining." }),
  activeProduct({ id: "aw-014", slug: "cloud-studio-layer", photos: ["/images/campaign/layer-oat-cloud.webp", "/images/campaign/tank-oat-front.webp", "/images/campaign/campaign-reformer.webp"], name: "Cloud Studio Layer", category: "Jackets", collection: "pilates-studio", price: 440, colors: ["Oat", "Rose", "Black"], sizes: ["XS", "S", "M", "L", "XL"], imageSet: "studio", tags: ["Pilates", "Yoga", "Soft layer"], description: "A softly structured studio jacket with a cropped proportion and relaxed sleeves for comfortable layering.", fabric: "Plush recycled spacer knit with breathable stretch." }),
  activeProduct({ id: "aw-015", slug: "studio-carryall-tote", photos: ["/images/campaign/tote-sage-carry.webp", "/images/campaign/accessories-still.webp", "/images/campaign/campaign-street.webp"], name: "Studio Carryall Tote", category: "Accessories", collection: "everyday-motion", price: 285, colors: ["Black", "Oat"], sizes: ["One Size"], imageSet: "everyday", tags: ["Studio", "Everyday", "Bag"], featured: true, description: "A spacious, refined tote with an interior bottle sleeve, zipped pocket, and room for a light studio layer.", fabric: "Durable recycled woven fabric with wipe-clean lining.", fitSummary: "One size with adjustable shoulder strap.", sizeAdvice: "Fits a change of clothes, bottle, small towel, and daily essentials." }),
  activeProduct({ id: "aw-016", slug: "studio-grip-socks", photos: ["/images/campaign/socks-grip.webp", "/images/campaign/accessories-still.webp", "/images/campaign/campaign-reformer.webp"], name: "Studio Grip Socks", category: "Accessories", collection: "pilates-studio", price: 75, colors: ["Black", "Oat", "Rose"], sizes: ["S", "M", "L"], imageSet: "studio", tags: ["Pilates", "Yoga", "Grip"], description: "Soft studio socks with targeted arch support and silicone grip for controlled movement on the reformer or mat.", fabric: "Breathable combed cotton blend with stretch and silicone sole grip." }),
  activeProduct({ id: "aw-017", slug: "court-cap", photos: ["/images/campaign/cap-oat.webp", "/images/campaign/accessories-still.webp", "/images/campaign/campaign-tennis.webp"], name: "Court Cap", category: "Accessories", collection: "court-club", price: 135, colors: ["White", "Navy", "Light Blue"], sizes: ["One Size"], imageSet: "court", tags: ["Tennis", "Sun protection", "Adjustable"], newArrival: true, description: "A lightweight performance cap with a curved peak, breathable panels, and an adjustable back closure.", fabric: "Quick-dry recycled woven fabric with soft internal sweatband.", fitSummary: "Adjustable unisex fit.", sizeAdvice: "One size with adjustable rear closure." }),
  activeProduct({ id: "aw-018", slug: "insulated-movement-bottle", photos: ["/images/campaign/bottle-sand.webp", "/images/campaign/accessories-still.webp", "/images/campaign/campaign-yoga.webp"], name: "Insulated Movement Bottle", category: "Accessories", collection: "training-core", price: 145, colors: ["Black", "White", "Sage"], sizes: ["One Size"], imageSet: "training", tags: ["Training", "Everyday", "750ml"], description: "A clean 750ml insulated bottle that keeps drinks cold through training sessions, commutes, and active days.", fabric: "Double-wall stainless steel with BPA-free leak-resistant lid.", fitSummary: "750ml capacity; fits standard cup holders.", sizeAdvice: "One size." }),
];

export const policyPages = {
  shipping: {
    title: "Shipping",
    body: "Complimentary standard delivery above AED 300 where eligible. Delivery estimates and available courier options are confirmed at checkout.",
  },
  returns: {
    title: "Returns + Exchanges",
    body: "Full-price pieces can be returned within 14 days when unworn, unwashed, and tagged. Exchange options are shown by order and subject to stock availability.",
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
