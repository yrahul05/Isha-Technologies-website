# Footer "Website Visitors" stat — setup

## Current

- GA4 page-view tracking is configured and live, using Measurement ID
  `G-98Z5JSM7P9` (`NEXT_PUBLIC_GA_MEASUREMENT_ID`, loaded by
  `src/components/analytics/GoogleAnalytics.tsx`, mounted once in
  `src/app/layout.tsx`). This sends normal page views for every route,
  including client-side navigation, and is completely unaffected by
  anything below — this feature does not touch GA4 in any way.
- Cloudflare Web Analytics (the privacy-first, cookieless beacon) is
  unaffected too — this feature is a separate, read-only call to
  Cloudflare's **GraphQL Analytics API**, not the Web Analytics beacon
  script.
- The global footer has a compact "Website Visitors" stat, in the Connect
  column below the social icon row, showing the real count of **visits to
  ishatechnologies.in over the last 30 days**, read from Cloudflare's
  GraphQL Analytics API — never a fake, random, all-time, or
  client-side-counted number.

## Why Cloudflare (not GA4) for this number

This domain is already proxied through Cloudflare (orange-clouded), so
Cloudflare is already collecting zone-level traffic for free. Its GraphQL
Analytics API (`https://api.cloudflare.com/client/v4/graphql`) exposes a
`visits` metric per day via the `httpRequests1dGroups` dataset — no
separate analytics product or consent banner required, and no Upstash/
Redis or any other database anywhere in this flow.

## Why this needs a separate, server-side credential

Reading an aggregate figure back out of Cloudflare requires an API token
scoped to `Zone > Analytics > Read`, called from a real server — never
from the browser, and never with a `NEXT_PUBLIC_` variable. The token must
never be logged or returned in any API response.

The site is deployed via **OpenNext to a single Cloudflare Worker**
(`wrangler.jsonc`, `open-next.config.ts` — not Cloudflare Pages), so the
credentialed read lives in an ordinary Next.js Route Handler:
`src/app/api/analytics/visitors/route.ts` (`runtime = 'nodejs'` — just
`fetch`, no Node-specific APIs, no extra dependency). It must **not**
declare `runtime = 'edge'`: under OpenNext's Cloudflare Worker build, an
edge-runtime route is compiled with Next.js's own Edge Runtime sandbox,
whose `process.env` is frozen at build time and never sees the Worker's
real runtime secrets — this was the actual cause of the footer always
showing "setup required" in an earlier, GA4-based version of this route,
identical to a bug the contact form (`src/app/api/contact/route.ts`) had
and was fixed for. The footer's `FooterVisitorStat` component
(`src/components/layout/FooterVisitorStat.tsx`) calls
`/api/analytics/visitors` and renders one of: a loading skeleton, the real
number, or an "Analytics unavailable" fallback.

```
Footer (browser)
   │  GET /api/analytics/visitors
   ▼
Next.js Route Handler (Cloudflare Worker, nodejs runtime)   ← token only ever lives here
   │  POST https://api.cloudflare.com/client/v4/graphql
   │  query { viewer { zones(filter:{zoneTag}) {
   │    httpRequests1dGroups(filter:{date_geq, date_leq}) { sum { visits } }
   │  } } }
   ▼
Cloudflare GraphQL Analytics API
   │  per-day `visits` for the last 30 complete UTC days, summed server-side
   ▼
{ status: "ok", visits: <number> }  ← only this minimal shape ever
   │                                     reaches the browser
   ▼
Footer renders "<number> Visits" / "Last 30 days"
```

## Date range — read this before changing the query

**"Last 30 days", not all-time.** Cloudflare's GraphQL Analytics API only
exposes per-day aggregates (`httpRequests1dGroups`) — there is no
all-time or cross-day-deduplicated unique-visitor endpoint to query
instead. The route:

1. Computes `since` / `until` as the last 30 complete UTC days, ending
   **yesterday** (today is excluded — its data is still accumulating and
   would make the number jump around intra-day).
2. Queries `httpRequests1dGroups(filter: { date_geq: since, date_leq: until })`
   for `sum { visits }`, one row per day.
3. Sums `visits` across those rows server-side.

Cloudflare defines a "visit" as a session deduplicated **within a single
day** (by IP + User-Agent). A person who visits on multiple days within
the window is counted once per day, not once overall — so this number is
genuinely "visits over the last 30 days", **not** a unique-visitor or
all-time figure, and the UI is worded accordingly ("Website Visitors" /
"`<n>` Visits" / "Last 30 days" caption). Do not relabel this as
"all-time visitors" without changing the underlying query to something
that actually supports that without double-counting — Cloudflare's
GraphQL API does not currently offer that.

## Fallback UI (no live count available)

When the endpoint reports anything other than `"ok"` (missing
credentials, a failed/timed-out Cloudflare call, or an invalid response
shape), the footer renders "Website Visitors" / "Analytics unavailable"
instead of a number. **`0` is only ever shown if Cloudflare genuinely
reports 0 visits for the window** — it is never used as an error
placeholder.

## Setup

1. In the Cloudflare dashboard, open **ishatechnologies.in** → Overview →
   copy the **Zone ID** from the right sidebar.
2. Create an **API token** (My Profile → API Tokens → Create Token →
   Custom Token) scoped to exactly:
   - Permissions: `Zone` → `Analytics` → `Read`
   - Zone Resources: `Include` → `Specific zone` → `ishatechnologies.in`
   No other permissions are needed for this feature.
3. Add both as **Cloudflare Worker Variables and Secrets** (Workers &
   Pages → `isha-technologies-website` → Settings → Variables and
   Secrets):

   | Variable | Value | Type |
   |---|---|---|
   | `CLOUDFLARE_API_TOKEN` | the token from step 2 | **Secret** (encrypted) |
   | `CLOUDFLARE_ZONE_ID` | the zone ID from step 1 | Variable (not secret, but kept server-side) |

   These are intentionally **not** prefixed `NEXT_PUBLIC_` — they must
   never reach the browser. `NEXT_PUBLIC_GA_MEASUREMENT_ID` and Cloudflare
   Web Analytics stay exactly as-is alongside them, unaffected.
4. Redeploy the Worker (`npm run cf:deploy`) so the new secrets take
   effect.
5. Verify: open the site, check the footer shows a real "`<number>` Visits"
   figure, and cross-check it against dash.cloudflare.com → the domain →
   **Analytics & Logs** for the same 30-day window.

Once both are set on the live Worker, the footer automatically starts
showing the real number — no further code change needed. The result is
cached for ~30 minutes (`export const revalidate = 1800` in the route
handler), so every visitor sees the same stable number and Cloudflare
isn't called on every page load.

## Security notes

- `CLOUDFLARE_API_TOKEN` is **only ever read inside
  `src/app/api/analytics/visitors/route.ts`**, which runs on Cloudflare's
  own servers (the Worker), never in the browser, and is never logged.
- The endpoint's response is always exactly `{ "status": "ok", "visits": <number> }`
  (or `not_configured` / `error`) — never the token, request headers, or
  the raw Cloudflare GraphQL payload.
- No personal contact-form information (name, email, phone, company,
  message) is ever sent to Cloudflare or GA4 by this feature — see
  `src/components/forms/ContactForm.tsx`, which only fires aggregate
  `contact_form_view` / `contact_form_submit` events with no field values
  attached.
