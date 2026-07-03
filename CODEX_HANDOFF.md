# Codex Handoff

## Project

Velora is a temporary name for a premium activewear ecommerce build. The storefront must feel international and high-end; UAE is an important audience, but the site should not be designed or written as UAE-only.

Primary working directory: `C:\Users\golak\Desktop\ecomm\velora`

## Tech Stack

- Next.js `16.2.6` App Router, React `19.2.4`, TypeScript.
- Tailwind CSS v4, Radix UI, lucide-react, Framer Motion, Embla carousel.
- Prisma `7.8.0` with SQLite/libSQL adapter for local development.
- NextAuth credentials auth, bcryptjs.
- Stripe-ready checkout, cash on delivery, SMTP/cPanel email, Resend-ready templates.
- Vitest for unit/integration tests, Playwright for E2E/screenshot tests.

## Architecture

- Storefront routes live in `src/app/*` and pull catalog/homepage data through `src/lib/cms.ts`.
- Current CMS provider is `local`; `src/lib/cms.ts` is the adapter boundary for future Sanity, Shopify headless, or Strapi.
- Database models are Prisma-first in `prisma/schema.prisma`; Prisma 7 datasource URL is configured in `prisma.config.ts`, not inside `schema.prisma`.
- Prisma client uses `@prisma/adapter-libsql` in `src/lib/prisma.ts`.
- Admin data aggregation lives mostly in `src/lib/admin-catalog.ts`; the main admin UI is `src/components/admin/admin-console.tsx`.
- Storefront UI components live in `src/components/store/*`.
- Admin/API mutations live in `src/app/api/admin/*` and customer APIs in `src/app/api/*`.
- `MASTER_PROJECT_ROADMAP.md` is the source of truth for remaining work.

## Folder Map

- `src/app` - Next.js routes, layouts, metadata, API routes.
- `src/components/store` - storefront header, footer, product cards, cart, checkout, search, account-facing UI.
- `src/components/admin` - admin dashboard, product editor, content manager, support/email tools.
- `src/components/auth` - account dashboard, login/access, returns, reorder, wishlist account cards.
- `src/lib` - server/client business logic, catalog mapping, settings, email, returns, analytics, admin helpers.
- `prisma` - schema, migrations, seed script, local `dev.db`.
- `public/images` - local product/editorial images, including WooCommerce import images.
- `scripts` - import/seed utilities.
- `tests` - Vitest suites and Playwright E2E/screenshot specs.
- `artifacts` - screenshots from visual audits.

## Completed Features

- Storefront: home, shop, collections, product detail, cart, checkout, account, tracking, support/content pages.
- Themes: light/dark switcher, Poppins-like modern storefront direction in progress.
- Catalog: database-backed products, categories, collections, colors, sizes, tags, variants, per-color media, hover images, videos.
- Product import: WooCommerce CSV/image import foundation; local imported images under `public/images/products/woocommerce`.
- Homepage: admin-backed sections, ordering, category media tiles, full-bleed collection banner, draggable product sliders.
- Shop: side-panel filters, sorting, URL state, mobile filter behavior, 4-column laptop and 5-column wide desktop grid.
- Product detail: variant selection, per-color galleries, zoom/fullscreen, fit/care/spec fields, reviews, recommendations.
- Cart/inventory: persistent cart, drawer/page, reservations, backorders, atomic oversell protection, inventory anomalies.
- Checkout: guest/account checkout, saved addresses, coupons, configurable shipping/payment settings, Stripe/COD foundations.
- Returns/exchanges: dedicated return route, resolution-specific reasons, replacement size lookup, partial quantity, evidence upload, lifecycle/admin queue.
- Admin: overview, products, categories, collections, attributes, inventory, orders, customers, coupons, media, reviews, homepage, automation, analytics/settings.
- Security/admin: admin login, RBAC, permissions, API protection, rate limiting, activity logs.
- Email/marketing: SMTP/cPanel env support, Resend-ready templates, newsletter, automation, provider event records.
- SEO/analytics/localization foundations exist, but localization is not the current priority.

## Current Bugs / Known Issues

- Priority 13 is now the active roadmap area: accessibility, performance, security, release gates, jobs, media/CDN, observability, and deployment hardening remain.
- A first critical Playwright accessibility gate exists and runs through `npm run test:e2e:a11y`, but full WCAG 2.2 AA, contrast, 200% zoom, screen-reader, and admin workflow coverage still need expansion.
- CSP and browser security headers are configured in `next.config.ts` with Vitest coverage in `tests/security-headers.test.ts`.
- `npm run release:check` now runs lint, TypeScript, Vitest, the accessibility gate, and production build end to end.
- Lighthouse/performance baselines and LCP/INP/CLS optimization are not complete.
- Production security/operations work remains: secret audit, rich-content sanitization, security scanning, centralized jobs, monitoring, backups, restore drill, deployment and rollback.
- Site copy/metadata still has some UAE-only assumptions; revise to international language where customer-facing.
- Product image optimization must stay smart: do not over-compress originals into tiny low-quality derivatives.
- Windows/Next dev server can generate malformed `.next/dev/types/routes.d.ts` or hit `.next` EPERM issues; stop the server and delete/rebuild `.next` if it happens.

## Important Implementation Decisions

- Variant-first catalog is required: Product is the concept; ProductVariant is the sellable SKU by color/size.
- Each color/variant can have its own gallery, hover image, video, SKU, stock, and availability.
- Local media upload is preferred for now; avoid URL-only image fields in admin product workflows.
- `StoreSetting` stores many configurable settings as JSON strings for SQLite compatibility.
- Admin actions should be audited through `ActivityLog`.
- Customer-facing state transitions must be server-enforced, not only UI-controlled.
- External side effects must be idempotent and observable: email, Stripe, carrier, alert queues, automation.
- Do not focus on translation/localization work until UI/UX priorities are complete.
- UAE should influence shipping/payment defaults, but the storefront should read as international.

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npx tsc --noEmit
npm test
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run content:seed
npm run import:woocommerce
```

Useful targeted checks:

```bash
npm test -- homepage-sections.test.ts
npm test -- product-gallery-presentation.test.ts
npm test -- cart-reservations.test.ts
npm test -- return-request-lifecycle.test.ts
npm test -- security-headers.test.ts
npm run test:e2e:a11y
npm run release:check
npx playwright test tests/e2e/storefront-shell.spec.ts
```

## Environment Assumptions

- Local app URL: `http://localhost:3000` unless another port is chosen.
- `.env.example` documents required variables.
- Local DB default: `DATABASE_URL="file:./prisma/dev.db"`.
- Prisma 7 warning is intentional: datasource URL belongs in `prisma.config.ts`.
- SMTP/cPanel email uses env vars such as `SMTP_HOST=mail.ccea.ae`, `SMTP_PORT=465`, `SMTP_USER=no-reply@ccea.ae`, and `SMTP_PASSWORD`.
- Do not commit or expose real secrets from `.env`.
- Demo admin in README: `admin@velora.ae` / `VeloraAdmin123!` unless changed in local DB.

## Next Tasks

1. Continue `MASTER_PROJECT_ROADMAP.md` Priority 13.
2. Expand accessibility release gates: critical admin workflows, account/checkout/returns flows, dark mode, 200% zoom, contrast, screen-reader labels, live regions, and keyboard-only journeys.
3. Add Lighthouse/performance baseline scripts and measure mobile LCP, INP, and CLS under throttling.
4. Optimize performance findings: LCP priority, responsive image sizing, lazy loading, font loading, JavaScript weight, and stable media dimensions.
5. Add secret audit, rich-content sanitization checks, and dependency/security scanning.
6. Add centralized job runner coverage for schedules, reservations, automation, alerts, and retries.
7. Add observability/deployment hardening: structured logs, monitoring hooks, backups, restore drill, migrations, rollback, and release checklist.

## Inspect These Files First

### Roadmap / Requirements

- `MASTER_PROJECT_ROADMAP.md`
- `PROJECT_REQUIREMENTS.md`
- `CODEX_HANDOFF.md`

### Storefront Shell / UI System

- `src/components/app-shell.tsx`
- `src/components/store/header.tsx`
- `src/components/store/footer.tsx`
- `src/components/store/announcement-bar.tsx`
- `src/components/store/theme-toggle.tsx`
- `src/components/store/store-search-dialog.tsx`
- `src/components/store/cart-drawer.tsx`
- `src/app/globals.css`

### Homepage

- `src/app/page.tsx`
- `src/lib/homepage-sections.ts`
- `src/lib/homepage-section-validation.ts`
- `src/app/api/admin/homepage-sections/route.ts`
- `src/components/admin/admin-console.tsx`

### Catalog / Product Data

- `prisma/schema.prisma`
- `src/lib/catalog-db.ts`
- `src/lib/catalog.ts`
- `src/lib/cms.ts`
- `src/lib/product-presentation.ts`
- `src/lib/product-gallery-presentation.ts`
- `src/components/store/product-card.tsx`
- `src/components/store/product-detail.tsx`
- `src/components/admin/product-edit-form.tsx`

### Admin Panel

- `src/app/admin/page.tsx`
- `src/lib/admin-catalog.ts`
- `src/components/admin/admin-console.tsx`
- `src/components/admin/product-detail-page.tsx`
- `src/components/admin/product-edit-form.tsx`
- `src/lib/admin-permissions.ts`
- `src/lib/admin-activity.ts`

### Checkout / Payments / Shipping

- `src/components/store/checkout-form.tsx`
- `src/app/api/checkout/route.ts`
- `src/lib/store-settings.ts`
- `src/lib/shipping-settings.ts`
- `src/lib/payment-method-settings.ts`
- `src/lib/address-autocomplete.ts`
- `src/lib/cart-reservations.ts`

### Returns / Support

- `src/app/account/orders/[orderNumber]/return/page.tsx`
- `src/components/auth/return-request-form.tsx`
- `src/lib/return-request-lifecycle.ts`
- `src/lib/return-policy.ts`
- `src/app/api/account/orders/[orderNumber]/return-request/route.ts`
- `src/app/api/admin/returns/[id]/route.ts`
- `src/components/admin/support-manager.tsx`

### Email / Automation

- `src/lib/email-delivery.ts`
- `src/lib/email-templates.ts`
- `src/lib/transactional-email.ts`
- `src/components/admin/email-template-manager.tsx`
- `src/app/api/admin/email-templates/*`

### Tests To Check Before Handing Back

- `tests/e2e/storefront-shell.spec.ts`
- `tests/e2e/homepage-merchandising.spec.ts`
- `tests/product-field-contract.test.ts`
- `tests/product-gallery-presentation.test.ts`
- `tests/cart-reservations.test.ts`
- `tests/return-request-lifecycle.test.ts`
- `tests/admin-routes.test.ts`
