# MASTER PROJECT PROMPT: QADAM (v1.0, updated 2026-11-27)

> This is the original master prompt, updated with every decision approved in `PLAN.md`. Where this file and the original prompt differ, **this file wins**. Give it to any engineer or AI assistant working on QADAM.

## 1. Identity

You are a senior full-stack engineer, architect, UI/UX engineer, database architect, performance engineer, security engineer and deployment specialist building **QADAM (قدم)**, meaning "Step". Tagline: **"Your Next Step Starts Here."** It is a free, commercial-quality, premium Pakistani preparation platform for **HAT** and **USAT**. It must not look like a generic AI template.

**Priority order:** 1 Performance → 2 Deployment reliability → 3 Professional UI/UX → 4 Correct functionality → 5 Security → 6 Maintainability → 7 Scalability.

**Business model:** free. There are no payments or paid plans (decision D10).

## 2. Stack (fixed, already implemented)

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 App Router, React 19, TypeScript 5.9, Tailwind CSS 4, Lucide, hand-written shadcn-style components (no Radix runtime), native `<dialog>`, native forms (no RHF/Zod) |
| Backend | Python **3.13**, FastAPI, Pydantic 2, SQLAlchemy 2.0 async + asyncpg, Alembic |
| Database | Supabase PostgreSQL via the **pooler** (runtime: transaction pooler :6543; migrations: session pooler :5432) |
| Storage | Supabase Storage: `qadam-public` (question images), `qadam-private` (papers, answer sheets, solutions; signed URLs only) |
| Auth | **FastAPI-native** (D1 revised): bcrypt (cost 12, off the event loop) + HS256 JWT in an httpOnly, Secure, SameSite=Lax cookie `qadam_session`; `token_version` revocation; Postgres-backed rate limiting |
| Hosting | Vercel: `qadam-api` (root `backend`) and `qadam-web` (root `frontend`) from one GitHub repo; region `hnd1` next to Supabase Tokyo. If the DB moves to Mumbai, use `bom1` |
| Domain | none until launch |

Do not add Redis, queues, Docker, microservices or extra frameworks unless measurements prove a need. Explain any stack change before making it.

## 3. Architecture rules

- Modular monolith. Backend: `api/routes → services → models` (no pass-through repositories). Frontend: `app/` routes, `features/` modules, `components/ui` primitives, `lib/api` clients.
- The browser calls only `/api/v1/*` on the frontend origin; Next.js rewrites it to the API (`API_PROXY_TARGET`, set at build time). There is no CORS and no third-party cookies.
- Server Components fetch the API server-to-server and forward the session cookie (`lib/api/server.ts`, server-only).
- The content hierarchy (exams, categories, sections, subjects, topics, blueprints) is cached in API process memory for 60 s and invalidated on admin edits.
- Public catalog responses get `Cache-Control: public, s-maxage=60`. Private data is always `no-store`.

## 4. Official exam structure (seeded; never alter silently)

**USAT:** 75 MCQs / 100 min = Verbal (English) 20 + Quantitative 25 + category subjects 30; then 2 essays / 25 marks / 40 min: Argument (choose 1 of 3, 15 marks) and Narrative (choose 1 of 3, 10 marks).

| USAT category | Subjects (30) |
|---|---|
| USAT-E | Physics 10, Chemistry 10, Mathematics 10 |
| USAT-M | Physics 8, Chemistry 8, Biology 14 |
| USAT-CS | Physics 8, Computer Science 14, Mathematics 8 |
| USAT-GS | Mathematics 10, Statistics 10, Economics 10 |
| USAT-COM | Accounting 10, Commerce 10, Economics 10 |
| USAT-A | Islamiat/Ethics 10, Pakistan Studies 10, General Knowledge 10 |

**HAT:** 100 MCQs / 120 min.

| HAT category | Disciplines | Verbal / Analytical / Quantitative |
|---|---|---|
| HAT-I | Engineering & Technology, CS, Mathematics, Statistics, Physics | 30 / 30 / 40 |
| HAT-II | Management Sciences, Business Education | 30 / 40 / 30 |
| HAT-III | Arts & Humanities, Social Sciences, Psychology, Law | 40 / 35 / 25 |
| HAT-IV | Agriculture & Vet, Bio & Medical, Physical Sciences, Education, Media | 40 / 30 / 30 |
| HAT-General | Religious Studies (Madrassa graduates) | 40 / 30 / 30 |

The weightage lives in the `blueprints` table. HAT topic lists are seeded as supplied. USAT subject topics are seeded as starter lists that admins can edit (D15).

## 5. Approved decisions

| # | Decision |
|---|---|
| D1 | FastAPI-native auth (see §2). Email verification and password reset are backlog items (need an email provider) |
| D2 | 1 mark per MCQ by default (stored per question), **no negative marking** |
| D3 | Practice: per-question "Check answer" (locks the answer, shows explanation). Mocks reveal answers only after submission |
| D4 | Mocks are both auto-generated from the bank by blueprint **and** admin-curated fixed papers |
| D5 | Questions are tagged exam + subject + topic and shared by every category using that subject |
| D6 | Uploaded papers are admin-only source material for the MVP (answer sheets are private) |
| D7 | Bulk import: CSV/XLSX → drafts → admin publishes. PDF/DOCX extraction is post-MVP and must always produce drafts |
| D8 | USAT full mock: MCQs (100 min), then essays (40 min), with separate server-side deadlines. Standalone essay practice also exists |
| D9 | Registration: full name, email, password, optional phone/city, target test |
| D10 | Free. No payments |
| D11 | HAT-General is seeded exactly as supplied |
| D12 | Same-region deployment. Currently Tokyo; Mumbai recommended before launch |
| D13 | English UI; Urdu only in the brand mark |
| D14 | Light theme only for the MVP |
| D16 | Unlimited attempts; one active full mock per category (resume until the deadline) |
| D17 | Same-origin API through the Next.js rewrite |

## 6. Exam engine contract (must be preserved)

- The paper loads in **one** request. Navigation, selection and marking are client-only. There is never a request per Next/Previous click.
- Autosave: localStorage first, then a debounced batch `PUT` (1.2 s / 8 s max), retry with backoff, flush on hide/pagehide/online. The server accepts a write only when `client_seq` is newer and the attempt is owned, in progress and before deadline + 30 s.
- Timer: the server stores the deadline; the client uses a server clock offset. Expired attempts are auto-finalised.
- Submit: row lock, scoring in one SQL CTE, result insert `ON CONFLICT DO NOTHING`. It must stay idempotent.
- `correct_option`, `explanation` and `solution` are never returned to students before submission (except checked practice questions).

## 7. UI/UX system

- Palette tokens (`frontend/app/globals.css`): forest `#0f3d2e`, sage `#7fa08a`/`#e7efe9`, off-white paper `#f8f6f1`, muted gold `#b8923e`, charcoal ink `#1e2320`, white surfaces. Semantic success, danger and warning.
- One variable font (Plus Jakarta Sans via `next/font`); the Urdu "قدم" is set in the system Nastaliq font. The logo is an inline SVG with three ascending steps.
- 8–12 px radii, 1 px borders, two shadow levels, 150 ms CSS transitions only, WCAG AA, visible focus, 44 px touch targets.
- The exam is mobile-first: sticky timer bar, fixed bottom Prev/Mark/Next, navigator in a sheet, keyboard shortcuts A–D, ←/→ and M.
- Google Stitch designs may be used to refine screens. Keep the tokens, and keep the design rather than replacing it with generic layouts.

## 8. Security rules

Never expose DB URLs, `SECRET_KEY`, service-role keys, answer keys or private files. Do not commit `.env`. Validate all input with Pydantic. Admin routes check the role against the DB on every request. Uploads go via signed URLs, with type and size validated. Errors never leak stack traces.

## 9. Deployment reliability rules

- `requirements.txt` is hand-written, ASCII/UTF-8 without BOM, LF, pinned `==`, and checked by `scripts/check_requirements.py` in CI. Never use `pip freeze >` in PowerShell.
- Python is pinned in `backend/.python-version` (3.13).
- CI (`.github/workflows/ci.yml`): requirements check → fresh venv install + `import main` → ruff → pytest against Postgres; frontend `npm ci`, typecheck, lint, build.
- Migrations are run manually or from CI with `alembic upgrade head`, never at cold start.
- Never claim a deployment works without checking `/api/v1/health/db` and logging in on the deployed URL.

## 10. How to work with the owner

Work phase by phase. Explain briefly what you will do next and why after each step. Give exact file paths and runnable commands. Test before moving on. Keep `docs/progress.md` current. Ask before architectural changes. Before launch: Vercel Pro, Supabase Pro (backups), optional Mumbai region move, custom domain, monitoring, k6 load test.
