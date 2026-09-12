# Footer "Website Visitors" stat — setup

## Current

- GA4 page-view tracking is configured and live, using Measurement ID
  `G-98Z5JSM7P9` (`NEXT_PUBLIC_GA_MEASUREMENT_ID`, loaded by
  `src/components/analytics/GoogleAnalytics.tsx`, mounted once in
  `src/app/layout.tsx`). This sends normal page views for every route,
  including client-side navigation, and is unaffected by anything below.
- GA4 Property: `553855156` (`GA4_PROPERTY_ID`).
- The global footer has a compact "Website Visitors" stat, in the Connect
  column below the Slack row, showing GA4's real, all-time "Total Users"
  figure — never a fake, random, or client-side-counted number.

## Current limitation

The public footer visitor number requires secure server-side GA4 Data API
credentials that **do not exist yet**. Until they're added, the endpoint
returns `{ "status": "not_configured" }` and the footer shows:

> Website Visitors
> Analytics setup required

This is expected, not a bug — the site works normally either way, and
nothing here can crash the build, a page render, or the footer.

## Why this needs a separate, server-side credential

`NEXT_PUBLIC_GA_MEASUREMENT_ID` is public and only used for *collecting*
traffic. *Reading* an aggregate figure back out requires the separate,
credentialed Google Analytics Data API, called from a real server — never
from the browser, and never with `NEXT_PUBLIC_` credentials.

The site is deployed on **Cloudflare Pages** (via `@cloudflare/next-on-pages`),
so the credentialed read lives in an ordinary Next.js Route Handler:
`src/app/api/analytics/visitors/route.ts` (Edge runtime — just `fetch` and
Web Crypto, no Node-specific APIs, no extra dependency), which next-on-pages
compiles into a Cloudflare Pages Function. The footer's `FooterVisitorStat`
component (`src/components/layout/FooterVisitorStat.tsx`) calls that route
at `/api/analytics/visitors` and renders one of: a loading skeleton,
"Analytics setup required", the real number, or "Currently unavailable"
(only if it's configured but a live call fails).

```
Footer (browser)
   │  GET /api/analytics/visitors
   ▼
Next.js Route Handler (Cloudflare Pages Function)   ← credentials only ever live here
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
5. Add the server-side environment variables in **Cloudflare Pages**
   (Workers & Pages → your project → Settings → Environment Variables,
   for both **Production** and **Preview**):

   | Variable | Value |
   |---|---|
   | `GA4_PROPERTY_ID` | `553855156` (already safe to set — not secret) |
   | `GA4_CLIENT_EMAIL` | the service account's `client_email` |
   | `GA4_PRIVATE_KEY` | the service account's `private_key` (PEM), added as an **Encrypted** value |

   These are intentionally **not** prefixed `NEXT_PUBLIC_` — they must
   never reach the browser. `NEXT_PUBLIC_GA_MEASUREMENT_ID` stays as-is
   alongside them, unaffected.
6. Redeploy on Cloudflare Pages so the new environment variables take effect.
7. Verify: open the site, check the footer shows a real number, and
   cross-check that number against GA4's own reporting (Reports → Audience,
   or Explore → a Users metric) for the same property.

Once all three are set, the footer automatically starts showing the real
number — no code change needed. The result is cached for ~30 minutes
(`export const revalidate = 1800` in the route handler), so every visitor
sees the same stable number and Google isn't called on every page load.

## Security notes

- The service-account private key / any OAuth access token are **only ever
  read inside `src/app/api/analytics/visitors/route.ts`**, which runs on
  Cloudflare's servers as a Pages Function, never in the browser.
- The endpoint's response is always exactly `{ "status": "ok", "visitors": <number> }`
  (or `not_configured` / `error`) — never credentials, tokens, or raw GA4
  API payloads.
- No personal contact-form information (name, email, phone, company,
  message) is ever sent to GA4 — see `src/components/forms/ContactForm.tsx`,
  which only fires aggregate `contact_form_view` / `contact_form_submit`
  events with no field values attached.
