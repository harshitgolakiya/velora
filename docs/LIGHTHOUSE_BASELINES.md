# Lighthouse Baselines

`npm run test:lighthouse` audits the production build with Lighthouse mobile settings. The script starts `next start` on a free local port unless `LIGHTHOUSE_BASE_URL` is set, then warms the audited routes once before the measured run to avoid local image-optimizer cold starts dominating scores.

The release gate currently enforces regression baselines:

| Route | Performance floor | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| `/` | 60 | 90 | 90 | 90 |
| `/shop` | 60 | 90 | 90 | 90 |
| `/product/flared-pants-7461` | 60 | 90 | 90 | 90 |
| `/cart` | 85 | 90 | 90 | 60 |

The script still prints any 90+ target gaps. Cart SEO is intentionally lower because cart is blocked from indexing.

Latest Lighthouse production release-tail run (`2026-07-07`):

| Route | Performance | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| `/` | 93 | 100 | 96 | 100 |
| `/shop` | 97 | 100 | 96 | 100 |
| `/product/flared-pants-7461` | 97 | 96 | 96 | 100 |
| `/cart` | 98 | 100 | 96 | 66 |

The hard release floors and 90+ performance targets passed. The final performance pass moved theme initialization before first paint, deferred noncritical analytics/cart/newsletter runtime work away from the storefront critical path, kept cart reservation sync immediate on `/cart`, removed the remaining Cloudinary image remote pattern, and reduced first-load font/runtime work.
