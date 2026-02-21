import os
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Sentinel AI API",
    description="Backend for Real-Time Scam & Fraud Detection System",
    version="1.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend domains (e.g., Vercel URL)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini Client
# Assumes GEMINI_API_KEY is set in environment variables
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    # We won't crash the server on startup so it can be deployed and waiting for the key
    print("WARNING: GEMINI_API_KEY environment variable not set.")
    client = None
else:
    client = genai.Client(api_key=api_key)

# Pydantic models for request/response validation
class AnalyzeRequest(BaseModel):
    message: str = Field(..., description="The text message (SMS, email, WhatsApp) to analyze")

class AnalyzeUrlRequest(BaseModel):
    url: str = Field(..., description="The URL to analyze for phishing or scams")

class AnalyzeResponse(BaseModel):
    risk_score: int = Field(..., description="Scam probability score (0-100%)", ge=0, le=100)
    classification: str = Field(..., description="Classification (Safe, Suspicious, Scam)")
    explanation: str = Field(..., description="Detailed explanation of the analysis")
    recommended_action: str = Field(..., description="Recommended action for the user")

# System prompt to instruct Gemini accurately
SYSTEM_INSTRUCTION = """
You are Sentinel AI, an expert cybersecurity AI specialized in real-time scam and fraud detection.
Analyze the provided user message (SMS, email, WhatsApp, or any text context) for potential threats.
Specifically, look for:
- Phishing links or suspicious URLs.
- Urgent threats or fake urgency (e.g., "account suspended", "act immediately").
- Fake bank messages or unauthorized login alerts.
- Requests for OTPs, passwords, personal data, or money transfers.
- Suspicious tone patterns or poor grammar typical of scams.
- Social engineering tactics.

Return a JSON object matching this exact schema:
{
  "risk_score": integer (0 to 100),
  "classification": string ("Safe", "Suspicious", or "Scam"),
  "explanation": string (A concise, clear explanation of why you gave this score and classification),
  "recommended_action": string (A clear, actionable recommendation for the user)
}
"""

@app.get("/")
async def root():
    return {"status": "ok", "message": "Sentinel AI API is running"}

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_message(request: AnalyzeRequest):
    if not client:
        raise HTTPException(
            status_code=500, 
            detail="Gemini API key is not configured on the server."
        )

    try:
        # Use gemini-2.5-flash as it is fast and capable of structured JSON output
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=request.message,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema={
                    "type": "OBJECT",
                    "properties": {
                        "risk_score": {"type": "INTEGER"},
                        "classification": {"type": "STRING"},
                        "explanation": {"type": "STRING"},
                        "recommended_action": {"type": "STRING"}
                    },
                    "required": ["risk_score", "classification", "explanation", "recommended_action"]
                },
                temperature=0.1, # Low temperature for consistent analysis
            ),
        )

        # The response.text is guaranteed to be a JSON string matching the schema
        # We parse it and return it via Pydantic model
        import json
        result = json.loads(response.text)
        return AnalyzeResponse(**result)

    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing message: {str(e)}")

@app.post("/analyze-image", response_model=AnalyzeResponse)
async def analyze_image(file: UploadFile = File(...)):
    if not client:
        raise HTTPException(
            status_code=500, 
            detail="Gemini API key is not configured on the server."
        )
        
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="File provided is not an image."
        )

    try:
        # Read the file bytes
        image_data = await file.read()
        
        # Prepare the image part for Gemini
        image_part = types.Part.from_bytes(
            data=image_data,
            mime_type=file.content_type
        )
        
        # We send the same system instruction, but ask it to analyze the image
        prompt = """
        Analyze this image for two main types of scams:
        1. Contextual Scams: Extract any relevant text, understand the context, and identify phishing links, urgency, fake bank alerts, or social engineering tactics (e.g., screenshots of fake WhatsApp messages or emails).
        2. Visual Scams & Deepfakes: Examine the image itself for signs of AI generation, digital manipulation, or deepfakes. Look for AI artifacts such as:
           - Unnatural textures, warped backgrounds, or nonsensical text/logos.
           - Anatomical anomalies (e.g., six fingers, merged limbs, unnatural eyes/teeth).
           - Inconsistent lighting, shadows, or reflections.
           - Blurry edges around subjects indicating poor Photoshop or face-swapping.
        
        If you detect signs of AI generation or deepfake manipulation, reflect that heavily in the risk_score and explanation.
        """
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt, image_part],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema={
                    "type": "OBJECT",
                    "properties": {
                        "risk_score": {"type": "INTEGER"},
                        "classification": {"type": "STRING"},
                        "explanation": {"type": "STRING"},
                        "recommended_action": {"type": "STRING"}
                    },
                    "required": ["risk_score", "classification", "explanation", "recommended_action"]
                },
                temperature=0.1,
            ),
        )

        import json
        result = json.loads(response.text)
        return AnalyzeResponse(**result)

    except Exception as e:
        print(f"Error calling Gemini API for image: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing image: {str(e)}")

@app.post("/analyze-url", response_model=AnalyzeResponse)
async def analyze_url(request: AnalyzeUrlRequest):
    if not client:
        raise HTTPException(
            status_code=500, 
            detail="Gemini API key is not configured on the server."
        )

    try:
        url_prompt = f"""
        Analyze the following URL for phishing, typosquatting (e.g., g0ogle.com instead of google.com), known malicious domains, suspicious query parameters, or scam structures:
        URL: {request.url}
        
        Provide a risk score and classification. If it looks suspicious or is a known bad domain, penalize it heavily.
        """
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=url_prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema={
                    "type": "OBJECT",
                    "properties": {
                        "risk_score": {"type": "INTEGER"},
                        "classification": {"type": "STRING"},
                        "explanation": {"type": "STRING"},
                        "recommended_action": {"type": "STRING"}
                    },
                    "required": ["risk_score", "classification", "explanation", "recommended_action"]
                },
                temperature=0.1,
            ),
        )

        import json
        result = json.loads(response.text)
        return AnalyzeResponse(**result)

    except Exception as e:
        print(f"Error calling Gemini API for URL: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing URL: {str(e)}")


