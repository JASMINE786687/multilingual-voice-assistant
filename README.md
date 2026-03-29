# VAANI — Upgrade Setup Guide

## What's upgraded

| Feature | Before | After |
|---|---|---|
| Auth | Password (MD5 hash) | OTP via SMS (Twilio) |
| Services | 3 (ration, pension, aadhaar) | 12 services |
| Languages (pills) | 4 | 8 (Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, Marathi, English) |
| Voice output (TTS) | English only | All 8 languages (uses browser TTS + best matching voice) |
| Voice input (STT) | 4 languages | 8 languages |
| Bugs fixed | — | keywordMap undefined bug, showResult serviceKey bug, duplicate section, MD5 password |

---

## Step 1 — Set up Twilio (for real OTP)

1. Sign up free at https://www.twilio.com
2. Get your **Account SID**, **Auth Token**, and a **phone number** (free trial gives you one)
3. In Render (your backend host), add these **Environment Variables**:
   ```
   TWILIO_ACCOUNT_SID   = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN    = your_auth_token_here
   TWILIO_PHONE_NUMBER  = +14155552671
   ```

> **Dev mode (no Twilio):** If the env vars are not set, the server prints the OTP in the console log.
> Check Render logs to get the OTP while testing.

---

## Step 2 — Install new dependency

```bash
pip install twilio
```

Or redeploy on Render — the updated `requirements.txt` includes `twilio` automatically.

---

## Step 3 — Replace your files

Copy these 4 upgraded files into your project:

| File | What changed |
|---|---|
| `app.py` | OTP endpoints, 12 services, multilingual translation in `/get_service` |
| `login.html` | 2-step OTP flow with 6-box digit entry and resend countdown |
| `script.js` | Fixed bugs, 8 languages, 12 service chips, proper TTS voice selection |
| `index.html` | Cleaned structure, dynamic language pills and service chips from JS |

---

## Step 4 — Adding more languages (future)

To add a new language (e.g. Gujarati), edit **two places** in `script.js`:

```js
// 1. Add to LANG_CONFIG
"gu": { label: "ગુજરાતી", tts: "gu-IN", stt: "gu-IN" },

// 2. Add keywords to KEYWORD_MAP for each service
"ration": ["ration", ..., "રેશન"],
```

The backend `app.py` uses `deep-translator` (Google Translate) which supports all Indian languages automatically — no backend change needed.

---

## Step 5 — Voice output language fix

The TTS (Read Aloud) now:
1. Uses the correct BCP-47 language code for each language
2. Scans available browser voices and picks the best matching one
3. Falls back gracefully if the voice is not installed

**To improve voice quality on mobile:**
- Android: Settings → Accessibility → Text-to-speech → Install Google TTS voices for each language
- iOS: Settings → Accessibility → Spoken Content → Voices → download Indian language voices

---

## Services now available (12 total)

| Service | Trigger keywords |
|---|---|
| Ration Card | ration, food card, ரேஷன், राशन |
| Pension (IGNOAPS) | pension, old age, पेंशन |
| Aadhaar | aadhaar, aadhar, uid, आधार |
| Birth Certificate | birth, born, जन्म, పిறப్పు |
| Voter ID (EPIC) | voter, election, मतदाता |
| Ayushman Bharat | health, ayushman, pmjay, hospital |
| Income Certificate | income, salary, आय प्रमाण |
| Land Records (Patta) | land, patta, chitta, भूमि |
| Government Scholarship | scholarship, study, student |
| Driving Licence | driving, licence, ड्राइविंग |
| PAN Card | pan, pan card, income tax |
| Caste Certificate | caste, community, sc, st, obc, जाति |

---

## Known browser limits for TTS

| Language | Chrome Desktop | Chrome Android | Safari iOS |
|---|---|---|---|
| Tamil | ✅ | ✅ | ✅ |
| Hindi | ✅ | ✅ | ✅ |
| Telugu | ✅ | ✅ | ⚠️ (partial) |
| Kannada | ⚠️ (install voice) | ✅ | ❌ |
| Malayalam | ⚠️ (install voice) | ✅ | ❌ |
| Bengali | ⚠️ (install voice) | ✅ | ❌ |

Chrome on Android with Google TTS installed gives the best multilingual experience.