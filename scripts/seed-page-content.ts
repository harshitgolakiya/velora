import "dotenv/config";
import { prisma } from "../src/lib/prisma";

type PageSeed = { slug: string; title: string; contentType: string; summary: string; seoTitle: string; seoDescription: string; blocks: Array<Record<string, unknown>> };

const pages: PageSeed[] = [
  {
    slug: "story",
    title: "The Story",
    contentType: "EDITORIAL",
    summary: "The design point of view behind our warm-weather movement wardrobe.",
    seoTitle: "Our Story",
    seoDescription: "Discover the design philosophy behind our technical activewear.",
    blocks: [
      { id: "story-hero", type: "HERO", eyebrow: "The story", heading: "Designed for composed movement.", body: "Technical pieces with quiet branding, warm-weather intelligence, and styling that works beyond training.", imageUrl: "/images/velora/story.jpg" },
      { id: "story-purpose", type: "TEXT", heading: "Built for movement in warm cities", body: "A considered wardrobe for training, travel, and the hours between. Every silhouette begins with function, then removes everything unnecessary." },
    ],
  },
  {
    slug: "fabric-guide",
    title: "Fabric and Fit Guide",
    contentType: "GUIDE",
    summary: "Compare support, handfeel, and climate performance.",
    seoTitle: "Fabric and Fit Guide",
    seoDescription: "Compare activewear fabrics, support levels, and recommended uses.",
    blocks: [
      { id: "fabric-hero", type: "HERO", eyebrow: "Fabric and fit", heading: "Materials with purpose.", body: "Compare support, handfeel, and climate performance before choosing your next layer." },
      { id: "fabric-comparison", type: "COMPARISON", heading: "Find your fabric", items: [{ name: "Sculpt", support: "Firm", feel: "Cool and matte", bestFor: "Studio and high-support training" }, { name: "Air", support: "Light", feel: "Featherweight", bestFor: "Heat and outdoor movement" }, { name: "Rib", support: "Medium", feel: "Soft and tactile", bestFor: "Low-impact training and daily wear" }] },
      { id: "fabric-care", type: "TEXT", heading: "Care for performance fabrics", body: "Wash cool with similar colours, avoid fabric softener, and air dry. Heat and harsh detergents shorten the life of stretch fibres." },
    ],
  },
  {
    slug: "faqs",
    title: "Frequently Asked Questions",
    contentType: "FAQ",
    summary: "Answers about shopping, delivery, returns, and fit.",
    seoTitle: "Frequently Asked Questions",
    seoDescription: "Find answers about delivery, checkout, returns, sizing, and product care.",
    blocks: [
      { id: "faq-shopping", type: "FAQ_GROUP", category: "Shopping and delivery", items: [{ question: "Where do you deliver?", answer: "Available delivery options are shown at checkout, with tracked shipping from dispatch and complimentary standard delivery above AED 300 where eligible." }, { question: "Can I checkout as a guest?", answer: "Yes. Guest checkout is supported, and you can create an account later using the same email." }] },
      { id: "faq-returns", type: "FAQ_GROUP", category: "Returns and exchanges", items: [{ question: "How do returns work?", answer: "Eligible items can be requested from your order page. The available resolutions and return window are calculated from the order status and current policy." }, { question: "Can I exchange a size?", answer: "When stock is available, the return flow shows replacement sizes for the same product and colour." }] },
      { id: "faq-fit", type: "FAQ_GROUP", category: "Fit and care", items: [{ question: "How should I choose a size?", answer: "Use the product fit notes and fabric support level. For compression styles between sizes, choose based on your preferred level of hold." }, { question: "How should I wash performance fabrics?", answer: "Machine wash cold, avoid fabric softener, and air dry to protect stretch and moisture-management finishes." }] },
    ],
  },
  { slug: "shipping", title: "Shipping", contentType: "POLICY", summary: "Delivery options, tracking, and shipping guidance.", seoTitle: "Shipping", seoDescription: "Delivery options, fees, tracking, and dispatch guidance.", blocks: [{ id: "shipping-hero", type: "HERO", eyebrow: "Client services", heading: "Delivery with clear tracking.", body: "Tracked standard and express delivery, with clear updates from checkout to arrival." }, { id: "shipping-options", type: "CARDS", heading: "Delivery options", items: [{ title: "Standard delivery", body: "Complimentary above AED 300 where eligible. Delivery estimates are shown at checkout." }, { title: "Express delivery", body: "Available for eligible addresses, with rates confirmed at checkout." }, { title: "Track your order", body: "Use your account or order number and checkout email for live status.", href: "/track-order" }] }] },
  { slug: "returns", title: "Returns and Exchanges", contentType: "POLICY", summary: "Eligibility, exchanges, refunds, pickup, and tracking.", seoTitle: "Returns and Exchanges", seoDescription: "Start and track eligible returns, exchanges, and refund reviews.", blocks: [{ id: "returns-hero", type: "HERO", eyebrow: "Client services", heading: "Returns without uncertainty.", body: "Start eligible returns and size exchanges directly from your order details." }, { id: "returns-process", type: "CARDS", heading: "How it works", items: [{ title: "Open your order", body: "Sign in and choose an eligible delivered order." }, { title: "Choose a resolution", body: "Available return, exchange, and refund-review options are calculated from policy and stock." }, { title: "Follow progress", body: "Track pickup, inspection, replacement, and refund progress from your account." }] }] },
  { slug: "privacy", title: "Privacy", contentType: "LEGAL", summary: "How personal and commerce information is handled.", seoTitle: "Privacy Policy", seoDescription: "How account, order, support, and analytics information is processed.", blocks: [{ id: "privacy-hero", type: "HERO", eyebrow: "Legal", heading: "Your information, handled with care.", body: "How account, order, payment, communication, and analytics data is used." }, { id: "privacy-data", type: "POLICY", heading: "Information we process", body: "We process the information needed to provide accounts, orders, payments, delivery, returns, customer support, fraud prevention, and consented communications. Payment card details are handled by the payment provider and are not stored directly by this storefront." }] },
  { slug: "terms", title: "Terms and Conditions", contentType: "LEGAL", summary: "Terms for storefront use, orders, payment, and availability.", seoTitle: "Terms and Conditions", seoDescription: "Terms covering storefront use, orders, payment, delivery, and availability.", blocks: [{ id: "terms-hero", type: "HERO", eyebrow: "Legal", heading: "Terms of service.", body: "The terms that apply when using this storefront and placing an order." }, { id: "terms-orders", type: "POLICY", heading: "Orders and availability", body: "Orders remain subject to product availability, payment authorization, delivery eligibility, and fraud checks. Prices and availability may change before checkout is completed." }] },
  { slug: "contact", title: "Contact Support", contentType: "SUPPORT", summary: "Order-aware support, product guidance, returns help, and partnerships.", seoTitle: "Contact Support", seoDescription: "Contact customer care for order help, product guidance, returns, and partnerships.", blocks: [{ id: "contact-hero", type: "HERO", eyebrow: "Customer care", heading: "How can we help?", body: "Choose a topic and include an order when relevant. Your request receives a case number and reaches the support queue immediately." }, { id: "contact-cards", type: "CARDS", heading: "Support shortcuts", items: [{ title: "Order help", body: "For shipping, payment, cancellation, and delivery updates, include your order number when available.", href: "/track-order" }, { title: "Returns and exchanges", body: "Start eligible return and exchange requests from your account order details.", href: "/returns" }, { title: "Product guidance", body: "Ask about sizing, fit, fabric, or styling before placing an order.", href: "/size-guide" }] }] },
  { slug: "size-guide", title: "Size Guide", contentType: "GUIDE", summary: "General body measurements and fit guidance.", seoTitle: "Activewear Size Guide", seoDescription: "Compare general measurements and choose your preferred activewear fit.", blocks: [{ id: "size-hero", type: "HERO", eyebrow: "Fit guide", heading: "Choose your intended fit.", body: "Use body measurements as a starting point, then account for the support level and stretch of each fabric." }, { id: "size-table", type: "COMPARISON", heading: "Women’s size guide", items: [{ name: "XS", support: "Bust 78–82 cm", feel: "Waist 60–64 cm", bestFor: "Hip 86–90 cm" }, { name: "S", support: "Bust 83–87 cm", feel: "Waist 65–69 cm", bestFor: "Hip 91–95 cm" }, { name: "M", support: "Bust 88–92 cm", feel: "Waist 70–74 cm", bestFor: "Hip 96–100 cm" }, { name: "L", support: "Bust 93–99 cm", feel: "Waist 75–81 cm", bestFor: "Hip 101–107 cm" }] }] },
  { slug: "care-guide", title: "Care Guide", contentType: "GUIDE", summary: "Care guidance for technical and stretch fabrics.", seoTitle: "Activewear Care Guide", seoDescription: "Washing and drying guidance for performance activewear.", blocks: [{ id: "care-hero", type: "HERO", eyebrow: "Product care", heading: "Keep performance intact.", body: "Simple care choices preserve stretch, colour, and technical finishes." }, { id: "care-cards", type: "CARDS", heading: "The essentials", items: [{ title: "Wash cool", body: "Use a gentle cycle with similar colours and turn pieces inside out." }, { title: "Skip softener", body: "Fabric softener can coat moisture-management fibres and reduce performance." }, { title: "Air dry", body: "Avoid tumble heat. Lay flat or hang away from direct sun." }] }] },
];

async function main() {
  for (const page of pages) {
    await prisma.pageContent.upsert({
      where: { slug: page.slug },
      update: {
        ...page,
        body: "",
        blocks: JSON.stringify(page.blocks),
        status: "PUBLISHED",
        locale: "en",
        publishedAt: new Date(),
      },
      create: {
        ...page,
        body: "",
        blocks: JSON.stringify(page.blocks),
        status: "PUBLISHED",
        locale: "en",
        publishedAt: new Date(),
      },
    });
  }
  console.log(`Seeded ${pages.length} managed content pages.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
