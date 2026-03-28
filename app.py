from flask import Flask, request, jsonify, session
from flask_cors import CORS
from deep_translator import GoogleTranslator
from datetime import datetime
import hashlib

app = Flask(__name__)
app.secret_key = "vaani_secret_key_2026"  # Session key
CORS(app, supports_credentials=True)

from flask import Flask, request, jsonify
from flask_cors import CORS
from deep_translator import GoogleTranslator
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ══════════════════════════════════════
# FEEDBACK STORAGE (simple in-memory)
# ══════════════════════════════════════
feedbacks = []

# ══════════════════════════════════════
# NEARBY OFFICES
# ══════════════════════════════════════
nearby_offices = {
    "ration": {
        "office": "Civil Supplies Office / Tahsildar Office",
        "timing": "10:00 AM - 5:00 PM (Mon-Sat)",
        "contact": "1967 (Toll Free)",
        "documents": ["Aadhaar Card", "Address Proof", "Passport Photo", "Income Certificate"]
    },
    "pension": {
        "office": "Block Development Office / Panchayat Office",
        "timing": "9:30 AM - 5:30 PM (Mon-Fri)",
        "contact": "1800-180-1234 (Toll Free)",
        "documents": ["Aadhaar Card", "Age Proof", "Bank Passbook", "Income Certificate"]
    },
    "aadhaar": {
        "office": "Aadhaar Seva Kendra / Post Office",
        "timing": "9:00 AM - 5:00 PM (Mon-Sat)",
        "contact": "1947 (Toll Free - UIDAI)",
        "documents": ["Identity Proof", "Address Proof", "Date of Birth Proof"]
    },
    "birth_certificate": {
        "office": "Municipality Office / Panchayat Office",
        "timing": "10:00 AM - 5:00 PM (Mon-Fri)",
        "contact": "1800-200-1234 (Toll Free)",
        "documents": ["Hospital Discharge Summary", "Parents Aadhaar", "Marriage Certificate"]
    },
    "voter_id": {
        "office": "BLO Office / Taluk Office / ERO Office",
        "timing": "10:00 AM - 5:00 PM (Mon-Fri)",
        "contact": "1950 (Toll Free - ECI)",
        "documents": ["Age Proof", "Address Proof", "Passport Photo"]
    },
    "health_insurance": {
        "office": "Common Service Centre (CSC) / District Hospital",
        "timing": "9:00 AM - 6:00 PM (Mon-Sat)",
        "contact": "14555 (Toll Free - Ayushman)",
        "documents": ["Aadhaar Card", "Ration Card", "Income Certificate"]
    },
    "income_certificate": {
        "office": "Tahsildar Office / Revenue Department",
        "timing": "10:00 AM - 5:00 PM (Mon-Fri)",
        "contact": "Contact your local Tahsildar",
        "documents": ["Aadhaar Card", "Salary Slip / Employment Proof", "Bank Statement"]
    },
    "land_records": {
        "office": "Sub-Registrar Office / Revenue Office",
        "timing": "10:00 AM - 5:00 PM (Mon-Fri)",
        "contact": "Contact your local Sub-Registrar",
        "documents": ["Patta / Chitta", "Aadhaar Card", "Previous Land Documents"]
    },
    "scholarship": {
        "office": "District Educational Office / School/College",
        "timing": "9:00 AM - 5:00 PM (Mon-Fri)",
        "contact": "1800-200-0077 (Toll Free)",
        "documents": ["Aadhaar Card", "Income Certificate", "Mark Sheet", "Bank Passbook"]
    }
}

# ══════════════════════════════════════
# SERVICES DATABASE (12 Services)
# ══════════════════════════════════════
services = {
    "ration": {
        "name": "Ration Card",
        "category": "Food & Supplies",
        "steps": [
            "Step 1: Visit your nearest Tahsildar office or Civil Supplies office.",
            "Step 2: Collect the Ration Card application form (Form 1).",
            "Step 3: Fill in your family details — name, address, income.",
            "Step 4: Attach documents: Aadhaar card, address proof, passport photo.",
            "Step 5: Submit the form and collect your acknowledgment slip.",
            "Step 6: Inspector will visit your home for verification.",
            "Step 7: Ration card will be delivered within 30 days."
        ]
    },
    "pension": {
        "name": "Old Age Pension",
        "category": "Social Welfare",
        "steps": [
            "Step 1: Visit your local Block Development Office (BDO) or Panchayat office.",
            "Step 2: Ask for the IGNOAPS pension application form.",
            "Step 3: Fill in your name, age, address, and bank account details.",
            "Step 4: Attach documents: Age proof (Aadhaar), income certificate, bank passbook.",
            "Step 5: Submit the form at the office and get a receipt.",
            "Step 6: Your application will be verified by the district authority.",
            "Step 7: Pension amount will be credited to your bank account monthly."
        ]
    },
    "aadhaar": {
        "name": "Aadhaar Card",
        "category": "Identity",
        "steps": [
            "Step 1: Go to the official UIDAI website: uidai.gov.in or visit an Aadhaar Seva Kendra.",
            "Step 2: Click 'Book an Appointment' for a new Aadhaar enrollment.",
            "Step 3: Carry your identity proof: Voter ID / Passport / PAN card.",
            "Step 4: Carry your address proof: Electricity bill / Bank passbook.",
            "Step 5: At the center, your photo, fingerprints, and iris will be scanned.",
            "Step 6: You will receive an enrollment slip with your EID number.",
            "Step 7: Your Aadhaar will be delivered by post within 90 days."
        ]
    },
    "birth_certificate": {
        "name": "Birth Certificate",
        "category": "Civil Registration",
        "steps": [
            "Step 1: Visit your nearest Municipality or Panchayat office.",
            "Step 2: Ask for Birth Certificate application form.",
            "Step 3: Fill in child's name, date of birth, and parents' details.",
            "Step 4: Attach hospital discharge summary or midwife certificate.",
            "Step 5: Submit form with Aadhaar copy of both parents.",
            "Step 6: Pay the nominal fee (Rs. 10 to 50).",
            "Step 7: Certificate will be issued within 7 working days."
        ]
    },
    "voter_id": {
        "name": "Voter ID Card",
        "category": "Electoral",
        "steps": [
            "Step 1: Visit voterportal.eci.gov.in or your nearest BLO office.",
            "Step 2: Fill Form 6 for new voter registration.",
            "Step 3: Enter your name, age, address, and date of birth.",
            "Step 4: Attach age proof such as Aadhaar or school certificate.",
            "Step 5: Attach address proof such as electricity bill or Aadhaar.",
            "Step 6: Submit form online or at BLO office and get acknowledgment.",
            "Step 7: Voter ID card will be delivered within 30 days."
        ]
    },
    "health_insurance": {
        "name": "Ayushman Bharat Health Insurance",
        "category": "Health",
        "steps": [
            "Step 1: Visit pmjay.gov.in to check your family eligibility.",
            "Step 2: Go to nearest Common Service Centre (CSC) or District Hospital.",
            "Step 3: Carry your Aadhaar card and ration card.",
            "Step 4: Get your name verified in the SECC database.",
            "Step 5: Your Ayushman Bharat card will be generated.",
            "Step 6: Use card at any empanelled government or private hospital.",
            "Step 7: Get free medical treatment up to Rs. 5 lakhs per year."
        ]
    },
    "income_certificate": {
        "name": "Income Certificate",
        "category": "Revenue",
        "steps": [
            "Step 1: Visit your nearest Tahsildar or Revenue Department office.",
            "Step 2: Collect the income certificate application form.",
            "Step 3: Fill in your name, occupation, and annual income details.",
            "Step 4: Attach salary slip or employment proof and Aadhaar card.",
            "Step 5: Attach bank statement for the last 3 months.",
            "Step 6: Submit form with Rs. 20 stamp paper if required.",
            "Step 7: Income certificate issued within 7 to 14 working days."
        ]
    },
    "land_records": {
        "name": "Land Records / Patta Chitta",
        "category": "Revenue",
        "steps": [
            "Step 1: Visit eservices.tn.gov.in for Tamil Nadu land records.",
            "Step 2: Click on Patta / Chitta request option.",
            "Step 3: Enter your district, taluk, and village name.",
            "Step 4: Enter your survey number or owner name.",
            "Step 5: Verify your details and submit the request.",
            "Step 6: Pay the nominal fee online or at the office.",
            "Step 7: Download or collect your Patta Chitta document."
        ]
    },
    "scholarship": {
        "name": "Government Scholarship",
        "category": "Education",
        "steps": [
            "Step 1: Visit scholarships.gov.in or your state scholarship portal.",
            "Step 2: Register with your Aadhaar number and mobile number.",
            "Step 3: Select the scholarship scheme suitable for your category.",
            "Step 4: Fill in your academic details and family income.",
            "Step 5: Upload mark sheet, income certificate, and bank passbook.",
            "Step 6: Submit application before the deadline.",
            "Step 7: Scholarship amount will be credited directly to your bank account."
        ]
    },
    "driving_licence": {
        "name": "Driving Licence",
        "category": "Transport",
        "steps": [
            "Step 1: Visit sarathi.parivahan.gov.in to apply online.",
            "Step 2: Select your state and apply for Learner Licence first.",
            "Step 3: Fill in your personal details and vehicle type.",
            "Step 4: Attach Aadhaar card and address proof.",
            "Step 5: Book a slot for the Learner Licence test at RTO.",
            "Step 6: Pass the test and apply for Permanent Licence after 30 days.",
            "Step 7: Driving Licence delivered by post within 30 days."
        ]
    },
    "pan_card": {
        "name": "PAN Card",
        "category": "Tax",
        "steps": [
            "Step 1: Visit onlineservices.nsdl.com or incometaxindiaefiling.gov.in.",
            "Step 2: Click on 'Apply Online' for new PAN card (Form 49A).",
            "Step 3: Fill in your name, date of birth, and address.",
            "Step 4: Attach identity proof and address proof documents.",
            "Step 5: Pay the application fee of Rs. 107 (India) online.",
            "Step 6: Submit the application and note your acknowledgment number.",
            "Step 7: PAN card will be delivered to your address within 15 days."
        ]
    },
    "caste_certificate": {
        "name": "Caste Certificate",
        "category": "Revenue",
        "steps": [
            "Step 1: Visit your nearest Tahsildar office or apply online at your state portal.",
            "Step 2: Collect the Community / Caste Certificate application form.",
            "Step 3: Fill in your name, community, and family details.",
            "Step 4: Attach Aadhaar card, ration card, and school certificate.",
            "Step 5: Attach parent's caste certificate if available.",
            "Step 6: Submit form with self-declaration affidavit.",
            "Step 7: Caste certificate will be issued within 7 to 30 days."
        ]
    }
}

# ══════════════════════════════════════
# KEYWORD DETECTION
# ══════════════════════════════════════
def detect_service(text):
    text = text.lower().strip()

    keywords = {
        "ration":           ["ration", "ration card", "food card", "ரேஷன்", "राशन", "రేషన్"],
        "pension":          ["pension", "old age", "retirement", "பென்சன்", "ஓய்வூதியம்", "पेंशन", "పెన్షన్"],
        "aadhaar":          ["aadhaar", "aadhar", "uid", "biometric", "ஆதார்", "आधार", "ఆధార్"],
        "birth_certificate":["birth", "birth certificate", "பிறப்பு", "பிறப்பு சான்று", "जन्म", "జన్మ"],
        "voter_id":         ["voter", "voter id", "election card", "வாக்காளர்", "मतदाता", "ఓటర్"],
        "health_insurance": ["health", "ayushman", "insurance", "hospital", "மருத்துவம்", "ஆயுஷ்மான்", "आयुष्मान"],
        "income_certificate":["income", "salary certificate", "வருமானம்", "आय प्रमाण", "ఆదాయం"],
        "land_records":     ["land", "patta", "chitta", "land record", "நிலம்", "பட்டா", "भूमि"],
        "scholarship":      ["scholarship", "study", "education", "கல்வி உதவித்தொகை", "छात्रवृत्ति"],
        "driving_licence":  ["driving", "licence", "license", "dl", "ஓட்டுநர்", "ड्राइविंग"],
        "pan_card":         ["pan", "pan card", "tax", "பான்", "पैन"],
        "caste_certificate":["caste", "community", "sc", "st", "obc", "சாதி சான்று", "जाति"]
    }

    for service_key, words in keywords.items():
        for word in words:
            if word in text:
                return service_key

    return None

# ══════════════════════════════════════
# ROUTES
# ══════════════════════════════════════

# Home
@app.route("/")
def home():
    return jsonify({
        "message": "VAANI Backend is running!",
        "version": "2.0",
        "services": len(services),
        "status": "active"
    })

# Get all services list
@app.route("/services", methods=["GET"])
def get_all_services():
    service_list = []
    for key, val in services.items():
        service_list.append({
            "key": key,
            "name": val["name"],
            "category": val["category"]
        })
    return jsonify({
        "success": True,
        "total": len(service_list),
        "services": service_list
    })

# Get service steps
@app.route("/get_service", methods=["POST"])
def get_service():
    data = request.get_json()
    user_text = data.get("text", "").strip()

    if not user_text:
        return jsonify({"error": "No text provided"}), 400

    service_key = detect_service(user_text)

    if service_key:
        service = services[service_key]
        office  = nearby_offices.get(service_key, {})
        return jsonify({
            "success":  True,
            "service":  service["name"],
            "category": service["category"],
            "steps":    service["steps"],
            "office":   office
        })
    else:
        return jsonify({
            "success": False,
            "message": "Sorry, I did not understand. Try: ration, pension, aadhaar, voter id, scholarship, pan card, driving licence, birth certificate, health insurance, income certificate, land records, caste certificate."
        })

# Translate
@app.route("/translate", methods=["POST"])
def translate():
    data = request.get_json()
    text        = data.get("text", "").strip()
    target_lang = data.get("target_lang", "en")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        translated = GoogleTranslator(source="auto", target=target_lang).translate(text)
        return jsonify({
            "success":         True,
            "translated_text": translated,
            "target_lang":     target_lang
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Submit feedback
@app.route("/feedback", methods=["POST"])
def submit_feedback():
    data    = request.get_json()
    service = data.get("service", "unknown")
    rating  = data.get("rating", "")      # "helpful" or "not_helpful"
    comment = data.get("comment", "")

    if rating not in ["helpful", "not_helpful"]:
        return jsonify({"error": "Rating must be helpful or not_helpful"}), 400

    entry = {
        "service": service,
        "rating":  rating,
        "comment": comment,
        "time":    datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    feedbacks.append(entry)

    return jsonify({
        "success": True,
        "message": "Thank you for your feedback!",
        "total_feedbacks": len(feedbacks)
    })

# Get feedback summary
@app.route("/feedback/summary", methods=["GET"])
def feedback_summary():
    helpful     = sum(1 for f in feedbacks if f["rating"] == "helpful")
    not_helpful = sum(1 for f in feedbacks if f["rating"] == "not_helpful")
    return jsonify({
        "total":       len(feedbacks),
        "helpful":     helpful,
        "not_helpful": not_helpful,
        "feedbacks":   feedbacks[-10:]
    })
# ── REGISTER ──
@app.route("/register", methods=["POST"])
def register():
    data     = request.get_json()
    name     = data.get("name", "").strip()
    phone    = data.get("phone", "").strip()
    password = data.get("password", "").strip()

    if not name or not phone or not password:
        return jsonify({"success": False, "message": "All fields required!"}), 400

    if phone in users:
        return jsonify({"success": False, "message": "Phone number already registered!"}), 400

    if len(phone) != 10:
        return jsonify({"success": False, "message": "Enter valid 10-digit phone number!"}), 400

    users[phone] = {
        "name":          name,
        "phone":         phone,
        "password_hash": hash_password(password),
        "history":       [],
        "joined":        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    return jsonify({
        "success": True,
        "message": f"Welcome {name}! Registration successful.",
        "user":    { "name": name, "phone": phone }
    })


# ── LOGIN ──
@app.route("/login", methods=["POST"])
def login():
    data     = request.get_json()
    phone    = data.get("phone", "").strip()
    password = data.get("password", "").strip()

    if not phone or not password:
        return jsonify({"success": False, "message": "Phone and password required!"}), 400

    if phone not in users:
        return jsonify({"success": False, "message": "Phone number not registered!"}), 404

    user = users[phone]
    if user["password_hash"] != hash_password(password):
        return jsonify({"success": False, "message": "Wrong password!"}), 401

    # Create session token
    token = hashlib.md5(f"{phone}{datetime.now()}".encode()).hexdigest()
    sessions[token] = phone

    return jsonify({
        "success": True,
        "message": f"Welcome back, {user['name']}!",
        "token":   token,
        "user":    { "name": user["name"], "phone": phone }
    })


# ── LOGOUT ──
@app.route("/logout", methods=["POST"])
def logout():
    data  = request.get_json()
    token = data.get("token", "")
    if token in sessions:
        del sessions[token]
    return jsonify({"success": True, "message": "Logged out successfully!"})


# ── GET USER PROFILE ──
@app.route("/profile", methods=["POST"])
def profile():
    data  = request.get_json()
    token = data.get("token", "")

    if token not in sessions:
        return jsonify({"success": False, "message": "Not logged in!"}), 401

    phone = sessions[token]
    user  = users[phone]

    return jsonify({
        "success": True,
        "user": {
            "name":    user["name"],
            "phone":   user["phone"],
            "joined":  user["joined"],
            "history": user["history"][-5:]  # Last 5 searches
        }
    })


# ── SAVE SEARCH HISTORY ──
@app.route("/save_history", methods=["POST"])
def save_history():
    data    = request.get_json()
    token   = data.get("token", "")
    service = data.get("service", "")

    if token not in sessions:
        return jsonify({"success": False, "message": "Not logged in!"}), 401

    phone = sessions[token]
    entry = {
        "service": service,
        "time":    datetime.now().strftime("%d-%m-%Y %H:%M")
    }
    users[phone]["history"].append(entry)

    return jsonify({"success": True, "message": "History saved!"})

if __name__ == "__main__":
    app.run(debug=True)

# ══ USER STORAGE (Simple in-memory) ══
users = {}       # { phone: { name, password_hash, history } }
sessions = {}    # { session_token: phone }

def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()