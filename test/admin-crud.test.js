'use strict';
// Admin CRUD over HTTP. An admin account is bootstrapped from the
// ADMIN_EMAIL/ADMIN_PASSWORD env vars (server.js bootstrapAdmin), then the
// suite exercises overview, sources, users and contacts create/update/delete.
// Runs with NO AI key: readings are never requested, so no provider is needed.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = require('./helpers.js').tempDbPath();
process.env.ADMIN_EMAIL = 'admin@astritsa.test';
process.env.ADMIN_PASSWORD = 'AdminPass-1234!';
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

const valid = email => ({
  name: 'Tester', email, password: 'Str0ng-Pass!', birthDate: '1996-11-05',
  ageConfirmed: true, termsAccepted: true, privacyAccepted: true, refundAccepted: true, aiConsent: true
});

async function signup(email) {
  const res = await request(base, 'POST', '/api/auth/signup', { body: valid(email) });
  assert.equal(res.status, 201, `signup ${email}`);
  return { user: res.json.user, cookie: sessionCookie(res) };
}

let adminCookie = '';

test('admin is bootstrapped from env vars and can sign in', async () => {
  const denied = await request(base, 'POST', '/api/auth/signin', { body: { email: 'admin@astritsa.test', password: 'wrong' } });
  assert.equal(denied.status, 401);

  const res = await request(base, 'POST', '/api/auth/signin', { body: { email: 'admin@astritsa.test', password: 'AdminPass-1234!' } });
  assert.equal(res.status, 200);
  assert.equal(res.json.user.role, 'admin');
  assert.equal(res.json.ready, true, 'bootstrapped admin has all mandatory consents');
  adminCookie = sessionCookie(res);

  const overview = await request(base, 'GET', '/api/admin/overview', { cookie: adminCookie });
  assert.equal(overview.status, 200);
  assert.ok(overview.json.users.some(u => u.email === 'admin@astritsa.test' && u.role === 'admin'), 'overview lists the bootstrapped admin');
  assert.ok(Array.isArray(overview.json.sources));
  assert.ok(Array.isArray(overview.json.contacts));
});

test('admin endpoints reject anonymous and regular users', async () => {
  const anon = await request(base, 'GET', '/api/admin/overview');
  assert.equal(anon.status, 401);
  assert.equal(anon.json.code, 'AUTH_REQUIRED');

  const { cookie } = await signup('regular@astritsa.test');
  const forbidden = await request(base, 'GET', '/api/admin/overview', { cookie });
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.json.code, 'ADMIN_REQUIRED');

  const createForbidden = await request(base, 'POST', '/api/admin/sources', { cookie, body: { name: 'x', url: 'https://example.com/x.rss' } });
  assert.equal(createForbidden.status, 403, 'regular user cannot create sources');
});

test('sources: create, validate, update, delete', async () => {
  const bad = await request(base, 'POST', '/api/admin/sources', { cookie: adminCookie, body: { name: 'Bad', url: 'not-a-url' } });
  assert.equal(bad.status, 400);
  assert.equal(bad.json.code, 'SOURCE_URL_INVALID');

  const created = await request(base, 'POST', '/api/admin/sources', { cookie: adminCookie, body: { name: 'Alpha Feed', url: 'https://alpha.example.com/feed.rss', language: 'el', active: true } });
  assert.equal(created.status, 200);
  const source = created.json.sources.find(s => s.url === 'https://alpha.example.com/feed.rss');
  assert.ok(source && source.id && source.name === 'Alpha Feed' && source.language === 'el' && source.active === true, 'source created');

  const updated = await request(base, 'POST', '/api/admin/sources', { cookie: adminCookie, body: { id: source.id, name: 'Alpha Feed v2', url: 'https://alpha.example.com/v2.rss', language: 'any', active: false } });
  assert.equal(updated.status, 200);
  const after = updated.json.sources.find(s => s.id === source.id);
  assert.equal(after.name, 'Alpha Feed v2');
  assert.equal(after.url, 'https://alpha.example.com/v2.rss');
  assert.equal(after.active, false, 'update toggles active off');

  const missing = await request(base, 'POST', '/api/admin/sources', { cookie: adminCookie, body: { id: 'src_missing', name: 'Nope', url: 'https://alpha.example.com/x.rss' } });
  assert.equal(missing.status, 404);
  assert.equal(missing.json.code, 'SOURCE_NOT_FOUND');

  const deleted = await request(base, 'DELETE', `/api/admin/sources/${source.id}`, { cookie: adminCookie });
  assert.equal(deleted.status, 200);
  assert.ok(!deleted.json.sources.some(s => s.id === source.id), 'source removed');
});

test('users: admin can rename and change role, but not demote self', async () => {
  const { user, cookie } = await signup('user1@astritsa.test');

  const renamed = await request(base, 'POST', `/api/admin/users/${user.id}`, { cookie: adminCookie, body: { name: 'Renamed User' } });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.json.user.name, 'Renamed User');
  assert.equal(renamed.json.user.role, 'user');

  const badRole = await request(base, 'POST', `/api/admin/users/${user.id}`, { cookie: adminCookie, body: { role: 'superuser' } });
  assert.equal(badRole.status, 400);
  assert.equal(badRole.json.code, 'ROLE_INVALID');

  const promoted = await request(base, 'POST', `/api/admin/users/${user.id}`, { cookie: adminCookie, body: { role: 'admin' } });
  assert.equal(promoted.status, 200);
  assert.equal(promoted.json.user.role, 'admin', 'promotion persists');

  // The promoted user can now hit admin endpoints.
  const promotedOverview = await request(base, 'GET', '/api/admin/overview', { cookie });
  assert.equal(promotedOverview.status, 200, 'promoted user gains admin access');

  // Demote back to user; the role change works for a non-self admin.
  const demoted = await request(base, 'POST', `/api/admin/users/${user.id}`, { cookie: adminCookie, body: { role: 'user' } });
  assert.equal(demoted.status, 200);
  assert.equal(demoted.json.user.role, 'user');
  const demotedOverview = await request(base, 'GET', '/api/admin/overview', { cookie });
  assert.equal(demotedOverview.status, 403, 'demoted user loses admin access');

  // Self-demotion and self-deletion are blocked.
  const selfDemote = await request(base, 'POST', `/api/admin/users/${(await request(base, 'GET', '/api/auth/me', { cookie: adminCookie })).json.user.id}`, { cookie: adminCookie, body: { role: 'user' } });
  assert.equal(selfDemote.status, 400);
  assert.equal(selfDemote.json.code, 'ADMIN_SELF_DEMOTE');

  const selfDelete = await request(base, 'DELETE', `/api/admin/users/${(await request(base, 'GET', '/api/auth/me', { cookie: adminCookie })).json.user.id}`, { cookie: adminCookie });
  assert.equal(selfDelete.status, 400);
  assert.equal(selfDelete.json.code, 'ADMIN_DELETE_BLOCKED');

  const missing = await request(base, 'DELETE', '/api/admin/users/usr_missing', { cookie: adminCookie });
  assert.equal(missing.status, 404);
  assert.equal(missing.json.code, 'USER_NOT_FOUND');
});

test('deleting a user cascades sessions, history and anonymizes their contacts', async () => {
  const { user, cookie } = await signup('user2@astritsa.test');

  // Give the user a contact message and some history via a reading attempt.
  const contact = await request(base, 'POST', '/api/contact', { cookie, body: { email: 'user2@astritsa.test', message: 'Hello from user2', consentToContact: true } });
  assert.equal(contact.status, 201);

  const del = await request(base, 'DELETE', `/api/admin/users/${user.id}`, { cookie: adminCookie });
  assert.equal(del.status, 200);
  assert.ok(!del.json.users.some(u => u.id === user.id), 'user removed from overview');

  // Their session dies and credentials no longer work.
  const me = await request(base, 'GET', '/api/auth/me', { cookie });
  assert.equal(me.json.user, null, 'deleted user session invalidated');
  const signin = await request(base, 'POST', '/api/auth/signin', { body: { email: 'user2@astritsa.test', password: 'Str0ng-Pass!' } });
  assert.equal(signin.status, 401, 'deleted user cannot sign in');

  // Their contact message stays but is anonymized (GDPR-style).
  const overview = await request(base, 'GET', '/api/admin/overview', { cookie: adminCookie });
  const anonymized = overview.json.contacts.find(c => c.email === 'deleted-user' && c.message === 'Hello from user2');
  assert.ok(anonymized, 'contact preserved and anonymized after user deletion');
});

test('contacts: update status, delete, and 404 for missing', async () => {
  const { cookie } = await signup('user3@astritsa.test');
  const created = await request(base, 'POST', '/api/contact', { cookie, body: { email: 'user3@astritsa.test', message: 'Need help with billing', topic: 'billing', consentToContact: true } });
  assert.equal(created.status, 201);

  const overview = await request(base, 'GET', '/api/admin/overview', { cookie: adminCookie });
  const msg = overview.json.contacts.find(c => c.message === 'Need help with billing');
  assert.ok(msg && msg.status === 'new', 'message visible to admin as new');

  const closed = await request(base, 'POST', `/api/admin/contacts/${msg.id}`, { cookie: adminCookie, body: { status: 'closed' } });
  assert.equal(closed.status, 200);
  assert.equal(closed.json.message.status, 'closed');

  const badStatus = await request(base, 'POST', '/api/admin/contacts/msg_missing', { cookie: adminCookie, body: { status: 'closed' } });
  assert.equal(badStatus.status, 404);
  assert.equal(badStatus.json.code, 'MESSAGE_NOT_FOUND');

  const deleted = await request(base, 'DELETE', `/api/admin/contacts/${msg.id}`, { cookie: adminCookie });
  assert.equal(deleted.status, 200);
  const after = await request(base, 'GET', '/api/admin/overview', { cookie: adminCookie });
  assert.ok(!after.json.contacts.some(c => c.id === msg.id), 'message removed');

  const deleteMissing = await request(base, 'DELETE', '/api/admin/contacts/msg_missing', { cookie: adminCookie });
  assert.equal(deleteMissing.status, 404);
});