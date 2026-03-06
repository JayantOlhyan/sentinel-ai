import os
import json
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini Client
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("WARNING: GEMINI_API_KEY environment variable not set.")
    client = None
else:
    client = genai.Client(api_key=api_key)

# Pydantic models for request/validation
class AnalyzeRequest(BaseModel):
    message: str = Field(..., description="The text message to analyze")

class AnalyzeUrlRequest(BaseModel):
    url: str = Field(..., description="The URL to analyze")

class AnalyzeLiveRequest(BaseModel):
    transcript_chunk: str = Field(..., description="A chunk of live transcribed audio text")

class AnalyzeResponse(BaseModel):
    risk_score: int = Field(..., description="Scam probability score (0-100%)", ge=0, le=100)
    classification: str = Field(..., description="Classification (Safe, Suspicious, Scam)")
    explanation: str = Field(..., description="Detailed explanation")
    recommended_action: str = Field(..., description="Recommended action")
    transcript: str = Field(default="", description="The transcribed text")

# System prompt
SYSTEM_INSTRUCTION = """
You are Sentinel AI, an expert cybersecurity specialist for Indian digital citizens.
Analyze provided context (SMS, image, or audio) for potential threats common in India.
Identify UPI Fraud, KYC/Banking scams, Government/Utility impersonation, and Vishing.
"""

# Helper to clean Pydantic schema for Google AI compatibility
def get_clean_schema(model):
    schema = model.model_json_schema()
    # Remove title which causes "title parameter is not supported" error
    schema.pop("title", None)
    if "properties" in schema:
        for prop in schema["properties"].values():
            prop.pop("title", None)
    return schema

@app.get("/")
async def root():
    return {"status": "ok", "message": "Sentinel AI API is running"}

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_message(request: AnalyzeRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")
    try:
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=request.message,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=get_clean_schema(AnalyzeResponse),
                temperature=0.1,
            ),
        )
        return AnalyzeResponse(**json.loads(response.text))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-image", response_model=AnalyzeResponse)
async def analyze_image(file: UploadFile = File(...)):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")
    try:
        image_data = await file.read()
        image_part = types.Part.from_bytes(data=image_data, mime_type=file.content_type)
        prompt = "Analyze this image for scams, QR frauds, or deepfake manipulation."
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=[prompt, image_part],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=get_clean_schema(AnalyzeResponse),
                temperature=0.1,
            ),
        )
        return AnalyzeResponse(**json.loads(response.text))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-url", response_model=AnalyzeResponse)
async def analyze_url(request: AnalyzeUrlRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")
    try:
        url_prompt = f"Analyze this URL for phishing: {request.url}"
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=url_prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=get_clean_schema(AnalyzeResponse),
                temperature=0.1,
            ),
        )
        return AnalyzeResponse(**json.loads(response.text))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-audio", response_model=AnalyzeResponse)
async def analyze_audio(file: UploadFile = File(...)):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")
    try:
        audio_data = await file.read()
        audio_part = types.Part.from_bytes(data=audio_data, mime_type=file.content_type or "audio/webm")
        audio_prompt = "Transcribe and analyze this audio for scams. Populate the transcript field."
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=[audio_prompt, audio_part],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=get_clean_schema(AnalyzeResponse),
                temperature=0.1,
            ),
        )
        return AnalyzeResponse(**json.loads(response.text))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-audio-live", response_model=AnalyzeResponse)
async def analyze_audio_live(file: UploadFile = File(...)):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")
    try:
        audio_data = await file.read()
        audio_part = types.Part.from_bytes(data=audio_data, mime_type=file.content_type or "audio/webm")
        disruption_prompt = "Short 5s chunk analysis. Transcribe and flag for active scams."
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=[disruption_prompt, audio_part],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=get_clean_schema(AnalyzeResponse),
                temperature=0.1,
            ),
        )
        return AnalyzeResponse(**json.loads(response.text))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-live", response_model=AnalyzeResponse)
async def analyze_live(request: AnalyzeLiveRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")
    try:
        live_prompt = f"Analyze live transcript: {request.transcript_chunk}"
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=live_prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=get_clean_schema(AnalyzeResponse),
                temperature=0.1,
            ),
        )
        return AnalyzeResponse(**json.loads(response.text))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
