'use strict';
// Shared helpers for the node:test suite. Each test file runs in its own
// process and gets an isolated temp DB plus its own in-process server on an
// ephemeral port, so nothing touches data/db.json or the real server.
const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');

let serverModule = null;
function loadServer() {
  if (!serverModule) serverModule = require('../server.js'); // env must be set before first call
  return serverModule;
}

function tempDbPath() {
  return path.join(os.tmpdir(), `astritsa-test-db-${process.pid}.json`);
}

function startServer() {
  const { server } = loadServer();
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function closeServer(srv) {
  return new Promise(resolve => {
    try { srv.closeAllConnections && srv.closeAllConnections(); } catch { /* ignore */ }
    srv.close(() => resolve());
  });
}

function removeDb() {
  try { fs.unlinkSync(tempDbPath()); } catch { /* ignore */ }
}

function request(base, method, route, { body, cookie, headers } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const reqHeaders = { ...(headers || {}) };
    if (payload !== null) reqHeaders['Content-Type'] = 'application/json';
    if (cookie) reqHeaders.Cookie = cookie;
    const req = http.request(base + route, { method, headers: reqHeaders }, res => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => (raw += chunk));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch { /* non-JSON body */ }
        resolve({ status: res.statusCode, headers: res.headers, json, raw, setCookie: (res.headers['set-cookie'] || [])[0] || null });
      });
    });
    req.on('error', reject);
    if (payload !== null) req.write(payload);
    req.end();
  });
}

function sessionCookie(res) {
  if (!res || !res.setCookie) return null;
  return res.setCookie.split(';')[0]; // "astritsa_session=..."
}

// Minimal OpenAI-compatible stub that returns a valid reading JSON, so the
// full server -> AI pipeline is exercised without a real provider.
function startFakeAI() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let raw = '';
      req.on('data', chunk => (raw += chunk));
      req.on('end', () => {
        const reading = {
          title: 'Test AI reading',
          summary: 'Test summary from the fake provider.',
          sourceConsensus: { commonThemes: ['theme a'], agreementLevel: 'low', note: 'fake' },
          sections: [{ heading: 'Focus', text: 'Some text.' }],
          symbols: [], cards: [],
          lucky: { number: '7', time: 'noon', color: 'gold', place: 'home', herb: 'mint' },
          action: 'Act with calm.',
          sourcesUsed: [],
          aiDisclosure: 'AI generated.',
          disclaimer: 'Entertainment only.'
        };
        const out = JSON.stringify({
          id: 'chatcmpl-test', object: 'chat.completion', created: Math.floor(Date.now() / 1000),
          model: 'test-model',
          choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(reading) }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(out);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function baseUrlFor(srv) {
  return `http://127.0.0.1:${srv.address().port}`;
}

module.exports = { tempDbPath, startServer, closeServer, removeDb, request, sessionCookie, startFakeAI, baseUrlFor };
