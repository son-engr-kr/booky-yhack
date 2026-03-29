# Booky — Humanity's Reading Notes

YHack 2026

## Quick Start

### Backend
```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```
API at http://localhost:8001 — Docs at http://localhost:8001/docs

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App at http://localhost:3000

## Tech Stack
- **Frontend**: Next.js 15 + React 19 + Tailwind + Three.js + Framer Motion + D3
- **Backend**: FastAPI + local JSON data (no external deps)
- **3D**: @react-three/fiber + @react-three/drei
