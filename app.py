from flask import Flask, request, jsonify
from flask_cors import CORS
from deep_translator import GoogleTranslator
from datetime import datetime, timedelta
import hashlib, os, random, string
 
# ── Optional Twilio import ──
try:
    from twilio.rest import Client as TwilioClient
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
 
app = Flask(__name__)
CORS(app)
 
# ══════════════════════════════════════
# CONFIG  –  set these in Render env vars
# ══════════════════════════════════════
TWILIO_SID    = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN  = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE  = os.environ.get("TWILIO_PHONE_NUMBER", "")   # e.g. +14155552671
 
# ══════════════════════════════════════
# IN-MEMORY STORES  (replace with DB for production)
# ══════════════════════════════════════
users       = {}   # phone -> {name, phone, verified, history}
otp_store   = {}   # phone -> {otp, expires}
sessions    = {}   # token -> phone
feedback_db = []
 
# ══════════════════════════════════════
# HELPERS
# ══════════════════════════════════════
def make_token(phone):
    raw = f"{phone}{datetime.now().isoformat()}"
    return hashlib.sha256(raw.encode()).hexdigest()
 
def gen_otp():
    return "".join(random.choices(string.digits, k=6))
 
def send_otp_sms(phone, otp):
    """Send OTP via Twilio.  Returns (success, message)."""
    if not TWILIO_AVAILABLE or not TWILIO_SID:
        # Dev mode: print OTP to console, still return success
        print(f"\n[DEV MODE] OTP for {phone}: {otp}\n")
        return True, "OTP sent (dev mode – check server console)"
    try:
        client = TwilioClient(TWILIO_SID, TWILIO_TOKEN)
        client.messages.create(
            body=f"Your VAANI OTP is: {otp}. Valid for 10 minutes.",
            from_=TWILIO_PHONE,
            to=phone
        )
        return True, "OTP sent successfully"
    except Exception as e:
        print("Twilio error:", e)
        return False, str(e)
 
# ══════════════════════════════════════
# TEST
# ══════════════════════════════════════
@app.route("/")
def home():
    return jsonify({"message": "VAANI Backend is running!", "status": "active"})
 
# ══════════════════════════════════════
# SEND OTP
# ══════════════════════════════════════
@app.route("/send_otp", methods=["POST"])
def send_otp():
    data    = request.get_json()
    phone   = data.get("phone", "").strip()
    name    = data.get("name", "").strip()   # optional (for registration)
 
    if not phone or len(phone) < 10:
        return jsonify({"success": False, "message": "Enter a valid phone number"})
 
    # Normalize: ensure E.164 format for India if not already
    if not phone.startswith("+"):
        phone = "+91" + phone.lstrip("0")
 
    otp     = gen_otp()
    expires = datetime.now() + timedelta(minutes=10)
    otp_store[phone] = {"otp": otp, "expires": expires, "name": name}
 
    ok, msg = send_otp_sms(phone, otp)
    if ok:
        return jsonify({"success": True, "message": msg, "phone": phone})
    return jsonify({"success": False, "message": "Failed to send OTP: " + msg})
 
# ══════════════════════════════════════
# VERIFY OTP  (login + auto-register)
# ══════════════════════════════════════
@app.route("/verify_otp", methods=["POST"])
def verify_otp():
    data  = request.get_json()
    phone = data.get("phone", "").strip()
    otp   = data.get("otp", "").strip()
    name  = data.get("name", "").strip()
 
    if not phone.startswith("+"):
        phone = "+91" + phone.lstrip("0")
 
    record = otp_store.get(phone)
    if not record:
        return jsonify({"success": False, "message": "No OTP requested for this number"})
 
    if datetime.now() > record["expires"]:
        del otp_store[phone]
        return jsonify({"success": False, "message": "OTP expired. Request a new one"})
 
    if record["otp"] != otp:
        return jsonify({"success": False, "message": "Incorrect OTP"})
 
    # OTP correct → clear it
    del otp_store[phone]
 
    # Auto-register if first time
    display_name = name or record.get("name") or "User"
    if phone not in users:
        users[phone] = {"name": display_name, "phone": phone, "verified": True, "history": []}
 
    token = make_token(phone)
    sessions[token] = phone
 
    return jsonify({
        "success": True,
        "message": "Login successful",
        "token": token,
        "user": {"name": users[phone]["name"], "phone": phone}
    })
 
# ══════════════════════════════════════
# LOGOUT
# ══════════════════════════════════════
@app.route("/logout", methods=["POST"])
def logout():
    data  = request.get_json()
    token = data.get("token", "")
    sessions.pop(token, None)
    return jsonify({"success": True})
 
# ══════════════════════════════════════
# TRANSLATE
# ══════════════════════════════════════
@app.route("/translate", methods=["POST"])
def translate():
    data = request.get_json()
    text = data.get("text", "")
    lang = data.get("target_lang", "en")
    if lang == "en":
        return jsonify({"translated_text": text})
    try:
        translated = GoogleTranslator(source="auto", target=lang).translate(text)
        return jsonify({"translated_text": translated})
    except Exception as e:
        return jsonify({"translated_text": text, "error": str(e)})
 
# ══════════════════════════════════════
# SERVICE DATABASE  (12 services)
# ══════════════════════════════════════
SERVICE_DB = {
    "ration": {
        "name": "Ration Card",
        "icon": "🍚",
        "link": "https://www.tnpds.gov.in",
        "steps": [
            "Visit the nearest Civil Supplies office or go to https://tnpds.gov.in",
            "Fill the ration card application form (Form A for new card)",
            "Attach proof of address (Aadhaar / Voter ID / Electricity Bill)",
            "Attach proof of identity for each family member",
            "Submit the form at the office and collect the acknowledgement slip",
            "Inspector visits your home for verification within 30 days",
            "Collect your ration card from the office or receive it by post"
        ]
    },
    "pension": {
        "name": "Old Age Pension (IGNOAPS)",
        "icon": "💰",
        "link": "https://ignoaps.gov.in",
        "steps": [
            "Eligibility: age 60+ and BPL (Below Poverty Line) card holder",
            "Get the IGNOAPS application form from the Village Panchayat or Block office",
            "Fill the form and attach age proof (birth certificate / Aadhaar)",
            "Attach BPL card and identity proof",
            "Submit at the Block Development Office (BDO)",
            "Social welfare officer will verify your details",
            "₹200–₹500 per month credited to your bank account after approval"
        ]
    },
    "aadhaar": {
        "name": "Aadhaar Card",
        "icon": "🪪",
        "link": "https://uidai.gov.in",
        "steps": [
            "Book an appointment at https://appointments.uidai.gov.in or visit a nearby Aadhaar Seva Kendra",
            "Bring any one of: Passport, Voter ID, Driving Licence, or Ration Card",
            "Fill the Aadhaar Enrolment Form at the centre",
            "Give biometrics: 10 fingerprints + iris scan + photograph",
            "Collect the acknowledgement slip with Enrolment ID",
            "Download e-Aadhaar from https://eaadhaar.uidai.gov.in after 90 days"
        ]
    },
    "birth_certificate": {
        "name": "Birth Certificate",
        "icon": "👶",
        "link": "https://crsorgi.gov.in",
        "steps": [
            "For hospital births: hospital provides Form 1 — collect it within 21 days",
            "For home births: register at the local Municipal or Panchayat office",
            "Submit Form 1 along with parent's Aadhaar and marriage certificate",
            "Pay the nominal fee (₹10–₹50 depending on state)",
            "If registering after 21 days but within 1 year: attach late-registration reason letter",
            "After 1 year: requires an affidavit and Magistrate's order",
            "Certificate issued within 7 working days"
        ]
    },
    "voter_id": {
        "name": "Voter ID (EPIC)",
        "icon": "🗳️",
        "link": "https://voters.eci.gov.in",
        "steps": [
            "Visit https://voters.eci.gov.in or use the Voter Helpline App",
            "Fill Form 6 for new registration (must be 18+ as on 1st Jan of the year)",
            "Upload or submit proof of age and proof of address",
            "Booth Level Officer (BLO) will verify your address",
            "Your name appears on the electoral roll after verification",
            "Collect Voter ID card (EPIC) from BLO or download e-EPIC from portal"
        ]
    },
    "health_insurance": {
        "name": "Ayushman Bharat (PMJAY)",
        "icon": "🏥",
        "link": "https://pmjay.gov.in",
        "steps": [
            "Check eligibility at https://mera.pmjay.gov.in using your Aadhaar or Ration Card number",
            "If eligible, visit the nearest government or empanelled private hospital",
            "Carry your Aadhaar card (no other document needed for eligible families)",
            "Hospital's Ayushman Mitra will verify your eligibility online",
            "Get an Ayushman card issued at the hospital — completely free",
            "Covers ₹5 lakh per family per year for 1,500+ treatments",
            "No need to pay anything — cashless treatment at empanelled hospitals"
        ]
    },
    "income_certificate": {
        "name": "Income Certificate",
        "icon": "📄",
        "link": "https://edistrict.gov.in",
        "steps": [
            "Visit the e-District portal of your state or the nearest CSC (Common Service Centre)",
            "Fill the income certificate application form",
            "Attach salary slips (for salaried) OR self-declaration (for farmers/workers)",
            "Attach Aadhaar card and address proof",
            "Pay the application fee (₹10–₹30 depending on state)",
            "Revenue Inspector verifies and recommends to Tahsildar",
            "Certificate issued within 15 working days"
        ]
    },
    "land_records": {
        "name": "Land Records (Patta / Chitta)",
        "icon": "🏞️",
        "link": "https://eservices.tn.gov.in",
        "steps": [
            "Visit https://eservices.tn.gov.in (Tamil Nadu) or your state's land portal",
            "Select 'Patta/Chitta' or 'Land Records' service",
            "Enter your district, taluk, village, and survey number",
            "Download and print the Patta document (₹60 fee online)",
            "For name transfer after sale/inheritance: visit Taluk office with sale deed",
            "Submit Form 1A along with parent document and ID proof",
            "Mutation (name change) processed within 30 days"
        ]
    },
    "scholarship": {
        "name": "Government Scholarship",
        "icon": "🎓",
        "link": "https://scholarships.gov.in",
        "steps": [
            "Visit https://scholarships.gov.in (National Scholarship Portal)",
            "Register with your Aadhaar number and mobile number",
            "Select the appropriate scholarship scheme (SC/ST/OBC/Minority/Merit)",
            "Fill the application form with academic details and upload marksheets",
            "Upload income certificate, caste certificate, and bank passbook",
            "Submit before the deadline (usually October–November each year)",
            "Track application status on the portal; amount directly credited to bank"
        ]
    },
    "driving_licence": {
        "name": "Driving Licence",
        "icon": "🚗",
        "link": "https://sarathi.parivahan.gov.in",
        "steps": [
            "Apply for Learner's Licence first at https://sarathi.parivahan.gov.in",
            "Fill Form 1 (medical self-declaration) and Form 2 (learner's licence)",
            "Book a slot for the online learner's licence test (traffic rules and road signs)",
            "Pass the computer-based test at the RTO",
            "After holding the LL for minimum 30 days, apply for the Driving Licence",
            "Visit RTO on the appointment date with LL, Aadhaar, and passport-size photos",
            "Pass the practical driving test — DL issued in 7 days or by post"
        ]
    },
    "pan_card": {
        "name": "PAN Card",
        "icon": "💳",
        "link": "https://www.onlineservices.nsdl.com",
        "steps": [
            "Apply online at https://www.onlineservices.nsdl.com (NSDL) or https://www.utiitsl.com",
            "Fill Form 49A for Indian citizens",
            "Upload proof of identity, proof of address, and proof of date of birth",
            "Pay the fee: ₹107 for physical PAN card (delivered by post)",
            "Submit and note the 15-digit acknowledgement number",
            "e-PAN (digital) is emailed within 24–48 hours",
            "Physical PAN card delivered to registered address in 15–20 days"
        ]
    },
    "caste_certificate": {
        "name": "Caste / Community Certificate",
        "icon": "📜",
        "link": "https://edistrict.gov.in",
        "steps": [
            "Visit the e-District portal of your state or nearest CSC",
            "Select 'Caste Certificate' service",
            "Fill the application form with your community details",
            "Attach: father's caste certificate (or school leaving certificate showing community)",
            "Attach Aadhaar card, address proof, and passport-size photo",
            "Pay the fee (₹10–₹30 depending on state)",
            "Revenue Inspector verifies and Tahsildar issues the certificate in 15 days"
        ]
    }
}
 
# Keyword map for detection
KEYWORD_MAP = {
    "ration":           ["ration", "ration card", "food", "ரேஷன்", "राशन", "రేషన్", "ಪಡಿತರ", "റേഷൻ"],
    "pension":          ["pension", "old age", "retirement", "பென்சன்", "ஓய்வூதியம்", "पेंशन", "పెన్షన్", "ನಿವೃತ್ತಿ"],
    "aadhaar":          ["aadhaar", "aadhar", "uid", "biometric", "ஆதார்", "आधार", "ఆధార్", "ಆಧಾರ್"],
    "birth_certificate":["birth", "born", "birth certificate", "பிறப்பு", "जन्म", "జన్మ", "ಜನನ"],
    "voter_id":         ["voter", "voter id", "election", "epic", "வாக்காளர்", "मतदाता", "ఓటర్", "ಮತದಾರ"],
    "health_insurance": ["health", "ayushman", "pmjay", "hospital", "insurance", "மருத்துவம்", "आयुष्मान", "ఆయుష్మాన్"],
    "income_certificate":["income", "salary certificate", "வருமானம்", "आय प्रमाण", "ఆదాయం", "ಆದಾಯ"],
    "land_records":     ["land", "patta", "chitta", "survey", "நிலம்", "भूमि", "భూమి", "ಭೂಮಿ"],
    "scholarship":      ["scholarship", "study", "education", "student", "கல்வி", "छात्रवृत्ति", "స్కాలర్షిప్"],
    "driving_licence":  ["driving", "licence", "license", "dl", "ஓட்டுநர்", "ड्राइविंग", "డ్రైవింగ్"],
    "pan_card":         ["pan", "pan card", "tax", "income tax", "பான்", "पैन", "పాన్"],
    "caste_certificate":["caste", "community", "sc", "st", "obc", "சாதி", "जाति", "కులం", "ಜಾತಿ"]
}
 
def detect_service(text):
    lower = text.lower().strip()
    for service_key, keywords in KEYWORD_MAP.items():
        for kw in keywords:
            if kw.lower() in lower:
                return service_key
    return None
 
# ══════════════════════════════════════
# GET SERVICE
# ══════════════════════════════════════
@app.route("/get_service", methods=["POST"])
def get_service():
    data = request.get_json()
    text = data.get("text", "")
    lang = data.get("target_lang", "en")
 
    key = detect_service(text)
    if not key or key not in SERVICE_DB:
        return jsonify({"success": False, "message": "Service not found. Try: ration, pension, aadhaar, voter, health, pan, driving, scholarship, income, land, birth, caste"})
 
    service = SERVICE_DB[key]
    steps   = service["steps"]
 
    # Translate steps if not English
    if lang != "en":
        translated_steps = []
        for step in steps:
            try:
                t = GoogleTranslator(source="en", target=lang).translate(step)
                translated_steps.append(t)
            except:
                translated_steps.append(step)
        steps = translated_steps
 
        try:
            name = GoogleTranslator(source="en", target=lang).translate(service["name"])
        except:
            name = service["name"]
    else:
        name = service["name"]
 
    return jsonify({
        "success":  True,
        "service":  name,
        "icon":     service["icon"],
        "link":     service["link"],
        "steps":    steps,
        "service_key": key
    })
 
# ══════════════════════════════════════
# SAVE HISTORY
# ══════════════════════════════════════
@app.route("/save_history", methods=["POST"])
def save_history():
    data    = request.get_json()
    token   = data.get("token", "")
    service = data.get("service", "")
    phone   = sessions.get(token)
    if phone and phone in users:
        users[phone]["history"].append({"service": service, "time": str(datetime.now())})
    return jsonify({"success": True})
 
# ══════════════════════════════════════
# FEEDBACK
# ══════════════════════════════════════
@app.route("/feedback", methods=["POST"])
def feedback():
    data = request.get_json()
    feedback_db.append({
        "service": data.get("service", ""),
        "rating":  data.get("rating", ""),
        "comment": data.get("comment", ""),
        "time":    str(datetime.now())
    })
    return jsonify({"success": True})
 
# ══════════════════════════════════════
# RUN
# ══════════════════════════════════════
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)