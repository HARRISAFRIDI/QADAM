# QADAM (قدم): Your Next Step Starts Here.

A preparation platform for Pakistan's **HAT** and **USAT** examinations. It offers topic, subject and section practice, full-length timed mock tests with the official weightage, USAT essays, results with section- and subject-wise analysis, and detailed solutions.

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, Server Components), React 19, TypeScript, Tailwind CSS 4, Lucide |
| Backend | Python 3.13, FastAPI, Pydantic 2, SQLAlchemy 2 (async) + asyncpg, Alembic |
| Database | PostgreSQL on Supabase (transaction pooler for runtime) |
| Storage | Supabase Storage (public: question images; private: papers, answer sheets, solutions) |
| Hosting | Vercel: two projects (`frontend/`, `backend/`) from this repository |

## Repository

```
QADAM/
├── frontend/        Next.js app (pages, UI kit, exam engine, admin panel)
├── backend/         FastAPI app (routes → services → models), Alembic, scripts, tests
├── docs/            architecture, database, api, deployment, development, progress
├── .github/workflows/ci.yml
├── PLAN.md          approved requirements & plan
└── MASTER_PROMPT.md updated master prompt (source of truth for decisions)
```

## Quick start (local)

**Requirements:** Python 3.13, Node 22+, a PostgreSQL URL (Supabase or local).

```bash
# 1. Backend
cd backend
python -m venv .venv
.venv/Scripts/activate            # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements-dev.txt
cp .env.example .env              # fill DATABASE_URL, DATABASE_URL_MIGRATIONS, SECRET_KEY
alembic upgrade head              # create tables
python -m scripts.seed            # HAT/USAT categories, sections, subjects, weightage, topics
python -m scripts.create_admin --email you@example.com --name "Your Name"
uvicorn main:app --reload --port 8000

# 2. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local        # API_PROXY_TARGET=http://127.0.0.1:8000
npm run dev                       # http://localhost:3000
```

The browser only ever talks to the frontend. `/api/v1/*` is proxied to FastAPI (same origin, so there is no CORS preflight and the httpOnly session cookie is first-party).

## Adding MCQs

1. Log in as admin → **Admin → Import**.
2. Download the CSV template, fill it in (or use Excel `.xlsx` with the same columns), then click **Check file**.
3. **Import** loads valid rows as **drafts**. **Publish all** makes them visible to students.

Columns: `exam, subject, topic, question, option_a, option_b, option_c, option_d, correct, explanation, solution, difficulty, marks, source`.

## Checks

```bash
# backend
cd backend
python scripts/check_requirements.py requirements.txt   # encoding / syntax / pins
ruff check .
pytest -q                                              # needs TEST_DATABASE_URL (a disposable database!)

# frontend
cd frontend
npm run typecheck && npm run lint && npm run build
```

> ⚠️ `pytest` **drops and recreates** the schema of `TEST_DATABASE_URL`. Never point it at production.

## Deployment

See [docs/deployment.md](docs/deployment.md) for the two-project Vercel setup, environment variables and the pre-deploy checklist.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Vercel: `Invalid requirement` / garbled `requirements.txt` | The file was saved as UTF-16 (PowerShell `>`). Run `python scripts/check_requirements.py`. Never generate it with `pip freeze > requirements.txt` in Windows PowerShell. |
| `could not translate host name db.<ref>.supabase.co` | The direct connection is IPv6-only. Use the **pooler** URLs (`aws-1-<region>.pooler.supabase.com`). |
| `prepared statement ... does not exist` | You're using the transaction pooler (6543); the app disables statement caching automatically when the port is 6543. Don't change `db/session.py`. |
| Pages slow locally | Your PC → Supabase region round-trip (~200 ms to Tokyo). On Vercel in the same region it's ~1–2 ms. |
| Student sees no questions | Questions must be **published**, and the subject must belong to that category. |
