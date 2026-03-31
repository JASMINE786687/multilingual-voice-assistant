from flask import Flask, request, jsonify
from flask_cors import CORS
from deep_translator import GoogleTranslator
from datetime import datetime
import time, os, requests as req_lib

app = Flask(__name__)
CORS(app)

feedback_db = []

# ══════════════════════════════════════════
# TRANSLATION  — free, Google Translate via
# deep-translator. Retry once on failure.
# ══════════════════════════════════════════
def safe_translate(text, lang):
    if lang == "en" or not text.strip():
        return text
    for attempt in range(2):
        try:
            result = GoogleTranslator(source="en", target=lang).translate(text)
            return result if result else text
        except Exception as e:
            print(f"[translate] attempt {attempt+1} failed: {e}")
            if attempt == 0:
                time.sleep(0.6)
    return text

def translate_list(items, lang):
    if lang == "en":
        return items
    return [safe_translate(s, lang) for s in items]

# ══════════════════════════════════════════
# 12-SERVICE DATABASE
# ══════════════════════════════════════════
SERVICE_DB = {
    "ration": {
        "name": "Ration Card", "icon": "🍚", "link": "https://www.tnpds.gov.in",
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
        "name": "Old Age Pension (IGNOAPS)", "icon": "💰", "link": "https://ignoaps.gov.in",
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
        "name": "Aadhaar Card", "icon": "🪪", "link": "https://uidai.gov.in",
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
        "name": "Birth Certificate", "icon": "👶", "link": "https://crsorgi.gov.in",
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
        "name": "Voter ID (EPIC)", "icon": "🗳️", "link": "https://voters.eci.gov.in",
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
        "name": "Ayushman Bharat (PMJAY)", "icon": "🏥", "link": "https://pmjay.gov.in",
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
        "name": "Income Certificate", "icon": "📄", "link": "https://edistrict.gov.in",
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
        "name": "Land Records (Patta / Chitta)", "icon": "🏞️", "link": "https://eservices.tn.gov.in",
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
        "name": "Government Scholarship", "icon": "🎓", "link": "https://scholarships.gov.in",
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
        "name": "Driving Licence", "icon": "🚗", "link": "https://sarathi.parivahan.gov.in",
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
        "name": "PAN Card", "icon": "💳", "link": "https://www.onlineservices.nsdl.com",
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
        "name": "Caste / Community Certificate", "icon": "📜", "link": "https://edistrict.gov.in",
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

# ══════════════════════════════════════════
# KEYWORD MAP  (8 Indian languages)
# ══════════════════════════════════════════
KEYWORD_MAP = {
    "ration":            ["ration","food card","ரேஷன்","राशन","రేషన్","ಪಡಿತರ","റേഷൻ","রেশন","शिधापत्रिका"],
    "pension":           ["pension","old age","ஓய்வூதியம்","पेंशन","పెన్షన్","ನಿವೃತ್ತಿ","পেনশন","निवृत्तिवेतन"],
    "aadhaar":           ["aadhaar","aadhar","uid","ஆதார்","आधार","ఆధార్","ಆಧಾರ್","আধার"],
    "birth_certificate": ["birth","born","பிறப்பு","जन्म","జన్మ","ಜನನ","জন্ম"],
    "voter_id":          ["voter","election","epic","வாக்காளர்","मतदाता","ఓటర్","ಮತದಾರ","ভোটার"],
    "health_insurance":  ["health","ayushman","pmjay","hospital","மருத்துவம்","आयुष्मान","ఆయుష్మాన్","স্বাস্থ্য"],
    "income_certificate":["income","salary","வருமானம்","आय प्रमाण","ఆదాయం","ಆದಾಯ","আয়"],
    "land_records":      ["land","patta","chitta","நிலம்","भूमि","భూమి","ಭೂಮಿ","জমি"],
    "scholarship":       ["scholarship","study","student","கல்வி","छात्रवृत्ति","స్కాలర్షిప్","বৃত্তি"],
    "driving_licence":   ["driving","licence","license","ஓட்டுநர்","ड्राइविंग","డ్రైవింగ్","ಚಾಲನೆ","ড্রাইভিং"],
    "pan_card":          ["pan card"," pan ","income tax","பான்","पैन","పాన్","ಪ್ಯಾನ್","প্যান"],
    "caste_certificate": ["caste","community"," sc "," st ","obc","சாதி","जाति","కులం","ಜಾತಿ","জাতি"]
}

def detect_service(text):
    lower = " " + text.lower().strip() + " "
    for key, kws in KEYWORD_MAP.items():
        for kw in kws:
            if kw.lower() in lower:
                return key
    return None

# ══════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════

@app.route("/")
def home():
    return jsonify({"message": "VAANI Backend is running!", "status": "active"})

@app.route("/translate", methods=["POST"])
def translate():
    data = request.get_json()
    return jsonify({"translated_text": safe_translate(data.get("text",""), data.get("target_lang","en"))})

@app.route("/get_service", methods=["POST"])
def get_service():
    data = request.get_json()
    text = data.get("text", "")
    lang = data.get("target_lang", "en")
    key  = detect_service(text)

    if not key:
        return jsonify({"success": False,
            "message": "Service not found. Try: ration, pension, aadhaar, voter, health, pan, driving, scholarship, income, land, birth, caste"})

    svc = SERVICE_DB[key]
    return jsonify({
        "success":     True,
        "service":     safe_translate(svc["name"], lang),
        "icon":        svc["icon"],
        "link":        svc["link"],
        "steps":       translate_list(list(svc["steps"]), lang),
        "service_key": key
    })

# ── AI AGENT chat endpoint ──────────────────────────
@app.route("/agent", methods=["POST"])
def agent():
    data     = request.get_json()
    question = data.get("question", "").strip()
    lang     = data.get("lang", "en")

    if not question:
        return jsonify({"answer": "Please ask a question."})

    q_lower = question.lower()

    # ── Rule-based answers for common gov questions ──
    ANSWERS = {
        ("ration","food card"):
            "To get a Ration Card: visit Civil Supplies office, fill Form A, attach Aadhaar and address proof for all family members. Verification happens within 30 days.",
        ("aadhaar","aadhar","uid"):
            "For Aadhaar: visit uidai.gov.in or nearest Seva Kendra, give 10 fingerprints and iris scan. Download e-Aadhaar after 90 days.",
        ("pension","old age"):
            "Old Age Pension (IGNOAPS): must be 60+ and BPL card holder. Apply at Village Panchayat or BDO office. Rs 200-500/month after approval.",
        ("voter","election","epic"):
            "Voter ID: visit voters.eci.gov.in, fill Form 6, must be 18+. BLO verifies your address. Download e-EPIC from portal.",
        ("ayushman","health","pmjay"):
            "Ayushman Bharat: check eligibility at mera.pmjay.gov.in. Covers Rs 5 lakh/year at empanelled hospitals. Completely cashless and free.",
        ("pan","income tax"):
            "PAN Card: apply at onlineservices.nsdl.com, fill Form 49A, pay Rs 107. e-PAN emailed within 48 hours.",
        ("driving","licence","license"):
            "Driving Licence: apply at sarathi.parivahan.gov.in. Get Learner Licence first, wait 30 days, then apply for DL and pass the practical test.",
        ("scholarship","study","student"):
            "Scholarships: visit scholarships.gov.in, register with Aadhaar, choose SC/ST/OBC/Merit scheme, submit before October-November deadline.",
        ("birth","born"):
            "Birth Certificate: collect Form 1 from hospital within 21 days. Register at Municipal office for home births. Certificate issued in 7 days.",
        ("land","patta","chitta"):
            "Land Records (Patta/Chitta): visit eservices.tn.gov.in for Tamil Nadu or your state portal. Download Patta for Rs 60 online.",
        ("income","salary"):
            "Income Certificate: visit e-District portal or CSC. Attach salary slips or self-declaration. Fee is Rs 10-30. Ready in 15 days.",
        ("caste","community","sc","st","obc"):
            "Caste Certificate: visit e-District portal or CSC. Attach father's caste certificate and Aadhaar. Issued by Tahsildar in 15 days.",
        ("documents","papers","what documents"):
            "Common documents needed: Aadhaar Card, Passport-size photos, Address proof (electricity bill or bank passbook), and existing certificates as required.",
        ("help","how","what","explain"):
            "VAANI helps you access 12 government services: Ration Card, Aadhaar, Pension, Voter ID, Ayushman Health, PAN Card, Driving Licence, Scholarship, Birth Certificate, Land Records, Income Certificate, and Caste Certificate. Just type or speak the service name!",
        ("fee","cost","charge","free"):
            "Most certificates cost Rs 10-107. Aadhaar: free. Voter ID: free. Ayushman card: free. PAN card: Rs 107. Land records: Rs 60. Ration card: free.",
        ("time","days","how long"):
            "Processing times: Aadhaar 90 days, Birth Cert 7 days, Caste/Income cert 15 days, Ration Card 30 days, Driving Licence 7 days, PAN Card 15-20 days.",
    }

    answer_text = "I can help with: Ration Card, Aadhaar, Pension, Voter ID, Ayushman Health, PAN Card, Driving Licence, Scholarship, Birth Certificate, Land Records, Income Certificate, and Caste Certificate. Please ask about any of these services!"

    for keywords, answer in ANSWERS.items():
        if any(kw in q_lower for kw in keywords):
            answer_text = answer
            break

    # Translate answer to user's language
    if lang != "en":
        answer_text = safe_translate(answer_text, lang)

    return jsonify({"answer": answer_text})

@app.route("/feedback", methods=["POST"])
def feedback():
    data = request.get_json()
    feedback_db.append({
        "service": data.get("service",""),
        "rating":  data.get("rating",""),
        "time":    str(datetime.now())
    })
    return jsonify({"success": True})

@app.route("/save_history", methods=["POST"])
def save_history():
    return jsonify({"success": True})

@app.route("/logout", methods=["POST"])
def logout():
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)