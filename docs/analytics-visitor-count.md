# Footer "Website Visitors" stat, and the internal /analytics dashboard

## Current

- GA4 page-view tracking is configured and live, using Measurement ID
  `G-98Z5JSM7P9` (`NEXT_PUBLIC_GA_MEASUREMENT_ID`, loaded by
  `src/components/analytics/GoogleAnalytics.tsx`, mounted once in
  `src/app/layout.tsx`). This sends normal page views for every route,
  including client-side navigation (a `useEffect` on `usePathname()` fires
  `gtag('config', ..., { page_path })` on every route change, with the
  bootstrap script's automatic page_view disabled via
  `send_page_view: false` — so the initial load and every later
  client-side navigation are each tracked exactly once, from one place).
- The global footer has a compact "Website Visitors" stat, in the Connect
  column below the social icon row, showing the real count of **sessions
  on ishatechnologies.in over the last 30 days**, read back out of that
  same GA4 property via the **GA4 Data API** — never a fake, random,
  all-time, or client-side-counted number.
- An internal, password-gated dashboard at **`/analytics`** shows a fuller
  picture from the same GA4 property: total visitors, active users right
  now, page views, sessions, top pages, traffic sources and a device
  breakdown, all over the last 30 days. See "Internal /analytics
  dashboard" below.
- This feature is a separate, read-only, server-side call — it does not
  change how GA4 tracking itself works, and it does not use Cloudflare
  Analytics (the site is hosted on Vercel; this project no longer uses
  any Cloudflare service).

## Why GA4 (not Cloudflare) for this number

The site was previously hosted on Cloudflare Workers and used Cloudflare's
GraphQL Analytics API for this stat. After migrating hosting to Vercel,
that integration was removed — using Cloudflare's Analytics API would
require re-introducing a dependency on Cloudflare that the migration was
meant to eliminate. Since GA4 page-view tracking was already configured
and live on the site, reading an aggregate back out of that same GA4
property is the simplest option that needs no new analytics platform.

## Why this needs a separate, server-side credential

Reading an aggregate figure back out of GA4 requires the **GA4 Data API**,
which authenticates with a Google Cloud **service account** — never a
browser-exposed API key. The service account's private key must be called
from a real server, never from the browser, and never with a
`NEXT_PUBLIC_` variable.

The site is deployed on **Vercel**, so the credentialed read lives in an
ordinary Next.js Route Handler: `src/app/api/analytics/visitors/route.ts`
(`runtime = 'nodejs'` — uses the built-in `crypto` module to sign the
service-account JWT, plus `fetch`; no extra npm dependency), reading
`GA4_PROPERTY_ID` / `GA4_CLIENT_EMAIL` / `GA4_PRIVATE_KEY` from
Vercel's server-side environment variables. The footer's
`FooterVisitorStat` component
(`src/components/layout/FooterVisitorStat.tsx`) calls
`/api/analytics/visitors` and renders one of: a loading skeleton, the real
number, or an "Analytics unavailable" fallback.

```
Footer (browser)
   │  GET /api/analytics/visitors
   ▼
Next.js Route Handler (Vercel serverless function, nodejs runtime)   ← private key only ever lives here
   │  1. Sign a service-account JWT (RS256, via node:crypto)
   │  2. POST https://oauth2.googleapis.com/token  (JWT-bearer grant)
   │       → short-lived OAuth2 access token
   │  3. POST https://analyticsdata.googleapis.com/v1beta/properties/{id}:runReport
   │       { dateRanges: [{startDate:"30daysAgo", endDate:"yesterday"}],
   │         metrics: [{name:"sessions"}] }
   ▼
GA4 Data API
   │  total `sessions` for the last 30 complete days
   ▼
{ status: "ok", visits: <number> }  ← only this minimal shape ever
   │                                     reaches the browser
   ▼
Footer renders "<number> Visits" / "Last 30 days"
```

## Date range — read this before changing the query

**"Last 30 days", not all-time.** The route requests GA4's relative date
range `30daysAgo` → `yesterday` (today is excluded — its data is still
accumulating and would make the number jump around intra-day) for the
`sessions` metric, and reads the single summed value GA4 returns for that
range.

GA4's `sessions` metric is the closest analog to a "visit" — a person who
visits on multiple days within the window contributes a session each time,
so this is genuinely "sessions over the last 30 days", **not** a
unique-visitor or all-time figure, and the UI is worded accordingly
("Website Visitors" / "`<n>` Visits" / "Last 30 days" caption). Swapping
the metric to `activeUsers` (deduplicated users, not sessions) would need
the UI wording updated to match — don't mix the two without also changing
the label.

## Fallback UI (no live count available)

When the endpoint reports anything other than `"ok"` (missing
credentials, a failed/timed-out Google API call, or an invalid response
shape), the footer renders "Website Visitors" / "Analytics unavailable"
instead of a number. **`0` is only ever shown if GA4 genuinely reports 0
sessions for the window** — it is never used as an error placeholder.

## Setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create or
   pick a project, then enable the **Google Analytics Data API** for it
   (APIs & Services → Enable APIs and Services → search "Google Analytics
   Data API").
2. Create a **service account** (IAM & Admin → Service Accounts → Create
   Service Account) — no project-level roles are needed, it only needs
   access granted directly on the GA4 property in step 3.
3. Create a **JSON key** for that service account (the service account's
   page → Keys → Add Key → Create new key → JSON) and download it. It
   contains `client_email` and `private_key` — these become
   `GA4_CLIENT_EMAIL` and `GA4_PRIVATE_KEY` below.
4. In [Google Analytics](https://analytics.google.com/), open the GA4
   property for ishatechnologies.in → **Admin → Property Access
   Management** → add the service account's `client_email` as a **Viewer**.
5. Note the **Property ID** (Admin → Property Settings, a numeric ID) —
   this becomes `GA4_PROPERTY_ID`.
6. Add all three as **Vercel Environment Variables** (Project → Settings →
   Environment Variables, for the Production — and Preview, if you want
   the number in preview deployments too — environments):

   | Variable | Value | Type |
   |---|---|---|
   | `GA4_PROPERTY_ID` | the property ID from step 5 | Plain (not secret, but kept server-side) |
   | `GA4_CLIENT_EMAIL` | the `client_email` from step 3 | Plain |
   | `GA4_PRIVATE_KEY` | the `private_key` from step 3 | **Sensitive** (encrypted) |

   None of these are prefixed `NEXT_PUBLIC_` — they must never reach the
   browser. `NEXT_PUBLIC_GA_MEASUREMENT_ID` (client-side page-view
   tracking) stays exactly as-is alongside them, unaffected.
7. Redeploy on Vercel (push to `main`, or trigger a redeploy from the
   Vercel dashboard) so the new environment variables take effect.
8. Verify: open the site, check the footer shows a real "`<number>` Visits"
   figure, and cross-check it against Google Analytics → Reports →
   Realtime/Engagement for the same 30-day window.

Once all three are set on Vercel, the footer automatically starts showing
the real number — no further code change needed. The result is cached for
~30 minutes (`export const revalidate = 1800` in the route handler), so
every visitor sees the same stable number and the GA4 Data API isn't
called on every page load.

## Internal /analytics dashboard

A fuller dashboard lives at `/analytics` — total visitors, active users
right now, page views, sessions, top 5 pages, top 5 traffic sources, and
a device (desktop/mobile/tablet) breakdown, all for the last 30 days.
It reuses the same GA4 service account as the footer stat
(`GA4_PROPERTY_ID` / `GA4_CLIENT_EMAIL` / `GA4_PRIVATE_KEY` — the JWT
signing and report-fetching logic is shared in `src/lib/ga4.ts`), so no
separate Google Cloud setup is needed once those three are already
configured.

**Access control.** This site has no user-account system, so the
dashboard is gated by a single shared password rather than a full auth
framework — proportionate to what it protects (aggregate marketing
stats, not customer data):

1. Set a strong, random value as a fourth env var, **`ANALYTICS_DASHBOARD_PASSWORD`**
   (Vercel: Sensitive/encrypted, same as `GA4_PRIVATE_KEY`). Leave it
   unset and the dashboard shows "not configured" instead of ever
   allowing access.
2. Visiting `/analytics` without a valid session shows a password form.
   Submitting the correct password (`POST /api/analytics/auth`) sets an
   httpOnly, `Secure` (in production), `SameSite=Lax` session cookie
   valid for 12 hours — the cookie is an HMAC-SHA256 of a fixed string
   keyed by the password (`src/lib/analytics-auth.ts`), never the
   password itself, so it can't be reversed if it ever leaked.
3. The dashboard's data route, `GET /api/analytics/dashboard`, is
   protected twice: `src/middleware.ts` rejects any request to that exact
   path without a valid session cookie before the route handler even
   runs, and the route handler independently re-checks the same cookie —
   so it stays safe to call directly even if the middleware matcher is
   ever changed.
4. `/analytics` itself is marked `robots: { index: false, follow: false }`
   and is never linked from navigation, the footer, or the sitemap —
   reachable only by someone who already has the URL and the password.

The session check (`verifyAnalyticsSessionValue`) is built on the Web
Crypto API (`crypto.subtle`), not Node's `crypto` module, specifically
because Next.js middleware always runs on the Edge Runtime, which
doesn't support Node's `crypto` — `crypto.subtle` is a global available
in both the Edge and Node.js runtimes, so the exact same verification
function runs correctly in `src/middleware.ts`, the dashboard route, and
the page's own server-side cookie check.

## Security notes

- `GA4_PRIVATE_KEY` is **only ever read inside server-side Route
  Handlers** (`src/app/api/analytics/visitors/route.ts` and
  `src/app/api/analytics/dashboard/route.ts`, via the shared
  `src/lib/ga4.ts`), never in the browser, and is never logged.
- The visitors endpoint's response is always exactly
  `{ "status": "ok", "visits": <number> }` (or `not_configured` / `error`)
  — never the private key, the OAuth2 access token, or the raw GA4 Data
  API payload. The dashboard endpoint follows the same discipline: only
  the aggregate numbers above, never a credential or raw API response.
- `ANALYTICS_DASHBOARD_PASSWORD` is only ever read inside
  `src/lib/analytics-auth.ts`; it's never logged, never included in an
  API response, and never stored in the session cookie itself (the
  cookie is an HMAC derived from it, not the password).
- No personal contact-form information (name, email, phone, company,
  message) is ever sent to GA4 by this feature — see
  `src/components/forms/ContactForm.tsx`, which only fires aggregate
  `contact_form_view` / `contact_form_submit` events with no field values
  attached.
