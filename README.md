# Isha Technologies – Website

Marketing website for **Isha Technologies** — Managed Cloud & DevOps Solutions.

Expert Infrastructure Support — Without Building Everything In-House

---

## Website Overview

The Isha Technologies website is built with **Next.js** to deliver a fast, modern and scalable experience.

### Key Highlights

- Fully responsive design for all devices and browsers
- Pages: Home, About, Services (with individual service pages), Case Studies, Blogs, Our Journey, Contact
- Interactive sections (cards, CTAs, animations)
- SEO-optimized with sitemap and robots.txt
- Built using the latest **Next.js** framework

---

## Run the Project Locally

Make sure you have installed:

- [Node.js (v18+)](https://nodejs.org/en/download)
- [Git](https://git-scm.com/downloads)
- npm

```bash
# 1. Clone the project
git clone <repository-url>

# 2. Navigate into the folder
cd isha-technologies

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

## Build

```bash
npm run lint
npm run build
```

## Deploy on Cloudflare (via GitHub)

The app deploys to **Cloudflare Workers** using the OpenNext Cloudflare
adapter (`@opennextjs/cloudflare`), which compiles this Next.js app —
including the `/api/contact` and `/api/analytics/visitors` Route Handlers —
into a Cloudflare Worker. Both routes already declare `runtime = 'edge'`
and use only `fetch`/Web Crypto, so no code changes are needed for them to
run on Cloudflare.

1. Push this repo to GitHub.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Import a
   repository**, and connect the GitHub repo.
3. Build settings:
   - Build command: `npm run cf:build`
   - Deploy command: `npx wrangler deploy`
   (Cloudflare's Next.js framework preset can also auto-detect these.)
4. Add the environment variables below under **Settings → Environment
   Variables** (Production and Preview) — they are read from `.env.local`
   only for local dev and are never committed:
   - `CONTACT_EMAIL`, `EMAIL_FROM`, `EMAIL_API_KEY` (contact form email —
     see [Contact form](#contact-form) below)
   - `SLACK_WEBHOOK_URL`, `NEXT_PUBLIC_SLACK_URL` (optional)
   - `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`,
     `GA4_PRIVATE_KEY` (analytics — see `docs/analytics-visitor-count.md`)
5. Every push to the connected branch rebuilds and redeploys automatically.

To build/preview the Cloudflare Worker locally:

```bash
npm run cf:build     # next build + OpenNext bundling into .open-next/
npm run cf:preview   # build, then run the Worker locally via wrangler
```

> `EMAIL_FROM`'s domain must be a **verified sender domain in Resend**
> before email sending will succeed in production — until then, `/api/contact`
> returns an error and the form transparently falls back to a `mailto:` link
> client-side, so enquiries are never silently lost either way.

## Contact form

The contact form posts to `/api/contact`, which validates and sanitizes the
submission, then sends:

- an internal enquiry email to `CONTACT_EMAIL`, with the visitor's address set
  as `Reply-To` (never as `From`), and
- an automatic confirmation email back to the visitor,

both via the transactional email provider configured through `EMAIL_FROM` and
`EMAIL_API_KEY` (Resend's HTTP API by default — see `src/lib/email.ts`). It
also includes a hidden honeypot field and basic per-IP rate limiting.

If `SLACK_WEBHOOK_URL` is set, the route additionally sends a best-effort
Slack notification (non-blocking; failures there never affect the visitor).

Copy `.env.example` to `.env.local` and fill in the values to run this
locally. See that file for the full list of variables, including the
optional public `NEXT_PUBLIC_SLACK_URL` used by the "Connect on Slack" button
on the Contact page.
