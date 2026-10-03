# Isha Technologies Portal — Setup & Operations

The portal lives at `/portal` inside the existing Next.js site. Public pages are unchanged; the portal adds a PostgreSQL database, private file storage and (optionally) Google Calendar.

## 1. Local development (zero external services)

```bash
npm install
npm run db:setup      # migrations + roles/permissions + demo data (embedded PGlite in .data/)
npm run dev           # http://localhost:3000/portal/login
```

Without `DATABASE_URL`, development uses **PGlite** (real Postgres compiled to WASM) under `.data/pglite`, and uploads go to `.data/uploads` (outside the source tree, git-ignored). Stop `npm run dev` before running `db:*` scripts (PGlite allows one process at a time). Reset everything with `rm -rf .data && npm run db:setup`.

Demo accounts (password `Isha@Demo2026!`, **development only**):

| Role | Email | Sees |
| --- | --- | --- |
| Super Admin | admin@ishatechnologies.in | everything |
| Admin | ops@ishatechnologies.in | configurable (no audit/settings/security/request approval by default) |
| Team member | aarav@ / meera@ishatechnologies.in | Northwind projects only |
| Team member | kabir@ishatechnologies.in | Zenith project only |
| Client A owner | rohan@northwind.example | Northwind only (INR, IGST invoices) |
| Client A member | nisha@northwind.example | Northwind only (invited meetings) |
| Client B | ananya@zenith.example | Zenith only (INR, CGST + SGST invoices) |
| Client D | liam@maple.example | Maple Analytics only (CAD invoice) |

Accounts are created by an administrator in **User management** (there is no self-registration, no emailed invite and no password-reset email); see "Accounts & passwords" below.

## 2. Tests

| Command | What it checks |
| --- | --- |
| `npm test` | server-action guard + migrate + seed + **business-logic (GST, currencies, webhook signatures) + 116 tenant-isolation / RBAC / retention checks** (runs in CI via `npm test --if-present`) |
| `npm run test:accounts` | 69 end-to-end checks of admin-controlled accounts against a running local server: no registration, create/reset/force-change/disable/revoke, old passwords die, no password in any page/API/audit/log |
| `npm run test:logic` | GST split, totals, INR/USD/CAD formatting, Razorpay/Stripe webhook signature verification |
| `npm run test:isolation` | isolation suite against the current database |
| `npm run check:actions` | every `'use server'` export is an async function with an auth check |
| `npm run test:smoke -- <url>` | **143 HTTP checks** against a running server: login, cross-tenant URL/API probes for every entity, PDFs, avatars, uploads, noindex, sitemap |
| `npm run seo:check` | existing SEO crawler (unchanged) |

## 3. Production (Vercel)

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | **Required.** PostgreSQL connection string (Neon, Supabase, RDS, Vercel Postgres). Use the **pooled** URL on serverless. Until it is set, `/portal` shows a "coming online" notice. |
| `ENCRYPTION_KEY` | **Required.** 32 random bytes, base64 — encrypts Google tokens and 2FA secrets, signs upload/OAuth tokens. `openssl rand -base64 32`. **Rotating it invalidates stored Google connections, 2FA enrolments and outstanding codes.** |
| `APP_URL` | `https://www.ishatechnologies.in` — used in emails and OAuth redirects. |
| `CRON_SECRET` | random string; Vercel Cron sends it to `/api/portal/cron/daily` (09:00 IST: overdue invoices, deadline reminders, lead follow-ups, housekeeping). |
| `EMAIL_API_KEY`, `EMAIL_FROM` | already used by the contact form; the portal reuses them for security alerts and meeting/invoice/task notifications (no password or sign-in depends on email). `EMAIL_FROM` must be a sender verified with the provider (e.g. `Isha Technologies <portal@ishatechnologies.in>`). **Without them, codes can't be delivered in production — password reset and password change will not work.** |
| `STORAGE_DRIVER` | optional: `database`, `vercel-blob`, `s3` or `local`. Auto-detected when unset (see below). |
| `BLOB_READ_WRITE_TOKEN` | optional: Vercel Blob store token (added automatically when you connect a Blob store to the project). |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | optional: S3-compatible storage. Optional `S3_ENDPOINT` (Cloudflare R2 / MinIO), `S3_FORCE_PATH_STYLE=1`, `S3_SSE=none`. |
| `CLAMAV_HOST`, `CLAMAV_PORT`, `CLAMAV_REQUIRED` | optional: malware scanning (see "File security"). |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional: Google Calendar / Meet. |

Mark every secret as **Sensitive** in Vercel. None of them use a `NEXT_PUBLIC_` prefix and none reach the browser.

### First deploy

```bash
# locally, pointing at the production database
DATABASE_URL=postgres://… npm run db:migrate
DATABASE_URL=postgres://… SEED_ADMIN_EMAIL=you@ishatechnologies.in SEED_ADMIN_PASSWORD='<strong password>' npm run db:seed
```

`db:seed` without `--demo` creates only the Super Admin; demo data refuses to run in production. Run `db:migrate` again after every deploy that adds a file under `drizzle/` (or add it to your release step). Migration `0002_retention_rules.sql` installs database triggers that make invoices, payments and the audit log impossible to delete, and an issued invoice number impossible to change.

### File storage

There is **no S3 bucket today**, so the portal does not assume one. Storage sits behind a `StorageProvider` interface (`src/server/storage.ts`); the provider is chosen by `STORAGE_DRIVER`, or automatically:

| Priority | Provider | When | Notes |
| --- | --- | --- | --- |
| 1 | `s3` | `S3_BUCKET` set | Presigned PUT/GET (60 s). Bucket must block public access. |
| 2 | `vercel-blob` | `BLOB_READ_WRITE_TOKEN` set | **Private** Blob store. Browser uploads use a single-use client token restricted to one pathname, content type and exact size; downloads stream through the authorised route (the blob URL is never exposed). |
| 3 | `database` | production default | Files are stored in PostgreSQL (`file_chunks`, 4 MB chunks). No extra service, and files are covered by database backups. Best for modest volumes (the default 25 MB upload limit). |
| — | `local` | development default | `.data/uploads` (or `LOCAL_UPLOAD_DIR`), outside the repo. Not for serverless production (the filesystem is ephemeral). |

Each document version records which provider holds it, so you can switch providers later without migrating old files (old files keep being served by their original provider as long as it stays configured). Adding another provider means implementing the interface — nothing else changes.

**Recommendation for now:** keep the `database` default. When volumes grow, create a private Vercel Blob store (Project → Storage → Blob, access **Private**) or an S3/R2 bucket and set the variables above.

S3 bucket checklist (when you add one): block all public access, default encryption, versioning, CORS `PUT` from `https://www.ishatechnologies.in` with headers `content-type, x-amz-server-side-encryption`, IAM `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `arn:aws:s3:::<bucket>/*` only.

### File security

- Extension allow-list (PDF, Word, Excel, CSV, PNG, JPG, ZIP); stored MIME type comes from the allow-list, never the browser; size limit (Settings → Storage).
- After upload the server checks the exact size and the file signature (magic bytes), computes a SHA-256 checksum and, if configured, scans with ClamAV. Anything that fails is deleted.
- Storage keys are random UUID paths; user-supplied names are sanitised and only used for display.
- Every document belongs to a client and optionally a project/task/ticket; downloads go only through `/api/portal/documents/:id/download`, which applies the same row-level scope as the listings (foreign ids → 404) and audits the download. Infected versions are never served.
- **Malware scanning** is an integration point, not a bundled service: serverless functions can't run ClamAV. Point `CLAMAV_HOST` (+ `CLAMAV_PORT`, default 3310) at a `clamd` you run elsewhere (e.g. the `clamav/clamav` container on a small VM). Set `CLAMAV_REQUIRED=1` to reject uploads while the scanner is unreachable. Without it, versions are recorded as `not_scanned` — Settings → System says so.

### Accounts & passwords (admin-controlled)

- **No self-registration, no OTP, no reset links.** Only users holding the `users.manage` permission (Super Admin and Admin by default) can create accounts, in **User management** (`/portal/users`): Employee, Client (linked to a client company) and — for Super Admin only — Admin. An Admin cannot manage Admins or the Super Admin.
- The creator types an **initial password** (policy: ≥10 characters, three character classes) and tells the person themselves. It is hashed with scrypt immediately; passwords and hashes are never stored in plaintext, returned by any page or API, logged, or written to the audit log.
- **Forgotten password:** the person contacts an Admin/Super Admin, who opens *User management → user → Reset password* and enters a **new** password (all of the user's sessions end at once). An admin can replace a password but can never see the old one.
- **Force password change on next login** (default on for new accounts and resets): the next sign-in lands on `/portal/settings/security/change-password`; until the user chooses their own password every page redirects there, and every API call and server action is refused (enforced server-side in `requireViewer` / `getViewer`). Success clears `force_password_change`.
- Users change their own password with **current + new + confirm** (Settings → Security); their other devices are signed out. Their email/username are changed by an admin only.
- Per-user admin controls: edit, reset password, force change, enable/disable, revoke sessions, security activity. Disabling or resetting ends all sessions immediately. Sign-in is rate-limited (5 failures/account and 25/IP per 15 minutes).
- Existing databases: run `npm run db:migrate` — migration `0005_admin_managed_accounts` adds one column (`users.force_password_change`) and the sync grants the new `users.manage` permission to Admin. Nothing is dropped (the legacy `auth_tokens` / `otp_codes` tables are left in place, unused).

### Google Calendar / Meet

1. Google Cloud Console → new project → enable **Google Calendar API**.
2. OAuth consent screen: External (or Internal for Workspace), scopes `openid`, `email`, `https://www.googleapis.com/auth/calendar.events`. Publish the app (Testing mode tokens expire after 7 days).
3. Credentials → OAuth client ID → Web application. Authorised redirect URI: `https://www.ishatechnologies.in/api/portal/google/callback` (Settings → Google Calendar shows the exact value).
4. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. Each team member connects **their own** Google account in **Settings → Google Calendar** (status shows Connected / Needs reconnecting, with Reconnect and Disconnect). Meetings they create or approve with "Create Google Meet" are created on their calendar and Google emails the invitees.

### Invoices

- Currencies: **INR** (default), **USD**, **CAD** (Settings → Invoice settings / Currencies). Amounts are stored in minor units and never summed across currencies.
- INR: GST with CGST + SGST (client in the supplier's state) or IGST (other states), rates from Settings → Tax / GST. USD/CAD: no GST fields; optional custom tax (label + rate).
- Numbering: drafts carry a provisional `DRAFT-…` number; the permanent number `<PREFIX>-<YEAR>-<NNNN>` (e.g. `ISH-2026-0001`) is assigned server-side, in a transaction, when the invoice is issued. A database trigger prevents changing it afterwards.
- Payment details: Settings → Payment details holds a domestic profile (bank, IFSC, UPI) and an international profile (SWIFT/BIC, IBAN, routing/transit, bank address, instructions). Each field has its own "show on invoice" switch, and each invoice chooses which profile (or none) prints.

### Online payments (Razorpay / Stripe)

- Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (INR) and/or `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (USD/CAD). With none set, invoices show bank-transfer details only and the "Pay online" button is hidden.
- Register webhooks: `https://www.ishatechnologies.in/api/portal/webhooks/razorpay` (`payment_link.paid`) and `/api/portal/webhooks/stripe` (`checkout.session.completed`, `checkout.session.async_payment_succeeded`).
- An invoice is credited **only** by a webhook whose HMAC signature verifies over the raw body and whose amount and currency match the stored order. Returning from checkout never credits anything. Crediting is idempotent, so retried webhooks cannot double-pay. Stripe timestamps older than 5 minutes are rejected.

### Isha AI assistant

Set `ANTHROPIC_API_KEY` (optional `ANTHROPIC_MODEL`). The assistant is read-only and uses tools that query through the same scope predicates as the pages (`src/server/assistant/tools.ts`), so it can only reveal what the signed-in user could already open. Staff need the `ai.use` permission; without the key `/portal/assistant` reports it isn't configured.

### Business modules

Permissions gate each module: `proposals.view`, `contracts.view`, `time.log` / `time.view_all` (timesheets and profitability), `renewals.view` (Renewal & Expiry Center), `analytics.view` (executive dashboard). Clients see only non-draft proposals and contracts of their own account, and never see time, profitability, renewals or analytics. The daily cron also sends proposal expiry/follow-up, contract and renewal reminders, meeting-minutes and timesheet nudges, each once (`reminder_log`).

### Supabase PostgreSQL (production)

Project `isha-technologies-crm` (ref `pqhpilkmwdderfgslmpa`), Shared Transaction Pooler: `aws-0-ap-south-1.pooler.supabase.com:6543`, user `postgres.pqhpilkmwdderfgslmpa`. See `DATABASE_URL` in `.env.example`; the real password lives only in `.env.local` and Vercel (URL-encode special characters).

1. **Vercel → Settings → Environment Variables:** add `DATABASE_URL` (Sensitive) for **Production**. For **Preview**, use a *separate* database (a Supabase branch or second project) so preview deployments never touch production data. Add the other required variables from the table above (`ENCRYPTION_KEY`, `APP_URL`, `CRON_SECRET`, `EMAIL_*`).
2. **Check connectivity (read-only):** `npm run db:check` — prints host/db (never the password), table count, RLS status, applied migrations.
3. **Migrate:** `npm run db:migrate` applies `drizzle/*.sql` in order and syncs roles/permissions. Migrations are additive (no `DROP`/`TRUNCATE`). Never use `drizzle-kit push` on production. Create tables only through migrations, not the Supabase Table Editor.
4. **First Super Admin:** `SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… npm run db:seed` (no `--demo`).
5. **Demo data and tests never run against a remote database.** `db:seed --demo`, `test:isolation` and `test:smoke` refuse unless the target is local; run `npm test` with `DATABASE_URL` unset (embedded PGlite). `ALLOW_TEST_ON_REMOTE_DB=1` exists only for a disposable database.
6. **Row-level security:** migration `0004_rls_lockdown` enables RLS (no policies) on every table and revokes `anon`/`authenticated`, so Supabase's public REST/GraphQL API can't read CRM data. The app connects as `postgres`, which bypasses RLS; real authorization is `src/server/scope.ts`. Never expose the Supabase anon key for this schema.
7. Client settings: TLS required, `prepare: false`, one pooled connection per Vercel instance (`DATABASE_POOL_MAX` to override), one client per process.

### Mobile / PWA

The portal is installable (`/portal.webmanifest`, scope `/portal/`). The service worker (`/portal/sw.js`) caches only the public offline page, icons and static assets — never portal pages, API responses or documents — so a shared device can't expose another user's data after sign-out. Service workers register in production builds only.

## 4. Security model (summary)

- **Authentication:** scrypt password hashes; server-side sessions (only a SHA-256 of the cookie token is stored) in `__Host-` httpOnly Secure SameSite=Lax cookies that expire at the next midnight IST (min. 3 h); logout, deactivation, password change/reset, email change and role change revoke sessions. Optional TOTP 2FA (enforceable for team accounts). DB-backed throttling: 5 failures/account and 25/IP per 15 min. Generic error messages; constant-time comparison even for unknown users.
- **Account changes:** a password change needs the current password; email/username are changed by administrators only. Admin password resets end every session of the user and are audited (`user.password_set_by_admin`) without recording any password.
- **Authorisation:** `src/server/scope.ts` defines row-level predicates for every entity (clients, projects, tasks, work requests, documents, invoices, payments, tickets, meetings, notes, activity, users, change requests, leads, leave); every page, route handler, search and export composes them into SQL. Client users are scoped by `client_id` independently of the editable permission matrix. Unauthorised record URLs return 404.
- **Super Admin → Security:** active sessions (revoke one device or all of a user's), sign-ins, failed sign-ins and lockouts, password/2FA/email/role changes.
- **Retention:** tasks go Active → Completed → Archived; deletion is a soft delete visible to the Super Admin in "Recently deleted"; permanent deletion is Super Admin only, requires typing the title, and is audited. Clients can never delete. Projects and documents can be archived. Invoices, payments and the audit log can't be deleted at all (database triggers).
- **CSRF:** Server Actions (Next.js origin check), same-origin checks on mutating route handlers, SameSite cookies, signed OAuth state + nonce cookie.
- **Indexing:** `/portal` pages and `/api/portal` responses carry `X-Robots-Tag: noindex, nofollow` and a robots meta tag, are excluded from the sitemap, and are not sent to Google Analytics.
- **Audit:** `audit_logs` records sign-ins (incl. failures), permission changes, financial actions, document access, approvals, archive/delete/purge, with IP and user agent. Super Admin → Audit log (CSV export with formula-injection protection).
