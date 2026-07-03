import { products } from "./catalog";

export const adminMetrics = [
  { label: "Gross revenue", value: "AED 126,840", delta: "+18.2%", tone: "up", helper: "Before discounts and refunds" },
  { label: "Net revenue", value: "AED 118,210", delta: "+14.8%", tone: "up", helper: "After AED 8,630 adjustments" },
  { label: "Orders", value: "384", delta: "+32", tone: "up", helper: "54 awaiting fulfillment" },
  { label: "Average order value", value: "AED 330", delta: "+7.1%", tone: "up", helper: "Driven by bundles" },
  { label: "Conversion rate", value: "3.8%", delta: "-0.4%", tone: "down", helper: "Cart exits increased" },
  { label: "Low stock alerts", value: "3", delta: "Review", tone: "warn", helper: "2 best sellers at risk" },
];

export const adminOrders = [
  {
    id: "VL-1048",
    customer: "Maya Haddad",
    email: "maya@example.com",
    phone: "+971 50 123 4412",
    total: "AED 760",
    status: "Processing",
    payment: "Paid",
    shipping: "Ready to ship",
    notes: "Gift wrap requested",
  },
  {
    id: "VL-1047",
    customer: "Sara Al Nuaimi",
    email: "sara@example.com",
    phone: "+971 55 880 9931",
    total: "AED 340",
    status: "Shipped",
    payment: "Paid",
    shipping: "DHL tracking added",
    notes: "VIP customer",
  },
  {
    id: "VL-1046",
    customer: "Nadine Karim",
    email: "nadine@example.com",
    phone: "+971 52 777 1600",
    total: "AED 1,125",
    status: "Refund review",
    payment: "Partial refund",
    shipping: "Delivered",
    notes: "Size exchange",
  },
  {
    id: "VL-1045",
    customer: "Reem Al Mansoori",
    email: "reem@example.com",
    phone: "+971 54 312 8840",
    total: "AED 490",
    status: "Shipped",
    payment: "Paid",
    shipping: "Aramex en route",
    notes: "—",
  },
  {
    id: "VL-1044",
    customer: "Hessa Al Khoori",
    email: "hessa@example.com",
    phone: "+971 56 441 0072",
    total: "AED 890",
    status: "Delivered",
    payment: "Paid",
    shipping: "Delivered May 22",
    notes: "Birthday gift",
  },
  {
    id: "VL-1043",
    customer: "Amira Bakr",
    email: "amira@example.com",
    phone: "+971 50 880 4391",
    total: "AED 620",
    status: "Processing",
    payment: "Paid",
    shipping: "Label created",
    notes: "—",
  },
  {
    id: "VL-1042",
    customer: "Farah Nassar",
    email: "farah@example.com",
    phone: "+971 55 221 6600",
    total: "AED 340",
    status: "Cancelled",
    payment: "Refunded",
    shipping: "n/a",
    notes: "Customer cancelled within 1hr",
  },
  {
    id: "VL-1041",
    customer: "Layla Hassan",
    email: "layla@example.com",
    phone: "+971 52 990 3341",
    total: "AED 1,480",
    status: "Shipped",
    payment: "Paid",
    shipping: "DHL express",
    notes: "3-item bundle",
  },
  {
    id: "VL-1040",
    customer: "Nour Abdallah",
    email: "nour@example.com",
    phone: "+971 50 114 2980",
    total: "AED 270",
    status: "Delivered",
    payment: "Paid",
    shipping: "Delivered May 20",
    notes: "—",
  },
  {
    id: "VL-1039",
    customer: "Dana Khalil",
    email: "dana@example.com",
    phone: "+971 56 880 1194",
    total: "AED 760",
    status: "Refund review",
    payment: "Partial refund",
    shipping: "Return in transit",
    notes: "Wrong size",
  },
];

export const adminCustomers = [
  { name: "Mona Ibrahim", email: "mona@example.com", orders: 12, ltv: "AED 8,640", tags: ["VIP", "Dubai"], address: "Jumeirah Village Circle" },
  { name: "Nadine Karim", email: "nadine@example.com", orders: 11, ltv: "AED 7,460", tags: ["Returns risk"], address: "Jumeirah" },
  { name: "Layla Hassan", email: "layla@example.com", orders: 9, ltv: "AED 6,140", tags: ["VIP", "Dubai"], address: "Palm Jumeirah" },
  { name: "Maya Haddad", email: "maya@example.com", orders: 8, ltv: "AED 4,820", tags: ["VIP", "Dubai"], address: "Dubai Marina" },
  { name: "Salma Yousuf", email: "salma@example.com", orders: 7, ltv: "AED 3,980", tags: ["VIP", "Sharjah"], address: "Al Nahda" },
  { name: "Hessa Al Khoori", email: "hessa@example.com", orders: 6, ltv: "AED 3,280", tags: ["VIP", "Dubai"], address: "Arabian Ranches" },
  { name: "Nour Abdallah", email: "nour@example.com", orders: 5, ltv: "AED 2,820", tags: ["Dubai"], address: "Downtown Dubai" },
  { name: "Sara Al Nuaimi", email: "sara@example.com", orders: 4, ltv: "AED 2,190", tags: ["Abu Dhabi"], address: "Al Reem Island" },
  { name: "Dana Khalil", email: "dana@example.com", orders: 4, ltv: "AED 2,190", tags: ["Returns risk"], address: "Dubai Marina" },
  { name: "Reem Al Mansoori", email: "reem@example.com", orders: 3, ltv: "AED 1,640", tags: ["Abu Dhabi"], address: "Khalifa City" },
  { name: "Amira Bakr", email: "amira@example.com", orders: 2, ltv: "AED 1,200", tags: ["Dubai"], address: "Business Bay" },
  { name: "Farah Nassar", email: "farah@example.com", orders: 1, ltv: "AED 340", tags: ["Returns risk"], address: "Sharjah" },
];

export const adminCoupons = [
  { code: "VELORA30", type: "Percentage", value: "30%", expiry: "2026-07-01", usage: "84 / 500" },
  { code: "UAEFREE", type: "Free shipping", value: "AED 0 delivery", expiry: "2026-06-15", usage: "41 / 200" },
  { code: "WELCOME75", type: "Fixed", value: "AED 75", expiry: "2026-08-31", usage: "118 / 1000" },
  { code: "SUMMER20", type: "Percentage", value: "20%", expiry: "2026-09-30", usage: "62 / 300" },
  { code: "STUDIO50", type: "Fixed", value: "AED 50", expiry: "2026-06-30", usage: "29 / 150" },
];

export const homepageSections = [
  "Hero drop",
  "Shop by category",
  "Best sellers",
  "Collection panels",
  "Fit system",
  "Trust modules",
];

export const activityLogs = [
  { user: "Super admin", action: "Published Mira Wrap Jacket", time: "12 min ago" },
  { user: "Content editor", action: "Updated homepage hero banner", time: "38 min ago" },
  { user: "Manager", action: "Changed order VL-1048 to Processing", time: "1 hr ago" },
  { user: "Support", action: "Added note to Nadine Karim profile", time: "2 hrs ago" },
  { user: "Manager", action: "Exported orders CSV (384 rows)", time: "3 hrs ago" },
  { user: "Support", action: "Closed refund request VL-1046", time: "4 hrs ago" },
  { user: "Super admin", action: "Created coupon SUMMER20", time: "6 hrs ago" },
  { user: "Content editor", action: "Scheduled Selene Pant for Jun 2", time: "Yesterday" },
];

export const revenueTimeline = [
  { label: "Mon", revenue: 14800, orders: 42, visitors: 1860 },
  { label: "Tue", revenue: 17320, orders: 51, visitors: 2110 },
  { label: "Wed", revenue: 15940, orders: 47, visitors: 2040 },
  { label: "Thu", revenue: 21280, orders: 66, visitors: 2450 },
  { label: "Fri", revenue: 28600, orders: 81, visitors: 2980 },
  { label: "Sat", revenue: 24970, orders: 74, visitors: 2740 },
  { label: "Sun", revenue: 23110, orders: 68, visitors: 2520 },
];

export const adminRangeSnapshots = {
  Today: {
    label: "Today",
    period: "May 26, 2026",
    metrics: [
      { label: "Gross revenue", value: "AED 4,920", delta: "+6.4%", tone: "up", helper: "AED 1,180 from email flows" },
      { label: "Net revenue", value: "AED 4,510", delta: "+4.8%", tone: "up", helper: "After AED 410 adjustments" },
      { label: "Orders", value: "18", delta: "+5", tone: "up", helper: "9 awaiting fulfillment" },
      { label: "Average order value", value: "AED 273", delta: "-3.2%", tone: "down", helper: "More single-item baskets" },
      { label: "Conversion rate", value: "3.1%", delta: "-0.8%", tone: "down", helper: "Checkout exits above target" },
      { label: "Low stock alerts", value: "3", delta: "Review", tone: "warn", helper: "Aura black medium is critical" },
    ],
    timeline: [
      { label: "8a", revenue: 420, orders: 2, visitors: 180 },
      { label: "10a", revenue: 680, orders: 3, visitors: 260 },
      { label: "12p", revenue: 910, orders: 4, visitors: 320 },
      { label: "2p", revenue: 760, orders: 3, visitors: 280 },
      { label: "4p", revenue: 1120, orders: 4, visitors: 390 },
      { label: "6p", revenue: 650, orders: 1, visitors: 240 },
      { label: "8p", revenue: 380, orders: 1, visitors: 170 },
    ],
    funnel: [
      { label: "Store sessions", value: 1580, rate: "100%" },
      { label: "Product views", value: 830, rate: "52.5%" },
      { label: "Added to cart", value: 112, rate: "13.5%" },
      { label: "Checkout started", value: 61, rate: "54.5%" },
      { label: "Orders placed", value: 18, rate: "29.5%" },
    ],
    queue: [
      { label: "Orders need fulfillment", value: 9, priority: "High", detail: "6 paid orders before 4 PM cutoff" },
      { label: "Refunds awaiting review", value: 2, priority: "Medium", detail: "AED 640 pending approval" },
      { label: "Abandoned carts recoverable", value: 14, priority: "High", detail: "AED 3,180 estimated cart value" },
      { label: "Product drafts scheduled", value: 1, priority: "Low", detail: "One accessory drop needs SEO review" },
    ],
  },
  Week: {
    label: "Week",
    period: "May 20 - May 26, 2026",
    metrics: adminMetrics,
    timeline: revenueTimeline,
    funnel: [
      { label: "Store sessions", value: 16700, rate: "100%" },
      { label: "Product views", value: 9400, rate: "56.3%" },
      { label: "Added to cart", value: 1420, rate: "15.1%" },
      { label: "Checkout started", value: 870, rate: "61.3%" },
      { label: "Orders placed", value: 384, rate: "44.1%" },
    ],
    queue: [
      { label: "Orders need fulfillment", value: 54, priority: "High", detail: "18 paid express orders before 4 PM cutoff" },
      { label: "Refunds awaiting review", value: 7, priority: "Medium", detail: "AED 2,860 pending approval" },
      { label: "Abandoned carts recoverable", value: 76, priority: "High", detail: "AED 19,420 estimated cart value" },
      { label: "Product drafts scheduled", value: 5, priority: "Low", detail: "Next drop queued for Jun 2, 2026" },
    ],
  },
  Month: {
    label: "Month",
    period: "May 2026",
    metrics: [
      { label: "Gross revenue", value: "AED 438,200", delta: "+21.7%", tone: "up", helper: "Best month this quarter" },
      { label: "Net revenue", value: "AED 409,680", delta: "+18.9%", tone: "up", helper: "Refund rate down 1.2%" },
      { label: "Orders", value: "1,326", delta: "+184", tone: "up", helper: "212 awaiting fulfillment" },
      { label: "Average order value", value: "AED 331", delta: "+5.6%", tone: "up", helper: "Bundles and upsells rising" },
      { label: "Conversion rate", value: "3.6%", delta: "+0.2%", tone: "up", helper: "Product pages improved" },
      { label: "Low stock alerts", value: "8", delta: "Review", tone: "warn", helper: "5 alerts tied to best sellers" },
    ],
    timeline: [
      { label: "W1", revenue: 82400, orders: 248, visitors: 11200 },
      { label: "W2", revenue: 96300, orders: 294, visitors: 12900 },
      { label: "W3", revenue: 118900, orders: 361, visitors: 15100 },
      { label: "W4", revenue: 140600, orders: 423, visitors: 17800 },
    ],
    funnel: [
      { label: "Store sessions", value: 57000, rate: "100%" },
      { label: "Product views", value: 32800, rate: "57.5%" },
      { label: "Added to cart", value: 5120, rate: "15.6%" },
      { label: "Checkout started", value: 3010, rate: "58.8%" },
      { label: "Orders placed", value: 1326, rate: "44.1%" },
    ],
    queue: [
      { label: "Orders need fulfillment", value: 212, priority: "High", detail: "62 express orders need staffing coverage" },
      { label: "Refunds awaiting review", value: 19, priority: "Medium", detail: "AED 9,420 pending approval" },
      { label: "Abandoned carts recoverable", value: 314, priority: "High", detail: "AED 81,900 estimated cart value" },
      { label: "Product drafts scheduled", value: 12, priority: "Low", detail: "June collection pages queued" },
    ],
  },
  Quarter: {
    label: "Quarter",
    period: "Q2 2026",
    metrics: [
      { label: "Gross revenue", value: "AED 1.18M", delta: "+28.4%", tone: "up", helper: "Ahead of Q2 target" },
      { label: "Net revenue", value: "AED 1.09M", delta: "+24.1%", tone: "up", helper: "Return costs stabilized" },
      { label: "Orders", value: "3,584", delta: "+612", tone: "up", helper: "Peak demand on drops" },
      { label: "Average order value", value: "AED 329", delta: "+4.2%", tone: "up", helper: "Premium bundles working" },
      { label: "Conversion rate", value: "3.4%", delta: "+0.6%", tone: "up", helper: "Mobile funnel improved" },
      { label: "Low stock alerts", value: "21", delta: "Review", tone: "warn", helper: "Replenishment plan needed" },
    ],
    timeline: [
      { label: "Apr", revenue: 342000, orders: 1040, visitors: 46200 },
      { label: "May", revenue: 438200, orders: 1326, visitors: 57000 },
      { label: "Jun", revenue: 399800, orders: 1218, visitors: 53400 },
    ],
    funnel: [
      { label: "Store sessions", value: 156600, rate: "100%" },
      { label: "Product views", value: 88400, rate: "56.4%" },
      { label: "Added to cart", value: 13980, rate: "15.8%" },
      { label: "Checkout started", value: 8140, rate: "58.2%" },
      { label: "Orders placed", value: 3584, rate: "44.0%" },
    ],
    queue: [
      { label: "Orders need fulfillment", value: 318, priority: "High", detail: "Forecast extra pick-pack shifts for drops" },
      { label: "Refunds awaiting review", value: 43, priority: "Medium", detail: "AED 24,700 pending approval" },
      { label: "Abandoned carts recoverable", value: 880, priority: "High", detail: "AED 226,000 estimated cart value" },
      { label: "Product drafts scheduled", value: 26, priority: "Low", detail: "Q3 launch calendar needs final approval" },
    ],
  },
} as const;

export const conversionFunnel = [
  { label: "Store sessions", value: 16700, rate: "100%" },
  { label: "Product views", value: 9400, rate: "56.3%" },
  { label: "Added to cart", value: 1420, rate: "15.1%" },
  { label: "Checkout started", value: 870, rate: "61.3%" },
  { label: "Orders placed", value: 384, rate: "44.1%" },
];

export const operationsQueue = [
  { label: "Orders need fulfillment", value: 54, priority: "High", detail: "18 paid express orders before 4 PM cutoff" },
  { label: "Refunds awaiting review", value: 7, priority: "Medium", detail: "AED 2,860 pending approval" },
  { label: "Abandoned carts recoverable", value: 76, priority: "High", detail: "AED 19,420 estimated cart value" },
  { label: "Product drafts scheduled", value: 5, priority: "Low", detail: "Next drop queued for Jun 2, 2026" },
];

export const inventoryRisk = [
  { sku: "AURA-LEG-BLK-M", product: "Aura Compressive Legging", stock: 8, velocity: "11 / day", daysLeft: "1 day", action: "Reorder 120 units" },
  { sku: "NOOR-RIB-PEA-S", product: "Noor Rib Crop", stock: 14, velocity: "7 / day", daysLeft: "2 days", action: "Shift stock from Marina" },
  { sku: "MIRA-WRP-SND-L", product: "Mira Wrap Jacket", stock: 18, velocity: "5 / day", daysLeft: "4 days", action: "Increase threshold" },
];

export const productIntelligence = [
  { product: "Aura Compressive Legging", signal: "Best seller", metric: "92 sold", opportunity: "Add bundle with Noor Rib Crop" },
  { product: "Selene Wide Pant", signal: "High views, low cart", metric: "2.1% add-to-cart", opportunity: "Improve size guidance block" },
  { product: "Noor Rib Crop", signal: "Most wishlisted", metric: "418 saves", opportunity: "Trigger back-in-stock email" },
  { product: "Luna Studio Bag", signal: "Margin leader", metric: "68% gross margin", opportunity: "Feature in cart drawer upsell" },
];

export const customerSignals = [
  { label: "Returning customer revenue", value: "AED 49,640", detail: "42% of net revenue" },
  { label: "VIP customers active", value: "86", detail: "18 purchased this week" },
  { label: "At-risk repeat customers", value: "31", detail: "No order in 90+ days" },
  { label: "Support satisfaction", value: "96%", detail: "Based on 44 recent tickets" },
];

export const channelPerformance = [
  { channel: "Google Ads", revenue: "AED 38,400", roas: "4.8x", orders: 112 },
  { channel: "Meta", revenue: "AED 29,780", roas: "3.9x", orders: 91 },
  { channel: "Organic search", revenue: "AED 21,220", roas: "n/a", orders: 64 },
  { channel: "Email", revenue: "AED 18,910", roas: "12.6x", orders: 58 },
];

export const inventoryRows = products.map((product) => ({
  sku: product.id.toUpperCase(),
  name: product.name,
  stock: product.stock,
  variants: product.sizes.length * product.colors.length,
  status: product.stock < 20 ? "Low stock" : "In stock",
}));

export const topSellingProducts = products
  .filter((product) => product.bestSeller || product.featured)
  .map((product, index) => ({
    name: product.name,
    sold: [92, 78, 61, 44][index] ?? 38,
    revenue: `AED ${([31280, 19110, 17840, 13920][index] ?? 9200).toLocaleString("en-US")}`,
  }));
