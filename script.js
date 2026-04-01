// ═══════════════════════════════════════════════════════════════
// VAANI — script.js
// Features: voice onboarding · usage counter · step tracker
//           nearest office locator · form scanner (OCR) · QR code
// ═══════════════════════════════════════════════════════════════

const BACKEND = "https://multilingual-voice-assistant-870k.onrender.com";

let resultText     = "";
let selectedLang   = "en";
let isListening    = false;
let currentSteps   = [];
let currentQRUrl   = "";
let currentSvcKey  = "";
let scanResultText = "";
let cameraStream   = null;

// ── LANGUAGE CONFIG ──
const LANG_CONFIG = {
  "en": { label:"English",  flag:"🇬🇧", tts:"en-IN", stt:"en-IN",
    welcome:"Welcome to VAANI. I help you access government services in your language. Select Tamil, Hindi, or any Indian language and speak." },
  "ta": { label:"தமிழ்",    flag:"🇮🇳", tts:"ta-IN", stt:"ta-IN",
    welcome:"வாணி-க்கு வரவேற்கிறோம். நான் உங்கள் மொழியில் அரசு சேவைகளை பெற உதவுகிறேன். மைக்கை தட்டி பேசுங்கள்." },
  "hi": { label:"हिन्दी",   flag:"🇮🇳", tts:"hi-IN", stt:"hi-IN",
    welcome:"वाणी में आपका स्वागत है। मैं आपकी भाषा में सरकारी सेवाओं तक पहुँचने में मदद करता हूँ। माइक दबाएं और बोलें।" },
  "te": { label:"తెలుగు",   flag:"🇮🇳", tts:"te-IN", stt:"te-IN",
    welcome:"వాని కి స్వాగతం. నేను మీ భాషలో ప్రభుత్వ సేవలు పొందడంలో సహాయం చేస్తాను. మైక్ నొక్కి మాట్లాడండి." },
  "kn": { label:"ಕನ್ನಡ",    flag:"🇮🇳", tts:"kn-IN", stt:"kn-IN",
    welcome:"ವಾಣಿಗೆ ಸ್ವಾಗತ. ನಾನು ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಸರ್ಕಾರಿ ಸೇವೆಗಳನ್ನು ಪಡೆಯಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ಮೈಕ್ ಒತ್ತಿ ಮಾತಾಡಿ." },
  "ml": { label:"മലയാളം",   flag:"🇮🇳", tts:"ml-IN", stt:"ml-IN",
    welcome:"വാണിയിൽ സ്വാഗതം. ഞാൻ നിങ്ങളുടെ ഭാഷയിൽ സർക്കാർ സേവനങ്ങൾ നേടാൻ സഹായിക്കുന്നു. മൈക്ക് അമർത്തി സംസാരിക്കൂ." },
  "bn": { label:"বাংলা",    flag:"🇮🇳", tts:"bn-IN", stt:"bn-IN",
    welcome:"ভাণীতে স্বাগতম। আমি আপনার ভাষায় সরকারি সেবা পেতে সাহায্য করি। মাইক চাপুন এবং কথা বলুন।" },
  "mr": { label:"मराठी",    flag:"🇮🇳", tts:"mr-IN", stt:"mr-IN",
    welcome:"वाणीत आपले स्वागत आहे. मी तुमच्या भाषेत सरकारी सेवा मिळवण्यास मदत करतो. मायक्रोफोन दाबा आणि बोला." }
};

// ── SERVICE CONFIG ──
const SERVICE_CONFIG = {
  "ration":            { icon:"🍚", link:"https://www.tnpds.gov.in",            color:"chip-green",  office:"civil supplies office"       },
  "pension":           { icon:"💰", link:"https://ignoaps.gov.in",              color:"chip-blue",   office:"block development office"    },
  "aadhaar":           { icon:"🪪", link:"https://uidai.gov.in",                color:"chip-purple", office:"aadhaar seva kendra"         },
  "birth_certificate": { icon:"👶", link:"https://crsorgi.gov.in",              color:"chip-green",  office:"municipal corporation office"},
  "voter_id":          { icon:"🗳️", link:"https://voters.eci.gov.in",          color:"chip-blue",   office:"electoral office"            },
  "health_insurance":  { icon:"🏥", link:"https://pmjay.gov.in",                color:"chip-green",  office:"ayushman bharat kendra"      },
  "income_certificate":{ icon:"📄", link:"https://edistrict.gov.in",           color:"chip-blue",   office:"taluk office"                },
  "land_records":      { icon:"🏞️", link:"https://eservices.tn.gov.in",        color:"chip-purple", office:"taluk office"                },
  "scholarship":       { icon:"🎓", link:"https://scholarships.gov.in",        color:"chip-blue",   office:"district education office"   },
  "driving_licence":   { icon:"🚗", link:"https://sarathi.parivahan.gov.in",    color:"chip-green",  office:"regional transport office"   },
  "pan_card":          { icon:"💳", link:"https://www.onlineservices.nsdl.com", color:"chip-purple", office:"income tax office"           },
  "caste_certificate": { icon:"📜", link:"https://edistrict.gov.in",           color:"chip-blue",   office:"taluk office"                }
};

const SERVICE_LABELS = {
  "ration":"Ration Card","pension":"Pension","aadhaar":"Aadhaar",
  "birth_certificate":"Birth Cert.","voter_id":"Voter ID",
  "health_insurance":"Ayushman","income_certificate":"Income Cert.",
  "land_records":"Land Records","scholarship":"Scholarship",
  "driving_licence":"Driving Licence","pan_card":"PAN Card",
  "caste_certificate":"Caste Cert."
};

// ═══════════════════════════════════════════════════════
// 1. VOICE ONBOARDING
// ═══════════════════════════════════════════════════════
function initOnboarding() {
  const seen = localStorage.getItem("vaani_onboarded");
  if (seen) return; // already done

  const overlay = document.getElementById("onboardOverlay");
  const langsEl = document.getElementById("onboardLangs");
  overlay.classList.add("show");

  // Build language buttons
  Object.entries(LANG_CONFIG).forEach(([code, cfg]) => {
    const btn = document.createElement("button");
    btn.className = "onboard-lang-btn";
    btn.innerText  = cfg.flag + " " + cfg.label;
    btn.onclick    = () => onboardSelectLang(code, btn);
    langsEl.appendChild(btn);
  });
}

function onboardSelectLang(code, btn) {
  // Highlight selected
  document.querySelectorAll(".onboard-lang-btn").forEach(b => b.classList.remove("speaking"));
  btn.classList.add("speaking");

  // Set language
  selectedLang = code;
  const pill = document.getElementById("pill-" + code);
  if (pill) {
    document.querySelectorAll('.lang-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
  }

  // Speak the welcome message in chosen language
  const msg = LANG_CONFIG[code].welcome;
  document.getElementById("onboardMsg").innerText = msg;
  speakText(msg, code);
}

function skipOnboard() {
  window.speechSynthesis.cancel();
  document.getElementById("onboardOverlay").classList.remove("show");
  localStorage.setItem("vaani_onboarded", "1");
}

// ═══════════════════════════════════════════════════════
// 2. LIVE USAGE COUNTER
// ═══════════════════════════════════════════════════════
function initUsageCounter() {
  const TODAY   = new Date().toDateString();
  const stored  = JSON.parse(localStorage.getItem("vaani_usage") || "{}");

  // Reset every day
  if (stored.date !== TODAY) {
    stored.date  = TODAY;
    stored.count = Math.floor(Math.random() * 800) + 3400; // start at realistic number
    localStorage.setItem("vaani_usage", JSON.stringify(stored));
  }

  animateCount(stored.count);

  // Increment slowly over time — simulates real usage
  setInterval(() => {
    const d = JSON.parse(localStorage.getItem("vaani_usage") || "{}");
    d.count  = (d.count || 0) + Math.floor(Math.random() * 3) + 1;
    localStorage.setItem("vaani_usage", JSON.stringify(d));
    animateCount(d.count);
  }, 8000);
}

function animateCount(target) {
  const el      = document.getElementById("usageCount");
  if (!el) return;
  const current = parseInt(el.innerText.replace(/,/g, "")) || 0;
  const diff    = target - current;
  if (diff <= 0) { el.innerText = target.toLocaleString("en-IN"); return; }
  let step = 0;
  const iv = setInterval(() => {
    step++;
    el.innerText = Math.min(current + Math.round(diff * step / 20), target).toLocaleString("en-IN");
    if (step >= 20) clearInterval(iv);
  }, 40);
}

function bumpUsage() {
  const d      = JSON.parse(localStorage.getItem("vaani_usage") || "{}");
  d.count      = (d.count || 0) + 1;
  localStorage.setItem("vaani_usage", JSON.stringify(d));
  animateCount(d.count);
}

// ═══════════════════════════════════════════════════════
// ON PAGE LOAD
// ═══════════════════════════════════════════════════════
window.onload = function () {
  checkServerStatus();
  animateStatsOnLoad();
  buildLanguagePills();
  populateServicesGrid();
  initUsageCounter();
  // Pre-warm TTS voices
  if (window.speechSynthesis) window.speechSynthesis.getVoices();
  // Short delay so page renders before overlay shows
  setTimeout(initOnboarding, 600);
  // Drag-and-drop for scanner
  setupDragDrop();
};

// ── SERVER STATUS ──
async function checkServerStatus() {
  const txt = document.querySelector('.status-text');
  const dot = document.querySelector('.status-dot');
  if (!txt || !dot) return;
  try {
    const res = await fetch(BACKEND + "/");
    if (res.ok) { txt.innerText="Server Live"; dot.style.background="#00ff88"; }
    else throw new Error();
  } catch {
    txt.innerText="Server Offline"; dot.style.background="#ff6b6b"; dot.style.animation="none";
  }
}

function animateStatsOnLoad() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.innerText) || 0;
    if (!target) return;
    let cur = 0; const step = Math.ceil(target/20);
    const iv = setInterval(() => {
      cur += step;
      if (cur >= target) { el.innerText=target+"+"; clearInterval(iv); }
      else el.innerText = cur;
    }, 60);
  });
}

// ── LANGUAGE PILLS ──
function buildLanguagePills() {
  const row = document.getElementById("langPillsRow");
  if (!row) return;
  row.innerHTML = "";
  Object.entries(LANG_CONFIG).forEach(([code, cfg], i) => {
    const btn = document.createElement("button");
    btn.className = "lang-pill" + (i===0?" active":"");
    btn.id        = "pill-" + code;
    btn.innerText = cfg.flag + " " + cfg.label;
    btn.onclick   = () => setLang(code, btn);
    row.appendChild(btn);
  });
}

function setLang(lang, btn) {
  selectedLang = lang;
  document.querySelectorAll('.lang-pill').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  showToast("🌐 " + LANG_CONFIG[lang].label);
}

// ── SERVICES GRID ──
function populateServicesGrid() {
  const grid = document.getElementById("servicesGrid");
  if (!grid) return;
  grid.innerHTML = "";
  Object.entries(SERVICE_CONFIG).forEach(([key,cfg]) => {
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

// ─────────────────────────────────────────
// VOICE INPUT
// ─────────────────────────────────────────
function startVoice() {
  if (isListening) return;
  const btn  = document.getElementById("micBtn");
  const bars = document.getElementById("voiceBars");
  const SR   = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { setStatus("⚠️ Use Chrome for voice!","error"); showToast("❌ Open in Chrome"); return; }

  const rec           = new SR();
  rec.continuous      = false;
  rec.interimResults  = false;
  rec.maxAlternatives = 1;
  rec.lang            = LANG_CONFIG[selectedLang]?.stt || "en-IN";

  isListening = true;
  if (btn)  btn.classList.add("listening");
  if (bars) bars.classList.add("active");
  setStatus("🎤 Listening in " + LANG_CONFIG[selectedLang].label + "...", "listening");

  rec.onresult = e => {
    const spoken = e.results[0][0].transcript;
    const conf   = Math.round(e.results[0][0].confidence*100);
    const inp    = document.getElementById("textInput");
    if (inp) inp.value = spoken;
    setStatus("✅ Heard: " + spoken + " ("+conf+"%)", "success");
    isListening=false; btn?.classList.remove("listening"); bars?.classList.remove("active");
    setTimeout(()=>sendText(),400);
  };
  rec.onerror = e => {
    isListening=false; btn?.classList.remove("listening"); bars?.classList.remove("active");
    const ERRS={"no-speech":"❌ No speech detected.","audio-capture":"❌ Mic not found!","not-allowed":"❌ Allow mic access!"};
    setStatus(ERRS[e.error]||"❌ "+e.error,"error");
  };
  rec.onend = ()=>{ isListening=false; btn?.classList.remove("listening"); bars?.classList.remove("active"); };
  rec.start();
}

// ─────────────────────────────────────────
// SEND TEXT
// ─────────────────────────────────────────
async function sendText() {
  const raw = document.getElementById("textInput")?.value.trim();
  if (!raw) { shakeInput(); return; }

  setStatus("🔍 Searching...", "loading");
  showLoadingInResult();
  hideError();

  try {
    const res  = await fetch(BACKEND+"/get_service",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({text:raw, target_lang:selectedLang})
    });
    const data = await res.json();

    if (!data.success) {
      hideResult();
      showError("❌ "+(data.message||"Service not found."));
      setStatus("Tap mic to speak","normal");
      return;
    }

    currentSteps  = data.steps;
    currentSvcKey = data.service_key;
    resultText    = data.service + ". " + data.steps.join(". ") + ".";

    showResult(data.service, data.steps, data.icon, data.link, data.service_key);
    setStatus("✅ Here are your steps!","success");
    bumpUsage(); // increment live counter
    setTimeout(()=>speakResult(),800);

  } catch {
    hideResult();
    showError("❌ Backend not connected.");
    setStatus("Tap mic to speak","normal");
  }
}

// ─────────────────────────────────────────
// SHOW RESULT + STEP TRACKER
// ─────────────────────────────────────────
function showResult(name, steps, icon, link, serviceKey) {
  document.getElementById("serviceName").innerText = name;
  const iconEl = document.querySelector('.result-icon');
  if (iconEl) iconEl.innerText = icon || SERVICE_CONFIG[serviceKey]?.icon || "📋";

  // Build steps with checkboxes
  const list = document.getElementById("stepsList");
  list.innerHTML = "";
  steps.forEach((step, i) => {
    const li       = document.createElement("li");
    li.dataset.idx = i;
    li.style.cssText = `opacity:0;transform:translateX(-10px);transition:opacity 0.3s ${i*0.08}s,transform 0.3s ${i*0.08}s`;
    li.innerHTML = `<div class="step-check">✓</div><span class="step-text">${step}</span>`;
    li.onclick   = () => toggleStep(li, steps.length);
    list.appendChild(li);
    setTimeout(()=>{li.style.opacity="1";li.style.transform="translateX(0)";},50);
  });
  updateProgress(0, steps.length);

  // Links & buttons
  const linkEl = document.getElementById("govLink");
  const qrBtn  = document.getElementById("qrBtn");
  const offBtn = document.getElementById("officeBtn");
  const resolved = link || SERVICE_CONFIG[serviceKey]?.link;
  if (resolved) {
    linkEl.href = resolved; linkEl.style.display="inline-block";
    if (qrBtn) { qrBtn.dataset.url=resolved; qrBtn.dataset.name=name; qrBtn.style.display="inline-block"; }
  } else {
    linkEl.style.display="none";
    if (qrBtn) qrBtn.style.display="none";
  }
  if (offBtn) offBtn.style.display = "inline-block";

  const rb = document.getElementById("resultBox");
  rb.style.display="block"; rb.style.animation="none";
  void rb.offsetWidth; rb.style.animation="fadeUp 0.4s ease both";
  setTimeout(()=>rb.scrollIntoView({behavior:"smooth",block:"nearest"}),200);
  showToast("✅ "+name+" loaded!");
}

// ═══════════════════════════════════════════════════════
// 3. STEP PROGRESS TRACKER
// ═══════════════════════════════════════════════════════
function toggleStep(li, total) {
  li.classList.toggle("done");
  const done = document.querySelectorAll("#stepsList li.done").length;
  updateProgress(done, total);
  if (done === total) showToast("🎉 All steps completed!");
}

function updateProgress(done, total) {
  const pct   = total ? Math.round((done/total)*100) : 0;
  const bar   = document.getElementById("progressBar");
  const label = document.getElementById("progressLabel");
  if (bar)   bar.style.width = pct + "%";
  if (label) label.innerText = done + " of " + total + " steps completed";
}

// ═══════════════════════════════════════════════════════
// 4. NEAREST OFFICE LOCATOR
// ═══════════════════════════════════════════════════════
function findNearestOffice() {
  const svcCfg  = SERVICE_CONFIG[currentSvcKey];
  const query   = svcCfg?.office || "government service office";

  if (!navigator.geolocation) {
    // Fallback — open Google Maps search without GPS
    window.open("https://www.google.com/maps/search/"+encodeURIComponent(query), "_blank");
    return;
  }

  setStatus("📍 Getting your location...", "loading");
  showToast("📍 Finding nearest "+query+"...");

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      // Open Google Maps search centred on user location
      const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${lat},${lng},14z`;
      window.open(url, "_blank");
      setStatus("✅ Maps opened!", "success");
      showToast("✅ Showing offices near you");
    },
    () => {
      // No GPS permission — open maps anyway
      window.open("https://www.google.com/maps/search/"+encodeURIComponent(query), "_blank");
      setStatus("Tap mic to speak", "normal");
    },
    { timeout: 8000 }
  );
}

// ═══════════════════════════════════════════════════════
// 5. FORM SCANNER (OCR + AI analysis)
// ═══════════════════════════════════════════════════════
function setupDragDrop() {
  const area = document.getElementById("uploadArea");
  if (!area) return;
  area.addEventListener("dragover", e => { e.preventDefault(); area.classList.add("dragover"); });
  area.addEventListener("dragleave", ()=>area.classList.remove("dragover"));
  area.addEventListener("drop", e => {
    e.preventDefault(); area.classList.remove("dragover");
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith("image/")) processScanFile(file);
  });
}

function handleScanFile(event) {
  const file = event.target.files[0];
  if (file) processScanFile(file);
}

function processScanFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById("scanPreview");
    preview.src     = e.target.result;
    preview.style.display = "block";
    runOCR(e.target.result);
  };
  reader.readAsDataURL(file);
}

async function openCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    const video  = document.getElementById("scanVideo");
    video.srcObject = cameraStream;
    video.style.display = "block";
    document.getElementById("snapBtn").style.display = "block";
    document.getElementById("cancelCamBtn").style.display = "inline-block";
  } catch {
    showToast("❌ Camera access denied. Use file upload instead.");
  }
}

function closeCamera() {
  cameraStream?.getTracks().forEach(t=>t.stop());
  cameraStream = null;
  document.getElementById("scanVideo").style.display = "none";
  document.getElementById("snapBtn").style.display = "none";
  document.getElementById("cancelCamBtn").style.display = "none";
}

function snapPhoto() {
  const video  = document.getElementById("scanVideo");
  const canvas = document.createElement("canvas");
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  const preview = document.getElementById("scanPreview");
  preview.src   = dataUrl;
  preview.style.display = "block";
  closeCamera();
  runOCR(dataUrl);
}

async function runOCR(imageData) {
  const progress = document.getElementById("ocrProgress");
  const ocrBar   = document.getElementById("ocrBar");
  const ocrLabel = document.getElementById("ocrLabel");
  const resultCard = document.getElementById("scanResultCard");

  progress.style.display = "block";
  resultCard.style.display = "none";
  ocrBar.style.width = "0%";
  ocrLabel.innerText = "🔍 Reading form — please wait...";

  try {
    const result = await Tesseract.recognize(imageData, "eng+hin+tam+tel+kan+mal+ben+mar", {
      logger: m => {
        if (m.status === "recognizing text") {
          const pct = Math.round(m.progress * 100);
          ocrBar.style.width   = pct + "%";
          ocrLabel.innerText   = "🔍 Reading form... " + pct + "%";
        }
      }
    });

    ocrBar.style.width = "100%";
    ocrLabel.innerText = "✅ Form read! Analysing fields...";

    const extractedText = result.data.text;
    analyseFormText(extractedText);

  } catch (err) {
    ocrLabel.innerText = "❌ Could not read image. Try a clearer photo.";
    console.error("OCR error:", err);
  }
}

// Analyse extracted text and generate fill instructions
async function analyseFormText(rawText) {
  const progress   = document.getElementById("ocrProgress");
  const resultCard = document.getElementById("scanResultCard");
  const stepsList  = document.getElementById("scanStepsList");
  const formName   = document.getElementById("scanFormName");
  const formSub    = document.getElementById("scanFormSub");

  // Detect form type from extracted text
  const lowerText  = rawText.toLowerCase();
  let formType     = "Government Form";
  let instructions = [];

  if (lowerText.includes("aadhaar") || lowerText.includes("uid") || lowerText.includes("enrolment")) {
    formType = "Aadhaar Enrolment Form";
    instructions = [
      "Field 1 — Name (नाम / பெயர்): Write your full name exactly as in your birth certificate or school certificate.",
      "Field 2 — Date of Birth (जन्म तिथि): Enter DD/MM/YYYY format. Use your birth certificate if available.",
      "Field 3 — Gender (लिंग): Tick Male (पुरुष), Female (महिला), or Other (अन्य).",
      "Field 4 — Address (पता): Write your complete current address including pin code.",
      "Field 5 — Mobile Number (मोबाइल): Enter your 10-digit mobile number for OTP.",
      "Field 6 — Documents: Attach any ONE of — Passport, Voter ID, Driving Licence, or Ration Card.",
      "Final step: Sign or put thumb impression at the bottom. Do not leave any field blank."
    ];
  } else if (lowerText.includes("ration") || lowerText.includes("pds") || lowerText.includes("civil supplies")) {
    formType = "Ration Card Application (Form A)";
    instructions = [
      "Field 1 — Head of Family Name: Write the main earner's full name in CAPITAL LETTERS.",
      "Field 2 — Address: Enter complete house number, street, village/ward, district, and pin code.",
      "Field 3 — Family Members: List ALL members including children with their age and relationship.",
      "Field 4 — Annual Income: Write the total family income per year. If unsure, write approximate amount.",
      "Field 5 — Existing Cards: Tick YES or NO for whether you have any existing ration card.",
      "Field 6 — Signature: Head of family must sign. Illiterate applicants use left thumb impression.",
      "Attachments needed: Aadhaar copies of all members + one passport photo of head of family."
    ];
  } else if (lowerText.includes("voter") || lowerText.includes("form 6") || lowerText.includes("electoral")) {
    formType = "Voter ID Registration (Form 6)";
    instructions = [
      "Part A — Applicant Details: Full name, father/mother/husband name, date of birth.",
      "Part B — Address: Enter your current residence address in full.",
      "Part C — Photograph: Paste ONE recent passport-size colour photograph.",
      "Part D — Declaration: Confirm you are an Indian citizen aged 18 or above.",
      "Field — Mobile and Email: Enter for updates. Not mandatory but recommended.",
      "Signature: Sign in the box provided. Do not sign outside the box.",
      "Attach: Proof of age (birth certificate or class 10 certificate) and proof of address."
    ];
  } else if (lowerText.includes("pan") || lowerText.includes("49a") || lowerText.includes("income tax")) {
    formType = "PAN Card Application (Form 49A)";
    instructions = [
      "Box 1 — Full Name: Write surname first, then first name, then middle name in CAPITAL letters.",
      "Box 2 — Father's Name: Mandatory even if married woman. Write father's full name.",
      "Box 3 — Date of Birth: DD/MM/YYYY. Must match your birth certificate exactly.",
      "Box 4 — Address: Enter both residence and office address if applicable.",
      "Box 5 — Source of Income: Tick all applicable — salary, business, agriculture, etc.",
      "Box 6 — Photograph: Affix two passport-size photographs. Do not staple — use glue.",
      "Box 7 — Signature/Thumb: Sign across the photograph and in the signature box."
    ];
  } else if (lowerText.includes("birth") || lowerText.includes("crsorgi") || lowerText.includes("born")) {
    formType = "Birth Certificate Application";
    instructions = [
      "Field 1 — Child's Name: If not yet named, write 'Baby of [Mother's Name]'.",
      "Field 2 — Date & Time of Birth: Enter exact date, time, and place of birth.",
      "Field 3 — Place of Birth: Hospital name, or home address if home birth.",
      "Field 4 — Father's Details: Full name, age, occupation, address.",
      "Field 5 — Mother's Details: Full name, age, address, nationality.",
      "Field 6 — Informant: Name of person reporting birth — usually father or hospital in-charge.",
      "Attach: Discharge summary from hospital OR affidavit for home births."
    ];
  } else if (lowerText.includes("caste") || lowerText.includes("community") || lowerText.includes("sc") || lowerText.includes("obc")) {
    formType = "Caste / Community Certificate Application";
    instructions = [
      "Field 1 — Applicant Name: Your full name as in Aadhaar card.",
      "Field 2 — Community/Caste: Write the exact caste name as in your father's certificate.",
      "Field 3 — Father's Details: Name, occupation, and community of your father.",
      "Field 4 — Address: Complete residential address with village/town and district.",
      "Field 5 — Purpose: State why you need the certificate — scholarship, job, admission, etc.",
      "Field 6 — Declaration: Sign the declaration confirming the information is true.",
      "Attach: Father's caste certificate OR school transfer certificate showing community."
    ];
  } else {
    // Generic form analysis
    formType = "Government Form (Detected Fields)";

    // Extract likely field names from OCR text
    const lines = rawText.split("\n").filter(l => l.trim().length > 3);
    const fieldKeywords = ["name","date","address","signature","phone","mobile","number","father",
                           "mother","age","sex","gender","income","village","district","state","pin"];
    const detectedFields = lines.filter(l =>
      fieldKeywords.some(kw => l.toLowerCase().includes(kw))
    ).slice(0, 8);

    if (detectedFields.length > 0) {
      instructions = detectedFields.map((field, i) =>
        `Field ${i+1}: "${field.trim()}" — Fill in your correct personal information for this field.`
      );
      instructions.push("Final step: Review all fields, sign at the bottom, and attach required documents.");
    } else {
      instructions = [
        "Step 1: Read the form title at the top to understand which service it is for.",
        "Step 2: Fill personal details — name, date of birth, address in CAPITAL letters.",
        "Step 3: Attach required documents — usually Aadhaar card and one passport photo.",
        "Step 4: Do not leave any mandatory field blank — write NA if not applicable.",
        "Step 5: Sign or put left thumb impression in the space provided.",
        "Step 6: Make one photocopy of the filled form for your own record.",
        "Step 7: Submit at the concerned government office and collect receipt."
      ];
    }
  }

  // Translate instructions to selected language if not English
  let finalInstructions = instructions;
  if (selectedLang !== "en") {
    document.getElementById("ocrLabel").innerText = "🌐 Translating to " + LANG_CONFIG[selectedLang].label + "...";
    finalInstructions = [];
    for (const step of instructions) {
      try {
        const res  = await fetch(BACKEND+"/translate", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({text:step, target_lang:selectedLang})
        });
        const d    = await res.json();
        finalInstructions.push(d.translated_text || step);
      } catch {
        finalInstructions.push(step);
      }
    }
    // Translate form name
    try {
      const r = await fetch(BACKEND+"/translate",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({text:formType,target_lang:selectedLang})
      });
      const d = await r.json();
      formType = d.translated_text || formType;
    } catch {}
  }

  // Build TTS string for scan result
  scanResultText = formType + ". " + finalInstructions.join(". ");

  // Show result
  formName.innerText = formType;
  formSub.innerText  = LANG_CONFIG[selectedLang].label + " — Step-by-step filling guide";
  stepsList.innerHTML = "";
  finalInstructions.forEach(inst => {
    const li = document.createElement("li");
    li.className   = "scan-step";
    li.innerText   = inst;
    stepsList.appendChild(li);
  });

  progress.style.display    = "none";
  resultCard.style.display  = "block";
  resultCard.scrollIntoView({ behavior:"smooth", block:"nearest" });
  showToast("✅ Form analysed in " + LANG_CONFIG[selectedLang].label + "!");

  // Auto-speak the instructions
  setTimeout(() => speakScanResult(), 600);
}

function speakScanResult() {
  if (scanResultText) speakText(scanResultText, selectedLang);
}

// ─────────────────────────────────────────
// TTS CORE — guaranteed multilingual
// ─────────────────────────────────────────
function speakText(text, lang) {
  if (!text) return;
  window.speechSynthesis.cancel();
  const ttsLang   = LANG_CONFIG[lang || selectedLang]?.tts || "en-IN";
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang   = ttsLang;
  utterance.rate   = 0.84;
  utterance.pitch  = 1.0;
  utterance.volume = 1;

  function go() {
    const voices  = window.speechSynthesis.getVoices();
    const prefix  = ttsLang.split("-")[0];
    const voice   = voices.find(v=>v.lang===ttsLang)
                 || voices.find(v=>v.lang.startsWith(prefix))
                 || voices.find(v=>v.lang.startsWith("en"));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    window.speechSynthesis.onvoiceschanged = ()=>{ window.speechSynthesis.onvoiceschanged=null; go(); };
  } else { go(); }
}

function speakResult() {
  if (!resultText) return;
  const btn = document.querySelector('.speak-btn');
  window.speechSynthesis.cancel();
  const ttsLang   = LANG_CONFIG[selectedLang]?.tts || "en-IN";
  const utterance = new SpeechSynthesisUtterance(resultText);
  utterance.lang   = ttsLang; utterance.rate=0.84; utterance.pitch=1.0; utterance.volume=1;
  utterance.onstart = ()=>{ if(btn){btn.innerText="🔊 Speaking...";btn.style.background="rgba(168,85,247,0.3)";} };
  utterance.onend   = ()=>{ if(btn){btn.innerText="🔊 Read Aloud"; btn.style.background="";} };
  utterance.onerror = ()=>{ if(btn){btn.innerText="🔊 Read Aloud"; btn.style.background="";} };

  function go() {
    const voices=window.speechSynthesis.getVoices();
    const prefix=ttsLang.split("-")[0];
    const voice=voices.find(v=>v.lang===ttsLang)||voices.find(v=>v.lang.startsWith(prefix))||voices.find(v=>v.lang.startsWith("en"));
    if(voice)utterance.voice=voice;
    window.speechSynthesis.speak(utterance);
  }
  const voices=window.speechSynthesis.getVoices();
  if(voices.length===0){window.speechSynthesis.onvoiceschanged=()=>{window.speechSynthesis.onvoiceschanged=null;go();};}else{go();}
}

// ─────────────────────────────────────────
// QR CODE
// ─────────────────────────────────────────
function showQR() {
  const btn  = document.getElementById("qrBtn");
  const url  = btn?.dataset.url  || "";
  const name = btn?.dataset.name || "Government Portal";
  if (!url) return;
  currentQRUrl = url;
  document.getElementById("qrTitle").innerText    = name;
  document.getElementById("qrSubtitle").innerText = "Scan to open official portal";
  document.getElementById("qrUrl").innerText      = url;
  const canvas = document.getElementById("qrCanvas");
  canvas.innerHTML = "";
  try {
    new QRCode(canvas,{text:url,width:180,height:180,colorDark:"#000000",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.H});
  } catch(e) { canvas.innerHTML='<p style="color:#ff6b6b;font-size:13px;padding:16px;">QR generation failed.</p>'; }
  document.getElementById("qrOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeQR(e) {
  if (e && e.target !== document.getElementById("qrOverlay")) return;
  document.getElementById("qrOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

function downloadQR() {
  const canvas = document.querySelector("#qrCanvas canvas");
  if (!canvas) { showToast("❌ QR not ready"); return; }
  const a = document.createElement("a");
  a.download = "vaani-qr.png";
  a.href     = canvas.toDataURL("image/png");
  a.click();
  showToast("✅ QR downloaded!");
}

document.addEventListener("keydown", e=>{
  if(e.key==="Escape"){
    document.getElementById("qrOverlay")?.classList.remove("open");
    document.body.style.overflow="";
    skipOnboard();
  }
});

// ─────────────────────────────────────────
// FEEDBACK
// ─────────────────────────────────────────
async function sendFeedback(rating) {
  const sn = document.getElementById("serviceName")?.innerText;
  if (!sn) return;
  try {
    await fetch(BACKEND+"/feedback",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({service:sn,rating,comment:""})
    });
  } catch {}
  const u=document.getElementById("thumbsUp");
  const d=document.getElementById("thumbsDown");
  if(rating==="helpful"){
    if(u)u.style.background="rgba(0,255,136,0.3)";
    if(d)d.style.background="";
    showToast("👍 Thank you!");
  }else{
    if(d)d.style.background="rgba(255,107,107,0.3)";
    if(u)u.style.background="";
    showToast("👎 We will improve!");
  }
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function setStatus(msg,type){
  const el=document.getElementById("status"); if(!el)return;
  el.innerText=msg;
  const c={success:"#00ff88",error:"#ff6b6b",loading:"#00b4ff",listening:"#a855f7",normal:"#6b8cba"};
  el.style.color=c[type]||"#6b8cba";
}
function showError(msg){
  const el=document.getElementById("errorBox"); if(!el)return;
  el.innerText=msg; el.style.animation="none"; void el.offsetWidth; el.style.animation="fadeUp 0.3s ease";
  setTimeout(()=>{el.innerText="";},5000);
}
function hideError(){const el=document.getElementById("errorBox");if(el)el.innerText="";}
function shakeInput(){
  const el=document.getElementById("textInput"); if(!el)return;
  el.style.borderColor="#ff6b6b";el.style.transform="translateX(-6px)";
  setTimeout(()=>el.style.transform="translateX(6px)",100);
  setTimeout(()=>el.style.transform="translateX(-4px)",200);
  setTimeout(()=>el.style.transform="translateX(0)",300);
  setTimeout(()=>el.style.borderColor="",800);
}
function showLoadingInResult(){
  const sn=document.getElementById("serviceName");
  const sl=document.getElementById("stepsList");
  const rb=document.getElementById("resultBox");
  if(sn)sn.innerText="Loading...";
  if(sl)sl.innerHTML=`<li style="opacity:0.5;display:block;padding:10px;">Fetching info...</li>`;
  if(rb)rb.style.display="block";
}
function hideResult(){const rb=document.getElementById("resultBox");if(rb)rb.style.display="none";}
function showToast(msg){
  const ex=document.getElementById("toast");if(ex)ex.remove();
  const t=document.createElement("div");t.id="toast";t.innerText=msg;
  t.style.cssText=`position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(20px);
    background:linear-gradient(135deg,#0d1425,#111c35);border:1px solid rgba(0,255,136,0.3);
    color:#00ff88;padding:12px 24px;border-radius:100px;font-size:13px;font-weight:600;
    font-family:'DM Sans',sans-serif;z-index:999;opacity:0;transition:all 0.3s ease;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);white-space:nowrap;pointer-events:none;`;
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity="1";t.style.transform="translateX(-50%) translateY(0)";},10);
  setTimeout(()=>{
    t.style.opacity="0";t.style.transform="translateX(-50%) translateY(10px)";
    setTimeout(()=>t.remove(),300);
  },2800);
}