# Velora

Premium international activewear ecommerce built with Next.js App Router, TypeScript, Tailwind CSS, Zustand, Prisma, NextAuth, Stripe-ready checkout, and Resend-ready email templates.

## What Is Included

- Home, shop, collection, product detail, cart, checkout, account, admin, support, policy, FAQ, fabric guide, and order tracking pages.
- Product filtering, sorting, quick add, wishlist, persistent cart, cart drawer, free-shipping progress, newsletter modal, responsive mobile UX, skeleton loading, and SEO metadata.
- Prisma PostgreSQL schema covering users, admin roles, products, variants, images, categories, collections, carts, wishlist, orders, addresses, coupons, reviews, newsletter, content, payments, and shipments.
- Admin dashboard surface for revenue, orders, products, stock, content, media, coupons, customers, and role-based operations.
- API foundations for NextAuth credentials, checkout, newsletter, and Stripe webhook verification.
- Core production requirements are tracked in `PROJECT_REQUIREMENTS.md`.

## Setup

```bash
npm install
copy .env.example .env
npm run prisma:generate
npm run dev
```

Open `http://localhost:3000`.

## Database

Set `DATABASE_URL` in `.env`, then run:

```bash
npm run prisma:migrate
npm run prisma:seed
```

Demo admin:

- Email: `admin@velora.ae`
- Password: `VeloraAdmin123!`

## Payments

The checkout endpoint is Stripe-ready and can be adapted to Tap or PayTabs. Add:

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=
```

Then update checkout line items to use real product prices from Prisma before production launch.

## CMS And Analytics

The storefront is prepared for Sanity, Shopify headless, or Strapi through `src/lib/cms.ts`. Set `CMS_PROVIDER` in `.env` and replace the local adapter with the selected provider query layer.

Analytics scripts are opt-in through environment variables:

```bash
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_META_PIXEL_ID=
NEXT_PUBLIC_TIKTOK_PIXEL_ID=
```

The production event plan should track product views, search, wishlist, add to cart, checkout start, purchase, coupon use, and newsletter signup.

## Performance Requirements

- Keep Lighthouse scores at 90+.
- Use `next/image` with local or CDN image assets.
- Serve static images with immutable cache headers.
- Keep client components limited to UI interactions.
- Run `npm run build` before deployment and measure the production build with Lighthouse.

## Deployment To Vercel

1. Create a PostgreSQL database.
2. Add all `.env.example` variables in Vercel project settings.
3. Run `prisma migrate deploy` during deployment or from CI.
4. Configure Stripe webhook URL at `/api/webhooks/stripe`.
5. Set `NEXT_PUBLIC_SITE_URL` and `NEXTAUTH_URL` to the production domain.

## Notes

The storefront currently uses a local demo catalog for speed and visual completeness. Prisma models and seed data are included so the next step is replacing catalog reads with database-backed server queries and completing admin CRUD forms.
