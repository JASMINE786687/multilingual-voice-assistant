// ═══════════════════════════════════════════════════════════
// VAANI — script.js
// Fix: guaranteed multilingual TTS + full offline mode
// ═══════════════════════════════════════════════════════════

const BACKEND = "https://multilingual-voice-assistant-870k.onrender.com";

let resultText   = "";
let selectedLang = "en";
let isListening  = false;
let isSpeaking   = false;

// ── LANGUAGE CONFIG ──
const LANG_CONFIG = {
  "en": { label:"English",  flag:"🇬🇧", tts:"en-IN",  stt:"en-IN"  },
  "ta": { label:"தமிழ்",    flag:"🇮🇳", tts:"ta-IN",  stt:"ta-IN"  },
  "hi": { label:"हिन्दी",   flag:"🇮🇳", tts:"hi-IN",  stt:"hi-IN"  },
  "te": { label:"తెలుగు",   flag:"🇮🇳", tts:"te-IN",  stt:"te-IN"  },
  "kn": { label:"ಕನ್ನಡ",    flag:"🇮🇳", tts:"kn-IN",  stt:"kn-IN"  },
  "ml": { label:"മലയാളം",   flag:"🇮🇳", tts:"ml-IN",  stt:"ml-IN"  },
  "bn": { label:"বাংলা",    flag:"🇮🇳", tts:"bn-IN",  stt:"bn-IN"  },
  "mr": { label:"मराठी",    flag:"🇮🇳", tts:"mr-IN",  stt:"mr-IN"  }
};

// ── SERVICE CONFIG ──
const SERVICE_CONFIG = {
  "ration":            {icon:"🍚",link:"https://www.tnpds.gov.in",           color:"chip-green" },
  "pension":           {icon:"💰",link:"https://ignoaps.gov.in",             color:"chip-blue"  },
  "aadhaar":           {icon:"🪪",link:"https://uidai.gov.in",               color:"chip-purple"},
  "birth_certificate": {icon:"👶",link:"https://crsorgi.gov.in",             color:"chip-green" },
  "voter_id":          {icon:"🗳️",link:"https://voters.eci.gov.in",         color:"chip-blue"  },
  "health_insurance":  {icon:"🏥",link:"https://pmjay.gov.in",               color:"chip-green" },
  "income_certificate":{icon:"📄",link:"https://edistrict.gov.in",          color:"chip-blue"  },
  "land_records":      {icon:"🏞️",link:"https://eservices.tn.gov.in",       color:"chip-purple"},
  "scholarship":       {icon:"🎓",link:"https://scholarships.gov.in",       color:"chip-blue"  },
  "driving_licence":   {icon:"🚗",link:"https://sarathi.parivahan.gov.in",   color:"chip-green" },
  "pan_card":          {icon:"💳",link:"https://www.onlineservices.nsdl.com",color:"chip-purple"},
  "caste_certificate": {icon:"📜",link:"https://edistrict.gov.in",          color:"chip-blue"  }
};

const SERVICE_LABELS = {
  "ration":"Ration Card","pension":"Pension","aadhaar":"Aadhaar",
  "birth_certificate":"Birth Cert.","voter_id":"Voter ID",
  "health_insurance":"Ayushman","income_certificate":"Income Cert.",
  "land_records":"Land Records","scholarship":"Scholarship",
  "driving_licence":"Driving Licence","pan_card":"PAN Card",
  "caste_certificate":"Caste Cert."
};

// ════════════════════════════════════════════════════════════
// OFFLINE DATA  — full English steps stored in-app
// This guarantees offline works even first time (no backend)
// ════════════════════════════════════════════════════════════
const OFFLINE_DB = {
  "ration":{"name":"Ration Card","icon":"🍚","link":"https://www.tnpds.gov.in","steps":["Visit the nearest Civil Supplies office or go to https://tnpds.gov.in","Fill the ration card application form (Form A for new card)","Attach proof of address: Aadhaar card, Voter ID, or Electricity Bill","Attach proof of identity for every family member","Submit the form and collect the acknowledgement slip","An inspector will visit your home for verification within 30 days","Collect your ration card from the office or receive it by post"]},
  "pension":{"name":"Old Age Pension","icon":"💰","link":"https://ignoaps.gov.in","steps":["Eligibility: age 60 or above and BPL (Below Poverty Line) card holder","Get the IGNOAPS application form from Village Panchayat or Block office","Fill the form and attach age proof: birth certificate or Aadhaar","Attach BPL card and identity proof","Submit at the Block Development Office (BDO)","Social welfare officer will verify your details","Rs 200 to Rs 500 per month credited to your bank account after approval"]},
  "aadhaar":{"name":"Aadhaar Card","icon":"🪪","link":"https://uidai.gov.in","steps":["Book an appointment at https://appointments.uidai.gov.in or visit a nearby Aadhaar Seva Kendra","Bring any one of: Passport, Voter ID, Driving Licence, or Ration Card","Fill the Aadhaar Enrolment Form at the centre","Give biometrics: 10 fingerprints, iris scan, and photograph","Collect the acknowledgement slip with your Enrolment ID","Download your e-Aadhaar from https://eaadhaar.uidai.gov.in after 90 days"]},
  "birth_certificate":{"name":"Birth Certificate","icon":"👶","link":"https://crsorgi.gov.in","steps":["For hospital births: hospital gives Form 1, collect within 21 days","For home births: register at the local Municipal or Panchayat office","Submit Form 1 with parents Aadhaar and marriage certificate","Pay the fee: Rs 10 to Rs 50 depending on your state","If registering after 21 days but within 1 year: attach late-registration reason letter","After 1 year: requires an affidavit and Magistrate order","Certificate issued within 7 working days"]},
  "voter_id":{"name":"Voter ID (EPIC)","icon":"🗳️","link":"https://voters.eci.gov.in","steps":["Visit https://voters.eci.gov.in or use the Voter Helpline App","Fill Form 6 for new registration, you must be 18 or above","Upload or submit proof of age and proof of address","Booth Level Officer (BLO) will verify your address","Your name appears on the electoral roll after verification","Collect your Voter ID card from BLO or download e-EPIC from the portal"]},
  "health_insurance":{"name":"Ayushman Bharat (PMJAY)","icon":"🏥","link":"https://pmjay.gov.in","steps":["Check eligibility at https://mera.pmjay.gov.in using Aadhaar or Ration Card number","If eligible, visit the nearest government or empanelled private hospital","Carry your Aadhaar card, no other document needed for eligible families","Hospital Ayushman Mitra will verify your eligibility online","Get your Ayushman card issued at the hospital, completely free","Covers Rs 5 lakh per family per year for 1500 plus treatments","No payment needed, cashless treatment at empanelled hospitals"]},
  "income_certificate":{"name":"Income Certificate","icon":"📄","link":"https://edistrict.gov.in","steps":["Visit the e-District portal of your state or the nearest CSC","Fill the income certificate application form","Attach salary slips for salaried persons or self-declaration for farmers","Attach Aadhaar card and address proof","Pay the application fee: Rs 10 to Rs 30 depending on state","Revenue Inspector verifies and recommends to Tahsildar","Certificate issued within 15 working days"]},
  "land_records":{"name":"Land Records (Patta)","icon":"🏞️","link":"https://eservices.tn.gov.in","steps":["Visit https://eservices.tn.gov.in for Tamil Nadu or your state land portal","Select Patta or Chitta or Land Records service","Enter your district, taluk, village, and survey number","Download and print the Patta document, Rs 60 fee online","For name transfer after sale or inheritance: visit Taluk office with sale deed","Submit Form 1A with parent document and ID proof","Mutation (name change) processed within 30 days"]},
  "scholarship":{"name":"Government Scholarship","icon":"🎓","link":"https://scholarships.gov.in","steps":["Visit https://scholarships.gov.in, the National Scholarship Portal","Register with your Aadhaar number and mobile number","Select the right scholarship scheme: SC, ST, OBC, Minority, or Merit","Fill the application form with academic details and upload marksheets","Upload income certificate, caste certificate, and bank passbook","Submit before the deadline, usually October to November each year","Track your application on the portal, amount directly credited to bank"]},
  "driving_licence":{"name":"Driving Licence","icon":"🚗","link":"https://sarathi.parivahan.gov.in","steps":["Apply for Learner Licence first at https://sarathi.parivahan.gov.in","Fill Form 1 (medical self-declaration) and Form 2 (learner licence)","Book a slot for the online learner licence test on traffic rules","Pass the computer-based test at the RTO","After holding the LL for minimum 30 days, apply for Driving Licence","Visit RTO on appointment date with LL, Aadhaar, and passport-size photos","Pass the practical driving test, DL issued in 7 days or by post"]},
  "pan_card":{"name":"PAN Card","icon":"💳","link":"https://www.onlineservices.nsdl.com","steps":["Apply online at https://www.onlineservices.nsdl.com (NSDL) or utiitsl.com","Fill Form 49A for Indian citizens","Upload proof of identity, proof of address, and proof of date of birth","Pay the fee: Rs 107 for physical PAN card delivered by post","Submit and note your 15-digit acknowledgement number","e-PAN (digital) is emailed within 24 to 48 hours","Physical PAN card delivered to registered address in 15 to 20 days"]},
  "caste_certificate":{"name":"Caste Certificate","icon":"📜","link":"https://edistrict.gov.in","steps":["Visit the e-District portal of your state or nearest CSC","Select Caste Certificate service","Fill the application form with your community details","Attach father caste certificate or school leaving certificate showing community","Attach Aadhaar card, address proof, and passport-size photo","Pay the fee: Rs 10 to Rs 30 depending on state","Revenue Inspector verifies and Tahsildar issues certificate in 15 days"]}
};

// Keyword detection for offline mode
const KEYWORD_MAP = {
  "ration":["ration","food card","ரேஷன்","राशन","రేషన్","ಪಡಿತರ","റേഷൻ","রেশন"],
  "pension":["pension","old age","ஓய்வூதியம்","पेंशन","పెన్షన్","ನಿವೃತ್ತಿ","পেনশন"],
  "aadhaar":["aadhaar","aadhar","uid","ஆதார்","आधार","ఆధార్","ಆಧಾರ್","আধার"],
  "birth_certificate":["birth","born","பிறப்பு","जन्म","జన్మ","ಜನನ","জন্ম"],
  "voter_id":["voter","election","epic","வாக்காளர்","मतदाता","ఓటర్","ಮತದಾರ","ভোটার"],
  "health_insurance":["health","ayushman","pmjay","hospital","மருத்துவம்","आयुष्मान","ఆయుష్మాన్","স্বাস্থ্য"],
  "income_certificate":["income","salary","வருமானம்","आय प्रमाण","ఆదాయం","ಆದಾಯ","আয়"],
  "land_records":["land","patta","chitta","நிலம்","भूमि","భూమి","ಭೂಮಿ","জমি"],
  "scholarship":["scholarship","study","student","கல்வி","छात्रवृत्ति","స్కాలర్షిప్","বৃত্তি"],
  "driving_licence":["driving","licence","license","ஓட்டுநர்","ड्राइविंग","డ్రైవింగ్","ಚಾಲನೆ","ড্রাইভিং"],
  "pan_card":["pan card"," pan ","income tax","பான்","पैन","పాన్","ಪ್ಯಾನ್","প্যান"],
  "caste_certificate":["caste","community"," sc "," st ","obc","சாதி","जाति","కులం","ಜಾತಿ","জাতি"]
};

function detectOffline(text) {
  const lower = " " + text.toLowerCase().trim() + " ";
  for (const [key, kws] of Object.entries(KEYWORD_MAP)) {
    if (kws.some(kw => lower.includes(kw.toLowerCase()))) return key;
  }
  return null;
}

// localStorage cache for translated results
const LS_KEY = "vaani_cache_v2";
function lsSet(k, v) { try { const c = JSON.parse(localStorage.getItem(LS_KEY)||"{}"); c[k]=v; localStorage.setItem(LS_KEY,JSON.stringify(c)); } catch {} }
function lsGet(k)    { try { return JSON.parse(localStorage.getItem(LS_KEY)||"{}")[k]||null; } catch { return null; } }

// ════════════════════════════════════════════════════════════
// ON LOAD
// ════════════════════════════════════════════════════════════
window.onload = function () {
  registerServiceWorker();
  checkServerStatus();
  animateStatsOnLoad();
  buildLanguagePills();
  populateServicesGrid();
  setupOfflineDetection();
  warmupTTS();
};

// ── REGISTER SERVICE WORKER ──
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").then(reg => {
      console.log("SW registered:", reg.scope);
    }).catch(err => console.warn("SW registration failed:", err));
  }
}

// ── PRE-WARM TTS ──
// Chrome needs getVoices() called early so they load before first use
function warmupTTS() {
  if (!window.speechSynthesis) return;
  const v = window.speechSynthesis.getVoices();
  if (v.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      console.log("TTS voices loaded:", window.speechSynthesis.getVoices().length);
      window.speechSynthesis.onvoiceschanged = null;
    };
  } else {
    console.log("TTS voices ready:", v.length);
  }
}

// ── OFFLINE BANNER ──
function setupOfflineDetection() {
  const banner = document.getElementById("offlineBanner");
  const update = () => {
    if (banner) banner.style.display = navigator.onLine ? "none" : "block";
  };
  window.addEventListener("online",  update);
  window.addEventListener("offline", update);
  update();
}

// ── SERVER STATUS ──
async function checkServerStatus() {
  const txt = document.querySelector('.status-text');
  const dot = document.querySelector('.status-dot');
  if (!txt || !dot) return;
  try {
    const res = await fetch(BACKEND + "/", {signal: AbortSignal.timeout(5000)});
    if (res.ok) { txt.innerText="Server Live"; dot.style.background="#00ff88"; }
    else throw new Error();
  } catch {
    txt.innerText="Server Offline"; dot.style.background="#ff6b6b"; dot.style.animation="none";
  }
}

// ── ANIMATE STATS ──
function animateStatsOnLoad() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.innerText) || 0;
    if (target === 0) return;
    let cur = 0, step = Math.ceil(target/20);
    const iv = setInterval(() => {
      cur += step;
      if (cur >= target) { el.innerText = target+"+"; clearInterval(iv); }
      else el.innerText = cur;
    }, 60);
  });
}

// ════════════════════════════════════════════════════════════
// LANGUAGE PILLS
// ════════════════════════════════════════════════════════════
function buildLanguagePills() {
  const row = document.getElementById("langPillsRow");
  if (!row) return;
  row.innerHTML = "";
  Object.entries(LANG_CONFIG).forEach(([code, cfg], i) => {
    const btn = document.createElement("button");
    btn.className = "lang-pill" + (i===0?" active":"");
    btn.id        = "pill-"+code;
    btn.innerText = cfg.flag+" "+cfg.label;
    btn.onclick   = () => setLang(code, btn);
    row.appendChild(btn);
  });
}

function setLang(lang, btn) {
  selectedLang = lang;
  document.querySelectorAll('.lang-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  stopSpeaking();
  showToast("🌐 "+LANG_CONFIG[lang].label+" selected");
}

// ════════════════════════════════════════════════════════════
// SERVICES GRID
// ════════════════════════════════════════════════════════════
function populateServicesGrid() {
  const grid = document.getElementById("servicesGrid");
  if (!grid) return;
  grid.innerHTML = "";
  Object.entries(SERVICE_CONFIG).forEach(([key, cfg]) => {
    const chip = document.createElement("div");
    chip.className = `service-chip ${cfg.color}`;
    chip.onclick   = () => quickSearch(key);
    chip.innerHTML = `<span class="chip-icon">${cfg.icon}</span><span class="chip-text">${SERVICE_LABELS[key]}</span>`;
    grid.appendChild(chip);
  });
}

function quickSearch(keyword) {
  const input = document.getElementById('textInput');
  if (!input) return;
  input.value = keyword;
  input.style.borderColor="#00ff88"; input.style.boxShadow="0 0 0 3px rgba(0,255,136,0.2)";
  setTimeout(()=>{input.style.borderColor="";input.style.boxShadow="";},800);
  sendText();
}

// ════════════════════════════════════════════════════════════
// VOICE INPUT
// ════════════════════════════════════════════════════════════
function startVoice() {
  if (isListening) return;
  const btn  = document.getElementById("micBtn");
  const bars = document.getElementById("voiceBars");
  const SR   = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    setStatus("⚠️ Voice only works in Chrome!", "error");
    showToast("❌ Please open in Chrome");
    return;
  }
  const rec = new SR();
  rec.continuous=false; rec.interimResults=false; rec.maxAlternatives=1;
  rec.lang = LANG_CONFIG[selectedLang]?.stt || "en-IN";

  isListening = true;
  if (btn)  btn.classList.add("listening");
  if (bars) bars.classList.add("active");
  setStatus("🎤 Listening in "+LANG_CONFIG[selectedLang].label+"...", "listening");

  rec.onresult = e => {
    const spoken = e.results[0][0].transcript;
    const conf   = Math.round(e.results[0][0].confidence*100);
    const inp    = document.getElementById("textInput");
    if (inp) inp.value = spoken;
    setStatus("✅ Heard: "+spoken+" ("+conf+"%)", "success");
    isListening=false;
    if(btn) btn.classList.remove("listening");
    if(bars) bars.classList.remove("active");
    setTimeout(()=>sendText(),400);
  };
  rec.onerror = e => {
    isListening=false;
    if(btn) btn.classList.remove("listening");
    if(bars) bars.classList.remove("active");
    const ERRS={"no-speech":"❌ No speech. Try again!","audio-capture":"❌ Mic not found!","not-allowed":"❌ Allow microphone!","network":"❌ Network error!"};
    setStatus(ERRS[e.error]||"❌ "+e.error,"error");
  };
  rec.onend = ()=>{
    isListening=false;
    if(btn) btn.classList.remove("listening");
    if(bars) bars.classList.remove("active");
  };
  rec.start();
}

// ════════════════════════════════════════════════════════════
// SEND TEXT — online fetches from backend, offline uses OFFLINE_DB
// ════════════════════════════════════════════════════════════
async function sendText() {
  const raw = document.getElementById("textInput")?.value.trim();
  if (!raw) { shakeInput(); return; }

  setStatus("🔍 Searching...", "loading");
  showLoadingInResult();
  hideError();

  const cacheKey = raw.toLowerCase().trim()+"_"+selectedLang;

  // ── OFFLINE: use built-in OFFLINE_DB first ──
  if (!navigator.onLine) {
    serveOffline(raw, cacheKey);
    return;
  }

  // ── ONLINE: fetch from backend ──
  try {
    const res  = await fetch(BACKEND+"/get_service", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({text:raw, target_lang:selectedLang}),
      signal: AbortSignal.timeout(15000)
    });
    const data = await res.json();

    if (!data.success) {
      hideResult();
      showError("❌ "+(data.message||"Service not found."));
      setStatus("Tap mic to speak","normal");
      return;
    }

    // Cache the translated result
    lsSet(cacheKey, data);

    buildResultText(data.service, data.steps);
    showResult(data.service, data.steps, data.icon, data.link, data.service_key);
    setStatus("✅ Here are your steps!", "success");
    setTimeout(()=>speakResult(),800);

  } catch {
    // Network error — try localStorage cache, then OFFLINE_DB
    const cached = lsGet(cacheKey);
    if (cached) {
      buildResultText(cached.service, cached.steps);
      showResult(cached.service, cached.steps, cached.icon, cached.link, cached.service_key);
      setStatus("⚠️ Using cached result","success");
      setTimeout(()=>speakResult(),600);
      return;
    }
    serveOffline(raw, cacheKey);
  }
}

function serveOffline(raw, cacheKey) {
  // 1. Try localStorage translated cache
  const cached = lsGet(cacheKey);
  if (cached) {
    buildResultText(cached.service, cached.steps);
    showResult(cached.service, cached.steps, cached.icon, cached.link, cached.service_key);
    setStatus("📵 Offline — cached result","success");
    setTimeout(()=>speakResult(),600);
    return;
  }

  // 2. Use built-in OFFLINE_DB (always works, English)
  const key = detectOffline(raw);
  if (key && OFFLINE_DB[key]) {
    const svc = OFFLINE_DB[key];
    buildResultText(svc.name, svc.steps);
    showResult(svc.name, svc.steps, svc.icon, svc.link, key);
    setStatus("📵 Offline mode — English steps shown","success");
    showToast("📵 Offline: select language online for translation");
    setTimeout(()=>speakResult(),600);
    return;
  }

  hideResult();
  showError("📵 Offline — service not recognized. Try: ration, aadhaar, voter, health, pan...");
  setStatus("Offline","error");
}

function buildResultText(name, steps) {
  resultText = name + ". " + steps.join(". ") + ".";
}

// ════════════════════════════════════════════════════════════
// SHOW RESULT
// ════════════════════════════════════════════════════════════
function showResult(name, steps, icon, link, serviceKey) {
  document.getElementById("serviceName").innerText = name;
  const iconEl = document.querySelector('.result-icon');
  if (iconEl) iconEl.innerText = icon||SERVICE_CONFIG[serviceKey]?.icon||"📋";

  const list = document.getElementById("stepsList");
  list.innerHTML = "";
  steps.forEach((step,i) => {
    const li = document.createElement("li");
    li.innerText = step;
    li.style.cssText=`opacity:0;transform:translateX(-10px);transition:opacity 0.3s ${i*0.08}s,transform 0.3s ${i*0.08}s`;
    list.appendChild(li);
    setTimeout(()=>{li.style.opacity="1";li.style.transform="translateX(0)";},50);
  });

  const linkEl = document.getElementById("govLink");
  const lnk    = link||SERVICE_CONFIG[serviceKey]?.link;
  if (lnk) { linkEl.href=lnk; linkEl.style.display="inline-block"; }
  else       linkEl.style.display="none";

  const rb = document.getElementById("resultBox");
  rb.style.display="block"; rb.style.animation="none";
  void rb.offsetWidth; rb.style.animation="fadeUp 0.4s ease both";
  setTimeout(()=>rb.scrollIntoView({behavior:"smooth",block:"nearest"}),200);
  showToast("✅ "+name+" loaded!");
}

// ════════════════════════════════════════════════════════════
// TTS — GUARANTEED MULTILINGUAL FIX
// Root cause: Chrome loads voices async. We use a smart
// retry + 4-level voice fallback to guarantee speech works
// ════════════════════════════════════════════════════════════
function speakResult() {
  if (!resultText) return;
  speakText(resultText);
}

function speakText(text) {
  if (!text || !window.speechSynthesis) return;
  stopSpeaking();

  const ttsLang   = LANG_CONFIG[selectedLang]?.tts || "en-IN";
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang   = ttsLang;
  utterance.rate   = 0.83;
  utterance.pitch  = 1.0;
  utterance.volume = 1.0;

  const speakBtn = document.getElementById("speakBtn");
  const stopBtn  = document.getElementById("stopBtn");

  utterance.onstart = () => {
    isSpeaking = true;
    if (speakBtn) { speakBtn.innerText="🔊 Speaking..."; speakBtn.style.background="rgba(168,85,247,0.3)"; }
    if (stopBtn)  stopBtn.style.display="inline-block";
  };
  const onDone = () => {
    isSpeaking = false;
    if (speakBtn) { speakBtn.innerText="🔊 Read Aloud"; speakBtn.style.background=""; }
    if (stopBtn)  stopBtn.style.display="none";
  };
  utterance.onend   = onDone;
  utterance.onerror = onDone;

  // ── CORE FIX: 4-level voice selection ──
  function selectVoiceAndSpeak() {
    const voices = window.speechSynthesis.getVoices();
    const prefix = ttsLang.split("-")[0]; // e.g. "ta" from "ta-IN"

    let voice =
      // Level 1: exact lang match e.g. "ta-IN"
      voices.find(v => v.lang === ttsLang) ||
      // Level 2: same language, any region e.g. "ta-SG"
      voices.find(v => v.lang.startsWith(prefix+"-")) ||
      // Level 3: bare language code
      voices.find(v => v.lang === prefix) ||
      // Level 4: Google/Microsoft voice with language in name
      voices.find(v => v.name.toLowerCase().includes(prefix)) ||
      // Level 5: any English voice (guaranteed fallback)
      voices.find(v => v.lang.startsWith("en"));

    if (voice) {
      utterance.voice = voice;
      console.log(`TTS [${ttsLang}]: using voice "${voice.name}" (${voice.lang})`);
    } else {
      console.warn(`TTS: no voice for ${ttsLang}, using browser default`);
    }
    window.speechSynthesis.speak(utterance);
  }

  // If voices not yet loaded, wait — otherwise speak immediately
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    console.log("TTS: waiting for voices to load...");
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      selectVoiceAndSpeak();
    };
  } else {
    selectVoiceAndSpeak();
  }
}

function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  isSpeaking = false;
  const speakBtn = document.getElementById("speakBtn");
  const stopBtn  = document.getElementById("stopBtn");
  if (speakBtn) { speakBtn.innerText="🔊 Read Aloud"; speakBtn.style.background=""; }
  if (stopBtn)  stopBtn.style.display="none";
}

// ════════════════════════════════════════════════════════════
// AI AGENT
// ════════════════════════════════════════════════════════════
let agentOpen = false;

function toggleAgent() {
  agentOpen = !agentOpen;
  const panel = document.getElementById("agentPanel");
  if (agentOpen) { panel.classList.add("open"); document.getElementById("agentInput")?.focus(); }
  else             panel.classList.remove("open");
}

async function agentSend() {
  const inp = document.getElementById("agentInput");
  const q   = inp?.value.trim();
  if (!q) return;
  inp.value = "";
  agentAsk(q);
}

async function agentAsk(question) {
  addAgentMsg(question, "user");

  const typingEl = document.createElement("div");
  typingEl.className = "msg-typing";
  typingEl.id = "agentTyping";
  typingEl.innerText = "✦ Thinking...";
  document.getElementById("agentMessages").appendChild(typingEl);
  scrollAgentBottom();

  let answer = "";

  try {
    if (!navigator.onLine) throw new Error("offline");
    const res  = await fetch(BACKEND+"/agent", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({question, lang:selectedLang}),
      signal: AbortSignal.timeout(10000)
    });
    const data = await res.json();
    answer = data.answer || "Sorry, I could not answer that.";
  } catch {
    answer = localAgentAnswer(question);
  }

  document.getElementById("agentTyping")?.remove();
  addAgentMsg(answer, "bot");
  speakText(answer);
}

// Offline local agent — covers all main questions
function localAgentAnswer(q) {
  const l = q.toLowerCase();
  if (l.includes("aadhaar")||l.includes("aadhar"))
    return "Aadhaar: visit uidai.gov.in or Aadhaar Seva Kendra. Give fingerprints and iris scan. Download e-Aadhaar after 90 days. Free.";
  if (l.includes("ration")||l.includes("food"))
    return "Ration Card: visit Civil Supplies office, fill Form A, attach Aadhaar and address proof. Inspector visits in 30 days.";
  if (l.includes("pension")||l.includes("old age"))
    return "Old Age Pension: must be 60+ and BPL holder. Apply at Panchayat or BDO. Rs 200-500 per month after approval.";
  if (l.includes("voter")||l.includes("election"))
    return "Voter ID: voters.eci.gov.in, fill Form 6, must be 18+. BLO verifies address. Download e-EPIC. Free.";
  if (l.includes("pan"))
    return "PAN Card: onlineservices.nsdl.com, fill Form 49A, pay Rs 107. e-PAN in 48 hours.";
  if (l.includes("ayushman")||l.includes("health")||l.includes("pmjay"))
    return "Ayushman Bharat: check at mera.pmjay.gov.in. Rs 5 lakh/year coverage. Cashless and completely free.";
  if (l.includes("driving")||l.includes("licence"))
    return "Driving Licence: sarathi.parivahan.gov.in. Get Learner Licence, wait 30 days, pass practical test. DL in 7 days.";
  if (l.includes("scholarship")||l.includes("study"))
    return "Scholarship: scholarships.gov.in. Register with Aadhaar, choose SC/ST/OBC/Merit scheme, submit by November.";
  if (l.includes("birth"))
    return "Birth Certificate: Form 1 from hospital within 21 days. Municipal office for home births. Certificate in 7 days.";
  if (l.includes("land")||l.includes("patta")||l.includes("chitta"))
    return "Land Records: eservices.tn.gov.in for TN or your state portal. Download Patta online for Rs 60.";
  if (l.includes("income")||l.includes("salary"))
    return "Income Certificate: e-District portal or CSC. Attach salary slips or self-declaration. Fee Rs 10-30. Ready in 15 days.";
  if (l.includes("caste")||l.includes("community")||l.includes("sc")||l.includes("st")||l.includes("obc"))
    return "Caste Certificate: e-District portal or CSC. Attach father caste cert and Aadhaar. Issued in 15 days.";
  if (l.includes("document")||l.includes("paper"))
    return "Common documents: Aadhaar Card, Passport photos, Address proof (electricity bill or bank passbook).";
  if (l.includes("fee")||l.includes("cost")||l.includes("free")||l.includes("money"))
    return "Fees: Aadhaar free, Voter ID free, Ayushman free. PAN Rs 107, Land Rs 60, Birth/Caste/Income Rs 10-50.";
  if (l.includes("time")||l.includes("day")||l.includes("long")||l.includes("when"))
    return "Times: Aadhaar 90 days, Birth 7 days, Caste/Income 15 days, Ration 30 days, PAN 15-20 days, DL 7 days.";
  if (l.includes("offline")||l.includes("internet")||l.includes("network"))
    return "VAANI works fully offline! All 12 services are built into the app. Select your service even without internet.";
  if (l.includes("language")||l.includes("tamil")||l.includes("hindi")||l.includes("telugu"))
    return "VAANI supports 8 languages: English, Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, and Marathi. Select from the language pills at the top.";
  return "I can help with all 12 services: Ration Card, Aadhaar, Pension, Voter ID, Ayushman Health, PAN Card, Driving Licence, Scholarship, Birth Certificate, Land Records, Income Certificate, Caste Certificate. Just ask!";
}

function addAgentMsg(text, type) {
  const el = document.createElement("div");
  el.className = type==="user"?"msg-user":"msg-bot";
  el.innerText = text;
  document.getElementById("agentMessages").appendChild(el);
  scrollAgentBottom();
}

function scrollAgentBottom() {
  const m = document.getElementById("agentMessages");
  if (m) m.scrollTop = m.scrollHeight;
}

// ════════════════════════════════════════════════════════════
// FEEDBACK
// ════════════════════════════════════════════════════════════
async function sendFeedback(rating) {
  const sn = document.getElementById("serviceName")?.innerText;
  if (!sn) return;
  try {
    await fetch(BACKEND+"/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service:sn,rating,comment:""})});
  } catch {}
  const u=document.getElementById("thumbsUp"), d=document.getElementById("thumbsDown");
  if (rating==="helpful"){if(u)u.style.background="rgba(0,255,136,0.3)";if(d)d.style.background="";showToast("👍 Thank you!");}
  else{if(d)d.style.background="rgba(255,107,107,0.3)";if(u)u.style.background="";showToast("👎 We will improve!");}
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
function setStatus(msg,type){
  const el=document.getElementById("status"); if(!el)return;
  el.innerText=msg;
  const c={success:"#00ff88",error:"#ff6b6b",loading:"#00b4ff",listening:"#a855f7",normal:"#6b8cba"};
  el.style.color=c[type]||"#6b8cba";
}
function showError(msg){
  const el=document.getElementById("errorBox"); if(!el)return;
  el.innerText=msg; el.style.animation="none"; void el.offsetWidth; el.style.animation="fadeUp 0.3s ease";
  setTimeout(()=>{el.innerText="";},6000);
}
function hideError(){const el=document.getElementById("errorBox");if(el)el.innerText="";}
function shakeInput(){
  const el=document.getElementById("textInput"); if(!el)return;
  el.style.borderColor="#ff6b6b"; el.style.transform="translateX(-6px)";
  setTimeout(()=>el.style.transform="translateX(6px)",100);
  setTimeout(()=>el.style.transform="translateX(-4px)",200);
  setTimeout(()=>el.style.transform="translateX(0)",300);
  setTimeout(()=>el.style.borderColor="",800);
}
function showLoadingInResult(){
  const sn=document.getElementById("serviceName"),sl=document.getElementById("stepsList"),rb=document.getElementById("resultBox");
  if(sn)sn.innerText="Loading...";
  if(sl)sl.innerHTML=`<li style="opacity:0.5;">Fetching in ${LANG_CONFIG[selectedLang].label}...</li><li style="opacity:0.3;">Please wait...</li>`;
  if(rb)rb.style.display="block";
}
function hideResult(){const rb=document.getElementById("resultBox");if(rb)rb.style.display="none";}
function showToast(msg){
  const ex=document.getElementById("toast"); if(ex)ex.remove();
  const t=document.createElement("div"); t.id="toast"; t.innerText=msg;
  t.style.cssText="position:fixed;bottom:100px;left:50%;transform:translateX(-50%) translateY(20px);background:linear-gradient(135deg,#0d1425,#111c35);border:1px solid rgba(0,255,136,0.3);color:#00ff88;padding:12px 24px;border-radius:100px;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;z-index:400;opacity:0;transition:all 0.3s ease;box-shadow:0 8px 32px rgba(0,0,0,0.4);white-space:nowrap;pointer-events:none;";
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity="1";t.style.transform="translateX(-50%) translateY(0)";},10);
  setTimeout(()=>{t.style.opacity="0";t.style.transform="translateX(-50%) translateY(10px)";setTimeout(()=>t.remove(),300);},2800);
}