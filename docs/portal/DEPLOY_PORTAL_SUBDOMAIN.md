# Deploying the CRM to portal.ishatechnologies.in

The public site stays on `https://www.ishatechnologies.in`. The CRM is served from
`https://portal.ishatechnologies.in` by the **same codebase** (one Vercel project, two domains).
Nothing is deployed or changed in production until you do the steps below.

## How it works

- `APP_URL=https://portal.ishatechnologies.in` (Production env only) switches the app into
  *portal-subdomain mode* (`src/lib/portal/host.ts`, `src/middleware.ts`):
  - **On the portal host:** clean URLs (`/login`, `/dashboard`, `/clients`, `/projects`, `/tasks`,
    `/documents`, `/invoices`, `/tickets`, `/meetings`, `/notifications`, `/team`, `/reports`,
    `/settings`, `/leads`, `/proposals`, `/contracts`, `/analytics`, `/renewals`, `/ai`, `/time`,
    `/profitability`) are rewritten to the internal `/portal/*` routes. `/payments` forwards to
    `/invoices` (payments live on the invoice screens). `/` forwards to `/dashboard`. Legacy
    `/portal/*` URLs 308 to the clean URL (query strings such as `?token=` are preserved). No public
    website page, public API, sitemap or llms.txt is served; `robots.txt` is `Disallow: /`.
  - **On every other host** (`www`, apex, previews): `/portal/*` 308-redirects to the portal host, so the
    old "Client Login" link keeps working. Everything else is untouched.
  - **Unset** (local, Preview): no change — the portal lives at `/portal/*` as before.
- Safety: the host is taken from `APP_URL` and **must start with `portal.`**; pointing `APP_URL` at `www`
  can never turn the public site into the CRM.
- Authentication is enforced server-side on every request: the Edge middleware redirects a missing
  session cookie to `/login` (fast path), and every page/action/route re-validates the session row, user and
  permissions in the database.
- The CRM is private: every response on the portal host carries `X-Robots-Tag: noindex, nofollow, noarchive`
  and `Cache-Control: private, no-store`; it is not in `sitemap.xml`; Google Analytics, the attribution
  tracker and the public navbar/footer/WhatsApp button are disabled there.
- PWA: on the portal host the manifest (`/manifest`) has scope `/` and `start_url=/dashboard`, and the
  service worker is `/sw.js` (scope `/`). It caches only the offline page, icons and static assets.

## 1. Vercel → Project → Settings → Domains
Add `portal.ishatechnologies.in` to the **existing** project (the one serving `www`). Vercel shows the exact DNS
record to create at your DNS provider (normally a `CNAME` for `portal` pointing at the target Vercel displays;
use the value shown there — do not guess it). Leave `www` and the apex redirect as they are.

## 2. Vercel → Settings → Environment Variables → **Production**

| Variable | Type | Value |
| --- | --- | --- |
| `DATABASE_URL` | Secret (Sensitive) | Supabase **Session Pooler**, port **5432**: `postgresql://postgres.pqhpilkmwdderfgslmpa:<PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres` (URL-encode special characters in the password). **Not 6543** — the transaction pooler stalls the dashboard with this driver. |
| `ENCRYPTION_KEY` | Secret (Sensitive) | 32 random bytes, base64. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` (a ready value is in your local, gitignored `.env.vercel-production.local`). Changing it later invalidates 2FA enrolments, Google connections and pending codes. |
| `CRON_SECRET` | Secret (Sensitive) | Random string, ≥32 chars: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Vercel Cron sends it as `Authorization: Bearer …` to `/api/portal/cron/daily`. |
| `EMAIL_API_KEY` | Secret (Sensitive) | Your **Resend** API key (the same one the contact form already uses). |
| `EMAIL_FROM` | Config | Sender such as `Isha Technologies <portal@ishatechnologies.in>`; the domain must be **verified in Resend** (SPF/DKIM), otherwise mail is rejected. |
| `APP_URL` | Config | `https://portal.ishatechnologies.in` |

Not required for launch: `RAZORPAY_*`, `STRIPE_*` (online payments), `ANTHROPIC_API_KEY` (Isha AI),
`GOOGLE_CLIENT_ID/SECRET` (Calendar/Meet), `S3_*`/`BLOB_READ_WRITE_TOKEN` (file storage — without one, files
are stored in the database), `CLAMAV_*`. Add them when you enable those features.

**Do not** set Production variables on Preview. Preview must use a *different* database (a Supabase branch or a
second project) — or leave `DATABASE_URL` unset there so the portal shows its "coming online" notice. Never
point Preview at the production database. Leave `APP_URL` unset on Preview.

## 3. After deploying (when you decide to)
1. Run `npm run db:check` locally (already applied: 49 tables, RLS, 5 migrations).
2. Third-party callbacks use the portal host: Google OAuth redirect URI
   `https://portal.ishatechnologies.in/api/portal/google/callback`; payment webhooks
   `https://portal.ishatechnologies.in/api/portal/webhooks/razorpay` and `/stripe`.
3. Verify: `/dashboard` signed-out → `/login`; sign in; `curl -sI https://portal.ishatechnologies.in/robots.txt`;
   `https://www.ishatechnologies.in/` and its `robots.txt`/`sitemap.xml` unchanged.
4. Rotate the database password (it appeared in chat) and update it in Vercel and `.env.local`.

## Local verification
`npm test`, `npm run test:smoke` and the SEO check run against the local PGlite database. Because `.env.local`
holds the real `DATABASE_URL`, run them with `DATABASE_URL=` (empty) so they never touch Supabase — the demo-seed
and test scripts also refuse a remote database on their own.
