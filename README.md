# CodeSphere — Real-Time Collaborative Code Editor

<div align="center">

**A production-grade, cloud-based collaborative code editor with real-time synchronization, in-browser code execution, and AI-powered content moderation.**

[![Deploy with Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://codecollab-eta.vercel.app)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=for-the-badge&logo=socket.io)](https://socket.io)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-Toxicity%20Model-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)](https://www.tensorflow.org/js)

</div>

---

## 🚀 Live Demo

**Frontend (Vercel):** [https://codecollab-eta.vercel.app](https://codecollab-eta.vercel.app)

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables & API Keys](#-environment-variables--api-keys)
- [In-Browser Code Execution](#-in-browser-code-execution)
- [AI/ML Content Moderation](#-aiml-content-moderation)
- [Deployment](#-deployment)
- [Socket.IO Events Reference](#-socketio-events-reference)
- [API Endpoints](#-api-endpoints)

---

## ✨ Features

### Core Collaboration
- **Real-time code editing** — Multiple users editing the same file simultaneously via Socket.IO
- **Room-based collaboration** — Create/join rooms with unique IDs, share with teammates
- **Role-based access** — Owner, Editor, and Viewer roles with appropriate permissions
- **User presence** — See who's online, cursor positions, and live activity
- **File explorer** — Create, rename, delete files within a project
- **Multi-file projects** — Support for JavaScript, TypeScript, Python, Java, C, C++, Go, Rust, Ruby, PHP, HTML/CSS, and SQL templates

### In-Browser Code Execution (▶ Run)
- **One-click execution** — Green ▶ Run button in the header runs all project files
- **Multi-language support** — JavaScript, Python, Java, C, C++, Go, Rust, Ruby, PHP, TypeScript
- **HTML/CSS/JS live preview** — Renders HTML projects in a sandboxed iframe instantly
- **Output panel** — Slide-up terminal showing stdout (white), stderr (red), exit code, and runtime
- **Powered by Wandbox** — Free compilation API for compiled/interpreted languages (no API key needed)

### AI/ML Content Moderation (Two-Layer System)
- **Layer 1 — Client-side (TensorFlow.js):** Pre-screens comments using a toxicity model before they leave the browser
- **Layer 2 — Server-side (Multi-tier classifier):**
  - Quick profanity filter (leo-profanity word list)
  - ML-powered offensive language detection (HuggingFace / Perspective API / built-in classifier)
  - Technical whitelist to prevent false-positives on programming terms
- **Real-time blocking** — Offensive comments are blocked before broadcast; only the sender sees a warning
- **Fail-open design** — If ML services are down, comments still flow (no blocking due to infra issues)

### Authentication & Persistence
- **Firebase Authentication** — Email/password and Google OAuth sign-in
- **Firestore persistence** — Rooms, files, comments, and participant lists persist across sessions
- **Dashboard** — View owned and participated projects, create new ones, delete old ones
- **In-memory fallback** — Works without Firebase (data stored in server memory)

### Code Editor
- **Monaco Editor** — Same editor engine as VS Code
- **Syntax highlighting** — Language-aware highlighting for 12+ languages
- **Language-specific templates** — Pre-populated starter code when creating a new project
- **Line numbers, minimap** — Full IDE-like editing experience

### Comments System
- **File-scoped comments** — Comments are attached to specific files and line numbers
- **Resolve/reopen** — Mark comments as resolved; reopen if needed
- **Moderation badge** — Visual indicator that comments are AI-moderated
- **Real-time sync** — Comments sync instantly across all room participants

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vercel)                          │
│  React 18 + TypeScript + Vite + Tailwind CSS + Monaco Editor       │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────────┐  │
│  │ AuthPage │ │Dashboard │ │ CodeEditor│ │  CommentPanel        │  │
│  │(Firebase)│ │(Projects)│ │ (Monaco)  │ │  (TF.js moderation)  │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────────────┘  │
│  ┌──────────────────┐  ┌─────────────────┐                         │
│  │  OutputPanel      │  │  Header (▶ Run) │                         │
│  │  (stdout/iframe)  │  │                 │                         │
│  └──────────────────┘  └─────────────────┘                         │
│            │ Socket.IO              │ fetch /api/run                │
└────────────┼────────────────────────┼──────────────────────────────┘
             │                        │
             ▼                        ▼
┌────────────────────────┐  ┌─────────────────────────────┐
│   BACKEND (Express)    │  │  VERCEL SERVERLESS FUNCTION  │
│   Socket.IO Server     │  │  /api/run                    │
│                        │  │                               │
│ • Room management      │  │  JS → Node.js (native)       │
│ • File sync            │  │  C/C++/Java/Python/Go/Rust   │
│ • Comment broadcast    │  │  → Wandbox API (free)        │
│ • leo-profanity filter │  │                               │
│ • ML offensive filter  │  │  HTML/CSS → iframe srcdoc    │
│ • Firestore persistence│  └─────────────────────────────┘
│ • /api/run (local dev) │
└────────────────────────┘
             │ (optional)
             ▼
┌────────────────────────┐
│  ML MICROSERVICE       │
│  Python FastAPI         │
│  toxic-bert model       │
│  Port 5001              │
└────────────────────────┘
```

### Comment Moderation Flow
```
User types comment
  → Client-side: quickProfanityCheck (instant word list)
  → Client-side: TensorFlow.js toxicity model (if loaded)
  → Socket.IO emit to server
  → Server Layer 1: leo-profanity word check
  → Server Layer 2: ML classifier (classifyComment)
      → Technical whitelist pre-check
      → Local ML service / HuggingFace API / Perspective API / Built-in filter
  → If CLEAN: broadcast to all room members
  → If OFFENSIVE: emit 'comment-rejected' back to sender only
```

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite 5** | Build tool & dev server |
| **Tailwind CSS 3** | Utility-first styling |
| **Monaco Editor** | Code editing (VS Code engine) |
| **Socket.IO Client** | Real-time communication |
| **Firebase SDK** | Authentication (Email + Google OAuth) |
| **TensorFlow.js** | Client-side toxicity classification |
| **Lucide React** | Icon library |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js 18+** | Server runtime |
| **Express 4** | HTTP server & REST API |
| **Socket.IO 4** | WebSocket real-time events |
| **Firebase Admin SDK** | Firestore database & auth verification |
| **leo-profanity** | Server-side word-list profanity filter |
| **uuid** | Unique ID generation for rooms, comments, files |
| **dotenv** | Environment variable management |

### ML/AI Services
| Technology | Purpose |
|---|---|
| **TensorFlow.js Toxicity Model** | Client-side comment pre-screening (6 categories) |
| **Built-in offensive word classifier** | Server-side fallback (no API key needed) |
| **HuggingFace Inference API** | Server-side ML classification (toxic-bert model) |
| **Google Perspective API** | Server-side toxicity scoring |
| **Python FastAPI + toxic-bert** | Optional local ML microservice |

### Code Execution
| Technology | Purpose |
|---|---|
| **Wandbox API** | Cloud compilation for C/C++/Java/Python/Go/Rust/Ruby/PHP/TypeScript |
| **Node.js child_process** | Native JavaScript execution (local dev) |
| **iframe srcdoc** | HTML/CSS/JS live preview (client-side, no server) |

### Deployment
| Service | What it hosts |
|---|---|
| **Vercel** | Frontend (React SPA) + Serverless functions (/api/run) |
| **Railway / Render** | Backend (Express + Socket.IO server) |
| **Firebase** | Authentication + Firestore database |

---

## 📁 Project Structure

```
codecollab/
├── api/                              # Vercel Serverless Functions
│   └── run.js                        # Code execution endpoint (Wandbox + native JS)
│
├── ml_service/                       # Optional Python ML microservice
│   ├── app.py                        # FastAPI server with toxic-bert model
│   └── requirements.txt              # Python dependencies
│
├── server/                           # Node.js Backend
│   ├── index.js                      # Express + Socket.IO server (main)
│   ├── services/
│   │   └── offensiveLanguageFilter.js # ML-powered comment classification
│   ├── package.json                  # Server dependencies
│   ├── serviceAccountKey.json        # Firebase Admin credentials (git-ignored)
│   ├── .env.example                  # Environment variable template
│   └── Procfile                      # Deployment command
│
├── src/                              # React Frontend
│   ├── App.tsx                       # Main app layout + routing
│   ├── main.tsx                      # React entry point
│   ├── firebase.ts                   # Firebase client config
│   ├── socket.ts                     # Socket.IO client setup
│   ├── types.ts                      # TypeScript type definitions
│   ├── index.css                     # Global styles + Tailwind
│   ├── vite-env.d.ts                 # Vite type declarations
│   │
│   └── components/                   # All components, contexts & utilities
│       ├── AuthPage.tsx              # Login/Register (Email + Google OAuth)
│       ├── Dashboard.tsx             # Project list + create/delete/join
│       ├── Header.tsx                # Top bar with ▶ Run button
│       ├── CodeEditor.tsx            # Monaco Editor wrapper
│       ├── FileExplorer.tsx          # Sidebar file tree
│       ├── CommentPanel.tsx          # Comments sidebar with moderation UI
│       ├── OutputPanel.tsx           # Code execution output terminal
│       ├── ParticipantsPanel.tsx     # Online users list
│       ├── StatusBar.tsx             # Bottom status bar
│       ├── JoinRoom.tsx              # Join room by ID page
│       ├── UserPresence.tsx          # User avatar indicators
│       ├── AuthContext.tsx           # Auth state provider (Firebase)
│       ├── FileSystemContext.tsx     # Central state management (files, rooms, socket)
│       ├── moderation.ts            # Client-side TF.js toxicity checks
│       └── runCode.ts               # Code execution utility
│
├── vercel.json                       # Vercel config (rewrites, serverless timeout)
├── vite.config.ts                    # Vite config (proxy for local dev)
├── package.json                      # Frontend dependencies
├── tsconfig.app.json                 # TypeScript config
└── tailwind.config.js                # Tailwind CSS config
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** and **npm**
- **Firebase project** (for auth + Firestore)
- (Optional) **Python 3.9+** for the ML microservice

### 1. Clone & Install

```bash
git clone https://github.com/NJ97761/codecollab.git
cd codecollab

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Configure Firebase

**Client-side** (`src/firebase.ts`):
- Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
- Enable **Authentication** (Email/Password + Google provider)
- Enable **Cloud Firestore**
- Copy your Firebase config into `src/firebase.ts`

**Server-side** (`server/serviceAccountKey.json`):
- Go to Firebase Console → Project Settings → Service Accounts
- Click "Generate new private key"
- Save as `server/serviceAccountKey.json`

### 3. Configure Environment Variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:
```env
PORT=3001
FIREBASE_SERVICE_ACCOUNT=./serviceAccountKey.json

# Optional: ML moderation API keys (see AI/ML section below)
# HUGGINGFACE_API_KEY=hf_your_key_here
# PERSPECTIVE_API_KEY=AIza_your_key_here
# ML_SERVICE_URL=http://localhost:5001
```

### 4. Run Locally

```bash
# Terminal 1: Start backend
cd server
npm start

# Terminal 2: Start frontend
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001

---

## 🔑 Environment Variables & API Keys

### Frontend Environment Variables (Vite)
Set these in Vercel dashboard or in a local `.env` file at the project root:

| Variable | Required | Description |
|---|---|---|
| `VITE_SERVER_URL` | Yes (production) | Backend server URL (e.g., `https://your-backend.railway.app`) |

### Backend Environment Variables (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: `3001`) |
| `FIREBASE_SERVICE_ACCOUNT` | Yes | Path to Firebase service account JSON file |
| `HUGGINGFACE_API_KEY` | No | HuggingFace API token for ML moderation |
| `PERSPECTIVE_API_KEY` | No | Google Perspective API key for toxicity scoring |
| `ML_SERVICE_URL` | No | URL of the local Python ML microservice |

### Firebase Configuration (in `src/firebase.ts`)

| Key | Description |
|---|---|
| `apiKey` | Firebase Web API key |
| `authDomain` | Firebase Auth domain |
| `projectId` | Firebase project ID |
| `storageBucket` | Firebase Storage bucket |
| `messagingSenderId` | Firebase Cloud Messaging sender ID |
| `appId` | Firebase app ID |

### How to Get API Keys

| Service | Free Tier | How to Get |
|---|---|---|
| **Firebase** | Spark plan (free) | [console.firebase.google.com](https://console.firebase.google.com) → Create project |
| **HuggingFace** | Free (rate limited) | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → Create read token |
| **Google Perspective** | Free (QPS limited) | [perspectiveapi.com](https://www.perspectiveapi.com/) → Request API access |
| **Wandbox** | Free (no key needed) | Used automatically by `/api/run` serverless function |

---

## ▶ In-Browser Code Execution

### How It Works

1. User clicks **▶ Run** in the header
2. All files in the current room are collected
3. Based on project language:
   - **HTML/CSS/JS** → Builds a self-contained `srcdoc` blob and renders in an iframe (instant, client-side)
   - **JavaScript** → Executed natively via Node.js on the serverless function
   - **All other languages** → Sent to [Wandbox API](https://wandbox.org) for compilation and execution

### Supported Languages

| Language | Execution Method | Compiler/Runtime |
|---|---|---|
| JavaScript | Native Node.js | Latest Node.js |
| HTML/CSS | Client-side iframe | Browser engine |
| TypeScript | Wandbox | TypeScript compiler |
| Python | Wandbox | CPython (latest) |
| Java | Wandbox | OpenJDK |
| C | Wandbox | GCC |
| C++ | Wandbox | GCC / G++ |
| Go | Wandbox | Go compiler |
| Rust | Wandbox | rustc |
| Ruby | Wandbox | Ruby interpreter |
| PHP | Wandbox | PHP interpreter |

### Output Panel Features
- **Console tab** — Shows stdout (white text) and stderr (red text)
- **Preview tab** — Live HTML/CSS/JS rendering in a sandboxed iframe
- **Status indicators** — Idle, Running (spinner), Success (✅), Error (✗)
- **Runtime display** — Shows execution time and exit code
- **Controls** — Run again, Clear output, Collapse, Close

---

## 🤖 AI/ML Content Moderation

### Overview
CodeSphere implements a **two-layer moderation system** to ensure a safe collaborative environment:

### Layer 1 — Client-Side (Browser)
Runs **before** the comment reaches the server:

| Check | Technology | Speed |
|---|---|---|
| Quick profanity scan | Word list matching | < 1ms |
| ML toxicity analysis | TensorFlow.js (`@tensorflow-models/toxicity`) | ~100-500ms |

The TensorFlow.js model classifies text across **6 categories**: toxicity, severe toxicity, insult, threat, obscene content, and identity attack. If any category exceeds the 0.85 confidence threshold, the comment is blocked client-side.

### Layer 2 — Server-Side (Node.js)
Runs on the backend **before broadcasting** to other users:

| Priority | Classifier | Requires API Key? | Speed |
|---|---|---|---|
| 1st | leo-profanity (word list) | No | < 1ms |
| 2nd | Local Python ML service | No (self-hosted) | ~50-200ms |
| 3rd | HuggingFace Inference API | Yes (`HUGGINGFACE_API_KEY`) | ~100-300ms |
| 4th | Google Perspective API | Yes (`PERSPECTIVE_API_KEY`) | ~100-500ms |
| 5th | Built-in offensive word classifier | No | < 1ms |

The system tries classifiers in order and uses the first successful response. If **no API keys are configured**, the built-in classifier still catches offensive words.

### Technical Whitelist
These programming terms are **never** flagged as offensive:

`kill`, `abort`, `dummy`, `master`, `blacklist`, `whitelist`, `fork`, `hang`, `dead`, `execute`, `terminate`, `crash`, `corrupt`, `poison`, `evil`, `hack`, `inject`, `exploit`

### Setting Up the Python ML Microservice (Optional)

For the most accurate classification, run the local ML service:

```bash
cd ml_service
pip install -r requirements.txt
python app.py  # Starts on port 5001
```

Then add to `server/.env`:
```env
ML_SERVICE_URL=http://localhost:5001
```

The microservice loads the `unitary/toxic-bert` model and exposes:
- `POST /classify` — `{ "text": "..." }` → `{ "isOffensive": true/false, "confidence": 0.95 }`
- `GET /health` — Health check and model status

### Swapping the Classifier
Edit `server/services/offensiveLanguageFilter.js`:
- Change `HUGGINGFACE_MODEL` to use a different HuggingFace model
- Adjust `HUGGINGFACE_THRESHOLD` / `PERSPECTIVE_THRESHOLD` for sensitivity
- Add words to `OFFENSIVE_PATTERNS` for the built-in classifier
- Point `ML_SERVICE_URL` to any service exposing `POST /classify`

---

## 🌐 Deployment

### Frontend (Vercel)

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Set environment variable: `VITE_SERVER_URL` = your backend URL
4. Deploy — Vercel auto-detects Vite and builds the SPA
5. The `api/run.js` serverless function deploys automatically

### Backend (Railway / Render)

1. Create a new service pointing to the `server/` directory
2. Set start command: `node index.js`
3. Set environment variables:
   - `PORT` (Railway auto-sets this)
   - `FIREBASE_SERVICE_ACCOUNT` (upload the JSON or set the path)
   - Optional: `HUGGINGFACE_API_KEY`, `PERSPECTIVE_API_KEY`
4. Deploy

### ML Microservice (Optional — Railway / any VPS)

```bash
cd ml_service
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 5001
```

Set `ML_SERVICE_URL` in the backend's env vars to point to this service.

---

## 📡 Socket.IO Events Reference

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `join-room` | `{ roomId, userName, uid }` | Join a collaboration room |
| `leave-room` | — | Leave the current room |
| `file-update` | `{ fileId, content }` | Update file content (real-time sync) |
| `cursor-update` | `{ fileId, position }` | Broadcast cursor position |
| `file-create` | `{ name, language }` | Create a new file |
| `file-delete` | `{ fileId }` | Delete a file |
| `file-rename` | `{ fileId, newName }` | Rename a file |
| `comment-add` | `{ comment }` | Add a comment (moderated) |
| `comment-resolve` | `{ commentId }` | Resolve/unresolve a comment |
| `comment-delete` | `{ commentId }` | Delete a comment |
| `update-role` | `{ targetUid, role }` | Change a user's role (owner only) |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `room-state` | `{ files, users, comments, ... }` | Full room state on join |
| `user-joined` | `{ user }` | A user joined the room |
| `user-left` | `{ userId }` | A user left the room |
| `file-updated` | `{ fileId, content }` | File content changed |
| `cursor-moved` | `{ userId, fileId, position }` | Cursor position update |
| `file-created` | `{ file }` | New file created |
| `file-deleted` | `{ fileId }` | File deleted |
| `comment-added` | `{ comment }` | New comment broadcast |
| `comment-rejected` | `{ reason }` | Comment blocked (sent to sender only) |
| `comment_blocked` | `{ reason, confidence }` | ML-blocked comment (sent to sender only) |
| `role-updated` | `{ targetUid, role }` | User role changed |

---

## 🔌 API Endpoints

### REST API (Express Backend — port 3001)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/api/health` | Server + Firestore status |
| `POST` | `/api/rooms` | Create a new room |
| `GET` | `/api/rooms/:id` | Get room details |
| `DELETE` | `/api/rooms/:id` | Delete a room (owner only) |
| `GET` | `/api/rooms/user/:uid` | Get rooms for a user |
| `POST` | `/api/run` | Execute code (local dev only) |

### Vercel Serverless Function
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/run` | Execute code via Wandbox (production) |

**Request body for `/api/run`:**
```json
{
  "language": "javascript",
  "files": [
    { "name": "index.js", "content": "console.log('Hello!');" }
  ]
}
```

**Response:**
```json
{
  "stdout": "Hello!\n",
  "stderr": "",
  "exitCode": 0,
  "runtimeMs": 64
}
```

---

## 📄 License

This project is for educational purposes.

---

## 👤 Author

**Narendra Singh Rathore** — [NJ97761](https://github.com/NJ97761)
