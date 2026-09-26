const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const copy = {
  el: {
    tagline:'AI αστρική εμπειρία, ελληνικά πρώτα', navHome:'Αρχική', navAccount:'Λογαριασμός', navCoffee:'Καφές', navNumbers:'Αριθμολογία', navOracle:'Oracle', navContact:'Επικοινωνία', navAdmin:'Admin', navToday:'Σήμερα', navWeek:'Εβδομάδα', navMonth:'Μήνας', navZodiac:'Ζώδιο', navHoroscope:'Ωροσκόπος', navSources:'Θέματα', headerSignin:'Σύνδεση', headerSignup:'Εγγραφή', headerPricing:'Τιμολόγηση',
    eyebrow:'AI • real-time source consensus • astrology entertainment', heroTitle:'Αστρολογία, αριθμολογία, Ταρώ και πες μου το φλυτζάνι μέσω AI', heroText:'AI προβλέψεις που αντλούν κοινά μοτίβα από τις διαμορφωμένες αστρολογικές πηγές.', createAccount:'Δημιούργησε λογαριασμό', dailyNow:'Σημερινή AI πρόβλεψη', legalNote:'Οι AI προβλέψεις, η αστρολογία, η καφεμαντεία, η αριθμολογία και οι κάρτες oracle παρέχονται αποκλειστικά ως ψυχαγωγικό περιεχόμενο και δεν αποτελούν ιατρική, ψυχολογική, νομική, οικονομική ή άλλη επαγγελματική συμβουλή.',
    profileTitle:'Το αστρολογικό σου προφίλ', zodiacEyebrow:'Ζώδια', zodiacTitle:'Εξερεύνησε τα Ζώδια',    topicsEyebrow:'Τάσεις', topicsTitle:'Δημοφιλή Θέματα', trendEmpty:'Πάτησε ένα θέμα για real-time AI ανάλυση με source consensus.', quickEyebrow:'Πλοήγηση', quickTitle:'Γρήγορη Πλοήγηση', ctaTitle:'Έτοιμος να εξερευνήσεις το κοσμικό σου βιογραφικό;', ctaText:'Δημιούργησε το προφίλ σου για να ξεκλειδώσεις εξατομικευμένες ημερήσιες προβλέψεις, αναγνώσεις ωροσκόπου και αριθμολογικές επισημάνσεις.', ctaBtn:'Ξεκίνα το Ταξίδι σου', nameLabel:'Όνομα', birthDateLabel:'Ημερομηνία γέννησης', birthTimeLabel:'Ώρα', cityLabel:'Πόλη', saveProfile:'Αποθήκευση προφίλ',
    accountEyebrow:'secure account', accountTitle:'Σύνδεση, εγγραφή και συνδρομή', signinTitle:'Σύνδεση', signupTitle:'Νέος λογαριασμός', passwordLabel:'Κωδικός', passwordPolicy:'Τουλάχιστον 8 χαρακτήρες, με ένα κεφαλαίο, έναν αριθμό και ένα σύμβολο.', signinBtn:'Σύνδεση', signupBtn:'Εγγραφή', ageConfirm:'Επιβεβαιώνω ότι είμαι 18+.', acceptTerms:'Αποδέχομαι τους', termsLink:'Οροι Χρήσης', acceptPrivacy:'Έχω διαβάσει την', privacyLink:'Πολιτική Απορρήτου', acceptRefund:'Αποδέχομαι την', refundLink:'Πολιτική Επιστροφών', footerSupport:'Υποστήριξη', aiConsent:'Κατανοώ ότι οι προβλέψεις παράγονται από AI για ψυχαγωγία.', subscribeBtn:'Συνδρομή με Stripe', portalBtn:'Διαχείριση συνδρομής', exportBtn:'Εξαγωγή δεδομένων', deleteBtn:'Διαγραφή λογαριασμού', signoutBtn:'Αποσύνδεση',
    todayLabel:'Σήμερα', dailyTitle:'AI ημερήσια αστρική πρόβλεψη', dailyEmpty:'Συνδέσου και πάτησε για real-time AI πρόβλεψη με source consensus.', surpriseTitle:'Έκπληξη της Αστρίτσας', surpriseEmpty:'AI moon portal, μάντρα και ελληνικό σύμβολο ημέρας.', surpriseBtn:'Άνοιξε έκπληξη',
    coffeeEyebrow:'AI coffee reading', coffeeTitle:'Διάλεξε φλιτζάνι και άσε την Αστρίτσα να πιει τον καφέ.', coffeeGeneral:'Πες μου τι βλέπεις γενικά', coffeeSpecific:'Θες να ρωτήσεις κάτι συγκεκριμένο?', questionLabel:'Τι θέλεις να ρωτήσεις;', drinkButton:'Πάτα εδώ για να πιεις τον καφέ σου', coffeeEmpty:'Η AI ανάγνωση θα εμφανιστεί μετά την τελευταία γουλιά.',
    numbersTitle:'AI Αριθμολογία', numbersText:'Η AI υπολογίζει και εξηγεί μονοπάτι ζωής, πεπρωμένο ονόματος, ψυχή και προσωπική ημέρα.', numbersBtn:'Υπολόγισε με AI', compatTitle:'AI Συναστρία Lite', signA:'Ζώδιο Α', signB:'Ζώδιο Β', compatBtn:'Δες χημεία με AI',
    oracleEyebrow:'AI Greek Oracle', oracleTitle:'Τράβηγμα 3 καρτών με AI ερμηνεία', oracleIntent:'Πρόθεση', oracleBtn:'Άνοιξε κάρτες',
    contactEyebrow:'support', contactTitle:'Φόρμα επικοινωνίας', topicLabel:'Θέμα', messageLabel:'Μήνυμα', contactConsent:'Συμφωνώ να χρησιμοποιηθεί το email μου για απάντηση στο αίτημά μου.', sendContact:'Αποστολή',
    adminTitle:'Διαχείριση πηγών, χρηστών και μηνυμάτων', addSource:'Προσθήκη πηγής', usersTitle:'Χρήστες', messagesTitle:'Μηνύματα', fullStackEyebrow:'Production scaffold', whatBuiltTitle:'Τι άλλαξε για launch-readiness', aiFeature:'Όλες οι προβλέψεις καλούν AI API και προαιρετικά real-time πηγές που ορίζει ο admin.', authFeature:'Signup/signin, sessions, 18+, υποχρεωτική αποδοχή Terms/Privacy/AI notice.', stripeFeature:'Checkout, billing portal και webhook endpoints χωρίς mock checkout.', complianceFeature:'GDPR export/delete, cookie banner, AI transparency, contact consent.',
    cookieText:'Χρησιμοποιούμε μόνο απαραίτητα cookies για σύνδεση. Προαιρετικά analytics/marketing ενεργοποιούνται μόνο με συγκατάθεση.', cookiesEssential:'Μόνο απαραίτητα', cookiesAll:'Αποδοχή όλων', cookieCustomize:'Προσαρμογή', cookieSave:'Αποθήκευση επιλογών', cookieAnalytics:'Analytics — στατιστικά επισκεψιμότητας (Google Analytics)', cookieMarketing:'Marketing — προσωποποιημένες διαφημίσεις (Meta Pixel)', cookieSettings:'Ρυθμίσεις cookies', footerText:'Πρωτότυπη AI εφαρμογή ψυχαγωγίας', pricingEyebrow:'τιμολόγηση', pricingTitle:'Τιμολόγηση', planFree:'Δωρεάν', planFreeText:'Ημερήσια πρόβλεψη και αριθμολογία', planFreeCta:'Ξεκίνα δωρεάν', planPlus:'Plus', pricePlus:'4,99€ / μήνα', planPlusText:'Απεριόριστες AI προβλέψεις, ιστορικό και όλα τα widgets.', planPro:'Pro', pricePro:'9,99€ / μήνα', planProText:'Προσωπικός αστρολογικός οδηγός, προτεραιότητα και προηγμένη ανάλυση.', planProCta:'Δες το Pro',
    faqTitle:'Συχνές Ερωτήσεις', faqQ1:'Πώς παράγονται οι καθημερινές προβλέψεις;', faqA1:'Κάθε μέρα υπολογίζουμε τις πραγματικές θέσεις των πλανητών με αστρονομικό ημερολόγιο (efemerides) και οι AI προβλέψεις συνδυάζουν αυτές τις διαμορφώσεις με τους κλασικούς αστρολογικούς κανόνες για κάθε ζώδιο και οίκο.', faqQ2:'Είναι οι προβλέψεις αποθηκευμένο ωροσκόπιο;', faqA2:'Όχι. Οι αναγνώσεις παράγονται σε πραγματικό χρόνο από AI με βάση τον σημερινό ουρανό — δεν πρόκειται για στατικό κείμενο που επαναλαμβάνεται.', faqQ3:'Είναι δωρεάν η Αστρίτσα;', faqA3:'Ναι, το βασικό πακέτο με ημερήσια πρόβλεψη και αριθμολογία είναι δωρεάν. Τα πακέτα Plus και Pro ξεκλειδώνουν απεριόριστες αναγνώσεις και προηγμένα εργαλεία.', faqQ4:'Χρησιμοποιούνται τα δεδομένα μου;', faqA4:'Συλλέγουμε μόνο ό,τι χρειάζεται για τον λογαριασμό σου. Οι συναινέσεις GDPR είναι υποχρεωτικές και μπορείς ανά πάσα στιγμή να εξαγάγεις ή να διαγράψεις τα δεδομένα σου.',
    loading:'Η Αστρίτσα ζητά real-time AI απάντηση...', saved:'Αποθηκεύτηκε ✨', signinNeeded:'Πρέπει πρώτα να συνδεθείς και να αποδεχθείς τους όρους.', aiSetup:'Το AI API δεν έχει ρυθμιστεί ακόμα. Πριν το launch πρόσθεσε AI_API_KEY και AI_MODEL στο περιβάλλον.', sourceConsensus:'Συμφωνία αναγνώσεων', commonThemes:'Κοινά μοτίβα', disclosure:'AI διαφάνεια', disclaimer:'Σημείωση', lifePathLabel:'Διαδρομή', agreementLevels:{ low:'Χαμηλή', medium:'Μεσαία', high:'Υψηλή', unavailable:'Μη διαθέσιμη' }, subscription:'Συνδρομή', role:'Ρόλος', deleteConfirm:'Σίγουρα θέλεις διαγραφή λογαριασμού; Αυτό δεν αναιρείται.', sent:'Το μήνυμα στάλθηκε/αποθηκεύτηκε.', notConfigured:'Δεν έχει ρυθμιστεί ακόμη.'
  },
  en: {
    tagline:'AI astral experience, Greek first', navHome:'Home', navAccount:'Account', navCoffee:'Coffee', navNumbers:'Numerology', navOracle:'Oracle', navContact:'Contact', navAdmin:'Admin', navToday:'Today', navWeek:'Week', navMonth:'Month', navZodiac:'Zodiac', navHoroscope:'Horoscope', navSources:'Sources', headerSignin:'Sign in', headerSignup:'Sign up', headerPricing:'Pricing',
    eyebrow:'AI • real-time source consensus • astrology entertainment', heroTitle:'Astrology, numerology, Tarot and tell me the cup through AI', heroText:'AI readings that identify common patterns from configured astrology sources.', createAccount:'Create account', dailyNow:'Today’s AI reading', legalNote:'Adult entertainment content. Not professional advice.',
    profileTitle:'Your astrological profile', zodiacEyebrow:'Zodiac', zodiacTitle:'Explore the Zodiac',    topicsEyebrow:'Trends', topicsTitle:'Popular Topics', trendEmpty:'Tap a topic for a real-time AI analysis with source consensus.', quickEyebrow:'Navigation', quickTitle:'Quick Navigation', ctaTitle:'Ready to explore your cosmic biography?', ctaText:'Create your profile to unlock personalized daily predictions, horoscope readings and numerological insights.', ctaBtn:'Start Your Journey', nameLabel:'Name', birthDateLabel:'Birth date', birthTimeLabel:'Time', cityLabel:'City', saveProfile:'Save profile',
    accountEyebrow:'secure account', accountTitle:'Sign in, sign up and subscription', signinTitle:'Sign in', signupTitle:'New account', passwordLabel:'Password', passwordPolicy:'At least 8 characters with one uppercase letter, one number and one special character.', signinBtn:'Sign in', signupBtn:'Sign up', ageConfirm:'I confirm I am 18+.', acceptTerms:'I accept the', termsLink:'Terms of Use', acceptPrivacy:'I have read the', privacyLink:'Privacy Policy', acceptRefund:'I accept the', refundLink:'Refund Policy', footerSupport:'Support', aiConsent:'I understand readings are AI-generated for entertainment.', subscribeBtn:'Subscribe with Stripe', portalBtn:'Manage subscription', exportBtn:'Export data', deleteBtn:'Delete account', signoutBtn:'Sign out',
    todayLabel:'Today', dailyTitle:'AI daily astral reading', dailyEmpty:'Sign in and press for a real-time AI reading with source consensus.', surpriseTitle:'Astritsa surprise', surpriseEmpty:'AI moon portal, mantra and Greek day symbol.', surpriseBtn:'Open surprise',
    coffeeEyebrow:'AI coffee reading', coffeeTitle:'Choose a cup and let Astritsa drink the coffee.', coffeeGeneral:'Tell me what you see generally', coffeeSpecific:'Do you want to ask something specific?', questionLabel:'What do you want to ask?', drinkButton:'Tap here to drink your coffee', coffeeEmpty:'The AI reading appears after the last sip.',
    numbersTitle:'AI Numerology', numbersText:'AI calculates and explains life path, name destiny, soul and personal day.', numbersBtn:'Calculate with AI', compatTitle:'AI Synastry Lite', signA:'Sign A', signB:'Sign B', compatBtn:'See chemistry with AI',
    oracleEyebrow:'AI Greek Oracle', oracleTitle:'Three-card draw with AI interpretation', oracleIntent:'Intention', oracleBtn:'Open cards',
    contactEyebrow:'support', contactTitle:'Contact form', topicLabel:'Topic', messageLabel:'Message', contactConsent:'I agree that my email may be used to respond to my request.', sendContact:'Send',
    adminTitle:'Manage sources, users and messages', addSource:'Add source', usersTitle:'Users', messagesTitle:'Messages', fullStackEyebrow:'Production scaffold', whatBuiltTitle:'What changed for launch readiness', aiFeature:'All readings call an AI API and optionally real-time sources configured by admin.', authFeature:'Signup/signin, sessions, 18+, mandatory Terms/Privacy/AI notice.', stripeFeature:'Checkout, billing portal and webhook endpoints with no mock checkout.', complianceFeature:'GDPR export/delete, cookie banner, AI transparency, contact consent.',
    cookieText:'We use only essential cookies for login. Optional analytics/marketing are enabled only with consent.', cookiesEssential:'Essential only', cookiesAll:'Accept all', cookieCustomize:'Customize', cookieSave:'Save choices', cookieAnalytics:'Analytics — traffic statistics (Google Analytics)', cookieMarketing:'Marketing — personalized ads (Meta Pixel)', cookieSettings:'Cookie settings', footerText:'Original AI entertainment app', pricingEyebrow:'subscription', pricingTitle:'Pricing', planFree:'Free', planFreeText:'Daily reading and numerology', planFreeCta:'Start free', planPlus:'Plus', pricePlus:'€4.99 / month', planPlusText:'Unlimited AI readings, history and every widget.', planPro:'Pro', pricePro:'€9.99 / month', planProText:'Personal astrological guide, priority and advanced analysis.', planProCta:'See Pro',
    faqTitle:'Frequently Asked Questions', faqQ1:'How are the daily readings generated?', faqA1:'Every day we compute the real planetary positions with an astronomical almanac, and the AI readings combine those configurations with classical astrological rules for each sign and house.', faqQ2:'Are the readings a stored horoscope?', faqA2:'No. Readings are generated in real time by AI based on today\u2019s sky — not repeated static text.', faqQ3:'Is Astritsa free?', faqA3:'Yes, the basic package with daily reading and numerology is free. Plus and Pro unlock unlimited readings and advanced tools.', faqQ4:'Is my data used?', faqA4:'We collect only what the account needs. GDPR consents are mandatory and you can export or delete your data at any time.',
    loading:'Astritsa is requesting a real-time AI answer...', saved:'Saved ✨', signinNeeded:'Please sign in and accept the mandatory terms first.', aiSetup:'The AI API is not configured yet. Before launch add AI_API_KEY and AI_MODEL to the environment.', sourceConsensus:'Reading agreement', commonThemes:'Common themes', disclosure:'AI transparency', disclaimer:'Note', lifePathLabel:'Life path', agreementLevels:{ low:'Low', medium:'Medium', high:'High', unavailable:'Unavailable' }, subscription:'Subscription', role:'Role', deleteConfirm:'Are you sure you want to delete your account? This cannot be undone.', sent:'Message sent/stored.', notConfigured:'Not configured yet.'
  }
};

const cups = [
  { id:'classic', el:['Κλασικό πορσελάνινο','για καθαρές απαντήσεις'], en:['Classic porcelain','for clean answers'] },
  { id:'aegean', el:['Αιγαιοπελαγίτικο μπλε','για ταξίδια και μηνύματα'], en:['Aegean blue','for journeys and messages'] },
  { id:'rose', el:['Ροζ της καρδιάς','για έρωτα και συμφιλίωση'], en:['Rose heart','for love and reconciliation'] },
  { id:'olive', el:['Ελιάς και γης','για σπίτι και πρακτικά θέματα'], en:['Olive earth','for home and practical matters'] },
  { id:'noir', el:['Νυχτερινό noir','για μυστικά και ένστικτο'], en:['Nocturnal noir','for secrets and instinct'] },
  { id:'sunset', el:['Ηλιοβασίλεμα Κυκλάδων','για αλλαγές και ελπίδα'], en:['Cycladic sunset','for changes and hope'] }
];

const state = { lang: localStorage.getItem('astritsa-lang') || 'el', user: null, ready: false, config: {}, signs: [], selectedCup: 'classic', coffeeMode: 'general' };
function t(key){ return copy[state.lang][key] || copy.el[key] || key; }
function esc(str=''){ return String(str).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),3000); }
function setHTML(el, html){ el.classList.remove('empty'); el.innerHTML=html; }
function setEmpty(el, key){ el.classList.add('empty'); el.textContent=t(key); }
async function api(path, body=null, method='POST'){
  const opt={ method, headers:{ 'Content-Type':'application/json' } };
  if(body!==null) opt.body=JSON.stringify(body);
  const res=await fetch(path,opt);
  const data=await res.json().catch(()=>({}));
  if(!res.ok){ const err=new Error(data.error || 'Request failed'); err.code=data.code; err.status=res.status; throw err; }
  return data;
}
function profilePayload(){ return { name:$('#name').value.trim(), birthDate:$('#birthDate').value, birthTime:$('#birthTime').value, city:$('#city').value.trim(), language:state.lang }; }
function ensureReady(){ if(!state.user || !state.ready){ toast(t('signinNeeded')); location.hash='#account'; return false; } return true; }

// ---- dynamic meta manager (SEO + AI visibility) ------------------------------
// Updates <title>, meta description, canonical and og:url as the visitor moves
// through views (#hash routes) and toggles language, so crawlers and AI models
// index meaningful per-section titles for astritsa.com.
const SITE_ORIGIN='https://astritsa.com';
const META_SECTIONS={
  '':            { el:['Astritsa — AI αστρολογική εμπειρία | Ημερήσιες προβλέψεις, Αριθμολογία, Ταρώ','Ημερήσιες AI αστρολογικές προβλέψεις για τα 12 ζώδια, αριθμολογία, Ταρώ, καφεμαντεία και oracle. Ελληνικά πρώτα, για ενήλικες 18+.'], en:['Astritsa — AI Astrology Experience | Daily Readings, Numerology, Tarot','Daily AI astrology readings for the 12 signs, numerology, tarot, Greek coffee reading and oracle. Greek first, adults 18+.'] },
  '#dailyPanel': { el:['Σήμερα — Ημερήσια AI πρόβλεψη | Astritsa','Η σημερινή σου AI αστρολογική πρόβλεψη, βασισμένη στον πραγματικό σημερινό ουρανό.'], en:['Today — Daily AI Reading | Astritsa','Your AI astrology reading for today, grounded in the real sky.'] },
  '#zodiac':     { el:['Εξερεύνησε τα Ζώδια | Astritsa','Όλα τα ζώδια με τις ημερομηνίες τους και τον σημερινό ουρανό ανά ζώδιο.'], en:['Explore the Zodiac Signs | Astritsa','All zodiac signs with their dates and today\u2019s sky per sign.'] },
  '#topics':     { el:['Δημοφιλή Θέματα | Astritsa','Τα θέματα που συζητιούνται τώρα στην αστρολογία, με real-time AI ανάλυση.'], en:['Popular Topics | Astritsa','What the astrology world is talking about, with real-time AI analysis.'] },
  '#numbers':    { el:['Αριθμολογία | Astritsa','Μονοπάτι ζωής, πεπρωμένο ονόματος και προσωπική ημέρα — υπολογισμένα και εξηγημένα από AI.'], en:['Numerology | Astritsa','Life path, name destiny and personal day — computed and explained by AI.'] },
  '#coffee':     { el:['Καφεμαντεία με AI | Astritsa','Διάλεξε φλιτζάνι και πάρε AI ανάγνωση του ελληνικού καφέ σου.'], en:['AI Coffee Cup Reading | Astritsa','Pick a cup and get an AI reading of your Greek coffee.'] },
  '#oracle':     { el:['Oracle Κάρτες | Astritsa','Τράβηγμα 3 καρτών oracle με ελληνικό χρώμα και AI ερμηνεία.'], en:['Oracle Cards | Astritsa','Three-card oracle draw with Greek flavor and AI interpretation.'] },
  '#pricing':    { el:['Τιμολόγηση | Astritsa','Δωρεάν βασικό πακέτο και συνδρομές Plus/Pro για απεριόριστες AI αναγνώσεις.'], en:['Pricing | Astritsa','Free basic package and Plus/Pro subscriptions for unlimited AI readings.'] },
  '#contact':    { el:['Επικοινωνία & Υποστήριξη | Astritsa','Στείλε μας το ερώτημά σου μέσα από την εφαρμογή — απαντάμε γρήγορα.'], en:['Contact & Support | Astritsa','Send us your question from inside the app — we answer fast.'] }
};
function upsertMeta(attr, key, content){
  let el=document.head.querySelector(`meta[${attr}="${key}"]`);
  if(!el){ el=document.createElement('meta'); el.setAttribute(attr,key); document.head.appendChild(el); }
  el.setAttribute('content',content);
}
function updateMetaForView(){
  const hash=location.hash||'';
  const entry=META_SECTIONS[hash] || META_SECTIONS[''];
  const [title,description]=entry[state.lang]||entry.el;
  const url=SITE_ORIGIN+'/' + (hash||'');
  document.title=title;
  upsertMeta('name','description',description);
  upsertMeta('property','og:title',title);
  upsertMeta('property','og:description',description);
  upsertMeta('property','og:url',url);
  let canonical=document.head.querySelector('link[rel="canonical"]');
  if(canonical) canonical.setAttribute('href',url);
}
window.addEventListener('hashchange', updateMetaForView);
// Strong-password policy, mirrored server-side (validatePassword in server.js):
// ≥8 chars, one uppercase, one digit, one special character.
function passwordPolicyProblem(pw){
  const p=String(pw||'');
  if(p.length<8) return state.lang==='el'?'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.':'Password must be at least 8 characters.';
  if(!/[A-ZΑ-Ω]/.test(p)) return state.lang==='el'?'Ο κωδικός πρέπει να περιέχει ένα κεφαλαίο γράμμα.':'Password must contain an uppercase letter.';
  if(!/[0-9]/.test(p)) return state.lang==='el'?'Ο κωδικός πρέπει να περιέχει έναν αριθμό.':'Password must contain a number.';
  if(!/[^A-Za-z0-9Α-Ωα-ω]/.test(p)) return state.lang==='el'?'Ο κωδικός πρέπει να περιέχει ένα σύμβολο.':'Password must contain a special character.';
  return null;
}

function applyLanguage(){
  document.documentElement.lang=state.lang;
  $$('[data-i18n]').forEach(el=>{ el.textContent=t(el.dataset.i18n); });
  if(typeof updateMetaForView==='function') updateMetaForView();
  $('#langToggle').textContent=state.lang==='el'?'EN':'EL';
  $('#name').placeholder=state.lang==='el'?'π.χ. Μαρία':'e.g. Maria';
  $('#city').placeholder=state.lang==='el'?'Αθήνα':'Athens';
  $('#coffeeQuestion').placeholder=state.lang==='el'?'π.χ. Θα ανοίξει ο δρόμος για αυτή τη σχέση;':'e.g. Will this relationship open up?';
  $('#oracleIntent').placeholder=state.lang==='el'?'αγάπη, δουλειά, μονοπάτι...':'love, work, path...';
  if($('#dailyReading').classList.contains('empty')) setEmpty($('#dailyReading'),'dailyEmpty');
  if($('#trendReading').classList.contains('empty')) setEmpty($('#trendReading'),'trendEmpty');
  if($('#surpriseReading').classList.contains('empty')) setEmpty($('#surpriseReading'),'surpriseEmpty');
  if($('#coffeeReading').classList.contains('empty')) setEmpty($('#coffeeReading'),'coffeeEmpty');
  renderCups(); renderSignSelects(); renderZodiac(); renderTopics(); renderQuickNav(); renderAccount(); renderProfile();
  if(state.config && state.config.aiConfigured !== undefined) renderSetupNotice();
}
async function loadConfig(){ state.config=await api('/api/config', null, 'GET'); renderSetupNotice(); }
function renderSetupNotice(){
  const missing=[];
  if(!state.config.aiConfigured) missing.push('AI_API_KEY / AI_MODEL');
  if(!state.config.stripeConfigured) missing.push('STRIPE_SECRET_KEY / STRIPE_PRICE_ID');
  $('#setupNotice').innerHTML = missing.length ? `<p class="disclaimer"><b>Setup:</b> ${missing.map(esc).join(', ')} ${t('notConfigured')}</p>` : '';
}
async function loadMe(){ const data=await api('/api/auth/me', null, 'GET'); state.user=data.user; state.ready=data.ready; renderAccount(); renderProfile(); if(state.user?.role==='admin') loadAdmin(); }
async function loadSigns(){ const data=await api('/api/signs', null, 'GET'); state.signs=data.signs; renderSignSelects(); renderZodiac(); }

function renderCups(){
  $('#cupGrid').innerHTML=cups.map(c=>{ const [name,desc]=c[state.lang]; return `<button class="cup-card ${state.selectedCup===c.id?'selected':''}" data-cup="${c.id}" type="button"><div class="cup-art cup-mini ${c.id}"></div><b>${esc(name)}</b><br><small>${esc(desc)}</small></button>`; }).join('');
  $$('.cup-card').forEach(btn=>btn.addEventListener('click',()=>{ state.selectedCup=btn.dataset.cup; $('#selectedCupArt').className=`big-cup ${state.selectedCup}`; $('#selectedCupArt').innerHTML='<span></span>'; renderCups(); }));
}
function syncCoffeeMode(){
  const checked=document.querySelector('input[name="coffeeMode"]:checked');
  state.coffeeMode=checked?.value || 'general';
  $('#coffeeQuestionWrap').hidden=state.coffeeMode!=='specific';
  $$('.mode-option').forEach(label=>label.classList.toggle('selected', label.querySelector('input')?.checked));
}
function renderSignSelects(){ if(!state.signs.length) return; for(const id of ['signA','signB']){ const sel=$('#'+id), prev=sel.value || (id==='signA'?'aries':'libra'); sel.innerHTML=state.signs.map(s=>`<option value="${s.id}">${s.emoji} ${s[state.lang]}</option>`).join(''); sel.value=prev; } }
const MONTH_ABBR = { el:['Ιαν','Φεβ','Μαρ','Απρ','Μαΐ','Ιουν','Ιουλ','Αυγ','Σεπ','Οκτ','Νοε','Δεκ'], en:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] };
function signRange(s){ const m=MONTH_ABBR[state.lang]||MONTH_ABBR.el; return `${s.start[1]} ${m[s.start[0]-1]} – ${s.end[1]} ${m[s.end[0]-1]}`; }
function renderZodiac(){
  const grid=$('#zodiacGrid'); if(!grid) return;
  if(!state.signs.length){ grid.innerHTML=''; return; }
  grid.innerHTML=state.signs.map(s=>`<a class="zodiac-card" href="/zodiac/${s.id}"><span class="zodiac-glyph">${s.emoji}</span><b>${esc(s[state.lang]||s.el)}</b><small>${esc(signRange(s))}</small></a>`).join('');
}
// Trending topics are served by GET /api/trends (id, title, category,
// mentions, direction, query, topicSky). `query` is the real prompt POSTed to
// /api/trends when the card is clicked; falls back to this static catalog so
// the section renders even if the endpoint is unavailable.
const topicsFallback = [
  { id:'mercury-retro', el:['Ανάδρομος Ερμής στον Ταύρο','Πλανήτες','15.420 αναφορές','up'], en:['Retrograde Mercury in Taurus','Planets','15,420 mentions','up'], query:{ el:'Ανάδρομος Ερμής στον Ταύρο: πώς επηρεάζει την επικοινωνία, τα ταξίδια και τα συμβόλαια;', en:'Retrograde Mercury in Taurus: how does it affect communication, travel and contracts?' } },
  { id:'new-moon-scorpio', el:['Νέα Σελήνη στον Σκορπιό','Φεγγάρια','12.350 αναφορές','up'], en:['New Moon in Scorpio','Moons','12,350 mentions','up'], query:{ el:'Νέα Σελήνη στον Σκορπιό: τι να ξεκινήσω και τι να αφήσω πίσω μου;', en:'New Moon in Scorpio: what should I start and what should I leave behind?' } },
  { id:'venus-aries', el:['Αφροδίτη στον Κριό','Πλανήτες','8.920 αναφορές','flat'], en:['Venus in Aries','Planets','8,920 mentions','flat'], query:{ el:'Αφροδίτη στον Κριό: έρωτα, πάθος και αυθόρμητες σχέσεις — τι να προσέξω;', en:'Venus in Aries: love, passion and spontaneous relationships — what should I watch for?' } },
  { id:'mars-pluto-trine', el:['Άρης σε Τριγωνισμό με Πλούτωνα','Πλανήτες','7.650 αναφορές','down'], en:['Mars in trine with Pluto','Planets','7,650 mentions','down'], query:{ el:'Άρης σε τριγωνισμό με Πλούτωνα: πώς να αξιοποιήσω τη συγκεντρωμένη ενέργεια και δύναμη;', en:'Mars trine Pluto: how to harness the focused energy and power?' } },
  { id:'dec-eclipse', el:['Ηλιακή Έκλειψη Δεκεμβρίου','Εκλείψεις','6.890 αναφορές','up'], en:['December Solar Eclipse','Eclipses','6,890 mentions','up'], query:{ el:'Ηλιακή Έκλειψη: καινούργια κεφάλαια, μοίρα και αλλαγές — τι να περιμένω;', en:'Solar eclipse: new chapters, destiny and change — what to expect?' } },
  { id:'karmic-reassess', el:['Καρμική Αναθεώρηση','Πνευματικότητα','5.420 αναφορές','flat'], en:['Karmic Reassessment','Spirituality','5,420 mentions','flat'], query:{ el:'Καρμική αναθεώρηση: μαθήματα, επαναλήψεις και πνευματική πρόοδος αυτόν τον μήνα;', en:'Karmic reassessment: lessons, repetitions and spiritual progress this month?' } }
];
state.topics = [];
function topicsList(){ return state.topics.length ? state.topics : topicsFallback; }
const TREND_ICON = { up:'↗', down:'↘', flat:'→' };
async function loadTrends(){
  try{ const data=await api(`/api/trends?language=${state.lang}`, null, 'GET'); state.topics=data.trends||[]; }
  catch{ state.topics=[]; }
  renderTopics();
}
function renderTopics(){
  const grid=$('#topicsGrid'); if(!grid) return;
  grid.innerHTML=topicsList().map(topic=>{
    let title,cat,refs,dir,query;
    if(topic.title){ title=topic.title; cat=topic.category; refs=topic.mentions; dir=topic.direction; query=topic.query; }
    else {
      [title,cat,refs,dir]=topic[state.lang]||topic.el;
      const fb=topicsFallback.find(f=>f.id===topic.id);
      query=fb?fb.query[state.lang]||fb.query.el:'';
    }
    const sky=(topic.topicSky&&topic.topicSky.length)?`<small class="topic-sky">🪐 ${esc(topic.topicSky.join(' · '))}</small>`:'';
    return `<button class="topic-card" type="button" data-topic="${esc(topic.id||'')}" data-query="${esc(query||'')}"><div class="topic-head"><b>${esc(title)}</b><span class="topic-trend ${dir}">${TREND_ICON[dir]}</span></div><small>${esc(cat)} · ${esc(refs)}</small>${sky}</button>`;
  }).join('');
}
const quickLinks = [
  { el:['Ημερήσιο Ωροσκόπιο','Η μέρα σου στα άστρα'], en:['Daily Horoscope','Your day among the stars'], icon:'☀', href:'#dailyPanel', tone:'aqua' },
  { el:['Εβδομαδιαία Πρόβλεψη','Σχεδίασε την εβδομάδα σου'], en:['Weekly Forecast','Plan your week'], icon:'📅', href:'#quicknav', tone:'gold' },
  { el:['Μηνιαία Πρόβλεψη','Μακροπρόθεσμες τάσεις'], en:['Monthly Forecast','Long-term trends'], icon:'🌙', href:'#quicknav', tone:'violet' },
  { el:['Αριθμολογία','Οι αριθμοί σου αποκωδικοποιούνται'], en:['Numerology','Your numbers decoded'], icon:'#', href:'#numbers', tone:'rose' }
];
function renderQuickNav(){
  const grid=$('#quickGrid'); if(!grid) return;
  grid.innerHTML=quickLinks.map(q=>{ const [title,sub]=q[state.lang]||q.el; return `<a class="quick-card ${q.tone}" href="${q.href}"><span class="quick-ico">${q.icon}</span><span class="quick-text"><b>${esc(title)}</b><small>${esc(sub)}</small></span><span class="quick-arrow">›</span></a>`; }).join('');
}
function renderProfile(){
  if(!state.user){ $('#profileSummary').innerHTML=`<p class="disclaimer">${t('signinNeeded')}</p>`; return; }
  $('#name').value=state.user.name||''; $('#birthDate').value=state.user.birthDate||''; $('#birthTime').value=state.user.birthTime||''; $('#city').value=state.user.city||'';
  const z=state.user.zodiac; $('#profileSummary').innerHTML=`<span class="zodiac-chip">${z?.emoji||'✦'} <strong>${esc(z?.[state.lang]||'—')}</strong></span><span class="mini-chip">${t('lifePathLabel')}: ${esc(state.user.lifePath||'—')}</span><span class="mini-chip">${esc(state.user.city||'—')}</span>`;
}
function renderAccount(){
  const logged=Boolean(state.user);
  $('#authArea').hidden=logged; $('#accountPanel').hidden=!logged; $('#adminNav').hidden=state.user?.role!=='admin'; $('#admin').hidden=state.user?.role!=='admin';
  if(!logged) return;
  const sub=state.user.subscription?.status || 'none';
  $('#accountSummary').innerHTML=`<h3>${esc(state.user.name||state.user.email)}</h3><p><b>Email:</b> ${esc(state.user.email)}</p><p><b>${t('role')}:</b> ${esc(state.user.role)}</p><p><b>${t('subscription')}:</b> ${esc(sub)}</p><p class="disclaimer">${state.ready ? '✓' : '⚠'} ${state.ready ? (state.lang==='el'?'Οι υποχρεωτικές συναινέσεις είναι ενεργές.':'Mandatory consents are active.') : t('signinNeeded')}</p>${state.ready ? '' : `<div class="checks consent-refresh"><label><input id="refreshAge" type="checkbox"> <span>${t('ageConfirm')}</span></label><label><input id="refreshTerms" type="checkbox"> <span>${t('acceptTerms')} <a href="/terms.html" target="_blank">${t('termsLink')}</a>.</span></label><label><input id="refreshPrivacy" type="checkbox"> <span>${t('acceptPrivacy')} <a href="/privacy.html" target="_blank">${t('privacyLink')}</a>.</span></label><label><input id="refreshRefund" type="checkbox"> <span>${t('acceptRefund')} <a href="/refund.html" target="_blank">${t('refundLink')}</a>.</span></label><label><input id="refreshAI" type="checkbox"> <span>${t('aiConsent')}</span></label><button id="refreshConsentBtn" class="primary-button" type="button">OK</button></div>`}`;
  const refreshBtn=$('#refreshConsentBtn');
  if(refreshBtn) refreshBtn.addEventListener('click', async()=>{ try{ const data=await api('/api/terms/accept',{ageConfirmed:$('#refreshAge').checked,termsAccepted:$('#refreshTerms').checked,privacyAccepted:$('#refreshPrivacy').checked,refundAccepted:$('#refreshRefund').checked,aiConsent:$('#refreshAI').checked}); state.user=data.user; state.ready=data.ready; toast(t('saved')); renderAccount(); }catch(err){ toast(err.message); } });
  $('#contactName').value=state.user.name||''; $('#contactEmail').value=state.user.email||'';
}

function renderAI(el, r){
  const themes = r.sourceConsensus?.commonThemes || [];
  const sections = r.sections || [];
  const symbols = r.symbols || [];
  const cards = r.cards || [];
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
    ${symbols.length ? `<div class="symbols">${symbols.map(s=>`<div class="symbol-tile"><strong>${esc(s.label)}</strong><p>${esc(s.meaning)}</p></div>`).join('')}</div>` : ''}
    ${cards.length ? `<div class="symbols">${cards.map(c=>`<div class="symbol-tile"><strong>${esc(c.position)} · ${esc(c.title)}</strong><p>${esc(c.meaning)}</p></div>`).join('')}</div>` : ''}
    ${r.action ? `<p><b>Action:</b> ${esc(r.action)}</p>` : ''}
    <p class="disclaimer reading-note"><b>${t('disclaimer')}:</b> ${esc(r.disclaimer || '')}</p>`);
}
function renderError(el, err){
  const msg = err.code === 'AI_NOT_CONFIGURED' ? t('aiSetup') : err.message;
  setHTML(el, `<p class="lead">⚠ ${esc(msg)}</p><p class="disclaimer">${esc(err.code || '')}</p>`);
}
async function runReading(endpoint, el, body={}){
  if(!ensureReady()) return;
  el.classList.remove('empty'); el.classList.add('loading'); el.textContent=t('loading');
  try{ const {reading}=await api(endpoint, { ...body, language:state.lang }); renderAI(el, reading); }
  catch(err){ renderError(el, err); }
  finally{ el.classList.remove('loading'); }
}

async function drinkCoffee(){
  if(!ensureReady()) return;
  const cup=$('#selectedCupArt'), progress=$('#drinkProgress'), el=$('#coffeeReading');
  cup.classList.add('drinking'); progress.classList.remove('active'); void progress.offsetWidth; progress.classList.add('active'); el.classList.remove('empty'); el.textContent=state.lang==='el'?'Η Αστρίτσα πίνει τον καφέ...':'Astritsa is drinking the coffee...';
  try{ syncCoffeeMode(); const promise=api('/api/coffee', { cupId:state.selectedCup, mode:state.coffeeMode, question:state.coffeeMode==='specific' ? $('#coffeeQuestion').value : '', language:state.lang }); promise.catch(()=>{}); await new Promise(r=>setTimeout(r,1650)); const {reading}=await promise; renderAI(el, reading); }
  catch(err){ renderError(el, err); }
  finally{ cup.classList.remove('drinking'); progress.classList.remove('active'); }
}
async function runOracle(){
  if(!ensureReady()) return;
  $('#oracleCards').innerHTML='';
  const el=$('#oracleReading'); el.classList.remove('empty'); el.textContent=t('loading');
  try{ const {reading}=await api('/api/tarot', { intent:$('#oracleIntent').value, language:state.lang });
    if(reading.cards?.length) $('#oracleCards').innerHTML=reading.cards.map((c,i)=>`<div class="oracle-card" style="animation-delay:${i*90}ms"><div><span class="glyph">${['✦','☾','☀'][i]||'✦'}</span><p class="eyebrow">${esc(c.position)}</p></div><div><h3>${esc(c.title)}</h3><p>${esc(c.meaning)}</p></div></div>`).join('');
    renderAI(el, reading);
  } catch(err){ renderError(el, err); }
}

let adminModule=null;
// Route-level code splitting: the admin panel is imported on demand, only for
// signed-in admins — regular visitors never download this module.
async function loadAdmin(){
  if(state.user?.role!=='admin') return;
  try{
    if(!adminModule){
      const mod = await import('/admin.js');
      // The module exports its renderAdmin via the namespace; window.AstritsaAdmin
      // is only a debugging alias. Prefer the namespace binding.
      adminModule = (mod && typeof mod.renderAdmin === 'function') ? mod : (mod?.AstritsaAdmin ?? mod?.default ?? mod);
    }
    await adminModule.renderAdmin({ api, esc, t, $, $$, state, toast, reload: loadAdmin });
  } catch(err){ console.warn(err); }
}

// ---- mobile hamburger nav ---------------------------------------------------
// The nav collapses below 940px into a dropdown toggled by the hamburger
// button; it closes on any link tap, outside tap, Escape, or resize to desktop.
function closeNav(){ document.body.classList.remove('nav-open'); $('#navToggle')?.setAttribute('aria-expanded','false'); }
function initNavToggle(){
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
}
initNavToggle();

$('#langToggle').addEventListener('click',()=>{ state.lang=state.lang==='el'?'en':'el'; localStorage.setItem('astritsa-lang',state.lang); applyLanguage(); loadTrends(); });
$('#topicsGrid').addEventListener('click', e=>{
  const card=e.target.closest('[data-query]');
  if(!card || !card.dataset.query) return;
  runReading('/api/trends', $('#trendReading'), { query:card.dataset.query, topic:card.dataset.topic || undefined });
});
// zodiac cards now navigate to dedicated /zodiac/:sign pages
$$('input[name="coffeeMode"]').forEach(input=>input.addEventListener('change',syncCoffeeMode));
$('#dailyNow').addEventListener('click',()=>runReading('/api/daily',$('#dailyReading'), profilePayload()));
$('#surpriseBtn').addEventListener('click',()=>runReading('/api/surprise',$('#surpriseReading'), {}));
$('#drinkBtn').addEventListener('click',drinkCoffee);
$('#numbersBtn').addEventListener('click',()=>runReading('/api/numerology',$('#numbersReading'), profilePayload()));
$('#compatBtn').addEventListener('click',()=>runReading('/api/compatibility',$('#compatReading'), { signA:$('#signA').value, signB:$('#signB').value }));
$('#oracleBtn').addEventListener('click',runOracle);

$('#signinForm').addEventListener('submit', async e=>{ e.preventDefault(); try{ const {user, ready}=await api('/api/auth/signin',{email:$('#signinEmail').value,password:$('#signinPassword').value}); state.user=user; state.ready=ready===undefined ? Boolean(user.ageConfirmedAt&&user.termsAcceptedAt&&user.privacyAcceptedAt&&user.aiConsentAt) : ready; toast(t('saved')); trackAnalytics('login'); renderAccount(); renderProfile(); if(user.role==='admin') loadAdmin(); }catch(err){ toast(err.message); } });
$('#signupForm').addEventListener('submit', async e=>{ e.preventDefault(); const pwProblem=passwordPolicyProblem($('#signupPassword').value); if(pwProblem){ $('#passwordPolicyHint').classList.add('bad'); toast(pwProblem); return; } try{ const {user, ready=true}=await api('/api/auth/signup',{ name:$('#signupName').value, email:$('#signupEmail').value, password:$('#signupPassword').value, birthDate:$('#signupBirthDate').value, ageConfirmed:$('#ageConfirmed').checked, termsAccepted:$('#termsAccepted').checked, privacyAccepted:$('#privacyAccepted').checked, refundAccepted:$('#refundAccepted').checked, aiConsent:$('#aiConsent').checked, cookieConsent:JSON.parse(localStorage.getItem('astritsa-cookies')||'null') }); state.user=user; state.ready=ready; toast(t('saved')); trackAnalytics('sign_up',{ method:'email' }); trackMarketing('CompleteRegistration'); renderAccount(); renderProfile(); if(user.role==='admin') loadAdmin(); }catch(err){ toast(err.message); } });
$('#profileForm').addEventListener('submit', async e=>{ e.preventDefault(); if(!ensureReady()) return; try{ const {user}=await api('/api/profile', profilePayload()); state.user=user; toast(t('saved')); renderProfile(); renderAccount(); }catch(err){ toast(err.message); } });
$('#signoutBtn').addEventListener('click', async()=>{ await api('/api/auth/signout',{}); state.user=null; state.ready=false; renderAccount(); renderProfile(); });
$('#subscribeBtn').addEventListener('click', async()=>{ if(!ensureReady()) return; try{ const data=await api('/api/billing/checkout',{}); location.href=data.url; }catch(err){ toast(err.message); } });
$('#portalBtn').addEventListener('click', async()=>{ if(!ensureReady()) return; try{ const data=await api('/api/billing/portal',{}); location.href=data.url; }catch(err){ toast(err.message); } });
$('#exportBtn').addEventListener('click', async()=>{ if(!state.user) return; try{ const data=await api('/api/privacy/export', null, 'GET'); const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='astritsa-data-export.json'; a.click(); URL.revokeObjectURL(a.href); }catch(err){ toast(err.message); } });
$('#deleteBtn').addEventListener('click', async()=>{ if(!confirm(t('deleteConfirm'))) return; try{ await api('/api/privacy/delete', null, 'DELETE'); state.user=null; state.ready=false; renderAccount(); renderProfile(); toast(t('saved')); }catch(err){ toast(err.message); } });
$('#contactForm').addEventListener('submit', async e=>{ e.preventDefault(); try{ await api('/api/contact',{ name:$('#contactName').value, email:$('#contactEmail').value, topic:$('#contactTopic').value, message:$('#contactMessage').value, consentToContact:$('#contactConsent').checked }); toast(t('sent')); $('#contactMessage').value=''; if(state.user?.role==='admin') loadAdmin(); }catch(err){ toast(err.message); } });
$('#sourceForm').addEventListener('submit', async e=>{ e.preventDefault(); try{ await api('/api/admin/sources',{ name:$('#sourceName').value, url:$('#sourceUrl').value, language:$('#sourceLanguage').value, active:true }); $('#sourceName').value=''; $('#sourceUrl').value=''; toast(t('saved')); loadAdmin(); }catch(err){ toast(err.message); } });

// ---- consent-gated optional tags ------------------------------------------------
// GA4 (analytics) and Meta Pixel (marketing) load only when BOTH the stored
// cookie consent grants the category AND the server has a tag id configured
// (ANALYTICS_GA4_ID / MARKETING_PIXEL_ID, exposed by /api/config). Withdrawing
// consent updates GA consent mode to denied / revokes the pixel; on the next
// page load a revoked tag is never injected again.
const CONSENT_KEY='astritsa-cookies';
const tagBoot={ analyticsInjected:false, marketingInjected:false, pageViewFired:false, marketingViewFired:false };
function readCookieConsent(){ try{ return JSON.parse(localStorage.getItem(CONSENT_KEY)||'null'); }catch{ return null; } }
function consentFor(cat){ const c=readCookieConsent(); return Boolean(c && c[cat]); }
function analyticsEnabled(){ return Boolean(state.config?.analyticsConfigured && /^G-[A-Z0-9]{6,}$/i.test(state.config.analyticsId||'')); }
function marketingEnabled(){ return Boolean(state.config?.marketingConfigured && /^\d{8,17}$/.test(state.config.marketingId||'')); }
function injectAnalytics(){
  if(tagBoot.analyticsInjected) return true;
  if(!analyticsEnabled()) return false;
  tagBoot.analyticsInjected=true;
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){ window.dataLayer.push(arguments); };
  window.gtag('js',new Date());
  window.gtag('config', state.config.analyticsId);
  const s=document.createElement('script');
  s.async=true; s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(state.config.analyticsId);
  s.setAttribute('data-consent','analytics');
  document.head.appendChild(s);
  return true;
}
function injectMarketing(){
  if(tagBoot.marketingInjected) return true;
  if(!marketingEnabled()) return false;
  tagBoot.marketingInjected=true;
  const id=state.config.marketingId, s=document.createElement('script');
  s.setAttribute('data-consent','marketing');
  s.textContent=`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('consent','grant');`;
  document.head.appendChild(s);
  return true;
}
function trackAnalytics(eventName, params){
  if(!consentFor('analytics') || !analyticsEnabled()) return;
  if(!injectAnalytics()) return;
  window.dataLayer=window.dataLayer||[];
  window.dataLayer.push({ event:eventName, ...(params||{}) });
}
function trackMarketing(eventName, data){
  if(!consentFor('marketing') || !marketingEnabled()) return;
  if(!injectMarketing()) return;
  try{ if(window.fbq) window.fbq('track', eventName, data||{}); }catch{}
}
function applyConsentTags(){
  const consent=readCookieConsent();
  if(!consent || !state.config) return;
  if(consent.analytics && analyticsEnabled()){
    if(!injectAnalytics()) return;
    if(!tagBoot.pageViewFired){ tagBoot.pageViewFired=true; window.dataLayer.push({ event:'page_view' }); }
  } else if(tagBoot.analyticsInjected){
    try{ if(window.gtag) window.gtag('consent','update',{ analytics_storage:'denied', ad_storage:'denied' }); }catch{}
  }
  if(consent.marketing && marketingEnabled()){
    if(!injectMarketing()) return;
    try{
      if(window.fbq){
        window.fbq('consent','grant');
        if(!tagBoot.marketingViewFired){ tagBoot.marketingViewFired=true; window.fbq('track','PageView'); }
      }
    }catch{}
  } else if(tagBoot.marketingInjected){
    try{ if(window.fbq) window.fbq('consent','revoke'); }catch{}
  }
}
function saveCookieConsent(analytics, marketing){
  const consent={ essential:true, analytics, marketing, updatedAt:new Date().toISOString() };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  closeCookieCustomize();
  $('#cookieBanner').hidden=true;
  api('/api/consent/cookies', consent).catch(()=>{});
  applyConsentTags();
}
function openCookieCustomize(){
  const c=readCookieConsent()||{};
  $('#cookieAnalytics').checked=Boolean(c.analytics);
  $('#cookieMarketing').checked=Boolean(c.marketing);
  $('#cookieOptions').hidden=false;
  $('#cookiesEssential').hidden=true;
  $('#cookiesCustomize').hidden=true;
  $('#cookiesAll').hidden=true;
  $('#cookiesSave').hidden=false;
}
function closeCookieCustomize(){
  $('#cookieOptions').hidden=true;
  $('#cookiesEssential').hidden=false;
  $('#cookiesCustomize').hidden=false;
  $('#cookiesAll').hidden=false;
  $('#cookiesSave').hidden=true;
}
function initCookies(){
  if(!readCookieConsent()) $('#cookieBanner').hidden=false;
  $('#cookiesEssential').addEventListener('click',()=>saveCookieConsent(false,false));
  $('#cookiesAll').addEventListener('click',()=>saveCookieConsent(true,true));
  $('#cookiesCustomize').addEventListener('click',openCookieCustomize);
  $('#cookiesSave').addEventListener('click',()=>saveCookieConsent($('#cookieAnalytics').checked, $('#cookieMarketing').checked));
  $('#cookieSettingsBtn').addEventListener('click',()=>{ openCookieCustomize(); $('#cookieBanner').hidden=false; });
}

updateMetaForView();
(async function init(){
  try{ renderCups(); syncCoffeeMode(); applyLanguage(); initCookies(); await Promise.all([loadConfig(), loadSigns(), loadMe(), loadTrends()]); applyLanguage(); syncCoffeeMode(); applyConsentTags(); }catch(err){ console.error(err); toast(err.message); }
})();
