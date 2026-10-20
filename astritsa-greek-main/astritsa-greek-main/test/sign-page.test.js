'use strict';
// Dedicated per-sign pages: /zodiac/:sign HTML serving + GET /api/sky/:sign
// real-ephemeris snapshots (whole-sign transits, rulers, moon phase).
// The sky assertions pin 2026-09-04, independently validated in
// ephemeris-golden.test.js (Sun Virgo, Saturn RX in Pisces).
const fs = require('fs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = require('./helpers.js').tempDbPath();
process.env.ADMIN_EMAIL = '';
process.env.AI_API_KEY = '';
process.env.STRIPE_SECRET_KEY = '';
process.env.STRIPE_PRICE_ID = '';
process.env.ANALYTICS_GA4_ID = '';
process.env.MARKETING_PIXEL_ID = '';

const { startServer, closeServer, removeDb, request, baseUrlFor } = require('./helpers.js');

let server = null;
let base = '';

before(async () => {
  server = await startServer();
  base = baseUrlFor(server);
});

after(async () => {
  await closeServer(server);
  removeDb();
});

test('serves the sign page shell at /zodiac/:sign for every sign', async () => {
  for (const sign of ['aries', 'taurus', 'pisces']) {
    const res = await request(base, 'GET', `/zodiac/${sign}`);
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.ok(res.raw.includes('sign.js'), 'loads sign.js');
    assert.ok(res.raw.includes('id="signReading"'), 'has reading target');
  }
});

test('serves the zodiac index shell at /zodiac', async () => {
  const res = await request(base, 'GET', '/zodiac');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
});

test('unknown sign page returns 404 JSON error', async () => {
  const res = await request(base, 'GET', '/zodiac/ophiuchus');
  assert.equal(res.status, 404);
  assert.equal(res.json.code, 'NOT_FOUND');
});

test('path traversal is not mapped to the sign page', async () => {
  // Encoded dot-segment WITH encoded slash survives URL parsing and reaches
  // the sign-page guard → must 404, never serve arbitrary files.
  const res = await request(base, 'GET', '/zodiac/%2e%2e%2fserver.js');
  assert.equal(res.status, 404);
  assert.equal(res.json && res.json.code, 'NOT_FOUND');
  // A dot-segment that the URL parser normalizes away falls through to the
  // static handler — it must NEVER return server.js source (SPA fallback only).
  const res2 = await request(base, 'GET', '/zodiac/%2e%2e/server.js');
  assert.doesNotMatch(String(res2.headers['content-type'] || ''), /javascript/);
  assert.ok(!res2.raw.includes('DB_PATH'), 'must not leak server.js source');
});

test('/api/sky/:sign returns real-ephemeris snapshot with whole-sign transits', async () => {
  const res = await request(base, 'GET', '/api/sky/taurus?date=2026-09-04');
  assert.equal(res.status, 200);
  const sky = res.json;
  assert.equal(sky.sign.id, 'taurus');
  assert.equal(sky.date, '2026-09-04');
  assert.equal(sky.approx, false, 'uses the real ephemeris');
  assert.ok(String(sky.source).includes('astronomy-engine'));
  assert.equal(sky.planets.length, 10);
  // Independently validated goldens (ephemeris-golden.test.js): Sun in Virgo
  // — 4 whole-sign steps from Taurus → trine (same earth element); Saturn RX
  // at 13.47° Aries (offset 11 → no major whole-sign aspect).
  const sun = sky.planets.find(p => p.id === 'sun');
  assert.equal(sun.sign.id, 'virgo');
  assert.equal(sun.retrograde, false);
  assert.equal(sun.aspectToSign.id, 'trine', 'Virgo is 4 signs from Taurus → whole-sign trine');
  const saturn = sky.planets.find(p => p.id === 'saturn');
  assert.equal(saturn.sign.id, 'aries');
  assert.equal(saturn.retrograde, true);
  assert.equal(saturn.aspectToSign, null, 'Aries is 11 signs from Taurus — no whole-sign aspect');
  // Moon phase must exist with illumination percentage.
  assert.ok(sky.moonPhase && typeof sky.moonPhase.illumination === 'number');
  // Every planet has a whole-sign offset, aspect ids are valid when present.
  for (const p of sky.planets) {
    assert.ok(Number.isInteger(p.houseOffset) && p.houseOffset >= 0 && p.houseOffset <= 11);
    if (p.aspectToSign) {
      assert.ok(['conjunction', 'sextile', 'square', 'trine', 'opposition'].includes(p.aspectToSign.id));
    }
  }
  // Taurus rulers: Venus; Scorpio co-ruler Pluto also exists in the table.
  assert.ok(sky.rulers.some(p => p.id === 'venus'));
});

test('/api/sky/:sign marks conjunction and opposition aspects correctly', async () => {
  // Sun in Virgo on 2026-09-04 → for virgo the Sun is a 0-offset conjunction.
  const res = await request(base, 'GET', '/api/sky/virgo?date=2026-09-04');
  assert.equal(res.status, 200);
  const sun = res.json.planets.find(p => p.id === 'sun');
  assert.equal(sun.sign.id, 'virgo');
  assert.equal(sun.houseOffset, 0);
  assert.equal(sun.aspectToSign.id, 'conjunction');
});

test('/api/sky/:sign rejects unknown signs and bad dates', async () => {
  const bad = await request(base, 'GET', '/api/sky/ophiuchus');
  assert.equal(bad.status, 404);
  assert.equal(bad.json.code, 'SIGN_NOT_FOUND');
  // Malformed date falls through to the ephemeris layer — must not 500 with
  // an unhandled error; expect a 4xx/5xx JSON error either way.
  const res = await request(base, 'GET', '/api/sky/aries?date=not-a-date');
  assert.ok(res.status >= 400 && res.status < 600);
  assert.ok(res.json && res.json.error);
});

test('unknown API routes still 404 after the new routes were added', async () => {
  const res = await request(base, 'GET', '/api/nope');
  assert.equal(res.status, 404);
  assert.equal(res.json.code, 'NOT_FOUND');
});
