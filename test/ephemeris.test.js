'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ep = require('../ephemeris.js');

const SIGN_IDS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

test('signOf maps every 30-degree longitude to the correct sign', () => {
  const expectations = [
    [0, 'aries'], [29.9, 'aries'], [30, 'taurus'], [60, 'gemini'], [90, 'cancer'],
    [120, 'leo'], [150, 'virgo'], [180, 'libra'], [210, 'scorpio'], [240, 'sagittarius'],
    [270, 'capricorn'], [300, 'aquarius'], [330, 'pisces'], [359.9, 'pisces'], [360, 'aries']
  ];
  for (const [lon, id] of expectations) {
    const s = ep.signOf(lon);
    assert.equal(s.id, id, `longitude ${lon} should be ${id}`);
    assert.ok(s.degree >= 0 && s.degree < 30, `degree ${s.degree} in range for ${id}`);
    assert.ok(s.el && s.en && s.emoji, `labels present for ${id}`);
  }
});

test('every sign id in context planets belongs to the 12-sign set', async () => {
  const c = await ep.context('2026-09-04');
  assert.equal(c.approx, false, 'context must come from the real ephemeris');
  assert.ok(c.source.includes('astronomy-engine'), `source reported: ${c.source}`);
  assert.ok(c.planets.length >= 8, 'planets list covers the solar system bodies');
  for (const p of c.planets) {
    assert.ok(SIGN_IDS.includes(p.sign.id), `${p.id} sign ${p.sign.id} is valid`);
    assert.ok(p.longitude >= 0 && p.longitude < 360, `${p.id} longitude in range`);
    assert.ok(p.sign.degree >= 0 && p.sign.degree < 30, `${p.id} degree in range`);
  }
});

test('September 2026 sky matches independently published data', async () => {
  const c = await ep.context('2026-09-04');
  const byId = Object.fromEntries(c.planets.map(p => [p.id, p]));

  // Sun in Virgo, Moon never retrograde, Moon phase is a real value.
  assert.equal(c.sunSign.id, 'virgo');
  assert.ok(c.sunSign.degree >= 8 && c.sunSign.degree <= 14, `Sun degree ${c.sunSign.degree} ~ Virgo 12`);
  assert.equal(byId.sun.retrograde, false);
  assert.equal(byId.moon.retrograde, false);
  assert.ok(c.moonPhase.phaseAngle >= 0 && c.moonPhase.phaseAngle < 360);
  assert.ok(c.moonPhase.illumination >= 0 && c.moonPhase.illumination <= 100);
  assert.equal(c.moonPhase.sign.id, byId.moon.sign.id, 'moon sign consistent');

  // Outer-planet retrogrades active in early September 2026 (astro-seek/cafeastrology).
  assert.equal(byId.saturn.retrograde, true, 'Saturn retrograde');
  assert.equal(byId.neptune.retrograde, true, 'Neptune retrograde');
  assert.equal(byId.pluto.retrograde, true, 'Pluto retrograde');

  // Mercury was direct in Virgo in early September 2026; Venus direct in Libra
  // (it stations retrograde on Oct 3, 2026); Mars in Cancer.
  assert.equal(byId.mercury.retrograde, false, 'Mercury direct');
  assert.equal(byId.mercury.sign.id, 'virgo');
  assert.equal(byId.venus.retrograde, false, 'Venus direct');
  assert.equal(byId.venus.sign.id, 'libra');
  assert.equal(byId.mars.sign.id, 'cancer');
  assert.equal(byId.jupiter.sign.id, 'leo');
});

test('context reports the Mars-Saturn square that was exact on Sep 1, 2026', async () => {
  const c = await ep.context('2026-09-04');
  const ms = c.aspects.find(a => a.a.id === 'mars' && a.b.id === 'saturn');
  assert.ok(ms, 'expected a Mars aspect to Saturn');
  assert.equal(ms.type.id, 'square');
  assert.equal(ms.kind, 'hard');
  assert.ok(ms.orbUsed <= 3, `Mars-Saturn square still tight (orb ${ms.orbUsed})`);
});

test('aspect kinds follow soft/hard conventions', async () => {
  const c = await ep.context('2026-09-04');
  for (const a of c.aspects) {
    if (a.type.id === 'square' || a.type.id === 'opposition') assert.equal(a.kind, 'hard');
    if (a.type.id === 'trine' || a.type.id === 'sextile') assert.equal(a.kind, 'soft');
    if (a.type.id === 'conjunction') assert.equal(a.kind, 'neutral');
    assert.ok(a.a.id && a.b.id && a.a.id !== a.b.id, 'distinct bodies');
    assert.ok(a.orbUsed >= 0 && a.orbUsed <= 8, `orb ${a.orbUsed} within limit`);
  }
});

test('sun sign drifts correctly across the year', async () => {
  const checks = [['2026-01-10', 'capricorn'], ['2026-04-10', 'aries'], ['2026-07-10', 'cancer'], ['2026-10-10', 'libra'], ['2026-12-10', 'sagittarius']];
  for (const [date, id] of checks) {
    const c = await ep.context(date);
    assert.equal(c.sunSign.id, id, `Sun sign on ${date}`);
  }
});
