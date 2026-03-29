from flask import Flask, request, jsonify
from flask_cors import CORS
from deep_translator import GoogleTranslator
from datetime import datetime, timedelta
import hashlib, os, random, string
import requests   # ✅ NEW

app = Flask(__name__)
CORS(app)

# ══════════════════════════════════════
# FAST2SMS CONFIG (SET THIS IN RENDER)
# ══════════════════════════════════════
FAST2SMS_API_KEY = os.environ.get("FAST2SMS_API_KEY", "0z0H3sPDkP9TM8ji4ax8jEhAxjnHCBMtIuuTvva9ZaY8tvqrxQ1ndd81CAIB")

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

# ✅ FAST2SMS OTP FUNCTION
def send_otp_sms(phone, otp):
    try:
        url = "https://www.fast2sms.com/dev/bulkV2"

        payload = {
            "route": "v3",  # transactional route
            "message": f"Your VAANI OTP is {otp}",
            "language": "english",
            "numbers": phone.replace("+91", "")
        }

        headers = {
            "authorization": FAST2SMS_API_KEY,
            "Content-Type": "application/json"
        }

        response = requests.post(url, json=payload, headers=headers)

        if response.status_code == 200:
            return True, "OTP sent successfully"
        else:
            return False, "Failed to send SMS"

    except Exception as e:
        print("Fast2SMS Error:", e)
        return False, str(e)

# ══════════════════════════════════════
# TEST
# ══════════════════════════════════════
@app.route("/")
def home():
    return jsonify({"message": "VAANI Backend Running", "status": "active"})

# ══════════════════════════════════════
# SEND OTP
# ══════════════════════════════════════
@app.route("/send_otp", methods=["POST"])
def send_otp():
    data  = request.get_json()
    phone = data.get("phone", "").strip()
    name  = data.get("name", "").strip()

    if not phone or len(phone) < 10:
        return jsonify({"success": False, "message": "Invalid phone number"})

    if not phone.startswith("+"):
        phone = "+91" + phone

    otp     = gen_otp()
    expires = datetime.now() + timedelta(minutes=5)

    otp_store[phone] = {
        "otp": otp,
        "expires": expires,
        "name": name
    }

    ok, msg = send_otp_sms(phone, otp)

    if ok:
        return jsonify({"success": True, "message": msg, "phone": phone})
    else:
        return jsonify({"success": False, "message": msg})

# ══════════════════════════════════════
# VERIFY OTP
# ══════════════════════════════════════
@app.route("/verify_otp", methods=["POST"])
def verify_otp():
    data  = request.get_json()
    phone = data.get("phone", "").strip()
    otp   = data.get("otp", "").strip()
    name  = data.get("name", "").strip()

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

    # ✅ SUCCESS
    del otp_store[phone]

    display_name = name or record.get("name") or "User"

    if phone not in users:
        users[phone] = {
            "name": display_name,
            "phone": phone,
            "history": []
        }

    token = make_token(phone)
    sessions[token] = phone

    return jsonify({
        "success": True,
        "token": token,
        "user": users[phone]
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
    except:
        return jsonify({"translated_text": text})

# ══════════════════════════════════════
# RUN
# ══════════════════════════════════════
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)