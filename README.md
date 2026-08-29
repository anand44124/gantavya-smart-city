# CivicPulse

CivicPulse is a civic issue reporting platform: citizens submit photo-backed reports, AI validates them, nearby reports cluster into issues, and admins assign field workers with SLA tracking.

## Run locally

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend uses `VITE_API_URL` when set, otherwise `http://127.0.0.1:8000`.

Backend (Python 3.11+):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check: `http://localhost:8000/health`.

Set `AI_PROVIDER_URL` and `AI_API_KEY` in `backend/.env` before submitting reports. The API fails closed when vision validation is unavailable.

Set `AI_PROVIDER=gemini` for a Google AI Studio key, or `AI_PROVIDER=openai` for an OpenAI key. Restart Uvicorn after changing `.env`.

Seed demo accounts:

```bash
cd backend
.venv/bin/python seed.py
```

Admin: `admin@civicpulse.demo` / `Admin@123`  
Workers: `worker1@civicpulse.demo`, `worker2@civicpulse.demo`, `worker3@civicpulse.demo` / `Worker@123`  
Citizens: `citizen1@civicpulse.demo` through `citizen10@civicpulse.demo` / `Citizen@123`

## What works

- Login and citizen registration
- Photo + GPS report submission with AI validation
- Duplicate-image detection and nearby-issue clustering
- Citizen home, my reports, report detail with evidence and timeline
- Community map, issue clustering, and neighbour verification
- Admin analytics, issue assignment, live map, workers, and SLA simulation
- Worker assigned queue, status updates, and route map

## Database

SQLite is the default local database. PostgreSQL with PostGIS can be used by setting `DATABASE_URL`. Optional schema lives in `database/schema.sql`. Keep secrets in `backend/.env`.
