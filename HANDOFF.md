# 🚀 Gantavya (गंतव्य) Smart City Portal - Handoff & Architecture Guide

This document serves as a complete context handoff for continuing development on **Gantavya (गंतव्य)** in any new Antigravity session or IDE instance.

---

## 📌 Project Overview
**Gantavya** is a high-performance Smart City Civic Governance & Citizen Mobility Platform built for Smart City initiatives (SIH).

* **Live Portal URL:** [https://gantavya-portal.vercel.app](https://gantavya-portal.vercel.app)
* **GitHub Repository:** [anand44124/gantavya-smart-city](https://github.com/anand44124/gantavya-smart-city)
* **Database:** Neon Cloud PostgreSQL (`neondb`)
* **Backend API:** FastAPI (Python 3.12/3.14) running on Vercel Serverless & local Uvicorn
* **Frontend UI:** React + Vite + TypeScript with Lucide Icons & Tailwind/Frosted Crystal CSS

---

## 🏗️ System Architecture & File Structure

```
gantavya-smart-city/
├── api/                    # Vercel Serverless Function Entrypoints
│   ├── index.py            # FastAPI main app for Vercel
│   ├── api/routes/         # Production routes (auth, issues, reports, etc.)
│   └── services/           # Backend services (ai.py, email_service.py)
├── backend/                # Standalone Local Backend Server (Uvicorn / FastAPI)
│   ├── api/routes/         # Local API routes
│   ├── services/           # Local services
│   ├── db.py               # Neon PostgreSQL SQLAlchemy connection
│   └── main.py             # Local dev server
├── frontend/               # React + Vite Frontend
│   ├── src/
│   │   ├── App.tsx         # Main Routing, Navigation & Streamlined Auth Page
│   │   ├── App.css         # Glassmorphism, Frosted Crystal UI & Animations
│   │   └── pages/          # Citizen, Admin SLA Deck, Worker Cockpit pages
│   └── dist/               # Built static production bundle
└── HANDOFF.md              # Project Context Document
```

---

## 🔐 Credentials & Environment Setup

### 1. Database Connection (Neon Cloud PostgreSQL)
```env
DATABASE_URL="postgresql://neondb_owner:npg_Xi3dT8mKcveJ@ep-quiet-mouse-a5lo2723-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

### 2. Gmail SMTP Credentials (Urgent Email Engine)
```env
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT=465
SMTP_USER="gantavya2406@gmail.com"
SMTP_PASSWORD="cjlfaokjmynwwaxb"
```

---

## ⚡ Recent Enhancements & Fixes Applied

1. **Masterpiece Official Civic Honor Certificate Generator:**
   - Integrated `CivicCertificateModal.tsx` in `LiveProfile.tsx`.
   - Generates high-resolution, government-grade Civic Excellence Certificates with double gold foil borders, Celtic Emerald watermark, unique serial verification code (`GAN-2026-HONOR-XXXX`), and official signatures.
   - Includes 1-Click `Print / Save as PDF` button (`@media print` CSS engine).

2. **AI Multimodal Vision Engine (`services/ai.py`):**
   * Fixed `IndentationError` and missing `import time`.
   * Added multi-model fallback (`gemini-3.6-flash`, `gemini-1.5-flash`, `gemini-2.0-flash`) with instant fail-safe response.
   * Tested & verified on `/api/reports/analyze` returning `200 OK`.

3. **Streamlined Quick Demo Auth:**
   * Removed complex email OTP flow to eliminate delay and spam filter issues.
   * Prominently features 1-click Quick Demo Access pills on the login card (`Citizen Demo`, `Admin Demo`, `Worker Demo`).
   * Centered flexbox Glassmorphism design across all viewport resolutions.

3. **Vercel Production Deployment:**
   * Automated build pipeline via Vercel CLI.
   * Production domain aliased to `gantavya-portal.vercel.app`.

---

## 🛠️ Quick Commands for New Session

### 1. Run Local Backend (Port 8000)
```bash
cd backend && .venv/bin/python main.py
```

### 2. Run Local Frontend (Port 5173)
```bash
cd frontend && npm run dev
```

### 3. Deploy to Vercel Production
```bash
npm run build --prefix frontend && rm -rf dist && cp -R frontend/dist dist && git add -A && git commit -m "feat: Update portal" && git push origin main && cd frontend && npx vercel --prod --yes --scope gantavya1 && npx vercel alias set $(npx vercel ls --scope gantavya1 2>&1 | grep -o 'https://[^ ]*\.vercel\.app' | head -n 1) gantavya-portal.vercel.app
```
