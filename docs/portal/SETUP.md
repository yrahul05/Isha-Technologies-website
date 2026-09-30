# Isha Technologies Portal — Setup & Operations

The portal lives at `/portal` inside the existing Next.js site. Public pages are unchanged; the portal adds a PostgreSQL database, private file storage and (optionally) Google Calendar.

## 1. Local development (zero external services)

```bash
npm install
npm run db:setup      # migrations + roles/permissions + demo data (embedded PGlite in .data/)
npm run dev           # http://localhost:3000/portal/login
```

Without `DATABASE_URL`, development uses **PGlite** (real Postgres compiled to WASM) under `.data/pglite`, and uploads go to `.data/uploads`. Stop `npm run dev` before running `db:*` scripts (PGlite allows one process at a time). Reset everything with `rm -rf .data && npm run db:setup`.

Demo accounts (password `Isha@Demo2026!`, **development only**):

| Role | Email | Sees |
| --- | --- | --- |
| Super Admin | admin@ishatechnologies.in | everything |
| Admin | ops@ishatechnologies.in | configurable (no audit/settings by default) |
| Team member | aarav@ / meera@ishatechnologies.in | Northwind projects only |
| Team member | kabir@ishatechnologies.in | Zenith project only |
| Client A owner | rohan@northwind.example | Northwind only |
| Client A member | nisha@northwind.example | Northwind only (invited meetings) |
| Client B | ananya@zenith.example | Zenith only |

When email isn't configured, password-reset / invite links are printed to the dev server console, and admins see a one-time copy link in the UI.

## 2. Tests

| Command | What it checks |
| --- | --- |
| `npm test` | server-action guard + migrate + seed + **70 tenant-isolation / RBAC checks** (runs in CI via `npm test --if-present`) |
| `npm run test:isolation` | isolation suite against the current database |
| `npm run check:actions` | every `'use server'` export is an async function with an auth check |
| `npm run test:smoke -- <url>` | 73 HTTP checks against a running server (login, direct-URL isolation, PDFs, noindex, sitemap…) |
| `npm run seo:check` | existing SEO crawler (unchanged) |

## 3. Production (Vercel)

### Required environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (Neon, Supabase, RDS, Vercel Postgres). Use the **pooled** URL on serverless. |
| `ENCRYPTION_KEY` | 32 random bytes, base64 — encrypts Google tokens and 2FA secrets, signs upload/OAuth tokens. `openssl rand -base64 32`. **Rotating it invalidates stored Google connections and 2FA enrolments.** |
| `APP_URL` | `https://www.ishatechnologies.in` — used in emails and OAuth redirects. |
| `CRON_SECRET` | random string; Vercel Cron sends it to `/api/portal/cron/daily` (09:00 IST: overdue invoices, deadline reminders, lead follow-ups, housekeeping). |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | private document storage. Optional `S3_ENDPOINT` (Cloudflare R2 / MinIO) and `S3_FORCE_PATH_STYLE=1`. |
| `EMAIL_API_KEY`, `EMAIL_FROM` | already used by the contact form; the portal reuses them for invites, resets and high-priority notifications. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Calendar / Meet (optional feature). |

Mark every secret as **Sensitive** in Vercel. None of them use a `NEXT_PUBLIC_` prefix and none reach the browser.

### First deploy

```bash
# locally, pointing at the production database
DATABASE_URL=postgres://… npm run db:migrate
DATABASE_URL=postgres://… SEED_ADMIN_EMAIL=you@ishatechnologies.in SEED_ADMIN_PASSWORD='<strong password>' npm run db:seed
```

`db:seed` without `--demo` creates only the Super Admin; demo data refuses to run in production. Run `db:migrate` again after every deploy that adds a file under `drizzle/` (or add it to your release step).

### S3 bucket

- Block **all** public access; enable default encryption and **versioning**.
- CORS (browser uploads go straight to the bucket via presigned PUT):

```json
[{ "AllowedOrigins": ["https://www.ishatechnologies.in"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["content-type", "x-amz-server-side-encryption"], "MaxAgeSeconds": 600 }]
```

- IAM policy for the portal's key: `s3:PutObject`, `s3:GetObject` on `arn:aws:s3:::<bucket>/*` only. For R2 set `S3_SSE=none` (R2 encrypts at rest itself).

### Google Calendar / Meet

1. Google Cloud Console → new project → enable **Google Calendar API**.
2. OAuth consent screen: External (or Internal for Workspace), scopes `openid`, `email`, `https://www.googleapis.com/auth/calendar.events`. Publish the app (Testing mode tokens expire after 7 days).
3. Credentials → OAuth client ID → Web application. Authorised redirect URI: `https://www.ishatechnologies.in/api/portal/google/callback` (Settings → Google Calendar shows the exact value).
4. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. Each team member connects their own Google account in **Settings → Google Calendar**; meetings they schedule with "Create Google Meet" are created on their calendar with an auto-generated Meet link and Google emails the invitees.

## 4. Security model (summary)

- **Authentication:** scrypt password hashes; server-side sessions (only a SHA-256 of the cookie token is stored) in `__Host-` httpOnly Secure SameSite=Lax cookies that expire at the next midnight IST (min. 3 h); logout, deactivation, password change and role change revoke sessions. Optional TOTP 2FA (enforceable for team accounts). DB-backed throttling: 5 failures/account and 25/IP per 15 min. Generic error messages; constant-time comparison even for unknown users.
- **Authorisation:** `src/server/scope.ts` defines row-level predicates for every entity; every page, route handler, search and export composes them into SQL. Client users are scoped by `client_id` independently of the editable permission matrix. Unauthorised record URLs return 404.
- **CSRF:** Server Actions (Next.js origin check), same-origin checks on mutating route handlers, SameSite cookies, signed OAuth state + nonce cookie.
- **Files:** extension allow-list, MIME from the allow-list (never the browser), size limit, magic-byte signature check after upload, private bucket, 60-second signed download URLs issued after an authorisation check, every download audited.
- **Indexing:** `/portal` pages and `/api/portal` responses carry `X-Robots-Tag: noindex, nofollow` and a robots meta tag, are excluded from the sitemap, and are not sent to Google Analytics.
- **Audit:** `audit_logs` records sign-ins (incl. failures), permission changes, financial actions, document access, approvals, with IP and user agent. Super Admin → Audit log (CSV export with formula-injection protection).
