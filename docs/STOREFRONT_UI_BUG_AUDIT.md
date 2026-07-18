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

Updated: 2026-07-18

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

Verification commands run:
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
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

## Suggested Fix Order

1. Fix the global dark-mode overrides and header icon rhythm.
2. Fix homepage hero height, section rails, and post-hero spacing.
3. Fix shop initial product count and product grid/card controls.
4. Fix PDP sticky purchase bars and gallery controls.
5. Fix quick view modal positioning and media loading.
6. Sweep smaller polish issues across drawers, footer, checkout/cart empty states, and rails.
