// ═══════════════════════════════════════════════════════════
// VAANI — script.js
// Features: 8-language TTS/STT, AI agent, offline cache, 12 services
// ═══════════════════════════════════════════════════════════

const BACKEND = "https://multilingual-voice-assistant-870k.onrender.com";

let resultText   = "";
let selectedLang = "en";
let isListening  = false;
let isSpeaking   = false;

// ── LANGUAGE CONFIG ──
const LANG_CONFIG = {
  "en": { label: "English",  flag: "🇬🇧", tts: "en-IN",  stt: "en-IN"  },
  "ta": { label: "தமிழ்",    flag: "🇮🇳", tts: "ta-IN",  stt: "ta-IN"  },
  "hi": { label: "हिन्दी",   flag: "🇮🇳", tts: "hi-IN",  stt: "hi-IN"  },
  "te": { label: "తెలుగు",   flag: "🇮🇳", tts: "te-IN",  stt: "te-IN"  },
  "kn": { label: "ಕನ್ನಡ",    flag: "🇮🇳", tts: "kn-IN",  stt: "kn-IN"  },
  "ml": { label: "മലയാളം",   flag: "🇮🇳", tts: "ml-IN",  stt: "ml-IN"  },
  "bn": { label: "বাংলা",    flag: "🇮🇳", tts: "bn-IN",  stt: "bn-IN"  },
  "mr": { label: "मराठी",    flag: "🇮🇳", tts: "mr-IN",  stt: "mr-IN"  }
};

// ── SERVICE CONFIG ──
const SERVICE_CONFIG = {
  "ration":            { icon:"🍚", link:"https://www.tnpds.gov.in",            color:"chip-green"  },
  "pension":           { icon:"💰", link:"https://ignoaps.gov.in",              color:"chip-blue"   },
  "aadhaar":           { icon:"🪪", link:"https://uidai.gov.in",                color:"chip-purple" },
  "birth_certificate": { icon:"👶", link:"https://crsorgi.gov.in",              color:"chip-green"  },
  "voter_id":          { icon:"🗳️", link:"https://voters.eci.gov.in",          color:"chip-blue"   },
  "health_insurance":  { icon:"🏥", link:"https://pmjay.gov.in",                color:"chip-green"  },
  "income_certificate":{ icon:"📄", link:"https://edistrict.gov.in",           color:"chip-blue"   },
  "land_records":      { icon:"🏞️", link:"https://eservices.tn.gov.in",        color:"chip-purple" },
  "scholarship":       { icon:"🎓", link:"https://scholarships.gov.in",        color:"chip-blue"   },
  "driving_licence":   { icon:"🚗", link:"https://sarathi.parivahan.gov.in",    color:"chip-green"  },
  "pan_card":          { icon:"💳", link:"https://www.onlineservices.nsdl.com", color:"chip-purple" },
  "caste_certificate": { icon:"📜", link:"https://edistrict.gov.in",           color:"chip-blue"   }
};

const SERVICE_LABELS = {
  "ration":"Ration Card","pension":"Pension","aadhaar":"Aadhaar",
  "birth_certificate":"Birth Cert.","voter_id":"Voter ID",
  "health_insurance":"Ayushman","income_certificate":"Income Cert.",
  "land_records":"Land Records","scholarship":"Scholarship",
  "driving_licence":"Driving Licence","pan_card":"PAN Card",
  "caste_certificate":"Caste Cert."
};

// ── OFFLINE CACHE (localStorage) ──
const CACHE_KEY = "vaani_service_cache";
function cacheSet(key, data) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    cache[key] = data;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}
function cacheGet(key) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    return cache[key] || null;
  } catch { return null; }
}

// ══════════════════════════════════════════════════════════
// ON LOAD
// ══════════════════════════════════════════════════════════
window.onload = function () {
  checkServerStatus();
  animateStatsOnLoad();
  buildLanguagePills();
  populateServicesGrid();
  setupOfflineDetection();
  // Pre-warm TTS voices
  if (window.speechSynthesis) window.speechSynthesis.getVoices();
};

// ── OFFLINE DETECTION ──
function setupOfflineDetection() {
  const banner = document.getElementById("offlineBanner");
  function update() {
    if (banner) banner.style.display = navigator.onLine ? "none" : "block";
  }
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
    const res = await fetch(BACKEND + "/", { signal: AbortSignal.timeout(5000) });
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
    let current = 0;
    const step = Math.ceil(target / 20);
    const iv = setInterval(() => {
      current += step;
      if (current >= target) { el.innerText = target + "+"; clearInterval(iv); }
      else el.innerText = current;
    }, 60);
  });
}

// ══════════════════════════════════════════════════════════
// LANGUAGE PILLS
// ══════════════════════════════════════════════════════════
function buildLanguagePills() {
  const row = document.getElementById("langPillsRow");
  if (!row) return;
  row.innerHTML = "";
  Object.entries(LANG_CONFIG).forEach(([code, cfg], i) => {
    const btn = document.createElement("button");
    btn.className = "lang-pill" + (i === 0 ? " active" : "");
    btn.id        = "pill-" + code;
    btn.innerText = cfg.flag + " " + cfg.label;
    btn.onclick   = () => setLang(code, btn);
    row.appendChild(btn);
  });
}

function setLang(lang, btn) {
  selectedLang = lang;
  document.querySelectorAll('.lang-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  showToast("🌐 " + LANG_CONFIG[lang].label + " selected");
  // Stop any ongoing speech when language changes
  stopSpeaking();
}

// ══════════════════════════════════════════════════════════
// SERVICES GRID
// ══════════════════════════════════════════════════════════
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
  input.style.borderColor = "#00ff88";
  input.style.boxShadow   = "0 0 0 3px rgba(0,255,136,0.2)";
  setTimeout(() => { input.style.borderColor=""; input.style.boxShadow=""; }, 800);
  sendText();
}

// ══════════════════════════════════════════════════════════
// VOICE INPUT  — Chrome Web Speech API (100% free)
// MUST select language pill BEFORE pressing mic
// ══════════════════════════════════════════════════════════
function startVoice() {
  if (isListening) return;

  const btn  = document.getElementById("micBtn");
  const bars = document.getElementById("voiceBars");
  const SR   = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    setStatus("⚠️ Voice only works in Chrome!", "error");
    showToast("❌ Please open this site in Chrome");
    return;
  }

  const rec           = new SR();
  rec.continuous      = false;
  rec.interimResults  = false;
  rec.maxAlternatives = 1;
  rec.lang            = LANG_CONFIG[selectedLang]?.stt || "en-IN";

  isListening = true;
  if (btn)  btn.classList.add("listening");
  if (bars) bars.classList.add("active");
  setStatus("🎤 Listening in " + LANG_CONFIG[selectedLang].label + "...", "listening");

  rec.onresult = function (e) {
    const spoken = e.results[0][0].transcript;
    const conf   = Math.round(e.results[0][0].confidence * 100);
    const input  = document.getElementById("textInput");
    if (input) input.value = spoken;
    setStatus("✅ Heard: " + spoken + " (" + conf + "%)", "success");
    isListening = false;
    if (btn)  btn.classList.remove("listening");
    if (bars) bars.classList.remove("active");
    setTimeout(() => sendText(), 400);
  };

  rec.onerror = function (e) {
    isListening = false;
    if (btn)  btn.classList.remove("listening");
    if (bars) bars.classList.remove("active");
    const ERRS = {
      "no-speech":     "❌ No speech detected. Try again!",
      "audio-capture": "❌ Microphone not found!",
      "not-allowed":   "❌ Allow microphone in Chrome settings!",
      "network":       "❌ Network error!"
    };
    setStatus(ERRS[e.error] || "❌ " + e.error, "error");
  };

  rec.onend = function () {
    isListening = false;
    if (btn)  btn.classList.remove("listening");
    if (bars) bars.classList.remove("active");
  };

  rec.start();
}

// ══════════════════════════════════════════════════════════
// SEND TEXT  — with offline fallback from cache
// ══════════════════════════════════════════════════════════
async function sendText() {
  const raw = document.getElementById("textInput")?.value.trim();
  if (!raw) { shakeInput(); return; }

  setStatus("🔍 Searching...", "loading");
  showLoadingInResult();
  hideError();

  const cacheKey = raw.toLowerCase().trim() + "_" + selectedLang;

  // If offline — serve from cache
  if (!navigator.onLine) {
    const cached = cacheGet(cacheKey);
    if (cached) {
      resultText = cached.service + ". " + cached.steps.join(". ");
      showResult(cached.service, cached.steps, cached.icon, cached.link, cached.service_key);
      setStatus("📵 Offline — showing cached result", "success");
      setTimeout(() => speakResult(), 600);
      return;
    }
    hideResult();
    showError("📵 Offline and no cache found. Connect to internet and search once first.");
    setStatus("No internet", "error");
    return;
  }

  try {
    const res  = await fetch(BACKEND + "/get_service", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text: raw, target_lang: selectedLang }),
      signal:  AbortSignal.timeout(15000)
    });
    const data = await res.json();

    if (!data.success) {
      hideResult();
      showError("❌ " + (data.message || "Service not found."));
      setStatus("Tap mic to speak", "normal");
      return;
    }

    // Cache for offline use
    cacheSet(cacheKey, data);

    resultText = data.service + ". " + data.steps.join(". ") + ".";
    showResult(data.service, data.steps, data.icon, data.link, data.service_key);
    setStatus("✅ Here are your steps!", "success");
    setTimeout(() => speakResult(), 800);

  } catch (err) {
    // Try cache on timeout
    const cached = cacheGet(cacheKey);
    if (cached) {
      resultText = cached.service + ". " + cached.steps.join(". ");
      showResult(cached.service, cached.steps, cached.icon, cached.link, cached.service_key);
      setStatus("⚠️ Using cached result", "success");
      setTimeout(() => speakResult(), 600);
      return;
    }
    hideResult();
    showError("❌ Backend not connected. Check Render server.");
    setStatus("Tap mic to speak", "normal");
    const st = document.querySelector('.status-text');
    const sd = document.querySelector('.status-dot');
    if (st) st.innerText = "Server Offline";
    if (sd) sd.style.background = "#ff6b6b";
  }
}

// ══════════════════════════════════════════════════════════
// SHOW RESULT
// ══════════════════════════════════════════════════════════
function showResult(name, steps, icon, link, serviceKey) {
  document.getElementById("serviceName").innerText = name;

  const iconEl = document.querySelector('.result-icon');
  if (iconEl) iconEl.innerText = icon || SERVICE_CONFIG[serviceKey]?.icon || "📋";

  const list = document.getElementById("stepsList");
  list.innerHTML = "";
  steps.forEach((step, i) => {
    const li = document.createElement("li");
    li.innerText = step;
    li.style.cssText = `opacity:0;transform:translateX(-10px);
      transition:opacity 0.3s ${i*0.08}s,transform 0.3s ${i*0.08}s`;
    list.appendChild(li);
    setTimeout(() => { li.style.opacity="1"; li.style.transform="translateX(0)"; }, 50);
  });

  const linkEl = document.getElementById("govLink");
  const resolvedLink = link || SERVICE_CONFIG[serviceKey]?.link;
  if (resolvedLink) { linkEl.href=resolvedLink; linkEl.style.display="inline-block"; }
  else              { linkEl.style.display="none"; }

  const rb = document.getElementById("resultBox");
  rb.style.display="block"; rb.style.animation="none";
  void rb.offsetWidth; rb.style.animation="fadeUp 0.4s ease both";
  setTimeout(() => rb.scrollIntoView({behavior:"smooth",block:"nearest"}), 200);
  showToast("✅ " + name + " loaded!");
}

// ══════════════════════════════════════════════════════════
// TEXT-TO-SPEECH — THE GUARANTEED MULTILINGUAL FIX
// Uses Web Speech API — 100% free, no billing ever
// ══════════════════════════════════════════════════════════
function speakResult() {
  if (!resultText) return;
  stopSpeaking();

  const ttsLang   = LANG_CONFIG[selectedLang]?.tts || "en-IN";
  const utterance = new SpeechSynthesisUtterance(resultText);
  utterance.lang   = ttsLang;
  utterance.rate   = 0.82;
  utterance.pitch  = 1.0;
  utterance.volume = 1;

  const speakBtn = document.getElementById("speakBtn");
  const stopBtn  = document.getElementById("stopBtn");

  utterance.onstart = () => {
    isSpeaking = true;
    if (speakBtn) { speakBtn.innerText="🔊 Speaking..."; speakBtn.style.background="rgba(168,85,247,0.3)"; }
    if (stopBtn)  stopBtn.style.display = "inline-block";
  };

  const onDone = () => {
    isSpeaking = false;
    if (speakBtn) { speakBtn.innerText="🔊 Read Aloud"; speakBtn.style.background=""; }
    if (stopBtn)  stopBtn.style.display = "none";
  };
  utterance.onend   = onDone;
  utterance.onerror = onDone;

  // ── GUARANTEED VOICE SELECTION ──
  // This is the fix: we wait for voices to load if empty,
  // then find the best voice with multiple fallback strategies
  function pickVoiceAndSpeak() {
    const voices = window.speechSynthesis.getVoices();

    // Strategy 1: exact match e.g. "ta-IN"
    let voice = voices.find(v => v.lang === ttsLang);

    // Strategy 2: prefix match e.g. "ta" matches "ta-IN", "ta-SG"
    if (!voice) {
      const prefix = ttsLang.split("-")[0];
      voice = voices.find(v => v.lang.startsWith(prefix));
    }

    // Strategy 3: For Hindi/Bengali/Marathi — also try without region
    if (!voice && ["hi","bn","mr"].includes(selectedLang)) {
      voice = voices.find(v => v.lang.includes(ttsLang.split("-")[0]));
    }

    // Strategy 4: English fallback (always available)
    if (!voice) {
      voice = voices.find(v => v.lang.startsWith("en"));
    }

    if (voice) {
      utterance.voice = voice;
      console.log("TTS voice:", voice.name, voice.lang);
    } else {
      console.warn("No voice found for", ttsLang, "- using browser default");
    }

    window.speechSynthesis.speak(utterance);
  }

  // If voices not loaded yet (common on first call), wait for them
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      pickVoiceAndSpeak();
    };
  } else {
    pickVoiceAndSpeak();
  }
}

function stopSpeaking() {
  window.speechSynthesis.cancel();
  isSpeaking = false;
  const speakBtn = document.getElementById("speakBtn");
  const stopBtn  = document.getElementById("stopBtn");
  if (speakBtn) { speakBtn.innerText="🔊 Read Aloud"; speakBtn.style.background=""; }
  if (stopBtn)  stopBtn.style.display="none";
}

// ══════════════════════════════════════════════════════════
// SPEAK ANY TEXT in current language (used by agent)
// ══════════════════════════════════════════════════════════
function speakText(text) {
  stopSpeaking();
  const ttsLang   = LANG_CONFIG[selectedLang]?.tts || "en-IN";
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang   = ttsLang;
  utterance.rate   = 0.85;
  utterance.pitch  = 1.0;
  utterance.volume = 1;

  function go() {
    const voices  = window.speechSynthesis.getVoices();
    const prefix  = ttsLang.split("-")[0];
    const voice   = voices.find(v => v.lang === ttsLang) ||
                    voices.find(v => v.lang.startsWith(prefix)) ||
                    voices.find(v => v.lang.startsWith("en"));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged=null; go(); };
  } else { go(); }
}

// ══════════════════════════════════════════════════════════
// AI AGENT
// ══════════════════════════════════════════════════════════
let agentOpen = false;

function toggleAgent() {
  agentOpen = !agentOpen;
  const panel = document.getElementById("agentPanel");
  if (agentOpen) {
    panel.classList.add("open");
    document.getElementById("agentInput")?.focus();
  } else {
    panel.classList.remove("open");
  }
}

async function agentSend() {
  const input = document.getElementById("agentInput");
  const q = input?.value.trim();
  if (!q) return;
  input.value = "";
  agentAsk(q);
}

async function agentAsk(question) {
  addAgentMsg(question, "user");

  // Show typing indicator
  const typingEl = document.createElement("div");
  typingEl.className = "msg-typing";
  typingEl.id = "agentTyping";
  typingEl.innerText = "✦ Thinking...";
  document.getElementById("agentMessages").appendChild(typingEl);
  scrollAgentToBottom();

  let answer = "";
  try {
    if (!navigator.onLine) throw new Error("offline");
    const res  = await fetch(BACKEND + "/agent", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ question, lang: selectedLang }),
      signal:  AbortSignal.timeout(10000)
    });
    const data = await res.json();
    answer = data.answer || "Sorry, I could not find an answer.";
  } catch {
    // Offline local fallback
    answer = localAgentAnswer(question);
  }

  // Remove typing
  document.getElementById("agentTyping")?.remove();
  addAgentMsg(answer, "bot");
  // Auto-speak agent reply
  speakText(answer);
}

// Local offline agent answers
function localAgentAnswer(q) {
  const lower = q.toLowerCase();
  if (lower.includes("aadhaar") || lower.includes("aadhar"))
    return "For Aadhaar: visit uidai.gov.in or nearest Seva Kendra. Give fingerprints and iris scan. Download e-Aadhaar after 90 days.";
  if (lower.includes("ration") || lower.includes("food"))
    return "For Ration Card: visit Civil Supplies office, fill Form A, attach Aadhaar and address proof. Inspector visits in 30 days.";
  if (lower.includes("pension") || lower.includes("old age"))
    return "Old Age Pension: must be 60+ and BPL holder. Apply at Panchayat or BDO. Rs 200-500/month credited after approval.";
  if (lower.includes("voter") || lower.includes("election"))
    return "Voter ID: visit voters.eci.gov.in, fill Form 6, must be 18+. BLO verifies your address. Download e-EPIC from portal.";
  if (lower.includes("pan"))
    return "PAN Card: apply at onlineservices.nsdl.com, fill Form 49A, pay Rs 107. e-PAN emailed within 48 hours.";
  if (lower.includes("ayushman") || lower.includes("health"))
    return "Ayushman Bharat: check eligibility at mera.pmjay.gov.in. Covers Rs 5 lakh/year. Completely free and cashless.";
  if (lower.includes("document") || lower.includes("paper"))
    return "Common documents: Aadhaar Card, Passport-size photos, Address proof (electricity bill), and any existing certificates.";
  if (lower.includes("fee") || lower.includes("cost") || lower.includes("free"))
    return "Fees: Aadhaar free, Voter ID free, Ayushman free, PAN Rs 107, Land records Rs 60, Others Rs 10-30.";
  if (lower.includes("time") || lower.includes("day") || lower.includes("long"))
    return "Times: Aadhaar 90 days, Birth Cert 7 days, Caste/Income 15 days, Ration Card 30 days, PAN 15-20 days.";
  return "I can help with: Ration Card, Aadhaar, Pension, Voter ID, Ayushman Health, PAN Card, Driving Licence, Scholarship, Birth Certificate, Land Records, Income Certificate, and Caste Certificate. Just ask!";
}

function addAgentMsg(text, type) {
  const el = document.createElement("div");
  el.className = type === "user" ? "msg-user" : "msg-bot";
  el.innerText = text;
  document.getElementById("agentMessages").appendChild(el);
  scrollAgentToBottom();
}

function scrollAgentToBottom() {
  const msgs = document.getElementById("agentMessages");
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

// ══════════════════════════════════════════════════════════
// FEEDBACK
// ══════════════════════════════════════════════════════════
async function sendFeedback(rating) {
  const sn = document.getElementById("serviceName")?.innerText;
  if (!sn) return;
  try {
    await fetch(BACKEND + "/feedback", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({service:sn, rating, comment:""})
    });
  } catch {}
  const u = document.getElementById("thumbsUp");
  const d = document.getElementById("thumbsDown");
  if (rating==="helpful") {
    if(u) u.style.background="rgba(0,255,136,0.3)";
    if(d) d.style.background="";
    showToast("👍 Thank you!");
  } else {
    if(d) d.style.background="rgba(255,107,107,0.3)";
    if(u) u.style.background="";
    showToast("👎 We will improve!");
  }
}

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════
function setStatus(msg, type) {
  const el = document.getElementById("status");
  if (!el) return;
  el.innerText = msg;
  const c = {success:"#00ff88",error:"#ff6b6b",loading:"#00b4ff",listening:"#a855f7",normal:"#6b8cba"};
  el.style.color = c[type] || "#6b8cba";
}

function showError(msg) {
  const el = document.getElementById("errorBox");
  if (!el) return;
  el.innerText = msg;
  el.style.animation="none"; void el.offsetWidth; el.style.animation="fadeUp 0.3s ease";
  setTimeout(() => { el.innerText=""; }, 6000);
}

function hideError() { const el=document.getElementById("errorBox"); if(el) el.innerText=""; }

function shakeInput() {
  const el = document.getElementById("textInput");
  if (!el) return;
  el.style.borderColor="#ff6b6b"; el.style.transform="translateX(-6px)";
  setTimeout(()=>el.style.transform="translateX(6px)",100);
  setTimeout(()=>el.style.transform="translateX(-4px)",200);
  setTimeout(()=>el.style.transform="translateX(0)",300);
  setTimeout(()=>el.style.borderColor="",800);
}

function showLoadingInResult() {
  const sn=document.getElementById("serviceName");
  const sl=document.getElementById("stepsList");
  const rb=document.getElementById("resultBox");
  if(sn) sn.innerText="Loading...";
  if(sl) sl.innerHTML=`<li style="opacity:0.5;">Fetching in ${LANG_CONFIG[selectedLang].label}...</li><li style="opacity:0.3;">Please wait...</li>`;
  if(rb) rb.style.display="block";
}

function hideResult() { const rb=document.getElementById("resultBox"); if(rb) rb.style.display="none"; }

function showToast(msg) {
  const ex = document.getElementById("toast");
  if (ex) ex.remove();
  const t = document.createElement("div");
  t.id="toast"; t.innerText=msg;
  t.style.cssText=`position:fixed;bottom:100px;left:50%;transform:translateX(-50%) translateY(20px);
    background:linear-gradient(135deg,#0d1425,#111c35);border:1px solid rgba(0,255,136,0.3);
    color:#00ff88;padding:12px 24px;border-radius:100px;font-size:13px;font-weight:600;
    font-family:'DM Sans',sans-serif;z-index:400;opacity:0;transition:all 0.3s ease;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);white-space:nowrap;pointer-events:none;`;
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity="1";t.style.transform="translateX(-50%) translateY(0)";},10);
  setTimeout(()=>{
    t.style.opacity="0"; t.style.transform="translateX(-50%) translateY(10px)";
    setTimeout(()=>t.remove(),300);
  },2800);
}