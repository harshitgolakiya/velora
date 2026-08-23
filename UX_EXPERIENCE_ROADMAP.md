# Velora Experience Improvement Roadmap

Last updated: 2026-08-22

## Purpose

This document is the working source of truth for customer-experience improvements across the Velora storefront. Work through one numbered improvement at a time. Do not mark an improvement complete until its acceptance criteria and verification checks pass.

## Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete
- `[!]` Blocked or requires a business decision

## Working Rules

1. Preserve existing business functionality unless the improvement explicitly replaces it.
2. Review desktop, tablet, 390px mobile, 360px mobile, light mode, dark mode, English, Arabic, and RTL where relevant.
3. Run TypeScript, ESLint, focused tests, and a production build after each completed improvement.
4. Use real routes and route-specific rendering for major destinations. Do not simulate navigation by hiding a complete page with CSS.
5. Keep all customer-facing copy in the localization layer.
6. Update this document with implementation notes and verification results after every improvement.

---

## Improvement 1 — Confirm and Unify Brand Direction

Status: `[x]` Complete

### Problem

The project description presents Velora as premium activewear, while the current catalog and storefront present dresses, skirts, eveningwear, tailoring, and general womenswear. Product photography and copy also mix activewear, marketplace imagery, occasionwear, and stock photography.

### Decision Required

Confirmed direction:

- Premium activewear for workouts, Pilates, yoga, tennis, active days, everyday wear, and casual outings.

### Scope

- Brand proposition and homepage messaging
- Product categories
- Collection names
- Product photography direction
- Navigation terminology
- Fit and product-detail language
- Search suggestions
- Metadata and social previews
- English and Arabic copy

### Acceptance Criteria

- A customer can understand what Velora sells within the first five seconds.
- Homepage, navigation, shop, search, PDP, footer, account fit settings, and metadata use the same positioning.
- No unrelated marketplace or placeholder imagery remains on customer-facing routes.
- Category and collection terminology is consistent in English and Arabic.

### Implementation Notes

- Replaced the client-preview catalog with 18 coherent activewear products across Tops, Sports Bras, Jackets, Leggings, and Accessories.
- Added Pilates Studio, Court Club, Everyday Motion, and Training Core collections with matching navigation and merchandising language.
- Downloaded eight Pexels editorial images into local storefront assets and recorded their sources. Product-specific campaign photography remains a pre-launch replacement task.
- Reset and reseeded the local demo database so no legacy eveningwear products remain in the client preview.
- Verified with ESLint, TypeScript, 301 automated tests, and a successful 118-page production build.

---

## Improvement 2 — Repair Navigation and Route Consistency

Status: `[x]` Complete

### Problem

Some storefront links still target obsolete hash-based account sections, while the account now uses dedicated routes. Route localization also varies between components.

### Scope

- Replace `/account#wishlist` with `/account/wishlist`.
- Audit header, mobile menu, footer, emails, search, recommendations, cart, checkout, account, and order links.
- Ensure Arabic routes retain the `/ar` prefix.
- Ensure active navigation states work on nested routes.
- Verify browser back/forward behavior.

### Acceptance Criteria

- No obsolete account hash links remain.
- All customer navigation reaches the expected destination.
- English and Arabic navigation preserve locale.
- Active states correctly represent the current page.
- Back and forward navigation work without stale overlays or incorrect state.

### Implementation Notes

- Removed the obsolete account sign-in destination and confirmed no account hash routes remain.
- Added a shared locale-aware customer URL helper and applied it to product cards, predictive search, search results, breadcrumbs, cart, checkout, authentication callbacks, account redirects, order details, and return flows.
- Replaced full-page account navigation in the header with Next.js client navigation so browser history and mounted storefront state behave consistently.
- Updated collection navigation checks to use the active Pilates Studio demo route.
- Verified with ESLint, TypeScript, 301 automated tests, and a successful 118-page production build.

---

## Improvement 3 — Add Route Loading and Error Experiences

Status: `[x]` Complete

### Problem

Database-backed routes do not have destination-specific loading and error states, which can make navigation feel frozen or abrupt.

### Scope

- Shop
- Collections
- Product detail
- Search
- Checkout
- Account sections
- Order details and returns
- Shared recovery actions

### Acceptance Criteria

- Important dynamic routes show layout-matched skeletons immediately.
- Loading states do not cause large layout shifts.
- Errors provide Retry plus a relevant safe destination.
- Header, footer, locale, and theme remain stable during loading and recovery.
- Error messages do not expose internal implementation details.

### Implementation Notes

- Added route-specific error boundaries for shop, collections, product detail, search, checkout, account, order details, and return requests.
- Added layout-matched loading states for checkout, account sections, order details, and return requests while retaining and validating the existing catalog skeletons.
- Recovery states provide Retry and a contextually safe destination, preserve the active locale, and use Arabic recovery copy on Arabic routes.
- Error screens log exceptions for diagnostics without exposing exception messages, stack traces, or implementation details to customers.
- Verified with ESLint, TypeScript, 301 automated tests, and a successful 118-page production build.

---

## Improvement 4 — Restructure Checkout Into Clear Stages

Status: `[x]` Complete

### Problem

Checkout contains strong functionality but presents contact, delivery, shipping, payment, discount, gift-card, and review controls in one cognitively heavy form.

### Proposed Stages

1. Contact
2. Delivery
3. Payment
4. Review

### Scope

- Visible checkout progress
- Completed-stage summaries
- Field-level validation
- Saved-address selection
- Shipping-method clarity
- Express checkout positioning
- Payment-provider feedback
- Mobile order-summary disclosure
- Coupon and gift-card disclosure
- Submission and recovery states

### Acceptance Criteria

- Customers always know their current checkout stage.
- Invalid fields show specific guidance beside the field.
- Completed stages can be reviewed and edited.
- Mobile checkout does not require unnecessary scrolling between the form and totals.
- Coupon and gift-card controls do not dominate the primary journey.
- Payment failure preserves entered customer information.

### Implementation Notes

- Restructured checkout into Contact, Delivery, Payment, and Review stages with a persistent progress control.
- Added stage-specific validation, editable completed-stage summaries, saved-address support within Delivery, and clearer shipping and payment selection.
- Added a compact mobile order-summary disclosure and moved coupon and gift-card controls into secondary disclosures.
- Persisted checkout form values in session storage so cancellation and recoverable payment failures retain customer input; values clear after a successful handoff.
- Provider or shipping availability errors now return customers directly to the relevant stage without clearing their data.
- Verified with ESLint, TypeScript, 301 automated tests, and a successful 118-page production build.

---

## Improvement 5 — Clarify Cart Drawer, Cart Page, and Checkout Responsibilities

Status: `[x]` Complete

### Intended Roles

- Cart drawer: quick confirmation and checkout handoff
- Cart page: detailed editing and delivery planning
- Checkout: purchase completion

### Scope

- Remove unnecessary repeated controls.
- Keep coupon state synchronized.
- Clarify delivery fees and estimates.
- Improve item editing and removal feedback.
- Strengthen empty-cart recovery.
- Prevent duplicated recommendations from overwhelming the journey.

### Acceptance Criteria

- Customers do not need to enter or manage the same code repeatedly.
- Totals remain consistent across drawer, cart, and checkout.
- Cart drawer remains fast and compact.
- Cart page supports detailed editing without resembling checkout.
- Checkout focuses on delivery and payment completion.

### Implementation Notes

- Simplified the cart drawer to quick confirmation, compact totals, a direct checkout handoff, and a clear route to the full bag.
- Removed coupon entry and order-note editing from the drawer; these detailed controls now live on the cart page only.
- Limited drawer recommendations to two products so they do not overpower the checkout handoff.
- Added clearer delivery-fee guidance to the cart summary and retained detailed variant, quantity, note, coupon, and removal controls on the cart page.
- Synchronized coupons applied during checkout back to the shared cart state, preserving consistent discounts and totals when navigating between surfaces.
- Verified with ESLint, TypeScript, 301 automated tests on an isolated seeded database, and a successful 118-page production build.

---

## Improvement 6 — Improve Product Detail Purchase Confidence

Status: `[x]` Complete

### Customer Questions to Answer

- What does it look like?
- How does it fit?
- Is my size available?
- When will it arrive?
- Can I return it?

### Scope

- Gallery and color relationship
- Size selection and fit guidance
- Model measurements
- Stock, low-stock, and backorder messaging
- Delivery estimate
- Returns summary near Add to Bag
- Materials and care disclosures
- Reviews and recommendation hierarchy
- Mobile sticky purchase behavior

### Acceptance Criteria

- Size and availability are clear before adding to the bag.
- Delivery and return expectations are visible near the purchase action.
- Color changes update the relevant media predictably.
- Backorder states cannot be mistaken for immediate availability.
- Sticky purchase controls never cover important content.

### Completed

- Made every selected variant state explicit before purchase: in stock, low stock, unavailable, or backordered.
- Changed backordered purchase actions to clearly say “Pre-order” and strengthened the delayed-shipping treatment so it cannot be confused with immediate availability.
- Added concrete UAE delivery timing, the 14-day returns summary, secure-payment reassurance, and fit guidance beside the purchase action in English and Arabic.
- Added a compact materials-and-care disclosure beside the CTA while retaining the full product-information tabs below.
- Linked the rating summary directly to customer reviews and preserved predictable color-to-gallery updates through the selected-color media state.
- Kept the responsive sticky purchase controls clear of lower product content and localized Buy Now navigation to checkout.
- Verified with ESLint, 301 automated tests, and a successful 118-page production build with TypeScript validation.

---

## Improvement 7 — Upgrade Search and Product Discovery

Status: `[x]` Complete

### Scope

- Correct malformed query quotation characters.
- Complete search localization.
- Recent and popular searches
- Product thumbnails in suggestions
- Category, collection, product, and help grouping
- Typo tolerance and suggested corrections
- Better no-results recovery
- Filter counts and applied-filter controls
- Persistent filters after returning from a PDP
- Customer-oriented filters such as occasion, use, fit, or support level depending on brand direction

### Acceptance Criteria

- Search works consistently in English and Arabic.
- No-results states offer relevant alternatives.
- Customers can see and remove applied filters individually.
- Filter and sort state survives product-detail navigation.
- Suggestions clearly distinguish products from destinations and help content.

### Completed

- Corrected search normalization to retain Arabic letters and numbers instead of reducing Arabic queries to an empty search.
- Added explicit locale-aware predictive API requests so Arabic search uses the translated catalog, categories, collections, and help content.
- Localized the predictive dialog and results-page experience, including headings, states, actions, recent searches, and Arabic popular-search shortcuts.
- Added typo recovery with catalog-derived “Did you mean?” suggestions in both predictive and full search experiences.
- Preserved the existing grouped product, category, collection, and help results with product thumbnails and clear content labels.
- Strengthened zero-result recovery with suggested queries, category routes, help destinations, and a localized shop-all action.
- Confirmed applied-filter chips can be removed individually, total match counts remain visible, customer-oriented type/style/material discovery is available, and URL state plus scroll position survive PDP navigation.
- Verified with ESLint, TypeScript, 303 automated tests, and a successful 118-page production build.

---

## Improvement 8 — Rebuild Homepage as Modular Merchandising Sections

Status: `[x]` Complete

### Problem

The homepage is a large monolithic page file, making visual consistency and campaign updates difficult.

### Proposed Components

- Homepage hero
- Category discovery
- Collection spotlight
- Product rail
- Editorial story
- Service benefits
- Newsletter handoff

### Acceptance Criteria

- Each section has a focused responsibility and reusable interface.
- CMS and fallback content use the same presentation rules.
- Spacing, headings, image ratios, and CTAs follow one system.
- The first viewport communicates brand, product category, and primary action.
- Homepage sections remain stable across content changes.

### Completed

- Reduced the homepage route from a 998-line implementation to a focused composition entry point.
- Moved the complete merchandising system into a dedicated homepage section module with reusable interfaces for the hero, category discovery, collection spotlight, product rail, collection story, editorial story, newsletter handoff, social proof, and service benefits.
- Kept CMS content and fallback content on the same section implementations, crop rules, product-selection rules, spacing system, and CTA treatment.
- Preserved the activewear-first opening viewport, local campaign media, responsive image focal points, and existing CMS publication behavior.
- Kept supporting CMS section dispatch centralized so new section ordering and content changes do not expand the route component again.
- Verified with ESLint, TypeScript, all 303 automated checks on a fully seeded isolated database, and a successful 118-page production build.

---

## Improvement 9 — Complete Localization and RTL Behavior

Status: `[x]` Complete

### Scope

- Shop and collection headings
- Search page
- Breadcrumbs
- Empty and error states
- Checkout placeholders and provider messages
- Mobile featured content
- Product statuses
- Account device labels
- Date, number, currency, and plural formatting
- RTL arrows, progress indicators, galleries, and carousels

### Acceptance Criteria

- No customer-facing English is hardcoded on Arabic routes unless it is a brand or provider name.
- Locale persists across all internal navigation.
- Directional controls behave correctly in RTL.
- Arabic layouts do not clip, overflow, or misalign at supported widths.

### Completed

- Localized shop and collection headings, breadcrumbs, loading states, filter groups, filter actions, sorting choices, match counts, and no-filter-results recovery.
- Completed the localized search surfaces in Improvement 7 and retained locale-aware category, collection, product, and help navigation.
- Localized checkout name/city placeholders, gift-card balance messaging, coupon-expiry dates, and customer-facing AED values.
- Localized product rating, installment, availability-recovery, fit, delivery, returns, materials, care, stock, and pre-order messaging.
- Added locale-aware number and AED formatting and applied it across product cards, PDP actions, search suggestions, and checkout totals.
- Localized the homepage’s motion and activity discovery content and ensured all homepage merchandising links preserve the active locale.
- Reversed breadcrumb separators, CTA arrows, carousel direction, carousel controls, gallery keyboard navigation, swipe behavior, and full-screen gallery controls for RTL.
- Retained localized generic route-error recovery so Arabic users do not receive English error-state copy.
- Verified with ESLint, TypeScript, all 303 automated tests, and a successful 118-page production build.

---

## Improvement 10 — Extract Account Sections Into Focused Components

Status: `[x]` Complete

### Current State

The account uses separate routes, and only the selected route is rendered. Most account UI and client behavior still live in one large dashboard component.

### Components to Extract

- `AccountNavigation`
- `AccountOverview`
- `AccountOrders`
- `AccountReturns`
- `AccountWishlist`
- `AccountAddresses`
- `AccountSettings`

### Acceptance Criteria

- Each account route imports only the UI and client behavior it requires.
- Shared account data mapping is typed and reused.
- No route mounts unrelated account sections.
- Wishlist, addresses, sessions, preferences, and privacy actions continue to work.
- Direct navigation and refresh work for every account route.

### Completed

- Extracted `AccountNavigation` with shared desktop tabs, mobile selection, localized routes, and active-page semantics.
- Added focused account route components for overview, orders, returns, wishlist, addresses, and settings; each route now imports its matching component explicitly.
- Added a shared authenticated account-section shell so direct navigation and refresh use the same session, redirect, heading, and locale behavior.
- Added a typed account-dashboard mapper and removed duplicated user, address, order, return, and wishlist transformation logic from the account entry points.
- Limited wishlist hydration and persistence to overview/wishlist routes and device-session loading to settings, preventing unrelated account routes from issuing those requests.
- Kept catalog loading limited to overview and wishlist, while orders, returns, addresses, and settings avoid loading product data.
- Preserved profile, communication, fit, sessions, privacy, wishlist, address, order, and return behavior and API contracts.
- Removed the superseded generic account-section page entry after migrating every account route to its focused component.
- Verified with ESLint, TypeScript, all 303 automated tests, and a successful 118-page production build.

---

## Improvement 11 — Add Contextual Support Throughout the Journey

Status: `[x]` Complete

### Scope

- PDP product guidance
- Cart and checkout assistance
- Order-specific support
- Return and tracking suggestions
- Contact-form categories
- Expected response time
- Prepopulated customer and order context
- Relevant FAQ suggestions before case creation

### Acceptance Criteria

- Customers can reach relevant help without searching the footer.
- Signed-in order support prepopulates known information.
- Support handoffs preserve the page or order context.
- Self-service options appear before case creation without blocking contact.

---

## Improvement 12 — Establish a Final Experience QA Gate

Status: `[x]` Complete

### Required Journeys

- Home → Shop → PDP → Add to bag → Checkout
- Search → PDP → Back to results
- Guest checkout
- Signed-in checkout with saved address
- Registration and email verification
- Account orders, wishlist, addresses, and settings
- Order tracking
- Return request and follow-up
- Contact support
- Empty, loading, success, failure, and expired-token states

### Required Viewports and Modes

- Desktop
- Tablet
- 390px mobile
- 360px mobile
- Light mode
- Dark mode
- English
- Arabic and RTL
- Reduced motion
- Keyboard-only navigation

### Acceptance Criteria

- No blocked journeys or broken links.
- No accidental horizontal page overflow.
- No overlays stack incorrectly.
- Focus is visible and restored correctly.
- Status and validation feedback is accessible.
- Production build, TypeScript, ESLint, focused tests, and experience smoke tests pass.

---

## Recommended Work Order

1. Improvement 1 — Brand direction
2. Improvement 2 — Navigation and route consistency
3. Improvement 3 — Loading and error experiences
4. Improvement 4 — Checkout stages
5. Improvement 5 — Cart responsibilities
6. Improvement 6 — PDP confidence
7. Improvement 7 — Search and discovery
8. Improvement 8 — Homepage modularization
9. Improvement 9 — Localization and RTL
10. Improvement 10 — Account component extraction
11. Improvement 11 — Contextual support
12. Improvement 12 — Final experience QA

## Progress Log

Add a dated entry after every completed improvement.

### 2026-08-22

- Created this roadmap from a fresh project-wide experience audit.
- Confirmed Velora's direction as premium activewear for workouts, Pilates, yoga, tennis, active days, everyday wear, and casual outings.
- Started Improvement 1.
- Updated the storefront shell, desktop and mobile navigation, wishlist destination, homepage value proposition and movement edits, search prompts, shop messaging, story fallback, footer positioning, metadata, and activewear merchandising suggestions.
- Improvement 1 remains in progress because the legacy fallback catalog and any persisted CMS content still need a controlled taxonomy, product-copy, collection, and media migration against the real inventory.
- Live database audit found 24 published legacy-fashion products. Sports Bras and Leggings categories currently contain zero products; published inventory still includes gowns, corset/skirt sets, dresses, jeans, fashion tees, and coats, assigned to Evening Edit, City Layers, and Soft Tailoring.
- Improvement 1 cannot be completed truthfully until the real activewear product records and images are supplied or imported. Existing fashion products must not be relabeled as activewear because their titles, descriptions, variants, and media would misrepresent the inventory.
- Verification: TypeScript, ESLint, 19 focused tests, and the 123-route production build passed.

### 2026-08-23

- Completed Improvement 11 with contextual support handoffs on product, cart, checkout, tracking, order-detail, and return journeys.
- Contact requests now preserve category, source page, product, signed-in customer, and order context; relevant self-service guidance and the expected response time appear before case creation without blocking contact.
- Verification: TypeScript, focused ESLint, all 303 unit/integration tests, and the 118-route production build passed.

- Completed Improvement 12 and closed the experience roadmap.
- Updated release journeys to the activewear demo catalog and staged checkout, removed fragile network-idle assumptions, and refreshed screen-reader expectations to match the current experience.
- Fixed an admin authentication callback that could switch hosts and lose the new session, increased header-brand contrast over hero media, and restored accessible success-status contrast in light and dark themes.
- Verification: TypeScript, focused ESLint, 303 unit/integration tests, critical purchase/search/route-protection journeys, 19 contrast tests, seven customer-facing screen-reader journeys, accessibility checks across core routes and 200% dark-mode zoom, isolated authenticated-admin accessibility, and the 118-route production build passed.
