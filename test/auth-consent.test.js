'use strict';
// Auth, consent and GDPR flows against the real HTTP server in-process.
// Runs with NO AI key: reading requests prove consent gates via the expected
// 503 AI_NOT_CONFIGURED once the gate passes (never reaching a provider).
const fs = require('fs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = require('./helpers.js').tempDbPath();
process.env.ADMIN_EMAIL = ''; // never bootstrap an admin during tests
process.env.AI_API_KEY = '';
process.env.STRIPE_SECRET_KEY = '';
process.env.STRIPE_PRICE_ID = '';
process.env.ANALYTICS_GA4_ID = ''; // no tag ids configured in this suite
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

const valid = email => ({
  name: 'Tester', email, password: 'Str0ng-Pass!', birthDate: '1996-11-05',
  ageConfirmed: true, termsAccepted: true, privacyAccepted: true, refundAccepted: true, aiConsent: true
});

test('public endpoints: health and config', async () => {
  const health = await request(base, 'GET', '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.json.ok, true);

  const cfg = await request(base, 'GET', '/api/config');
  assert.equal(cfg.status, 200);
  assert.equal(cfg.json.aiConfigured, false);
  assert.ok(cfg.json.termsVersion, 'terms version present');
  assert.equal(cfg.json.analyticsConfigured, false, 'no analytics tag without ANALYTICS_GA4_ID');
  assert.equal(cfg.json.marketingConfigured, false, 'no marketing tag without MARKETING_PIXEL_ID');
  assert.equal(cfg.json.analyticsId, '');
  assert.equal(cfg.json.marketingId, '');
});

test('signup rejects weak password with 400 WEAK_PASSWORD', async () => {
  const res = await request(base, 'POST', '/api/auth/signup', { body: { ...valid('weak@example.com'), password: 'short' } });
  assert.equal(res.status, 400);
  assert.equal(res.json.code, 'WEAK_PASSWORD');
});

test('signup rejects minors with 403 AGE_REQUIRED', async () => {
  const res = await request(base, 'POST', '/api/auth/signup', { body: { ...valid('minor@example.com'), birthDate: '2015-06-01' } });
  assert.equal(res.status, 403);
  assert.equal(res.json.code, 'AGE_REQUIRED');
});

test('signup requires mandatory consents with 451 CONSENT_REQUIRED', async () => {
  const res = await request(base, 'POST', '/api/auth/signup', { body: { ...valid('noconsent@example.com'), termsAccepted: false, privacyAccepted: false, aiConsent: false } });
  assert.equal(res.status, 451);
  assert.equal(res.json.code, 'CONSENT_REQUIRED');
});

test('duplicate email signup returns 409 EMAIL_EXISTS', async () => {
  const first = await request(base, 'POST', '/api/auth/signup', { body: valid('dup@example.com') });
  assert.equal(first.status, 201);
  const second = await request(base, 'POST', '/api/auth/signup', { body: valid('dup@example.com') });
  assert.equal(second.status, 409);
  assert.equal(second.json.code, 'EMAIL_EXISTS');
});

test('full lifecycle: signup -> ready -> profile derivation -> cookie consent -> me', async () => {
  const res = await request(base, 'POST', '/api/auth/signup', { body: valid('life@example.com') });
  assert.equal(res.status, 201);
  assert.equal(res.json.ready, true, 'mandatory consents granted at signup');
  assert.equal(res.json.user.zodiac.id, 'scorpio', 'zodiac derived from birth date');
  assert.equal(res.json.user.lifePath, 5, 'life path derived from birth date (1+9+9+6+1+1+0+5=32->5)');
  const cookie = sessionCookie(res);
  assert.ok(cookie && cookie.startsWith('astritsa_session='));

  // Profile update persists (and guards unauthenticated calls).
  const meNoCookie = await request(base, 'GET', '/api/auth/me');
  assert.equal(meNoCookie.status, 200);
  assert.equal(meNoCookie.json.user, null);

  const prof = await request(base, 'POST', '/api/profile', { cookie, body: { name: 'Life', city: 'Πάτρα' } });
  assert.equal(prof.status, 200);
  assert.equal(prof.json.user.city, 'Πάτρα');

  // Cookie consent persists to the user record.
  const consent = await request(base, 'POST', '/api/consent/cookies', { cookie, body: { analytics: true, marketing: false } });
  assert.equal(consent.status, 200);
  const me = await request(base, 'GET', '/api/auth/me', { cookie });
  assert.equal(me.status, 200);
  assert.equal(me.json.ready, true);
  assert.deepEqual(me.json.user.cookieConsent, { essential: true, analytics: true, marketing: false, updatedAt: me.json.user.cookieConsent.updatedAt });
});

test('signin validates credentials and returns ready', async () => {
  const bad = await request(base, 'POST', '/api/auth/signin', { body: { email: 'life@example.com', password: 'wrong-password' } });
  assert.equal(bad.status, 401);
  assert.equal(bad.json.code, 'INVALID_CREDENTIALS');

  const ok = await request(base, 'POST', '/api/auth/signin', { body: { email: 'life@example.com', password: 'Str0ng-Pass!' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.ready, true);
  assert.equal(ok.json.user.email, 'life@example.com');
  assert.ok(sessionCookie(ok), 'session cookie issued');
});

test('demo login creates a ready, trialing demo user', async () => {
  const res = await request(base, 'POST', '/api/auth/demo');
  assert.equal(res.status, 201);
  assert.equal(res.json.demo, true);
  assert.equal(res.json.ready, true);
  assert.equal(res.json.user.subscription.status, 'trialing');
});

test('outdated terms version gates readings with 451 until consent is refreshed', async () => {
  const res = await request(base, 'POST', '/api/auth/signup', { body: valid('terms@example.com') });
  const cookie = sessionCookie(res);

  // Backdate the accepted terms/privacy versions directly in the temp DB,
  // simulating a Terms version bump on the server.
  const db = JSON.parse(fs.readFileSync(process.env.DB_PATH, 'utf8'));
  const user = db.users.find(u => u.email === 'terms@example.com');
  user.termsVersion = '2000-01-01';
  user.privacyVersion = '2000-01-01';
  fs.writeFileSync(process.env.DB_PATH, JSON.stringify(db));

  const gated = await request(base, 'POST', '/api/daily', { cookie, body: {} });
  assert.equal(gated.status, 451, 'stale consent blocks readings');
  assert.equal(gated.json.code, 'CONSENT_REQUIRED');

  // Refresh panel route re-grants consent.
  const refresh = await request(base, 'POST', '/api/terms/accept', { cookie, body: { ageConfirmed: true, termsAccepted: true, privacyAccepted: true, refundAccepted: true, aiConsent: true } });
  assert.equal(refresh.status, 200);
  assert.equal(refresh.json.ready, true);

  const me = await request(base, 'GET', '/api/auth/me', { cookie });
  assert.equal(me.json.ready, true);

  // Gate passes now; with no AI key configured the request stops at the
  // expected AI_NOT_CONFIGURED 503 instead of a consent error.
  const reading = await request(base, 'POST', '/api/daily', { cookie, body: {} });
  assert.equal(reading.status, 503);
  assert.equal(reading.json.code, 'AI_NOT_CONFIGURED');
});

test('reading endpoints require authentication', async () => {
  const res = await request(base, 'POST', '/api/daily', { body: {} });
  assert.equal(res.status, 401);
  assert.equal(res.json.code, 'AUTH_REQUIRED');
});

test('admin endpoints reject regular users with 403', async () => {
  const res = await request(base, 'POST', '/api/auth/signup', { body: valid('regular@example.com') });
  const cookie = sessionCookie(res);
  const admin = await request(base, 'GET', '/api/admin/overview', { cookie });
  assert.equal(admin.status, 403);
  assert.equal(admin.json.code, 'ADMIN_REQUIRED');
});

test('GDPR export returns user data and delete erases the account', async () => {
  const res = await request(base, 'POST', '/api/auth/signup', { body: valid('gdpr@example.com') });
  const cookie = sessionCookie(res);

  const exp = await request(base, 'GET', '/api/privacy/export', { cookie });
  assert.equal(exp.status, 200);
  assert.equal(exp.json.user.email, 'gdpr@example.com');
  assert.ok(Array.isArray(exp.json.history), 'history included in export');

  const del = await request(base, 'DELETE', '/api/privacy/delete', { cookie });
  assert.equal(del.status, 200);

  const me = await request(base, 'GET', '/api/auth/me', { cookie });
  assert.equal(me.json.user, null, 'session no longer maps to a user');

  const signin = await request(base, 'POST', '/api/auth/signin', { body: { email: 'gdpr@example.com', password: 'Str0ng-Pass!' } });
  assert.equal(signin.status, 401, 'credentials erased');
});
