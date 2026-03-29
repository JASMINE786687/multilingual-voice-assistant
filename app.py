from flask import Flask, request, jsonify
from flask_cors import CORS
from deep_translator import GoogleTranslator
from datetime import datetime, timedelta
import hashlib, os, random, string, requests

app = Flask(__name__)
CORS(app)

# ══════════════════════════════════════
# FAST2SMS CONFIG
# ══════════════════════════════════════
FAST2SMS_API_KEY = os.environ.get(
    "FAST2SMS_API_KEY",
    "0z0H3sPDkP9TM8ji4ax8jEhAxjnHCBMtIuuTvva9ZaY8tvqrxQ1ndd81CAIB"
)

# ══════════════════════════════════════
# IN-MEMORY DATABASE
# ══════════════════════════════════════
users       = {}
otp_store   = {}
sessions    = {}
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
    try:
        payload = {
            "sender_id": "FSTSMS",
            "message":   f"Your VAANI OTP is {otp}. Valid for 5 minutes. Do not share.",
            "language":  "english",
            "route":     "q",
            "numbers":   phone.replace("+91", "").replace("+", "")
        }
        headers = {
            "authorization": FAST2SMS_API_KEY,
            "Content-Type":  "application/json"
        }
        response = requests.post(
            "https://www.fast2sms.com/dev/bulkV2",
            json=payload, headers=headers, timeout=10
        )
        print("FAST2SMS RESPONSE:", response.text)
        if response.status_code == 200:
            data = response.json()
            if data.get("return") == True:
                return True, "OTP sent successfully"
            return False, data.get("message", "Fast2SMS error")
        return False, response.text
    except Exception as e:
        print("SMS ERROR:", e)
        # Dev fallback — OTP printed in Render logs
        print(f"\n[DEV] OTP for {phone}: {otp}\n")
        return True, "OTP sent (check server logs)"

# ══════════════════════════════════════
# 12-SERVICE DATABASE
# ══════════════════════════════════════
SERVICE_DB = {
    "ration": {
        "name": "Ration Card",
        "icon": "🍚",
        "link": "https://www.tnpds.gov.in",
        "steps": [
            "Visit the nearest Civil Supplies office or go to https://tnpds.gov.in",
            "Fill the ration card application form (Form A for new card)",
            "Attach proof of address: Aadhaar card, Voter ID, or Electricity Bill",
            "Attach proof of identity for every family member",
            "Submit the form and collect the acknowledgement slip",
            "An inspector will visit your home for verification within 30 days",
            "Collect your ration card from the office or receive it by post"
        ]
    },
    "pension": {
        "name": "Old Age Pension (IGNOAPS)",
        "icon": "💰",
        "link": "https://ignoaps.gov.in",
        "steps": [
            "Eligibility: age 60 or above and BPL (Below Poverty Line) card holder",
            "Get the IGNOAPS application form from Village Panchayat or Block office",
            "Fill the form and attach age proof: birth certificate or Aadhaar",
            "Attach BPL card and identity proof",
            "Submit at the Block Development Office (BDO)",
            "Social welfare officer will verify your details",
            "Rs 200 to Rs 500 per month credited to your bank account after approval"
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
            "Give biometrics: 10 fingerprints, iris scan, and photograph",
            "Collect the acknowledgement slip with your Enrolment ID",
            "Download your e-Aadhaar from https://eaadhaar.uidai.gov.in after 90 days"
        ]
    },
    "birth_certificate": {
        "name": "Birth Certificate",
        "icon": "👶",
        "link": "https://crsorgi.gov.in",
        "steps": [
            "For hospital births: hospital gives Form 1, collect within 21 days",
            "For home births: register at the local Municipal or Panchayat office",
            "Submit Form 1 with parents Aadhaar and marriage certificate",
            "Pay the fee: Rs 10 to Rs 50 depending on your state",
            "If registering after 21 days but within 1 year: attach late-registration reason letter",
            "After 1 year: requires an affidavit and Magistrate order",
            "Certificate issued within 7 working days"
        ]
    },
    "voter_id": {
        "name": "Voter ID (EPIC)",
        "icon": "🗳️",
        "link": "https://voters.eci.gov.in",
        "steps": [
            "Visit https://voters.eci.gov.in or use the Voter Helpline App",
            "Fill Form 6 for new registration, you must be 18 or above",
            "Upload or submit proof of age and proof of address",
            "Booth Level Officer (BLO) will verify your address",
            "Your name appears on the electoral roll after verification",
            "Collect your Voter ID card from BLO or download e-EPIC from the portal"
        ]
    },
    "health_insurance": {
        "name": "Ayushman Bharat (PMJAY)",
        "icon": "🏥",
        "link": "https://pmjay.gov.in",
        "steps": [
            "Check eligibility at https://mera.pmjay.gov.in using Aadhaar or Ration Card number",
            "If eligible, visit the nearest government or empanelled private hospital",
            "Carry your Aadhaar card, no other document needed for eligible families",
            "Hospital Ayushman Mitra will verify your eligibility online",
            "Get your Ayushman card issued at the hospital, completely free",
            "Covers Rs 5 lakh per family per year for 1500 plus treatments",
            "No payment needed, cashless treatment at empanelled hospitals"
        ]
    },
    "income_certificate": {
        "name": "Income Certificate",
        "icon": "📄",
        "link": "https://edistrict.gov.in",
        "steps": [
            "Visit the e-District portal of your state or the nearest CSC (Common Service Centre)",
            "Fill the income certificate application form",
            "Attach salary slips for salaried persons or self-declaration for farmers and workers",
            "Attach Aadhaar card and address proof",
            "Pay the application fee: Rs 10 to Rs 30 depending on state",
            "Revenue Inspector verifies and recommends to Tahsildar",
            "Certificate issued within 15 working days"
        ]
    },
    "land_records": {
        "name": "Land Records (Patta / Chitta)",
        "icon": "🏞️",
        "link": "https://eservices.tn.gov.in",
        "steps": [
            "Visit https://eservices.tn.gov.in for Tamil Nadu or your state land portal",
            "Select Patta or Chitta or Land Records service",
            "Enter your district, taluk, village, and survey number",
            "Download and print the Patta document, Rs 60 fee online",
            "For name transfer after sale or inheritance: visit Taluk office with sale deed",
            "Submit Form 1A with parent document and ID proof",
            "Mutation (name change) processed within 30 days"
        ]
    },
    "scholarship": {
        "name": "Government Scholarship",
        "icon": "🎓",
        "link": "https://scholarships.gov.in",
        "steps": [
            "Visit https://scholarships.gov.in, the National Scholarship Portal",
            "Register with your Aadhaar number and mobile number",
            "Select the right scholarship scheme: SC, ST, OBC, Minority, or Merit",
            "Fill the application form with academic details and upload marksheets",
            "Upload income certificate, caste certificate, and bank passbook",
            "Submit before the deadline, usually October to November each year",
            "Track your application on the portal, amount directly credited to bank"
        ]
    },
    "driving_licence": {
        "name": "Driving Licence",
        "icon": "🚗",
        "link": "https://sarathi.parivahan.gov.in",
        "steps": [
            "Apply for Learner Licence first at https://sarathi.parivahan.gov.in",
            "Fill Form 1 (medical self-declaration) and Form 2 (learner licence)",
            "Book a slot for the online learner licence test on traffic rules and road signs",
            "Pass the computer-based test at the RTO",
            "After holding the LL for minimum 30 days, apply for the Driving Licence",
            "Visit RTO on appointment date with LL, Aadhaar, and passport-size photos",
            "Pass the practical driving test, DL issued in 7 days or by post"
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
            "Pay the fee: Rs 107 for physical PAN card delivered by post",
            "Submit and note your 15-digit acknowledgement number",
            "e-PAN (digital) is emailed within 24 to 48 hours",
            "Physical PAN card delivered to registered address in 15 to 20 days"
        ]
    },
    "caste_certificate": {
        "name": "Caste / Community Certificate",
        "icon": "📜",
        "link": "https://edistrict.gov.in",
        "steps": [
            "Visit the e-District portal of your state or nearest CSC",
            "Select Caste Certificate service",
            "Fill the application form with your community details",
            "Attach father caste certificate or school leaving certificate showing community",
            "Attach Aadhaar card, address proof, and passport-size photo",
            "Pay the fee: Rs 10 to Rs 30 depending on state",
            "Revenue Inspector verifies and Tahsildar issues certificate in 15 days"
        ]
    }
}

# ══════════════════════════════════════
# KEYWORD DETECTION MAP
# ══════════════════════════════════════
KEYWORD_MAP = {
    "ration":            ["ration", "food card", "ரேஷன்", "राशन", "రేషన్", "ಪಡಿತರ", "റേഷൻ"],
    "pension":           ["pension", "old age", "ஓய்வூதியம்", "पेंशन", "పెన్షన్", "ನಿವೃತ್ತಿ"],
    "aadhaar":           ["aadhaar", "aadhar", "uid", "ஆதார்", "आधार", "ఆధార్", "ಆಧಾರ್"],
    "birth_certificate": ["birth", "born", "பிறப்பு", "जन्म", "జన్మ", "ಜನನ"],
    "voter_id":          ["voter", "election", "epic", "வாக்காளர்", "मतदाता", "ఓటర్", "ಮತದಾರ"],
    "health_insurance":  ["health", "ayushman", "pmjay", "hospital", "மருத்துவம்", "आयुष्मान"],
    "income_certificate":["income", "salary", "வருமானம்", "आय प्रमाण", "ఆదాయం"],
    "land_records":      ["land", "patta", "chitta", "நிலம்", "भूमि", "భూమి"],
    "scholarship":       ["scholarship", "study", "student", "கல்வி", "छात्रवृत्ति"],
    "driving_licence":   ["driving", "licence", "license", "ஓட்டுநர்", "ड्राइविंग"],
    "pan_card":          ["pan card", " pan ", "income tax", "பான்", "पैन"],
    "caste_certificate": ["caste", "community", " sc ", " st ", "obc", "சாதி", "जाति", "కులం"]
}

def detect_service(text):
    lower = " " + text.lower().strip() + " "
    for key, keywords in KEYWORD_MAP.items():
        for kw in keywords:
            if kw.lower() in lower:
                return key
    return None

# ══════════════════════════════════════
# ROUTES
# ══════════════════════════════════════

@app.route("/")
def home():
    return jsonify({"message": "VAANI Backend is running!", "status": "active"})

@app.route("/send_otp", methods=["POST"])
def send_otp():
    data  = request.get_json()
    phone = data.get("phone", "").strip()
    name  = data.get("name",  "").strip()

    if not phone or len(phone) < 10:
        return jsonify({"success": False, "message": "Invalid phone number"})

    if not phone.startswith("+"):
        phone = "+91" + phone

    otp     = gen_otp()
    expires = datetime.now() + timedelta(minutes=5)
    otp_store[phone] = {"otp": otp, "expires": expires, "name": name}

    ok, msg = send_otp_sms(phone, otp)
    if ok:
        return jsonify({"success": True, "message": msg, "phone": phone})
    return jsonify({"success": False, "message": msg})

@app.route("/verify_otp", methods=["POST"])
def verify_otp():
    data  = request.get_json()
    phone = data.get("phone", "").strip()
    otp   = data.get("otp",   "").strip()
    name  = data.get("name",  "").strip()

    if not phone.startswith("+"):
        phone = "+91" + phone

    record = otp_store.get(phone)
    if not record:
        return jsonify({"success": False, "message": "No OTP found"})
    if datetime.now() > record["expires"]:
        del otp_store[phone]
        return jsonify({"success": False, "message": "OTP expired"})
    if record["otp"] != otp:
        return jsonify({"success": False, "message": "Incorrect OTP"})

    del otp_store[phone]
    display_name = name or record.get("name") or "User"
    if phone not in users:
        users[phone] = {"name": display_name, "phone": phone, "history": []}
    token = make_token(phone)
    sessions[token] = phone

    return jsonify({
        "success": True,
        "token":   token,
        "user":    users[phone]
    })

@app.route("/logout", methods=["POST"])
def logout():
    data  = request.get_json()
    token = data.get("token", "")
    sessions.pop(token, None)
    return jsonify({"success": True})

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

@app.route("/get_service", methods=["POST"])
def get_service():
    data = request.get_json()
    text = data.get("text", "")
    lang = data.get("target_lang", "en")

    key = detect_service(text)
    if not key or key not in SERVICE_DB:
        return jsonify({
            "success": False,
            "message": "Service not found. Try: ration, pension, aadhaar, voter, health, pan, driving, scholarship, income, land, birth, caste"
        })

    svc   = SERVICE_DB[key]
    name  = svc["name"]
    steps = list(svc["steps"])

    if lang != "en":
        try:
            name = GoogleTranslator(source="en", target=lang).translate(name)
        except:
            pass
        translated_steps = []
        for step in steps:
            try:
                translated_steps.append(GoogleTranslator(source="en", target=lang).translate(step))
            except:
                translated_steps.append(step)
        steps = translated_steps

    return jsonify({
        "success":     True,
        "service":     name,
        "icon":        svc["icon"],
        "link":        svc["link"],
        "steps":       steps,
        "service_key": key
    })

@app.route("/save_history", methods=["POST"])
def save_history():
    data    = request.get_json()
    token   = data.get("token", "")
    service = data.get("service", "")
    phone   = sessions.get(token)
    if phone and phone in users:
        users[phone]["history"].append({
            "service": service,
            "time":    str(datetime.now())
        })
    return jsonify({"success": True})

@app.route("/feedback", methods=["POST"])
def feedback():
    data = request.get_json()
    feedback_db.append({
        "service": data.get("service", ""),
        "rating":  data.get("rating",  ""),
        "comment": data.get("comment", ""),
        "time":    str(datetime.now())
    })
    return jsonify({"success": True})

# ══════════════════════════════════════
# RUN
# ══════════════════════════════════════
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)