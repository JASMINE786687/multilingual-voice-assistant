import requests
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from deep_translator import GoogleTranslator

app = Flask(__name__)
CORS(app)

services = {
    "ration": {
        "name": "Ration Card",
        "steps": [
            "Step 1: Visit your nearest Tahsildar office.",
            "Step 2: Collect the application form.",
            "Step 3: Fill in your family details.",
            "Step 4: Attach Aadhaar card and address proof.",
            "Step 5: Submit and collect acknowledgment slip.",
            "Step 6: Inspector will visit for verification.",
            "Step 7: Ration card delivered within 30 days."
        ]
    },
    "pension": {
        "name": "Old Age Pension",
        "steps": [
            "Step 1: Visit your local Panchayat office.",
            "Step 2: Ask for IGNOAPS pension application form.",
            "Step 3: Fill in your name, age, bank details.",
            "Step 4: Attach age proof and income certificate.",
            "Step 5: Submit and get a receipt.",
            "Step 6: Application will be verified.",
            "Step 7: Pension credited to bank account monthly."
        ]
    },
    "aadhaar": {
        "name": "Aadhaar Card",
        "steps": [
            "Step 1: Go to uidai.gov.in or Aadhaar Seva Kendra.",
            "Step 2: Book an appointment for enrollment.",
            "Step 3: Carry identity proof and address proof.",
            "Step 4: Photo, fingerprints, iris will be scanned.",
            "Step 5: You will get an enrollment slip.",
            "Step 6: Aadhaar delivered by post within 90 days.",
            "Step 7: You can also download e-Aadhaar online."
        ]
    }
}

def detect_service(text):
    text = text.lower()

    ration_keywords = ["ration", "ration card", "food card", "ரேஷன்"]
    pension_keywords = ["pension", "old age", "retirement", "பென்சன்"]
    aadhaar_keywords = ["aadhaar", "aadhar", "uid", "biometric", "ஆதார்"]

    for word in ration_keywords:
        if word in text:
            return "ration"

    for word in pension_keywords:
        if word in text:
            return "pension"

    for word in aadhaar_keywords:
        if word in text:
            return "aadhaar"

    return None

@app.route("/")
def home():
    return jsonify({"message": "VAANI Backend is running!"})

@app.route("/get_service", methods=["POST"])
def get_service():
    data = request.get_json()
    user_text = data.get("text", "")

    if not user_text:
        return jsonify({"error": "No text provided"}), 400

    service_key = detect_service(user_text)

    if service_key:
        service = services[service_key]
        return jsonify({
            "success": True,
            "service": service["name"],
            "steps": service["steps"]
        })
    else:
        return jsonify({
            "success": False,
            "message": "Sorry, try saying: ration, pension, or aadhaar."
        })

@app.route("/translate", methods=["POST"])
def translate():
    data = request.get_json()
    text = data.get("text", "")
    target_lang = data.get("target_lang", "en")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        translated = GoogleTranslator(source="auto", target=target_lang).translate(text)
        return jsonify({
            "success": True,
            "translated_text": translated,
            "target_lang": target_lang
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route("/speak", methods=["POST"])
def speak():
    data = request.get_json()
    text = data.get("text", "")
    lang = data.get("lang", "en")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    voice_map = {
        "en": ("en-IN", "en-IN-Wavenet-D"),
        "hi": ("hi-IN", "hi-IN-Wavenet-A"),
        "ta": ("ta-IN", "ta-IN-Wavenet-A"),
        "te": ("te-IN", "te-IN-Wavenet-A")
    }

    language_code, voice_name = voice_map.get(lang, voice_map["en"])

    API_KEY = "AIzaSyBFLBGtYdA_Qx0XtK3WziW6ba4FZBec6F8"

    url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={'AIzaSyBFLBGtYdA_Qx0XtK3WziW6ba4FZBec6F8'}"

    payload = {
        "input": {"text": text},
        "voice": {
            "languageCode": language_code,
            "name": voice_name
        },
        "audioConfig": {
            "audioEncoding": "MP3",
            "speakingRate": 0.9
        }
    }

    response = requests.post(url, json=payload)

    if response.status_code != 200:
        return jsonify({"error": "TTS failed"}), 500

    audio_content = response.json()["audioContent"]
    audio_bytes = base64.b64decode(audio_content)

    return audio_bytes, 200, {
        "Content-Type": "audio/mpeg"
    }




import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)