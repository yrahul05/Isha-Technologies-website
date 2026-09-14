# Footer "Website Visitors" stat — setup

## Current

- GA4 page-view tracking is configured and live, using Measurement ID
  `G-98Z5JSM7P9` (`NEXT_PUBLIC_GA_MEASUREMENT_ID`, loaded by
  `src/components/analytics/GoogleAnalytics.tsx`, mounted once in
  `src/app/layout.tsx`). This sends normal page views for every route,
  including client-side navigation, and is unaffected by anything below.
- GA4 Property: `553855156` (`GA4_PROPERTY_ID`).
- The global footer has a compact "Website Visitors" stat, in the Connect
  column below the social icon row, showing GA4's real, all-time "Total
  Users" figure — never a fake, random, or client-side-counted number.

## Current limitation

The public footer visitor number requires secure server-side GA4 Data API
credentials to actually be present **on the deployed Cloudflare Worker**
(not just in a local `.env.local`). Until they are, the endpoint returns
`{ "status": "not_configured" }` (or `"error"` if a live Google call
fails), and the footer now shows a neutral "Website Analytics — View
traffic & performance" link instead of a broken-looking placeholder — see
"Fallback UI" below.

This is expected, not a bug — the site works normally either way, and
nothing here can crash the build, a page render, or the footer. **No
Upstash Redis, or any other database, is used or required anywhere in
this flow** — the only external calls are to Google's own OAuth2/Data API
endpoints, both free.

## Why this needs a separate, server-side credential

`NEXT_PUBLIC_GA_MEASUREMENT_ID` is public and only used for *collecting*
traffic. *Reading* an aggregate figure back out requires the separate,
credentialed Google Analytics Data API, called from a real server — never
from the browser, and never with `NEXT_PUBLIC_` credentials.

The site is deployed via **OpenNext to a single Cloudflare Worker**
(`wrangler.jsonc`, `open-next.config.ts` — not Cloudflare Pages), so the
credentialed read lives in an ordinary Next.js Route Handler:
`src/app/api/analytics/visitors/route.ts` (`runtime = 'nodejs'` — just
`fetch` and Web Crypto, no Node-specific APIs, no extra dependency).
It must **not** declare `runtime = 'edge'`: under OpenNext's Cloudflare
Worker build, an edge-runtime route is compiled with Next.js's own Edge
Runtime sandbox, whose `process.env` is frozen at build time and never
sees the Worker's real runtime secrets — this was the actual cause of the
footer always showing "setup required" in earlier versions of this route,
identical to a bug the contact form (`src/app/api/contact/route.ts`) had
and was fixed for. The footer's `FooterVisitorStat` component
(`src/components/layout/FooterVisitorStat.tsx`) calls
`/api/analytics/visitors` and renders one of: a loading skeleton, the real
number, or the "Website Analytics" fallback link (for both
`not_configured` and `error`, so visitors never see internal ops status
text).

```
Footer (browser)
   │  GET /api/analytics/visitors
   ▼
Next.js Route Handler (Cloudflare Worker, nodejs runtime)   ← credentials only ever live here
   │  signs a JWT, exchanges it for an access token
   ▼
Google OAuth2 → Google Analytics Data API
   │  runReport({ metrics: [totalUsers] })
   ▼
{ status: "ok", visitors: <number> }  ← only this minimal shape ever
   │                                     reaches the browser
   ▼
Footer renders the real number
```

## Fallback UI (no live count available)

When the endpoint reports anything other than `"ok"`, the footer renders a
"Website Analytics / View traffic & performance" card linking to
`https://analytics.google.com/` instead of a number — this never invents
or hard-codes a visitor count, and never shows "setup required" /
"unavailable" wording to public visitors.

## Future setup

1. Create/identify a Google Cloud project (a new, free one is fine).
2. Enable the **Google Analytics Data API** on that project (APIs &
   Services → Library → "Google Analytics Data API" → Enable).
3. Create a **service account** in that project (IAM & Admin → Service
   Accounts → Create), with a JSON key downloaded for it. Keep this file
   out of git — `*service-account*.json` is already in `.gitignore`.
4. In GA4, grant that service account access to **Property 553855156**
   (Admin → Property Access Management → add the service account's
   `client_email` as a Viewer).
5. Add the server-side environment variables as **Cloudflare Worker
   secrets** (Workers & Pages → `isha-technologies-website` → Settings →
   Variables and Secrets):

   | Variable | Value |
   |---|---|
   | `GA4_PROPERTY_ID` | `553855156` (already safe to set — not secret) |
   | `GA4_CLIENT_EMAIL` | the service account's `client_email` |
   | `GA4_PRIVATE_KEY` | the service account's `private_key` (PEM), added as an **encrypted Secret**, not a plain-text Variable |

   These are intentionally **not** prefixed `NEXT_PUBLIC_` — they must
   never reach the browser. `NEXT_PUBLIC_GA_MEASUREMENT_ID` stays as-is
   alongside them, unaffected.
6. Redeploy the Worker (`npm run cf:deploy`) so the new secrets take effect.
7. Verify: open the site, check the footer shows a real number, and
   cross-check that number against GA4's own reporting (Reports → Audience,
   or Explore → a Users metric) for the same property.

Once all three are set on the live Worker, the footer automatically
starts showing the real number — no further code change needed. The
result is cached for ~30 minutes (`export const revalidate = 1800` in the
route handler), so every visitor sees the same stable number and Google
isn't called on every page load.

## Alternative / additional free source: Cloudflare Web Analytics

Because this domain is already proxied through Cloudflare (orange-clouded),
Cloudflare is already collecting zone-level aggregate traffic (requests,
bandwidth, unique visitor approximation) for free, viewable at
dash.cloudflare.com → the domain → **Analytics & Logs**, with no code
change at all. Cloudflare also offers a separate free product, **Web
Analytics** (privacy-first, cookieless page-view/visit tracking), which can
be turned on from the same dashboard (Analytics & Logs → Web Analytics →
Enable). Automatic setup requires no code change (Cloudflare injects the
beacon at the edge for a proxied zone); manual setup instead adds one
`<script>` tag with a public, non-secret site token. Either path only
needs Cloudflare dashboard access — not a code change here — so it hasn't
been wired into this repo; it's independent of, and can be used alongside,
the GA4-based footer stat above.

## Security notes

- The service-account private key / any OAuth access token are **only ever
  read inside `src/app/api/analytics/visitors/route.ts`**, which runs on
  Cloudflare's servers, never in the browser.
- The endpoint's response is always exactly `{ "status": "ok", "visitors": <number> }`
  (or `not_configured` / `error`) — never credentials, tokens, or raw GA4
  API payloads.
- No personal contact-form information (name, email, phone, company,
  message) is ever sent to GA4 — see `src/components/forms/ContactForm.tsx`,
  which only fires aggregate `contact_form_view` / `contact_form_submit`
  events with no field values attached.
