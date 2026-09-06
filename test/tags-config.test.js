'use strict';
// Consent-gated tag configuration: /api/config and the admin overview expose
// ANALYTICS_GA4_ID / MARKETING_PIXEL_ID only when the env vars are configured.
// (The client uses these ids to load GA4 / Meta Pixel strictly after consent.)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = require('./helpers.js').tempDbPath();
process.env.ADMIN_EMAIL = 'tags-admin@example.com'; // bootstraps an admin on require
process.env.ADMIN_PASSWORD = 'Tags-Admin-Pass!';
process.env.ANALYTICS_GA4_ID = 'G-TESTABC123';
process.env.MARKETING_PIXEL_ID = '123456789012345';
process.env.AI_API_KEY = '';
process.env.STRIPE_SECRET_KEY = '';
process.env.STRIPE_PRICE_ID = '';

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

test('/api/config exposes configured tag ids', async () => {
  const cfg = await request(base, 'GET', '/api/config');
  assert.equal(cfg.status, 200);
  assert.equal(cfg.json.analyticsConfigured, true);
  assert.equal(cfg.json.analyticsId, 'G-TESTABC123');
  assert.equal(cfg.json.marketingConfigured, true);
  assert.equal(cfg.json.marketingId, '123456789012345');
});

test('admin overview reports tag configuration', async () => {
  const signin = await request(base, 'POST', '/api/auth/signin', {
    body: { email: 'tags-admin@example.com', password: 'Tags-Admin-Pass!' }
  });
  assert.equal(signin.status, 200);
  const cookie = sessionCookie(signin);
  assert.ok(cookie, 'admin session issued');

  const overview = await request(base, 'GET', '/api/admin/overview', { cookie });
  assert.equal(overview.status, 200);
  assert.equal(overview.json.config.analyticsConfigured, true);
  assert.equal(overview.json.config.analyticsId, 'G-TESTABC123');
  assert.equal(overview.json.config.marketingConfigured, true);
  assert.equal(overview.json.config.marketingId, '123456789012345');
});
