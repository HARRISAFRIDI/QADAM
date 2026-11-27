# QADAM (قدم) — Requirements & Project Plan

> **Status:** ✅ APPROVED v1.0 (owner approved D1–D17 on 2026-11-27; D10 = no paid version). MVP implemented, see §16 and `docs/progress.md`.
> **Date:** 2026-11-27
> **Rule:** The master prompt has been rewritten as `MASTER_PROMPT.md` with every final decision.

---

## 0. How to use this document

1. Read sections 1–12 (the plan).
2. Answer the open decisions in **Section 13** (each has a recommendation, so you can reply "approve all" or change specific ones).
3. Once you approve, I will:
   - mark this plan **APPROVED v1.0**,
   - write `MASTER_PROMPT.md` (your original prompt plus the final decisions),
   - start **only** when you say "start coding".

---

## 1. Understanding of QADAM

QADAM is a commercial-grade online test-preparation platform for Pakistani students preparing for **HAT** (5 categories) and **USAT** (6 categories). Students pick a test, then a category, and see **only** the sections, subjects, topics, practice and mock tests relevant to that category. They can practise by topic, subject or section, or take a full timed mock exam. USAT mocks also include two essays. Results come with section-wise and subject-wise analytics and full solution review. Admins manage the whole content hierarchy, the question bank, uploaded papers, answer sheets and solutions, essay topics and grading, and publishing.

**Priority order (fixed):** Performance → Deployment reliability → UI/UX → Correct functionality → Security → Maintainability → Scalability.

**Most important parts to get right:** the mock-test engine (timer, autosave, idempotent submission, protected answers) and early deployment that stays reliable.

---

## 2. Requirements Summary

### 2.1 Functional — Student
| # | Requirement | MVP |
|---|---|---|
| S1 | Register / login / logout / reset password | ✅ |
| S2 | Choose test (HAT / USAT) then category; choice remembered | ✅ |
| S3 | Preparation overview showing only that category's sections, subjects and topics | ✅ |
| S4 | Practice modes: topic-wise, subject-wise, section-wise | ✅ |
| S5 | Full mock test using the category blueprint (correct counts and duration) | ✅ |
| S6 | Exam UI: timer, prev/next, question grid, mark for review, answered/unanswered/review states | ✅ |
| S7 | Autosave, resume after refresh or network loss, confirm before submit | ✅ |
| S8 | USAT essays: 3 argument topics (choose 1, 15 marks) and 3 narrative topics (choose 1, 10 marks), 40 min, autosave, word count | ✅ |
| S9 | Results: score, %, correct/incorrect/unanswered, accuracy, section and subject breakdown, time used | ✅ |
| S10 | Solution review: own answer vs correct answer, explanation, detailed solution | ✅ |
| S11 | Test history | ✅ |
| S12 | Profile and settings | ✅ (basic) |
| S13 | Bookmarks | ⏳ Post-MVP |
| S14 | Download/view past papers (PDF) | ❓ Decision D6 |

### 2.2 Functional — Admin
| # | Requirement | MVP |
|---|---|---|
| A1 | Admin dashboard (counts, recent attempts, pending essays) | ✅ |
| A2 | CRUD: categories, sections, subjects, topics, blueprints (weightage) | ✅ |
| A3 | Question CRUD with draft → published → archived workflow | ✅ |
| A4 | Question image upload | ✅ |
| A5 | Bulk import (CSV/XLSX template), imported as **drafts** | ✅ |
| A6 | Paper upload form with paper file, **separate answer-sheet file**, optional solution file, all linked and with metadata | ✅ |
| A7 | Fixed (curated) mock-test builder, preview, publish | ✅ |
| A8 | Essay topic management | ✅ |
| A9 | Manual essay grading (score + feedback) | ✅ |
| A10 | Student list (view, deactivate) | ✅ (basic) |
| A11 | Results monitoring | ✅ (basic) |
| A12 | Audit log of admin actions | ✅ (write-only log) |
| A13 | Automatic extraction of questions from PDF/DOCX | ⏳ Post-MVP (always as drafts) |

### 2.3 Non-functional (engineering targets — they will be measured, not assumed)
| Area | Target |
|---|---|
| Landing page | LCP < 2.0 s on mid-range Android over 4G; first-load JS < 100 KB gzip |
| App pages | Client JS kept small; Server Components by default |
| API (warm, same region) | p95 < 300 ms for reads, < 150 ms for answer saves |
| Test start | < 1 s end-to-end (warm) |
| Exam navigation | 0 network requests per Next/Previous; answer selection under 16 ms |
| Submission | Idempotent; never creates duplicate results |
| Availability | Preview deployment for every PR; production only from `main` |
| Security | Answer keys never leave the server before submission; answer sheets in private storage |

---

## 3. Exam Structure (seed data — taken from your prompt, unchanged)

### 3.1 USAT — 75 MCQs / 100 min, then 2 essays / 25 marks / 40 min
Every USAT category: **Verbal Reasoning (English) 20 + Quantitative Reasoning 25 + category subjects 30**.

| Category | Category-specific subjects (30 MCQs) |
|---|---|
| USAT-E | Physics 10 · Chemistry 10 · Mathematics 10 |
| USAT-M | Physics 8 · Chemistry 8 · Biology 14 |
| USAT-CS | Physics 8 · Computer Science 14 · Mathematics 8 |
| USAT-GS | Mathematics 10 · Statistics 10 · Economics 10 |
| USAT-COM | Accounting 10 · Commerce 10 · Economics 10 |
| USAT-A | Islamiat/Ethics 10 · Pakistan Studies 10 · General Knowledge 10 |

Essays: Argument-based (choose 1 of 3, 15 marks) and Narrative-based (choose 1 of 3, 10 marks). Both are required.

### 3.2 HAT — 100 MCQs / 120 min
| Category | Disciplines | Verbal | Analytical | Quantitative |
|---|---|---|---|---|
| HAT-I | Engineering & Technology, Computer Science, Mathematics, Statistics, Physics | 30 | 30 | 40 |
| HAT-II | Management Sciences, Business Education | 30 | 40 | 30 |
| HAT-III | Arts & Humanities, Social Sciences, Psychology (Clinical & Applied), Law | 40 | 35 | 25 |
| HAT-IV | Agriculture & Veterinary Sciences, Biological & Medical Sciences, Physical Sciences, Education, Media & Mass Communication | 40 | 30 | 30 |
| HAT-General | Religious Studies (Madrassa graduates) | 40 | 30 | 30 |

⚠️ **Flagged:** HAT-General has the same weightage as HAT-IV, and only one discipline was supplied. I will seed exactly what you gave me and add nothing. Please confirm it (D11).

### 3.3 Default HAT topics (seeded; admins can edit them)
- **Verbal:** Vocabulary, Synonyms, Antonyms, Sentence Completion, Reading Comprehension, Grammar, Verbal Logic
- **Analytical:** Logical Puzzles, Arrangements, Ordering, Conditions, Statements, Deductions, Logical Problems
- **Quantitative:** Arithmetic, Percentages, Ratios, Algebra, Equations, Geometry, Probability, Statistics, Word Problems

USAT subject topics (Physics, Chemistry, and so on) were not supplied. Admins will enter them, or I can seed a starter list if you want one (D15).

---

## 4. Architecture

### 4.1 Overview
```
            Browser (student/admin)
                    │  HTTPS
                    ▼
   ┌────────────────────────────────────┐
   │ Vercel Project #1 — frontend       │  Next.js (App Router, RSC)
   │  • pages, Server Components        │
   │  • rewrite /api/v1/* ──────────────┼──┐  (same-origin: no CORS preflight)
   └────────────────────────────────────┘  │
                                           ▼
   ┌────────────────────────────────────┐
   │ Vercel Project #2 — backend        │  FastAPI (Python serverless function)
   │  • /api/v1/* routes                │
   │  • auth check, business logic      │
   └───────┬───────────────────┬────────┘
           │ asyncpg (pooler)  │ HTTPS (server-side key)
           ▼                   ▼
   ┌───────────────┐   ┌──────────────────┐
   │ Supabase      │   │ Supabase Storage │
   │ PostgreSQL    │   │ public: images   │
   │ (+ Auth, D1)  │   │ private: papers, │
   └───────────────┘   │ answer sheets    │
                       └──────────────────┘
```

- **Modular monolith:** one FastAPI app and one Next.js app in one GitHub repo, deployed as two Vercel projects.
- **Backend layering:** `routes → services → repositories → models`. Routes stay thin, services hold business rules (scoring, timer, publishing), and repositories hold all SQL.
- **Frontend layering:** `app/` (routes) → `features/` (exam, practice, admin, and so on) → `components/` (UI primitives, shadcn) → `lib/` (API client, utils).
- **Same-origin API:** the browser calls `/api/v1/...` on the frontend domain, and a Next.js rewrite proxies it to the backend. This removes CORS preflight round-trips and keeps cookies first-party. The two `*.vercel.app` hosts count as different sites.
- **Region co-location:** the Vercel functions and the Supabase project run in the same region. The recommendation is Mumbai (`bom1` / `ap-south-1`), the closest to Pakistan (D12).

### 4.2 Repository structure
```
QADAM/
├── frontend/
│   ├── app/
│   │   ├── (public)/            # landing, about, hat, usat, features
│   │   ├── (auth)/              # login, register, reset-password
│   │   ├── (student)/           # dashboard, prepare/[exam]/[category]/..., attempt/[id], results/[id], history, profile
│   │   ├── (admin)/admin/       # dashboard, questions, taxonomy, papers, mocks, essays, students
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                  # shadcn primitives (only those used)
│   │   └── shared/              # Logo, PageHeader, EmptyState, ...
│   ├── features/
│   │   ├── exam-engine/         # client store, timer, autosave queue, grid
│   │   ├── practice/
│   │   ├── results/
│   │   ├── essays/
│   │   └── admin/
│   ├── hooks/
│   ├── lib/                     # api client, auth helpers, env, utils
│   ├── types/                   # API types (generated from OpenAPI)
│   ├── public/
│   ├── next.config.ts
│   ├── package.json
│   └── .env.example
│
├── backend/
│   ├── main.py                  # FastAPI `app` entrypoint (Vercel-detected; verified in Phase 3)
│   ├── api/
│   │   ├── routes/              # auth, catalog, practice, attempts, results, essays, admin/*
│   │   └── dependencies.py      # db session, current_user, require_admin
│   ├── core/                    # config (pydantic-settings), security, errors, logging
│   ├── db/                      # engine, session, base
│   ├── models/                  # SQLAlchemy models
│   ├── schemas/                 # Pydantic request/response models
│   ├── services/                # scoring, attempt lifecycle, blueprint, storage, import
│   ├── repositories/
│   ├── utils/
│   ├── migrations/              # Alembic (env.py, versions/)
│   ├── scripts/                 # seed.py, check_requirements.py
│   ├── tests/
│   ├── alembic.ini
│   ├── requirements.txt         # runtime deps only (UTF-8, no BOM)
│   ├── requirements-dev.txt     # pytest, ruff, etc. (never deployed)
│   ├── .python-version
│   └── .env.example
│
├── docs/
│   ├── architecture.md
│   ├── database.md
│   ├── api.md
│   ├── deployment.md
│   ├── development.md
│   ├── design-system.md
│   ├── stitch-prompts.md
│   └── progress.md              # phase checklist + known issues
│
├── .github/workflows/ci.yml     # lint, typecheck, test, build, requirements check
├── .gitattributes               # force LF + UTF-8-friendly text handling
├── .gitignore
├── PLAN.md                      # this file
└── README.md
```

---

## 5. Database Strategy

### 5.1 Principles
- Normalised PostgreSQL schema with FKs, unique and check constraints, `created_at`/`updated_at`, and soft delete (`archived`) for content.
- **Alembic is the only way the schema changes.** Migrations run from a developer machine or CI against Supabase's direct/session connection, never at function cold start.
- **Runtime connections** go through the Supabase pooler in transaction mode (port 6543). The serverless-safe setup is SQLAlchemy `NullPool` plus asyncpg with the statement cache disabled. The pooler does not support prepared statements, so skipping this setting is a common source of production errors.
- Files live in Supabase Storage, and only their metadata lives in Postgres.

### 5.2 Proposed tables (21)

**Identity**
- `profiles`: id (= auth user id), full_name, phone, city, role (`student`|`admin`), preferred_category_id, is_active, timestamps

**Content hierarchy**
- `exams`: HAT, USAT (code, name, mcq_duration_min)
- `categories`: exam_id, code (`HAT-I`, `USAT-E`…), name, disciplines (text[]), mcq_duration_min, essay_duration_min (USAT only), sort_order, is_active
- `sections`: exam_id, code, name, kind (`mcq`|`essay`). Examples: Verbal, Analytical, Quantitative, Subject-Specific, Essay
- `subjects`: name, slug (shared; e.g. Physics is one row)
- `topics`: subject_id, parent_id (nullable, for subtopics), name, slug, sort_order
- `blueprints`: category_id, section_id, subject_id, mcq_count, sort_order. **This table encodes the weightage tables in §3**, so the full-mock generator and the "show only relevant subjects" logic both read it. Unique (category_id, section_id, subject_id).

**Question bank**
- `questions`: exam_id, subject_id, topic_id, stem, image_file_id, option_a…option_d, correct_option (`CHECK IN ('A','B','C','D')`), explanation, solution, difficulty (`easy|medium|hard`), marks (default 1), status (`draft|published|archived`), source, created_by, verified_by, timestamps
  - Options are **embedded** (4 columns) instead of a separate `question_options` table. For single-correct, 4-option MCQs this is faster (no join) and simpler. Multi-select can be added later through a migration.
  - The correct answer is stored in the same row but is **excluded from every student-facing query and schema**. Separate Pydantic schemas (`QuestionForAttempt` vs `QuestionWithSolution`) make leaking it a type error.
  - Index: partial index `(exam_id, subject_id, topic_id) WHERE status='published'`.

**Mocks, papers, files**
- `mock_tests`: category_id, title, kind (`full`|`section`|`subject`), source (`curated`|`generated`), status, duration_min, published_at, created_by
- `mock_test_questions`: mock_test_id, question_id, position. PK (mock_test_id, position)
- `essay_topics`: exam_id, essay_type (`argument`|`narrative`), prompt, status
- `mock_test_essay_topics`: mock_test_id, essay_topic_id
- `files`: bucket, path, kind (`paper|answer_sheet|solution|question_image`), mime, size_bytes, checksum, uploaded_by
- `papers`: exam/category/section/subject/topic ids, title, year, paper_file_id, answer_sheet_file_id, solution_file_id, duration_min, total_marks, status. This links a paper to its answer sheet and solution.

**Attempts and results**
- `attempts`: user_id, category_id, mock_test_id (nullable), mode (`topic|subject|section|full_mock`), scope ids, status (`in_progress|submitted|expired`), started_at, deadline_at, submitted_at, essay_started_at, essay_deadline_at
  - Index: (user_id, created_at DESC); partial unique index so a user has at most one active full mock per category (optional, D16)
- `attempt_questions`: attempt_id, position, question_id, section_id, subject_id, selected_option, is_marked, client_seq, answered_at, is_correct (filled at submit)
  - **Student answers are stored here as well**, so there is no separate `student_answers` table: one row per question, one upsert per batch, and scoring is a single `GROUP BY`.
  - `client_seq` guards against stale writes: a save only applies when `incoming_seq > stored_seq`.
- `results`: attempt_id (PK = idempotency key), score, total_marks, correct, incorrect, unanswered, accuracy, time_used_sec, section_breakdown JSONB, subject_breakdown JSONB, essay_status
- `essay_submissions`: attempt_id, essay_type, essay_topic_id, content, word_count, status (`draft|submitted|graded`), score, feedback, graded_by, graded_at. Unique (attempt_id, essay_type)

**Operations**
- `audit_logs`: actor_id, action, entity, entity_id, payload JSONB, created_at
- `bookmarks`: user_id, question_id (created now; UI comes post-MVP)

Full ERD and column types go into `docs/database.md` in Phase 4 and get reviewed before the first migration.

### 5.3 Key query designs
- **Start full mock (generated):** read the blueprint (cached), then one query per blueprint row picks N random published questions, run in a single transaction and inserted into `attempt_questions` with a bulk `INSERT`. At MVP scale, `ORDER BY random()` on the indexed filtered subset is fine. If the bank grows past about 100k rows it can move to a random-key approach.
- **Load attempt:** one query joins `attempt_questions` to `questions` (stem, options, image only; never the answer) and returns the whole paper in one response, about 100 questions and roughly 60–120 KB gzip.
- **Autosave:** `INSERT … ON CONFLICT (attempt_id, position) DO UPDATE … WHERE excluded.client_seq > attempt_questions.client_seq`, which applies one batch in one statement.
- **Submit:** `UPDATE attempts SET status='submitted' WHERE id=$1 AND status='in_progress' RETURNING …`. Only the first caller wins, so the operation is idempotent. Scoring is done in SQL and the result is written to `results`. Repeat calls return the existing result.

---

## 6. Mock-Test Engine Design

| Concern | Design |
|---|---|
| Source of truth for time | Server stores `started_at` / `deadline_at`. The API returns `server_now` and `deadline_at`, and the client computes the remaining time from the **offset**, so a wrong device clock does not matter. |
| Navigation | The whole paper loads once into a lightweight client store (Zustand or `useReducer` + context; picked in Phase 6). Prev/next/grid never call the network. Each question card is memoised, so selecting an answer re-renders one card plus one grid cell. |
| Autosave | Every change gets a `client_seq`, goes into localStorage first, and is added to a queue. The queue flushes after 2 s debounce, every 10 s at most, and on `visibilitychange`/`pagehide` (using `sendBeacon`). It retries with backoff, and an indicator shows "Saving… / Saved / Offline — answers kept on this device". |
| Resume | On reload, server state and localStorage are merged; the higher `client_seq` wins. The timer keeps running on the server while the student is away. |
| Deadline enforcement | The server rejects saves after `deadline_at + 30 s grace`. Expired attempts are auto-finalised the next time they are accessed, and the client auto-submits at 0:00. |
| Submission | Confirmation dialog listing the unanswered and marked counts, then an idempotent submit that redirects to results. |
| Answer protection | Correct answers and solutions are only returned by `/results/{id}/review`, which checks that the attempt is submitted and belongs to the user. |
| USAT flow | Part 1 MCQs (100 min), then Part 2 essays (40 min) with their own deadline (D8). |
| Practice mode | Same engine, untimed by default, with a "Check answer" option per D3. |

---

## 7. API Design (v1)

Conventions: JSON, `/api/v1` prefix, one error format `{ "error": { "code", "message", "details" } }`, cursor or page pagination on lists, Pydantic response models (only the fields that are needed), and OpenAPI-generated TypeScript types for the frontend.

| Area | Endpoints (indicative) |
|---|---|
| Health | `GET /health` (app), `GET /health/db` |
| Auth / me | `GET /me`, `PATCH /me` (login/register handled per D1) |
| Catalog (cached) | `GET /exams`, `GET /exams/{code}/categories`, `GET /categories/{code}/overview` (sections, subjects, topics and blueprint in **one** call) |
| Practice | `POST /practice` (scope: topic, subject or section, plus count) → attempt |
| Attempts | `POST /attempts` (full mock), `GET /attempts/{id}` (paper and state), `PUT /attempts/{id}/answers` (batch), `POST /attempts/{id}/submit`, `POST /attempts/{id}/check/{position}` (practice only, D3) |
| Essays | `GET /attempts/{id}/essays`, `PUT /attempts/{id}/essays/{type}` (autosave), `POST /attempts/{id}/essays/submit` |
| Results | `GET /results/{attempt_id}`, `GET /results/{attempt_id}/review`, `GET /me/history` |
| Admin | `/admin/categories`, `/admin/sections`, `/admin/subjects`, `/admin/topics`, `/admin/blueprints`, `/admin/questions` (+ `/bulk-import`, `/{id}/publish`), `/admin/files/upload-url`, `/admin/papers`, `/admin/mock-tests` (+ `/preview`, `/publish`), `/admin/essay-topics`, `/admin/essays` (grading queue), `/admin/students`, `/admin/stats` |

**Uploads:** the browser asks the backend for a **signed upload URL** and uploads straight to Supabase Storage. Large files never pass through the Vercel function, whose request body limit is about 4.5 MB. The backend then records the metadata. Answer-sheet and solution buckets are private, and any download goes through short-lived signed URLs issued only to admins (or to students after submission, if D6 allows).

---

## 8. Performance Strategy

**Frontend**
- Server Components by default. Client Components only for the exam engine, forms, interactive selectors and admin tables.
- Public pages (landing, HAT, USAT, features) are static/ISR, and the catalog (categories, subjects, topics) is cached with `revalidate` plus tag invalidation when an admin edits it.
- One font family through `next/font`, 2–3 weights at most. The Urdu "قدم" wordmark is an **SVG**, so no Urdu webfont is loaded.
- Only the shadcn components that are used get added; Lucide icons are imported per icon.
- Charts in results and the admin area are lazy-loaded (`next/dynamic`), and simple bars are pure CSS.
- Admin bundles are isolated in their own route group, so students never download admin code.
- Independent data fetches run in parallel (`Promise.all`). The category overview needs a single API call.
- Images use `next/image` with AVIF/WebP. Question images are compressed on upload.
- Skeleton loading states through `loading.tsx`.

**Backend**
- Async endpoints throughout, SQLAlchemy 2.0 async, asyncpg.
- Lean `requirements.txt` keeps cold starts and the bundle small. Heavy libraries (openpyxl for import) are imported lazily inside admin endpoints only.
- No N+1 queries: explicit `selectinload`/joins, and responses select only the columns they need.
- Bulk inserts for attempt creation and imports.
- `Cache-Control` headers on public catalog endpoints, `no-store` on anything private.

**Database**
- Indexes are planned per query in §5.3, and `pg_stat_statements` (available on Supabase) is reviewed for slow queries.

**Measurement**
- Lighthouse/Vercel Speed Insights for the frontend. k6 scripts for test start, autosave and submit with 100 → 500 → 1000 virtual students (Phase 8).
- No Redis or queues unless the measurements show they are needed.

---

## 9. Vercel Deployment Strategy

### 9.1 Projects
| | Frontend | Backend |
|---|---|---|
| Vercel project | `qadam-web` | `qadam-api` |
| Root directory | `frontend` | `backend` |
| Runtime | Next.js | Python (FastAPI). Zero-config detection of `app` in `main.py` **to be verified against current Vercel docs in Phase 3** |
| Env vars | `NEXT_PUBLIC_API_URL`(if needed), `API_PROXY_TARGET` (server-only), Supabase anon key (if D1 = Supabase Auth) | `DATABASE_URL`, `SECRET_KEY`/JWT settings, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ALLOWED_ORIGINS`, `ENVIRONMENT` |
| Region | `bom1` | `bom1` |
| Deploys | Preview per PR, production from `main` | Same |

### 9.2 Preventing the requirements-file problem
The likely cause of your earlier failure: on Windows **PowerShell 5.1**, `pip freeze > requirements.txt` writes the file as **UTF-16 LE with BOM**, which pip on Vercel (Linux) cannot read. Safeguards:
1. `requirements.txt` is **hand-written**, with pinned versions chosen on purpose, and is never produced by `>` redirection in PowerShell.
2. `.gitattributes` sets `*.txt text eol=lf` and `.editorconfig` sets `charset = utf-8`.
3. `backend/scripts/check_requirements.py` fails if the file has a BOM, contains non-ASCII bytes, contains CRLF, has invalid requirement syntax (using `packaging`), or has unpinned packages.
4. The check runs in a **pre-commit hook and in GitHub Actions CI** on every push.
5. CI installs `requirements.txt` into a **fresh Linux venv** with the same Python version as Vercel and runs `python -c "import main"`.

### 9.3 Python version
- Pin a single version (planned: **3.12**, confirmed against Vercel's supported list in Phase 3) in `backend/.python-version`, in the CI matrix, and in the local venv.

### 9.4 Pre-deployment checklist (automated in CI where possible)
Requirements encoding/syntax ▸ fresh-venv install ▸ backend import and `pytest` ▸ `ruff` ▸ Alembic `upgrade head` against a test DB ▸ `npm ci` ▸ `tsc --noEmit` ▸ `eslint` ▸ `next build` ▸ env var presence check ▸ file-path casing (Windows is case-insensitive but Vercel's Linux builders are not) ▸ after deploy, check `/health` and `/health/db` on the deployed URL. **A deployment is not called successful until those checks pass.**

### 9.5 Early deployment
In Phase 3 the skeleton (one landing page plus `/health`) is deployed to both projects **before** any feature work, and the frontend → backend → DB round-trip is verified on a preview URL.

---

## 10. UI/UX Strategy (Google Stitch)

### 10.1 Design tokens (draft, finalised in Phase 2)
| Token | Value | Use |
|---|---|---|
| `forest-900` | `#0F3D2E` | Primary brand, primary buttons, headers |
| `forest-700` | `#1E5A44` | Hover, links |
| `sage-500` | `#7FA08A` | Secondary accents |
| `sage-100` | `#E7EFE9` | Subtle fills, selected states |
| `offwhite` | `#F8F6F1` | Page background |
| `gold-500` | `#B8923E` | Highlight, badges, "marked for review" |
| `charcoal-900` | `#1E2320` | Body text |
| `white` | `#FFFFFF` | Cards |
| Semantic | success `#2E7D4F`, error `#B42318`, warning `#B7791F`, info `#2F6690` | States |

- **Typography:** one sans-serif family (candidates: *Plus Jakarta Sans*, *Manrope*, *Inter*), weights 400/600/700 only. Urdu wordmark as SVG.
- **Shape:** radius 8–12 px (not pill-heavy), 1 px borders `#E3E1DA`, two shadow levels only.
- **Spacing:** 4 px scale, max content width 1200 px.
- **Motion:** 150–200 ms CSS transitions only.
- **Accessibility:** WCAG AA contrast, visible focus rings, 44 px touch targets, keyboard shortcuts in the exam (A–D, ←/→, M for mark).

### 10.2 Stitch workflow
1. I write `docs/stitch-prompts.md` with one master style prompt (brand, tokens, rules to avoid) plus one prompt per screen.
2. The Stitch MCP tools are available in this environment, so I can create the QADAM Stitch project and design system and generate the screens directly, with your approval. You can also run the prompts yourself at stitch.withgoogle.com.
3. You review and choose variants, and the approved screens become the reference.
4. Implementation keeps the Stitch layout, spacing and hierarchy and maps them onto the tokens and shadcn components.

### 10.3 Screens (priority order)
1. Mock-test interface (mobile + desktop) ★ most important
2. Landing page
3. Login / Registration
4. Student dashboard
5. Test → Category selection
6. Preparation overview (sections, subjects, topics, modes)
7. Practice page
8. USAT essay interface
9. Results
10. Solution review
11. Test history, profile
12. Admin dashboard, question editor/list, paper + answer-sheet upload, mock builder, essay grading

**Mobile exam layout:** sticky top bar (timer, section, save status), the question with full-width option cards, a bottom bar (Prev · Mark · Next), and the question grid as a bottom sheet.

---

## 11. Development Phases & Checklist

| Phase | Scope | Exit criteria |
|---|---|---|
| **1. Planning** | This document, decisions D1–D17, final ERD and API list | You approve the plan; `MASTER_PROMPT.md` updated |
| **2. UI/UX (Stitch)** | Design tokens, Stitch prompts, screens 1–12 | You approve the designs |
| **3. Skeleton + early deploy** | Repo, git, CI, Next.js and FastAPI skeletons, `/health`, rewrite proxy, two Vercel projects, Supabase project | Preview and production URLs live; FE→BE→DB round-trip verified on Vercel |
| **4. Database** | Models, Alembic migrations, seed (exams, categories, sections, subjects, blueprints, HAT topics) | `alembic upgrade head` clean on Supabase; seed verified; `docs/database.md` |
| **5. Auth & roles** | Register/login/reset, profiles, student/admin guards (FE + BE), rate limits | Auth tests pass; student cannot reach admin APIs |
| **6. Core student platform** | Selection flow, overview, practice, mock engine, essays, results, review, history | Engine tests (timer, autosave, idempotent submit, answer protection) pass; mobile verified |
| **7. Admin system** | Taxonomy CRUD, question CRUD, bulk import, uploads (paper + answer sheet + solution), mock builder, preview/publish, essay grading, students | Admin flows tested end-to-end; files private where required |
| **8. Testing & optimisation** | k6 load tests, Lighthouse, query review, security review | Targets in §2.3 measured and documented |
| **9. Launch prep** | Domain, Vercel Pro, Supabase Pro + backups, monitoring, final security and performance pass | Go-live checklist complete |

Progress is tracked in `docs/progress.md` from Phase 3 onwards.

---

## 12. Risks & Mitigations

| # | Risk | Mitigation |
|---|---|---|
| R1 | requirements.txt encoding/syntax errors (happened before) | §9.2: hand-written file, checker script, pre-commit hook, CI fresh-venv install |
| R2 | Python cold starts on Vercel (about 1–2 s) | Lean deps, lazy imports, co-located region; measure in Phase 3. If unacceptable, move the backend to another host (only with your approval) |
| R3 | Too many DB connections from serverless | Supabase transaction pooler + `NullPool` + asyncpg statement cache off |
| R4 | Prepared-statement errors with the pooler | Same settings as R3, plus an integration test against the real pooler |
| R5 | **Vercel Hobby plan forbids commercial use** | Free plan for development; upgrade to Pro before public or paid launch |
| R6 | **Supabase Free pauses after about 7 days of inactivity** and has 500 MB DB / 1 GB storage | Fine for development; Supabase Pro before launch (also gives daily backups) |
| R7 | Vercel function body limit (about 4.5 MB) blocks file uploads | Direct-to-Storage signed uploads (§7) |
| R8 | In-memory rate limiting doesn't work on serverless | Use Supabase Auth's built-in limits (if D1) plus a small Postgres-backed limiter for sensitive endpoints |
| R9 | Answer key leakage | Separate response schemas, a review endpoint gated on attempt status, and tests that assert no `correct_option` appears in attempt payloads |
| R10 | Students lose answers on a bad network | localStorage first, retry queue, `sendBeacon` on page hide, merge on resume |
| R11 | Windows/Linux path casing differences | Lowercase kebab-case file names, plus a CI build on Linux |
| R12 | Function timeout on heavy admin work (imports) | Process imports in chunks; extraction is post-MVP |
| R13 | Clock manipulation | Server-side deadline; client uses offset only |
| R14 | Scope creep | MVP scope fixed in §2; anything else goes to a backlog |

---

## 13. Decisions Requiring Your Approval

Reply with "approve all" or with the number and your choice.

| # | Decision | Options | **Recommendation** |
|---|---|---|---|
| **D1** | Authentication provider | (a) **Supabase Auth**: email/password, verification, reset, rate limits built in; FastAPI verifies the JWT locally; roles live in `profiles` · (b) custom FastAPI auth (Argon2 + JWT cookies), where we build reset/verify/email ourselves | **(a) Supabase Auth**: less security work, already in the stack, Google login possible later |
| **D2** | Marking scheme | 1 mark per MCQ, **no negative marking**? (USAT: 75 MCQ + 25 essay = 100) | Yes. Marks are stored per question, so this can change later |
| **D3** | Practice-mode feedback | (a) "Check answer" per question (instant explanation) · (b) feedback only at the end | **(a)** for practice; mocks always reveal at the end only |
| **D4** | Where mock tests come from | (a) auto-generated from the bank using the blueprint · (b) admin-curated fixed papers · (c) both | **(c) both** |
| **D5** | Question scope | Questions tagged to **exam + subject + topic** and shared by every category that uses that subject (e.g. USAT Physics serves USAT-E, M, CS) | Yes. This avoids duplicating questions |
| **D6** | Uploaded papers (PDF/DOCX) | (a) admin-only source material for entering MCQs · (b) also downloadable by students as past papers; answer sheet only after an attempt | **(a) for MVP**, (b) later if wanted |
| **D7** | Bulk import format (MVP) | CSV/XLSX template; PDF/DOCX auto-extraction post-MVP, always as drafts | Yes |
| **D8** | USAT full-mock flow | MCQs 100 min, then essays 40 min, sequential with separate timers; essays also available as standalone practice | Yes |
| **D9** | Registration fields | Full name, email, password, phone (optional), city (optional), target test; email verification required | Yes |
| **D10** | Monetisation in MVP | Free in MVP; paid plans/payments later (schema kept extensible) | Free MVP. Confirm whether payments (JazzCash/Easypaisa/cards) are planned |
| **D11** | HAT-General | Seed exactly as supplied (Religious Studies; 40/30/30; 120 min) | Please confirm |
| **D12** | Region & plans | Vercel `bom1` + Supabase `ap-south-1` (Mumbai); free tiers during development, Pro before launch | Yes |
| **D13** | Language | English UI; Urdu only in the brand mark | Yes (Urdu UI can be added later) |
| **D14** | Dark mode | Not in MVP (light theme only) | Yes |
| **D15** | USAT topics and USAT Verbal/Quant topics | (a) admin enters them · (b) I seed a starter list for review | **(b)** I draft them and you approve |
| **D16** | Attempt rules | Unlimited attempts; one active full mock per category at a time; resume allowed until the deadline | Yes |
| **D17** | API routing | Next.js rewrite proxy (same-origin) instead of direct cross-origin calls | Yes |

---

## 14. Out of Scope for MVP (backlog)
Bookmarks UI · PDF/DOCX question extraction · passage-based / multi-select / image-option questions · AI essay grading · payments/subscriptions · leaderboards · notifications/email campaigns · Urdu UI · dark mode · native mobile apps · Redis/queues.

---

## 15. Next Steps
1. **You:** review this plan and answer D1–D17.
2. **Me:** update the plan to v1.0 APPROVED and write `MASTER_PROMPT.md` with every decision included.
3. **Me:** Phase 2: design tokens and Stitch prompts (still no application code).
4. **You:** say **"start coding"**, and Phase 3 (skeleton + early Vercel deploy) begins.

---

## 16. Implementation Decisions & Changes (v1.0)

| # | Change from the draft | Reason |
|---|---|---|
| D1 | **FastAPI-native auth** (bcrypt + JWT in an httpOnly cookie) instead of Supabase Auth | The owner supplied only a Postgres connection string. This adds no auth library to the browser bundle and keeps all data in one database. Email verification and password reset are deferred (they need an email provider). |
| D10 | **No paid version**: QADAM is free | Owner decision |
| D12 | Region **Tokyo** (`ap-northeast-1` / Vercel `hnd1`), not Mumbai | The owner's Supabase project was created in Tokyo. Vercel is pinned to `hnd1` to sit next to the DB. Moving the (still empty) project to Mumbai `ap-south-1` + `bom1` would cut round-trip time from Pakistan from about 200 ms to about 40–60 ms. Recommended before launch. |
| — | Supabase **pooler** URLs instead of the direct `db.<ref>.supabase.co` | The direct host is IPv6-only and unreachable from Vercel and from the dev machine |
| — | No separate `repositories/` layer | Queries live in services; a pass-through layer would add files with no benefit |
| — | No React Hook Form / Zod | Native forms + server-side Pydantic validation saves about 25 KB of client JS |
| — | shadcn-style components hand-written (no Radix runtime); native `<dialog>` | Same look, smaller bundle |
| — | Stitch design phase folded into a coded design system | The owner asked to build now. Tokens live in `frontend/app/globals.css`; Stitch screens can still be produced for refinement |
| — | Answers stored in `attempt_questions` (no separate `student_answers`) | One row per question gives one batch UPDATE for autosave and one CTE for scoring |
