# Velora

Premium activewear ecommerce built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Zustand, Prisma 7 (SQLite via libsql), NextAuth, Stripe-ready checkout, and Resend-ready email templates.

The storefront was rebuilt from the ground up as a single, consistent design system. The admin dashboard and backend are unchanged.

## Storefront Design System

**Palette.** Warm neutrals with a deep sage accent. There is no pure black or pure white anywhere in the UI: backgrounds use `#f4efe7` / `#faf7f1` / `#ebe4d8`, text uses near-black `#1e1b17`, and dark tones are reserved for text only. Every color is a CSS token in `src/app/globals.css` (`--background`, `--surface`, `--card`, `--paper`, `--ink`, `--muted`, `--accent`, `--accent-soft`, `--sale`, `--border`, ...) with a dark theme under `:root[data-theme="dark"]`.

**Type.** Exactly two families, loaded with `next/font`:

- **Fraunces** for display, headings, and prices (optical size, soft and wonky axes enabled).
- **Manrope** for UI, body, and labels.

**Components.** One shared set of classes in `@layer components`, used by every storefront surface:

| Class | Purpose |
| --- | --- |
| `btn` + `-primary` `-secondary` `-soft` `-ghost` `-link` `-on-photo`, sizes `-sm` `-lg` `-block` `-icon` `-round` | All buttons and button-like links (see `src/components/ui/button.tsx`) |
| `chip`, `chip-sm`, `chip-pill` | Filters, sizes, sort options (`aria-pressed` marks selection) |
| `swatch`, `swatch-sm` | Color selection |
| `eyebrow`, `display-xl/lg/md` | Editorial typography |
| `field`, `badge`, `card`, `section`, `section-head` | Forms, labels, surfaces, layout rhythm |
| `photo-scrim-bottom/side`, `gallery-thumb`, `gallery-dot`, `marquee` | Imagery and motion helpers |

**Imagery.** All campaign and product photography lives in `public/images/campaign/` as WebP (38 files), generated for this project. Product data in `src/lib/catalog.ts` maps each product to its `photos` array, and the Prisma seed writes the same set to the database.

**Video per color.** `VariantMedia` rows of type `VIDEO` attach to a specific product variant. The product gallery renders them as slides with play and pause, and product cards play them on hover. The demo attaches a video to the Studio Wrap Top in Rose; add more through the admin media manager or the `videos` map in `src/lib/catalog.ts`.

**Gallery.** The product gallery is built on Embla with a looped, eased slide, a thumbnail rail on desktop, dots on mobile, keyboard arrows, and hover arrows.

**Header.** "Shop" is a real link to `/shop`. Hovering it opens the mega menu, clicking navigates.

## What Is Included

- Home, shop, collection, product detail, cart, checkout, account, admin, support, policy, FAQ, fabric guide, story, search, and order tracking pages.
- Filtering, sorting, wishlist, persistent cart, cart drawer, free-shipping progress, newsletter modal, dark theme, English and Arabic locales, skeleton loading, and SEO metadata.
- Prisma schema covering users, admin roles, products, variants, variant media, categories, collections, carts, wishlist, orders, addresses, coupons, reviews, newsletter, content, payments, and shipments.
- Admin dashboard for revenue, orders, products, stock, content, media, coupons, customers, and role-based operations.
- API routes for NextAuth credentials, checkout, newsletter, and Stripe webhook verification.
- Production requirements are tracked in `PROJECT_REQUIREMENTS.md`.

## Setup

```bash
npm install
copy .env.example .env
npm run prisma:generate
npx prisma db push
npm run prisma:seed
npm run dev
```

Open `http://localhost:3000`.

The default `DATABASE_URL` is `file:./prisma/dev.db`, so no external database is needed for local development. The database file is ignored by git.

Demo admin:

- Email: `admin@velora.ae`
- Password: `VeloraAdmin123!`

## Scripts

```bash
npm run dev          # Next.js dev server (Turbopack)
npm run build        # production build
npm run lint         # eslint
npm run test         # vitest unit and integration tests
npm run test:e2e:critical   # Playwright critical flows
npm run prisma:seed  # reseed demo catalog, content, and admin user
```

## Payments

The checkout endpoint is Stripe-ready and can be adapted to Tap or PayTabs. Add:

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=
```

## CMS And Analytics

The storefront is prepared for Sanity, Shopify headless, or Strapi through `src/lib/cms.ts`. Set `CMS_PROVIDER` in `.env` and replace the local adapter with the selected provider query layer.

Analytics scripts are opt-in through environment variables:

```bash
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_META_PIXEL_ID=
NEXT_PUBLIC_TIKTOK_PIXEL_ID=
```

## Performance

- Keep Lighthouse scores at 90+.
- Use `next/image` with the local WebP assets; `next.config.ts` whitelists the quality steps used by the storefront.
- Keep client components limited to UI interactions.
- Run `npm run build` before deployment and measure the production build with Lighthouse.

## Deployment To Vercel

1. Provision a database (switch the Prisma datasource from SQLite to PostgreSQL for production).
2. Add all `.env.example` variables in Vercel project settings.
3. Run `prisma migrate deploy` during deployment or from CI.
4. Configure the Stripe webhook URL at `/api/webhooks/stripe`.
5. Set `NEXT_PUBLIC_SITE_URL` and `NEXTAUTH_URL` to the production domain.
