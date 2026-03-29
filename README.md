VAANI — Voice Assistant for Government Services
VAANI is a multilingual voice-enabled web application designed to help citizens access government services easily using voice or text input. The system simplifies complex procedures by providing step-by-step guidance along with official links to government portals.
Features
Voice input using Speech Recognition
Text-to-speech output in multiple languages
Support for multiple Indian languages including English, Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, and Marathi
Access to more than 12 government services
Quick search options for faster navigation
Direct links to official government websites
OTP-based user authentication
Search history tracking
Feedback system for user responses
Supported Services
The application supports the following services:
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
Tech Stack
Frontend
HTML5
CSS3
JavaScript
Web Speech API
Backend
Python (Flask or FastAPI)
REST API
Authentication
OTP-based login using backend or Firebase
Deployment
Frontend deployed using Netlify or GitHub Pages
Backend deployed using Render
Project Structure
Copy code

VAANI/
│
├── index.html
├── login.html
├── script.js
├── styles.css
├── app.py
├── requirements.txt
├── README.md
Setup Instructions
Clone the Repository
Copy code

git clone https://github.com/your-username/vaani.git
cd vaani
Backend Setup
Copy code

pip install -r requirements.txt
python app.py
Frontend Setup
Open the index.html file in a browser or deploy using Netlify.
Authentication
Users log in using their mobile number. An OTP is sent and verified. Upon successful login, user data is stored in localStorage for session management.
Working
The user provides input through voice or text.
The input is processed and matched with available services.
The backend returns relevant steps and official links.
The application displays the results and reads them aloud using text-to-speech.
Future Enhancements
Integration with AI chatbot
Location-based service recommendations
Document upload and tracking
Mobile application development
Expansion of language support
Contributing
Contributions are welcome. Fork the repository and submit a pull request with improvements or new features.
License
This project is intended for educational purposes.