# Sentinel AI — Real-Time Scam & Fraud Detection System

Sentinel AI is a full-stack application built for a hackathon that analyzes text messages (SMS, email, WhatsApp, etc.) in real-time to detect scams, phishing, and fraud using the Google Gemini AI API.

## Features
- **Real-Time Analysis**: Paste any message to get instant feedback.
- **Risk Score**: 0-100% scam probability score.
- **Classification**: Categorizes messages into "Safe", "Suspicious", or "Scam" with color-coded badges.
- **Detailed Explanation**: AI-generated reasoning for the classification.
- **Actionable Recommendations**: Tells users exactly what to do next.
- **Modern UI**: Dark cybersecurity theme with glassmorphism and smooth animations.

## Tech Stack
- **Frontend**: Next.js 14, React, Tailwind CSS, Lucide Icons.
- **Backend**: Python, FastAPI, Pydantic.
- **AI Engine**: Google GenAI SDK (`gemini-2.5-flash`).

---

## Folder Structure
```
sentinel-ai/
├── backend/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/app/ (Next.js pages and styles)
│   ├── package.json
│   └── ...
└── README.md
```

---

## Local Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.10+
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
The FastAPI server will be running at `http://localhost:8000`. You can view the auto-generated Swagger docs at `http://localhost:8000/docs`.

### 2. Set up the Frontend (Next.js)
Open a **new** terminal and navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Run the development server:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser. You should see the modern Sentinel AI interface.

---

## Deployment Instructions

### Deploying the Backend on Render or Railway

**Render Deployment:**
1. Push your code to a GitHub repository.
2. Sign up / Log in to [Render](https://render.com/).
3. Create a new **Web Service**.
4. Connect your GitHub repository.
5. Set the Root Directory to `backend`.
6. Set the Environment to `Python`.
7. Build Command: `pip install -r requirements.txt`
8. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
9. Go to the "Environment" tab and add a new Env Var: `GEMINI_API_KEY = your_gemini_api_key_here`.
10. Deploy and copy your new backend URL (e.g., `https://sentinel-ai-backend.onrender.com`).

### Deploying the Frontend on Vercel

1. **Important Before Deploying:** Update `frontend/src/app/page.tsx`! 
   Change the `fetch('http://localhost:8000/analyze')` URL to your newly deployed Render/Railway backend URL.
2. Sign up / Log in to [Vercel](https://vercel.com).
3. Click "Add New Project" and import your GitHub repository.
4. Set the "Framework Preset" to **Next.js**.
5. Set the "Root Directory" to `frontend`.
6. Click **Deploy**. Vercel will automatically build and host your frontend.

---

## Usage Example
Try submitting this text to the system:
> "Your account will be suspended. Click this link to verify immediately."

**Expected Output:**
- **Risk Score:** ~90-99
- **Classification:** Scam
- **Explanation:** Describes the urgency and phishing intent.
- **Recommended Action:** "Do not click. Block the sender."
