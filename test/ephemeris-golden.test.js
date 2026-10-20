'use strict';
// Golden-snapshot tests that lock the ephemeris wiring (ephemeris.js +
// astronomy-engine) to independently verified sky data for several
// historical dates. If an astronomy-engine upgrade changes positions,
// retrograde flags, or aspect orbs, these tests fail loudly — the goldens
// are the contract between the library and the AI engine's day context.
//
// Golden values were generated with astronomy-engine@2.1.19 and
// cross-validated against independent sources (citations per date below).
// Tolerances: planets ±0.5° longitude (the Moon ±1.5°), signs and
// retrograde flags exact, aspect orbs within golden + 0.5°.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ep = require('../ephemeris.js');

const GOLDEN = {
  // Independently validated in earlier QA: Sun Virgo ~12°, Mercury direct in
  // Virgo (stations RX Sep 14), Venus direct in Libra (stations RX Oct 3),
  // Mars in Cancer, Jupiter in Leo, Saturn/Neptune/Pluto retrograde, Uranus
  // still direct (stations RX Sep 10). Mars square Saturn was exact Sep 1 and
  // is still tight (orb 2.13°). Sources: astro-seek / cafeastrology station
  // tables.
  '2026-09-04': {
    sun: { sign: 'virgo', degree: 11.98 },
    moonPhase: { id: 'last-quarter', illumination: 48 },
    planets: {
      sun:     { lon: 161.981, sign: 'virgo',       retro: false },
      moon:    { lon:  74.266, sign: 'gemini',      retro: false },
      mercury: { lon: 169.171, sign: 'virgo',       retro: false },
      venus:   { lon: 205.881, sign: 'libra',       retro: false },
      mars:    { lon: 105.605, sign: 'cancer',      retro: false },
      jupiter: { lon: 134.430, sign: 'leo',         retro: false },
      saturn:  { lon:  13.474, sign: 'aries',       retro: true },
      uranus:  { lon:  65.680, sign: 'gemini',      retro: false },
      neptune: { lon:   3.583, sign: 'aries',       retro: true },
      pluto:   { lon: 303.450, sign: 'aquarius',    retro: true }
    },
    retrogrades: ['neptune', 'pluto', 'saturn'],
    aspects: [
      { a: 'neptune', b: 'pluto',   type: 'sextile', orb: 0.13 },
      { a: 'mars',    b: 'saturn',  type: 'square',  orb: 2.13 },
      { a: 'sun',     b: 'moon',    type: 'square',  orb: 2.29 }
    ]
  },

  // Summer solstice 2024: Sun 0.6° Cancer (entered Cancer Jun 20). Pluto
  // retrograde in Aquarius ("Pluto is now retrograde in Aquarius all month" —
  // Neil Spencer, June 2024). Saturn 19.4° Pisces still DIRECT (stations RX
  // Jun 29), Neptune 29.9° Pisces still DIRECT (stations RX Jul 2) — the
  // classic "pre-station direct" trap the golden checks. Sun square Neptune
  // ("June 20-21 Sun square Neptune 29° Gemini and Pisces" — Sacred Garden
  // Yoga). Jupiter in Gemini (entered May 25), Mercury direct in Cancer.
  '2024-06-21': {
    sun: { sign: 'cancer', degree: 0.60 },
    moonPhase: { id: 'waxing-gibbous', illumination: 100 },
    planets: {
      sun:     { lon:  90.602, sign: 'cancer',      retro: false },
      moon:    { lon: 263.744, sign: 'sagittarius', retro: false },
      mercury: { lon:  98.823, sign: 'cancer',      retro: false },
      venus:   { lon:  95.204, sign: 'cancer',      retro: false },
      mars:    { lon:  39.071, sign: 'taurus',      retro: false },
      jupiter: { lon:  66.122, sign: 'gemini',      retro: false },
      saturn:  { lon: 349.369, sign: 'pisces',      retro: false },
      uranus:  { lon:  55.267, sign: 'taurus',      retro: false },
      neptune: { lon: 359.903, sign: 'pisces',      retro: false },
      pluto:   { lon: 301.576, sign: 'aquarius',    retro: true }
    },
    retrogrades: ['pluto'],
    aspects: [
      { a: 'sun',    b: 'neptune', type: 'square',      orb: 0.70 },
      { a: 'mercury', b: 'venus',  type: 'conjunction', orb: 3.62 },
      { a: 'jupiter', b: 'pluto',  type: 'trine',       orb: 4.55 }
    ]
  },

  // The Great American Total Solar Eclipse: eclipse at 28°53' Leo (Sun 28.62°
  // Leo, Moon 25.07° Leo, conjunction orb 3.55°, phase angle 356.4° ≈ 0%
  // illumination). "Mercury Retrograde is at large" (Jessica Adams); Mercury
  // RX in Virgo (RX Aug 12 – Sep 5). Outer-planet RX season: Saturn in
  // Sagittarius, Uranus in Aries, Neptune in Pisces, Pluto in Capricorn.
  // Jupiter direct in Libra (~20°), Mars direct in Leo. Sources: Cafe
  // Astrology eclipse chart, astro-seek August 2017 calendar.
  '2017-08-21': {
    sun: { sign: 'leo', degree: 28.62 },
    moonPhase: { id: 'waning-crescent', illumination: 0 },
    planets: {
      sun:     { lon: 148.621, sign: 'leo',         retro: false },
      moon:    { lon: 145.069, sign: 'leo',         retro: false },
      mercury: { lon: 158.392, sign: 'virgo',       retro: true },
      venus:   { lon: 114.429, sign: 'cancer',      retro: false },
      mars:    { lon: 140.516, sign: 'leo',         retro: false },
      jupiter: { lon: 200.140, sign: 'libra',       retro: false },
      saturn:  { lon: 261.196, sign: 'sagittarius', retro: true },
      uranus:  { lon:  28.392, sign: 'aries',       retro: true },
      neptune: { lon: 343.255, sign: 'pisces',      retro: true },
      pluto:   { lon: 287.197, sign: 'capricorn',   retro: true }
    },
    retrogrades: ['mercury', 'neptune', 'pluto', 'saturn', 'uranus'],
    aspects: [
      { a: 'sun',  b: 'moon',   type: 'conjunction', orb: 3.55 },
      { a: 'sun',  b: 'uranus', type: 'trine',       orb: 0.23 },
      { a: 'mars', b: 'jupiter', type: 'sextile',    orb: 0.38 },
      { a: 'jupiter', b: 'pluto', type: 'square',    orb: 2.94 }
    ]
  },

  // Y2K: Sun 10.4° Capricorn. Mercury DIRECT at 1.9° Capricorn — it stationed
  // direct around Dec 31/Jan 1 after the Dec 1999 retrograde ("Sun conj.
  // Mercury Jan 16" only happens if Mercury is already direct and moving —
  // astro-seek Jan 2000 calendar). Saturn retrograde in Taurus 10.4°
  // ("Jan 12: Saturn Direct" — astro-seek). Jupiter DIRECT in Aries 25.25°:
  // it re-entered Taurus only on Feb 14, 2000 (liveabout/cafeastrology
  // Jupiter transit tables), so late Aries on Jan 1 is correct. Uranus and
  // Neptune direct in Aquarius, Pluto direct in Sagittarius.
  '2000-01-01': {
    sun: { sign: 'capricorn', degree: 10.37 },
    moonPhase: { id: 'last-quarter', illumination: 23 },
    planets: {
      sun:     { lon: 280.369, sign: 'capricorn',   retro: false },
      moon:    { lon: 223.324, sign: 'scorpio',     retro: false },
      mercury: { lon: 271.889, sign: 'capricorn',   retro: false },
      venus:   { lon: 241.565, sign: 'sagittarius', retro: false },
      mars:    { lon: 327.964, sign: 'aquarius',    retro: false },
      jupiter: { lon:  25.254, sign: 'aries',       retro: false },
      saturn:  { lon:  40.396, sign: 'taurus',      retro: true },
      uranus:  { lon: 314.806, sign: 'aquarius',    retro: false },
      neptune: { lon: 303.195, sign: 'aquarius',    retro: false },
      pluto:   { lon: 251.455, sign: 'sagittarius', retro: false }
    },
    retrogrades: ['saturn'],
    aspects: [
      { a: 'sun',  b: 'saturn', type: 'trine',      orb: 0.03 },
      { a: 'moon', b: 'uranus', type: 'square',     orb: 1.48 },
      { a: 'moon', b: 'saturn', type: 'opposition', orb: 2.93 }
    ]
  }
};

const TOL = { planet: 0.5, moon: 1.5 };

for (const [date, g] of Object.entries(GOLDEN)) {
  test(`golden sky for ${date}: positions, signs, retrogrades, moon phase`, async () => {
    const c = await ep.context(date);
    assert.equal(c.approx, false, `${date} must come from the real ephemeris, not the fallback`);

    for (const [id, gold] of Object.entries(g.planets)) {
      const p = c.planets.find(x => x.id === id);
      assert.ok(p, `${date}: planet ${id} present`);
      const tol = id === 'moon' ? TOL.moon : TOL.planet;
      assert.ok(Math.abs(p.longitude - gold.lon) <= tol,
        `${date}: ${id} longitude ${p.longitude} within ±${tol}° of golden ${gold.lon}`);
      assert.equal(p.sign.id, gold.sign, `${date}: ${id} sign`);
      assert.equal(p.retrograde, gold.retro, `${date}: ${id} retrograde flag`);
    }

    assert.equal(c.sunSign.id, g.sun.sign, `${date}: sun sign`);
    assert.ok(Math.abs(c.sunSign.degree - g.sun.degree) <= TOL.planet,
      `${date}: sun degree ${c.sunSign.degree} ~ golden ${g.sun.degree}`);

    assert.equal(c.moonPhase.id, g.moonPhase.id, `${date}: moon phase`);
    assert.ok(Math.abs(c.moonPhase.illumination - g.moonPhase.illumination) <= 2,
      `${date}: moon illumination ${c.moonPhase.illumination}% ~ golden ${g.moonPhase.illumination}%`);

    // The retrograde set must be exactly the golden set (no missing, no extra).
    assert.deepEqual(
      c.retrogrades.map(r => r.id).sort(),
      [...g.retrogrades].sort(),
      `${date}: retrograde set`
    );
  });

  test(`golden sky for ${date}: locked aspects hold with expected type and orb`, async () => {
    const c = await ep.context(date);
    for (const gold of g.aspects) {
      const found = c.aspects.find(a =>
        (a.a.id === gold.a && a.b.id === gold.b) || (a.a.id === gold.b && a.b.id === gold.a));
      assert.ok(found, `${date}: aspect ${gold.a}-${gold.b} present in the top aspects`);
      assert.equal(found.type.id, gold.type, `${date}: ${gold.a}-${gold.b} aspect type`);
      assert.ok(found.orbUsed <= gold.orb + 0.5,
        `${date}: ${gold.a}-${gold.b} orb ${found.orbUsed} within golden ${gold.orb} + 0.5`);
    }
  });
}

test('golden table itself is internally consistent (every sign derives from its longitude)', () => {
  for (const [date, g] of Object.entries(GOLDEN)) {
    for (const [id, gold] of Object.entries(g.planets)) {
      assert.equal(ep.signOf(gold.lon).id, gold.sign, `${date}: golden ${id} longitude maps to golden sign`);
    }
  }
});