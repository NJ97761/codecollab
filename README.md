codecollab

## Offensive Language Detection Feature

### What was added
A two-layer AI/ML-powered offensive language detection system for the comment section:

1. **Layer 1 — leo-profanity** (existing): Fast word-list based filter
2. **Layer 2 — ML Classification** (new): Deep learning model that understands context

### Architecture
```
User submits comment
  → Socket.IO → Node.js server
    → Layer 1: leo-profanity word check
    → Layer 2: ML classifier (classifyComment)
      → Technical whitelist pre-check
      → Local ML service / HuggingFace API / Perspective API
    → If clean: broadcast to room
    → If offensive: block + notify sender only
```

### Files added
| File | Purpose |
|------|---------|
| `server/services/offensiveLanguageFilter.js` | Tiered ML classification service |
| `ml_service/app.py` | Standalone Python FastAPI microservice (DistilBERT) |
| `ml_service/requirements.txt` | Python dependencies |
| `server/.env.example` | Updated with new env vars |

### Files modified (minimal, marked with `[NEW ADDITION]`)
- `server/index.js` — Import + 20-line addition in `comment-add` handler
- `src/components/CommentPanel.tsx` — Added `comment_blocked` event listener

### Setup

**Option A — HuggingFace API (easiest, no local setup):**
```bash
# Add to server/.env
HUGGINGFACE_API_KEY=hf_your_key_here
# Get a free key at https://huggingface.co/settings/tokens
```

**Option B — Local Python ML microservice (best accuracy):**
```bash
cd ml_service
pip install -r requirements.txt
python app.py  # Runs on port 5001

# Add to server/.env
ML_SERVICE_URL=http://localhost:5001
```

**Option C — Google Perspective API:**
```bash
# Add to server/.env
PERSPECTIVE_API_KEY=AIza_your_key_here
# Apply at https://www.perspectiveapi.com/
```

### Technical whitelist
These programming terms are **never** flagged as offensive:
`kill`, `abort`, `dummy`, `master`, `slave`, `blacklist`, `whitelist`, `fork`, `hang`, `dead`, `execute`, `terminate`, `crash`, `corrupt`, `poison`, `evil`, `hack`, `inject`, `exploit`

### Swapping the classifier
Edit `server/services/offensiveLanguageFilter.js`:
- Change `HUGGINGFACE_MODEL` to use a different model
- Adjust `HUGGINGFACE_THRESHOLD` / `PERSPECTIVE_THRESHOLD` for sensitivity
- Or point `ML_SERVICE_URL` to any service exposing `POST /classify`
