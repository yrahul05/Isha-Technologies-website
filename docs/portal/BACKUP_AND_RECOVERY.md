# Backup & Recovery

The portal's durable state lives in exactly two places. Everything else (sessions, caches, the Next.js build) is disposable.

| Asset | Where | Contains |
| --- | --- | --- |
| **Database** | PostgreSQL (`DATABASE_URL`) | users, clients, projects, tasks, invoices, **payments**, tickets, meetings, notifications, leads, change requests, audit log, settings, document metadata & version history |
| **Files** | S3-compatible bucket (`S3_BUCKET`) | every uploaded document version (keys are referenced from `document_versions.storage_key`) |

Invoice PDFs are generated on demand from database rows, so backing up the database backs up every invoice and its full payment history.

## Targets

| | Target |
| --- | --- |
| RPO (max data loss) | ≤ 5 minutes (database PITR) / 0 for files (versioned bucket) |
| RTO (time to restore) | ≤ 2 hours |

## 1. Database

1. **Point-in-time recovery (primary).** Enable PITR on the provider: Neon (history retention ≥ 7 days on paid plans), Supabase (PITR add-on), AWS RDS (automated backups, 7–35 days). This covers accidental deletes and bad migrations.
2. **Daily logical backup (independent copy).** A scheduled job (GitHub Actions or any server) runs:

   ```bash
   pg_dump --format=custom --no-owner "$DATABASE_URL" > isha-portal-$(date +%F).dump
   aws s3 cp isha-portal-$(date +%F).dump s3://<backup-bucket>/db/ --sse AES256
   ```

   Store it in a **separate** bucket/account with Object Lock (compliance mode) or lifecycle rules: keep 30 dailies, 12 monthlies, 7 yearlies (Indian GST law requires invoice records to be retained for at least 6 years after the relevant year).
3. **Before every migration** run a manual `pg_dump` (or create a Neon branch) so a failed migration can be rolled back in minutes.

## 2. Documents

- Enable **bucket versioning** (overwrites and deletions become recoverable) and **cross-region replication** (or R2 → second bucket via rclone nightly).
- The portal never overwrites objects (every version has a new key) and document deletion is a soft delete, so files remain recoverable even without versioning.
- Lifecycle: move non-current versions to infrequent-access storage after 30 days; never expire current versions.

## 3. Secrets

Keep `ENCRYPTION_KEY`, `CRON_SECRET`, Google and S3 credentials in the team password manager. **`ENCRYPTION_KEY` is required to read Google tokens and 2FA secrets in a restored database** — losing it means users reconnect Google and re-enrol 2FA (data is otherwise intact).

## 4. Restore procedures

**Database (PITR):** create a branch/instance at the target timestamp → verify with `npm run test:isolation` pointed at it (read-only checks) → switch `DATABASE_URL` in Vercel → redeploy.

**Database (logical dump):**

```bash
createdb isha_restore
pg_restore --no-owner --dbname="$RESTORE_URL" isha-portal-YYYY-MM-DD.dump
DATABASE_URL="$RESTORE_URL" npm run db:migrate   # brings it to the current schema
```

**A single deleted document:** `update documents set deleted_at = null where id = '…';` (the file still exists), or restore the object version from the bucket.

**A single client's records:** restore the dump into a scratch database and copy that client's rows across by `client_id` (every client-owned table carries it).

## 5. Verification (monthly)

1. Restore last night's dump into a scratch database.
2. Run `npm run db:migrate` and spot-check row counts (`clients`, `invoices`, `payments`, `documents`) against production.
3. Download three random documents through a staging deployment pointed at the restored database + the production bucket (read-only key).
4. Record the result (date, restore time, issues) in the operations log.
