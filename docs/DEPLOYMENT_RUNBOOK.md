# Deployment Runbook

## Pre-Release

1. Set production environment variables from `.env.example`.
2. Run `npm run deployment:check`; it must pass with real production values, not local URLs or placeholder secrets.
3. Run `npm run env:inventory`; every env var read by code must be documented in `.env.example`.
4. Run `npm run backup:restore-drill`.
5. Run `npm run launch:evidence` to refresh `.launch-readiness/evidence-report.json`.
6. Run `npm run security:moderates` to refresh `.launch-readiness/advisory-report.json`.
7. Run `npm run launch:readiness`; use `LAUNCH_READINESS_STRICT=true` for the final launch decision if warnings should block traffic.
8. Run `npm run release:check`.
9. Confirm `/api/health` returns `200` against the deployment target.
10. Confirm an admin can open `/api/admin/ops/health` and review business-health issues.
11. Archive `.restore-drill/latest-report.json`, `.launch-readiness/latest-report.json`, `.launch-readiness/evidence-report.json`, `.launch-readiness/advisory-report.json`, and CI/release-check links with the launch evidence.

## Database And Migrations

1. Take a provider-level database backup before deploying migrations.
2. Run `prisma migrate deploy` in the deployment environment.
3. Verify the admin dashboard, product detail page, cart, checkout, and account order views.
4. Keep the previous deployment artifact available until smoke checks pass.

## Monitoring

1. Configure `MONITORING_WEBHOOK_URL` and `MONITORING_WEBHOOK_SECRET` for alert routing.
2. Add an uptime monitor for `GET /api/health`.
3. Schedule an authenticated admin check of `GET /api/admin/ops/health`.
4. Alert on HTTP `503`, failed email deliveries, exhausted product alerts, and return integration manual-action counts.

## Media

1. Admin uploads are stored locally under `public/images/admin/products`.
2. Keep local media files with the deployment artifact or copy them to the hosting provider's persistent volume before release.
3. Back up the local media directory with the database backup for every production release.
4. Recheck the admin media library and one product page that uses uploaded media after deployment.

## Backup And Restore Drill

1. Store database backups outside the application hosting provider.
2. Run the local drill before release to prove the current SQLite/libSQL backup can be copied, restored, opened, and counted:
   ```bash
   npm run backup:restore-drill
   ```
3. Archive `.restore-drill/latest-report.json` with the release evidence.
4. Once per release cycle, restore the latest provider backup into a staging database.
5. Run `prisma migrate deploy` against staging.
6. Run `npm run release:check` against the restored app environment.
7. Record the restore timestamp, backup identifier, migration version, and verifier with `docs/PROVIDER_RESTORE_EVIDENCE_TEMPLATE.md`.
8. Set `BACKUP_RESTORE_RUNBOOK_URL` to the final restore evidence location before launch.
9. Set `PROVIDER_RESTORE_EVIDENCE_PATH` to a filled local copy of the restore evidence before running `npm run launch:evidence`.

## Manual Accessibility Signoff

1. Run the automated accessibility gates through `npm run release:check`.
2. Complete the manual screen-reader and keyboard review in `docs/ASSISTIVE_TECH_SIGNOFF.md`.
3. Record reviewer, assistive technology versions, routes/workflows, findings, fixes, and final pass/conditional-pass decision.
4. Set `ASSISTIVE_TECH_SIGNOFF_URL` to the final review evidence location before launch.
5. Set `ASSISTIVE_TECH_SIGNOFF_PATH` to a filled local copy of the signoff evidence before running `npm run launch:evidence`.

## Go-Live Decision

1. Fill `docs/GO_LIVE_DECISION_RECORD.md` with release, evidence, risk, rollback, and approval details.
2. Set `GO_LIVE_DECISION_RECORD_PATH` to the filled decision record before running `npm run launch:evidence`.
3. Do not move production traffic until required evidence is present and unresolved risks have named owners.
4. Store the completed decision record with the release artifact.

## Rollback

1. Stop traffic to the failing deployment or promote the previous stable deployment.
2. If no irreversible migration ran, point traffic back to the previous deployment artifact.
3. If a migration must be reverted, restore the pre-release database backup and redeploy the previous artifact.
4. Run `/api/health`, admin login, product detail, cart, checkout, and order tracking smoke checks.
5. Record the incident, root cause, customer impact, and follow-up owner.
