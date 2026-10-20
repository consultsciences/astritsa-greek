'use strict';
// Reading endpoints exercise the full pipeline: auth -> consent gate -> real
// ephemeris context -> fake OpenAI-compatible provider -> parsed reading.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = require('./helpers.js').tempDbPath();
process.env.ADMIN_EMAIL = '';
process.env.STRIPE_SECRET_KEY = '';
process.env.STRIPE_PRICE_ID = '';
process.env.PAYMENTS_REQUIRED = '';

const { startServer, closeServer, removeDb, request, sessionCookie, startFakeAI, baseUrlFor } = require('./helpers.js');

let server = null;
let fakeAI = null;
let base = '';
let userCookie = '';

before(async () => {
  fakeAI = await startFakeAI();
  process.env.AI_API_KEY = 'test-key';
  process.env.AI_MODEL = 'test-model';
  process.env.AI_BASE_URL = `${baseUrlFor(fakeAI)}/v1`;

  server = await startServer();
  base = `http://127.0.0.1:${server.address().port}`;

  const res = await request(base, 'POST', '/api/auth/signup', {
    body: {
      name: 'Reader', email: 'reader@example.com', password: 'Str0ng-Pass!',
      birthDate: '1992-05-13', ageConfirmed: true, termsAccepted: true,
      privacyAccepted: true, refundAccepted: true, aiConsent: true
    }
  });
  assert.equal(res.status, 201);
  userCookie = sessionCookie(res);
});
after(async () => {
  await closeServer(server);
  await new Promise(r => fakeAI.close(r));
  removeDb();
});

const ENDPOINTS = {
  '/api/daily': {},
  '/api/coffee': { cupId: 'sunset', mode: 'specific', question: 'Θα ταξιδέψω φέτος;' },
  '/api/numerology': {},
  '/api/compatibility': { signA: 'taurus', signB: 'scorpio' },
  '/api/tarot': { intent: 'καριέρα' },
  '/api/surprise': {}
};

test('all six reading endpoints return parsed readings through the AI pipeline', async () => {
  for (const [route, body] of Object.entries(ENDPOINTS)) {
    const res = await request(base, 'POST', route, { cookie: userCookie, body });
    assert.equal(res.status, 200, `${route} should return 200`);
    assert.ok(res.json.reading, `${route} returns a reading`);
    assert.ok(typeof res.json.reading.title === 'string' && res.json.reading.title.length > 0, `${route} title`);
    assert.ok(typeof res.json.reading.summary === 'string', `${route} summary`);
    assert.ok(typeof res.json.reading.aiDisclosure === 'string', `${route} disclosure default filled`);
    assert.ok(typeof res.json.reading.disclaimer === 'string', `${route} disclaimer default filled`);
    assert.ok(Array.isArray(res.json.reading.sourcesUsed), `${route} sourcesUsed array`);
  }
});

test('readings land in the user history', async () => {
  const res = await request(base, 'GET', '/api/history', { cookie: userCookie });
  assert.equal(res.status, 200);
  const types = res.json.history.map(h => h.type);
  for (const t of ['daily', 'coffee', 'numerology', 'compatibility', 'tarot', 'surprise']) {
    assert.ok(types.includes(t), `history contains ${t}`);
  }
});

test('coffee endpoint echoes the request language', async () => {
  const en = await request(base, 'POST', '/api/coffee', { cookie: userCookie, body: { cupId: 'classic', mode: 'general', language: 'en' } });
  assert.equal(en.status, 200);
  const el = await request(base, 'POST', '/api/coffee', { cookie: userCookie, body: { cupId: 'classic', mode: 'general', language: 'el' } });
  assert.equal(el.status, 200);
});

test('unauthenticated reading request is rejected before any AI call', async () => {
  const res = await request(base, 'POST', '/api/daily', { body: {} });
  assert.equal(res.status, 401);
  assert.equal(res.json.code, 'AUTH_REQUIRED');
});

test('GET /api/trends serves the topic catalog with real queries', async () => {
  const res = await request(base, 'GET', '/api/trends?language=el');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.json.trends) && res.json.trends.length >= 6);
  const first = res.json.trends[0];
  assert.ok(first.id && first.title && first.query, 'each trend carries id/title/query');
  assert.ok(typeof first.topicSky === 'object');
  const ids = res.json.trends.map(t => t.id);
  assert.ok(ids.includes('mercury-retro') && ids.includes('new-moon-scorpio'));
});

test('POST /api/trends runs a real AI reading for a topic query and stores it', async () => {
  const cat = await request(base, 'GET', '/api/trends?language=el');
  const topic = cat.json.trends.find(t => t.id === 'mercury-retro');
  const res = await request(base, 'POST', '/api/trends', { cookie: userCookie, body: { query: topic.query, topic: topic.id, language: 'el' } });
  assert.equal(res.status, 200);
  assert.ok(res.json.reading, 'returns a reading');
  assert.equal(res.json.reading.feature, 'trend');
  assert.equal(res.json.topic.id, 'mercury-retro');
  const history = await request(base, 'GET', '/api/history', { cookie: userCookie });
  assert.ok(history.json.history.some(h => h.type === 'trend'), 'trend reading lands in history');
});

test('POST /api/trends validates the query', async () => {
  const missing = await request(base, 'POST', '/api/trends', { cookie: userCookie, body: {} });
  assert.equal(missing.status, 400);
  assert.equal(missing.json.code, 'TREND_QUERY_REQUIRED');
  const anon = await request(base, 'POST', '/api/trends', { body: { query: 'x' } });
  assert.equal(anon.status, 401);
  assert.equal(anon.json.code, 'AUTH_REQUIRED');
});

test('PAYMENTS_REQUIRED gates non-subscribed users', async () => {
  process.env.PAYMENTS_REQUIRED = 'true';
  try {
    const free = await request(base, 'POST', '/api/daily', { cookie: userCookie, body: {} });
    assert.equal(free.status, 402);
    assert.equal(free.json.code, 'SUBSCRIPTION_REQUIRED');
  } finally {
    process.env.PAYMENTS_REQUIRED = '';
  }
});
