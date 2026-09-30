#!/usr/bin/env node
/**
 * SEO / canonical consistency check for the built site.
 *
 *   npm run build && npm run start        # in one terminal
 *   npm run seo:check                     # in another (defaults to http://localhost:3000)
 *   npm run seo:check -- https://www.ishatechnologies.in   # or against production
 *
 * Crawls every URL in /sitemap.xml (plus the required-route inventory
 * below) and validates titles, descriptions, canonicals, Open Graph,
 * robots directives, H1s and JSON-LD structured data. Every canonical,
 * og:url, sitemap URL and JSON-LD URL must use the www origin. Exits
 * non-zero on any error; warnings are informational. No dependencies.
 */

const CANONICAL_ORIGIN = 'https://www.ishatechnologies.in';
const APEX_ORIGIN = 'https://ishatechnologies.in';
const base = (
  process.argv[2] ||
  process.env.SEO_CHECK_BASE_URL ||
  'http://localhost:3000'
).replace(/\/$/, '');

/** Route inventory — every one of these must be in the sitemap and pass. */
const REQUIRED_ROUTES = [
  '/',
  '/about',
  '/services',
  '/services/cloud-solutions',
  '/services/cloud-migration-modernization',
  '/services/managed-cloud',
  '/services/cloud-cost-optimization-finops',
  '/services/devops-solutions',
  '/services/devsecops',
  '/services/platform-engineering',
  '/services/infrastructure-as-code-gitops',
  '/services/kubernetes-container-platforms',
  '/services/observability-monitoring',
  '/services/site-reliability-engineering',
  '/services/ai-powered-devops-aiops',
  '/services/ai-cloud-infrastructure',
  '/services/cloud-security',
  '/resources/blogs',
  '/case-studies',
  '/contact',
  '/our-journey',
];

/** Must never appear anywhere in the rendered HTML (unverified claims). */
const FORBIDDEN_TEXT = [
  /Advanced Tier Services Partner/i,
  /No certificates found/i,
  /Certified Cloud &amp; DevOps Engineers|Certified Cloud & DevOps Engineers/i,
  /Average cloud cost reduction/i,
  /Platform uptime maintained/i,
];

const errors = [];
const warnings = [];
const err = (url, msg) => errors.push(`${url}  ✗ ${msg}`);
const warn = (url, msg) => warnings.push(`${url}  ! ${msg}`);

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

function parseAttrs(tag) {
  const attrs = {};
  for (const m of tag.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g))
    attrs[m[1].toLowerCase()] = decode(m[2]);
  return attrs;
}

function headTags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) =>
    parseAttrs(m[0])
  );
}

const toLocal = (url) => url.replace(CANONICAL_ORIGIN, base);
const pathOf = (url) => new URL(url).pathname;

async function get(url) {
  const res = await fetch(url, {
    redirect: 'manual',
    headers: { 'User-Agent': 'isha-seo-check' },
  });
  return {
    status: res.status,
    location: res.headers.get('location'),
    body: await res.text(),
  };
}

/** Recursively collect every string value under keys that hold URLs. */
function collectUrls(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => collectUrls(n, out));
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (
        typeof value === 'string' &&
        ['@id', 'url', 'item', 'image', 'logo'].includes(key)
      )
        out.push(value);
      else collectUrls(value, out);
    }
  }
  return out;
}

function flattenTypes(nodes) {
  const all = [];
  for (const node of nodes) {
    if (node['@graph']) all.push(...node['@graph']);
    else all.push(node);
  }
  return all;
}

async function checkRobots() {
  const { status, body } = await get(`${base}/robots.txt`);
  if (status !== 200) return err('/robots.txt', `status ${status}`);
  if (!body.includes(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`))
    err('/robots.txt', 'missing canonical Sitemap line');
  if (/Disallow:\s*\/_next/i.test(body))
    err('/robots.txt', 'blocks /_next/ (rendering assets)');
  if (/^Disallow:\s*\/\s*$/m.test(body))
    err('/robots.txt', 'contains a site-wide Disallow: /');
}

async function checkSitemap() {
  const { status, body } = await get(`${base}/sitemap.xml`);
  if (status !== 200) {
    err('/sitemap.xml', `status ${status}`);
    return [];
  }
  const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1].trim()
  );
  const seen = new Set();
  for (const loc of locs) {
    if (!loc.startsWith(CANONICAL_ORIGIN))
      err('/sitemap.xml', `non-canonical URL ${loc}`);
    if (seen.has(loc)) err('/sitemap.xml', `duplicate URL ${loc}`);
    if (/\/api\/|\/analytics/.test(loc))
      err('/sitemap.xml', `private URL listed ${loc}`);
    seen.add(loc);
  }
  const paths = new Set(locs.map(pathOf));
  for (const route of REQUIRED_ROUTES)
    if (!paths.has(route))
      err('/sitemap.xml', `missing required route ${route}`);
  if (!locs.some((l) => l.includes('/resources/blogs/')))
    err('/sitemap.xml', 'no blog posts listed');
  if (!locs.some((l) => l.includes('/case-studies/')))
    err('/sitemap.xml', 'no case studies listed');
  return locs;
}

const titles = new Map();
const descriptions = new Map();
const canonicals = new Map();

async function checkPage(canonicalUrl) {
  const path = pathOf(canonicalUrl);
  const { status, location, body: html } = await get(toLocal(canonicalUrl));
  if (status !== 200)
    return err(path, `status ${status}${location ? ` → ${location}` : ''}`);

  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
  const metas = headTags(html, 'meta');
  const links = headTags(html, 'link');
  const meta = (key, val) => metas.find((m) => m[key] === val)?.content;
  const description = meta('name', 'description');
  const canonical = links.find((l) => l.rel === 'canonical')?.href;
  const robots = meta('name', 'robots');
  const ogUrl = meta('property', 'og:url');
  const ogImage = meta('property', 'og:image');

  if (!title) err(path, 'missing <title>');
  else {
    if (title.length > 70)
      warn(path, `title is ${title.length} chars: "${title}"`);
    titles.set(title, [...(titles.get(title) ?? []), path]);
  }
  if (!description) err(path, 'missing meta description');
  else {
    if (description.length > 170 || description.length < 70)
      warn(path, `description is ${description.length} chars`);
    descriptions.set(description, [
      ...(descriptions.get(description) ?? []),
      path,
    ]);
  }
  if (!canonical) err(path, 'missing canonical');
  else {
    if (!canonical.startsWith(CANONICAL_ORIGIN))
      err(path, `canonical not on www origin: ${canonical}`);
    if (canonical !== canonicalUrl)
      err(path, `canonical ${canonical} ≠ sitemap URL ${canonicalUrl}`);
    canonicals.set(canonical, [...(canonicals.get(canonical) ?? []), path]);
  }
  if (!ogUrl) err(path, 'missing og:url');
  else if (ogUrl !== canonical)
    err(path, `og:url ${ogUrl} ≠ canonical ${canonical}`);
  if (!ogImage) err(path, 'missing og:image');
  else if (!ogImage.startsWith(CANONICAL_ORIGIN))
    err(path, `og:image not on www origin: ${ogImage}`);
  if (!meta('property', 'og:title')) err(path, 'missing og:title');
  if (!meta('property', 'og:description')) err(path, 'missing og:description');
  if (!meta('name', 'twitter:card')) err(path, 'missing twitter:card');
  if (meta('name', 'keywords')) err(path, 'meta keywords tag present');
  if (robots && /noindex/i.test(robots))
    err(path, `noindex on an indexable page (${robots})`);

  // Visible markup only: strip <script> blocks (JSON-LD and the Next.js RSC
  // payload both contain the same strings and would mask missing content).
  const text = decode(html.replace(/<script[\s>][\s\S]*?<\/script>/g, ''));
  const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1Count !== 1) err(path, `expected exactly 1 <h1>, found ${h1Count}`);

  if (html.includes(`${APEX_ORIGIN}/`) || html.includes(`"${APEX_ORIGIN}"`))
    err(path, 'references the non-www apex origin');
  for (const pattern of FORBIDDEN_TEXT)
    if (pattern.test(html)) err(path, `contains removed claim ${pattern}`);

  // Structured data
  const scripts = [
    ...html.matchAll(
      /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
    ),
  ];
  const nodes = [];
  for (const [, json] of scripts) {
    try {
      nodes.push(JSON.parse(json));
    } catch {
      err(path, 'invalid JSON-LD');
    }
  }
  const all = flattenTypes(nodes);
  const byType = (t) => all.filter((n) => [n['@type']].flat().includes(t));

  for (const url of collectUrls(nodes)) {
    if (
      url.startsWith('http') &&
      !url.startsWith(CANONICAL_ORIGIN) &&
      !url.startsWith('https://schema.org')
    )
      err(path, `JSON-LD URL off the www origin: ${url}`);
  }
  if (
    !byType('Organization').some(
      (o) => o['@id'] === `${CANONICAL_ORIGIN}/#organization`
    )
  )
    err(path, 'missing site Organization JSON-LD');

  for (const crumbList of byType('BreadcrumbList')) {
    crumbList.itemListElement.forEach((item, i) => {
      if (item.position !== i + 1)
        err(path, 'BreadcrumbList positions not sequential');
      if (!item.item?.startsWith(CANONICAL_ORIGIN))
        err(path, `breadcrumb item off www origin: ${item.item}`);
      if (item.item?.includes('#'))
        err(path, `breadcrumb item is a fragment URL: ${item.item}`);
      if (!text.includes(`>${item.name}<`))
        warn(path, `breadcrumb "${item.name}" not visible as text`);
    });
    const last = crumbList.itemListElement.at(-1);
    if (last && last.item !== canonical)
      err(path, `last breadcrumb ${last.item} ≠ canonical`);
  }

  for (const faq of byType('FAQPage')) {
    for (const q of faq.mainEntity) {
      const visibleQ = text.includes(q.name);
      const visibleA = text.includes(q.acceptedAnswer.text);
      if (!visibleQ) err(path, `FAQ question not in HTML: ${q.name}`);
      if (!visibleA) err(path, `FAQ answer not in server HTML: ${q.name}`);
    }
  }

  if (path.startsWith('/services/')) {
    const service = byType('Service')[0];
    if (!service) err(path, 'missing Service JSON-LD');
    else {
      if (service.url !== canonical) err(path, 'Service url ≠ canonical');
      if (!service.provider?.['@id']) err(path, 'Service missing provider');
      if (!service.name || !service.description)
        err(path, 'Service missing name/description');
    }
    if (!byType('BreadcrumbList').length) err(path, 'missing BreadcrumbList');
  }

  if (path.startsWith('/resources/blogs/')) {
    const post = byType('BlogPosting')[0];
    if (!post) err(path, 'missing BlogPosting JSON-LD');
    else {
      for (const field of [
        'headline',
        'datePublished',
        'dateModified',
        'author',
        'publisher',
        'image',
        'mainEntityOfPage',
      ])
        if (!post[field]) err(path, `BlogPosting missing ${field}`);
      if (post.mainEntityOfPage?.['@id'] !== canonical)
        err(path, 'BlogPosting mainEntityOfPage ≠ canonical');
      if (new Date(post.dateModified) < new Date(post.datePublished))
        err(path, 'dateModified before datePublished');
    }
    if (!byType('BreadcrumbList').length) err(path, 'missing BreadcrumbList');
  }

  if (path.startsWith('/case-studies/') && !byType('TechArticle').length)
    err(path, 'missing TechArticle JSON-LD');
}

async function main() {
  console.log(`SEO check against ${base}\n`);
  await checkRobots();
  const locs = await checkSitemap();

  const llms = await get(`${base}/llms.txt`);
  if (llms.status !== 200) err('/llms.txt', `status ${llms.status}`);

  const urls = [
    ...new Set([
      ...locs,
      ...REQUIRED_ROUTES.map((r) =>
        r === '/' ? CANONICAL_ORIGIN : CANONICAL_ORIGIN + r
      ),
    ]),
  ];
  for (const url of urls) await checkPage(url);

  for (const [title, paths] of titles)
    if (paths.length > 1) err(paths.join(', '), `duplicate title "${title}"`);
  for (const [, paths] of descriptions)
    if (paths.length > 1) err(paths.join(', '), 'duplicate meta description');
  for (const [canonical, paths] of canonicals)
    if (paths.length > 1)
      err(paths.join(', '), `duplicate canonical ${canonical}`);

  console.log(`Checked ${urls.length} pages.\n`);
  if (warnings.length)
    console.log(`Warnings (${warnings.length}):\n${warnings.join('\n')}\n`);
  if (errors.length) {
    console.log(`Errors (${errors.length}):\n${errors.join('\n')}`);
    process.exit(1);
  }
  console.log('✓ All SEO checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
