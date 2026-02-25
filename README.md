<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield.svg" width="80" alt="Sentinel AI Logo">
  <h1>Sentinel AI — Real-Time Scam & Fraud Detection System</h1>
  <p><strong>🌐 Live Application: <a href="https://sentinel-ai-1.netlify.app/">https://sentinel-ai-1.netlify.app/</a></strong></p>
</div>

Sentinel AI is a cutting-edge, full-stack application built to instantly detect and analyze scams, phishing attempts, and fraudulent content in real-time. By leveraging the multimodal capabilities of the Google Gemini 2.5 Flash API, Sentinel AI provides comprehensive protection across text, images, audio, and URLs.

---

## 🚀 Key Features

- **Multimodal Analysis Engine**: 
  - **Text & SMS**: Paste any suspicious message to get instant feedback.
  - **Image Scanning**: Upload screenshots of fake emails, WhatsApp messages, or malicious QR codes.
  - **Voice Call Monitoring**: Record or transcribe live audio using the Web Speech API to detect voice phishing (vishing) and urgency tactics.
  - **URL Inspector**: Analyze raw web links for typosquatting and phishing intent.
- **Real-Time Risk Scoring**: Get a 0-100% scam probability score instantly.
- **Detailed Intelligence**: AI-generated explanations of *why* the content is dangerous, highlighting specific psychological tactics used by scammers.
- **Actionable Advice**: Clear recommended next steps (e.g., "Do not click. Block the sender.").
- **Beautiful, Modern UI**: Designed with a "Round & Punchy" SaaS aesthetic. Features include:
  - Seamless Light / Dark Mode toggle.
  - Glassmorphic elements, extreme border rounding, and interactive hover widgets.
  - Real-time STT (Speech-to-Text) live monitoring interface.

---

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Lucide Icons, `next-themes` (Dark Mode).
- **Backend**: Python 3.11, FastAPI, `python-multipart` (File Handling).
- **AI Engine**: Google GenAI SDK (`gemini-2.5-flash`).
- **Deployment**: Netlify (Frontend) & Render (Backend).

---

## 🗂 Folder Structure

```
sentinel-ai/
├── backend/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/app/ (Next.js pages, globals.css, layout)
│   ├── public/  (Assets, Audio files)
│   └── package.json
└── README.md
```

---

## 💻 Local Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.11+
- A Google Gemini API Key

### 1. Set up the Backend (FastAPI)
Open a terminal and navigate to the backend directory:
```bash
cd backend
```

Create a virtual environment (optional but recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Set up Environment Variables:
Create a `.env` file in the `backend/` folder and add your Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Run the backend server:
```bash
uvicorn main:app --reload
```
The FastAPI server will be running at `http://localhost:8000`. 

### 2. Set up the Frontend (Next.js)
Open a **new** terminal and navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Configure Frontend Environment:
Create a `.env.local` file in the `frontend/` folder:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run the development server:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser to view the application locally.

---

## 🌐 Deployment Instructions

If you wish to deploy your own instance of Sentinel AI:

### 1. Backend (Render)
1. Push your code to GitHub.
2. Create a new **Web Service** on [Render](https://render.com/).
3. Connect your repo and set Root Directory to `backend`.
4. Environment: `Python 3`.
5. Build Command: `pip install -r requirements.txt`.
6. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
7. Add Environment Variable: `GEMINI_API_KEY = your_key`.
8. Deploy to get your live backend URL.

### 2. Frontend (Netlify)
1. Create a new **Site** from GitHub on [Netlify](https://netlify.com).
2. Set Base Directory to `frontend`.
3. Set Build Command to `npm run build`.
4. Set Publish Directory to `out`.
5. Add Environment Variable: `NEXT_PUBLIC_API_URL = your_render_backend_url`. (No trailing slash).
6. Deploy to get your live frontend URL.
