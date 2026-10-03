#!/usr/bin/env node
/**
 * Admin-controlled accounts: end-to-end HTTP test against a running server
 * seeded with the demo dataset (local PGlite - it refuses non-local servers).
 *
 *   npm run test:accounts            (SERVER_LOG=path/to/server.log to also scan the server log)
 *
 * Covers: no self-registration, admin-created Employee/Client, admin password
 * reset, login with the new password, self-service change, old passwords
 * dying, forced change, disabled accounts, session revocation, RBAC, and that
 * no password or hash ever appears in a page, an API response, the audit log
 * or the server log.
 */
import { readFileSync } from 'node:fs';

const base = (process.argv[2] || process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname) && process.env.ALLOW_TEST_ON_REMOTE_DB !== '1') {
  console.error(`Refusing to run against ${base}: this test creates users. Use a local server on a local database.`);
  process.exit(1);
}
const DEMO = process.env.SMOKE_PASSWORD || 'Isha@Demo2026!';
const P = { init: 'Init#Pass-7391xQ', mine: 'Mine#Pass-8842kT', reset: 'Reset#Pass-5520mZ', cinit: 'Client#Init-4417wB', again: 'Again#Pass-9033vN', client2: 'Client#Mine-6628hD' };
const SECRETS = Object.values(P);
const bodies = []; // every response body seen, scanned for secrets at the end

let failures = 0;
let passes = 0;
function check(label, ok, detail = '') {
  if (ok) passes++;
  else failures++;
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${ok || detail === '' ? '' : `\n      ${detail}`}`);
}
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

class Session {
  cookies = new Map();
  header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  store(res) {
    for (const c of res.headers.getSetCookie()) {
      const pair = c.split(';')[0];
      const i = pair.indexOf('=');
      const name = pair.slice(0, i);
      const value = pair.slice(i + 1);
      if (/expires=Thu, 01 Jan 1970/i.test(c) || value === '') this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }
  async get(path) {
    const res = await fetch(base + path, { redirect: 'manual', headers: { cookie: this.header() } });
    this.store(res);
    return res;
  }
  async text(path) {
    const res = await this.get(path);
    const body = res.status === 200 ? await res.text() : '';
    bodies.push(body);
    return body;
  }
  /** Submits the form on `pagePath` that contains a field named `marker`, with `fields` overriding/adding values. */
  async submit(pagePath, marker, fields, { as } = {}) {
    const html = await (await (as ?? this).get(pagePath)).text();
    bodies.push(html);
    const form = html.split('<form').slice(1).find((f) => f.split('</form>')[0].includes(`name="${marker}"`));
    if (!form) throw new Error(`No form with field "${marker}" on ${pagePath}`);
    return this.postForm(pagePath, form, fields);
  }
  async postForm(path, formHtml, fields) {
    const body = new FormData();
    for (const m of formHtml.split('</form>')[0].matchAll(/<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?/g)) body.append(decode(m[1]), decode(m[2] ?? ''));
    for (const [k, v] of Object.entries(fields)) {
      body.delete(k);
      if (v !== null) body.append(k, v);
    }
    const res = await fetch(base + path, { method: 'POST', body, redirect: 'manual', headers: { cookie: this.header(), origin: base } });
    this.store(res);
    return res;
  }
}

/** Submits the control form (force / disable / enable / revoke) on a user's page, found by its button label. */
async function control(sess, userId, label) {
  const html = await sess.text(`/portal/users/${userId}`);
  // (each chunk starts inside the <form …> tag, so drop everything up to its closing ">" first)
  const f = html.split('<form').slice(1).find((x) => x.split('</form>')[0].replace(/^[^>]*>/, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() === label);
  if (!f) return null;
  return sess.postForm(`/portal/users/${userId}`, f, {});
}
const loc = (r) => r.headers.get('location') || '';
async function login(identifier, password) {
  const s = new Session();
  const res = await s.submit('/portal/login', 'identifier', { identifier, password });
  return { s, res, ok: res.status === 303 && !/\/login/.test(loc(res)) };
}
const sessionAlive = async (s) => (await s.get('/portal/dashboard')).status === 200;

async function main() {
  console.log(`Account management test → ${base}\n`);
  const anon = new Session();
  const admin = (await login('ops@ishatechnologies.in', DEMO)).s; // Admin
  const root = (await login('admin@ishatechnologies.in', DEMO)).s; // Super Admin
  const emp = (await login('aarav@ishatechnologies.in', DEMO)).s; // Employee
  const cli = (await login('rohan@northwind.example', DEMO)).s; // Client

  console.log('1-3. No self-registration (public, client, employee)');
  const REG = ['/register', '/signup', '/sign-up', '/portal/register', '/portal/signup', '/portal/sign-up', '/portal/create-account', '/api/register', '/api/signup', '/api/auth/register', '/api/auth/signup', '/api/portal/register', '/api/portal/signup', '/portal/accept-invite', '/portal/forgot-password', '/portal/reset-password'];
  for (const [who, s] of [['public', anon], ['client', cli], ['employee', emp]]) {
    let allBlocked = true;
    let bad = '';
    for (const p of REG) {
      for (const method of ['GET', 'POST']) {
        const r = await fetch(base + p, { method, redirect: 'manual', headers: { cookie: s.header(), origin: base }, body: method === 'POST' ? new FormData() : undefined });
        const html = r.status === 200 ? await r.text() : '';
        // Acceptable: any error status (unknown POST routes answer 4xx/5xx and create nothing) or a redirect to login. Never a 2xx page offering to register.
        if (!(r.status >= 400 || ([307, 308].includes(r.status) && /\/login|\/dashboard/.test(r.headers.get('location') || ''))) || /create account|sign up|register/i.test(html)) {
          allBlocked = false;
          bad += ` ${method} ${p}→${r.status}`;
        }
      }
    }
    check(`${who} has no registration / invite / reset endpoint to use`, allBlocked, bad);
  }
  const loginPage = await anon.text('/portal/login');
  check('login page has no Sign up / Create account / Forgot-password link', !/sign up|create account|register|forgot-password|reset-password/i.test(loginPage.replace(/Contact your administrator[^<]*/i, '')));
  check('login page tells users to contact their administrator', /contact your administrator/i.test(loginPage));
  for (const [who, s] of [['client', cli], ['employee', emp]]) {
    check(`${who} cannot open User management`, (await s.get('/portal/users')).status === 404);
    check(`${who} cannot open the create-user page`, (await s.get('/portal/users/new')).status === 404);
  }
  // Even replaying the admin's real form (valid action id) as a non-admin must create nothing.
  const adminForm = (await (await admin.get('/portal/users/new')).text()).split('<form').slice(1).find((f) => f.includes('name="username"'));
  for (const [who, s] of [['client', cli], ['employee', emp], ['public', anon]]) {
    const r = await s.postForm('/portal/users/new', adminForm, { name: 'Sneaky User', username: `sneaky-${who}`, email: `sneaky-${who}@evil.example`, role: 'employee', status: 'active', password: P.init, confirm: P.init, forceChange: null, phone: '' });
    void r;
    const list = await admin.text('/portal/users');
    check(`${who} replaying the create-user form creates no account`, !list.includes(`sneaky-${who}`));
  }

  console.log('\n4-5. Admin creates an Employee and a Client');
  const newPage = await admin.text('/portal/users/new?role=client');
  const northwind = decode((newPage.match(/<option value="([0-9a-f-]{36})"[^>]*>Northwind Logistics/) || [])[1] || '');
  check('client company list is offered to the admin', northwind.length === 36);
  const mk = async (fields) => {
    const r = await admin.submit('/portal/users/new', 'username', { phone: '', ...fields });
    const id = (loc(r).match(/\/portal\/users\/([0-9a-f-]{36})/) || [])[1];
    return { r, id };
  };
  const e = await mk({ name: 'Test Employee', username: 'test.employee', email: 'test.employee@ishatechnologies.in', role: 'employee', status: 'active', password: P.init, confirm: P.init, forceChange: 'on' });
  check('Admin created an Employee (redirected to their page)', Boolean(e.id), `${e.r.status} ${loc(e.r)}`);
  const c = await mk({ name: 'Test Client', username: 'test.client', email: 'test.client@northwind.example', role: 'client', clientId: northwind, status: 'active', password: P.cinit, confirm: P.cinit, forceChange: 'on' });
  check('Admin created a Client login for Northwind', Boolean(c.id), `${c.r.status} ${loc(c.r)}`);
  const dup = await admin.submit('/portal/users/new', 'username', { phone: '', name: 'Dup', username: 'test.employee', email: 'dup@x.example', role: 'employee', status: 'active', password: P.init, confirm: P.init });
  check('duplicate username is rejected (no redirect)', !(loc(dup) || '').includes('/portal/users/'));
  const weak = await admin.submit('/portal/users/new', 'username', { phone: '', name: 'Weak', username: 'weak.user', email: 'weak@x.example', role: 'employee', status: 'active', password: 'short', confirm: 'short' });
  check('weak initial password is rejected', !(loc(weak) || '').includes('/portal/users/'));
  const adminCreatesAdmin = await admin.submit('/portal/users/new', 'username', { phone: '', name: 'Evil Admin', username: 'evil.admin', email: 'evil.admin@x.example', role: 'admin', status: 'active', password: P.init, confirm: P.init });
  check('an Admin cannot create another Admin (only Super Admin)', !(loc(adminCreatesAdmin) || '').includes('/portal/users/'));

  console.log('\n10. Force password change on first login');
  const eLogin = await login('test.employee', P.init);
  check('Employee signs in with the admin-set initial password (username)', eLogin.res.status === 303, eLogin.res.status);
  check('…and is sent to the change-password page', loc(eLogin.res).endsWith('/portal/settings/security/change-password'), loc(eLogin.res));
  const eS = eLogin.s;
  const dashRedirect = await eS.get('/portal/dashboard');
  check('dashboard is unreachable until the password is changed (server-side redirect)', [307, 308].includes(dashRedirect.status) && /change-password/.test(loc(dashRedirect)), `${dashRedirect.status} ${loc(dashRedirect)}`);
  const tasksRedirect = await eS.get('/portal/tasks');
  check('every other page redirects there too', [307, 308].includes(tasksRedirect.status) && /change-password/.test(loc(tasksRedirect)), tasksRedirect.status);
  const apiBlocked = await eS.get('/api/portal/search?q=a');
  check('API calls are refused while the change is pending', [401, 403].includes(apiBlocked.status), apiBlocked.status);
  const cpPage = await eS.get('/portal/settings/security/change-password');
  check('the change-password page itself is reachable', cpPage.status === 200, cpPage.status);
  const wrongCurrent = await eS.submit('/portal/settings/security/change-password', 'current', { current: 'Wrong#Current-0001', password: P.mine, confirm: P.mine });
  check('wrong current password does not change anything', wrongCurrent.status !== 303 && (await login('test.employee', P.init)).ok === false ? true : (await login('test.employee', P.init)).res.status === 303);
  const mismatch = await eS.submit('/portal/settings/security/change-password', 'current', { current: P.init, password: P.mine, confirm: P.mine + 'x' });
  check('mismatched confirmation is rejected', mismatch.status !== 303);
  const sameAsOld = await eS.submit('/portal/settings/security/change-password', 'current', { current: P.init, password: P.init, confirm: P.init });
  check('reusing the same password is rejected', sameAsOld.status !== 303);
  const weakNew = await eS.submit('/portal/settings/security/change-password', 'current', { current: P.init, password: 'weakpass', confirm: 'weakpass' });
  check('weak new password is rejected', weakNew.status !== 303);

  console.log('\n8-9. User changes own password (current + new + confirm)');
  const changed = await eS.submit('/portal/settings/security/change-password', 'current', { current: P.init, password: P.mine, confirm: P.mine });
  check('change succeeds and leaves the forced-change page', changed.status === 303 && /\/portal\/dashboard$/.test(loc(changed)), `${changed.status} ${loc(changed)}`);
  check('the dashboard now loads (forcePasswordChange cleared)', await sessionAlive(eS));
  check('old (admin-set) password no longer works', (await login('test.employee', P.init)).ok === false);
  const eMine = await login('test.employee@ishatechnologies.in', P.mine);
  check('new password works (also via email)', eMine.ok && !/change-password/.test(loc(eMine.res)), loc(eMine.res));

  console.log('\n6-7, 9, 11. Admin resets the password (types a NEW one)');
  const eDetail = await admin.text(`/portal/users/${e.id}`);
  check('detail page shows "Password status: Set" and last password change', /Password status/.test(eDetail) && />Set</.test(eDetail) && /Last password change/.test(eDetail));
  check('detail page offers Reset Password and Force Password Change', /Reset password/i.test(eDetail) && /Force password change/i.test(eDetail));
  check('no "current password" is shown anywhere for the admin', !/current password/i.test(eDetail.replace(/Enter a NEW password[^<]*/, '')) && !SECRETS.some((p) => eDetail.includes(p)) && !/scrypt\$/.test(eDetail));
  const staleSession = eS; // signed in with P.mine
  const reset = await admin.submit(`/portal/users/${e.id}`, 'confirm', { userId: e.id, password: P.reset, confirm: P.reset, forceChange: null });
  check('admin reset submitted', reset.status < 400, reset.status);
  check("the user's existing session was ended by the reset", !(await sessionAlive(staleSession)));
  check('the previous password stops working after the admin reset', (await login('test.employee', P.mine)).ok === false);
  const afterReset = await login('test.employee', P.reset);
  check('the user signs in with the admin-set new password (no forced change this time)', afterReset.ok && /dashboard/.test(loc(afterReset.res)), loc(afterReset.res));
  const resetMismatch = await admin.submit(`/portal/users/${e.id}`, 'confirm', { userId: e.id, password: P.again, confirm: P.again + 'x' });
  void resetMismatch;
  check('a mismatched/odd reset did not change the password', (await login('test.employee', P.again)).ok === false);

  console.log('\n6. Admin forces a password change on an existing user');
  check('the Force password change control exists', Boolean(await control(admin, e.id, 'Force password change')));
  const afterForce = await login('test.employee', P.reset);
  check('after "Force password change", next sign-in goes to the change page', /change-password/.test(loc(afterForce.res)), loc(afterForce.res));

  console.log('\nClient account: initial password, forced change, isolation');
  const cLogin = await login('test.client', P.cinit);
  check('Client signs in with the admin-set password and must change it', /change-password/.test(loc(cLogin.res)), loc(cLogin.res));
  const cChange = await cLogin.s.submit('/portal/settings/security/change-password', 'current', { current: P.cinit, password: P.client2, confirm: P.client2 });
  check('Client changes their own password', cChange.status === 303);
  const cProjects = await cLogin.s.text('/portal/projects');
  check('Client sees only Northwind data', /EKS Platform Migration/.test(cProjects) && !/Cloud Security Posture Review|Zenith/.test(cProjects));
  check('Client cannot open User management', (await cLogin.s.get('/portal/users')).status === 404);

  console.log('\n16. Disabled users cannot log in');
  check('the Disable account control exists', Boolean(await control(admin, e.id, 'Disable account')));
  const listAfter = await admin.text('/portal/users');
  check('list shows the account as Disabled', listAfter.split('<tr').find((r) => r.includes('test.employee'))?.includes('Disabled') ?? false);
  const dis = await login('test.employee', P.reset);
  check('a disabled account cannot sign in', dis.ok === false, loc(dis.res));
  check('an Enable account control is offered for a disabled user', Boolean(await control(admin, e.id, 'Enable account')));
  const reen = await login('test.employee', P.reset);
  check('after Enable, the user can sign in again', reen.ok, loc(reen.res));

  console.log('\n17. Session revocation');
  const s1 = (await login('test.employee', P.reset)).s;
  const s2 = (await login('test.employee', P.reset)).s;
  const stillForced = /change-password/.test(loc((await s1.get('/portal/dashboard'))));
  void stillForced;
  const pre = [await s1.get('/portal/settings/security/change-password'), await s2.get('/portal/settings/security/change-password')].map((r) => r.status);
  check('two live sessions exist before revoking', pre.every((x) => x === 200), pre.join(','));
  check('the Revoke sessions control exists', Boolean(await control(admin, e.id, 'Revoke sessions')));
  const post = [await s1.get('/portal/settings/security/change-password'), await s2.get('/portal/settings/security/change-password')];
  check('Revoke sessions ends every session of that user', post.every((r) => [307, 308].includes(r.status) && /login/.test(loc(r))), post.map((r) => r.status).join(','));

  console.log('\nRBAC: an Admin cannot manage the Super Admin or other Admins');
  const rootList = await admin.text('/portal/users');
  const rootId = (rootList.match(/href="\/portal\/users\/([0-9a-f-]{36})"[^>]*>[\s\S]{0,300}?Super Admin/) || [])[1];
  const resetForm = (await admin.text(`/portal/users/${e.id}`)).split('<form').slice(1).find((f) => f.includes('name="confirm"') && f.includes('name="userId"'));
  // locate the super admin's id via the list (link order → pick the one whose row mentions the seeded super admin email)
  const rootRow = rootList.split('<tr').find((r) => r.includes('admin@ishatechnologies.in')) || '';
  const superId = (rootRow.match(/\/portal\/users\/([0-9a-f-]{36})/) || [])[1] || rootId;
  const evil = await admin.postForm(`/portal/users/${e.id}`, resetForm, { userId: superId, password: P.again, confirm: P.again });
  void evil;
  check('Admin could not reset the Super Admin password', (await login('admin@ishatechnologies.in', P.again)).ok === false && (await login('admin@ishatechnologies.in', DEMO)).ok);
  check('Super Admin CAN open User management', (await root.get('/portal/users')).status === 200);
  const adminForUser = await admin.get(`/portal/users/${superId}`);
  void adminForUser;

  console.log('\n11-15. Passwords never exposed');
  const pages = ['/portal/users', `/portal/users/${e.id}`, `/portal/users/${c.id}`, '/portal/team', '/portal/clients', '/portal/settings?section=security', '/portal/security', '/portal/audit'];
  for (const p of pages) await root.text(p);
  for (const p of pages.slice(0, 4)) await admin.text(p);
  for (const p of ['/api/portal/notifications', '/api/portal/search?q=test', '/api/portal/audit/export']) {
    const res = await root.get(p);
    bodies.push(res.status === 200 ? await res.text() : '');
  }
  const csv = bodies[bodies.length - 1];
  const leaked = SECRETS.filter((p) => bodies.some((b) => b.includes(p)));
  check('no test password appears in any page, API response or the audit CSV', leaked.length === 0, `leaked: ${leaked.length}`);
  check('no password hash (scrypt$…) appears in any page or API response', !bodies.some((b) => /scrypt\$\d/.test(b)));
  const auditHtml = await root.text('/portal/audit');
  for (const needle of ['user.created', 'user.password_set_by_admin', 'auth.password_changed', 'user.deactivated', 'security.session_revoked', 'user.force_password_change']) {
    check(`audit log records ${needle}`, auditHtml.includes(needle) || csv.includes(needle));
  }
  check('audit CSV contains no password', !SECRETS.some((p) => csv.includes(p)));
  const listHtml = await admin.text('/portal/users');
  check('user list shows name, username, email, role, company, status, last login, last password change, force change, created', ['Username', 'Email', 'Role', 'Company', 'Status', 'Last login', 'Last password change', 'Force change', 'Created', 'Actions'].every((h) => listHtml.includes(h)));
  check('user list has Edit / Reset password / Force change / Disable / Revoke sessions / Security activity actions', ['Edit', 'Reset password', 'Revoke sessions', 'Security activity'].every((h) => listHtml.includes(h)) && /Force change|Unforce change/.test(listHtml) && /Disable|Enable/.test(listHtml));
  check('user list has no password column', !/password<\/th>/i.test(listHtml.replace(/Last password change/g, '')));

  if (process.env.SERVER_LOG) {
    const log = readFileSync(process.env.SERVER_LOG, 'utf8');
    check('server log contains no test password and no password hash', !SECRETS.some((p) => log.includes(p)) && !/scrypt\$\d/.test(log));
  } else console.log('  • (set SERVER_LOG to also scan the server log)');

  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
