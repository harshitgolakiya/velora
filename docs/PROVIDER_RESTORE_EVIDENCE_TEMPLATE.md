# Provider Restore Evidence Template

Copy this into the release evidence log after the real provider backup has been restored into staging.

## Backup Source

- Production provider:
- Database name / project:
- Backup identifier:
- Backup started at:
- Backup completed at:
- Backup storage location:
- Media backup identifier / location:
- Person who created or verified backup:

## Restore Target

- Staging provider:
- Staging database name / project:
- Restore started at:
- Restore completed at:
- Restored application URL:
- Migration command:
- Migration version after restore:
- Person who verified restore:

## Verification

- `prisma migrate deploy` result:
- `/api/health` result:
- `/api/admin/ops/health` result:
- `npm run release:check` result or CI URL:
- Product detail smoke route:
- Cart smoke result:
- Checkout smoke result:
- Account/order smoke result:
- Admin media smoke result:
- Local media files restored: yes/no/not applicable

## Decision

- Restore drill status: pass / conditional pass / failed
- Open issues:
- Required fixes before launch:
- Evidence URL for `BACKUP_RESTORE_RUNBOOK_URL`:
