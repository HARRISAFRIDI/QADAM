# Deployment (Vercel + Supabase)

Two Vercel projects from **one GitHub repository**.

| | `qadam-api` | `qadam-web` |
|---|---|---|
| Root directory | `backend` | `frontend` |
| Framework preset | FastAPI (auto-detected: `app` in `main.py`) | Next.js |
| Python / Node | `.python-version` = 3.13 | Node 22 |
| Region | `vercel.json` → `hnd1` (same as Supabase) | `vercel.json` → `hnd1` |

Change both `vercel.json` regions if the Supabase project moves (e.g. Mumbai → `bom1`).

## Environment variables

**qadam-api** (Production + Preview):

| Name | Value |
|---|---|
| `ENVIRONMENT` | `production` (use `preview` for Preview) |
| `DATABASE_URL` | Supabase **transaction pooler** URL (`…pooler.supabase.com:6543/postgres`), password URL-encoded |
| `SECRET_KEY` | 48+ random chars, **different from local** |
| `DB_POOL_SIZE` | `5` (set `0` if you ever see "attached to a different loop" errors) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | optional, enables uploads |

**qadam-web**:

| Name | Value |
|---|---|
| `API_PROXY_TARGET` | `https://<qadam-api>.vercel.app` (**must be set before building**, because rewrites are compiled) |
| `NEXT_PUBLIC_SUPABASE_HOST` | optional, `<ref>.supabase.co` for question images |

Never put `DATABASE_URL`, `SECRET_KEY` or service-role keys in the frontend project.

## First deployment

1. Push the repository to GitHub.
2. Vercel → *Add New Project* → import repo → root `backend` → add env vars → Deploy.
3. Check `https://<api>/api/v1/health` and `https://<api>/api/v1/health/db` (it must show the migration id).
4. Vercel → *Add New Project* → same repo → root `frontend` → set `API_PROXY_TARGET` to the API URL → Deploy.
5. Open the web URL, log in as admin, and import MCQs.

Migrations are **not** run on Vercel. Run `alembic upgrade head` from your machine (or CI) before deploying code that needs a schema change.

## Pre-deploy checklist (CI runs most of this on every push)

- [ ] `python scripts/check_requirements.py requirements.txt` → OK (no BOM/UTF-16/CRLF, all pinned)
- [ ] Fresh venv install of `requirements.txt` + `python -c "import main"`
- [ ] `ruff check .` and `pytest -q`
- [ ] `alembic upgrade head` applied to Supabase
- [ ] `npm ci && npm run typecheck && npm run lint && npm run build`
- [ ] Env vars set in both projects (API URL in `API_PROXY_TARGET`)
- [ ] After deploy: `/api/v1/health/db` returns `connected`, login works, a practice session starts

## Plans and limits

- Vercel **Hobby is non-commercial**: upgrade to Pro before public launch.
- Supabase **Free pauses after ~7 days of inactivity** and has 500 MB of DB: upgrade to Pro (with daily backups) before launch.
- Vercel function body limit is ~4.5 MB. MCQ import files must be ≤ 4 MB; papers upload directly to Storage.
