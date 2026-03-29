# Booky — Humanity's Reading Notes

YHack 2026

## Prerequisites

- **Node.js** 18+
- **Python** 3.11+
- **npm** 9+
- Firebase project with Firestore + Auth enabled

## Quick Start

### Backend

```bash
cd backend

# Create venv (Python 3.11)
py -3.11 -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash
# .venv\Scripts\activate        # Windows CMD
# source .venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
```

Set up `.env`:
```bash
cp .env.example .env
# Edit .env with your values
```

Place `firebase-service-account.json` in `backend/` (never commit this).

Run:
```bash
python run.py
```
API at http://localhost:8001 — Docs at http://localhost:8001/docs

#### Pull Firestore data (optional)

```bash
python scripts/pull_firestore.py
```
Dumps all Firestore collections to `backend/firestore_dump/`.

### Frontend

```bash
cd frontend
npm install
```

Set up `.env.local`:
```bash
cp .env.local.example .env.local
# Edit with your Firebase web app config
```

Run:
```bash
npm run dev
```
App at http://localhost:3000

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `FIREBASE_CREDENTIALS_PATH` | Path to service account JSON | `./firebase-service-account.json` |
| `CHROMA_PERSIST_DIR` | ChromaDB persistent storage path | `./chroma_data` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `<project>.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `<project>.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `NEXT_PUBLIC_API_URL` | Backend API URL (`http://localhost:8001`) |

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + Tailwind + Framer Motion + D3
- **Backend**: FastAPI + Python 3.11
- **Database**: Firebase Firestore (cloud NoSQL)
- **Auth**: Firebase Auth (Google OAuth)
- **Vector DB**: ChromaDB (local persistent)
- **3D**: @react-three/fiber + @react-three/drei

## Project Structure

```
booky-yhack/
├── backend/
│   ├── app/
│   │   ├── config.py          # Settings (pydantic-settings)
│   │   ├── database.py        # Firebase + ChromaDB init
│   │   ├── auth_middleware.py  # Token verification
│   │   ├── main.py            # FastAPI app
│   │   ├── routers/           # API route handlers
│   │   ├── services/          # Business logic
│   │   └── data/              # Local JSON mock data
│   ├── scripts/
│   │   └── pull_firestore.py  # Cloud data export tool
│   ├── requirements.txt
│   ├── run.py
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js pages
│   │   ├── components/        # React components
│   │   ├── lib/               # API client, Firebase init
│   │   └── stores/            # Zustand state stores
│   ├── public/assets/         # Static assets (planet images, etc.)
│   └── .env.local
└── README.md
```
