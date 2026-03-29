VAANI — Voice Assistant for Government Services
VAANI is a multilingual voice-enabled web application designed to help citizens easily access government services using text or voice input. It simplifies complex processes like applying for documents, checking schemes, and accessing official portals.
🚀 Features
🎙️ Voice Input (Speech-to-Text)
🔊 Text-to-Speech (Multilingual Output)
🌐 Supports Multiple Indian Languages
English, Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, Marathi
🧾 12+ Government Services Supported
Ration Card
Pension
Aadhaar
Birth Certificate
Voter ID
Health Insurance (PMJAY)
Income Certificate
Land Records
Scholarship
Driving Licence
PAN Card
Caste Certificate
⚡ Quick Search Chips
🔗 Direct Official Government Links
🔐 OTP Login System
📊 User Search History Tracking
💬 Feedback System (Helpful / Not Helpful)
🏗️ Tech Stack
Frontend
HTML5, CSS3, JavaScript
Web Speech API (Speech Recognition + TTS)
Backend
Python (Flask / FastAPI)
REST APIs
Authentication
OTP-based Login (Backend / Firebase optional)
Deployment
Frontend: Netlify / GitHub Pages
Backend: Render
📁 Project Structure
Copy code

VAANI/
│
├── index.html          # Main UI
├── login.html          # OTP Login Page
├── script.js           # Main frontend logic
├── styles.css          # Styling
├── app.py              # Backend server
├── requirements.txt    # Python dependencies
├── README.md           # Project documentation
⚙️ Setup Instructions
1️⃣ Clone Repository
Bash
Copy code
git clone https://github.com/your-username/vaani.git
cd vaani
2️⃣ Backend Setup
Bash
Copy code
pip install -r requirements.txt
python app.py
3️⃣ Frontend Setup
Just open:
Copy code

index.html
or deploy using Netlify.
🔐 OTP Authentication
Users log in using mobile number
OTP is sent via backend/Firebase
Session stored using localStorage
🧠 How It Works
User speaks or types query
Input is processed and normalized
Backend identifies service
Steps + official link returned
Result is displayed + spoken aloud
🌍 Supported Languages
Language
Code
English-en
Tamil-ta
Hindi-hi
Telugu-te
Kannada-kn
Malayalam-ml
Bengali-bn
Marathi-mr