# Codex Handoff: Velora

Last updated: 2026-08-22

## Start Here

Continue work in:

`C:\Users\golak\Desktop\ecomm\velora`

Read this file, then inspect `git status --short` before editing. The worktree is intentionally very dirty after a long implementation and UI-polish session. Do not reset, checkout, restore, or otherwise discard existing changes. Treat all modified, deleted, and untracked source files as user work unless a task explicitly says otherwise.

The current objective is to deploy the application to a temporary public domain for review. This is a staging/preview deployment, not a real customer launch. Real payments, final products, production evidence, and final provider integrations are not required for this temporary deployment.

## Project Summary

- Name: Velora
- Type: international activewear ecommerce storefront and admin application
- Framework: Next.js 16.2.10 App Router
- Runtime: React 19.2.4, TypeScript, Tailwind CSS
- Database: Prisma 7.8 with libSQL/SQLite support
- Authentication: NextAuth credentials flow
- Payments: Stripe-ready checkout plus provider scaffolding; keep payments in test/demo mode for preview
- Email: SMTP/Resend-ready infrastructure
- State/UI: Zustand, Radix UI, Lucide, Framer Motion, Embla
- Local workspace currently uses Node.js 20.20.2
- Temporary server should use Node.js 22.23.2

The app contains storefront, product, collection, search, cart, checkout, account, order, returns, support, content, admin, health, webhook, SEO, and accessibility surfaces. The latest successful build generated 118 routes.

## Current Verification State

Most recent commands completed on 2026-08-22:

1. `npm ci` passed and installed 776 packages.
2. `npm run prisma:generate` passed with Prisma Client 7.8.0.
3. `npm run build` passed completely:
   - Next.js compilation passed.
   - TypeScript passed.
   - All 118 static/dynamic routes were processed.
   - Production `.next` output was recreated.

The project is currently runnable locally with:

```powershell
npm run dev
```

Do not remove `node_modules` or `.next` merely to clean screenshots. They were accidentally removed during cleanup, then fully restored using the commands above.

`npm ci` reported 39 dependency advisories: 22 moderate, 16 high, and 1 critical. This is newer/different from an earlier advisory report and must be audited before a real customer launch. It does not automatically block a private temporary preview, but do not claim full production readiness without reviewing it.

## Cleanup Already Performed

The user wanted historical screenshots and similar clutter removed. The following were intentionally removed:

- The entire tracked/untracked `artifacts/` QA screenshot archive
- Old development and server logs
- `test-results/`
- Stale `.launch-readiness/` reports
- Stale `.restore-drill/` reports
- Local `backups/` files
- Old `.next-stale/`

`.gitignore` was updated to include:

```gitignore
/artifacts/
/backups/
```

The tracked screenshot and backup deletions therefore appear as many `D` entries in Git. They are intentional cleanup changes. Historical references to those screenshots remain in `docs/STOREFRONT_UI_BUG_AUDIT.md`; they are audit history, not runtime dependencies.

## Important Git State

There are extensive existing edits across storefront pages, admin components, catalog logic, styles, tests, snapshots, Prisma seed data, and configuration. Preserve them.

Notable current state:

- `CODEX_HANDOFF.md` had been deleted and is recreated by this handoff.
- `MASTER_PROJECT_ROADMAP.md` is currently deleted. Do not silently restore or recreate it without checking the user's intent.
- `src/components/store/quick-view.tsx` is deleted and newer quick-view/account interaction work may be implemented elsewhere.
- `src/app/not-found.tsx`, `src/components/store/account-dialog.tsx`, and `tests/e2e/storefront-control-polish.spec.ts` are untracked source/test files and must be preserved.
- Many old local product images and admin-uploaded videos are marked deleted.
- The current catalog/seed work uses remote image sources including DummyJSON, Fake Store API, Pexels, and Imgur; `next.config.ts` permits these image hosts.
- Before committing or packaging, verify that every remaining local image reference resolves and that the deleted media are intentionally obsolete.

Never use destructive Git commands against this worktree. Do not clean untracked source files.

## Temporary Domain Deployment Context

The user is configuring a Node.js application through a cPanel/Plesk-style Passenger interface for the `ccea.ae` account.

Known control-panel choices:

- Node.js version: `22.23.2`
- Application mode: `Production`
- Suggested application root: `velora`
- Application URL: use a temporary subdomain created by the user
- Suggested Passenger log: `/home/cceaae/logs/velora-passenger.log`
- Expected startup file: `server.js`

Important: `server.js` does not currently exist. Before telling the user to enter it in the panel, implement and test a Passenger-compatible Next.js startup entry, or confirm whether the host can execute `npm start` directly. Do not assume standard Vercel deployment behavior on this host.

Likely next implementation batch:

1. Inspect the hosting panel requirements and add a minimal CommonJS `server.js` compatible with Passenger and Next.js 16.
2. Add an appropriate start script only if required by the host.
3. Test the startup file locally using production `.next` output and a non-default port.
4. Prepare a deployment package/list that excludes `.git`, `.env`, local databases, logs, tests, artifacts, and other development-only files while retaining required source/build/runtime files.
5. Document the exact upload, install, Prisma, build, environment, and Passenger restart sequence.
6. Configure preview-only protections such as `noindex` and disabled/test checkout where practical.

Do not deploy externally or change DNS without explicit user authorization and the required hosting access.

## Minimum Preview Environment

For a temporary public preview, at minimum configure real staging values for:

- `DATABASE_URL`
- `NEXTAUTH_SECRET` (strong, unique staging secret)
- `NEXTAUTH_URL` (temporary HTTPS URL)
- `NEXT_PUBLIC_SITE_URL` (temporary HTTPS URL)
- `ADMIN_JOB_SECRET` (strong, unique staging secret)
- `NODE_ENV=production`

Keep Stripe and other payment providers in test/demo mode. Do not use production payment keys for this preview.

The environment inventory currently has a known failure because code reads `NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN`, but `.env.example` does not document it. Fix/document that before calling the environment inventory clean.

Never print or commit `.env` contents. The local `.env` exists and is ignored.

## Full Production Readiness Status

The successful build means the project is suitable to continue toward a temporary preview. It is not yet approved for real customer traffic or transactions.

Known full-production blockers from the latest readiness run:

- Required production URLs/secrets are placeholders or missing locally.
- Payment, monitoring, support-email, and webhook production configuration is incomplete.
- Backup restore evidence is stale and no real provider restore drill is recorded.
- Manual assistive-technology signoff is not recorded.
- Go-live and provider evidence paths are not configured.
- Dependency advisory evidence is stale, and the latest clean install now reports additional high/critical advisories that require investigation.
- Current Git changes are not consolidated into a reviewed commit.
- Deleted local media versus remote replacements still needs explicit validation.

These items should not be confused with temporary-domain preview requirements.

## Useful Commands

```powershell
# Local development
npm run dev

# Regenerate Prisma Client after a clean dependency install
npm run prisma:generate

# Production build
npm run build

# Focused quality checks
npm run lint
npx tsc --noEmit
npm test

# Environment and release tooling
npm run env:inventory
npm run deployment:check
npm run launch:readiness
npm run security:audit

# Complete release gate (long-running)
npm run release:check
```

If `npm ci` is run again, follow it with `npm run prisma:generate` before building. Without the generated Prisma Client, TypeScript reports that `PrismaClient` is not exported from `@prisma/client`.

## Working Rules For The Next Chat

- Inspect before editing.
- Preserve all existing source and test changes.
- Do not restore removed screenshots, logs, or backup artifacts.
- Do not remove `node_modules` or `.next` for routine cleanup.
- Use Node.js 22.23.2 on the temporary server.
- Treat temporary preview readiness separately from real production readiness.
- Verify any deployment-specific startup code locally before giving control-panel instructions.
- Keep the user informed, but continue autonomously through related implementation and verification work when asked.
