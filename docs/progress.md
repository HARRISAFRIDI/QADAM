# Progress

_Last updated: 2026-11-27_

## Phases

- [x] **1. Planning**: PLAN.md approved (D1–D17); MASTER_PROMPT.md updated
- [~] **2. UI/UX**: design system implemented in code (tokens in `app/globals.css`). Optional: Google Stitch screens for refinement
- [~] **3. Skeleton + deploy**: both apps build; CI workflow written. **Pending: GitHub push and the two Vercel projects**
- [x] **4. Database**: 20 tables, Alembic migration `3b6e7cc1b1e8`, seed applied to Supabase
- [x] **5. Auth & roles**: register/login/logout, JWT cookie, admin guard (API + UI), rate limiting
- [x] **6. Core student platform**: selection flow, overview, practice (topic/subject/section, check answer), full mock (generated + fixed), USAT essays, results, review, history, profile
- [x] **7. Admin**: dashboard, question CRUD, CSV/XLSX import + batch publish, mock builder, essay topics + grading, papers + answer-sheet upload (needs storage keys), structure editor, students
- [ ] **8. Testing & optimisation**: 10 backend integration tests + 33-step end-to-end check pass. Pending: k6 load test on Vercel, Lighthouse on the deployed URL
- [ ] **9. Launch**: domain, Vercel Pro, Supabase Pro, monitoring, backups

## Verified

- Backend: `pytest` 10/10 (answer-key protection, stale-save protection, idempotent submit, expiry, isolation, essays + grading, curated mocks, import validation)
- Frontend: `tsc`, `eslint` and `next build` all clean
- End-to-end through the Next.js proxy against Supabase: 33/33 checks

## Known issues / backlog

- Email verification and password reset (needs an email provider)
- Storage keys not configured yet (paper / answer-sheet upload disabled until set)
- DB region is Tokyo; Mumbai would cut latency for Pakistani users (see PLAN.md §16)
- Bookmarks UI, PDF/DOCX question extraction, passage-based questions: post-MVP
