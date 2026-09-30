# Isha Technologies Portal — Implementation Plan

## 1. What exists today (inspected before any change)

| Area | Finding |
| --- | --- |
| Framework | Next.js 15.5 App Router, React 19, TypeScript strict, Turbopack dev/build |
| Styling | Tailwind CSS v4 (`src/app/globals.css` + `tailwind.config.ts`), shadcn/Radix primitives in `src/components/ui` |
| Design system | **Light** premium aesthetic: white surfaces, `slate-900` text, brand blue `#3478e4` (`--color-brand`), DM Sans, `rounded-xl`/`rounded-2xl` cards, `card-hover` blue glow, dotted-grid SVG backgrounds, `from-white to-brand/5` hero gradients, brand gradient CTA banners, lucide icons, framer-motion with `useReducedMotion` everywhere |
| Routes | `/`, `/about`, `/services` (+14 service pages), `/case-studies/[slug]`, `/resources/blogs/[slug]`, `/our-journey`, `/contact`, `/privacy-policy`, `/terms-and-conditions`, `/analytics` (private), `/llms.txt`, API: `/api/contact`, `/api/analytics/*` |
| SEO | `buildMetadata()` in `src/lib/seo.ts`, canonical www origin, per-page OG images, JSON-LD graph in root layout, dynamic `sitemap.ts`, static `public/robots.txt`, `scripts/seo-check.mjs` |
| Analytics | GA4 gtag in root layout, page-view effect in `GoogleAnalytics.tsx`, GA4 Data API dashboard at `/analytics` |
| Auth | None — only a shared-password HMAC cookie for `/analytics` (`src/lib/analytics-auth.ts`) |
| Database / storage | None |
| Email | Resend over `fetch` (`src/lib/email.ts`) |
| Deployment | Vercel, zero-config; CI runs lint + type-check + build |

> **Design note:** the brief describes the site as "premium dark". The live codebase is a
> **light** theme (white + brand blue). The portal follows the real design system so it reads
> as the same product; no dark theme was invented.

## 2. Architecture decisions

| Concern | Decision | Why |
| --- | --- | --- |
| Public vs private | Public pages untouched. Portal lives under `/portal`, its own layout/shell. Public navbar/footer/WhatsApp are hidden on `/portal` by a tiny client wrapper, so no public URL moves | No route churn, no SEO risk |
| Database | PostgreSQL via **Drizzle ORM**. `DATABASE_URL` → `postgres` driver (Neon, Supabase, RDS, Vercel Postgres all work). No `DATABASE_URL` in dev → embedded **PGlite** (real Postgres in WASM) under `.data/` | Provider-agnostic; runs locally with zero installs; production refuses to start without `DATABASE_URL` |
| Passwords | `scrypt` (Node built-in), per-user salt, timing-safe compare | No native deps on Vercel |
| Sessions | Random 256-bit token in an `httpOnly`, `Secure`, `SameSite=Lax` cookie (`__Host-` prefix in prod); only the SHA-256 hash is stored in `sessions`. Expires at the next **midnight IST** (min. 3 h lifetime so late logins aren't kicked out) — log in once per day | Revocable server-side; never localStorage |
| CSRF | Server Actions (Next.js built-in Origin check) for mutations; route handlers that mutate verify `Origin`; `SameSite=Lax` cookies | |
| Login rate limit | DB-backed failure counter per email and per IP (works across serverless instances) | In-memory limiter isn't global on Vercel |
| Authorization | Central `Viewer` + permission set; **every** read goes through scoped query builders in `src/server/scope.ts` that add tenant/assignment `WHERE` clauses in SQL; every mutation re-checks. Client-role users are *always* scoped by `client_id` regardless of any permission configuration | Never trust the client; misconfigured admin permissions can't widen a client's reach |
| RBAC | `roles`, `permissions`, `role_permissions` tables. Super Admin bypass is hard-coded; Admin/Employee permission sets editable in Settings | "Admin permissions should be configurable" |
| Files | Storage adapter: **S3-compatible** (AWS S3 / R2 / MinIO) with presigned PUT (browser → bucket, bypasses Vercel's 4.5 MB body limit) and 60-second presigned GET after an authorization check; **local disk** driver for dev. Extension + MIME allowlist, magic-byte sniffing, size limit | Private by default; no public bucket URLs |
| Real-time notifications | Visible-tab polling (20 s, backs off when hidden) of a cheap indexed endpoint; Web Audio chime only for *new* important notifications created after page load | Vercel functions can't hold WebSockets; polling is reliable and cheap |
| Google Meet | OAuth 2.0 authorization-code flow (offline), `calendar.events` scope, refresh token encrypted with AES-256-GCM (`ENCRYPTION_KEY`), event created via Calendar API with `conferenceData.createRequest` | Credentials never reach the browser |
| Invoice PDF | `pdf-lib`, generated on request server-side, Isha branding | Pure JS, serverless friendly |
| Charts | Hand-built SVG components | No 100 KB chart library in the bundle |
| Indexing | `/portal` layout `robots: noindex,nofollow`; middleware adds `X-Robots-Tag: noindex, nofollow` to `/portal/*` and `/api/portal/*`; `robots.txt` disallows `/portal`; GA page views are not sent from `/portal` | Defence in depth |

## 3. Phases

1. Auth + database + RBAC (schema, migrations, seed, sessions, login/logout/reset/invite, rate limit, middleware, noindex)
2. Super Admin dashboard (+ portal shell, charts, search skeleton)
3. Clients + team (profiles, logins, activity timeline, workload)
4. Projects + tasks (Kanban + list, checklist, comments, attachments)
5. Documents (upload, versions, preview, rename, delete, download audit)
6. Invoices + payments (PDF, lifetime history, statuses, overdue)
7. Tickets + notifications (targeted sends, announcements, leave, sound)
8. Meetings + Google Calendar/Meet + calendar
9. Leads + public Free DevOps & Cloud Assessment + CTAs
10. Reports, audit log viewer, change requests, settings
11. Polish, responsive pass, performance, security review, verification

See `SETUP.md` (env vars, OAuth, storage) and `BACKUP_AND_RECOVERY.md`.
