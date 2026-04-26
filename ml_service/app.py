"""
Offensive Language Classification Microservice
[NEW ADDITION - Offensive Language Filter]

A standalone FastAPI microservice that loads a pre-trained HuggingFace model
for offensive/toxic language classification. Runs independently from the
Node.js server on port 5001.

How to run:
    pip install -r requirements.txt
    python app.py
    # Or with uvicorn:
    uvicorn app:app --host 0.0.0.0 --port 5001

The service exposes:
    POST /classify  →  { "text": "..." }  →  { "isOffensive": true/false, "confidence": 0.95 }
    GET  /health    →  { "status": "ok", "model": "..." }
"""

import os
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification

# ─── Configuration ────────────────────────────────────────────────────────────
MODEL_NAME = os.getenv("TOXIC_MODEL", "unitary/toxic-bert")
CONFIDENCE_THRESHOLD = float(os.getenv("TOXIC_THRESHOLD", "0.75"))
PORT = int(os.getenv("ML_SERVICE_PORT", "5001"))

# ─── Technical whitelist (programming terms that should NOT be flagged) ────────
TECHNICAL_WHITELIST = {
    "kill", "abort", "dummy", "master", "slave", "blacklist", "whitelist",
    "fork", "hang", "dead", "execute", "terminate", "crash", "corrupt",
    "poison", "evil", "hack", "inject", "exploit",
}

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Offensive Language Classifier", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Load model at startup ───────────────────────────────────────────────────
print(f"⏳ Loading model: {MODEL_NAME}...")
start = time.time()
try:
    classifier = pipeline(
        "text-classification",
        model=MODEL_NAME,
        tokenizer=MODEL_NAME,
        truncation=True,
        max_length=512,
    )
    print(f"✅ Model loaded in {time.time() - start:.1f}s")
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    classifier = None


# ─── Request/Response models ─────────────────────────────────────────────────
class ClassifyRequest(BaseModel):
    text: str


class ClassifyResponse(BaseModel):
    isOffensive: bool
    confidence: float
    label: str = ""
    model: str = MODEL_NAME


# ─── Endpoints ───────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok" if classifier else "model_not_loaded",
        "model": MODEL_NAME,
        "threshold": CONFIDENCE_THRESHOLD,
    }


@app.post("/classify", response_model=ClassifyResponse)
def classify(req: ClassifyRequest):
    text = req.text.strip()

    if not text:
        return ClassifyResponse(isOffensive=False, confidence=0.0)

    # Technical whitelist pre-check
    words = set(text.lower().split())
    technical_overlap = words & TECHNICAL_WHITELIST
    non_technical = words - TECHNICAL_WHITELIST
    # If most words are technical terms, skip classification
    if technical_overlap and len(non_technical) <= max(len(words) * 0.6, 2):
        return ClassifyResponse(
            isOffensive=False,
            confidence=0.0,
            label="whitelisted_technical",
        )

    if not classifier:
        # Model not loaded — fail open
        return ClassifyResponse(isOffensive=False, confidence=0.0, label="model_unavailable")

    try:
        results = classifier(text)
        # toxic-bert returns: [{'label': 'toxic', 'score': 0.98}]
        top = results[0]
        label = top.get("label", "").lower()
        score = top.get("score", 0.0)

        # The model may return "toxic" / "non-toxic" or similar
        is_offensive = label in ("toxic", "offensive", "hate") and score >= CONFIDENCE_THRESHOLD

        return ClassifyResponse(
            isOffensive=is_offensive,
            confidence=score,
            label=label,
        )
    except Exception as e:
        print(f"⚠️ Classification error: {e}")
        # Fail open
        return ClassifyResponse(isOffensive=False, confidence=0.0, label="error")


# ─── Run ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
