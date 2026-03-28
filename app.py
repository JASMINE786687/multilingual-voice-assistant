from flask import Flask, request, jsonify
from flask_cors import CORS
from deep_translator import GoogleTranslator
from datetime import datetime
import hashlib

app = Flask(__name__)
CORS(app)

# ══════════════════════════════════════
# USER STORAGE (MUST BE AT TOP)
# ══════════════════════════════════════
users = {}
sessions = {}

def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()

# ══════════════════════════════════════
# TEST ROUTE
# ══════════════════════════════════════
@app.route("/")
def home():
    return jsonify({
        "message": "VAANI Backend is running!",
        "status": "active"
    })

# ══════════════════════════════════════
# REGISTER
# ══════════════════════════════════════
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    password = data.get("password", "").strip()

    if not name or not phone or not password:
        return jsonify({"success": False, "message": "All fields required!"})

    if phone in users:
        return jsonify({"success": False, "message": "User already exists!"})

    users[phone] = {
        "name": name,
        "phone": phone,
        "password": hash_password(password),
        "history": []
    }

    return jsonify({
        "success": True,
        "message": "Registration successful!"
    })

# ══════════════════════════════════════
# LOGIN
# ══════════════════════════════════════
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    phone = data.get("phone", "")
    password = data.get("password", "")

    if phone not in users:
        return jsonify({"success": False, "message": "User not found"})

    if users[phone]["password"] != hash_password(password):
        return jsonify({"success": False, "message": "Wrong password"})

    token = hashlib.md5(f"{phone}{datetime.now()}".encode()).hexdigest()
    sessions[token] = phone

    return jsonify({
        "success": True,
        "message": "Login successful",
        "token": token,
        "user": {
            "name": users[phone]["name"],
            "phone": phone
        }
    })

# ══════════════════════════════════════
# TRANSLATE
# ══════════════════════════════════════
@app.route("/translate", methods=["POST"])
def translate():
    data = request.get_json()
    text = data.get("text", "")
    lang = data.get("target_lang", "en")

    translated = GoogleTranslator(source="auto", target=lang).translate(text)

    return jsonify({
        "translated_text": translated
    })

# ══════════════════════════════════════
# SIMPLE SERVICE API
# ══════════════════════════════════════
@app.route("/get_service", methods=["POST"])
def get_service():
    data = request.get_json()
    text = data.get("text", "").lower()

    if "ration" in text:
        return jsonify({
            "success": True,
            "service": "Ration Card",
            "steps": ["Go to office", "Submit documents", "Wait approval"]
        })

    elif "pension" in text:
        return jsonify({
            "success": True,
            "service": "Pension",
            "steps": ["Fill form", "Submit proof", "Get money"]
        })

    elif "aadhaar" in text:
        return jsonify({
            "success": True,
            "service": "Aadhaar",
            "steps": ["Visit center", "Give biometrics", "Receive card"]
        })

    else:
        return jsonify({
            "success": False,
            "message": "Service not found"
        })

# ══════════════════════════════════════
# RUN SERVER (IMPORTANT FOR RENDER)
# ══════════════════════════════════════
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)