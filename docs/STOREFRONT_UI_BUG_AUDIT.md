# Storefront UI Bug Audit

Date: 2026-07-09

Scope: customer-facing storefront only. Admin panel, roadmap files, and handoff files are intentionally out of scope.

Evidence captured in:
- `artifacts/ui-audit/home-desktop-dark.png`
- `artifacts/ui-audit/home-mobile-dark.png`
- `artifacts/ui-audit/shop-desktop-dark.png`
- `artifacts/ui-audit/shop-mobile-dark.png`
- `artifacts/ui-audit/pdp-mobile-dark-top.png`
- `artifacts/ui-audit/pdp-desktop-dark-scroll.png`
- `artifacts/ui-audit/quick-view-desktop-dark.png`
- `artifacts/ui-audit/audit-results.json`
- `artifacts/ui-audit/interaction-results.json`

## Current Implementation Status

Updated: 2026-07-24

Verified storefront fixes:
- Homepage hero now uses the first viewport height, and hero/spotlight content share the same layout rail.
- Shop grid now renders 12 products initially instead of 4.
- Header utility icons use a consistent compact 36px rhythm; the theme toggle no longer appears as the odd bordered icon, and cart/wishlist badges sit inside their own icon buttons instead of floating outside the cluster.
- Product card, PDP gallery, quick-view, and full-screen gallery controls use scoped fixed-contrast light controls instead of relying on broad dark-mode utility overrides.
- The broad dark-mode overrides for `.bg-white`, `.hover:bg-white`, and `.text-[#111315]` were removed or narrowed.
- PDP mobile/desktop sticky purchase bars are gated and no longer cover the top product view by default.
- Quick view modal positioning and media loading were stabilized.
- Product rails now expose disabled/end-state feedback and a progress indicator.
- Cart and checkout empty-state CTAs use the darker storefront CTA treatment.
- Cart drawer empty state is top-aligned, has a visible close affordance, and shows recommendations without burying the CTA.
- Product swatches have a shared storefront swatch style and larger touch/visual targets.
- PDP packshot media is enlarged for narrow/tall product images.
- Desktop shop filters now open inline panels instead of a side drawer; mobile keeps the drawer pattern.
- Mobile menu density and language/theme row spacing were tightened and verified at 360px.
- Quick view now opens from the first click instead of making the first click only lazy-load the dialog code.
- Mobile filter drawer now opens from the first click instead of waiting for a lazy-loaded drawer component.
- Search sheet keeps a stable body height during first-open loading and no longer clips the support links at the bottom.
- Desktop filter panels now occupy a full-width row under the filter toolbar instead of being squeezed into the toolbar flex line.
- Newsletter signup no longer opens before the privacy choice exists, preventing stacked first-visit popups on mobile.
- Storefront overlays/drawers now layer above the privacy banner, so search, cart, menu, quick view, size guide, and filters do not appear underneath consent UI.
- Content/CMS text-only hero blocks no longer reserve a mostly empty 72vh slab; support pages now show useful content in the first viewport.
- The Story page no longer renders the unrelated floral beach image when published content still points at the old fallback media; storefront rendering swaps it for activewear collection imagery.
- Cloudflare Stream and `iframe.videodelivery.net` are allowed in `frame-src`, so storefront editorial video embeds are not blocked by CSP.
- Route progress no longer appears on initial page snapshots.
- Next dev indicator is disabled through `devIndicators: false` for cleaner visual review.
- Storefront email inputs suppress browser-injected style hydration noise.
- Quick-view add-to-bag now hands off to a single cart drawer instead of leaving quick view stacked underneath the cart.
- Cart drawer item/recommendation/totals spacing was tightened so a one-item cart no longer leaves a large dead vertical gap.
- PDP full-screen gallery controls now have a stable accessible label and render product media on a light studio panel in dark mode.
- Mobile privacy choices now slide in as a solid compact bottom bar, and mobile filters still open above it without visual bleed-through.
- Mobile product-card metadata now stacks below the image on narrow two-column grids, so names and prices no longer squeeze each other.
- PDP sticky purchase bars now hide when lower PDP tabs, reviews, merchandising, recently viewed products, or the footer enters view; they no longer cover review forms, recommendation cards, or footer/legal links.
- Recommendation rails no longer show customer-facing internal feedback text such as `Not relevant`.
- The first visible recommendation row now eager-loads its product imagery to avoid blank studio panels when users reach the rail.
- The home hero remains full-screen but has a calmer desktop headline scale and a stronger text scrim so the crop/content balance is less rough.
- Product card action controls are smaller on dense grids, with secondary quick view hidden until hover/focus on desktop and still available on touch layouts.
- Shop filters now render as a lighter control strip with branded selected states, and the mobile filter drawer uses accent-filled selected/submit states instead of stark white dark-mode panels.
- Non-image shop/page headers have tighter first-viewport spacing so the product grid starts sooner without feeling like an admin table.
- Direct hosted `.mp4`/`.webm` product video URLs are accepted for product media, including Cloudflare R2-style URLs, so product cards and PDP galleries can preview motion without an upload-only path.
- Product quick view/quick add has been removed from customer-facing product cards; cards now use a simpler product-link plus bare wishlist heart interaction.
- Homepage product rails now use Embla for drag/swipe behavior, and PDP galleries use Framer Motion drag/swipe so horizontal movement feels intentional rather than manually snapped.
- Header utility icons have a tighter shared rhythm, no negative edge margins, and cart/wishlist counts are round badges anchored to the icon instead of floating away from the bag.
- Mobile menu density was tightened at 390px, with smaller primary nav rows and cleaner cart/wishlist badge anchoring inside shortcut tiles.
- Desktop and mobile filter panels, cart variant editing, cart notes, and PDP transient messages now use a shared soft expansion animation instead of abruptly appearing.
- PDP size-guide close controls and drawer surfaces now share the stronger storefront icon-button affordance.
- Gallery pagination dots are rounded and slightly clearer on bright media backgrounds.
- Header-triggered search, menu, and cart surfaces now broadcast a storefront surface-open event so shop filter panels and drawers collapse before another overlay opens; this prevents stacked filter/search UI.
- Store search is modal again, so focus and background interaction are owned by the search sheet while it is open.
- Mobile filter drawer header/footer controls were tightened after the visual sweep, with a stronger close target and less oversized submit bar.
- Empty cart page now uses a full-width compact action panel instead of a large half-width dashed block that left a fake missing summary column.
- Search results page was compacted so result products are visible sooner on desktop and mobile; related destination chips and the search heading no longer consume most of the first viewport.
- Text-only CMS hero blocks and the contact page handoff into support content were tightened so support shortcuts appear in the first desktop viewport.
- Checkout empty/loading states now use compact centered panels instead of oversized blank vertical slabs.
- Filled checkout summary now uses round quantity badges, mobile coupon/gift-card controls stack cleanly, and the desktop/mobile filled checkout path was verified from the real product add-to-bag flow.
- Account, reset-password, verify-email, and track-order storefront pages now use tighter responsive headings, denser card/form spacing, smoother hover/focus affordances, and rounded status/count markers.
- Order tracking's secondary lookup details panel now expands smoothly instead of snapping open.
- Cart drawer item controls, coupon entry, order-note entry, empty-bag recommendations, and remove buttons now use stronger shared storefront affordances and spacing.
- Footer newsletter contrast was strengthened, desktop/mobile footer typography was tightened, and viewport screenshots verify the footer no longer reads as low-contrast in dark mode.
- Newsletter modal mobile typography was reduced and the modal panel now renders on an explicit solid surface so hero imagery cannot bleed through the content.
- Mobile menu close controls and the theme/language row were tightened and verified at 340px.
- Signed-in account dashboard controls were tightened: stats hover states, order accordions, return progress markers, address actions, device/session controls, wishlist move-to-bag controls, and delete-account expansion now use the same storefront motion/affordance language.
- Account order detail pages now use rounded status chips, rounded timeline markers, and stronger invoice/return action states.
- Return/request forms now use rounded selection/status markers, stronger evidence upload panels, styled file controls, and smoother primary/destructive action affordances.
- Low-traffic storefront pages were swept again: FAQs, privacy, terms, care guide, fabric guide, size guide, email preferences, and 404.
- FAQ search and accordion rendering now use the storefront surface/action language, clearer spacing, chevron affordances, and responsive grouping instead of dense one-line native details markup.
- CMS/legal/support pages now use tighter shared summary panels, controlled text-only hero spacing, stronger content-block hierarchy, and consistent policy/guide/compare section rails.
- Mobile comparison tables now render as stacked measurement cards, fixing clipped off-screen columns on the size guide.
- Email preference loading, invalid-token, preference rows, checkbox markers, and action states now use solid storefront surfaces and smoother affordances.
- A custom customer-facing 404 page now replaces the default framework fallback with storefront typography, spacing, and shop/search actions.
- Direct hosted video URL support is now explicit for product videos and homepage direct video tiles: HTTPS or local `.mp4/.webm` URLs are validated, documented in admin copy, and covered by tests using the provided Cloudflare R2-style URL.
- Homepage sections no longer depend on delayed reveal wrappers that could leave large blank slabs below the hero; follow-on sections now render immediately with a soft CSS entry.
- Homepage product rails now use the shared storefront `ProductCard`, so color swatches are real controls that update imagery instead of passive color squares.
- Homepage product rail density now shows five cards at desktop and six at very wide desktop, while still keeping horizontal drag/swipe.
- The first visible homepage rail cards eager-load their media to avoid blank product panels during desktop/mobile visual sweeps.
- Homepage product slider headings now reserve enough vertical and horizontal space, so titles such as `Desert Run` do not collide with carousel controls, cards, or section boundaries.
- Product card hover media now activates only from the image link, not while hovering color swatches; selected color imagery is visible immediately after swatch clicks on homepage rails and shop grids.
- Homepage product rail cards now stretch to a consistent height inside each carousel, removing dead space caused by taller off-screen cards on mobile.
- Homepage mobile category media rail now shows a clearer next-card preview, exposes the `Shop all` action on mobile, and keeps the section free of horizontal page overflow.

Verification artifacts:
- `artifacts/ui-batch-fix/`
- `artifacts/ui-next-batch/`
- `artifacts/ui-polish-final/`
- `artifacts/ui-runtime-polish/`
- `artifacts/ui-sweep-next/`
- `artifacts/ui-interaction-sweep/final-desktop-cart-after-qv.png`
- `artifacts/ui-interaction-sweep/final-desktop-pdp-gallery.png`
- `artifacts/ui-interaction-sweep/final-mobile-filter-over-privacy.png`
- `artifacts/ui-mobile-corrected/m360-shop-product-meta-fixed.png`
- `artifacts/ui-final-verification/desktop-pdp-recommendations-late.png`
- `artifacts/ui-final-verification/desktop-pdp-bottom.png`
- `artifacts/ui-final-verification/mobile-pdp-bottom.png`
- `artifacts/ui-polish-redo-2/`
- `artifacts/ui-polish-redo-3/`
- `artifacts/ui-polish-redo-4/`
- `artifacts/ui-polish-redo-6/mobile-pdp-top.png`
- `artifacts/ui-flow-sweep-20260721/`
- `artifacts/ui-shell-sweep-20260721/`
- `artifacts/ui-account-sweep-20260721/`
- `artifacts/ui-lowtraffic-sweep-20260724/`
- `artifacts/ui-homepage-focused-20260724/`

Verification commands run:
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Latest continuation on 2026-07-20: `npm run lint`, `npx tsc --noEmit`, `git diff --check --`, and `npm run build` passed. Focused Playwright screenshots captured `desktop-pdp-cart-open.png`, `desktop-pdp-after-cart-close.png`, `mobile-shop-header.png`, and `mobile-menu-open.png` in `artifacts/ui-current-polish/`.
- Latest continuation on 2026-07-21: broad Playwright sweep captured light/dark desktop and mobile states in `artifacts/ui-goal-sweep-20260721/`; focused verification proved `beforeSearchFilterVisible: true` and `afterSearchFilterVisible: false` for the filter-to-search stack case. `npm run lint`, `npx tsc --noEmit`, `git diff --check --`, and `npm run build` passed.
- Secondary-page continuation on 2026-07-21: Playwright sweep captured cart, search results, collection, story, FAQ, contact, shipping, returns, and tracking in light/dark desktop/mobile under `artifacts/ui-secondary-sweep-20260721/`. Focused after-screenshots verified cart/search/contact density improvements. `npm run lint`, `npx tsc --noEmit`, `git diff --check --`, and `npm run build` passed.
- Flow continuation on 2026-07-21: Playwright captured empty checkout, filled checkout after shop -> PDP -> add-to-bag, account, reset-password, verify-email, track-order, and checkout-success states in desktop/mobile under `artifacts/ui-flow-sweep-20260721/`. `npm run lint`, `npx tsc --noEmit`, `git diff --check --`, and `npm run build` passed.
- Shared shell continuation on 2026-07-21: Playwright captured cart drawer empty/filled, mobile/narrow menu, mobile/desktop footer viewports, and mobile/narrow newsletter modal states under `artifacts/ui-shell-sweep-20260721/`. `npm run lint`, `npx tsc --noEmit`, `git diff --check --`, and `npm run build` passed.
- Account-flow continuation on 2026-07-21: Playwright captured reachable guest account and protected order/return redirect states under `artifacts/ui-account-sweep-20260721/`; signed-in account dashboard/order/return components are auth-gated and covered by TypeScript/build validation in this pass. `npm run lint`, `npx tsc --noEmit`, `git diff --check --`, and `npm run build` passed.
- Low-traffic/content continuation on 2026-07-24: Playwright captured FAQ, privacy, terms, size guide, fabric guide, care guide, email preferences, and custom 404 in desktop/mobile under `artifacts/ui-lowtraffic-sweep-20260724/`; follow-up screenshot verified the size-guide mobile comparison table no longer clips columns. `npm run lint`, `npx tsc --noEmit`, focused validation tests, `git diff --check --`, and `npm run build` passed.
- Homepage-focused continuation on 2026-07-24: Playwright captured desktop/mobile homepage screenshots under `artifacts/ui-homepage-focused-20260724/`; focused browser check verified homepage rail swatches change card imagery, and `npx playwright test homepage-merchandising.spec.ts --project=desktop-chromium` passed with coverage for full-bleed spotlight, corrected rail density, drag behavior, and swatch interaction.
- Homepage visual follow-up on 2026-07-24: fresh desktop/laptop/mobile screenshots were captured as `home-desktop-latest.png`, `home-laptop-latest.png`, and `home-mobile-latest.png` under `artifacts/ui-homepage-focused-20260724/`; the focused Playwright suite now includes rendered-pixel swatch verification and product-slider heading collision checks.
- Homepage rail-height follow-up on 2026-07-24: mobile product rail metrics verified visible cards and off-screen cards now share the same `553.859px` carousel height in both homepage rails; `npx playwright test homepage-merchandising.spec.ts --project=desktop-chromium`, `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed.
- Homepage category-rail follow-up on 2026-07-24: mobile screenshot `home-mobile-category-polish.png` verified the category rail shows about `1.6` cards at 390px with no horizontal page overflow and a visible mobile `Shop all` action; focused homepage Playwright suite passed.
- `git diff --check` (clean except existing CRLF conversion warnings from the broader dirty worktree)
- Latest focused pass on 2026-07-18: `npx tsc --noEmit`, `npm run lint`, and targeted `git diff --check` passed; Playwright screenshots were captured against the existing `http://localhost:3000` dev server.
- Playwright smoke checks against `next dev --webpack -p 3001` for desktop home, shop, PDP, mobile home, mobile menu, cart drawer, desktop inline filters, search overlay, quick view, size guide, mobile filter drawer, and fresh mobile privacy/newsletter overlap.
- Desktop/mobile route sweep against `next dev --webpack -p 3001` for home, shop, collection, story, support/legal pages, contact, cart, search, and order tracking. Follow-up screenshots verified story and contact spacing/image fixes.
- Focused interaction checks against `next dev --webpack -p 3001` for quick-view add-to-cart, PDP full-screen gallery, fresh mobile privacy banner timing, and mobile filter drawer layering.
- Corrected mobile consent-key checks against `next dev --webpack -p 3001` for 390px and 360px home, shop, filters, PDP, and menu.
- PDP scroll checks against `next dev --webpack -p 3001` for desktop/mobile sticky purchase bar visibility at product detail, recommendations, and footer positions.

Known remaining/non-blocking notes:
- Dev-server visual checks should use webpack on Windows if Turbopack hits `.next/dev` `EPERM` rename errors.
- The default dev server on port 3000 was returning transient 500s from the known Windows `.next/dev` manifest rename lock; the reliable sweep used a clean webpack server on port 3001.
- One LCP advisory can still appear in development for catalog imagery; it is performance guidance, not a visible layout bug.
- The audit below is retained as the original bug inventory; use this status section as the current fixed-state index.

## P0 - Must Fix First

1. Homepage hero is not full-screen.
   - Evidence: desktop hero measured 614px tall on a 960px viewport.
   - Location: `src/app/page.tsx`, `HeroSection`, currently `h-[64svh] min-h-[480px] max-h-[680px]`.
   - Problem: the first viewport feels cut short and leaves a large dead band before the category section.
   - Fix direction: make the hero true first-viewport height, likely `min-h-svh` or `h-svh`, accounting for announcement/header overlay.

2. Homepage hero and spotlight content are aligned to different layout rails.
   - Evidence: hero content is inside a centered `max-w-[1440px]` container, while spotlight content is positioned with absolute `start-5 sm:start-8 lg:start-12`.
   - Location: `src/app/page.tsx`, `HeroSection` and `CollectionSpotlightBanner`.
   - Problem: the content jumps horizontally between sections and looks like different design systems.
   - Fix direction: use one storefront container/rail system for hero, spotlight, category, and product rail content.

3. Desktop home has too much blank vertical space after the hero.
   - Evidence: `home-desktop-dark.png` shows a large empty black area between hero and category content.
   - Location: `src/app/page.tsx`, `CategoryMediaSection`, `pt-16 sm:pt-32`.
   - Problem: it looks like missing content or broken spacing.
   - Fix direction: if hero becomes full-screen, next section should start cleanly with controlled spacing, not a huge dead band.

4. Shop and collection product grids show only 4 products by default.
   - Evidence: shop page says `24 products` but renders `Showing 4 of 24 products`.
   - Location: `src/components/store/shop-controls.tsx`, `const initialProductCount = 4`.
   - Problem: users see an underfilled catalog even though there are many products.
   - Fix direction: increase desktop/mobile initial counts, likely 12 or responsive counts matching the grid.

5. Dark-mode product cards have invisible or near-invisible badge/action icons.
   - Evidence: product heart/eye icons and `BEST SELLER` badges are barely visible on white buttons/badges.
   - Locations:
     - `src/components/store/product-card.tsx`, white buttons with `text-stone-950`.
     - `src/app/globals.css`, global dark overrides for `.text-stone-950` and `.bg-white`.
   - Problem: dark mode rewrites dark text on white UI to white text on white UI.
   - Fix direction: remove broad dark overrides or scope exceptions so deliberate white controls keep dark text.

6. Dark mode makes large product media areas read as broken white blocks.
   - Evidence: shop and PDP screenshots show large white/cream packshot backgrounds against black UI.
   - Locations:
     - `src/components/store/product-card.tsx`
     - `src/components/store/product-gallery.tsx`
     - product image assets / media presentation
   - Problem: the page is technically dark, but the product grid feels like white-background tiles pasted onto it.
   - Fix direction: decide a consistent dark-mode product media treatment: framed light product studio cards, neutral dark cards, or asset-specific presentation.

7. PDP mobile bottom purchase bar is visible immediately and covers content.
   - Evidence: `pdp-mobile-dark-top.png` shows the sticky bar over the product description before purchase controls are reached.
   - Location: `src/components/store/product-actions.tsx`, mobile `.storefront-bottom-bar` is always rendered.
   - Problem: it steals space and hides content on first view.
   - Fix direction: gate the mobile bar with the same intersection logic as desktop, and add enough bottom padding while it is visible.

8. PDP sticky bar covers lower page sections and recommendations.
   - Evidence: user screenshot and `pdp-desktop-dark-scroll.png` show the bottom bar over reviews/recommendations.
   - Locations:
     - `src/components/store/product-actions.tsx`, desktop `.storefront-bottom-bar`.
     - `src/app/product/[slug]/page.tsx`, recommendation and page bottom spacing.
   - Problem: lower content can sit underneath the fixed bar.
   - Fix direction: reserve bottom spacing when sticky purchase bars are active, or hide the bar near footer/recommendations.

9. Quick view modal opens off-center and clipped.
   - Evidence: `quick-view-desktop-dark.png` shows the modal anchored toward the bottom-right, partly off-screen.
   - Location: `src/components/store/quick-view.tsx`, `Dialog.Content` relies on `.storefront-modal` animation for centering.
   - Problem: the base class has `left-1/2 top-1/2` but no persistent `translate(-50%, -50%)` outside the animation path.
   - Fix direction: restore base centering transform and let animation compose safely.

10. Quick view image area can render as a blank dark block.
    - Evidence: `quick-view-desktop-dark.png` shows a dark empty image frame for the first product.
    - Location: `src/components/store/quick-view.tsx`, image frame uses `bg-[var(--card)]` and `product.images[0]`.
    - Problem: high-value product preview looks broken.
    - Fix direction: use selected variant media, add a loading/fallback state, and verify image loading in dark mode.

## P1 - High-Impact Polish Bugs

11. Header icon spacing is visually uneven.
    - Evidence: desktop header icon cluster has 44px buttons, a 36px theme toggle, and mixed gap rhythm.
    - Locations:
      - `src/components/store/header.tsx`, icon cluster.
      - `src/components/store/theme-toggle.tsx`, `size-9`.
    - Problem: the spacing looks accidental, especially around the theme icon.
    - Fix direction: make every header utility action the same box size, border treatment, and gap.

12. Header theme toggle is the only bordered icon in the main utility cluster.
    - Evidence: search/account/wishlist/cart are borderless, theme is boxed.
    - Location: `src/components/store/theme-toggle.tsx`.
    - Problem: it reads like a selected state or broken button.
    - Fix direction: either all header icons get the same button chrome or the theme toggle loses the box in header context.

13. Header icon negative margins make edges feel uneven.
    - Evidence: menu uses `-ms-3`, cart uses `-me-3` on mobile.
    - Location: `src/components/store/header.tsx`.
    - Problem: icon alignment near viewport edges differs from the rest of the layout.
    - Fix direction: use explicit container padding and fixed icon boxes instead of negative margin correction.

14. Product gallery controls are low contrast in dark mode.
    - Evidence: PDP gallery arrows/share/expand buttons are white boxes but icons can become white because of global text overrides.
    - Location: `src/components/store/product-gallery.tsx`, controls with `bg-white/88 text-stone-950`.
    - Problem: controls become hard to see on light product media.
    - Fix direction: same as P0 dark override fix; use component-scoped fixed contrast.

15. Full-screen gallery controls have the same dark-mode text override problem.
    - Evidence: zoom/close/arrow controls use `bg-white text-stone-950`.
    - Location: `src/components/store/product-gallery-viewer.tsx`.
    - Problem: icons can disappear on white buttons.
    - Fix direction: keep controls intentionally light with dark icon color, independent of theme overrides.

16. Hero CTA changes character in dark mode.
    - Evidence: home hero CTA is coded as `bg-white text-stone-950`, but dark override changes `.bg-white`.
    - Location: `src/app/page.tsx`, hero CTA; `src/app/globals.css`, dark overrides.
    - Problem: CTA appearance is not what the component asks for.
    - Fix direction: remove or narrow global `.bg-white` dark-mode override.

17. Homepage category media only shows a small subset.
    - Evidence: category section visually shows four category cards on desktop even though more categories exist.
    - Location: `src/app/page.tsx`, fallback category media slices to 4, CMS media slices to 6, grid displays 4 columns.
    - Problem: users may think the catalog is smaller than it is.
    - Fix direction: decide whether the section should show all categories, a carousel, or a deliberate curated set with clear affordance.

18. Homepage product rails are hard-capped.
    - Evidence: products are sliced to 5 or 12 in homepage helpers.
    - Location: `src/app/page.tsx`, `productsForSection`, `fillProductSlider`, `ProductRail`.
    - Problem: some rails may hide valid merchandising data unexpectedly.
    - Fix direction: align rail count with design intent and admin content expectations.

19. Spotlight banner uses a full-bleed image but not a shared content container.
    - Evidence: text starts near the viewport edge unlike the hero/category/product rails.
    - Location: `src/app/page.tsx`, `CollectionSpotlightBanner`.
    - Problem: the content container mismatch is very visible.
    - Fix direction: keep the image full-bleed if desired, but put text on the same content rail as other sections.

20. PDP product gallery makes packshot products look too small.
    - Evidence: bottle product is centered in a large frame with a lot of empty background.
    - Location: `src/components/store/product-gallery.tsx`, `object-contain`.
    - Problem: image area feels underused, especially for accessories/tumblers.
    - Fix direction: media presentation should choose contain/cover/scale by product media type and dimensions.

21. PDP mobile gallery action buttons sit on top of bright product backgrounds.
    - Evidence: share/expand/arrows overlap the light product image area and lose definition.
    - Location: `src/components/store/product-gallery.tsx`.
    - Problem: controls fight with the image instead of feeling integrated.
    - Fix direction: use consistent scrim, darker icon buttons, or a separate gallery control rail.

22. PDP has too much content under a persistent mobile sticky bar.
    - Evidence: mobile page text and footer can continue below the sticky purchase UI.
    - Locations:
      - `src/components/store/product-detail.tsx`, only the first grid has mobile `pb-28`.
      - `src/app/product/[slug]/page.tsx`, later sections do not reserve sticky space.
    - Problem: lower PDP content can be obscured.
    - Fix direction: apply page-level bottom spacing while the mobile bar is mounted.

23. Product image card actions are too dominant on small product cards.
    - Evidence: heart and quick-view buttons are 44px each on desktop cards, stacked over image content.
    - Location: `src/components/store/product-card.tsx`.
    - Problem: controls cover product imagery, especially on 2-column mobile cards.
    - Fix direction: reduce size on dense grids, reveal secondary quick view only on hover for desktop, or move actions to a cleaner rail.

24. Product swatches are very small and inconsistent across contexts.
    - Evidence: product cards use 16px swatches, PDP/quick view use 28px, home cards use passive 16px squares.
    - Locations:
      - `src/components/store/product-card.tsx`
      - `src/components/store/product-actions.tsx`
      - `src/app/page.tsx`, `HomeProductCard`
    - Problem: swatches feel fiddly and inconsistent.
    - Fix direction: define one swatch scale for grid, card, and PDP states.

25. Shop filter bar feels heavy in dark mode.
    - Evidence: the filter row is a full dark band with large uppercase labels and strong borders.
    - Location: `src/components/store/shop-controls.tsx`.
    - Problem: it competes with product content and makes the page feel boxed.
    - Fix direction: lighten visual weight, standardize spacing, and improve selected/open states.

26. Filter drawer opens as a full-width panel on mobile, which is fine, but desktop filter buttons also open a side drawer.
    - Evidence: desktop top filters are horizontal labels, but clicking opens a full drawer instead of inline panels.
    - Location: `src/components/store/shop-controls.tsx` and `shop-filter-drawer.tsx`.
    - Problem: desktop interaction can feel heavier than expected for simple sort/size/color changes.
    - Fix direction: consider inline popovers for desktop and drawer only for mobile.

27. Search dialog on desktop starts lower than the header but still feels like a huge sheet.
    - Evidence: `search-desktop-open-dark.png` content is an 896px wide top sheet.
    - Location: `src/components/store/store-search-dialog.tsx`.
    - Problem: not broken, but visually heavy compared with the refined storefront style.
    - Fix direction: tighten max height, spacing, and result density.

28. Search and filter overlays keep underlying page text in the accessibility/body text snapshot.
    - Evidence: interaction results show underlying page text plus dialog text.
    - Location: Radix dialog setup across search, menu, filters, cart.
    - Problem: visually okay, but worth checking inert/background scroll behavior.
    - Fix direction: verify Radix aria-hidden/inert behavior and scroll locking after final animation work.

## P2 - Smaller Polish Items

29. Homepage spotlight section height is not related to viewport height.
    - Evidence: it uses `min-h-[420px] sm:min-h-[560px] lg:min-h-[640px]`.
    - Location: `src/app/page.tsx`, `CollectionSpotlightBanner`.
    - Problem: on tall displays it can feel short compared with a full-screen hero.
    - Fix direction: decide if spotlight should be full-bleed editorial height, half-height, or containerized.

30. Typography scale differs sharply between hero and spotlight.
    - Evidence: hero title uses `text-6xl sm:text-7xl lg:text-[104px]`; spotlight uses uppercase `sm:text-7xl lg:text-8xl`.
    - Location: `src/app/page.tsx`.
    - Problem: both are editorial image sections but use different type language.
    - Fix direction: make section title styles intentional and consistent.

31. Product rail arrow buttons lack disabled/end-state feedback.
    - Evidence: arrows always look active.
    - Location: `src/components/store/product-scroller.tsx`.
    - Problem: users can click previous at the start with no visible state.
    - Fix direction: track scroll position and disable arrows at edges.

32. Product rail scrollbar is hidden.
    - Evidence: `.homepage-product-grid` hides scrollbars.
    - Location: `src/app/globals.css`, `.homepage-product-grid`.
    - Problem: horizontal product rails may not advertise that more content exists.
    - Fix direction: keep arrows, add progress indicator, or reveal a subtle scrollbar.

33. Product card hover image logic can cause layout perception jumps.
    - Evidence: hover image can use different fit mode from primary image.
    - Location: `src/components/store/product-card.tsx`, `productCardImageFit`.
    - Problem: object-fit changes can make images jump on hover.
    - Fix direction: normalize media dimensions or keep consistent fit per product card.

34. Mobile menu theme/language row may still be tight on narrow devices.
    - Evidence: two columns contain uppercase labels plus controls.
    - Location: `src/components/store/mobile-menu.tsx`.
    - Problem: likely cramped below 390px.
    - Fix direction: test at 320px/360px and stack if needed.

35. Mobile menu primary nav uses very large serif text.
    - Evidence: `text-4xl` nav labels in a functional drawer.
    - Location: `src/components/store/mobile-menu.tsx`.
    - Problem: it looks editorial but reduces scan speed.
    - Fix direction: reduce size or increase density while keeping a premium feel.

36. Cart drawer empty state has too much vertical dependence.
    - Evidence: empty cart CTA sits centered in full-height drawer.
    - Location: `src/components/store/cart-drawer.tsx`.
    - Problem: on short mobile screens the drawer can feel sparse and footer-like content may be hard to discover.
    - Fix direction: top-align empty state with recommendations below.

37. Cart drawer close button lacks an explicit visible affordance style.
    - Evidence: close icon is small and border appears only on hover.
    - Location: `src/components/store/cart-drawer.tsx`.
    - Problem: easy to miss on mobile.
    - Fix direction: match the stronger icon button style used in other drawers.

38. Checkout empty state uses a bright CTA in dark mode.
    - Evidence: audit reports white-ish `Browse the store` button.
    - Location: `src/app/checkout/page.tsx`.
    - Problem: may be intended, but it repeats the dark-mode white-button inconsistency.
    - Fix direction: settle CTA token rules for dark mode.

39. Cart empty state has the same bright CTA inconsistency.
    - Evidence: audit reports white-ish `Shop catalog` button.
    - Location: `src/app/cart/page.tsx`.
    - Problem: CTA style is not consistent with the rest of dark storefront.
    - Fix direction: apply the same dark-mode CTA decision everywhere.

40. Footer newsletter input can look too low-contrast in dark mode.
    - Evidence: transparent input on dark footer with white/45 placeholder.
    - Location: `src/components/store/footer.tsx`.
    - Problem: placeholder and bottom border can be subtle on some displays.
    - Fix direction: strengthen border/placeholder contrast while keeping the quiet style.

41. Route loading progress bar is visible as a fixed 2px element in snapshots.
    - Evidence: interaction snapshots include a fixed top progress element.
    - Location: `src/components/global-route-progress.tsx`.
    - Problem: if it appears during non-navigation interactions, it can read as a stray line.
    - Fix direction: verify it only animates during route changes and hides fully afterward.

42. Global dark-mode utility overrides are too broad.
    - Evidence: `src/app/globals.css` overrides common utility classes such as `.bg-white`, `.text-stone-950`, `.hover:bg-white`.
    - Problem: any component using deliberate high-contrast utility classes can break in dark mode.
    - Fix direction: replace global utility rewrites with semantic tokens or component-scoped classes.

43. Modal/drawer animation classes lack base transform states.
    - Evidence: quick view modal positioning bug.
    - Location: `src/app/globals.css`, `.storefront-modal`, `.storefront-drawer-*`, `.storefront-top-sheet`.
    - Problem: layout should not depend on animation keyframes for final positioning.
    - Fix direction: set stable base transforms and animate from/to additive states.

44. Motion timings are not centralized per component type.
    - Evidence: drawers, top sheets, gallery, modal, and bottom bars use separate hardcoded durations.
    - Location: `src/app/globals.css`.
    - Problem: some surfaces can feel smoother than others.
    - Fix direction: define motion tokens for fast button, drawer, modal, and page transitions.

45. Development-only Next.js indicator appears over storefront screenshots.
    - Evidence: black `N` bubble in screenshots.
    - Location: Next dev overlay, not production UI.
    - Problem: local visual review is noisy and can obscure fixed bottom bars.
    - Fix direction: optionally set `devIndicators: false` in local config if visual review cleanliness matters.

## 2026-07-24 Batch Notes

- Fixed the homepage product slider header spacing at 1905px so the large collection title no longer sits on the next boundary and has a stronger gap before product cards.
- Enlarged homepage/shop product-card swatch hit targets while keeping the visible color chips compact.
- Enlarged shop desktop filter triggers to avoid squat/tiny toolbar buttons.
- Enlarged PDP gallery arrows, share/expand controls, and media dot hit areas.
- Enlarged PDP color swatches, size buttons, and size-guide trigger targets.
- Verification artifacts: `artifacts/ui-polish-20260724/homepage-slider-1905.png`, `artifacts/ui-polish-20260724/shop-controls-desktop.png`, `artifacts/ui-polish-20260724/pdp-controls-mobile.png`.
- Added focused coverage in `tests/e2e/storefront-control-polish.spec.ts`; updated `tests/e2e/homepage-merchandising.spec.ts` to enforce more room under product-slider headings.

## 2026-07-24 Secondary Storefront Batch Notes

- Enlarged mobile header menu/search/cart controls to 40px hit targets while preserving the tight icon rhythm.
- Enlarged support-card `Learn more` links and account forgot-password/back-to-sign-in text actions to real tap targets.
- Reworked empty-cart desktop behavior so the page shows a visible `Complete the Look` product recommendation grid instead of a large dead area.
- Reduced empty-cart recommendation media height and moved to a four-card desktop grid so product names, prices, and `View details` actions are visible in the first viewport.
- Verification artifacts: `artifacts/ui-secondary-polish-20260724/after/contact-mobile.png`, `artifacts/ui-secondary-polish-20260724/after/account-mobile.png`, `artifacts/ui-secondary-polish-20260724/after/cart-desktop-final.png`.
- Added secondary-page coverage in `tests/e2e/storefront-control-polish.spec.ts`.

## 2026-07-24 Utility Storefront Batch Notes

- Swept checkout, track order, FAQs, shipping, returns, care guide, fabric guide, and privacy on desktop/mobile.
- Enlarged the desktop theme toggle to match the 40px header icon target used by the rest of the storefront shell.
- Enlarged checkout shell back links (`Cart` / `Shop`) to proper 40px hit targets.
- Updated the checkout empty-state CTA to use the filled accent treatment consistently.
- Verification artifacts: `artifacts/ui-utility-polish-20260724/checkout-desktop-after.png`, `artifacts/ui-utility-polish-20260724/track-order-desktop-after.png`.
- Added utility-page coverage in `tests/e2e/storefront-control-polish.spec.ts`.

## 2026-07-24 Overlay And Dark Mode Batch Notes

- Swept mobile menu, search top sheet, cart drawer, and dark-mode storefront surfaces.
- Enlarged the mobile menu theme toggle and language switcher rows so they no longer feel like tiny tucked-away controls.
- Enlarged search dialog popular-search chips and text links to consistent tap targets.
- Added an accessible cart-drawer close label while keeping the 40px close target.
- Enlarged the cart empty-state secondary `Best sellers` text action so it no longer behaves like a thin inline link on touch.
- Verification artifacts: `artifacts/ui-overlay-polish-20260724/mobile-menu.png`, `artifacts/ui-overlay-polish-20260724/search-dialog-mobile.png`, `artifacts/ui-overlay-polish-20260724/cart-drawer-mobile.png`, `artifacts/ui-overlay-polish-20260724/home-dark.png`, `artifacts/ui-overlay-polish-20260724/shop-dark.png`, `artifacts/ui-overlay-polish-20260724/pdp-dark.png`, `artifacts/ui-overlay-polish-20260724/cart-dark.png`.
- Added overlay coverage in `tests/e2e/storefront-control-polish.spec.ts`.

## 2026-07-26 Product Card Swatch Restart Check

- Restarted the local storefront dev server and rechecked product-card color swatches on homepage and shop.
- Reworked the shared `ProductCard` swatch treatment so selected borders are inset on the outer square and the inner color chip is centered by explicit grid geometry.
- Updated the requested swatch geometry again: the visible inner color chip now renders as `16 x 16`, and the selected border square renders as `20 x 20` on homepage and shop cards.
- Kept the invisible button hit target at `28 x 28` so the visual swatch can stay compact without becoming hard to tap.
- Verified light and dark modes use the same exact geometry with a visible foreground selected outline and dark-mode inner-chip border contrast.
- Verification artifacts: `artifacts/ui-next-pages-20260724/swatch-fix-restarted/home-desktop.png`, `artifacts/ui-next-pages-20260724/swatch-fix-restarted/shop-desktop.png`, `artifacts/ui-next-pages-20260724/swatch-fix-restarted/shop-mobile.png`, `artifacts/ui-next-pages-20260724/swatch-fix-restarted/metrics.json`, `artifacts/ui-next-pages-20260724/swatch-fix-restarted-dark/shop-dark-desktop.png`, `artifacts/ui-next-pages-20260724/swatch-fix-restarted-dark/metrics.json`.
- Latest exact-geometry artifacts: `artifacts/ui-next-pages-20260726/swatch-16-20-restarted/home-desktop.png`, `artifacts/ui-next-pages-20260726/swatch-16-20-restarted/shop-desktop.png`, `artifacts/ui-next-pages-20260726/swatch-16-20-restarted/shop-mobile.png`, `artifacts/ui-next-pages-20260726/swatch-16-20-restarted/shop-dark-desktop.png`, `artifacts/ui-next-pages-20260726/swatch-16-20-restarted/metrics.json`.
- Added numeric swatch centering coverage in `tests/e2e/storefront-control-polish.spec.ts`; homepage swatch image-change coverage remains in `tests/e2e/homepage-merchandising.spec.ts`.

## 2026-07-26 Homepage Category CTA Pass

- Fresh restarted-server homepage/shop sweep found the desktop `Shop all` CTA in `Shop by category` collapsed to a `16px` text-height hit target.
- Updated the category CTA to keep a text-style visual while enforcing a `40px` action height on desktop and mobile.
- Verification artifacts: `artifacts/ui-next-pages-20260726/fresh-sweep/home-desktop.png`, `artifacts/ui-next-pages-20260726/fresh-sweep/metrics.json`, `artifacts/ui-next-pages-20260726/category-cta-fix/home-category-cta-desktop.png`, `artifacts/ui-next-pages-20260726/category-cta-fix/metrics.json`.
- Added homepage regression coverage in `tests/e2e/homepage-merchandising.spec.ts`.

## 2026-07-26 Homepage Slider Swatch Proof

- Rechecked the homepage product slider in the browser after the latest restart because the expected behavior is that carousel product-card swatches swap the visible product image like shop cards.
- Verified a homepage carousel card changed from `Track Jacket in Black` to `Track Jacket in Cheery Red`; the primary image URL changed and the selected swatch state moved to the clicked color.
- Confirmed the selected homepage slider swatch still uses the requested exact geometry: `16 x 16` visible color chip, `20 x 20` selected border square, centered inside the `28 x 28` hit target with equal `6px` offsets on all sides.
- Verification artifacts: `artifacts/ui-next-pages-20260726/homepage-slider-swatch-proof/home-card-before.png`, `artifacts/ui-next-pages-20260726/homepage-slider-swatch-proof/home-card-after.png`, `artifacts/ui-next-pages-20260726/homepage-slider-swatch-proof/metrics.json`.
- Focused coverage: `tests/e2e/homepage-merchandising.spec.ts` includes the homepage slider image-change regression check and compares the behavior against `/shop`.

## 2026-07-26 PDP Gallery Dot Pass

- Next-page sweep found the PDP gallery media-dot buttons still rendered as `32 x 32`, which felt smaller than the rest of the storefront control system on mobile.
- Increased the gallery media-dot button target to `40 x 40` while keeping the visible dot/pill marks compact.
- Verified the updated target on PDP mobile light, PDP mobile dark, and PDP desktop.
- Verification artifacts: `artifacts/ui-next-pages-20260726/pdp-gallery-dot-fix/pdp-mobile.png`, `artifacts/ui-next-pages-20260726/pdp-gallery-dot-fix/pdp-dark-mobile.png`, `artifacts/ui-next-pages-20260726/pdp-gallery-dot-fix/pdp-desktop.png`, `artifacts/ui-next-pages-20260726/pdp-gallery-dot-fix/metrics.json`.
- Updated `tests/e2e/storefront-control-polish.spec.ts` so PDP gallery dots must stay at least `40 x 40`.

## 2026-07-26 PDP Color Swatch Geometry Pass

- Rechecked PDP color selectors after the product-card swatch work and found the product-page selected swatch still used ring offsets around a `36px` square.
- Rebuilt PDP color swatches with explicit centered geometry: `40 x 40` hit target, `32 x 32` selected frame, and `24 x 24` color chip with equal `4px` frame offsets.
- Verified light mobile, dark mobile, desktop, and scrolled PDP states have no horizontal overflow.
- Verification artifacts: `artifacts/ui-next-pages-20260726/pdp-swatch-and-bottom-bar/pdp-mobile-top.png`, `artifacts/ui-next-pages-20260726/pdp-swatch-and-bottom-bar/pdp-dark-mobile-top.png`, `artifacts/ui-next-pages-20260726/pdp-swatch-and-bottom-bar/pdp-desktop-top.png`, `artifacts/ui-next-pages-20260726/pdp-swatch-and-bottom-bar/metrics.json`.

## 2026-07-26 Center Logo Header Pass

- Updated the storefront header so the `Velora` logo is mathematically centered in the header on mobile, tablet, desktop, and wide desktop.
- Desktop navigation now lives in the left zone and starts at `xl`; the mobile menu remains available below `1280px` so the 1024px header does not crowd the centered logo.
- The hero-overlay logo now uses a warmer high-contrast color with a shadow so it remains readable when centered over hero imagery.
- Verified logo center delta is `0px` at `390`, `1024`, `1440`, and `1920` widths with no horizontal overflow.
- Verification artifacts: `artifacts/ui-next-pages-20260726/center-logo-header-final/home-mobile-overlay.png`, `artifacts/ui-next-pages-20260726/center-logo-header-final/home-desktop-overlay.png`, `artifacts/ui-next-pages-20260726/center-logo-header-final/shop-1024.png`, `artifacts/ui-next-pages-20260726/center-logo-header-final/shop-desktop.png`, `artifacts/ui-next-pages-20260726/center-logo-header-final/shop-wide.png`, `artifacts/ui-next-pages-20260726/center-logo-header-final/metrics.json`.
- Added header-center regression coverage in `tests/e2e/storefront-control-polish.spec.ts`.

## 2026-07-26 Header Badge Position Pass

- Rechecked the centered header at `360px`, dark mode, and with seeded cart/wishlist badge counts.
- Pulled header count badges back inside their 40px icon buttons so the round number feels attached to the bag/heart instead of floating outside the icon.
- Verified visible badges are round, at least `16 x 16`, inside their parent icon button, and the centered logo still has `0px` center delta at mobile and desktop edge widths.
- Verification artifacts: `artifacts/ui-next-pages-20260726/header-badge-position-final/shop-360-with-badge.png`, `artifacts/ui-next-pages-20260726/header-badge-position-final/shop-390-dark-with-badge.png`, `artifacts/ui-next-pages-20260726/header-badge-position-final/shop-1280-desktop-edge.png`, `artifacts/ui-next-pages-20260726/header-badge-position-final/shop-1366-desktop-edge.png`, `artifacts/ui-next-pages-20260726/header-badge-position-final/metrics.json`.
- Extended header regression coverage in `tests/e2e/storefront-control-polish.spec.ts` to seed badge counts and assert badge geometry.
- Refreshed `tests/e2e/storefront-shell.spec.ts-snapshots` so the shell visual baselines match the centered-logo header and current polished footer at `360`, `390`, `768`, `1024`, `1366`, `1440`, and `1920` widths.

## Suggested Fix Order

1. Fix the global dark-mode overrides and header icon rhythm.
2. Fix homepage hero height, section rails, and post-hero spacing.
3. Fix shop initial product count and product grid/card controls.
4. Fix PDP sticky purchase bars and gallery controls.
5. Fix quick view modal positioning and media loading.
6. Sweep smaller polish issues across drawers, footer, checkout/cart empty states, and rails.
