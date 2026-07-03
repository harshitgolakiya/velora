# Velora Core Requirements

These requirements are non-negotiable for the production Velora build.

## Performance

- Lighthouse target: 90+ for Performance, SEO, Accessibility, and Best Practices.
- Use local or CDN-backed optimized images through `next/image`.
- Lazy load below-the-fold images.
- Cache static images with long-lived immutable headers.
- Prefer server components for product, collection, and content pages.
- Keep client JavaScript limited to interactions: cart, wishlist, filters, animations, analytics.

## SEO

- Dynamic metadata for products, collections, and content pages.
- Product schema, breadcrumb schema, organization schema, and Open Graph tags.
- `sitemap.xml`, `robots.txt`, clean URLs, canonical tags, and image alt text.
- English/Arabic hreflang structure.

## Mobile First

- Design mobile first, then scale to 1440px desktop containers.
- Thumb-friendly buttons, filters, menu, cart drawer, and sticky add-to-cart.
- Checkout must be short, fast, and optimized for mobile keyboards.

## CMS

- Content/product source must sit behind the CMS adapter in `src/lib/cms.ts`.
- Supported long-term CMS targets: Sanity, Shopify headless, or Strapi.
- Admin/editor users should control products, collections, homepage modules, policies, FAQ, and newsletter content.

## Motion

- Use Framer Motion or GSAP only for purposeful motion.
- Include subtle page transitions, hover interactions, loading states, scroll reveals, and micro-interactions.
- Avoid heavy animation that hurts Core Web Vitals.

## Design System

- Maintain one spacing system, typography hierarchy, button language, card style, form style, and color system.
- Light mode palette:
  - Main background: `#F7F5F2`
  - Secondary surface: `#FFFFFF`
  - Card surface: `#EFECE6`
  - Primary text: `#111315`
  - Secondary text: `#5F646D`
  - Premium gold: `#C5A46D`
  - Soft border: `#DDD8CF`
  - Hover surface: `#E8E3DA`
- Dark mode palette:
  - Main background: `#0B0D10`
  - Secondary surface: `#151922`
  - Card surface: `#1B2029`
  - Primary text: `#F5F5F4`
  - Secondary text: `#A1A1AA`
  - Premium gold: `#C5A46D`
  - Soft border: `#2B313C`
  - Hover surface: `#202632`

## Product Presentation

- Product image galleries.
- Zoom-ready product imagery.
- Variant swatches and size selection.
- Smooth cart drawer.
- Sticky mobile add-to-cart.
- Product video support path.
- Storytelling sections for fabric, support, care, shipping, and fit.

## Ecommerce

- Cart drawer instead of forced cart redirect.
- Persistent cart.
- Coupon support.
- Abandoned cart integration path.
- Stripe, PayPal, Apple Pay, Google Pay, and UAE-friendly options such as Tabby/Tamara.

## Analytics

- Google Analytics 4.
- Meta Pixel.
- TikTok Pixel.
- Conversion and event tracking for product view, add to cart, checkout, purchase, newsletter signup, search, and wishlist.

## Growth

- Popup email capture.
- Newsletter sections.
- Email flow integration through Resend or marketing platform.
- Responsive image pipeline with WebP/AVIF and CDN delivery for production.
