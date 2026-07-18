# Launch Readiness

Run this checklist after the final staging deployment is configured and before production traffic is pointed at the site.

## Local Evidence

```bash
npm run backup:restore-drill
npm run deployment:check
npm run env:inventory
npm run launch:evidence
npm run security:moderates
npm run launch:readiness
npm run release:check
```

`npm run deployment:check` fails on missing required production variables and obvious placeholder/local values such as `localhost`, `example`, and `replace-with...`.

Archive:

- `.restore-drill/latest-report.json`
- `.launch-readiness/latest-report.json`
- `.launch-readiness/evidence-report.json`
- `.launch-readiness/advisory-report.json`
- `test-results/lighthouse/*.json` from the final `npm run test:lighthouse` run
- Playwright reports or CI run links from the final `npm run release:check`
- Filled `docs/PROVIDER_RESTORE_EVIDENCE_TEMPLATE.md`
- Filled `docs/GO_LIVE_DECISION_RECORD.md`

## Production Evidence

Record these before launch:

- Provider backup identifier and timestamp.
- Staging restore timestamp, database target, migration version, and verifier.
- URL for restore evidence in `BACKUP_RESTORE_RUNBOOK_URL`.
- Local filled restore evidence file path in `PROVIDER_RESTORE_EVIDENCE_PATH`.
- Uptime monitor URL for `/api/health`.
- Admin ops health check result from `/api/admin/ops/health`.
- Maintenance cron target for `POST /api/admin/jobs/maintenance`.
- Manual assistive-technology signoff URL in `ASSISTIVE_TECH_SIGNOFF_URL`.
- Local filled assistive-tech evidence file path in `ASSISTIVE_TECH_SIGNOFF_PATH`.
- Local filled go-live decision record path in `GO_LIVE_DECISION_RECORD_PATH`.
- Rollback artifact/version and database backup to restore if rollback is needed.

Templates:

- `docs/PROVIDER_RESTORE_EVIDENCE_TEMPLATE.md`
- `docs/ASSISTIVE_TECH_SIGNOFF.md`
- `docs/GO_LIVE_DECISION_RECORD.md`

## Launch Decision

Do not mark the production-readiness roadmap item complete until:

- `npm run launch:readiness` has no `fail` checks.
- `npm run env:inventory` confirms every env var read by code is documented in `.env.example`.
- `npm run launch:evidence` has no `fail` checks.
- `npm run security:moderates` has no unexpected moderate, high, or critical advisories.
- Provider backup and staging restore evidence exists.
- Manual assistive-technology signoff is pass or accepted conditional pass.
- Required production payment, email, monitoring, cron, and auth secrets are configured.
- A final production-like `npm run release:check` passes.

Use `LAUNCH_READINESS_STRICT=true npm run launch:readiness` when the launch meeting should fail on warnings as well as hard failures.
