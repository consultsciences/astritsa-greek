#!/usr/bin/env node
/**
 * Astritsa local dev AI provider (dev-only, no dependencies).
 *
 * Speaks the OpenAI-compatible Chat Completions protocol that Astritsa expects
 * (see README: AI_BASE_URL is "optional OpenAI-compatible base URL"), so the
 * app can run with real, verifiable readings offline:
 *
 *   AI_API_KEY=local-dev-key
 *   AI_MODEL=astritsa-mock-local
 *   AI_BASE_URL=http://127.0.0.1:4010/v1
 *
 * It also serves a tiny local RSS astrology feed so the real-time source
 * aggregation + source-consensus layer can be exercised:
 *
 *   ASTRO_SOURCE_URLS='[{"name":"Astritsa Local Test Feed","url":"http://127.0.0.1:4010/feed.rss","language":"any"}]'
 *
 * It inspects the real prompt the server builds (feature, language, user
 * profile, cup/question, live sources) and returns a plausible reading JSON in
 * the requested language, echoing the live source list and excerpt themes so
 * end-to-end data flow is visible. Not for production use.
 */
const http = require('http');

const PORT = Number(process.env.MOCK_PORT || 4010);
const HOST = '127.0.0.1';

const SIGN_NAMES = {
  aries: { el: 'Κριός', en: 'Aries' }, taurus: { el: 'Ταύρος', en: 'Taurus' },
  gemini: { el: 'Δίδυμοι', en: 'Gemini' }, cancer: { el: 'Καρκίνος', en: 'Cancer' },
  leo: { el: 'Λέων', en: 'Leo' }, virgo: { el: 'Παρθένος', en: 'Virgo' },
  libra: { el: 'Ζυγός', en: 'Libra' }, scorpio: { el: 'Σκορπιός', en: 'Scorpio' },
  sagittarius: { el: 'Τοξότης', en: 'Sagittarius' }, capricorn: { el: 'Αιγόκερως', en: 'Capricorn' },
  aquarius: { el: 'Υδροχόος', en: 'Aquarius' }, pisces: { el: 'Ιχθείς', en: 'Pisces' }
};
const CUP_NAMES = {
  classic: { el: 'κλασικό', en: 'classic' }, aegean: { el: 'αιγαίο', en: 'aegean' },
  rose: { el: 'ροζ', en: 'rose' }, olive: { el: 'λαδί', en: 'olive' },
  noir: { el: 'μαύρο', en: 'noir' }, sunset: { el: 'ηλιοβασίλεμα', en: 'sunset' }
};

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Astritsa Local Test Feed</title>
    <link>http://${HOST}:${PORT}/feed.rss</link>
    <description>Dev-only astrology feed used to exercise Astritsa source aggregation.</description>
    <item>
      <title>Taurus (Ταύρος) weekly outlook</title>
      <description>Venus steadies Taurus (Ταύρος) with patient progress; finances and home projects move forward. Avoid rushing decisions.</description>
    </item>
    <item>
      <title>Leo (Λέων) creative momentum</title>
      <description>Leo (Λέων) enjoys a burst of creative energy; visibility increases and collaboration brings recognition this week.</description>
    </item>
    <item>
      <title>Sun enters Virgo</title>
      <description>As the Sun moves into Virgo, a practical, detail-oriented mood settles in — a good window for organizing and refining routines.</description>
    </item>
  </channel>
</rss>`;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function signName(id, lang) {
  return (SIGN_NAMES[String(id || '').toLowerCase()] || { el: id, en: id })[lang] || id;
}

function buildReading(prompt) {
  const el = prompt.language !== 'English';
  const L = el ? 'el' : 'en';
  const feature = prompt.feature || 'daily';
  const profile = prompt.userProfile || {};
  const request = prompt.userRequest || {};
  const signId = profile.zodiac?.id || signIdFromRequest(request) || 'taurus';
  const sign = signName(signId, L);
  const name = profile.name || '';
  const sources = Array.isArray(prompt.liveSources) ? prompt.liveSources : [];
  const sourceCount = sources.length;

  const disclaimer = el
    ? 'Οι AI προβλέψεις, η αστρολογία, η καφεμαντεία, η αριθμολογία και οι κάρτες oracle παρέχονται αποκλειστικά ως ψυχαγωγικό περιεχόμενο και δεν αποτελούν ιατρική, ψυχολογική, νομική, οικονομική ή άλλη επαγγελματική συμβουλή.'
    : 'AI predictions, astrology, coffee reading, numerology and oracle cards are provided exclusively as entertainment content and do not constitute medical, psychological, legal, financial or other professional advice.';
  const sourcesUsed = sources.map(s => ({ name: s.name, url: s.url }));
  // Deliberately clean sentences: never echo raw source text or the
  // SOURCE n:/URL:/FETCHED:/EXCERPT: header lines into the reading.
  const consensus = {
    commonThemes: sourceCount
      ? [
          el ? 'Οι αναγνώσεις συμφωνούν σε ήρεμη, σταθερή πρόοδο.' : 'The readings agree on calm, steady progress.',
          el ? 'Έμφαση στην πρακτική οργάνωση και τις σχέσεις.' : 'Emphasis on practical organization and relationships.'
        ]
      : [],
    agreementLevel: sourceCount ? 'high' : 'unavailable',
    note: sourceCount
      ? (el ? `Οι αναγνώσεις συμφωνούν σε κοινά μοτίβα.` : `The readings agree on common themes.`)
      : (el ? 'Δεν υπάρχουν συγκλίνουσες αναγνώσεις.' : 'No converging readings.')
  };

  const base = {
    sourceConsensus: consensus,
    action: el ? 'Κράτα σημειώσεις για τα μοτίβα που επαναλαμβάνονται και ενήργησε με ψυχραιμία.' : 'Keep notes on repeating patterns and act with calm intention.',
    sourcesUsed,
    disclaimer
  };

  if (feature === 'coffee') {
    const cup = CUP_NAMES[request.cupId]?.[L] || request.cupId || (el ? 'κλασικό' : 'classic');
    const q = String(request.question || '').trim();
    const specific = request.mode === 'specific' && q;
    return {
      ...base,
      title: el ? `Ανάγνωση από το ${cup} φλιτζάνι` : `Reading from the ${cup} cup`,
      summary: specific
        ? (el ? `Ρωτάς: «${q}». Τα κατακάθια δείχνουν καθαρό δρόμο μετά από μια μικρή παύση — η απάντηση έρχεται με σταδιακά βήματα, όχι απότομα.`
              : `Your question: "${q}". The grounds show a clear path after a brief pause — the answer unfolds in gradual steps, not all at once.`)
        : (el ? `Γενική ανάγνωση του ${cup} φλιτζανιού: ισορροπία και ήπια ανανέωση. Ο καφές αφήνει σχήμα καρδιάς και μονοπατιού — συναισθηματική ζεστασιά και σταδιακή πρόοδος.`
              : `General ${cup} cup reading: balance and gentle renewal. The coffee leaves a heart-and-path shape — emotional warmth and gradual progress.`),
      sections: [
        { heading: el ? 'Το σχήμα' : 'The shape', text: el ? 'Καρδιά κοντά στο χείλος και λεπτή γραμμή προς τα κάτω: συναίσθημα που γίνεται πράξη.' : 'A heart near the rim with a thin line descending: feeling turning into action.' },
        { heading: el ? 'Η συμβουλή' : 'The advice', text: el ? 'Πιες αργά, αποφάσισε νωρίς το πρωί και μην αλλάξεις γνώμη το βράδυ.' : 'Sip slowly, decide in the early morning, and do not change your mind at night.' }
      ],
      symbols: [
        { label: el ? 'Καρδιά' : 'Heart', meaning: el ? 'Συναισθηματική σύνδεση.' : 'Emotional connection.' },
        { label: el ? 'Μονοπάτι' : 'Path', meaning: el ? 'Ήπια πρόοδος.' : 'Gentle progress.' }
      ],
      lucky: { number: '7', time: el ? 'πρωί' : 'morning', color: el ? 'γαλάζιο' : 'sky blue', place: el ? 'μπαλκόνι' : 'balcony', herb: 'μέντα' }
    };
  }

  if (feature === 'numerology') {
    const lp = profile.lifePath || '3';
    const digits = String(lp).replace(/\D/g, '');
    return {
      ...base,
      title: el ? `Αριθμολογία — Μονοπάτι Ζωής ${digits}` : `Numerology — Life Path ${digits}`,
      summary: el
        ? `Για τον/την ${name || 'χρήστη'}, το Μονοπάτι Ζωής ${digits} φέρνει δημιουργική έκφραση, επικοινωνία και αισιοδοξία, με έμφαση στη σύνδεση με τους άλλους.`
        : `For ${name || 'you'}, Life Path ${digits} brings creative expression, communication and optimism, with an emphasis on connecting with others.`,
      sections: [
        { heading: el ? 'Μονοπάτι Ζωής' : 'Life Path', text: el ? `Το ${digits} υποδεικνύει έμπνευση που ανθίζει όταν μοιράζεσαι ιδέες και συνεργάζεσαι.` : `${digits} points to inspiration that blooms when you share ideas and collaborate.` },
        { heading: el ? 'Προσωπικός αριθμός' : 'Personal number', text: el ? 'Η φετινή ενέργεια ευνοεί νέα ξεκινήματα σε τέχνες ή επικοινωνία.' : 'This year’s energy favors new beginnings in arts or communication.' }
      ],
      symbols: [
        { label: el ? 'Αριθμός' : 'Number', meaning: digits },
        { label: el ? 'Στοιχείο' : 'Element', meaning: el ? 'Φωτιά έκφρασης' : 'Fire of expression' }
      ],
      lucky: { number: digits, time: el ? 'μεσημέρι' : 'noon', color: el ? 'χρυσό' : 'gold', place: el ? 'θέατρο/στούντιο' : 'theater/studio', herb: 'δάφνη' }
    };
  }

  if (feature === 'compatibility') {
    const a = signName(request.signA, L), b = signName(request.signB, L);
    return {
      ...base,
      title: el ? `Συναστρία: ${a} × ${b}` : `Synastry: ${a} × ${b}`,
      summary: el
        ? `${a} και ${b} συνδυάζουν σταθερότητα με έμπνευση: καλή χημεία στην επικοινωνία, με ανάγκη για υπομονή στα πρακτικά.`
        : `${a} and ${b} blend steadiness with inspiration: strong chemistry in communication, with patience needed on practical matters.`,
      sections: [
        { heading: el ? 'Δυνατά σημεία' : 'Strengths', text: el ? 'Αλληλοσυμπληρώνονται: ο ένας φέρνει ρυθμό, ο άλλος βάθος.' : 'They complement each other: one brings rhythm, the other depth.' },
        { heading: el ? 'Πρόκληση' : 'Challenge', text: el ? 'Διαφορετικός ρυθμός στις αποφάσεις — ορίστε κοινό βηματισμό.' : 'Different decision pace — agree on a shared tempo.' }
      ],
      symbols: [
        { label: a, meaning: el ? 'Σταθερή βάση' : 'Steady base' },
        { label: b, meaning: el ? 'Δημιουργική ώθηση' : 'Creative spark' }
      ],
      action: el ? 'Προγραμματίστε μία ήσυχη κοινή βραδιά και συζητήστε τους στόχους του μήνα.' : 'Plan one quiet evening together and talk through the month’s goals.'
    };
  }

  if (feature === 'tarot') {
    const intent = String(request.intent || '').trim();
    const cards = [
      { position: el ? 'Παρελθόν' : 'Past', title: el ? 'Ο Λυχνοφόρος' : 'The Lantern Bearer', meaning: el ? 'Μια απόφαση που πάρθηκε παλιά σε οδηγεί εδώ.' : 'A decision made long ago leads you here.' },
      { position: el ? 'Παρόν' : 'Present', title: el ? 'Ο Κόμβος της Αριάδνης' : 'Ariadne’s Knot', meaning: el ? 'Νήμα καθοδήγησης — ακολούθησε το ένστικτο.' : 'A guiding thread — follow your instinct.' },
      { position: el ? 'Μέλλον' : 'Future', title: el ? 'Το Άστρο της Αυγής' : 'The Dawn Star', meaning: el ? 'Φωτεινό αποτέλεσμα αν παραμείνεις σταθερός.' : 'A bright outcome if you stay steady.' }
    ];
    return {
      ...base,
      title: el ? 'Ελληνικό Μαντείο — Τρεις Κάρτες' : 'Greek Oracle — Three Cards',
      summary: intent
        ? (el ? `Για το ερώτημα «${intent}»: το μαντείο βλέπει καθαρή πορεία μετά από ένα μικρό σταυροδρόμι.` : `On "${intent}": the oracle sees a clear course after a small crossroads.`)
        : (el ? 'Το μαντείο απλώνει τρεις κάρτες: παρελθόν, παρόν και μέλλον.' : 'The oracle lays three cards: past, present and future.'),
      sections: [{ heading: el ? 'Το άπλωμα' : 'The spread', text: el ? 'Παρελθόν-Παρόν-Μέλλον, με το Άστρο της Αυγής να κλείνει ευνοϊκά.' : 'Past-Present-Future, closing favorably with the Dawn Star.' }],
      cards
    };
  }

  if (feature === 'trend' && prompt.topicQuery) {
    const q = String(prompt.topicQuery);
    const astroCtx = prompt.astrologyContext || {};
    const retro = (astroCtx.retrogrades || []).filter(r => r.id !== 'sun' && r.id !== 'moon').map(r => r[L]);
    const retroTxt = retro.length ? (el ? ` Σε ανάδρομη κίνηση τώρα: ${retro.join(', ')}.` : ` Currently retrograde: ${retro.join(', ')}.`) : '';
    const moon = astroCtx.moonPhase;
    const moonTxt = moon ? (el ? ` Η Σελήνη σήμερα: ${moon.el} (${moon.illumination}%).` : ` Today's Moon: ${moon.en} (${moon.illumination}%).`) : '';
    return {
      ...base,
      title: el ? `Θέμα — ${q.slice(0, 48)}${q.length > 48 ? '…' : ''}` : `Topic — ${q.slice(0, 48)}${q.length > 48 ? '…' : ''}`,
      summary: el
        ? `Αναλύουμε το θέμα «${q}» με αφετηρία το σήμερα: σταθερή πρόοδος, καθαρή επικοινωνία και υπομονή στις μεταβάσεις.${retroTxt}${moonTxt}`
        : `Analyzing "${q}" starting from today's sky: steady progress, clear communication and patience through transitions.${retroTxt}${moonTxt}`,
      sections: [
        { heading: el ? 'Τι σημαίνει το θέμα' : 'What the topic means', text: el ? 'Το θέμα ερμηνεύεται με τον μέθοδο του ηλιακού ζωδίου: γενική τάση για το ζώδιό σου, χωρίς ακριβείς ισχυρισμούς για προσωπικό ωροσκόπο.' : 'The topic is read with the sun-sign method: a general tendency for your sign, without claiming an exact personal ascendant.' },
        { heading: el ? 'Τι να κάνεις' : 'What to do', text: el ? 'Επέλεξε ένα πρακτικό βήμα που σχετίζεται με το θέμα και ολοκλήρωσέ το μέσα στην εβδομάδα.' : 'Pick one practical step related to the topic and complete it within the week.' }
      ],
      lucky: { number: '3', time: el ? 'απόγευμα' : 'afternoon', color: el ? 'σμαραγδί' : 'emerald', place: el ? 'κοντά σε νερό' : 'near water', herb: 'λεβάντα' }
    };
  }

  // daily and surprise share a rich reading shape
  const isSurprise = feature === 'surprise';
  const astroCtx = prompt.astrologyContext || {};
  const moonCtx = astroCtx.moonPhase;
  const MOON_TONE = {
    new: { el: 'ιδανική για νέα ξεκινήματα και προθέσεις', en: 'ideal for fresh starts and intentions' },
    'waxing-crescent': { el: 'ώρα να χτίσεις πάνω στις ιδέες σου', en: 'time to build on your ideas' },
    'first-quarter': { el: 'δράση παρά τις αντιστάσεις', en: 'take action despite resistance' },
    'waxing-gibbous': { el: 'τελειοποίησε και ρύθμισε τις λεπτομέρειες', en: 'refine and fine-tune the details' },
    full: { el: 'κορύφωση, διαύγεια και απελευθέρωση', en: 'culmination, clarity and release' },
    'waning-gibbous': { el: 'μοίρασε ό,τι έμαθες και ευχαρίστησε', en: 'share what you learned and give thanks' },
    'last-quarter': { el: 'άφησε πίσω ό,τι δεν σε εξυπηρετεί', en: 'let go of what no longer serves you' },
    'waning-crescent': { el: 'ξεκούραση και εσωτερική προετοιμασία', en: 'rest and inner preparation' }
  }[moonCtx?.id] || null;
  const moonSection = (moonCtx && MOON_TONE)
    ? [{ heading: el ? 'Φάση Σελήνης' : 'Moon phase', text: el ? `Σήμερα η Σελήνη είναι ${moonCtx.el} (${moonCtx.illumination}% φωτισμός) — ${MOON_TONE.el}.` : `Today the Moon is ${moonCtx.en} (${moonCtx.illumination}% illuminated) — ${MOON_TONE.en}.` }]
    : [];
  const aspectSection = (() => {
    const list = (astroCtx.aspects || []).slice(0, 3);
    if (!list.length) return [];
    const kindTxt = el ? { hard: 'πρόκληση', soft: 'ευνοϊκή', neutral: 'σύνδεση' } : { hard: 'challenging', soft: 'supportive', neutral: 'merging' };
    const items = list.map(ap => `${ap.a[L]} ${ap.type[L]} ${ap.b[L]} (${kindTxt[ap.kind] || ap.kind})`);
    const retro = (astroCtx.retrogrades || []).filter(r => r.id !== 'sun' && r.id !== 'moon').map(r => r[L]);
    const retroTxt = retro.length ? (el ? ` Σε ανάδρομη κίνηση: ${retro.join(', ')}.` : ` Retrograde: ${retro.join(', ')}.`) : '';
    return [{ heading: el ? 'Σημερινές όψεις' : 'Today\u2019s aspects', text: (el ? 'Οι κύριες όψεις της ημέρας: ' : 'The day\u2019s main aspects: ') + items.join(' · ') + '.' + retroTxt }];
  })();
  return {
    ...base,
    title: isSurprise
      ? (el ? 'Σεληνιακή Έκπληξη & Μάντρα' : 'Lunar Surprise & Mantra')
      : (el ? `Ημερήσια Πρόβλεψη — ${sign}` : `Daily Reading — ${sign}`),
    summary: isSurprise
      ? (el ? 'Το φεγγάρι σε καλεί να αφήσεις ένα βάρος και να υιοθετήσεις το μάντρα της ημέρας.' : 'The moon invites you to set down one burden and adopt today’s mantra.')
      : (el
          ? `${name ? name + ', ' : ''}ο ${sign} σήμερα κινείται με σταθερή ενέργεια: προτεραιότητα σε ό,τι οικοδομεί μακροπρόθεσμη αξία και ήπια ανανέωση στις σχέσεις.`
          : `${name ? name + ', ' : ''}${sign} moves with steady energy today: prioritize what builds long-term value and refresh relationships gently.`),
    sections: isSurprise
      ? [{ heading: el ? 'Μάντρα' : 'Mantra', text: el ? '«Αφήνω το παλιό, υποδέχομαι το φως.»' : '“I release the old, I welcome the light.”' }, ...moonSection, ...aspectSection]
      : [
          { heading: el ? 'Εστίαση' : 'Focus', text: el ? 'Η εβδομάδα ευνοεί την ολοκλήρωση εκκρεμοτήτων και μια ειλικρινή συζήτηση.' : 'The week favors finishing pending items and one honest conversation.' },
          { heading: el ? 'Σχέσεις' : 'Relationships', text: el ? 'Μικρές χειρονομίες προσοχής ενισχύουν τη σύνδεση.' : 'Small gestures of care strengthen the connection.' },
          ...moonSection,
          ...aspectSection
        ],
    symbols: [
      { label: el ? 'Ταύρος/Γη' : 'Earth', meaning: el ? 'Σταθερότητα και υπομονή.' : 'Steadiness and patience.' },
      { label: isSurprise ? (el ? 'Φεγγάρι' : 'Moon') : (el ? 'Αφροδίτη' : 'Venus'), meaning: el ? 'Ήπια τύχη στις σχέσεις.' : 'Gentle luck in relationships.' }
    ],
    lucky: { number: '3', time: el ? 'απόγευμα' : 'afternoon', color: el ? 'σμαραγδί' : 'emerald', place: el ? 'κοντά σε νερό' : 'near water', herb: 'λεβάντα' }
  };
}

function signIdFromRequest(request) {
  const v = request.signA || request.signB;
  if (v && SIGN_NAMES[String(v).toLowerCase()]) return String(v).toLowerCase();
  return null;
}

const server = http.createServer(async (req, res) => {
  const url = (req.url || '').split('?')[0];

  if (req.method === 'GET' && url === '/feed.rss') {
    res.writeHead(200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
    return res.end(FEED);
  }

  if (req.method === 'POST' && url === '/v1/chat/completions') {
    let body = {};
    try { body = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { error: { message: 'Invalid JSON body.' } }); }
    const userMsg = (body.messages || []).filter(m => m.role === 'user').pop()?.content || '';
    let prompt = {};
    const before = userMsg.split('\n\nReturn exactly')[0];
    const start = before.indexOf('{');
    const end = before.lastIndexOf('}');
    if (start >= 0 && end > start) { try { prompt = JSON.parse(before.slice(start, end + 1)); } catch { /* keep {} */ } }
    const reading = buildReading(prompt);
    const model = body.model || 'astritsa-mock-local';
    const systemMsg = (body.messages || []).find(m => m.role === 'system')?.content || '';
    const ctx = prompt.astrologyContext || {};
    console.log(`[mock-ai] model=${model} · feature=${prompt.feature || '?'} · language=${prompt.language || '?'} · liveSources=${(prompt.liveSources || []).length} · excerptChars=${String(prompt.sourceExcerpts || '').length} · groundRules=${systemMsg.includes('ASTROLOGY GROUND RULES')} · ephemeris=${ctx.approx ? 'approx' : (ctx.source || 'real')} · sun=${ctx.sunSign?.en || '-'} · moon=${ctx.moonPhase?.en || '-'} (${ctx.moonPhase?.illumination ?? '-'}%) · aspects=${(ctx.aspects || []).length} · retro=${(ctx.retrogrades || []).filter(r => r.id !== 'sun' && r.id !== 'moon').map(r => r.en).join('+') || 'none'}`);
    return sendJson(res, 200, {
      id: `chatcmpl-mock-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(reading) }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
    });
  }

  if (req.method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Astritsa mock AI provider (OpenAI-compatible stub) — POST /v1/chat/completions · GET /feed.rss\n');
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, HOST, () => console.log(`[mock-ai] listening on http://${HOST}:${PORT} (chat completions: /v1/chat/completions · feed: /feed.rss)`));