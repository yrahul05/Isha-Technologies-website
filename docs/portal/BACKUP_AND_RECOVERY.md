# Backup & Recovery

> **Status: no backup mechanism is configured yet.** The application cannot back itself up, and nothing in this repository runs backups on its own. Until the steps below are done *and a restore has been tested*, the portal must not be described as backed up. Settings → System shows "Backups: not verified from the app" as a reminder.

The portal's durable state lives in two places, which are backed up **independently**. Everything else (sessions, caches, the Next.js build) is disposable.

| Asset | Where | Contains |
| --- | --- | --- |
| **Database** | PostgreSQL (`DATABASE_URL`) | users, clients, projects, tasks, work requests, invoices, **payments**, tickets, meetings, notifications, leads, change requests, audit log, settings, document metadata & version history — and, with the default `database` storage provider, the document files themselves (`file_chunks`) |
| **Files** | the configured storage provider | uploaded document versions and profile photos. `database` → inside PostgreSQL (covered by the database backup). `vercel-blob` / `s3` → the Blob store or bucket, which needs its own backup. |

Invoice PDFs are generated on demand from database rows, so backing up the database backs up every invoice and its full payment history.

## Targets (once configured)

| | Target |
| --- | --- |
| RPO (max data loss) | ≤ 5 minutes with database PITR; ≤ 24 h with daily dumps only |
| RTO (time to restore) | ≤ 2 hours |
| Retention | invoices, payments, audit log: ≥ 8 years (Indian GST law requires ≥ 6 years after the relevant year) |

## 1. Database backups (configure first)

1. **Point-in-time recovery (provider feature).** When choosing the PostgreSQL provider, enable PITR: Neon (history retention ≥ 7 days on paid plans), Supabase (PITR add-on), AWS RDS (automated backups, 7–35 days). Note that free tiers often have very short or no history.
2. **Daily logical backup (independent copy, outside the provider).** Example GitHub Actions workflow — **not active**; copy it to `.github/workflows/db-backup.yml` only after creating the destination and the secrets (`BACKUP_DATABASE_URL`, a read-only role is enough; destination credentials):

   ```yaml
   name: db-backup
   on:
     schedule: [{ cron: '30 20 * * *' }]   # 02:00 IST
     workflow_dispatch: {}
   jobs:
     dump:
       runs-on: ubuntu-latest
       steps:
         - run: sudo apt-get update && sudo apt-get install -y postgresql-client-16
         - run: pg_dump --format=custom --no-owner "$DATABASE_URL" > "isha-portal-$(date +%F).dump"
           env: { DATABASE_URL: '${{ secrets.BACKUP_DATABASE_URL }}' }
         # Upload to storage in a SEPARATE account/provider (S3 with Object Lock, R2, Backblaze B2…):
         # - run: aws s3 cp isha-portal-$(date +%F).dump s3://<backup-bucket>/db/ --sse AES256
   ```

   Keep 30 dailies, 12 monthlies, 8 yearlies. Encrypt at rest; restrict who can read dumps (they contain client data).
3. **Before every migration** take a manual `pg_dump` (or a Neon branch) so a failed migration can be rolled back in minutes.

## 2. File backups (depends on the storage provider)

- **`database` provider (current default):** files are rows in `file_chunks`; the database backup above covers them. Nothing else to configure.
- **`vercel-blob`:** Vercel Blob has no built-in versioning/backup. Schedule a job that lists the store (`@vercel/blob` `list()`) and copies new objects to a second location, or keep documents on the `database` provider.
- **`s3`:** enable bucket **versioning**, default encryption and **cross-region replication** (or a nightly `rclone sync` to a second provider). Lifecycle: move non-current versions to infrequent access after 30 days; never expire current versions.
- The portal never overwrites document versions (every version has a new random key) and document deletion is a soft delete, so a mistaken delete is recoverable without restoring a backup.

## 3. Secrets

Keep `ENCRYPTION_KEY`, `CRON_SECRET`, Google, email and storage credentials in the team password manager. **`ENCRYPTION_KEY` is required to read Google tokens and 2FA secrets in a restored database** — losing it means users reconnect Google and re-enrol 2FA (data is otherwise intact).

## 4. Restore procedures

**Database (PITR):** create a branch/instance at the target timestamp → verify with `npm run test:isolation` pointed at it (read-only checks) → switch `DATABASE_URL` in Vercel → redeploy.

**Database (logical dump):**

```bash
createdb isha_restore
pg_restore --no-owner --dbname="$RESTORE_URL" isha-portal-YYYY-MM-DD.dump
DATABASE_URL="$RESTORE_URL" npm run db:migrate   # brings it to the current schema
```

**A single deleted document:** `update documents set deleted_at = null where id = '…';` (the file still exists).

**A soft-deleted task:** Super Admin → Tasks → Recently deleted → Restore.

**A single client's records:** restore the dump into a scratch database and copy that client's rows across by `client_id` (every client-owned table carries it).

## 5. Verification (monthly, once backups exist)

1. Restore last night's dump into a scratch database.
2. Run `npm run db:migrate` and spot-check row counts (`clients`, `invoices`, `payments`, `documents`) against production.
3. Download three random documents through a staging deployment pointed at the restored database (and the file store, read-only).
4. Record the result (date, restore time, issues) in the operations log. Only after the first successful restore test should the system be described as backed up.
