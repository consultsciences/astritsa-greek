// Real ephemeris for the Astritsa AI engine, powered by the pure-JS
// "astronomy-engine" package (MIT). The package is ESM-only, so it is
// loaded lazily via dynamic import() the first time a context is requested;
// the server keeps booting instantly and still works (with the calendar
// approximation fallback in server.js) if the dependency is missing.
'use strict';

const SIGNS = require('./zodiac-signs.js'); // Aries-first: index 0 = Aries = 0° ecliptic longitude

// Apparent geocentric bodies of the solar system, in the order a reading
// cares about (luminaries first, then fast to slow personal/social planets).
const BODIES = [
  { id: 'sun', el: 'Ήλιος', en: 'Sun' },
  { id: 'moon', el: 'Σελήνη', en: 'Moon' },
  { id: 'mercury', el: 'Ερμής', en: 'Mercury' },
  { id: 'venus', el: 'Αφροδίτη', en: 'Venus' },
  { id: 'mars', el: 'Άρης', en: 'Mars' },
  { id: 'jupiter', el: 'Δίας', en: 'Jupiter' },
  { id: 'saturn', el: 'Κρόνος', en: 'Saturn' },
  { id: 'uranus', el: 'Ουρανός', en: 'Uranus' },
  { id: 'neptune', el: 'Ποσειδώνας', en: 'Neptune' },
  { id: 'pluto', el: 'Πλούτωνας', en: 'Pluto' }
];

const ASPECTS = [
  { angle: 0, id: 'conjunction', el: 'σύνοδος', en: 'conjunction', kind: 'neutral' },
  { angle: 60, id: 'sextile', el: 'εξάγωνο', en: 'sextile', kind: 'soft' },
  { angle: 90, id: 'square', el: 'τετράγωνο', en: 'square', kind: 'hard' },
  { angle: 120, id: 'trine', el: 'τρίγωνο', en: 'trine', kind: 'soft' },
  { angle: 180, id: 'opposition', el: 'αντίθεση', en: 'opposition', kind: 'hard' }
];

const MOON_PHASES = [
  { id: 'new', el: 'Νέα Σελήνη', en: 'New Moon' },
  { id: 'waxing-crescent', el: 'Αύξουσα Ημισέληνος', en: 'Waxing Crescent' },
  { id: 'first-quarter', el: 'Πρώτο Τέταρτο', en: 'First Quarter' },
  { id: 'waxing-gibbous', el: 'Αύξουσα Αμφίκυρτος', en: 'Waxing Gibbous' },
  { id: 'full', el: 'Πανσέληνος', en: 'Full Moon' },
  { id: 'waning-gibbous', el: 'Φθίνουσα Αμφίκυρτος', en: 'Waning Gibbous' },
  { id: 'last-quarter', el: 'Τελευταίο Τέταρτο', en: 'Last Quarter' },
  { id: 'waning-crescent', el: 'Φθίνουσα Ημισέληνος', en: 'Waning Crescent' }
];

const DAY_MS = 86400000;
let libPromise = null;
function lib() {
  if (!libPromise) {
    libPromise = import('astronomy-engine').catch(err => { libPromise = null; throw err; });
  }
  return libPromise;
}
let cachedVersion = null;
function version() {
  if (cachedVersion === null) {
    try { cachedVersion = require('astronomy-engine/package.json').version; } catch { cachedVersion = '?'; }
  }
  return cachedVersion;
}

function normalize180(deg) {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

// Zodiac info + degree-within-sign for an ecliptic longitude of date.
function signOf(longitude) {
  const idx = ((Math.floor(longitude / 30) % 12) + 12) % 12;
  const s = SIGNS[idx];
  return {
    id: s.id, el: s.el, en: s.en, emoji: s.emoji,
    element: s.element,
    degree: +Number(longitude % 30).toFixed(2)
  };
}

// Apparent geocentric ecliptic longitude of date, in degrees [0, 360).
async function longitudeOfDate(bodyId, time) {
  const A = await lib();
  if (bodyId === 'sun') return A.SunPosition(time).elon;
  if (bodyId === 'moon') return A.EclipticGeoMoon(time).lon;
  return A.Ecliptic(A.GeoVector(A.Body[bodyId[0].toUpperCase() + bodyId.slice(1)], time, true)).elon;
}

// Apparent daily motion (deg/day). Negative => retrograde.
async function apparentDailyMotion(bodyId, timeMs) {
  const A = await lib();
  const now = A.MakeTime(new Date(timeMs));
  const next = A.MakeTime(new Date(timeMs + DAY_MS));
  const lonNow = (await longitudeOfDate(bodyId, now)) % 360;
  const lonNext = (await longitudeOfDate(bodyId, next)) % 360;
  return normalize180(lonNext - lonNow);
}

/**
 * Real ephemeris snapshot for one Athens calendar day.
 * Positions are apparent, geocentric, ecliptic longitudes of date, computed
 * at 12:00 UTC on that date (always inside the Athens day, so the context is
 * stable for the whole day).
 * @param {string} dateISO 'YYYY-MM-DD' Athens date (as todayISO() returns).
 * @returns {Promise<object>} astrologyContext for the AI prompt.
 */
async function context(dateISO) {
  const A = await lib();
  const [y, m, d] = String(dateISO).split('-').map(Number);
  const snapshotMs = Date.UTC(y, m - 1, d, 12, 0, 0);
  const time = A.MakeTime(new Date(snapshotMs));

  // --- planets (Sun..Pluto): longitude, sign, retrograde status ---
  const planets = [];
  const lonById = {};
  for (const b of BODIES) {
    const longitude = +((await longitudeOfDate(b.id, time)) % 360).toFixed(3);
    lonById[b.id] = longitude;
    let retrograde = false;
    if (b.id !== 'sun' && b.id !== 'moon') {
      retrograde = (await apparentDailyMotion(b.id, snapshotMs)) < 0;
    }
    planets.push({ ...b, longitude, sign: signOf(longitude), retrograde });
  }

  // --- moon phase from the true phase angle (0 = new, 180 = full) ---
  const phaseAngle = +Number(A.MoonPhase(time) % 360).toFixed(2);
  const phase = MOON_PHASES[Math.floor((phaseAngle + 360) % 360 / 45) % 8];
  const illumination = Math.round((1 - Math.cos(phaseAngle * Math.PI / 180)) / 2 * 100);

  // --- aspects among all bodies (orb 6°, 8° when a luminary meets a
  //     conjunction or opposition) ---
  const ASPECT_ANGLES = ASPECTS.map(a => a.angle);
  const aspects = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const a = planets[i], b = planets[j];
      const separation = Math.abs(normalize180(a.longitude - b.longitude));
      const isLuminary = a.id === 'sun' || a.id === 'moon' || b.id === 'sun' || b.id === 'moon';
      for (let k = 0; k < ASPECTS.length; k++) {
        const orb = (isLuminary && (ASPECTS[k].angle === 0 || ASPECTS[k].angle === 180)) ? 8 : 6;
        const delta = Math.abs(separation - ASPECTS[k].angle);
        if (delta <= orb) {
          aspects.push({
            a: { id: a.id, el: a.el, en: a.en },
            b: { id: b.id, el: b.el, en: b.en },
            type: ASPECTS[k],
            angle: separation,
            kind: ASPECTS[k].kind,
            orbUsed: +Number(delta).toFixed(2),
            separation: +Number(separation).toFixed(2)
          });
          break; // nearest aspect angle only
        }
      }
    }
  }
  aspects.sort((x, y) => x.orbUsed - y.orbUsed);
  const topAspects = aspects.slice(0, 8);

  const sunSign = signOf(lonById.sun);
  const moonSign = signOf(lonById.moon);
  return {
    approx: false,
    source: 'astronomy-engine' + (version() === '?' ? '' : '@' + version()),
    date: dateISO,
    timestamp: new Date(snapshotMs).toISOString(),
    note: 'True ephemeris snapshot at 12:00 UTC of the Athens date. Positions are apparent geocentric ecliptic longitudes of date; aspects use orbs of 6° (8° for luminary conjunctions/oppositions); retrograde means negative apparent daily motion. Use the listed planets/aspects/retrogrades as the factual sky for the day and never invent others.',
    sunSign,
    moonPhase: {
      id: phase.id, el: phase.el, en: phase.en,
      phaseAngle, illumination,
      longitude: lonById.moon, sign: moonSign
    },
    planets,
    aspects: topAspects,
    retrogrades: planets.filter(p => p.retrograde).map(p => ({ id: p.id, el: p.el, en: p.en }))
  };
}

module.exports = { context, signOf, BODIES };
