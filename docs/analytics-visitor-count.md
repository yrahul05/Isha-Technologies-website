# Footer "Website Visitors" stat — setup

## Current

- GA4 page-view tracking is configured and live, using Measurement ID
  `G-98Z5JSM7P9` (`NEXT_PUBLIC_GA_MEASUREMENT_ID`, loaded by
  `src/components/analytics/GoogleAnalytics.tsx`, mounted once in
  `src/app/layout.tsx`). This sends normal page views for every route,
  including client-side navigation.
- The global footer has a compact "Website Visitors" stat, in the Connect
  column below the social icon row, showing the real count of **sessions
  on ishatechnologies.in over the last 30 days**, read back out of that
  same GA4 property via the **GA4 Data API** — never a fake, random,
  all-time, or client-side-counted number.
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

## Security notes

- `GA4_PRIVATE_KEY` is **only ever read inside
  `src/app/api/analytics/visitors/route.ts`**, which runs server-side on
  Vercel, never in the browser, and is never logged.
- The endpoint's response is always exactly `{ "status": "ok", "visits": <number> }`
  (or `not_configured` / `error`) — never the private key, the OAuth2
  access token, or the raw GA4 Data API payload.
- No personal contact-form information (name, email, phone, company,
  message) is ever sent to GA4 by this feature — see
  `src/components/forms/ContactForm.tsx`, which only fires aggregate
  `contact_form_view` / `contact_form_submit` events with no field values
  attached.
