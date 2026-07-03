# Master Commerce Roadmap

This is the only project roadmap. Work is ordered by customer-facing priority, but every customer feature includes the backend, admin, integration, and verification work required to make it genuinely complete.

## How Completion Works

A feature is complete only when every relevant layer is complete:

- **Storefront:** customer journey, responsive behavior, accessibility, and all UI states.
- **Backend:** structured database records, authorization, validation, and state transitions.
- **Admin:** operational visibility, controls, recovery actions, permissions, and audit history.
- **Integrations:** payments, email, carrier, warehouse, analytics, or third-party synchronization.
- **Verification:** unit, integration, end-to-end, accessibility, responsive, and production checks.

Do not mark a parent feature complete because only its UI or API exists.

## Current Foundation

### Storefront

- [x] Next.js App Router storefront with light/dark themes and 1440px content container.
- [x] Responsive header, footer, navigation, mega menu, breadcrumbs, loading, and error foundations.
- [x] Database-backed homepage, products, categories, collections, variants, and filters.
- [x] Product galleries, per-color media, video, swatches, inventory, cart, checkout, and customer accounts.
- [x] Search, wishlist, reviews, recently viewed, recommendations, tracking, invoices, and reorder foundations.
- [x] Stripe and cash-on-delivery checkout foundations.

### Backend And Admin

- [x] Prisma product, variant, inventory, order, customer, coupon, media, review, shipment, automation, and return models.
- [x] Admin authentication, roles, permissions, API protection, and activity logs.
- [x] Product, category, collection, attribute, inventory, order, customer, coupon, media, review, homepage, automation, analytics, and settings foundations.
- [x] Local media upload and WooCommerce catalog import foundations.
- [x] SMTP/Resend delivery records and Klaviyo/Mailchimp synchronization foundations.
- [x] CSV import/export and scheduled report foundations.

---

## Priority 1: Global UI System And Navigation

### Storefront

- [x] Complete header/footer visual audit at 360, 390, 768, 1024, 1366, 1440, and 1920px.
- [x] Refine mobile navigation hierarchy, account shortcuts, touch targets, and menu density.
- [x] Standardize drawers, modals, popovers, accordions, forms, buttons, and status feedback.
- [x] Remove hydration shifts, accidental gaps, clipping, overflow, and inconsistent sticky behavior.
- [x] Standardize typography, spacing, dividers, reading widths, and theme contrast.
- [x] Remove unnecessary rounded cards, boxed sections, nested panels, and template-like composition.
- [x] Ensure hover behavior always has an equivalent touch interaction.
- [x] Add reduced-motion behavior without losing interaction feedback.

### Backend And Admin Dependencies

- [x] Add admin controls for announcement content, navigation groups, footer links, support links, and enable/disable states.
- [x] Add draft/preview/publish behavior for shared navigation content.
- [x] Store navigation and footer content structurally rather than hardcoding it.
- [x] Add audit history and permission rules for global storefront content.

### Verification

- [x] Add screenshot baselines for shared desktop/mobile shell states.
- [x] Verify keyboard navigation, focus trapping, escape handling, scroll locking, and screen-reader labels.
- [x] Verify refresh and browser navigation do not change layout or active state unexpectedly.

## Priority 2: Homepage And Editorial Merchandising

### Storefront

- [x] Responsive hero, editorial collections, product rails, trust, reviews, and newsletter foundations.
- [x] Re-audit the homepage using the imported production catalog.
- [x] Improve art direction, focal points, mobile crops, section rhythm, and next-section visibility.
- [x] Reduce boxy composition and excessive separators.
- [x] Add polished fallbacks for missing, disabled, draft, or incomplete sections.
- [x] Verify wide-desktop layouts do not create oversized empty areas.

### Backend And Admin Dependencies

- [x] Homepage section CRUD, ordering, enabled state, product/collection assignment, media, and preview.
- [x] Add desktop/mobile focal-point controls.
- [x] Add desktop/mobile crop-ratio controls.
- [x] Add stronger section validation so incomplete published blocks cannot reach the storefront.
- [x] Add version history, scheduling, rollback, and publication audit.
- [x] Revalidate storefront caches immediately after publication changes.

### Verification

- [x] Test every homepage section type in draft, preview, published, disabled, and incomplete states.
- [x] Add pure storefront state tests for all homepage section types, draft/disabled exclusion, invalid settings, and incomplete category media tiles.
- [x] Add homepage merchandising layout regression tests for section order, full-bleed banner width, slider breakpoints, and drag behavior.
- [x] Add homepage publication and visual-regression tests.

## Priority 3: Shop, Collections, Filters, And Search

### Storefront

- [x] Responsive 4-column laptop and 5-column wide-desktop product grid.
- [x] Side-panel filters, sorting, counts, URL state, mobile apply behavior, and load-more foundations.
- [x] Predictive search, keyboard navigation, recent searches, and dedicated results page.
- [x] Audit filters against every imported category, collection, color, size, material, and tag.
- [x] Improve selected-filter summaries and long-value wrapping on mobile.
- [x] Review product-card crop consistency across the complete catalog.
- [x] Add smart product-card image fit for tall imported studio media and raise card image quality.
- [x] Refine quick view without duplicating the full product page.
- [x] Add stronger recovery paths for empty filter states.
- [x] Add stronger recovery paths for empty search and unavailable categories.

### Backend And Admin Dependencies

- [x] Category, hierarchy, collection, color, size, custom-size, and tag CRUD.
- [x] Search query and result-click event storage.
- [x] Add filter visibility/order controls per collection and category.
- [x] Add collection product ordering, pinned products, scheduling, and publication state.
- [x] Add search analytics for popular queries, zero results, click-through, and conversion.
- [x] Add search synonyms, redirects, boosts, buried products, and pinned results.
- [x] Prevent empty filters and invalid imported attributes from reaching customers.

### Verification

- [x] Add collection/filter integration tests using real imported catalog data.
- [x] Add shop filter integration tests using real imported category, color, and size data.
- [x] Add collection filter integration tests after imported products are assigned to collections.
- [x] Add search ranking, zero-result, URL-state, and browser-navigation tests.

## Priority 4: Product Detail, Variants, Fit, And Media

### Storefront

- [x] Per-color gallery, image zoom, fullscreen media, swipe, keyboard controls, and video foundations.
- [x] Variant-aware color, size, SKU, stock, backorder, quantity, and sticky purchase controls.
- [x] Product details, shipping, returns, reviews, recommendations, and recently viewed foundations.
- [x] Add category-specific fit guidance, model reference copy, and product dimension notes on PDP.
- [x] Audit gallery fidelity, source resolution, crop, zoom, and video behavior for all image profiles.
- [x] Improve unavailable-variant explanations and recovery suggestions.
- [x] Verify long titles, sale prices, large size sets, one-size products, and sparse galleries.
- [x] Refine mobile information hierarchy and thumb reach.

### Backend And Admin Dependencies

- [x] Variant-first products with per-color/per-size SKU, inventory, gallery, hover image, and video.
- [x] Product SEO, fabric, care, tags, scheduling, preview, and audit foundations.
- [x] Add fit guidance, model measurement, product dimension, and fit-note fields to Prisma and product editor.
- [x] Define and enforce a field-by-field product editor to storefront mapping contract.
- [x] Validate imported color/size combinations rather than generating invalid variants.
- [x] Add catalog-quality warnings for missing galleries, low resolution, duplicate media, and inconsistent ratios.
- [x] Add focal points, alt text propagation, original preservation, and non-destructive image derivatives.
- [x] Prevent draft, scheduled, archived, or deleted products from leaking into search, sitemap, or recommendations.

### Verification

- [x] Add field-mapping tests from admin product data to product-page output.
- [x] Add variant price, inventory, SKU, media, and publication tests.
- [x] Add visual image-quality tests for light, dark, detailed, and low-contrast products.

## Priority 5: Cart, Inventory, And Availability

### Storefront

- [x] Persistent cart drawer/page, quantity, removal, undo, variant editing, coupons, notes, and totals.
- [x] Reservation expiry feedback and guest/account cart merge foundations.
- [x] Improve expired-stock, network-loss, and session-recovery UI.
- [x] Review cart density on small phones and with long product names.
- [x] Add express checkout controls where supported.

### Backend And Admin Dependencies

- [x] Variant stock, reserved stock, thresholds, backorders, logs, adjustments, import, and export.
- [x] Fix existing negative `reservedStock` anomalies and prevent recurrence.
- [x] Add atomic oversell protection under concurrent carts and checkout.
- [x] Add reservation expiration worker and admin visibility.
- [x] Add configurable backorder limits, dates, and customer messaging.
- [x] Trigger back-in-stock workflows only from committed inventory transitions.
- [x] Add inventory reconciliation and anomaly alerts.

### Verification

- [x] Add inventory-to-product-to-cart-to-checkout concurrency tests.
- [x] Test cart recovery after refresh, expiry, network failure, and authentication changes.

## Priority 6: Checkout, Payments, Shipping, And Promotions

### Storefront

- [x] Guest/account checkout, saved addresses, delivery selection, coupons, order notes, recovery, and confirmation.
- [x] Stripe and cash-on-delivery foundations.
- [x] Add address autocomplete.
- [x] Add PayPal.
- [x] Add Tabby and/or Tamara for UAE customers.
- [x] Improve payment failure, cancelled payment, expired inventory, and retry experiences.
- [x] Test mobile keyboard, autofill, validation focus, and thumb reach.
- [x] Implement gift-card entry only after the backend ledger exists.

### Backend And Admin Dependencies

- [x] Server-created orders, payments, customers, inventory changes, delivery records, and COD controls.
- [x] Coupon CRUD, expiry, limits, minimum amounts, usage counts, and free shipping.
- [x] Add admin shipping zones, methods, rates, thresholds, and delivery estimates.
- [x] Add payment-method configuration, ordering, and customer-facing copy.
- [x] Add payment capture, void, dispute, reconciliation, and webhook-attempt visibility.
- [x] Add coupon customer/product/category/collection eligibility and stacking rules.
- [x] Build gift-card issuance, balance ledger, expiry, redemption, refund, and admin controls.
- [x] Add address-provider configuration and fallback handling.

### Verification

- [x] Test successful, failed, cancelled, retried, and duplicate payment flows.
- [x] Test coupon/gift-card totals from admin configuration through final order reconciliation.
- [x] Verify checkout and payment webhook idempotency.

## Priority 7: Customer Account, Orders, And Tracking

### Storefront

- [x] Registration, sign-in, reset, verification, profile, addresses, preferences, privacy, and wishlist foundations.
- [x] Order history, details, invoices, reorder, authenticated tracking, and guest tracking.
- [x] Mobile account section navigation and active-order tracking list.
- [x] Reduce remaining account dashboard density and improve small-screen navigation.
- [x] Add social sign-in after providers are configured.
- [x] Add customer session/device management.
- [x] Improve wishlist variant intent and move-to-cart selection.

### Backend And Admin Dependencies

- [x] Customer profiles, guest orders, lifetime value, addresses, notes, tags, segmentation, and merge foundation.
- [x] Expose communication preferences, fit preferences, alerts, privacy requests, and deletion state to admin.
- [x] Harden account/guest merge conflict handling across orders, cart, wishlist, alerts, and preferences.
- [x] Store customer/order preferred locale and use it for admin-triggered transactional notifications.
- [x] Add social-provider configuration and account-linking rules.
- [x] Add privacy request queue, retention, legal hold, completion, and audit controls.

### Verification

- [x] Add customer/account/admin synchronization tests.
- [x] Test session expiry, merge, privacy export, deletion, and multi-device behavior.

## Priority 8: Returns, Exchanges, Refunds, And Support

### Storefront

- [x] Dedicated return/exchange route with resolution-specific reasons.
- [x] Same-product/same-color replacement-size selection.
- [x] Partial quantity selection for multi-unit lines.
- [x] Return eligibility guidance and server-backed availability.
- [x] Account return list, lifecycle status, support notes, and customer reply workflow.
- [x] Add evidence/photo uploads for damaged, missing, or incorrect items.
- [x] Add linked replacement-order status and tracking visibility.
- [x] Add customer-visible pickup windows, reverse tracking, and authenticated return labels.
- [x] Add customer-visible refund progress synchronized with provider state.
- [x] Add customer cancellation before pickup processing, with reserved-stock release.

### Backend And Admin Dependencies

- [x] Structured return requests, items, events, notes, timestamps, and external references.
- [x] Admin queue, filters, detail, approve/reject/cancel, request-information, and lifecycle actions.
- [x] Admin-configurable policy, delivery requirement, window, late defects, and available resolutions.
- [x] Server-enforced eligibility and replacement inventory reservation.
- [x] Reservation release after rejection/cancellation.
- [x] Add private evidence records, ownership-checked delivery, file signature/type/size validation, and admin evidence review.
- [x] Add fail-closed production malware scanning before evidence persistence, with development-only explicit skip mode.
- [x] Create atomic linked replacement orders, consume reserved stock, and record inventory history.
- [x] Create separate return-shipment records, pickup windows, carrier references, and printable labels.
- [x] Add warehouse receipt progression with structured condition, disposition, notes, and inspector audit data.
- [x] Add Stripe refund submission, idempotency, webhook reconciliation, COD manual confirmation, and linked refund records.
- [x] Add provider-neutral carrier synchronization, attempt logs, exponential retries, manual fallback, and admin error visibility.
- [x] Add signed, replay-safe carrier webhooks with controlled lifecycle transitions and tracking reconciliation.
- [x] Send idempotent customer lifecycle emails and optional admin alerts for important return activity.

### Verification

- [x] Lifecycle transition and policy unit tests.
- [x] Verify replacement creation links the order and reconciles reserved inventory.
- [x] Verify malware scanner and carrier adapter success, failure, manual, and fail-closed states.
- [x] Add request-to-decision-to-pickup-to-replacement/refund end-to-end tests.
- [x] Verify inventory, payment, order, email, and audit records reconcile after every outcome.

## Priority 9: Wishlist, Recommendations, Reviews, And Product Alerts

### Storefront

- [x] Wishlist, recently viewed, recommendations, reviews, back-in-stock, and price-drop foundations.
- [x] Improve wishlist variant selection and move-to-cart behavior.
- [x] Add recommendation and alert feedback states.
- [x] Add review media after moderation support exists.

### Backend And Admin Dependencies

- [x] Review moderation and verified-purchase submission.
- [x] Product alert subscription model and APIs.
- [x] Add recommendation strategy controls and manual overrides.
- [x] Add alert subscriber queue, suppression, cooldown, deduplication, retry, and conversion reporting.
- [x] Trigger alerts from actual inventory and price changes.
- [x] Add review media moderation, customer edit window, admin response, abuse reporting, and audit history.
- [x] Add review-request automation after delivered orders.

### Verification

- [x] Test recommendation attribution, alert deduplication, unsubscribe, and conversion.
- [x] Test review moderation through storefront aggregate and structured data.

## Priority 10: Content, Help, And CMS

### Storefront

- [x] Redesign Story with premium editorial composition.
- [x] Redesign Fabric Guide with scannable comparisons and care guidance.
- [x] Build searchable categorized FAQs.
- [x] Improve UAE Shipping, Returns, Contact, Privacy, Terms, size guide, and care guide pages.
- [x] Add order-aware support shortcuts and validated contact states.

### Backend And Admin Dependencies

- [x] `PageContent` model foundation.
- [x] Add page-content admin navigation and structured editor.
- [x] Add FAQ, support-category, policy, editorial, and legal block types.
- [x] Add draft, preview, publish, scheduling, versions, rollback, and audit history.
- [x] Sanitize rich content and validate links/media.
- [x] Add contact delivery, spam protection, case creation, and admin queue.

### Verification

- [x] Test draft/published content, preview, sanitization, links, forms, and responsive composition.

## Priority 11: Email, Newsletter, Marketing, And Automation

### Storefront

- [x] Newsletter signup and communication preference foundations.
- [x] Transactional order/account email foundations.
- [x] Improve signup, preference, unsubscribe, suppression, and failure feedback.

### Backend And Admin Dependencies

- [x] SMTP/Resend delivery records, newsletter subscribers, Klaviyo/Mailchimp sync, and workflow models.
- [x] Welcome, abandoned-cart, and post-purchase workflow foundations.
- [x] Add template editor, preview, test send, versioning, and localization.
- [x] Add operational queue states: scheduled, processing, sent, failed, retrying, and suppressed.
- [x] Connect workflows to explicit lifecycle events and consent rules.
- [x] Add bounce, complaint, unsubscribe, provider reconciliation, and failure alerts.
- [x] Add automation conversion and delivery reporting.

### Verification

- [x] Test lifecycle event to queue to provider to delivery/suppression reconciliation.

## Priority 12: Analytics, Consent, SEO, And Localization

### Storefront

- [x] Add consent manager and persisted consent choices.
- [x] Configure GA4, Meta Pixel, and TikTok Pixel.
- [x] Complete canonical, Open Graph, social image, organization, website, breadcrumb, FAQ, search, product, and offer metadata.
- [x] Add English/Arabic routing, shell translations, language switcher behavior, and RTL foundation.
- [x] Apply saved Arabic product, category, collection, and homepage translations to storefront catalog data.
- [x] Complete Arabic page/product/content translations and localized validation messages.

### Backend And Admin Dependencies

- [x] Database-derived commerce analytics and search/filter events.
- [x] Define one analytics event contract shared by storefront, server, and reporting.
- [x] Add admin funnels, attribution, event diagnostics, and consent-aware reporting.
- [x] Add SEO fields/previews for categories, collections, pages, and social images.
- [x] Add indexation controls and prevent private/filtered URL leakage.
- [x] Add localized catalog schema tables and admin Arabic translation coverage workflow.
- [x] Add admin translation lookup/upsert API for products, categories, collections, and homepage sections.
- [x] Add admin create/edit forms for product, category, collection, and homepage translations.
- [x] Add localized metadata, canonical, and `hreflang` support for indexed storefront URLs.
- [x] Add localized automation email rendering, Arabic default templates, RTL fallback copy, and locale-aware email links.
- [x] Localize account security, shipping, refund, return, and support notification emails.

### Verification

- [x] Prevent duplicate purchase and lifecycle analytics events.
- [x] Smoke-test Arabic home, shop, and product URLs after localization routing changes.
- [x] Verify rendered English/Arabic/x-default alternate links on product pages.
- [x] Validate sitemap, indexation, structured data, consent, and RTL ecommerce journeys.

## Priority 13: Accessibility, Performance, Security, And Deployment

### Storefront And Admin Quality

- [ ] Reach WCAG 2.2 AA for storefront and critical admin workflows.
- [ ] Verify headings, landmarks, labels, live regions, focus, contrast, reduced motion, and 200% zoom.
- [ ] Establish Lighthouse baselines and reach 90+ target scores.
- [ ] Measure mobile LCP, INP, and CLS under throttled conditions.
- [ ] Optimize LCP priority, responsive sizing, lazy loading, fonts, JavaScript, and stable media dimensions.

### Backend And Operations

- [x] Admin authentication, RBAC, route permissions, throttling, and activity logs.
- [ ] Add production session rotation, revocation, device visibility, and CSRF protection.
- [x] Add CSP and browser security header coverage.
- [ ] Add secret audit, rich-content sanitization, and security scanning.
- [ ] Add centralized jobs for schedules, reservations, automation, alerts, and retries.
- [ ] Add cloud media storage/CDN while preserving original asset records.
- [ ] Add structured logs, error monitoring, source maps, uptime, and business-health alerts.
- [ ] Configure production database, backups, restore drill, migrations, deployment, rollback, and disaster recovery.

### Verification

- [x] Add reusable Playwright accessibility and security-header release gates.
- [ ] Add screenshot, performance, security scanning, and remaining critical-flow release gates.
- [x] Confirm `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run test:e2e:a11y`, and `npm run build` pass before release.

---

## Current Execution Order

1. [x] Finish Returns/Exchanges: evidence, linked replacement orders, pickup, warehouse states, and notifications.
2. [ ] Complete Product Detail and catalog field/media audit.
3. [ ] Complete Shop/Collections imported-catalog and filter audit.
4. [ ] Complete Cart/Checkout mobile and recovery audit.
5. [ ] Build admin-backed support/content pages.
6. [ ] Complete global responsive and accessibility audit.
7. [ ] Complete analytics, SEO, localization, performance, security, and deployment hardening.

## Master Definition Of Done

- [ ] Customer and admin terminology and statuses match.
- [ ] Structured database records are the source of truth, not notes or tags.
- [ ] Authorization, eligibility, state transitions, price, and inventory are validated server-side.
- [ ] External side effects are idempotent, observable, retryable, and reconcilable.
- [ ] Failures and recovery actions are visible to the responsible customer or operator.
- [ ] Audit logs, notifications, and analytics emit exactly once where required.
- [ ] Mobile, desktop, themes, accessibility, integration, and end-to-end checks pass.
