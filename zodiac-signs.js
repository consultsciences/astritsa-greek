// Aries-first zodiac table (index 0 = Aries = 0° ecliptic longitude).
// Shared by the birth-date zodiac derivation (server.js) and the real
// ephemeris layer (ephemeris.js), so sign ids/labels never diverge.
module.exports = [
  { id: 'aries', el: 'Κριός', en: 'Aries', emoji: '♈', start: [3, 21], end: [4, 19], element: { el: 'Φωτιά', en: 'Fire' } },
  { id: 'taurus', el: 'Ταύρος', en: 'Taurus', emoji: '♉', start: [4, 20], end: [5, 20], element: { el: 'Γη', en: 'Earth' } },
  { id: 'gemini', el: 'Δίδυμοι', en: 'Gemini', emoji: '♊', start: [5, 21], end: [6, 20], element: { el: 'Αέρας', en: 'Air' } },
  { id: 'cancer', el: 'Καρκίνος', en: 'Cancer', emoji: '♋', start: [6, 21], end: [7, 22], element: { el: 'Νερό', en: 'Water' } },
  { id: 'leo', el: 'Λέων', en: 'Leo', emoji: '♌', start: [7, 23], end: [8, 22], element: { el: 'Φωτιά', en: 'Fire' } },
  { id: 'virgo', el: 'Παρθένος', en: 'Virgo', emoji: '♍', start: [8, 23], end: [9, 22], element: { el: 'Γη', en: 'Earth' } },
  { id: 'libra', el: 'Ζυγός', en: 'Libra', emoji: '♎', start: [9, 23], end: [10, 22], element: { el: 'Αέρας', en: 'Air' } },
  { id: 'scorpio', el: 'Σκορπιός', en: 'Scorpio', emoji: '♏', start: [10, 23], end: [11, 21], element: { el: 'Νερό', en: 'Water' } },
  { id: 'sagittarius', el: 'Τοξότης', en: 'Sagittarius', emoji: '♐', start: [11, 22], end: [12, 21], element: { el: 'Φωτιά', en: 'Fire' } },
  { id: 'capricorn', el: 'Αιγόκερως', en: 'Capricorn', emoji: '♑', start: [12, 22], end: [1, 19], element: { el: 'Γη', en: 'Earth' } },
  { id: 'aquarius', el: 'Υδροχόος', en: 'Aquarius', emoji: '♒', start: [1, 20], end: [2, 18], element: { el: 'Αέρας', en: 'Air' } },
  { id: 'pisces', el: 'Ιχθύες', en: 'Pisces', emoji: '♓', start: [2, 19], end: [3, 20], element: { el: 'Νερό', en: 'Water' } }
];
