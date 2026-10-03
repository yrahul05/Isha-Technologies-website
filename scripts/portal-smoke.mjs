#!/usr/bin/env node
/**
 * End-to-end HTTP smoke test for the portal against a running server
 * seeded with the demo dataset (`npm run db:setup`).
 *
 *   npm run dev            # or: npm run build && npm start
 *   npm run test:smoke     # defaults to http://localhost:3000
 *   npm run test:smoke -- http://localhost:3100
 *
 * Signs in exactly like a browser without JavaScript would (posting the
 * server-action form), keeps a cookie jar per persona, and checks what
 * each persona can and cannot reach over HTTP. No dependencies.
 */
const base = (process.argv[2] || process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname) && process.env.ALLOW_TEST_ON_REMOTE_DB !== '1') {
  console.error(`Refusing to run the smoke test against ${base}: it creates test records. Use a local server (npm run start) on a local database.`);
  process.exit(1);
}
const PASSWORD = process.env.SMOKE_PASSWORD || 'Isha@Demo2026!';
let failures = 0;
let passes = 0;

function check(label, ok, detail = '') {
  if (ok) passes++;
  else failures++;
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${ok || !detail ? '' : `\n      ${String(detail).slice(0, 300)}`}`);
}

class Session {
  constructor() {
    this.cookies = new Map();
  }
  header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  store(res) {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      const name = pair.slice(0, i);
      const value = pair.slice(i + 1);
      if (/expires=Thu, 01 Jan 1970/i.test(c) || value === '') this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }
  async get(path, opts = {}) {
    const res = await fetch(base + path, { redirect: 'manual', headers: { cookie: this.header(), ...(opts.headers || {}) } });
    this.store(res);
    return res;
  }
  /** Submits the Nth server-action form on `pagePath` with the given fields. */
  async submitForm(pagePath, fields, formIndex = 0) {
    const page = await (await this.get(pagePath)).text();
    const forms = page.split('<form').slice(1);
    const form = forms[formIndex];
    if (!form) throw new Error(`No form #${formIndex} on ${pagePath}`);
    const body = new FormData();
    for (const m of form.split('</form>')[0].matchAll(/<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?/g)) {
      body.append(decode(m[1]), decode(m[2] ?? ''));
    }
    for (const [k, v] of Object.entries(fields)) {
      body.delete(k);
      body.append(k, v);
    }
    const res = await fetch(base + pagePath, {
      method: 'POST',
      body,
      redirect: 'manual',
      headers: { cookie: this.header(), origin: base },
    });
    this.store(res);
    return res;
  }
}

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function login(email, password = PASSWORD) {
  const s = new Session();
  const res = await s.submitForm('/portal/login', { identifier: email, password });
  return { s, res };
}

async function text(res) {
  return res.status === 200 ? await res.text() : '';
}

async function main() {
  console.log(`Portal smoke test → ${base}\n`);

  console.log('Public site & indexing');
  const anon = new Session();
  for (const path of ['/', '/services', '/contact', '/case-studies', '/resources/blogs', '/free-cloud-assessment']) {
    const r = await anon.get(path);
    check(`${path} → 200`, r.status === 200, r.status);
    check(`${path} has no noindex header`, !r.headers.get('x-robots-tag'));
  }
  const robots = await (await anon.get('/robots.txt')).text();
  check('robots.txt still allows the public site', /Allow: \//.test(robots));
  const sitemap = await (await anon.get('/sitemap.xml')).text();
  check('sitemap has no /portal URLs', !sitemap.includes('/portal'));
  check('sitemap includes the free assessment page', sitemap.includes('/free-cloud-assessment'));

  console.log('\nUnauthenticated access');
  for (const path of ['/portal/dashboard', '/portal/clients', '/portal/invoices', '/portal/documents']) {
    const r = await anon.get(path);
    check(`${path} → redirect to login`, r.status === 307 && /\/portal\/login/.test(r.headers.get('location') || ''), r.status);
    check(`${path} sends X-Robots-Tag noindex`, /noindex/.test(r.headers.get('x-robots-tag') || ''));
  }
  const api = await anon.get('/api/portal/search?q=Northwind');
  check('search API → 401 without session', api.status === 401);

  console.log('\nLogin');
  const bad = await login('rohan@northwind.example', 'wrong-password-1');
  const badBody = await bad.res.text();
  check('wrong password shows generic error', /Incorrect email\/username or password/.test(badBody), bad.res.status);
  check('wrong password sets no session cookie', !bad.s.header().includes('isha_session'));
  const unknown = await login('nobody@nowhere.example', 'whatever-123');
  check('unknown user gets the same generic error', /Incorrect email\/username or password/.test(await unknown.res.text()));

  const personas = {};
  for (const [key, email] of [
    ['superAdmin', 'admin@ishatechnologies.in'],
    ['admin', 'ops@ishatechnologies.in'],
    ['aarav', 'aarav@ishatechnologies.in'],
    ['kabir', 'kabir@ishatechnologies.in'],
    ['rohan', 'rohan@northwind.example'],
    ['ananya', 'ananya@zenith.example'],
    ['liam', 'liam@maple.example'],
  ]) {
    const { s, res } = await login(email);
    const ok = res.status === 303 && /\/portal\/dashboard/.test(res.headers.get('location') || '') && s.header().includes('isha_session');
    check(`${key} signs in and is redirected to the dashboard`, ok, `${res.status} ${res.headers.get('location')}`);
    personas[key] = s;
  }
  const sessionCookie = (await login('ops@ishatechnologies.in')).res.headers.getSetCookie().find((c) => c.includes('isha_session')) || '';
  check('session cookie is HttpOnly + SameSite=Lax', /HttpOnly/i.test(sessionCookie) && /SameSite=Lax/i.test(sessionCookie));
  check('session cookie expires (day-scoped, not persistent forever)', /Expires=/i.test(sessionCookie));

  console.log('\nRole dashboards');
  const exec = await text(await personas.superAdmin.get('/portal/dashboard'));
  check('super admin sees executive dashboard with revenue', /Monthly revenue/.test(exec) && /Total revenue collected/.test(exec));
  const emp = await text(await personas.aarav.get('/portal/dashboard'));
  check('employee sees own workspace', /Today&#x27;s work|Today's work/.test(emp) && !/Total revenue collected/.test(emp));
  check('employee dashboard never mentions Client B', !/Zenith/.test(emp));
  const cli = await text(await personas.rohan.get('/portal/dashboard'));
  check('client A dashboard shows own projects', /EKS Platform Migration/.test(cli));
  check('client A dashboard shows nothing of Client B', !/Zenith|Security Posture|ISH-2026-000[4-6]|Maple|Harbor/.test(cli));
  const cliB = await text(await personas.ananya.get('/portal/dashboard'));
  check('client B dashboard shows nothing of Client A', !/Northwind|EKS Platform|ISH-2026-000[1235]|Maple|Harbor/.test(cliB));

  console.log('\nDirect-URL isolation (IDs of other tenants)');
  const adminProjects = await text(await personas.superAdmin.get('/portal/projects'));
  const projectIds = [...adminProjects.matchAll(/\/portal\/projects\/([0-9a-f-]{36})/g)].map((m) => m[1]);
  const uniq = [...new Set(projectIds)];
  check('admin sees all three demo projects', uniq.length >= 3, uniq.length);
  for (const id of uniq) {
    const asAdmin = await text(await personas.superAdmin.get(`/portal/projects/${id}`));
    const isZenith = /Cloud Security Posture Review/.test(asAdmin);
    const r = await personas.rohan.get(`/portal/projects/${id}`);
    if (isZenith) check('client A gets 404 for Client B project URL', r.status === 404, r.status);
    else check('client A can open own project URL', r.status === 200, r.status);
    const k = await personas.kabir.get(`/portal/projects/${id}`);
    if (!isZenith) check('Zenith-only employee gets 404 for Northwind project', k.status === 404, k.status);
  }
  const adminInvoices = await text(await personas.superAdmin.get('/portal/invoices'));
  const invoiceIds = [...new Set([...adminInvoices.matchAll(/\/portal\/invoices\/([0-9a-f-]{36})/g)].map((m) => m[1]))];
  for (const id of invoiceIds) {
    const page = await text(await personas.superAdmin.get(`/portal/invoices/${id}`));
    const client = /Zenith/.test(page) ? 'zenith' : /Northwind/.test(page) ? 'northwind' : 'other';
    const pdfA = await personas.rohan.get(`/api/portal/invoices/${id}/pdf`);
    const pdfB = await personas.ananya.get(`/api/portal/invoices/${id}/pdf`);
    if (client === 'northwind') {
      check(`client A can download own invoice PDF`, pdfA.status === 200 && pdfA.headers.get('content-type') === 'application/pdf', pdfA.status);
      check(`client B cannot download Client A invoice PDF`, pdfB.status === 404, pdfB.status);
    } else {
      check(`client A cannot download another client's invoice PDF`, pdfA.status === 404, pdfA.status);
    }
    if (client !== 'other') check('Canadian client cannot download an Indian client invoice PDF', (await personas.liam.get(`/api/portal/invoices/${id}/pdf`)).status === 404);
    const emp404 = await personas.aarav.get(`/api/portal/invoices/${id}/pdf`);
    check('employee cannot download any invoice PDF', emp404.status === 404, emp404.status);
  }

  console.log('\nUnauthorized URL / API access to every entity (ids harvested from a Super Admin session)');
  const idsOn = async (who, path, re) => [...new Set([...(await text(await personas[who].get(path))).matchAll(re)].map((m) => m[1]))];
  const UUID = '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';
  for (const [entity, listPath, detail] of [
    ['task', '/portal/tasks?view=list', (id) => `/portal/tasks/${id}`],
    ['ticket', '/portal/tickets', (id) => `/portal/tickets/${id}`],
    ['meeting', '/portal/meetings', (id) => `/portal/meetings/${id}`],
    ['work request', '/portal/requests?filter=all', (id) => `/portal/requests/${id}`],
    ['client', '/portal/clients', (id) => `/portal/clients/${id}`],
  ]) {
    const prefix = detail('X').replace(/X$/, '').replace(/\//g, '\\/');
    const all = await idsOn('superAdmin', listPath, new RegExp(`${prefix}${UUID}`, 'g'));
    check(`super admin lists ${entity} ids`, all.length > 0, all.length);
    for (const who of ['rohan', 'ananya', 'liam', 'aarav']) {
      const own = new Set(await idsOn(who, listPath, new RegExp(`${prefix}${UUID}`, 'g')));
      let leaks = 0;
      for (const id of all.filter((x) => !own.has(x))) {
        const r = await personas[who].get(detail(id));
        if (r.status !== 404) leaks += 1;
      }
      check(`${who} cannot open any ${entity} outside their scope by URL`, leaks === 0, `${leaks} opened`);
    }
  }

  const docIds = await idsOn('superAdmin', '/portal/documents', new RegExp(`/api/portal/documents/${UUID}/download`, 'g'));
  check('super admin lists document ids', docIds.length > 0);
  for (const who of ['rohan', 'ananya', 'liam']) {
    const own = new Set(await idsOn(who, '/portal/documents', new RegExp(`/api/portal/documents/${UUID}/download`, 'g')));
    let leaks = 0;
    for (const id of docIds.filter((x) => !own.has(x))) {
      const r = await personas[who].get(`/api/portal/documents/${id}/download`);
      if (r.status !== 404) leaks += 1;
    }
    check(`${who} cannot download documents outside their account (404)`, leaks === 0, `${leaks} not 404`);
  }
  const anonDoc = await anon.get(`/api/portal/documents/${docIds[0]}/download`);
  check('document download without a session → 401', anonDoc.status === 401, anonDoc.status);

  console.log('\nRestricted APIs');
  const someUser = '00000000-0000-4000-8000-000000000000';
  check('avatar API without session → 401', (await anon.get(`/api/portal/avatars/${someUser}`)).status === 401);
  const kabirId = (await (await personas.kabir.get('/portal/settings')).text()).match(/\/api\/portal\/avatars\/([0-9a-f-]{36})/)?.[1];
  check('unknown/foreign avatar → 404', (await personas.rohan.get(`/api/portal/avatars/${kabirId ?? someUser}`)).status === 404);
  const forged = await fetch(`${base}/api/portal/avatar`, { method: 'POST', headers: { cookie: personas.rohan.header(), origin: 'https://evil.example' }, body: new FormData() });
  check('cross-site avatar upload → 403', forged.status === 403, forged.status);
  const badUpload = await fetch(`${base}/api/portal/uploads/${someUser}?token=forged&part=0`, { method: 'PUT', headers: { cookie: personas.rohan.header(), origin: base }, body: 'x' });
  check('upload with forged token → 403', badUpload.status === 403, badUpload.status);
  const cronNoSecret = await anon.get('/api/portal/cron/daily');
  check('cron endpoint without secret → 401/403', [401, 403].includes(cronNoSecret.status), cronNoSecret.status);

  console.log('\nRestricted sections');
  for (const [who, path, expected] of [
    ['rohan', '/portal/clients', 404],
    ['rohan', '/portal/audit', 404],
    ['rohan', '/portal/leads', 404],
    ['rohan', '/portal/team', 404],
    ['aarav', '/portal/audit', 404],
    ['aarav', '/portal/invoices', 404],
    ['admin', '/portal/audit', 404],
    ['superAdmin', '/portal/audit', 200],
    ['superAdmin', '/portal/settings', 200],
    ['superAdmin', '/portal/security', 200],
    ['admin', '/portal/security', 404],
    ['aarav', '/portal/security', 404],
    ['rohan', '/portal/security', 404],
    ['aarav', '/portal/requests', 404],
    ['rohan', '/portal/requests', 200],
    ['superAdmin', '/portal/requests', 200],
    // Business modules: internal-only pages are invisible to clients and unprivileged staff.
    ['rohan', '/portal/analytics', 404],
    ['rohan', '/portal/profitability', 404],
    ['rohan', '/portal/renewals', 404],
    ['rohan', '/portal/time', 404],
    ['aarav', '/portal/analytics', 404],
    ['aarav', '/portal/profitability', 404],
    ['aarav', '/portal/renewals', 404],
    ['aarav', '/portal/time', 200],
    ['rohan', '/portal/proposals', 200],
    ['rohan', '/portal/contracts', 200],
    ['rohan', '/portal/assistant', 200],
    ['superAdmin', '/portal/analytics', 200],
    ['superAdmin', '/portal/profitability', 200],
    ['superAdmin', '/portal/renewals', 200],
    ['superAdmin', '/portal/proposals', 200],
    ['superAdmin', '/portal/contracts', 200],
    ['superAdmin', '/portal/time', 200],
    ['superAdmin', '/portal/assistant', 200],
  ]) {
    const r = await personas[who].get(path);
    check(`${who} ${path} → ${expected}`, r.status === expected, r.status);
  }

  console.log('\nSearch API');
  const sA = await (await personas.rohan.get('/api/portal/search?q=ISH-2026')).json();
  check('client A search finds own invoices', sA.results.some((r) => r.title === 'ISH-2026-0001'));
  check('client A search never returns Client B invoices', !sA.results.some((r) => /ISH-2026-000[4-6]|DRAFT-/.test(r.title)));
  const sK = await (await personas.kabir.get('/api/portal/search?q=EKS')).json();
  check('Zenith employee search for "EKS" returns nothing', sK.results.length === 0, JSON.stringify(sK.results));

  console.log('\nLogout');
  const out = await personas.aarav.submitForm('/portal/dashboard', {}, 0).catch(() => null);
  const after = await personas.aarav.get('/portal/dashboard');
  check('after logout the dashboard redirects to login', out !== null && after.status === 307, after.status);

  console.log(`\n${passes} passed, ${failures} failed\n`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
