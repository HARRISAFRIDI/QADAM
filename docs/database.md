# Database

PostgreSQL (Supabase). The schema is managed **only** by Alembic (`backend/migrations`). The models in `backend/models` are the source of truth.

## Tables (20)

| Group | Table | Notes |
|---|---|---|
| Identity | `users` | email (lower-case, unique), bcrypt hash, role `student`/`admin`, `token_version`, preferred category |
| Hierarchy | `exams` | HAT, USAT |
| | `categories` | 11 rows; MCQ and essay durations; disciplines `text[]` |
| | `sections` | per exam: verbal, analytical, quantitative / verbal, quantitative, subject, essay |
| | `subjects` | shared across categories (e.g. one Physics) |
| | `topics` | per subject, optional `parent_id` for subtopics |
| | `blueprints` | **official weightage**: (category, section, subject) → MCQ count |
| Bank | `questions` | 4 embedded options, `correct_option` A–D, explanation, solution, difficulty, marks, status draft/published/archived, `import_batch` |
| Tests | `mock_tests`, `mock_test_questions` | admin-curated frozen papers |
| | `essay_topics` | argument / narrative prompt pool |
| Attempts | `attempts` | mode, status, `deadline_at`, essay phase fields, `essay_options` JSONB |
| | `attempt_questions` | one row per question **and** the student's answer (`selected_option`, `is_marked`, `client_seq`, `is_correct`) |
| | `results` | PK = attempt_id (idempotent), totals and JSONB breakdowns, essay score |
| | `essay_submissions` | per attempt × type, content, word count, grade |
| Files | `files`, `papers` | storage metadata; a paper links its paper, answer sheet and solution files |
| Ops | `audit_logs`, `rate_limits`, `bookmarks` | |

## Key indexes

- `ix_questions_published_pool (exam_id, subject_id, topic_id) WHERE status='published'` serves student selection.
- `ix_questions_admin (exam_id, subject_id, status, id)` serves admin listing.
- `uq_attempts_active_full_mock (user_id, category_id) WHERE status='in_progress' AND mode='full_mock'` enforces one active mock.
- `ix_attempts_user_created (user_id, created_at DESC)` serves history.
- `attempt_questions` PK `(attempt_id, position)` serves load and autosave.

## Commands

```bash
cd backend
alembic upgrade head                         # apply migrations (uses DATABASE_URL_MIGRATIONS)
alembic revision --autogenerate -m "change"  # after editing models; review the file!
python -m scripts.seed                       # idempotent upsert of the official structure
```

## Connections

| Purpose | URL | Why |
|---|---|---|
| API runtime (local + Vercel) | transaction pooler `:6543` | serverless-safe; statement cache auto-disabled |
| Alembic / scripts | session pooler `:5432` | DDL and long sessions |
| Direct `db.<ref>.supabase.co` | IPv6 only | not reachable from Vercel or most home networks |
