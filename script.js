// ══════════════════════════════════════════════════════
// VAANI — Voice Assistant for Government Services
// script.js — Upgraded: 12 services + multilingual TTS
// ══════════════════════════════════════════════════════
 
const BACKEND = "https://multilingual-voice-assistant-870k.onrender.com";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA89l0ax8wB2J4UKXWcesntiTveueBsuDc",
  authDomain: "vaani-otp.firebaseapp.com",
  projectId: "vaani-otp",
  storageBucket: "vaani-otp.firebasestorage.app",
  messagingSenderId: "1030946884076",
  appId: "1:1030946884076:web:26a5efde02d30165f058c9"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

let resultText   = "";
let selectedLang = "en";
let isListening  = false;
 
// ── LANGUAGE CONFIG ──
const LANG_CONFIG = {
  "en": { label: "English",    tts: "en-IN",  stt: "en-IN"  },
  "ta": { label: "தமிழ்",      tts: "ta-IN",  stt: "ta-IN"  },
  "hi": { label: "हिन्दी",     tts: "hi-IN",  stt: "hi-IN"  },
  "te": { label: "తెలుగు",     tts: "te-IN",  stt: "te-IN"  },
  "kn": { label: "ಕನ್ನಡ",      tts: "kn-IN",  stt: "kn-IN"  },
  "ml": { label: "മലയാളം",     tts: "ml-IN",  stt: "ml-IN"  },
  "bn": { label: "বাংলা",      tts: "bn-IN",  stt: "bn-IN"  },
  "mr": { label: "मराठी",      tts: "mr-IN",  stt: "mr-IN"  }
};
 
// ── SERVICE CONFIG (matches backend SERVICE_DB keys) ──
const SERVICE_CONFIG = {
  "ration":            { icon: "🍚", link: "https://www.tnpds.gov.in",                    color: "chip-green"  },
  "pension":           { icon: "💰", link: "https://ignoaps.gov.in",                      color: "chip-blue"   },
  "aadhaar":           { icon: "🪪", link: "https://uidai.gov.in",                        color: "chip-purple" },
  "birth_certificate": { icon: "👶", link: "https://crsorgi.gov.in",                      color: "chip-green"  },
  "voter_id":          { icon: "🗳️", link: "https://voters.eci.gov.in",                  color: "chip-blue"   },
  "health_insurance":  { icon: "🏥", link: "https://pmjay.gov.in",                        color: "chip-green"  },
  "income_certificate":{ icon: "📄", link: "https://edistrict.gov.in",                   color: "chip-blue"   },
  "land_records":      { icon: "🏞️", link: "https://eservices.tn.gov.in",                color: "chip-purple" },
  "scholarship":       { icon: "🎓", link: "https://scholarships.gov.in",                color: "chip-blue"   },
  "driving_licence":   { icon: "🚗", link: "https://sarathi.parivahan.gov.in",            color: "chip-green"  },
  "pan_card":          { icon: "💳", link: "https://www.onlineservices.nsdl.com",         color: "chip-purple" },
  "caste_certificate": { icon: "📜", link: "https://edistrict.gov.in",                   color: "chip-blue"   }
};
 
// ══════════════════════════════════════════════════════
// LOGIN / AUTH
// ══════════════════════════════════════════════════════
function checkLogin() {
  const token = localStorage.getItem("vaani_token");
  const user  = JSON.parse(localStorage.getItem("vaani_user") || "null");
  if (!token || !user) { window.location.href = "login.html"; return; }
  document.getElementById("userName").innerText = "👤 " + user.name;
}
 
async function doLogout() {
  const token = localStorage.getItem("vaani_token");
  try {
    await fetch(BACKEND + "/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
  } catch {}
  localStorage.removeItem("vaani_token");
  localStorage.removeItem("vaani_user");
  window.location.href = "login.html";
}
 
async function saveSearchHistory(serviceName) {
  const token = localStorage.getItem("vaani_token");
  if (!token) return;
  try {
    await fetch(BACKEND + "/save_history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, service: serviceName })
    });
  } catch {}
}
 
// ══════════════════════════════════════════════════════
// ON LOAD
// ══════════════════════════════════════════════════════
window.onload = function () {
  checkLogin();
  checkServerStatus();
  animateStatsOnLoad();
  buildLanguagePills();
  populateServicesGrid();
};
 
// ── SERVER STATUS ──
async function checkServerStatus() {
  const statusText = document.querySelector('.status-text');
  const statusDot  = document.querySelector('.status-dot');
  try {
    const res = await fetch(BACKEND + "/");
    if (res.ok) {
      statusText.innerText = "Server Live";
      statusDot.style.background = "#00ff88";
    } else throw new Error();
  } catch {
    statusText.innerText = "Server Offline";
    statusDot.style.background = "#ff6b6b";
    statusDot.style.animation  = "none";
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
 
// ══════════════════════════════════════════════════════
// LANGUAGE PILLS  (dynamically built)
// ══════════════════════════════════════════════════════
function buildLanguagePills() {
  const row = document.getElementById("langPillsRow");
  if (!row) return;
  row.innerHTML = "";
  Object.entries(LANG_CONFIG).forEach(([code, cfg], i) => {
    const btn = document.createElement("button");
    btn.className = "lang-pill" + (i === 0 ? " active" : "");
    btn.id = "pill-" + code;
    btn.innerText = cfg.label;
    btn.onclick = () => setLang(code, btn);
    row.appendChild(btn);
  });
}
 
function setLang(lang, btn) {
  selectedLang = lang;
  document.querySelectorAll('.lang-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  showToast("🌐 " + LANG_CONFIG[lang].label);
}
 
// ══════════════════════════════════════════════════════
// SERVICES GRID  (dynamically built from SERVICE_CONFIG)
// ══════════════════════════════════════════════════════
function populateServicesGrid() {
  const grid = document.getElementById("servicesGrid");
  if (!grid) return;
  grid.innerHTML = "";
 
  const labels = {
    "ration":            "Ration Card",
    "pension":           "Pension",
    "aadhaar":           "Aadhaar",
    "birth_certificate": "Birth Cert.",
    "voter_id":          "Voter ID",
    "health_insurance":  "Ayushman",
    "income_certificate":"Income Cert.",
    "land_records":      "Land Records",
    "scholarship":       "Scholarship",
    "driving_licence":   "Driving Licence",
    "pan_card":          "PAN Card",
    "caste_certificate": "Caste Cert."
  };
 
  Object.entries(SERVICE_CONFIG).forEach(([key, cfg]) => {
    const chip = document.createElement("div");
    chip.className = `service-chip ${cfg.color}`;
    chip.onclick   = () => quickSearch(key);
    chip.innerHTML = `<span class="chip-icon">${cfg.icon}</span><span class="chip-text">${labels[key]}</span>`;
    grid.appendChild(chip);
  });
}
 
// ══════════════════════════════════════════════════════
// NORMALIZE INPUT  (fixes the keywordMap bug)
// ══════════════════════════════════════════════════════
const KEYWORD_MAP = {
  "ration":            ["ration", "food card", "ரேஷன்", "राशन", "రేషన్", "ಪಡಿತರ", "റേഷൻ"],
  "pension":           ["pension", "old age", "ஓய்வூதியம்", "पेंशन", "పెన్షన్", "ನಿವೃತ್ತಿ"],
  "aadhaar":           ["aadhaar", "aadhar", "uid", "ஆதார்", "आधार", "ఆధార్", "ಆಧಾರ್"],
  "birth_certificate": ["birth", "born", "பிறப்பு", "जन्म", "జన్మ", "ಜನನ"],
  "voter_id":          ["voter", "election", "epic", "வாக்காளர்", "मतदाता", "ఓటర్", "ಮತದಾರ"],
  "health_insurance":  ["health", "ayushman", "pmjay", "hospital", "மருத்துவம்", "आयुष्मान"],
  "income_certificate":["income", "salary", "வருமானம்", "आय प्रमाण", "ఆదాయం"],
  "land_records":      ["land", "patta", "chitta", "நிலம்", "भूमि", "భూమి"],
  "scholarship":       ["scholarship", "study", "student", "கல்வி", "छात्रवृत्ति"],
  "driving_licence":   ["driving", "licence", "license", " dl ", "ஓட்டுநர்", "ड्राइविंग"],
  "pan_card":          ["pan card", " pan ", "income tax", "பான்", "पैन"],
  "caste_certificate": ["caste", "community", " sc ", " st ", "obc", "சாதி", "जाति", "కులం"]
};
 
function normalizeInput(text) {
  const lower = " " + text.toLowerCase().trim() + " ";
  for (const [key, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) return key;
    }
  }
  return text;  // return original if no match — backend also tries to detect
}
 
// ══════════════════════════════════════════════════════
// QUICK SEARCH
// ══════════════════════════════════════════════════════
function quickSearch(keyword) {
  const input = document.getElementById('textInput');
  input.value = keyword;
  input.style.borderColor = "#00ff88";
  input.style.boxShadow   = "0 0 0 3px rgba(0,255,136,0.2)";
  setTimeout(() => { input.style.borderColor = ""; input.style.boxShadow = ""; }, 800);
  sendText();
}
 
// ══════════════════════════════════════════════════════
// VOICE INPUT
// ══════════════════════════════════════════════════════
function startVoice() {
  if (isListening) return;
  const btn  = document.getElementById("micBtn");
  const bars = document.getElementById("voiceBars");
 
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setStatus("⚠️ Use Chrome browser for voice!", "error");
    showToast("❌ Please open in Chrome!");
    return;
  }
 
  const recognition = new SpeechRecognition();
  recognition.continuous      = false;
  recognition.interimResults  = false;
  recognition.maxAlternatives = 1;
  recognition.lang            = LANG_CONFIG[selectedLang]?.stt || "en-IN";
 
  isListening = true;
  btn.classList.add("listening");
  bars.classList.add("active");
  setStatus("🎤 Listening... Speak now!", "listening");
 
  recognition.onresult = function (event) {
    const spoken     = event.results[0][0].transcript;
    const confidence = Math.round(event.results[0][0].confidence * 100);
    document.getElementById("textInput").value = spoken;
    setStatus("✅ Heard: " + spoken + " (" + confidence + "%)", "success");
    isListening = false;
    btn.classList.remove("listening");
    bars.classList.remove("active");
    setTimeout(() => sendText(), 400);
  };
 
  recognition.onerror = function (event) {
    isListening = false;
    btn.classList.remove("listening");
    bars.classList.remove("active");
    const errors = {
      "no-speech":     "❌ No speech detected. Try again!",
      "audio-capture": "❌ Microphone not found!",
      "not-allowed":   "❌ Allow microphone in browser settings!",
      "network":       "❌ Network error!",
      "aborted":       "❌ Cancelled. Try again!"
    };
    setStatus(errors[event.error] || "❌ Error: " + event.error, "error");
  };
 
  recognition.onend = function () {
    isListening = false;
    btn.classList.remove("listening");
    bars.classList.remove("active");
  };
 
  recognition.start();
}
 
// ══════════════════════════════════════════════════════
// SEND TEXT QUERY
// ══════════════════════════════════════════════════════
async function sendText() {
  const raw = document.getElementById("textInput").value.trim();
  if (!raw) { shakeInput(); return; }
 
  setStatus("🔍 Searching...", "loading");
  showLoadingInResult();
  hideError();
 
  try {
    const res  = await fetch(BACKEND + "/get_service", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: raw, target_lang: selectedLang })
    });
    const data = await res.json();
 
    if (!data.success) {
      hideResult();
      showError("❌ " + (data.message || "Service not found. Try: ration, pension, aadhaar, voter, health, pan..."));
      setStatus("Tap mic to speak", "normal");
      return;
    }
 
    // Build result text for TTS
    resultText = data.service + ". ";
    data.steps.forEach(s => { resultText += s + ". "; });
 
    // Show result card
    showResult(data.service, data.steps, data.icon, data.link, data.service_key);
    setStatus("✅ Here are your steps!", "success");
    saveSearchHistory(data.service);
 
    // Auto-speak in selected language
    setTimeout(() => speakResult(), 800);
 
  } catch (err) {
    hideResult();
    showError("❌ Backend not connected! Check if server is running.");
    setStatus("Tap mic to speak", "normal");
    document.querySelector('.status-text').innerText = "Server Offline";
    document.querySelector('.status-dot').style.background = "#ff6b6b";
  }
}
 
// ══════════════════════════════════════════════════════
// SHOW RESULT  (updated to accept icon/link directly)
// ══════════════════════════════════════════════════════
function showResult(name, steps, icon, link, serviceKey) {
  document.getElementById("serviceName").innerText = name;
 
  // Icon
  const iconEl = document.querySelector('.result-icon');
  if (iconEl) iconEl.innerText = icon || (SERVICE_CONFIG[serviceKey]?.icon || "📋");
 
  // Steps
  const list = document.getElementById("stepsList");
  list.innerHTML = "";
  steps.forEach((step, i) => {
    const li = document.createElement("li");
    li.innerText = step;
    li.style.cssText = `opacity:0; transform:translateX(-10px); transition:opacity 0.3s ${i*0.08}s, transform 0.3s ${i*0.08}s`;
    list.appendChild(li);
    setTimeout(() => { li.style.opacity = "1"; li.style.transform = "translateX(0)"; }, 50);
  });
 
  // Official link
  const linkEl = document.getElementById("govLink");
  const resolvedLink = link || SERVICE_CONFIG[serviceKey]?.link;
  if (resolvedLink) {
    linkEl.href = resolvedLink;
    linkEl.style.display = "inline-block";
  } else {
    linkEl.style.display = "none";
  }
 
  const resultBox = document.getElementById("resultBox");
  resultBox.style.display   = "block";
  resultBox.style.animation = "none";
  void resultBox.offsetWidth;
  resultBox.style.animation = "fadeUp 0.4s ease both";
  setTimeout(() => resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" }), 200);
 
  showToast("✅ " + name + " info loaded!");
}
 
// ══════════════════════════════════════════════════════
// TEXT-TO-SPEECH  (multilingual, with voice selection)
// ══════════════════════════════════════════════════════
function speakResult() {
  if (!resultText) return;
  window.speechSynthesis.cancel();
 
  const ttsLang    = LANG_CONFIG[selectedLang]?.tts || "en-IN";
  const utterance  = new SpeechSynthesisUtterance(resultText);
  utterance.lang   = ttsLang;
  utterance.rate   = 0.85;
  utterance.pitch  = 1.05;
  utterance.volume = 1;
 
  // Try to pick the best available voice for the language
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang === ttsLang) ||
                    voices.find(v => v.lang.startsWith(ttsLang.split("-")[0]));
  if (preferred) utterance.voice = preferred;
 
  const speakBtn = document.querySelector('.speak-btn');
  utterance.onstart = () => {
    if (speakBtn) { speakBtn.innerText = "🔊 Speaking..."; speakBtn.style.background = "rgba(168,85,247,0.3)"; }
  };
  utterance.onend = () => {
    if (speakBtn) { speakBtn.innerText = "🔊 Read Aloud"; speakBtn.style.background = ""; }
  };
  utterance.onerror = (e) => {
    console.warn("TTS error:", e.error);
    if (speakBtn) { speakBtn.innerText = "🔊 Read Aloud"; speakBtn.style.background = ""; }
  };
 
  // Voices may not be loaded yet on first call
  if (voices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.speak(utterance);
  } else {
    window.speechSynthesis.speak(utterance);
  }
}
 
// ══════════════════════════════════════════════════════
// FEEDBACK
// ══════════════════════════════════════════════════════
async function sendFeedback(rating) {
  const serviceName = document.getElementById("serviceName").innerText;
  if (!serviceName) return;
  try {
    await fetch(BACKEND + "/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: serviceName, rating, comment: "" })
    });
  } catch {}
  const thumbsUp   = document.getElementById("thumbsUp");
  const thumbsDown = document.getElementById("thumbsDown");
  if (rating === "helpful") {
    if (thumbsUp)   thumbsUp.style.background   = "rgba(0,255,136,0.3)";
    if (thumbsDown) thumbsDown.style.background = "";
    showToast("👍 Thank you for your feedback!");
  } else {
    if (thumbsDown) thumbsDown.style.background = "rgba(255,107,107,0.3)";
    if (thumbsUp)   thumbsUp.style.background   = "";
    showToast("👎 We will improve. Thank you!");
  }
}
 
// ══════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════
function setStatus(msg, type) {
  const el = document.getElementById("status");
  if (!el) return;
  el.innerText = msg;
  const colors = { success:"#00ff88", error:"#ff6b6b", loading:"#00b4ff", listening:"#a855f7", normal:"#6b8cba" };
  el.style.color = colors[type] || "#6b8cba";
}
 
function showError(msg) {
  const el = document.getElementById("errorBox");
  if (!el) return;
  el.innerText = msg;
  el.style.animation = "none"; void el.offsetWidth; el.style.animation = "fadeUp 0.3s ease";
  setTimeout(() => { el.innerText = ""; }, 5000);
}
 
function hideError() {
  const el = document.getElementById("errorBox");
  if (el) el.innerText = "";
}
 
function shakeInput() {
  const input = document.getElementById("textInput");
  if (!input) return;
  input.style.borderColor = "#ff6b6b";
  input.style.transform   = "translateX(-6px)";
  setTimeout(() => input.style.transform = "translateX(6px)",  100);
  setTimeout(() => input.style.transform = "translateX(-4px)", 200);
  setTimeout(() => input.style.transform = "translateX(0)",    300);
  setTimeout(() => input.style.borderColor = "",               800);
}
 
function showLoadingInResult() {
  document.getElementById("serviceName").innerText = "Loading...";
  document.getElementById("stepsList").innerHTML =
    '<li style="opacity:0.4;">Fetching service information...</li><li style="opacity:0.3;">Please wait...</li>';
  document.getElementById("resultBox").style.display = "block";
}
 
function hideResult() {
  document.getElementById("resultBox").style.display = "none";
}
 
function showToast(msg) {
  const existing = document.getElementById("toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "toast";
  toast.innerText = msg;
  toast.style.cssText = `
    position:fixed; bottom:28px; left:50%; transform:translateX(-50%) translateY(20px);
    background:linear-gradient(135deg,#0d1425,#111c35);
    border:1px solid rgba(0,255,136,0.3); color:#00ff88;
    padding:12px 24px; border-radius:100px; font-size:13px; font-weight:600;
    font-family:'DM Sans',sans-serif; z-index:999; opacity:0;
    transition:all 0.3s ease; box-shadow:0 8px 32px rgba(0,0,0,0.4); white-space:nowrap;
  `;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity="1"; toast.style.transform="translateX(-50%) translateY(0)"; }, 10);
  setTimeout(() => {
    toast.style.opacity="0"; toast.style.transform="translateX(-50%) translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}