# Codex Handoff

## Project

Velora is a temporary name for a premium activewear ecommerce build. The storefront must feel international and high-end; UAE is an important audience, but the site should not be designed or written as UAE-only.

Primary working directory: `C:\Users\golak\Desktop\ecomm\velora`

## Tech Stack

- Next.js `16.2.10` App Router, React `19.2.4`, TypeScript.
- Tailwind CSS v4, Radix UI, lucide-react, native CSS/scroll interactions for storefront sliders.
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

- Priority 13 is now the active roadmap area: accessibility, performance, security, release gates, jobs, local media, observability, and deployment hardening remain.
- A critical Playwright accessibility gate exists and runs through `npm run test:e2e:a11y`; it now covers critical storefront routes, dark-mode/200%-zoom-equivalent passes, admin login, authenticated admin dashboard/orders/media/content/support routes, and deeper admin product edit/preview, content edit/preview, email-template, order-review, and media-edit workflows. Full WCAG 2.2 AA still needs manual assistive-technology signoff.
- A text contrast release gate exists through `npm run test:e2e:contrast`; it computes rendered WCAG AA contrast for critical storefront routes in light/dark mode and authenticated admin routes.
- A screen-reader smoke gate exists through `npm run test:e2e:screen-reader`; it inspects Chromium's accessibility tree for critical storefront routes, populated checkout, and authenticated admin dashboard/orders/media/content/support landmarks, headings, and named actions.
- A Playwright screenshot release gate exists through `npm run test:e2e:screenshots`; it snapshots mobile/desktop first-viewport states for home, shop, and PDP.
- A mobile Playwright performance baseline exists through `npm run test:e2e:perf`; it checks LCP, CLS, navigation timing, transfer size, script transfer, and interaction-frame latency on home, shop, PDP, and cart.
- A throttled mobile Playwright performance gate exists through `npm run test:e2e:perf:throttled`; it emulates slower mobile network and 4x CPU for home, shop, and PDP LCP/CLS/interaction checks.
- A critical-flow Playwright release gate exists through `npm run test:e2e:critical`; it covers PDP selected-variant readiness, persisted-cart checkout validation, unauthenticated account/admin protection, and search recovery.
- A Lighthouse release gate exists through `npm run test:lighthouse`; it runs against a production `next start`, writes JSON reports to `test-results/lighthouse`, enforces current mobile score floors, and reports remaining 90+ target gaps. See `docs/LIGHTHOUSE_BASELINES.md`.
- Storefront shell JavaScript was reduced by dynamically loading cart/newsletter dialogs and removing full product catalog data from the shared header mega menu.
- Storefront performance was further improved by removing Framer Motion and Embla from the runtime, replacing reveal/page/announcement/carousel motion with CSS/native scroll, deferring Quick View and product fullscreen gallery dialog code until click, rendering hover product images only after hover-capable clients mount, compacting list-page product payloads, deferring the consent prompt past initial paint, splitting lightweight shell i18n away from large route-copy dictionaries, demand-loading the predictive search dialog, reducing initial shop product hydration, narrowing PDP recommendation queries, and adding explicit high fetch priority to hero/PDP/list LCP images.
- CSP and browser security headers are configured in `next.config.ts` with Vitest coverage in `tests/security-headers.test.ts`.
- Secret scanning exists through `npm run security:secrets`; high-severity dependency auditing exists through `npm run security:deps`; moderate-advisory tracking exists through `npm run security:moderates`; `npm run security:audit` runs all three.
- Customer account session tracking exists with device visibility/revocation; `requireCustomerSession` rejects revoked tracked sessions and `src/lib/request-security.ts` enforces same-origin checks across browser-called customer mutation routes, excluding provider webhooks and NextAuth internals.
- A centralized maintenance job runner exists at `POST /api/admin/jobs/maintenance`; it runs cart reservation expiry, scheduled publishing, automation email/retry processing, and product alert queue processing.
- Admin media upload now uses local-only storage in `src/lib/media-storage.ts`; uploads are written under `public/images/admin/products` while preserving `originalUrl` and optimization metadata on `MediaAsset`. External media switching and backfill scripts were removed because this project is staying local-only for media.
- Observability foundation exists: `src/lib/observability.ts` emits redacted structured logs, `GET /api/health` checks uptime/database health, and `GET /api/admin/ops/health` summarizes business-health queues and can notify `MONITORING_WEBHOOK_URL`.
- Deployment hardening foundation exists: `npm run deployment:check` validates required production env, and `docs/DEPLOYMENT_RUNBOOK.md` covers deploy, migration, backup, restore drill, monitoring, and rollback steps.
- Local backup/restore validation exists through `npm run backup:restore-drill`; it copies the configured local SQLite/libSQL database, opens the restored copy through Prisma, checks SQLite integrity, records core table counts, and writes `.restore-drill/latest-report.json`.
- `npm run env:inventory` verifies env vars read by code are documented in `.env.example`; `npm run release:check` now runs lint, TypeScript, env inventory, Vitest, security audit, accessibility, critical flows, screenshots, baseline performance, throttled performance, production build, and Lighthouse baselines end to end.
- Cart and checkout now wait for persisted store hydration before rendering empty states, preventing hard-refresh persisted-cart sessions from flashing or staying empty.
- Product Detail/catalog field and media coverage is codified in `src/lib/storefront-catalog-audit.ts` and `tests/storefront-catalog-audit.test.ts`; the live published catalog currently has no critical PDP contract/media issues.
- Imported WooCommerce products are assigned to public collections through `src/lib/collection-assignment.ts`; `npm run catalog:backfill-collections` is idempotent, and `tests/collection-assignment.test.ts` verifies assignment rules plus live published-product collection coverage.
- Cart/Checkout mobile and recovery audit is complete: `src/lib/cart-ui.ts` centralizes reservation error labels, cart drawer/PDP/checkout use customer-facing recovery copy, and `tests/e2e/checkout-mobile.spec.ts` covers mobile form ergonomics plus blocked inventory-sync recovery without overflow.
- Admin-backed support/content pages are complete: `scripts/seed-page-content.ts` seeds 10 managed pages including contact, support/legal/guide routes use `PageContent` blocks, `getPageContentMetadata` applies admin SEO fields, and `tests/support-pages-content.test.ts` guards required published slugs.
- Global responsive/accessibility audit is complete for the current release gate: `tests/e2e/accessibility-critical.spec.ts` now covers account/contact/FAQ, dark-mode and 200%-zoom-equivalent passes for critical customer routes, plus authenticated admin dashboard/orders/media/content/support/product edit/product preview/content edit/content preview/email-template/order-review/media-edit DOM accessibility; `tests/e2e/storefront-shell.spec.ts` and `tests/e2e/content-responsive.spec.ts` pass for shell/content responsiveness and dialog focus behavior.
- Lighthouse hard release floors and 90+ performance targets pass for the audited mobile storefront routes. Latest `npm run test:lighthouse` scores from `2026-07-07` are home 93, shop 97, PDP 97, cart 98. Cart SEO is intentionally below 90 because the cart is blocked from indexing.
- `npm audit --audit-level=high` exits cleanly. Moderate advisories were reduced with safe overrides for Prisma's `@hono/node-server`, Next's nested `postcss`, and next-auth's `uuid`; npm still reports 17 moderate advisories in the Lighthouse -> Sentry/OpenTelemetry dev-tooling chain. `npm run security:moderates` now allowlists only this documented chain, writes `.launch-readiness/advisory-report.json`, and fails on any new moderate/high/critical advisory. Latest safe-forward check on `2026-07-08` found Lighthouse 13.x requires Node `>=22.19`, so keep `lighthouse@12.8.2` while this repo runs Node 20.
- Production security/operations work remains: provider backup configuration and a real restore drill. `npm run deployment:check` now fails on missing required production variables and obvious placeholder/local values. `npm run launch:evidence` validates filled local evidence files from `PROVIDER_RESTORE_EVIDENCE_PATH`, `ASSISTIVE_TECH_SIGNOFF_PATH`, and `GO_LIVE_DECISION_RECORD_PATH`, then writes `.launch-readiness/evidence-report.json`. Local `npm run launch:readiness` writes `.launch-readiness/latest-report.json` and currently fails on the local `.env` because `ADMIN_JOB_SECRET` is missing and `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and `NEXT_PUBLIC_SITE_URL` are still local/placeholder values; it also warns until `MONITORING_WEBHOOK_URL`, `MONITORING_WEBHOOK_SECRET`, `BACKUP_RESTORE_RUNBOOK_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, manual assistive-tech evidence, and local launch evidence paths are configured. A production-shaped env simulation passed required/recommended env and evidence URL checks on `2026-07-08`, leaving only the known moderate advisory warning.
- Latest local `npm run backup:restore-drill` on `2026-07-08` passed with SQLite integrity `ok`, products=29, variants=333, orders=14, users=14, pages=10, mediaAssets=0, and localAdminMediaFiles=0.
- Customer-facing support, shell, cart, checkout, PDP, search, and seeded content copy has been revised away from UAE-only positioning while keeping UAE-capable checkout defaults where they are functional.
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
npm run catalog:backfill-collections
npm run backup:restore-drill
```

Useful targeted checks:

```bash
npm test -- homepage-sections.test.ts
npm test -- content-cms.test.ts support-pages-content.test.ts
npm test -- product-gallery-presentation.test.ts
npm test -- cart-reservations.test.ts
npm test -- return-request-lifecycle.test.ts
npm test -- security-headers.test.ts
npm test -- maintenance-jobs.test.ts
npm test -- media-storage.test.ts
npm test -- observability.test.ts health-routes.test.ts
npm test -- request-security.test.ts cart-route-security.test.ts checkout-route.test.ts product-alert-route.test.ts return-request-cancellation.test.ts return-flow-reconciliation.test.ts order-tracking.test.ts recommendation-event-route.test.ts account-session-security.test.ts account-sessions.test.ts
npm test -- storefront-catalog-audit.test.ts collection-assignment.test.ts collection-filters.integration.test.ts product-filters.test.ts
npm run deployment:check
npm run env:inventory
npm run backup:restore-drill
npm run launch:evidence
npm run security:moderates
npm run security:audit
npm run test:e2e:a11y
npm run test:e2e:contrast
npm run test:e2e:screen-reader
npm run test:e2e:critical
npx playwright test tests/e2e/checkout-mobile.spec.ts --project=mobile-chromium
npx playwright test tests/e2e/content-responsive.spec.ts --project=desktop-chromium
npm run test:e2e:screenshots
npm run test:e2e:perf
npm run test:e2e:perf:throttled
npm run test:lighthouse
npm run release:check
npx playwright test tests/e2e/storefront-shell.spec.ts
```

## Environment Assumptions

- Local app URL: `http://localhost:3000` unless another port is chosen.
- `.env.example` documents required variables.
- Local DB default: `DATABASE_URL="file:./prisma/dev.db"`.
- Prisma 7 warning is intentional: datasource URL belongs in `prisma.config.ts`.
- SMTP/cPanel email uses env vars such as `SMTP_HOST=mail.ccea.ae`, `SMTP_PORT=465`, `SMTP_USER=no-reply@ccea.ae`, and `SMTP_PASSWORD`.
- Set `ADMIN_JOB_SECRET` before wiring production cron to `POST /api/admin/jobs/maintenance`; send it as `Authorization: Bearer <secret>`.
- Set `MONITORING_WEBHOOK_URL` and `MONITORING_WEBHOOK_SECRET` before enabling external alert routing; set `PRODUCTION_BROWSER_SOURCE_MAPS=true` only when the deployment target stores source maps securely.
- Playwright overrides `NEXTAUTH_URL` to `http://127.0.0.1:3000` in `playwright.config.ts` so authenticated e2e admin flows share the same origin as the test browser.
- Do not commit or expose real secrets from `.env`.
- Demo admin in README: `admin@velora.ae` / `VeloraAdmin123!` unless changed in local DB.

## Next Tasks

1. Configure real production env values and rerun `npm run deployment:check` plus `npm run launch:readiness`.
2. Configure production database/provider backups and perform a real staging restore drill using `docs/DEPLOYMENT_RUNBOOK.md`.
3. Perform final manual assistive-technology review using `docs/ASSISTIVE_TECH_SIGNOFF.md`.
4. Track the remaining Lighthouse/Sentry/OpenTelemetry moderate dependency advisories until the runtime can move to Node `>=22.19` or an upstream-safe Lighthouse 12.x fix is available.

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
