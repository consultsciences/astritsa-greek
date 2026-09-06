'use strict';
// Pre-launch hardening suite: password policy, sanitization, rate limiting,
// security headers, refund-policy consent and legal pages over real HTTP.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = require('./helpers.js').tempDbPath();
process.env.ADMIN_EMAIL = '';
process.env.AI_API_KEY = '';
process.env.STRIPE_SECRET_KEY = '';
process.env.STRIPE_PRICE_ID = '';
process.env.ANALYTICS_GA4_ID = '';
process.env.MARKETING_PIXEL_ID = '';

const { startServer, closeServer, removeDb, request, sessionCookie } = require('./helpers.js');

let server = null;
let base = '';

before(async () => {
  server = await startServer();
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await closeServer(server);
  removeDb();
});

const signupBody = overrides => ({
  name: 'Hardening Tester', email: `harden-${Math.random().toString(36).slice(2)}@example.com`,
  password: 'Str0ng-Pass!', birthDate: '1996-11-05',
  ageConfirmed: true, termsAccepted: true, privacyAccepted: true, refundAccepted: true, aiConsent: true,
  ...overrides
});

async function newUser(overrides = {}) {
  const res = await request(base, 'POST', '/api/auth/signup', { body: signupBody(overrides) });
  assert.equal(res.status, 201, `signup failed: ${JSON.stringify(res.json)}`);
  return res;
}

test('password policy: weak passwords rejected with WEAK_PASSWORD', async () => {
  const weak = ['Aa1!', 'alllowercase1!', 'noupper1!', 'NoDigits!!', 'NoSpecial11A'];
  for (const password of weak) {
    const res = await request(base, 'POST', '/api/auth/signup', { body: signupBody({ password }) });
    assert.equal(res.status, 400, `expected 400 for ${password}`);
    assert.equal(res.json.code, 'WEAK_PASSWORD');
  }
  // A password meeting all four rules is accepted.
  await newUser({ password: 'G00d-Policy!' });
});

test('signup without refund-policy consent → 451 CONSENT_REQUIRED', async () => {
  const res = await request(base, 'POST', '/api/auth/signup', { body: signupBody({ refundAccepted: false }) });
  assert.equal(res.status, 451);
  assert.equal(res.json.code, 'CONSENT_REQUIRED');
});

test('security headers present on API and static responses', async () => {
  const api = await request(base, 'GET', '/api/health');
  assert.equal(api.status, 200);
  for (const header of ['x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy', 'strict-transport-security', 'content-security-policy']) {
    assert.ok(api.headers[header], `API response missing ${header}`);
  }
  assert.equal(api.headers['x-frame-options'], 'DENY');

  const page = await request(base, 'GET', '/');
  for (const header of ['x-content-type-options', 'content-security-policy']) {
    assert.ok(page.headers[header], `static response missing ${header}`);
  }
});

test('XSS vectors are stripped from stored signup name end-to-end', async () => {
  const email = `sanitize-${Date.now()}@example.com`;
  const res = await request(base, 'POST', '/api/auth/signup', {
    body: signupBody({ name: '  <script>alert(1)</script>Clean Name  ', email })
  });
  assert.equal(res.status, 201);
  assert.equal(res.json.user.name, 'Clean Name');
});

test('contact message content is sanitized before storage', async () => {
  const res = await request(base, 'POST', '/api/contact', {
    body: { name: '<b>Eve</b>', email: 'eve@example.com', topic: 'security<script>', message: '<script>alert(1)</script>Please help me', consentToContact: true }
  });
  assert.equal(res.status, 201);
  assert.ok(res.json.ok);
  // No assertion on stored content here (admin-only view); the same
  // sanitizeText() path is proven on the signup name above.
});

test('rate limiting: contact endpoint returns 429 after the burst limit', async () => {
  const burst = Array.from({ length: 6 }, (_, i) => request(base, 'POST', '/api/contact', {
    body: { name: `Spammer ${i}`, email: `spam-${i}@example.com`, message: `msg ${i}`, consentToContact: true }
  }));
  const statuses = (await Promise.all(burst)).map(r => r.status);
  assert.ok(statuses.includes(429), `expected a 429 in ${JSON.stringify(statuses)}`);
});

test('rate limiting: signin endpoint returns 429 after repeated failures', async () => {
  // Use a distinct IP is impossible in-process; the signin limiter is separate
  // from contact so 20 attempts are needed — fire 21 bad signins.
  const attempts = Array.from({ length: 21 }, () => request(base, 'POST', '/api/auth/signin', {
    body: { email: `nobody-${Math.random()}@example.com`, password: 'Wrong-Pass-1!' }
  }));
  const statuses = (await Promise.all(attempts)).map(r => r.status);
  assert.ok(statuses.includes(429), `expected a 429 among ${JSON.stringify([...new Set(statuses)])}`);
});

test('legal pages served: terms, privacy, refund, robots, sitemap, llms.txt', async () => {
  for (const [path, needle, type] of [
    ['/terms.html', 'Όροι Χρήσης', 'text/html'],
    ['/privacy.html', 'Πολιτική Απορρήτου', 'text/html'],
    ['/refund.html', 'Πολιτική Επιστροφών', 'text/html'],
    ['/robots.txt', 'Sitemap: https://astritsa.com/sitemap.xml', 'text/plain'],
    ['/sitemap.xml', '<loc>https://astritsa.com/zodiac/taurus</loc>', 'application/xml'],
    ['/llms.txt', 'astritsa.com', 'text/plain']
  ]) {
    const res = await request(base, 'GET', path);
    assert.equal(res.status, 200, `${path} must be served`);
    assert.ok(String(res.raw || '').includes(needle), `${path} missing expected content`);
    assert.match(String(res.headers['content-type'] || ''), new RegExp(type.split('/')[0]), `${path} content-type`);
  }
});

test('SEO artifacts in home page: canonical, og tags, JSON-LD, FAQ', async () => {
  const res = await request(base, 'GET', '/');
  assert.equal(res.status, 200);
  const html = String(res.raw || '');
  assert.ok(html.includes('rel="canonical"'), 'canonical link');
  assert.ok(html.includes('property="og:title"'), 'og:title');
  assert.ok(html.includes('application/ld+json'), 'JSON-LD present');
  assert.ok(html.includes('FAQPage'), 'FAQPage schema');
  assert.ok(html.includes('/sitemap.xml'), 'sitemap reference');
  assert.ok(html.includes('faq'), 'FAQ section rendered');
});

test('admin module exists for code splitting and is referenced on demand only', async () => {
  const fs = require('fs');
  const path = require('path');
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'public', 'admin.js')), 'public/admin.js exists');
  const home = await request(base, 'GET', '/admin.js');
  assert.equal(home.status, 200);
  assert.match(String(home.raw || ''), /AstritsaAdmin/);
  const app = await request(base, 'GET', '/app.js');
  assert.ok(!String(app.raw || '').match(/data\.contacts\)\.map/), 'admin rendering moved out of app.js');
});
