// ══════════════════════════════════════════
// VAANI - Voice Assistant for Gov Services
// script.js - Final Clean Version
// ══════════════════════════════════════════

const BACKEND = "http://127.0.0.1:5000";
let resultText = "";
let selectedLang = "en";
let isListening = false;

// ── GOVERNMENT LINKS ──
const serviceLinks = {
  "ration":  "https://www.tnpds.gov.in",
  "pension": "https://ignoaps.gov.in",
  "aadhaar": "https://uidai.gov.in"
};

// ── SERVICE ICONS ──
const serviceIcons = {
  "ration":  "🍚",
  "pension": "💰",
  "aadhaar": "🪪"
};

// ══════════════════════════════════════════
// ON PAGE LOAD
// ══════════════════════════════════════════
window.onload = function () {
  checkServerStatus();
  animateStatsOnLoad();
};

// ── CHECK SERVER STATUS ──
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
  const statNums = document.querySelectorAll('.stat-num');
  statNums.forEach(el => {
    const target = parseInt(el.innerText) || 0;
    if (target === 0) return;
    let current = 0;
    const step = Math.ceil(target / 20);
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        el.innerText = target + "+";
        clearInterval(interval);
      } else {
        el.innerText = current;
      }
    }, 60);
  });
}

// ══════════════════════════════════════════
// LANGUAGE SELECTION
// ══════════════════════════════════════════
function setLang(lang, btn) {
  selectedLang = lang;
  document.querySelectorAll('.lang-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const names = { 'en': 'English', 'ta': 'தமிழ்', 'hi': 'हिन्दी', 'te': 'తెలుగు' };
  showToast("🌐 Language: " + names[lang]);
  console.log("Language changed to:", lang);
}

// ══════════════════════════════════════════
// NORMALIZE INPUT
// Tamil/Hindi/Telugu words → English keywords
// ══════════════════════════════════════════
function normalizeInput(text) {
  const keywordMap = {
    // Tamil
    "ரேஷன்": "ration",
    "ரேஷன் கார்டு": "ration",
    "உணவு அட்டை": "ration",
    "பென்சன்": "pension",
    "ஓய்வூதியம்": "pension",
    "ஆதார்": "aadhaar",
    "ஆதார் கார்டு": "aadhaar",
    // Hindi
    "राशन": "ration",
    "राशन कार्ड": "ration",
    "पेंशन": "pension",
    "आधार": "aadhaar",
    "आधार कार्ड": "aadhaar",
    // Telugu
    "రేషన్": "ration",
    "పెన్షన్": "pension",
    "ఆధార్": "aadhaar"
  };
  const lower = text.toLowerCase().trim();
  for (const [key, value] of Object.entries(keywordMap)) {
    if (lower.includes(key.toLowerCase())) return value;
  }
  return text;
}

// ══════════════════════════════════════════
// QUICK SEARCH
// ══════════════════════════════════════════
function quickSearch(keyword) {
  const input = document.getElementById('textInput');
  input.value = keyword;
  input.style.borderColor = "#00ff88";
  input.style.boxShadow = "0 0 0 3px rgba(0,255,136,0.2)";
  setTimeout(() => {
    input.style.borderColor = "";
    input.style.boxShadow = "";
  }, 800);
  sendText();
}

// ══════════════════════════════════════════
// VOICE INPUT
// ══════════════════════════════════════════
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

  // ── KEY FIX: Language mapping ──
  const langMap = {
    "en": "en-US",
    "ta": "ta-IN",
    "hi": "hi-IN",
    "te": "te-IN"
  };
  recognition.lang = langMap[selectedLang] || "en-US";
  console.log("Voice lang set to:", recognition.lang);

  // Start listening
  isListening = true;
  btn.classList.add("listening");
  bars.classList.add("active");
  setStatus("🎤 Listening... Speak now!", "listening");

  recognition.onstart = function () {
    console.log("Started listening in:", recognition.lang);
  };

  recognition.onresult = function (event) {
    const spoken     = event.results[0][0].transcript;
    const confidence = Math.round(event.results[0][0].confidence * 100);

    console.log("Heard:", spoken);
    document.getElementById("textInput").value = spoken;
    setStatus("✅ Heard: " + spoken + " (" + confidence + "%)", "success");

    isListening = false;
    btn.classList.remove("listening");
    bars.classList.remove("active");

    setTimeout(() => sendText(), 400);
  };

  recognition.onerror = function (event) {
    console.log("Voice error:", event.error);
    isListening = false;
    btn.classList.remove("listening");
    bars.classList.remove("active");

    const errors = {
      "no-speech":     "❌ No speech. Try again!",
      "audio-capture": "❌ Mic not found!",
      "not-allowed":   "❌ Allow mic in browser!",
      "network":       "❌ Network error!",
      "aborted":       "❌ Cancelled. Try again!"
    };
    setStatus(errors[event.error] || "❌ Error: " + event.error, "error");
    showToast(errors[event.error] || "❌ Voice error!");
  };

  recognition.onend = function () {
    isListening = false;
    btn.classList.remove("listening");
    bars.classList.remove("active");
    if (document.getElementById("status").innerText === "🎤 Listening... Speak now!") {
      setStatus("Tap mic to speak", "normal");
    }
  };

  try {
    recognition.start();
  } catch (e) {
    console.log("Start error:", e);
    setStatus("❌ Could not start mic!", "error");
    isListening = false;
    btn.classList.remove("listening");
    bars.classList.remove("active");
  }
}

// ══════════════════════════════════════════
// SEND TEXT TO BACKEND
// ══════════════════════════════════════════
async function sendText() {
  let text = document.getElementById("textInput").value.trim();
  const errorBox = document.getElementById("errorBox");
  errorBox.innerText = "";

  if (!text) {
    showError("⚠️ Please type or speak something!");
    shakeInput();
    return;
  }

  // Normalize Tamil/Hindi/Telugu → English keywords
  const normalized = normalizeInput(text);
  console.log("Original:", text, "→ Normalized:", normalized);

  setStatus("⏳ Processing...", "loading");
  showLoadingInResult();

  try {
    // STEP 1: Get service
    const res = await fetch(BACKEND + "/get_service", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: normalized })
    });

    if (!res.ok) throw new Error("Backend error");
    const data = await res.json();

    if (!data.success) {
      hideResult();
      showError("❌ " + data.message);
      setStatus("Tap mic to speak", "normal");
      return;
    }

    let steps       = data.steps;
    let serviceName = data.service;

    // STEP 2: Translate if needed
    if (selectedLang !== "en") {
      setStatus("🌐 Translating...", "loading");
      steps       = await translateSteps(steps, selectedLang);
      serviceName = await translateText(serviceName, selectedLang);
    }

    // STEP 3: Show result
    showResult(serviceName, steps, normalized);
    setStatus("✅ Here are your steps!", "success");

    // STEP 4: Auto speak
    setTimeout(() => speakResult(), 800);

  } catch (err) {
    hideResult();
    showError("❌ Backend not connected! Start python server.");
    setStatus("Tap mic to speak", "normal");
    document.querySelector('.status-text').innerText = "Server Offline";
    document.querySelector('.status-dot').style.background = "#ff6b6b";
  }
}

// ══════════════════════════════════════════
// TRANSLATION
// ══════════════════════════════════════════
async function translateSteps(steps, lang) {
  const translated = [];
  for (let step of steps) {
    const t = await translateText(step, lang);
    translated.push(t);
  }
  return translated;
}

async function translateText(text, lang) {
  try {
    const res = await fetch(BACKEND + "/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text, target_lang: lang })
    });
    const data = await res.json();
    return data.translated_text || text;
  } catch {
    return text;
  }
}

// ══════════════════════════════════════════
// SHOW RESULT
// ══════════════════════════════════════════
function showResult(name, steps, inputText) {
  document.getElementById("serviceName").innerText = name;

  let serviceKey = null;
  if (inputText.includes("ration"))                            serviceKey = "ration";
  else if (inputText.includes("pension"))                      serviceKey = "pension";
  else if (inputText.includes("aadhaar") || inputText.includes("aadhar")) serviceKey = "aadhaar";

  const iconEl = document.querySelector('.result-icon');
  if (iconEl && serviceKey) iconEl.innerText = serviceIcons[serviceKey] || "📋";

  const list = document.getElementById("stepsList");
  list.innerHTML = "";
  resultText = name + ". ";

  steps.forEach((step, index) => {
    const li = document.createElement("li");
    li.innerText = step;
    li.style.opacity   = "0";
    li.style.transform = "translateX(-10px)";
    li.style.transition = `opacity 0.3s ${index * 0.08}s, transform 0.3s ${index * 0.08}s`;
    list.appendChild(li);
    setTimeout(() => {
      li.style.opacity   = "1";
      li.style.transform = "translateX(0)";
    }, 50);
    resultText += step + ". ";
  });

  const linkEl = document.getElementById("govLink");
  if (serviceKey && serviceLinks[serviceKey]) {
    linkEl.href = serviceLinks[serviceKey];
    linkEl.style.display = "inline-block";
  } else {
    linkEl.style.display = "none";
  }

  const resultBox = document.getElementById("resultBox");
  resultBox.style.display   = "block";
  resultBox.style.animation = "none";
  void resultBox.offsetWidth;
  resultBox.style.animation = "fadeUp 0.4s ease both";

  setTimeout(() => {
    resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 200);

  showToast("✅ " + name + " info loaded!");
}

// ══════════════════════════════════════════
// TEXT TO SPEECH
// ══════════════════════════════════════════
function speakResult() {
  if (!resultText) return;
  window.speechSynthesis.cancel();

  const langMap = { "ta": "ta-IN", "hi": "hi-IN", "te": "te-IN", "en": "en-US" };
  const utterance  = new SpeechSynthesisUtterance(resultText);
  utterance.lang   = langMap[selectedLang] || "en-US";
  utterance.rate   = 0.88;
  utterance.pitch  = 1.05;
  utterance.volume = 1;

  const speakBtn = document.querySelector('.speak-btn');
  utterance.onstart = () => {
    speakBtn.innerText = "🔊 Speaking...";
    speakBtn.style.background = "rgba(168,85,247,0.3)";
  };
  utterance.onend = () => {
    speakBtn.innerText = "🔊 Read Aloud";
    speakBtn.style.background = "";
  };

  window.speechSynthesis.speak(utterance);
}

// ══════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════
function setStatus(msg, type) {
  const el = document.getElementById("status");
  el.innerText = msg;
  const colors = {
    "success":   "#00ff88",
    "error":     "#ff6b6b",
    "loading":   "#00b4ff",
    "listening": "#a855f7",
    "normal":    "#6b8cba"
  };
  el.style.color = colors[type] || "#6b8cba";
}

function showError(msg) {
  const el = document.getElementById("errorBox");
  el.innerText = msg;
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "fadeUp 0.3s ease";
  setTimeout(() => { el.innerText = ""; }, 4000);
}

function shakeInput() {
  const input = document.getElementById("textInput");
  input.style.borderColor = "#ff6b6b";
  input.style.transform   = "translateX(-6px)";
  setTimeout(() => input.style.transform = "translateX(6px)",  100);
  setTimeout(() => input.style.transform = "translateX(-4px)", 200);
  setTimeout(() => input.style.transform = "translateX(0)",    300);
  setTimeout(() => input.style.borderColor = "",               800);
}

function showLoadingInResult() {
  const list = document.getElementById("stepsList");
  document.getElementById("serviceName").innerText = "Loading...";
  list.innerHTML = `
    <li style="opacity:0.4;">Fetching service information...</li>
    <li style="opacity:0.3;">Please wait...</li>
  `;
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
    position: fixed;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: linear-gradient(135deg, #0d1425, #111c35);
    border: 1px solid rgba(0,255,136,0.3);
    color: #00ff88;
    padding: 12px 24px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    z-index: 999;
    opacity: 0;
    transition: all 0.3s ease;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    white-space: nowrap;
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity   = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  }, 10);

  setTimeout(() => {
    toast.style.opacity   = "0";
    toast.style.transform = "translateX(-50%) translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}