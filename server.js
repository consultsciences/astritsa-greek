const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sanitizeHtml = require('sanitize-html');
const ephemeris = require('./ephemeris.js');

const DEFAULT_PORT = 3000;
const portSetting = Number(process.env.PORT);
// Treat unset, empty, invalid or non-positive PORT values (e.g. PORT=0) as "use the default".
const PORT = Number.isInteger(portSetting) && portSetting > 0 ? portSetting : DEFAULT_PORT;
const HOST = '0.0.0.0';
const PUBLIC = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
// DB_PATH can be overridden (the automated test suite uses a temp file per process).
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'db.json');
const TERMS_VERSION = '2026-08-25';
const PRIVACY_VERSION = '2026-08-25';
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 30);
const SOURCE_CACHE_SECONDS = Number(process.env.SOURCE_CACHE_SECONDS || 600);

fs.mkdirSync(DATA_DIR, { recursive: true });

class HttpError extends Error {
  constructor(status, message, code = 'ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// --- security utilities ------------------------------------------------------
// Password policy (pre-launch hardening): min 8 chars with at least one
// uppercase letter, one number and one special character. Shared by signup
// (and any future reset flow) so the client and server agree.
function validatePassword(password) {
  const pw = String(password || '');
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-ZΑ-Ω]/.test(pw)) return 'Password must contain an uppercase letter.';
  if (!/[0-9]/.test(pw)) return 'Password must contain a number.';
  if (!/[^A-Za-z0-9Α-Ωα-ω]/.test(pw)) return 'Password must contain a special character.';
  return null;
}
// Strip any HTML/XSS vectors from free-text user input before it is stored.
// sanitize-html with no allowed tags reduces input to plain text; then we
// normalise whitespace and cap length. Storage stays plain text (the UI
// escapes on render — this is defence in depth for the data layer).
function sanitizeText(value, maxLength = 4000) {
  const cleaned = sanitizeHtml(String(value ?? ''), { allowedTags: [], allowedAttributes: {} });
  return cleaned.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
// Simple fixed-window rate limiter (per IP+route bucket). In-memory by
// design — enough to blunt credential stuffing and contact spam on a
// single-node deployment; a multi-node setup would move this to Redis.
const RATE_BUCKETS = new Map();
function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const bucket = RATE_BUCKETS.get(key);
  if (!bucket || now - bucket.start > windowMs) {
    RATE_BUCKETS.set(key, { start: now, count: 1 });
    if (RATE_BUCKETS.size > 5000) RATE_BUCKETS.clear(); // crude memory bound
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) throw new HttpError(429, 'Too many requests. Try again shortly.', 'RATE_LIMITED');
}
// Baseline security headers for every response, API and static alike.
// HSTS/MRP only make sense on HTTPS — Dokploy/Hostinger terminates TLS at the
// proxy, so the app can send them unconditionally without breaking local http.
function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' https://www.googletagmanager.com https://connect.facebook.net; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.facebook.com; frame-src https://js.stripe.com https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
}

const signs = require('./zodiac-signs.js');
const signMap = Object.fromEntries(signs.map(s => [s.id, s]));

// --- per-sign daily sky (GET /api/sky/:sign) ---------------------------------
// Real-ephemeris snapshot for the Athens day, projected onto ONE sign: each
// transit planet carries a whole-sign aspect to the requested sign (0 signs
// away = conjunction, 2 = sextile, 3 = square, 4 = trine, 6 = opposition),
// plus the sign's ruler placements. Cached in memory per sign+day.
const SKY_TTL_MS = Number(process.env.SKY_CACHE_TTL_MS || 600000);
const SKY_CACHE = { key: '', data: null, at: 0 };
const SIGN_ASPECT_BY_OFFSET = { 0: 'conjunction', 2: 'sextile', 3: 'square', 4: 'trine', 6: 'opposition', 8: 'trine', 9: 'square', 10: 'sextile' };
const SIGN_ASPECT_LABELS = {
  conjunction: { el: 'σύνοδος', en: 'conjunction' },
  sextile: { el: 'εξάγωνο', en: 'sextile' },
  square: { el: 'τετράγωνο', en: 'square' },
  trine: { el: 'τρίγωνο', en: 'trine' },
  opposition: { el: 'αντίθεση', en: 'opposition' }
};
const SIGN_RULERS = {
  aries: ['mars'], taurus: ['venus'], gemini: ['mercury'], cancer: ['moon'],
  leo: ['sun'], virgo: ['mercury'], libra: ['venus'], scorpio: ['mars', 'pluto'],
  sagittarius: ['jupiter'], capricorn: ['saturn'], aquarius: ['saturn', 'uranus'], pisces: ['jupiter', 'neptune']
};

const defaultDb = {
  users: [],
  sessions: [],
  history: [],
  sources: [],
  contacts: [],
  consentLogs: [],
  settings: {
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION
  }
};

// --- trending astro topics (shared by GET /api/trends and POST /api/trends) --
// `query` is the actual search-style prompt sent to the AI engine when a user
// opens a topic card; `sign` anchors the reading; `sky` keys moon-phase and
// retrograde highlights into the card so trends stay factually grounded.
const TRENDING_TOPICS = [
  {
    id: 'mercury-retro',
    title: { el: 'Ανάδρομος Ερμής στον Ταύρο', en: 'Retrograde Mercury in Taurus' },
    category: { el: 'Πλανήτες', en: 'Planets' }, mentions: '15.420', direction: 'up', sign: 'taurus',
    query: { el: 'Ανάδρομος Ερμής στον Ταύρο: πώς επηρεάζει την επικοινωνία, τα ταξίδια και τα συμβόλαια;', en: 'Retrograde Mercury in Taurus: how does it affect communication, travel and contracts?' },
    sky: { whenRetro: 'mercury', moonPhases: null }
  },
  {
    id: 'new-moon-scorpio',
    title: { el: 'Νέα Σελήνη στον Σκορπιό', en: 'New Moon in Scorpio' },
    category: { el: 'Φεγγάρια', en: 'Moons' }, mentions: '12.350', direction: 'up', sign: 'scorpio',
    query: { el: 'Νέα Σελήνη στον Σκορπιό: τι να ξεκινήσω και τι να αφήσω πίσω μου;', en: 'New Moon in Scorpio: what should I start and what should I leave behind?' },
    sky: { whenRetro: null, moonPhases: ['new', 'waxing-crescent'] }
  },
  {
    id: 'venus-aries',
    title: { el: 'Αφροδίτη στον Κριό', en: 'Venus in Aries' },
    category: { el: 'Πλανήτες', en: 'Planets' }, mentions: '8.920', direction: 'flat', sign: 'aries',
    query: { el: 'Αφροδίτη στον Κριό: έρωτα, πάθος και αυθόρμητες σχέσεις — τι να προσέξω;', en: 'Venus in Aries: love, passion and spontaneous relationships — what should I watch for?' },
    sky: { planetIn: { planet: 'venus', sign: 'aries' } }
  },
  {
    id: 'mars-pluto-trine',
    title: { el: 'Άρης σε Τριγωνισμό με Πλούτωνα', en: 'Mars in trine with Pluto' },
    category: { el: 'Πλανήτες', en: 'Planets' }, mentions: '7.650', direction: 'down', sign: 'scorpio',
    query: { el: 'Άρης σε τριγωνισμό με Πλούτωνα: πώς να αξιοποιήσω τη συγκεντρωμένη ενέργεια και δύναμη;', en: 'Mars trine Pluto: how to harness the focused energy and power?' },
    sky: { aspect: { a: 'mars', b: 'pluto', type: 'trine' } }
  },
  {
    id: 'dec-eclipse',
    title: { el: 'Ηλιακή Έκλειψη Δεκεμβρίου', en: 'December Solar Eclipse' },
    category: { el: 'Εκλείψεις', en: 'Eclipses' }, mentions: '6.890', direction: 'up', sign: 'sagittarius',
    query: { el: 'Ηλιακή Έκλειψη: καινούργια κεφάλαια, μοίρα και αλλαγές — τι να περιμένω;', en: 'Solar eclipse: new chapters, destiny and change — what to expect?' },
    sky: { whenRetro: null, moonPhases: ['new'] }
  },
  {
    id: 'karmic-reassess',
    title: { el: 'Καρμική Αναθεώρηση', en: 'Karmic Reassessment' },
    category: { el: 'Πνευματικότητα', en: 'Spirituality' }, mentions: '5.420', direction: 'flat', sign: 'pisces',
    query: { el: 'Καρμική αναθεώρηση: μαθήματα, επαναλήψεις και πνευματική πρόοδος αυτόν τον μήνα;', en: 'Karmic reassessment: lessons, repetitions and spiritual progress this month?' },
    sky: { whenRetro: null, moonPhases: null }
  }
];
const TREND_CACHE_TTL_MS = Number(process.env.TREND_CACHE_TTL_MS || 300000);
const trendsCache = new Map();
// Factual, sky-anchored bullet for one topic card from the real ephemeris
// snapshot: current retrogrades, moon phase, or planet placements it touches.
function topicSkyHighlights(ctx, topic, lang) {
  const out = [];
  const sky = topic.sky || {};
  if (sky.whenRetro) {
    const hit = (ctx.retrogrades || []).find(r => r.id === sky.whenRetro);
    if (hit) out.push(lang === 'en' ? `${hit.en} is retrograde now` : `${hit.el} είναι σε ανάδρομη κίνηση τώρα`);
  }
  if (sky.moonPhases && ctx.moonPhase) {
    if (sky.moonPhases.includes(ctx.moonPhase.id)) {
      out.push(lang === 'en' ? `${ctx.moonPhase.en} (${ctx.moonPhase.illumination}%)` : `${ctx.moonPhase.el} (${ctx.moonPhase.illumination}%)`);
    }
  }
  if (sky.planetIn) {
    const p = (ctx.planets || []).find(x => x.id === sky.planetIn.planet);
    if (p && p.sign && p.sign.id === sky.planetIn.sign) {
      out.push(lang === 'en' ? `${p.en} in ${p.sign.en} ${p.sign.degree}°` : `${p.el} στον/στην ${p.sign.el} ${p.sign.degree}°`);
    }
  }
  if (sky.aspect) {
    const a = (ctx.aspects || []).find(x => x.a.id === sky.aspect.a && x.b.id === sky.aspect.b && x.type.id === sky.aspect.type);
    if (a) out.push(lang === 'en' ? `${a.a.en} ${a.type.en} ${a.b.en} (orb ${a.orbUsed}°)` : `${a.a.el} ${a.type.el} ${a.b.el} (βάθος ${a.orbUsed}°)`);
  }
  return out;
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function nowISO() { return new Date().toISOString(); }
function todayISO() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens' }).format(new Date()); }
// Approximate, dependency-free day context for the AI engine. Moon phase is
// computed from the synodic month (reference new moon 2000-01-06 18:14 UTC);
// the Sun's tropical sign is derived from the calendar date. This is NOT a
// precise ephemeris: it exists to give day-to-day horoscopes a real anchor.
function moonPhaseForDate(date = new Date()) {
  const SYNODIC_MONTH = 29.530588853;
  const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);
  const ageDays = (((date.getTime() - REF_NEW_MOON) / 86400000) % SYNODIC_MONTH + SYNODIC_MONTH) % SYNODIC_MONTH;
  const f = ageDays / SYNODIC_MONTH;
  const phases = [
    { id: 'new', el: 'Νέα Σελήνη', en: 'New Moon' },
    { id: 'waxing-crescent', el: 'Αύξουσα Ημισέληνος', en: 'Waxing Crescent' },
    { id: 'first-quarter', el: 'Πρώτο Τέταρτο', en: 'First Quarter' },
    { id: 'waxing-gibbous', el: 'Αύξουσα Αμφίκυρτος', en: 'Waxing Gibbous' },
    { id: 'full', el: 'Πανσέληνος', en: 'Full Moon' },
    { id: 'waning-gibbous', el: 'Φθίνουσα Αμφίκυρτος', en: 'Waning Gibbous' },
    { id: 'last-quarter', el: 'Τελευταίο Τέταρτο', en: 'Last Quarter' },
    { id: 'waning-crescent', el: 'Φθίνουσα Ημισέληνος', en: 'Waning Crescent' }
  ];
  const idx = Math.min(7, Math.floor(f * 8));
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * f)) / 2 * 100);
  return { ...phases[idx], illumination };
}
// Calendar-date approximation, kept as a graceful fallback when the real
// ephemeris dependency (astronomy-engine) is missing or fails to load.
function calendarAstrologicalContext(dateISO = todayISO()) {
  const sun = getZodiac(dateISO);
  const moon = moonPhaseForDate(new Date());
  return {
    approx: true,
    source: 'calendar-date approximation (astronomy-engine unavailable)',
    note: 'Approximate day context computed from the calendar date (no precise ephemeris is used). Use it only to color general guidance; never invent specific planetary degrees, exact event times, or retrograde statuses.',
    sunSign: sun ? { id: sun.id, el: sun.el, en: sun.en, element: sun.element } : null,
    moonPhase: moon
  };
}
// True ephemeris context (planets, aspects, retrogrades, moon phase) via
// astronomy-engine, with the calendar approximation as fallback.
async function astrologicalContextAsync(dateISO = todayISO()) {
  try {
    return await ephemeris.context(dateISO);
  } catch (err) {
    console.warn('[astrology] real ephemeris unavailable, using calendar approximation:', err && err.message ? err.message : err);
    return calendarAstrologicalContext(dateISO);
  }
}
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function id(prefix = '') { return `${prefix}${crypto.randomUUID()}`; }
function sha(input) { return crypto.createHash('sha256').update(String(input)).digest('hex'); }
function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2));
      return clone(defaultDb);
    }
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    return { ...clone(defaultDb), ...parsed, settings: { ...defaultDb.settings, ...(parsed.settings || {}) } };
  } catch (err) {
    console.error('DB read failed', err);
    return clone(defaultDb);
  }
}
function writeDb(db) { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, 310000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, passwordHash = '') {
  const [salt, saved] = passwordHash.split(':');
  if (!salt || !saved) return false;
  const computed = crypto.pbkdf2Sync(String(password), salt, 310000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(saved, 'hex'), Buffer.from(computed, 'hex'));
}

function bootstrapAdmin() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || !password) return;
  const db = readDb();
  const existing = db.users.find(u => u.email === email);
  if (existing) {
    if (existing.role !== 'admin') existing.role = 'admin';
    // Keep the operator account consent-current across policy-version bumps.
    if (!existing.refundAcceptedAt) existing.refundAcceptedAt = nowISO();
    writeDb(db);
    return;
  }
  db.users.push({
    id: id('usr_'),
    role: 'admin',
    name: 'Astritsa Admin',
    email,
    passwordHash: createPasswordHash(password),
    birthDate: '', birthTime: '', city: '', zodiac: null, lifePath: null,
    ageConfirmedAt: nowISO(),
    termsAcceptedAt: nowISO(), termsVersion: TERMS_VERSION,
    privacyAcceptedAt: nowISO(), privacyVersion: PRIVACY_VERSION,
    refundAcceptedAt: nowISO(),
    aiConsentAt: nowISO(),
    marketingConsent: false,
    subscription: { status: 'admin' },
    createdAt: nowISO(), updatedAt: nowISO()
  });
  writeDb(db);
}
bootstrapAdmin();

function parseCookies(req) {
  const out = {};
  const header = req.headers.cookie || '';
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1));
  });
  return out;
}
function sessionCookie(req, token, maxAgeSeconds) {
  const secure = (req.headers['x-forwarded-proto'] === 'https') || String(process.env.APP_ORIGIN || '').startsWith('https://');
  return `astritsa_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`;
}
function createSession(db, req, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  db.sessions.push({ tokenHash: sha(token), userId, expiresAt, createdAt: nowISO(), ipHash: sha(req.socket.remoteAddress || ''), userAgent: String(req.headers['user-agent'] || '').slice(0, 300) });
  db.sessions = db.sessions.filter(s => new Date(s.expiresAt) > new Date()).slice(-1000);
  return token;
}
function getAuth(req, db = readDb()) {
  const token = parseCookies(req).astritsa_session;
  if (!token) return { user: null, session: null, db };
  const tokenHash = sha(token);
  const session = db.sessions.find(s => s.tokenHash === tokenHash && new Date(s.expiresAt) > new Date());
  if (!session) return { user: null, session: null, db };
  const user = db.users.find(u => u.id === session.userId);
  return { user, session, db };
}
function requireUser(req) {
  const auth = getAuth(req);
  if (!auth.user) throw new HttpError(401, 'Please sign in first.', 'AUTH_REQUIRED');
  return auth;
}
function requireAdmin(req) {
  const auth = requireUser(req);
  if (auth.user.role !== 'admin') throw new HttpError(403, 'Admin access required.', 'ADMIN_REQUIRED');
  return auth;
}
function hasMandatoryConsents(user) {
  return Boolean(user && user.ageConfirmedAt && user.termsAcceptedAt && user.privacyAcceptedAt && user.refundAcceptedAt && user.aiConsentAt && user.termsVersion === TERMS_VERSION && user.privacyVersion === PRIVACY_VERSION);
}
function requireReadyUser(req) {
  const auth = requireUser(req);
  if (!hasMandatoryConsents(auth.user)) throw new HttpError(451, 'Age, Terms, Privacy and AI transparency consent are required before using Astritsa.', 'CONSENT_REQUIRED');
  return auth;
}
function isAdultBirthDate(date) {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - d.getUTCFullYear();
  const m = today.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < d.getUTCDate())) age--;
  return age >= 18;
}
function getZodiac(birthDate) {
  if (!birthDate) return null;
  const [, mStr, dStr] = birthDate.split('-');
  const month = Number(mStr), day = Number(dStr);
  for (const s of signs) {
    const [sm, sd] = s.start, [em, ed] = s.end;
    if (sm <= em) {
      if ((month > sm || (month === sm && day >= sd)) && (month < em || (month === em && day <= ed))) return s;
    } else {
      if ((month > sm || (month === sm && day >= sd)) || (month < em || (month === em && day <= ed))) return s;
    }
  }
  return null;
}
function reduceNumber(n) {
  while (![11, 22, 33].includes(n) && n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0);
  return n || 1;
}
function lifePath(date) {
  return date ? reduceNumber(date.replace(/\D/g, '').split('').reduce((a, d) => a + Number(d), 0)) : null;
}
function updateProfileFields(user, input) {
  if (input.name !== undefined) user.name = sanitizeText(input.name, 100);
  if (input.birthDate !== undefined) {
    const adult = isAdultBirthDate(input.birthDate);
    if (adult === false) throw new HttpError(403, 'Astritsa is only available to adults aged 18+.', 'AGE_RESTRICTED');
    user.birthDate = input.birthDate || '';
    user.zodiac = getZodiac(user.birthDate);
    user.lifePath = lifePath(user.birthDate);
  }
  if (input.birthTime !== undefined) user.birthTime = String(input.birthTime || '').slice(0, 8);
  if (input.city !== undefined) user.city = sanitizeText(input.city, 100);
  user.updatedAt = nowISO();
}
function addHistory(db, userId, type, payload) {
  db.history.unshift({ id: id('his_'), userId, type, payload, createdAt: nowISO() });
  db.history = db.history.slice(0, 500);
}
function sendJson(res, status, payload, headers = {}) {
  securityHeaders(res);
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}
function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      chunks.push(chunk); size += chunk.length;
      if (size > 2_000_000) reject(new HttpError(413, 'Request too large.', 'REQUEST_TOO_LARGE'));
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJson(req) {
  const raw = await readRaw(req);
  if (!raw.length) return {};
  try { return JSON.parse(raw.toString('utf8')); }
  catch { throw new HttpError(400, 'Invalid JSON.', 'INVALID_JSON'); }
}

function envSources() {
  const raw = String(process.env.ASTRO_SOURCE_URLS || '').trim();
  if (!raw) return [];
  let entries;
  try { entries = JSON.parse(raw); } catch { entries = raw.split(/[\n,]+/).map(url => ({ url: url.trim() })).filter(x => x.url); }
  if (!Array.isArray(entries)) entries = [];
  return entries.map((entry, idx) => {
    const url = typeof entry === 'string' ? entry : entry.url;
    let hostname = `Source ${idx + 1}`;
    try { hostname = new URL(url).hostname.replace(/^www\./, ''); } catch {}
    return { id: `env_${sha(url).slice(0, 10)}`, name: entry.name || hostname, url, language: entry.language || 'any', active: true, sourceType: 'env' };
  }).filter(s => s.url);
}
function activeSources(db) {
  const configured = db.sources.filter(s => s.active !== false).map(s => ({ ...s, sourceType: 'admin' }));
  const all = [...envSources(), ...configured];
  const seen = new Set();
  return all.filter(s => {
    const key = s.url;
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, Number(process.env.MAX_ASTRO_SOURCES || 10));
}
const sourceCache = new Map();
function stripHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
function extractRss(text) {
  const items = [];
  const itemRegex = /<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi;
  let match;
  while ((match = itemRegex.exec(text)) && items.length < 8) {
    const item = match[0];
    const title = (item.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [,''])[1];
    const desc = (item.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || item.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || item.match(/<content[^>]*>([\s\S]*?)<\/content>/i) || [,''])[1];
    items.push(stripHtml(`${title}. ${desc}`));
  }
  return items.join('\n');
}
async function fetchSource(source) {
  const cacheKey = source.url;
  const cached = sourceCache.get(cacheKey);
  if (cached && SOURCE_CACHE_SECONDS > 0 && (Date.now() - cached.time) < SOURCE_CACHE_SECONDS * 1000) return cached.value;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.SOURCE_TIMEOUT_MS || 7000));
  try {
    const res = await fetch(source.url, { signal: controller.signal, headers: { 'User-Agent': 'AstritsaBot/1.0 (+configured-by-site-owner; entertainment astrology aggregator)' } });
    const contentType = res.headers.get('content-type') || '';
    const raw = await res.text();
    let text = '';
    if (contentType.includes('xml') || /<rss|<feed|<item|<entry/i.test(raw.slice(0, 1000))) text = extractRss(raw);
    else if (contentType.includes('json')) {
      try { text = JSON.stringify(JSON.parse(raw)).replace(/[{}\[\]",]/g, ' '); } catch { text = raw; }
    } else text = stripHtml(raw);
    text = text.replace(/\s+/g, ' ').trim().slice(0, Number(process.env.SOURCE_EXCERPT_CHARS || 2400));
    const value = { name: source.name, url: source.url, ok: true, text, fetchedAt: nowISO() };
    sourceCache.set(cacheKey, { time: Date.now(), value });
    return value;
  } catch (err) {
    return { name: source.name, url: source.url, ok: false, text: '', error: err.name === 'AbortError' ? 'Timeout' : err.message, fetchedAt: nowISO() };
  } finally { clearTimeout(timer); }
}
async function collectSourceExcerpts(db, { lang, signId, feature }) {
  const sources = activeSources(db).filter(s => s.language === 'any' || !s.language || s.language === lang);
  const fetched = await Promise.allSettled(sources.map(fetchSource));
  const ok = fetched.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
  const sign = signMap[signId] || null;
  const signTerms = sign ? [sign.el.toLowerCase(), sign.en.toLowerCase(), sign.id.toLowerCase()] : [];
  return ok.map(src => {
    let text = src.text || '';
    if (signTerms.length && text.length > 600) {
      const lower = text.toLowerCase();
      const hits = signTerms.map(term => lower.indexOf(term)).filter(i => i >= 0);
      if (hits.length) {
        const i = Math.max(0, Math.min(...hits) - 450);
        text = text.slice(i, i + 1800);
      }
    }
    return { ...src, text, feature };
  }).filter(src => src.ok && src.text);
}

function aiConfig() {
  return {
    apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '',
    baseUrl: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: process.env.AI_MODEL || 'gpt-4o-mini'
  };
}
function labelForFeature(feature, lang) {
  const labels = {
    daily: { el: 'ημερήσια αστρολογική πρόβλεψη', en: 'daily astrological forecast' },
    trend: { el: 'δημοφιλές αστρολογικό θέμα', en: 'trending astrology topic' },
    coffee: { el: 'καφεμαντεία / ανάγνωση φλιτζανιού', en: 'coffee cup reading' },
    numerology: { el: 'αριθμολογία', en: 'numerology' },
    compatibility: { el: 'συναστρία / συμβατότητα ζωδίων', en: 'synastry / zodiac compatibility' },
    tarot: { el: 'Greek Oracle τράβηγμα καρτών', en: 'Greek Oracle card spread' },
    surprise: { el: 'σεληνιακή έκπληξη και ελληνικό μάντρα', en: 'lunar surprise and Greek mantra' }
  };
  return labels[feature]?.[lang] || feature;
}
function baseDisclosure(lang) {
  return lang === 'el'
    ? 'Παράγεται από AI σε πραγματικό χρόνο για ψυχαγωγία. Η Αστρίτσα συνδυάζει κοινά μοτίβα από διαμορφωμένες πηγές όπου υπάρχουν και δεν παρέχει επαγγελματική συμβουλή.'
    : 'Generated by AI in real time for entertainment. Astritsa combines common patterns from configured sources where available and does not provide professional advice.';
}
const ASTROLOGY_GROUND_RULES = `ASTROLOGY GROUND RULES — how day-to-day horoscope predictions are generated:

1. SUN-SIGN METHOD: A daily horoscope is a general statement of how today's planetary transits and aspects are likely to be experienced by people born with their Sun in a given sign. Anchor every daily reading in the user's Sun sign and, when available, their birth date/time/city profile. Without a full natal chart, never claim to read the user's exact rising sign, house cusps, or degree positions.

2. TRANSITS: Today's moving planets are compared to the natal Sun and to the sign's ruling planet (Aries-Mars, Taurus-Venus, Gemini-Mercury, Cancer-Moon, Leo-Sun, Virgo-Mercury, Libra-Venus, Scorpio-Mars/Pluto, Sagittarius-Jupiter, Capricorn-Saturn, Aquarius-Saturn/Uranus, Pisces-Jupiter/Neptune). Fast movers (Moon, Mercury, Venus, Mars) set the day's tone; slow movers (Jupiter, Saturn, Uranus, Neptune, Pluto) color longer arcs. When a sign's ruler is activated, give that sign a featured, concrete theme.

3. ASPECTS: conjunction 0° = merging, intensified, focused energy; sextile 60° = opportunity and ease; square 90° = friction and challenge that motivates action; trine 120° = harmony, natural talent, ease; opposition 180° = polarity, relationships, awareness. Soft aspects (trine/sextile) → supportive advice; hard aspects (square/opposition) → constructive challenge with practical steps; conjunctions → merged, concentrated energy. Only use specific aspect language when the provided context supports it.

4. HOUSES (life areas): 1st self/image, 2nd money/values, 3rd communication/siblings/short trips, 4th home/family/roots, 5th romance/creativity/children, 6th work/health/routine, 7th partnerships/contracts, 8th shared resources/transformation, 9th travel/study/philosophy, 10th career/reputation, 11th friends/community/goals, 12th subconscious/secrets/rest. Pick the 2–3 houses most activated today for that sign and tie the guidance to those life areas.

5. MOON: the Moon changes sign roughly every 2.5 days and sets the emotional weather. New Moon = intentions and starting; waxing = building momentum; Full Moon = culmination, clarity, release; waning = finishing and letting go. If today's moon phase is provided in the context, reflect it; otherwise speak generally without claiming a precise phase.

6. ELEMENTS & MODES: fire = action/energy, earth = practical/material, air = mental/social, water = emotional/intuitive. Modes: cardinal = initiating, fixed = stabilizing, mutable = adapting. Use them to color advice.

7. RETROGRADES: when a retrograde is active (e.g., Mercury retrograde), frame communication/technology/travel/contracts as review-and-revise rather than brand-new starts. Never claim a retrograde is active unless the context states it.

8. TIMING: the lucky number/time/color/place are symbolic entertainment guidance aligned with the sign and moon phase, never deterministic claims.

9. INTEGRITY: never invent planetary positions, degrees, retrograde statuses, or exact event times that are not given in the context. If precise ephemeris data is not provided, say the reading is based on general methodology for the sign plus the provided day context, keep it broad and encouraging, and remain within the entertainment framing: no fear, no deterministic claims, adults only.`;
async function generateAIReading(feature, user, payload, lang, db) {
  const cfg = aiConfig();
  if (!cfg.apiKey) throw new HttpError(503, 'AI API key is not configured. Set AI_API_KEY and AI_MODEL before launch.', 'AI_NOT_CONFIGURED');
  if (process.env.PAYMENTS_REQUIRED === 'true' && user.role !== 'admin') {
    const status = user.subscription?.status || 'none';
    if (!['active', 'trialing', 'admin'].includes(status)) throw new HttpError(402, 'An active subscription is required for this feature.', 'SUBSCRIPTION_REQUIRED');
  }
  const signId = payload.sign || payload.signA || user.zodiac?.id || getZodiac(user.birthDate)?.id || '';
  const sources = await collectSourceExcerpts(db, { lang, signId, feature });
  const sourceText = sources.map((s, i) => `SOURCE ${i + 1}: ${s.name}\nURL: ${s.url}\nFETCHED: ${s.fetchedAt}\nEXCERPT: ${s.text}`).join('\n\n').slice(0, Number(process.env.AI_SOURCE_CONTEXT_CHARS || 12000));
  const profile = {
    name: user.name,
    birthDate: user.birthDate,
    birthTime: user.birthTime,
    city: user.city,
    zodiac: user.zodiac ? { id: user.zodiac.id, el: user.zodiac.el, en: user.zodiac.en, element: user.zodiac.element } : null,
    lifePath: user.lifePath
  };
  const prompt = {
    app: 'Astritsa',
    todayEuropeAthens: todayISO(),
    feature,
    featureLabel: labelForFeature(feature, lang),
    language: lang === 'el' ? 'Greek' : 'English',
    userProfile: profile,
    ...(payload.topicQuery ? { topicQuery: String(payload.topicQuery), topicInstruction: 'The user opened a trending topic card. Answer the topicQuery directly and concretely for their sign, using the real sky below; keep the standard reading JSON shape.' } : {}),
    userRequest: payload,
    liveSourceCount: sources.length,
    liveSources: sources.map(s => ({ name: s.name, url: s.url, fetchedAt: s.fetchedAt })),
    sourceExcerpts: sourceText || 'No configured source excerpts were available for this request.',
    astrologyContext: await astrologicalContextAsync()
  };
  const system = `You are Astritsa, an original Greek-first astrology entertainment web app. Generate fresh, original content only. Do not imitate Faladdin or any specific astrologer. Use configured source excerpts only to infer broad common themes; do not copy or closely paraphrase horoscope text, and never quote more than 12 consecutive words from a source. If sources are missing, inaccessible, or not relevant to the feature, say that live source consensus is unavailable and rely on general astrological/numerological/oracle methodology. Always be transparent that this is AI-generated entertainment/wellness content, not medical, legal, financial, psychological or professional advice. Avoid deterministic claims, fear, manipulation, and sensitive personal inferences. Adults only. Return strict JSON only.\n\n${ASTROLOGY_GROUND_RULES}`;
  const userMsg = `Create a ${labelForFeature(feature, lang)} in ${lang === 'el' ? 'Greek' : 'English'} from this JSON input:\n${JSON.stringify(prompt, null, 2)}\n\nReturn exactly this JSON shape: {"title":"string","summary":"string","sourceConsensus":{"commonThemes":["string"],"agreementLevel":"low|medium|high|unavailable","note":"string"},"sections":[{"heading":"string","text":"string"}],"symbols":[{"label":"string","meaning":"string"}],"cards":[{"position":"string","title":"string","meaning":"string"}],"lucky":{"number":"string","time":"string","color":"string","place":"string","herb":"string"},"action":"string","sourcesUsed":[{"name":"string","url":"string"}],"aiDisclosure":"string","disclaimer":"string"}. Include symbols/cards/lucky only where useful. For coffee reading, reflect the selected cup; if userRequest.mode is "general" or question is empty, give a general cup reading instead of asking for a question. For numerology, compute from the provided data and explain the numbers. For compatibility, compare the two signs supplied in userRequest.\n\nApply the ASTROLOGY GROUND RULES from the system message (sun-sign method, transits, aspects, houses, moon phase, elements/modes, retrogrades, timing) when writing the reading, and reflect the astrologyContext sun sign and moon phase where relevant.`;
  const body = {
    model: cfg.model,
    messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
    temperature: Number(process.env.AI_TEMPERATURE || 0.72),
    response_format: { type: 'json_object' }
  };
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const raw = await res.text();
  if (!res.ok) throw new HttpError(502, `AI provider error: ${raw.slice(0, 500)}`, 'AI_PROVIDER_ERROR');
  let content = '';
  try { content = JSON.parse(raw).choices?.[0]?.message?.content || ''; } catch { content = raw; }
  let parsed;
  try { parsed = JSON.parse(content); }
  catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new HttpError(502, 'AI provider did not return valid JSON.', 'AI_INVALID_JSON');
    parsed = JSON.parse(match[0]);
  }
  parsed.aiDisclosure = parsed.aiDisclosure || baseDisclosure(lang);
  parsed.disclaimer = parsed.disclaimer || (lang === 'el'
    ? 'Οι AI προβλέψεις, η αστρολογία, η καφεμαντεία, η αριθμολογία και οι κάρτες oracle παρέχονται αποκλειστικά ως ψυχαγωγικό περιεχόμενο και δεν αποτελούν ιατρική, ψυχολογική, νομική, οικονομική ή άλλη επαγγελματική συμβουλή.'
    : 'AI predictions, astrology, coffee reading, numerology and oracle cards are provided exclusively as entertainment content and do not constitute medical, psychological, legal, financial or other professional advice.');
  parsed.sourcesUsed = Array.isArray(parsed.sourcesUsed) ? parsed.sourcesUsed : sources.map(s => ({ name: s.name, url: s.url }));
  parsed.generatedAt = nowISO();
  parsed.feature = feature;
  if (payload.topicQuery) parsed.topicQuery = String(payload.topicQuery);
  return parsed;
}

function appendForm(params, key, value) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) value.forEach((v, i) => appendForm(params, `${key}[${i}]`, v));
  else if (typeof value === 'object') Object.entries(value).forEach(([k, v]) => appendForm(params, `${key}[${k}]`, v));
  else params.append(key, String(value));
}
async function stripeRequest(endpoint, payload) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new HttpError(503, 'Stripe is not configured. Set STRIPE_SECRET_KEY.', 'STRIPE_NOT_CONFIGURED');
  const params = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => appendForm(params, k, v));
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(502, data.error?.message || 'Stripe API error.', 'STRIPE_API_ERROR');
  return data;
}
function originFromReq(req) {
  return process.env.APP_ORIGIN || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
}
function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!secret) return true;
  const parts = Object.fromEntries(String(sigHeader || '').split(',').map(p => p.split('=').map(x => x.trim())).filter(p => p.length === 2));
  if (!parts.t || !parts.v1) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'hex'), b = Buffer.from(parts.v1, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
async function handleStripeWebhook(req, res) {
  const rawBuffer = await readRaw(req);
  const raw = rawBuffer.toString('utf8');
  if (!verifyStripeSignature(raw, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET || '')) throw new HttpError(400, 'Invalid Stripe signature.', 'STRIPE_SIGNATURE_INVALID');
  const event = JSON.parse(raw);
  const db = readDb();
  const obj = event.data?.object || {};
  if (event.type === 'checkout.session.completed') {
    const user = db.users.find(u => u.id === obj.client_reference_id || u.email === obj.customer_email);
    if (user) {
      user.stripeCustomerId = obj.customer || user.stripeCustomerId;
      user.stripeSubscriptionId = obj.subscription || user.stripeSubscriptionId;
      user.subscription = { status: obj.payment_status === 'paid' ? 'active' : (obj.status || 'completed'), updatedAt: nowISO() };
      user.updatedAt = nowISO();
    }
  }
  if (event.type?.startsWith('customer.subscription.')) {
    const user = db.users.find(u => u.stripeCustomerId === obj.customer || u.stripeSubscriptionId === obj.id);
    if (user) {
      user.stripeSubscriptionId = obj.id;
      user.subscription = { status: obj.status, currentPeriodEnd: obj.current_period_end ? new Date(obj.current_period_end * 1000).toISOString() : null, updatedAt: nowISO() };
      user.updatedAt = nowISO();
    }
  }
  writeDb(db);
  sendJson(res, 200, { received: true });
}

async function maybeForwardContact(message) {
  const url = process.env.CONTACT_WEBHOOK_URL;
  if (!url) return { delivered: false, via: 'stored-only' };
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(message) });
    return { delivered: res.ok, via: 'webhook', status: res.status };
  } catch (err) { return { delivered: false, via: 'webhook', error: err.message }; }
}

async function api(req, res, pathname, url) {
  if (req.method === 'POST' && pathname === '/api/stripe/webhook') return handleStripeWebhook(req, res);

  if (req.method === 'GET' && pathname === '/api/health') return sendJson(res, 200, {
    ok: true,
    name: 'Astritsa',
    date: todayISO(),
    aiConfigured: Boolean(aiConfig().apiKey),
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID)
  });
  if (req.method === 'GET' && pathname === '/api/trends') {
    const lang = url.searchParams.get('language') === 'en' ? 'en' : 'el';
    const topicId = url.searchParams.get('topic') || '';
    const requestedQuery = String(url.searchParams.get('query') || '').trim().slice(0, 160);
    const topic = topicId ? TRENDING_TOPICS.find(t => t.id === topicId) : null;
    if (topicId && !topic) throw new HttpError(404, 'Unknown topic.', 'TOPIC_NOT_FOUND');
    const query = topic
      ? (topic.query[lang] || topic.query.el)
      : (requestedQuery || TRENDING_TOPICS[0].query[lang] || TRENDING_TOPICS[0].query.el);
    const cacheKey = `${lang}|${query.toLowerCase()}`;
    const cached = trendsCache.get(cacheKey);
    if (cached && Date.now() - cached.at < TREND_CACHE_TTL_MS) return sendJson(res, 200, { ...cached.data, cached: true });
    const ctx = await astrologicalContextAsync();
    const data = {
      generatedAt: nowISO(),
      source: ctx.source,
      approx: Boolean(ctx.approx),
      date: todayISO(),
      trends: TRENDING_TOPICS.map(tp => ({
        id: tp.id,
        title: lang === 'en' ? tp.title.en : tp.title.el,
        category: lang === 'en' ? tp.category.en : tp.category.el,
        mentions: tp.mentions,
        direction: tp.direction,
        query: tp.query[lang] || tp.query.el,
        topicSky: topicSkyHighlights(ctx, tp, lang)
      }))
    };
    trendsCache.set(cacheKey, { at: Date.now(), data });
    return sendJson(res, 200, data);
  }
  if (req.method === 'GET' && pathname === '/api/signs') return sendJson(res, 200, { signs });
  if (req.method === 'GET' && pathname.startsWith('/api/sky/')) {
    const signId = pathname.slice('/api/sky/'.length).toLowerCase();
    if (!signMap[signId]) throw new HttpError(404, 'Unknown zodiac sign.', 'SIGN_NOT_FOUND');
    const dateParam = url.searchParams.get('date') || '';
    if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) throw new HttpError(400, 'Date must be YYYY-MM-DD.', 'DATE_INVALID');
    const dateISO = dateParam || todayISO();
    const cacheKey = `${signId}|${dateISO}`;
    if (SKY_CACHE.key === cacheKey && Date.now() - SKY_CACHE.at < SKY_TTL_MS) {
      return sendJson(res, 200, SKY_CACHE.data);
    }
    const ctx = await astrologicalContextAsync(dateISO);
    const rulerIds = SIGN_RULERS[signId] || [];
    const planets = (ctx.planets || []).map(p => {
      const offset = p.sign && p.sign.id ? ((signMap[p.sign.id] ? signs.findIndex(s => s.id === p.sign.id) : 0) - signs.findIndex(s => s.id === signId) + 12) % 12 : null;
      const aspectId = offset !== null ? SIGN_ASPECT_BY_OFFSET[offset] : null;
      return {
        id: p.id, el: p.el, en: p.en,
        sign: p.sign ? { id: p.sign.id, el: p.sign.el, en: p.sign.en, emoji: p.sign.emoji, degree: p.sign.degree } : null,
        retrograde: Boolean(p.retrograde),
        houseOffset: offset,
        aspectToSign: aspectId ? { id: aspectId, ...SIGN_ASPECT_LABELS[aspectId] } : null
      };
    });
    const payload = {
      sign: { id: signId, ...signMap[signId] },
      date: dateISO,
      generatedAt: nowISO(),
      source: ctx.source,
      approx: Boolean(ctx.approx),
      sunSign: ctx.sunSign || null,
      moonPhase: ctx.moonPhase ? { id: ctx.moonPhase.id, el: ctx.moonPhase.el, en: ctx.moonPhase.en, illumination: ctx.moonPhase.illumination, sign: ctx.moonPhase.sign ? { id: ctx.moonPhase.sign.id, el: ctx.moonPhase.sign.el, en: ctx.moonPhase.sign.en, emoji: ctx.moonPhase.sign.emoji } : null } : null,
      planets,
      retrogrades: (ctx.retrogrades || []).map(r => r.id),
      rulers: planets.filter(p => rulerIds.includes(p.id))
    };
    SKY_CACHE.key = cacheKey; SKY_CACHE.data = payload; SKY_CACHE.at = Date.now();
    return sendJson(res, 200, payload);
  }
  if (req.method === 'GET' && pathname === '/api/config') return sendJson(res, 200, {
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    aiConfigured: Boolean(aiConfig().apiKey),
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
    paymentsRequired: process.env.PAYMENTS_REQUIRED === 'true',
    analyticsConfigured: Boolean(process.env.ANALYTICS_GA4_ID),
    analyticsId: process.env.ANALYTICS_GA4_ID || '',
    marketingConfigured: Boolean(process.env.MARKETING_PIXEL_ID),
    marketingId: process.env.MARKETING_PIXEL_ID || ''
  });

  if (req.method === 'POST' && pathname === '/api/auth/signup') {
    rateLimit(`signup:${req.socket.remoteAddress}`, 10, 60_000);
    const body = await readJson(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, 'Valid email required.', 'EMAIL_REQUIRED');
    const passwordProblem = validatePassword(password);
    if (passwordProblem) throw new HttpError(400, passwordProblem, 'WEAK_PASSWORD');
    const adultFromBirth = isAdultBirthDate(body.birthDate);
    if (adultFromBirth === false || (!body.ageConfirmed && adultFromBirth !== true)) throw new HttpError(403, 'You must confirm that you are 18+.', 'AGE_REQUIRED');
    if (!body.termsAccepted || !body.privacyAccepted || !body.refundAccepted || !body.aiConsent) throw new HttpError(451, 'Terms, Privacy, Refund policy and AI transparency agreement are mandatory.', 'CONSENT_REQUIRED');
    const db = readDb();
    if (db.users.some(u => u.email === email)) throw new HttpError(409, 'Email is already registered.', 'EMAIL_EXISTS');
    const user = {
      id: id('usr_'), role: email === String(process.env.ADMIN_EMAIL || '').trim().toLowerCase() ? 'admin' : 'user',
      name: sanitizeText(body.name, 100), email, passwordHash: createPasswordHash(password),
      birthDate: '', birthTime: '', city: '', zodiac: null, lifePath: null,
      ageConfirmedAt: nowISO(), termsAcceptedAt: nowISO(), termsVersion: TERMS_VERSION,
      privacyAcceptedAt: nowISO(), privacyVersion: PRIVACY_VERSION, refundAcceptedAt: nowISO(), aiConsentAt: nowISO(), marketingConsent: Boolean(body.marketingConsent),
      cookieConsent: body.cookieConsent || null,
      subscription: { status: 'none' }, createdAt: nowISO(), updatedAt: nowISO()
    };
    updateProfileFields(user, { birthDate: body.birthDate || '', birthTime: body.birthTime || '', city: body.city || '', name: user.name });
    db.users.push(user);
    db.consentLogs.push({ id: id('con_'), userId: user.id, type: 'signup-mandatory', termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION, createdAt: nowISO() });
    const token = createSession(db, req, user.id);
    writeDb(db);
    return sendJson(res, 201, { user: publicUser(user), ready: hasMandatoryConsents(user) }, { 'Set-Cookie': sessionCookie(req, token, SESSION_DAYS * 86400) });
  }

  if (req.method === 'POST' && pathname === '/api/auth/signin') {
    rateLimit(`signin:${req.socket.remoteAddress}`, 20, 60_000);
    const body = await readJson(req);
    const email = String(body.email || '').trim().toLowerCase();
    const db = readDb();
    const user = db.users.find(u => u.email === email);
    if (!user || !verifyPassword(body.password || '', user.passwordHash)) throw new HttpError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
    const token = createSession(db, req, user.id);
    user.lastLoginAt = nowISO();
    writeDb(db);
    return sendJson(res, 200, { user: publicUser(user), ready: hasMandatoryConsents(user) }, { 'Set-Cookie': sessionCookie(req, token, SESSION_DAYS * 86400) });
  }

  if (req.method === 'POST' && pathname === '/api/auth/demo') {
    const db = readDb();
    const demoId = id('demo_').slice(0, 18);
    const user = {
      id: id('usr_'),
      role: 'user',
      isDemo: true,
      name: 'Demo Astritsa',
      email: `${demoId}@astritsa.local`,
      passwordHash: createPasswordHash(crypto.randomBytes(16).toString('hex')),
      birthDate: '', birthTime: '12:00', city: 'Αθήνα', zodiac: null, lifePath: null,
      ageConfirmedAt: nowISO(),
      termsAcceptedAt: nowISO(), termsVersion: TERMS_VERSION,
      privacyAcceptedAt: nowISO(), privacyVersion: PRIVACY_VERSION,
      refundAcceptedAt: nowISO(),
      aiConsentAt: nowISO(),
      marketingConsent: false,
      cookieConsent: { essential: true, analytics: false, marketing: false, updatedAt: nowISO() },
      subscription: { status: 'trialing', plan: 'demo' },
      createdAt: nowISO(), updatedAt: nowISO()
    };
    updateProfileFields(user, { birthDate: '1992-05-13', birthTime: '12:00', city: 'Αθήνα', name: 'Demo Astritsa' });
    db.users.push(user);
    db.consentLogs.push({ id: id('con_'), userId: user.id, type: 'demo-account-auto-consent', termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION, createdAt: nowISO() });
    const token = createSession(db, req, user.id);
    writeDb(db);
    return sendJson(res, 201, { user: publicUser(user), demo: true, ready: hasMandatoryConsents(user) }, { 'Set-Cookie': sessionCookie(req, token, SESSION_DAYS * 86400) });
  }

  if (req.method === 'POST' && pathname === '/api/auth/signout') {
    const db = readDb();
    const token = parseCookies(req).astritsa_session;
    if (token) db.sessions = db.sessions.filter(s => s.tokenHash !== sha(token));
    writeDb(db);
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
  }

  if (req.method === 'GET' && pathname === '/api/auth/me') {
    const auth = getAuth(req);
    return sendJson(res, 200, { user: publicUser(auth.user), ready: hasMandatoryConsents(auth.user) });
  }

  if (req.method === 'POST' && pathname === '/api/consent/cookies') {
    const body = await readJson(req);
    const auth = getAuth(req);
    if (auth.user) {
      auth.user.cookieConsent = { essential: true, analytics: Boolean(body.analytics), marketing: Boolean(body.marketing), updatedAt: nowISO() };
      auth.db.consentLogs.push({ id: id('con_'), userId: auth.user.id, type: 'cookie-consent', payload: auth.user.cookieConsent, createdAt: nowISO() });
      writeDb(auth.db);
    }
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'POST' && pathname === '/api/terms/accept') {
    const body = await readJson(req);
    const auth = requireUser(req);
    if (!body.ageConfirmed || !body.termsAccepted || !body.privacyAccepted || !body.refundAccepted || !body.aiConsent) throw new HttpError(451, 'All mandatory confirmations are required.', 'CONSENT_REQUIRED');
    auth.user.ageConfirmedAt = auth.user.ageConfirmedAt || nowISO();
    auth.user.termsAcceptedAt = nowISO(); auth.user.termsVersion = TERMS_VERSION;
    auth.user.privacyAcceptedAt = nowISO(); auth.user.privacyVersion = PRIVACY_VERSION;
    auth.user.refundAcceptedAt = nowISO(); auth.user.aiConsentAt = nowISO(); auth.user.updatedAt = nowISO();
    auth.db.consentLogs.push({ id: id('con_'), userId: auth.user.id, type: 'terms-refresh', termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION, createdAt: nowISO() });
    writeDb(auth.db);
    return sendJson(res, 200, { user: publicUser(auth.user), ready: true });
  }

  if (req.method === 'POST' && pathname === '/api/profile') {
    const body = await readJson(req);
    const auth = requireReadyUser(req);
    updateProfileFields(auth.user, body);
    writeDb(auth.db);
    return sendJson(res, 200, { user: publicUser(auth.user) });
  }

  const readingRoutes = { '/api/daily': 'daily', '/api/coffee': 'coffee', '/api/numerology': 'numerology', '/api/compatibility': 'compatibility', '/api/tarot': 'tarot', '/api/surprise': 'surprise' };
  if (req.method === 'POST' && readingRoutes[pathname]) {
    const body = await readJson(req);
    const lang = body.language === 'en' ? 'en' : 'el';
    const auth = requireReadyUser(req);
    const reading = await generateAIReading(readingRoutes[pathname], auth.user, body, lang, auth.db);
    addHistory(auth.db, auth.user.id, readingRoutes[pathname], reading);
    writeDb(auth.db);
    return sendJson(res, 200, { reading });
  }

  if (req.method === 'POST' && pathname === '/api/trends') {
    const body = await readJson(req);
    const lang = body.language === 'en' ? 'en' : 'el';
    const auth = requireReadyUser(req);
    const query = String(body.query || '').trim().slice(0, 200);
    if (!query) throw new HttpError(400, 'A trending topic query is required.', 'TREND_QUERY_REQUIRED');
    const topic = TRENDING_TOPICS.find(t => t.query.el === query || t.query.en === query || t.id === body.topic);
    const reading = await generateAIReading('trend', auth.user, { ...body, topicQuery: query, sign: body.sign || (topic ? topic.sign : undefined) }, lang, auth.db);
    addHistory(auth.db, auth.user.id, 'trend', reading);
    writeDb(auth.db);
    return sendJson(res, 200, { reading, topic: topic ? { id: topic.id, title: lang === 'en' ? topic.title.en : topic.title.el } : null });
  }

  if (req.method === 'GET' && pathname === '/api/history') {
    const auth = requireReadyUser(req);
    return sendJson(res, 200, { history: auth.db.history.filter(h => h.userId === auth.user.id).slice(0, 50) });
  }

  if (req.method === 'POST' && pathname === '/api/contact') {
    rateLimit(`contact:${req.socket.remoteAddress}`, 5, 60_000);
    const body = await readJson(req);
    const auth = getAuth(req);
    const message = {
      id: id('msg_'), userId: auth.user?.id || null,
      name: sanitizeText(body.name || auth.user?.name || '', 100),
      email: sanitizeText(body.email || auth.user?.email || '', 160).toLowerCase(),
      topic: sanitizeText(body.topic || 'general', 80) || 'general',
      message: sanitizeText(body.message, 4000),
      consentToContact: Boolean(body.consentToContact), status: 'new', createdAt: nowISO()
    };
    if (!message.email || !message.message || !message.consentToContact) throw new HttpError(400, 'Email, message and contact consent are required.', 'CONTACT_FIELDS_REQUIRED');
    const db = auth.db || readDb();
    const delivery = await maybeForwardContact(message);
    message.delivery = delivery;
    db.contacts.unshift(message);
    db.contacts = db.contacts.slice(0, 500);
    writeDb(db);
    return sendJson(res, 201, { ok: true, delivery });
  }

  if (req.method === 'POST' && pathname === '/api/billing/checkout') {
    const auth = requireReadyUser(req);
    const origin = originFromReq(req);
    const price = process.env.STRIPE_PRICE_ID;
    if (!price) throw new HttpError(503, 'Stripe price is not configured. Set STRIPE_PRICE_ID.', 'STRIPE_PRICE_NOT_CONFIGURED');
    const session = await stripeRequest('/checkout/sessions', {
      mode: 'subscription',
      client_reference_id: auth.user.id,
      customer: auth.user.stripeCustomerId || undefined,
      customer_email: auth.user.stripeCustomerId ? undefined : auth.user.email,
      line_items: [{ price, quantity: 1 }],
      success_url: process.env.STRIPE_SUCCESS_URL || `${origin}/?billing=success#account`,
      cancel_url: process.env.STRIPE_CANCEL_URL || `${origin}/?billing=cancel#account`,
      allow_promotion_codes: true,
      metadata: { userId: auth.user.id, app: 'Astritsa' }
    });
    return sendJson(res, 200, { url: session.url, id: session.id });
  }

  if (req.method === 'POST' && pathname === '/api/billing/portal') {
    const auth = requireReadyUser(req);
    if (!auth.user.stripeCustomerId) throw new HttpError(400, 'No Stripe customer exists yet.', 'NO_STRIPE_CUSTOMER');
    const origin = originFromReq(req);
    const portal = await stripeRequest('/billing_portal/sessions', { customer: auth.user.stripeCustomerId, return_url: `${origin}/#account` });
    return sendJson(res, 200, { url: portal.url });
  }

  if (req.method === 'GET' && pathname === '/api/privacy/export') {
    const auth = requireUser(req);
    return sendJson(res, 200, {
      user: publicUser(auth.user),
      history: auth.db.history.filter(h => h.userId === auth.user.id),
      contacts: auth.db.contacts.filter(c => c.userId === auth.user.id || c.email === auth.user.email),
      consents: auth.db.consentLogs.filter(c => c.userId === auth.user.id)
    });
  }

  if (req.method === 'DELETE' && pathname === '/api/privacy/delete') {
    const auth = requireUser(req);
    if (auth.user.role === 'admin') throw new HttpError(400, 'Admin accounts cannot be self-deleted here. Transfer admin first.', 'ADMIN_DELETE_BLOCKED');
    const uid = auth.user.id;
    auth.db.users = auth.db.users.filter(u => u.id !== uid);
    auth.db.sessions = auth.db.sessions.filter(s => s.userId !== uid);
    auth.db.history = auth.db.history.filter(h => h.userId !== uid);
    auth.db.contacts = auth.db.contacts.map(c => c.userId === uid ? { ...c, userId: null, email: 'deleted-user', name: 'deleted-user' } : c);
    auth.db.consentLogs.push({ id: id('con_'), userId: uid, type: 'erasure', createdAt: nowISO() });
    writeDb(auth.db);
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
  }

  if (req.method === 'GET' && pathname === '/api/admin/overview') {
    const auth = requireAdmin(req);
    return sendJson(res, 200, {
      users: auth.db.users.map(u => ({ ...publicUser(u), email: u.email })),
      sources: auth.db.sources,
      envSources: envSources().map(s => ({ id: s.id, name: s.name, url: s.url, language: s.language, active: true })),
      contacts: auth.db.contacts.slice(0, 100),
      config: {
        aiConfigured: Boolean(aiConfig().apiKey), aiModel: aiConfig().model, aiBaseUrl: aiConfig().baseUrl,
        stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY), stripePriceConfigured: Boolean(process.env.STRIPE_PRICE_ID),
        contactWebhookConfigured: Boolean(process.env.CONTACT_WEBHOOK_URL), paymentsRequired: process.env.PAYMENTS_REQUIRED === 'true',
        analyticsConfigured: Boolean(process.env.ANALYTICS_GA4_ID), analyticsId: process.env.ANALYTICS_GA4_ID || '',
        marketingConfigured: Boolean(process.env.MARKETING_PIXEL_ID), marketingId: process.env.MARKETING_PIXEL_ID || ''
      }
    });
  }

  if (req.method === 'POST' && pathname === '/api/admin/sources') {
    const body = await readJson(req);
    const auth = requireAdmin(req);
    const sourceUrl = String(body.url || '').trim();
    try {
      const parsedUrl = new URL(sourceUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new HttpError(400, 'Source URL must use http or https.', 'SOURCE_URL_INVALID');
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw new HttpError(400, 'Valid source URL required.', 'SOURCE_URL_INVALID');
    }
    if (body.id) {
      const existing = auth.db.sources.find(s => s.id === body.id);
      if (!existing) throw new HttpError(404, 'Source not found.', 'SOURCE_NOT_FOUND');
      Object.assign(existing, { name: sanitizeText(body.name || existing.name, 120), url: sourceUrl, language: body.language || 'any', active: body.active !== false, updatedAt: nowISO() });
    } else {
      auth.db.sources.push({ id: id('src_'), name: sanitizeText(body.name || new URL(sourceUrl).hostname, 120), url: sourceUrl, language: body.language || 'any', active: body.active !== false, createdAt: nowISO(), updatedAt: nowISO() });
    }
    writeDb(auth.db);
    return sendJson(res, 200, { sources: auth.db.sources });
  }

  if (req.method === 'DELETE' && pathname.startsWith('/api/admin/sources/')) {
    const auth = requireAdmin(req);
    const sourceId = pathname.split('/').pop();
    auth.db.sources = auth.db.sources.filter(s => s.id !== sourceId);
    writeDb(auth.db);
    return sendJson(res, 200, { sources: auth.db.sources });
  }

  if (req.method === 'POST' && pathname.startsWith('/api/admin/users/')) {
    const body = await readJson(req);
    const auth = requireAdmin(req);
    const userId = pathname.split('/').pop();
    const target = auth.db.users.find(u => u.id === userId);
    if (!target) throw new HttpError(404, 'User not found.', 'USER_NOT_FOUND');
    if (body.role !== undefined) {
      const role = String(body.role).trim().toLowerCase();
      if (!['user', 'admin'].includes(role)) throw new HttpError(400, 'Role must be user or admin.', 'ROLE_INVALID');
      if (role !== 'admin' && target.role === 'admin' && target.id === auth.user.id) {
        throw new HttpError(400, 'Admin accounts cannot be demoted here. Transfer admin first.', 'ADMIN_SELF_DEMOTE');
      }
      target.role = role;
    }
    if (body.name !== undefined) target.name = sanitizeText(body.name, 100);
    target.updatedAt = nowISO();
    writeDb(auth.db);
    return sendJson(res, 200, { user: { ...publicUser(target), email: target.email } });
  }

  if (req.method === 'DELETE' && pathname.startsWith('/api/admin/users/')) {
    const auth = requireAdmin(req);
    const userId = pathname.split('/').pop();
    const target = auth.db.users.find(u => u.id === userId);
    if (!target) throw new HttpError(404, 'User not found.', 'USER_NOT_FOUND');
    if (target.id === auth.user.id) throw new HttpError(400, 'Admin accounts cannot be deleted here. Transfer admin first.', 'ADMIN_DELETE_BLOCKED');
    auth.db.users = auth.db.users.filter(u => u.id !== userId);
    auth.db.sessions = auth.db.sessions.filter(s => s.userId !== userId);
    auth.db.history = auth.db.history.filter(h => h.userId !== userId);
    auth.db.contacts = auth.db.contacts.map(c => c.userId === userId ? { ...c, userId: null, email: 'deleted-user', name: 'deleted-user' } : c);
    writeDb(auth.db);
    return sendJson(res, 200, { ok: true, users: auth.db.users.map(u => ({ ...publicUser(u), email: u.email })) });
  }

  if (req.method === 'POST' && pathname.startsWith('/api/admin/contacts/')) {
    const body = await readJson(req);
    const auth = requireAdmin(req);
    const msgId = pathname.split('/').pop();
    const msg = auth.db.contacts.find(c => c.id === msgId);
    if (!msg) throw new HttpError(404, 'Message not found.', 'MESSAGE_NOT_FOUND');
    msg.status = body.status || 'closed';
    msg.updatedAt = nowISO();
    writeDb(auth.db);
    return sendJson(res, 200, { message: msg });
  }

  if (req.method === 'DELETE' && pathname.startsWith('/api/admin/contacts/')) {
    const auth = requireAdmin(req);
    const msgId = pathname.split('/').pop();
    const msg = auth.db.contacts.find(c => c.id === msgId);
    if (!msg) throw new HttpError(404, 'Message not found.', 'MESSAGE_NOT_FOUND');
    auth.db.contacts = auth.db.contacts.filter(c => c.id !== msgId);
    writeDb(auth.db);
    return sendJson(res, 200, { ok: true });
  }

  throw new HttpError(404, 'Not found.', 'NOT_FOUND');
}

async function handle(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith('/api/')) return await api(req, res, pathname, url);

    let requested = pathname === '/' ? '/index.html' : pathname;
    // Dedicated per-sign pages: /zodiac and /zodiac/:sign → sign.html
    if (requested === '/zodiac' || requested.startsWith('/zodiac/')) {
      const signId = requested === '/zodiac' ? '' : requested.slice('/zodiac/'.length).replace(/\/.+$/, '').toLowerCase();
      if (signId && !signMap[signId]) throw new HttpError(404, 'Not found.', 'NOT_FOUND');
      requested = '/sign.html';
    }
    const resolved = path.resolve(path.join(PUBLIC, requested));
    if (!resolved.startsWith(PUBLIC)) throw new HttpError(404, 'Not found.', 'NOT_FOUND');
    fs.readFile(resolved, (err, data) => {
      if (err) {
        fs.readFile(path.join(PUBLIC, 'index.html'), (fallbackErr, fallback) => {
          securityHeaders(res);
          if (fallbackErr) return sendJson(res, 404, { error: 'Not found' });
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end(fallback);
        });
        return;
      }
      securityHeaders(res);
      res.writeHead(200, { 'Content-Type': mime[path.extname(resolved).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  } catch (err) {
    if (!err.status || (err.status >= 500 && err.code !== 'AI_NOT_CONFIGURED')) console.error(err);
    sendJson(res, err.status || 500, { error: err.message || 'Server error', code: err.code || 'SERVER_ERROR' });
  }
}

const server = http.createServer(handle);
if (require.main === module) {
  server.listen(PORT, HOST, () => {
    const boundPort = server.address().port;
    console.log(`✨ Astritsa production-ready scaffold listening on http://${HOST}:${boundPort}`);
  });
}
module.exports = { server, handle };
