const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const SP_COPY = {
  el: {
    tagline:'AI αστρική εμπειρία, ελληνικά πρώτα', backZodiac:'Εξερεύνησε τα Ζώδια', navToday:'Σήμερα', navNumbers:'Αριθμολογία', headerSignin:'Σύνδεση',
    signEyebrow:'Ζώδιο', skyEyebrow:'Real-time εφήμερη', skyTitle:'Ο ουρανός σήμερα για το ζώδιό σου',
    rulersTitle:'Κυβερνήτες πλανήτες', moonTitle:'Σελήνη',
    readingEyebrow:'AI πρόβλεψη', readingTitle:'Η ημερήσια AI πρόβλεψη για το ζώδιό σου', readingBtn:'Δες την πρόβλεψη του ζωδίου', signinForReading:'Σύνδεση για πρόβλεψη',
    allSignsEyebrow:'Ζώδια', allSignsTitle:'Δες άλλο ζώδιο', footerText:'Πρωτότυπη AI εφαρμογή ψυχαγωγίας',
    loading:'Η Αστρίτσα ζητά real-time AI απάντηση...', signinNeeded:'Πρέπει πρώτα να συνδεθείς και να αποδεχθείς τους όρους.', aiSetup:'Το AI API δεν έχει ρυθμιστεί ακόμα. Πριν το launch πρόσθεσε AI_API_KEY και AI_MODEL στο περιβάλλον.',
    sourceConsensus:'Συμφωνία αναγνώσεων', commonThemes:'Κοινά μοτίβα', disclosure:'AI διαφάνεια', disclaimer:'Σημείωση', agreementLevels:{ low:'Χαμηλή', medium:'Μεσαία', high:'Υψηλή', unavailable:'Μη διαθέσιμη' }, legalNote:'Οι AI προβλέψεις, η αστρολογία, η καφεμαντεία, η αριθμολογία και οι κάρτες oracle παρέχονται αποκλειστικά ως ψυχαγωγικό περιεχόμενο και δεν αποτελούν ιατρική, ψυχολογική, νομική, οικονομική ή άλλη επαγγελματική συμβουλή.',
    dateLabel:'Ημερομηνία', approxLabel:'Προσεγγιστικό μοντέλο',
    retrograde:'ανάδρομος', retroShort:'℞',
    aspect_conjunction:'σύνοδος', aspect_sextile:'εξάγωνο', aspect_square:'τετράγωνο', aspect_trine:'τρίγωνο', aspect_opposition:'αντίθεση', noAspect:'χωρίς ολόκληρη όψη ζωδίου',
    moonIllum:'φωτεινότητα', moonIn:'στο ζώδιο', skyUnavailable:'Η αστρονομική εικόνα δεν είναι διαθέσιμη αυτή τη στιγμή.',
    skyCacheNote:'Ουρανός πραγματικού χρόνου — ανανεώνεται κάθε 10 λεπτά.'
  },
  en: {
    tagline:'AI astral experience, Greek first', backZodiac:'Explore the Zodiac', navToday:'Today', navNumbers:'Numerology', headerSignin:'Sign in',
    signEyebrow:'Zodiac sign', skyEyebrow:'Real-time ephemeris', skyTitle:'Today’s sky for your sign',
    rulersTitle:'Ruling planets', moonTitle:'Moon',
    readingEyebrow:'AI reading', readingTitle:'The daily AI reading for your sign', readingBtn:'See this sign’s reading', signinForReading:'Sign in for a reading',
    allSignsEyebrow:'Zodiac', allSignsTitle:'View another sign', footerText:'Original AI entertainment app',
    loading:'Astritsa is requesting a real-time AI answer...', signinNeeded:'Please sign in and accept the mandatory terms first.', aiSetup:'The AI API is not configured yet. Before launch add AI_API_KEY and AI_MODEL to the environment.',
    sourceConsensus:'Reading agreement', commonThemes:'Common themes', disclosure:'AI transparency', disclaimer:'Note', agreementLevels:{ low:'Low', medium:'Medium', high:'High', unavailable:'Unavailable' }, legalNote:'AI predictions, astrology, coffee reading, numerology and oracle cards are provided exclusively as entertainment content and do not constitute medical, psychological, legal, financial or other professional advice.',
    dateLabel:'Date', approxLabel:'Approximate model',
    retrograde:'retrograde', retroShort:'℞',
    aspect_conjunction:'conjunction', aspect_sextile:'sextile', aspect_square:'square', aspect_trine:'trine', aspect_opposition:'opposition', noAspect:'no whole-sign aspect',
    moonIllum:'illumination', moonIn:'in', skyUnavailable:'The astronomical picture is not available right now.',
    skyCacheNote:'Live sky — refreshes every 10 minutes.'
  }
};

const state = { lang: localStorage.getItem('astritsa-lang') || 'el', user: null, ready: false, sky: null, signs: [] };
function t(key){ return SP_COPY[state.lang][key] || SP_COPY.el[key] || key; }
function esc(str=''){ return String(str).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),3000); }
function setHTML(el, html){ el.classList.remove('empty'); el.innerHTML=html; }
async function api(path, body=null, method='POST'){
  const opt={ method, headers:{ 'Content-Type':'application/json' } };
  if(body!==null) opt.body=JSON.stringify(body);
  const res=await fetch(path,opt);
  const data=await res.json().catch(()=>({}));
  if(!res.ok){ const err=new Error(data.error || 'Request failed'); err.code=data.code; err.status=res.status; throw err; }
  return data;
}

const MONTH_ABBR = { el:['Ιαν','Φεβ','Μαρ','Απρ','Μαΐ','Ιουν','Ιουλ','Αυγ','Σεπ','Οκτ','Νοε','Δεκ'], en:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] };
function signRange(s){ const m=MONTH_ABBR[state.lang]||MONTH_ABBR.el; return `${s.start[1]} ${m[s.start[0]-1]} – ${s.end[1]} ${m[s.end[0]-1]}`; }
function signName(s){ return state.lang==='en' ? s.en : s.el; }
const VALID_SIGNS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
function currentSignId(){
  const seg=decodeURIComponent(location.pathname.split('/').filter(Boolean).pop()||'').toLowerCase();
  return VALID_SIGNS.includes(seg) ? seg : 'aries';
}
function signById(id){ return state.signs.find(s=>s.id===id) || null; }

function applyLanguage(){
  document.documentElement.lang=state.lang;
  $$('[data-sp]').forEach(el=>{ el.textContent=t(el.dataset.sp); });
  $('#langToggle').textContent=state.lang==='el'?'EN':'EL';
  renderHead(); renderSky(); renderAllSigns();
}

function renderHead(){
  const s=signById(currentSignId()); if(!s) return;
  const title = state.lang==='en' ? `${s.en} today — AI astrology reading | Astritsa` : `${s.el} σήμερα — AI αστρολογική πρόβλεψη | Αστρίτσα`;
  const description = state.lang==='en'
    ? `AI daily reading for ${s.en} grounded in today\u2019s real planetary positions, retrogrades and moon phase. Free from Astritsa, the Greek-first astrology app.`
    : `Ημερήσια AI πρόβλεψη για τον ${s.el} με βάση τις πραγματικές σημερινές πλανητικές θέσεις, τους αναδρόμους και τη φάση της σελήνης. Δωρεάν από την Αστρίτσα.`;
  const url=`https://astritsa.com/zodiac/${s.id}`;
  document.title=title;
  upsertSignMeta('name','description',description);
  upsertSignMeta('property','og:title',title);
  upsertSignMeta('property','og:description',description);
  upsertSignMeta('property','og:url',url);
  upsertSignMeta('property','og:type','article');
  upsertSignMeta('name','twitter:card','summary');
  const canonical=document.head.querySelector('link[rel="canonical"]');
  if(canonical) canonical.setAttribute('href',url);
  // Per-sign structured data so search engines and AI models can cite the page.
  let ld=document.getElementById('signJsonLd');
  if(!ld){ ld=document.createElement('script'); ld.type='application/ld+json'; ld.id='signJsonLd'; document.head.appendChild(ld); }
  ld.textContent=JSON.stringify({
    '@context':'https://schema.org', '@type':'Article',
    headline:title, description, inLanguage:state.lang==='en'?'en':'el',
    url, mainEntityOfPage:url,
    image:'https://astritsa.com/astritsa-logo.jpg',
    author:{ '@type':'Organization', name:'Astritsa', url:'https://astritsa.com/' },
    publisher:{ '@type':'Organization', name:'Astritsa', logo:{ '@type':'ImageObject', url:'https://astritsa.com/astritsa-logo.jpg' } },
    about:{ '@type':'Thing', name:state.lang==='en'?s.en:s.el }
  });
  $('#signGlyph').textContent=s.emoji;
  $('#signName').textContent=signName(s);
  $('#signRange').textContent=signRange(s);
  $('#signChips').innerHTML=`<span class="mini-chip">${esc(s.element[state.lang])}</span>`;
  const link=$('#signSigninLink'); if(link) link.hidden=Boolean(state.user);
}
function upsertSignMeta(attr,key,content){
  let el=document.head.querySelector(`meta[${attr}="${key}"]`);
  if(!el){ el=document.createElement('meta'); el.setAttribute(attr,key); document.head.appendChild(el); }
  el.setAttribute('content',content);
}

function renderSky(){
  const grid=$('#skyGrid'), note=$('#skyNote'), sky=state.sky;
  if(!sky){ grid.innerHTML=''; note.textContent=''; $('#rulersBox').innerHTML=`<p class="disclaimer">${t('skyUnavailable')}</p>`; $('#moonBox').innerHTML=`<p class="disclaimer">${t('skyUnavailable')}</p>`; return; }
  note.textContent = (sky.approx ? `⚠ ${t('approxLabel')} · ` : '') + t('skyCacheNote');
  grid.innerHTML = sky.planets.map(p=>{
    const rx = p.retrograde ? ` <span class="rx-badge" title="${esc(t('retrograde'))}">${esc(t('retroShort'))}</span>` : '';
    const asp = p.aspectToSign
      ? `<small>${esc(t('aspect_'+p.aspectToSign.id))}${p.sign ? ` · ${esc(signName(p.sign))}` : ''}</small>`
      : `<small>${esc(t('noAspect'))}</small>`;
    return `<div class="sky-card"><b>${esc(state.lang==='en'?p.en:p.el)}${rx}</b><span class="sky-in">${p.sign ? `${esc(p.sign.emoji)} ${esc(signName(p.sign))} · ${p.sign.degree}°` : '—'}</span>${asp}</div>`;
  }).join('');
  $('#rulersBox').innerHTML = sky.rulers.length
    ? sky.rulers.map(p=>`<div class="ruler-row"><b>${esc(state.lang==='en'?p.en:p.el)}</b><small>${p.sign ? `${esc(p.sign.emoji)} ${esc(signName(p.sign))} · ${p.sign.degree}°${p.retrograde?` · ${esc(t('retrograde'))}`:''}` : '—'}</small></div>`).join('')
    : `<p class="disclaimer">${t('skyUnavailable')}</p>`;
  $('#moonBox').innerHTML = sky.moonPhase
    ? `<p><b>${esc(state.lang==='en'?sky.moonPhase.en:sky.moonPhase.el)}</b></p><p class="disclaimer">${t('moonIllum')}: ${sky.moonPhase.illumination}%${sky.moonPhase.sign ? ` · ${t('moonIn')} ${esc(sky.moonPhase.sign.emoji)} ${esc(signName(sky.moonPhase.sign))}` : ''}</p>`
    : `<p class="disclaimer">${t('skyUnavailable')}</p>`;
  const retro = (sky.retrogrades||[]).map(id => sky.planets.find(p=>p.id===id)).filter(Boolean);
  if(retro.length) $('#signChips').insertAdjacentHTML('beforeend', `<span class="mini-chip rx-chip">℞ ${esc(retro.map(p=>state.lang==='en'?p.en:p.el).join(', '))}</span>`);
  $('#signChips').insertAdjacentHTML('beforeend', `<span class="mini-chip">${esc(t('dateLabel'))}: ${esc(sky.date)}</span>`);
}

function renderAllSigns(){
  const grid=$('#allSigns'); if(!grid || !state.signs.length) return;
  grid.innerHTML=state.signs.map(s=>`<a class="zodiac-card ${s.id===currentSignId()?'current':''}" href="/zodiac/${s.id}"><span class="zodiac-glyph">${s.emoji}</span><b>${esc(signName(s))}</b><small>${esc(signRange(s))}</small></a>`).join('');
}

async function loadSky(){
  try{ state.sky=await api(`/api/sky/${currentSignId()}`, null, 'GET'); }
  catch(err){ state.sky=null; console.warn('sky unavailable', err); }
  renderHead(); renderSky();
}

async function runSignReading(){
  const el=$('#signReading');
  if(!state.user || !state.ready){ toast(t('signinNeeded')); location.href='/#account'; return; }
  el.classList.remove('empty'); el.classList.add('loading'); el.textContent=t('loading');
  try{
    const {reading}=await api('/api/daily', { sign:currentSignId(), language:state.lang });
    renderAI(el, reading);
  }catch(err){
    const msg = err.code==='AI_NOT_CONFIGURED' ? t('aiSetup') : err.message;
    setHTML(el, `<p class="lead">⚠ ${esc(msg)}</p><p class="disclaimer">${esc(err.code||'')}</p>`);
  }
  finally{ el.classList.remove('loading'); }
}

function renderAI(el, r){
  const themes = r.sourceConsensus?.commonThemes || [];
  const sections = r.sections || [];
  const lucky = r.lucky || null;
  const levels = t('agreementLevels') || {};
  const level = levels[r.sourceConsensus?.agreementLevel] || r.sourceConsensus?.agreementLevel || levels.unavailable;
  setHTML(el, `
    <p class="lead"><b>${esc(r.title || 'Astritsa')}</b></p>
    <p>${esc(r.summary || '')}</p>
    <div class="reading-grid">
      <div class="reading-tile"><b>${t('sourceConsensus')}</b>${esc(level)}<br><small>${esc(r.sourceConsensus?.note || '')}</small></div>
      ${lucky ? `<div class="reading-tile"><b>Lucky</b>${esc([lucky.number,lucky.time,lucky.color,lucky.place,lucky.herb].filter(Boolean).join(' · '))}</div>` : ''}
      <div class="reading-tile"><b>Generated</b>${esc(r.generatedAt || '')}</div>
    </div>
    ${themes.length ? `<h3>${t('commonThemes')}</h3><ul>${themes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${sections.map(s=>`<h3>${esc(s.heading)}</h3><p>${esc(s.text)}</p>`).join('')}
    ${r.action ? `<p><b>Action:</b> ${esc(r.action)}</p>` : ''}
    <p class="disclaimer reading-note"><b>${t('disclaimer')}:</b> ${esc(r.disclaimer || '')}</p>`);
}

// ---- consent-gated optional tags (mirror of app.js) -------------------------
const CONSENT_KEY='astritsa-cookies';
const tagBoot={ analyticsInjected:false, pageViewFired:false };
function readCookieConsent(){ try{ return JSON.parse(localStorage.getItem(CONSENT_KEY)||'null'); }catch{ return null; } }
function consentFor(cat){ const c=readCookieConsent(); return Boolean(c && c[cat]); }
let pageConfig=null;
async function loadConfig(){ try{ pageConfig=await api('/api/config', null, 'GET'); }catch{ pageConfig={}; } }
function analyticsEnabled(){ return Boolean(pageConfig && pageConfig.analyticsConfigured && /^G-[A-Z0-9]{6,}$/i.test(pageConfig.analyticsId||'')); }
function injectAnalytics(){
  if(tagBoot.analyticsInjected) return true;
  if(!analyticsEnabled()) return false;
  tagBoot.analyticsInjected=true;
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){ window.dataLayer.push(arguments); };
  window.gtag('js',new Date());
  window.gtag('config', pageConfig.analyticsId);
  const s=document.createElement('script');
  s.async=true; s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(pageConfig.analyticsId);
  s.setAttribute('data-consent','analytics');
  document.head.appendChild(s);
  return true;
}
function trackAnalytics(eventName, params){
  if(!consentFor('analytics') || !analyticsEnabled()) return;
  if(!injectAnalytics()) return;
  window.dataLayer=window.dataLayer||[];
  window.dataLayer.push({ event:eventName, ...(params||{}) });
}
function applyConsentTags(){
  const consent=readCookieConsent();
  if(!consent || !pageConfig) return;
  if(consent.analytics && analyticsEnabled()){
    if(!injectAnalytics()) return;
    if(!tagBoot.pageViewFired){ tagBoot.pageViewFired=true; window.dataLayer.push({ event:'page_view' }); }
  } else if(tagBoot.analyticsInjected){
    try{ if(window.gtag) window.gtag('consent','update',{ analytics_storage:'denied', ad_storage:'denied' }); }catch{}
  }
}

async function loadMe(){ try{ const data=await api('/api/auth/me', null, 'GET'); state.user=data.user; state.ready=data.ready; }catch{ state.user=null; } renderHead(); }

// ---- mobile hamburger nav (same behavior as the home page) ----
function closeNav(){ document.body.classList.remove('nav-open'); $('#navToggle')?.setAttribute('aria-expanded','false'); }
(function initNavToggle(){
  const toggle=$('#navToggle'); if(!toggle) return;
  toggle.addEventListener('click', e=>{
    e.stopPropagation();
    const open=document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  $('#mainNav').addEventListener('click', e=>{ if(e.target.closest('a')) closeNav(); });
  document.addEventListener('click', e=>{ if(document.body.classList.contains('nav-open') && !e.target.closest('#mainNav') && !e.target.closest('#navToggle')) closeNav(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeNav(); });
  window.addEventListener('resize', ()=>{ if(window.innerWidth>940) closeNav(); });
})();

$('#langToggle').addEventListener('click',()=>{ state.lang=state.lang==='el'?'en':'el'; localStorage.setItem('astritsa-lang',state.lang); applyLanguage(); });
$('#signReadingBtn').addEventListener('click',runSignReading);

(async function init(){
  applyLanguage();
  await Promise.all([loadConfig(), loadMe(), loadSky()]);
  try{ const data=await api('/api/signs', null, 'GET'); state.signs=data.signs; }catch{ /* grid stays empty */ }
  renderAllSigns(); renderHead(); renderSky();
  applyConsentTags();
})();
