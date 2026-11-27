# Architecture

## Overview

```
Browser ──HTTPS──▶ Vercel: qadam-web (Next.js)
                    • static: /, /login, /register (CDN)
                    • RSC pages fetch the API server-to-server (cookie forwarded)
                    • rewrite /api/v1/* ─────────────┐ (same origin)
                                                     ▼
                   Vercel: qadam-api (FastAPI, one Python function, Fluid compute)
                    • routes → services → SQLAlchemy models
                    • in-process taxonomy cache (60 s TTL)
                         │ asyncpg via Supabase transaction pooler (6543)
                         ▼
                   Supabase Postgres  ·  Supabase Storage (signed URLs)
```

Both Vercel projects and the database must be in **the same region** (currently `hnd1` / `ap-northeast-1`, Tokyo).

## Backend layout

| Folder | Responsibility |
|---|---|
| `api/routes/` | Thin HTTP layer: validation (Pydantic), status codes, cache headers |
| `api/dependencies.py` | DB session, `Claims` (stateless JWT check), `CurrentUser` (DB check), `AdminUser` |
| `services/` | Business rules and SQL (attempt lifecycle, scoring, essays, import, admin) |
| `models/` | SQLAlchemy models (the schema source of truth for Alembic) |
| `schemas/` | Request/response contracts |
| `core/` | Settings, security (bcrypt + JWT), error format, Postgres rate limiter |
| `scripts/` | seed, create_admin, setup_storage, check_requirements |

*Decision:* the plan listed a `repositories/` layer. For the MVP, queries live in services, because a pass-through repository layer would add files without adding value. Hot-path SQL is isolated in named constants (`_SAVE_SQL`, `_SCORE_SQL`, `_FULL_MOCK_SQL`).

## Authentication (decision D1, revised)

- FastAPI-native: bcrypt (cost 12, run off the event loop) and an HS256 JWT in an **httpOnly, SameSite=Lax, Secure** cookie `qadam_session` (7 days).
- `token_version` on the user is embedded in the JWT. Changing the password or role, or disabling the account, invalidates all sessions.
- Login and registration are rate-limited in Postgres (`rate_limits` table, which works across serverless instances).
- Reason for revising D1 (Supabase Auth): the project uses only a Postgres connection string, so no Supabase keys or auth library are needed in the browser (a smaller bundle). Email verification and password reset need an email provider and are on the backlog.

## Exam engine (performance-critical)

| Concern | Implementation |
|---|---|
| Start | One random-selection query (window function per subject quota) + one bulk insert |
| Load | One join query returns the whole paper, **without** `correct_option` (SQL `CASE` reveals it only for practice questions already checked) |
| Navigation | 100% client-side (`useReducer`); there is no request per Next/Previous |
| Autosave | localStorage first, then a debounced batch `PUT` (1.2 s debounce, 8 s max wait), retry with backoff, flush on `visibilitychange`/`pagehide`/`online`. The server applies a write only if `client_seq` is newer, in a single `UPDATE … FROM unnest()` that also checks ownership, status and deadline |
| Timer | Server stores `deadline_at`; the client shows `deadline − (now + serverOffset)`. Server rejects writes after deadline + 30 s grace; expired attempts are auto-finalised when next accessed |
| Submit | `SELECT … FOR UPDATE`, one CTE scores and aggregates, `INSERT … ON CONFLICT DO NOTHING` → idempotent under double-click and concurrent requests |
| Resume | One active full mock per student per category (partial unique index); starting again resumes it |

## Frontend layout

| Folder | Responsibility |
|---|---|
| `app/(public)` | Landing (static) |
| `app/(auth)` | Login, register (static shells, small client forms) |
| `app/(student)` | Dashboard → `prepare/[exam]` → `prepare/[exam]/[category]` → results, history, profile |
| `app/attempt/[id]` | Exam engine (full-screen), `essays/` USAT essay interface |
| `app/(admin)/admin` | Admin panel (own route group, so student bundles contain no admin code) |
| `components/ui` | Hand-written shadcn-style primitives (no Radix runtime) |
| `features/` | `exam-engine`, `essays`, `prepare`, `admin`, `auth` |
| `lib/api` | `client.ts` (browser, same-origin), `server.ts` (RSC, server-only), `types.ts` |
| `proxy.ts` | Edge redirect for protected routes (cookie presence only) |

## Caching

| Data | Where | TTL |
|---|---|---|
| Exams/categories (`/exams`) | Next fetch cache + `Cache-Control: s-maxage=60` | 60 s |
| Category overview (counts) | Next fetch cache | 30 s |
| Taxonomy inside API | Process memory | 60 s, invalidated on admin edits |
| Anything per student | **never cached** (`no-store`) | – |
