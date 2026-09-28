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

## Deploy on Vercel (via GitHub)

The app deploys to **Vercel** using Vercel's native Next.js support — no
adapter, build command, or config file needed. Vercel auto-detects this as
a standard Next.js App Router project and handles the build and output.

1. Push this repo to GitHub (`yrahul05/Isha-Technologies-website`).
2. In the Vercel dashboard: **Add New → Project**, and import the GitHub
   repo. Leave the framework preset as **Next.js** and the build/output
   settings on their defaults.
3. Add the environment variables below under **Project → Settings →
   Environment Variables** (Production and Preview) — they are read from
   `.env.local` only for local dev and are never committed:
   - `CONTACT_EMAIL`, `EMAIL_FROM`, `EMAIL_API_KEY` (contact form email —
     see [Contact form](#contact-form) below)
   - `NEXT_PUBLIC_GA_MEASUREMENT_ID` (analytics)
   - `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY`
     (optional footer visitor count, read from the GA4 Data API — see
     `docs/analytics-visitor-count.md`)
4. Set the production domain (`www.ishatechnologies.in`) and an apex
   redirect under **Project → Settings → Domains**.
5. Every push to `main` triggers a Production deployment; every pull
   request gets its own Preview deployment — both automatic via Vercel's
   GitHub integration, no manual deploy step and no GitHub Actions
   involvement.

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

Copy `.env.example` to `.env.local` and fill in the values to run this
locally. See that file for the full list of variables.
