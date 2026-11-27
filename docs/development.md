# Development

## Rules that prevent past problems

- **Never** create `requirements.txt` with `pip freeze > requirements.txt` in Windows PowerShell 5.1. It writes UTF-16. Edit it by hand, keep versions pinned with `==`, and run `python scripts/check_requirements.py`.
- `.gitattributes` forces LF line endings and `.editorconfig` forces UTF-8.
- Use lower-case, kebab-case file names (Vercel builds on case-sensitive Linux).
- Schema changes go through Alembic only: edit models, run `alembic revision --autogenerate`, review, then `alembic upgrade head`.
- Tests drop the schema of `TEST_DATABASE_URL`. Use a throwaway database.

## Local test database (Windows, PostgreSQL installed)

```bash
initdb -D %TEMP%\qadam-pg -U postgres -A trust -E UTF8
pg_ctl -D %TEMP%\qadam-pg -o "-p 55432" start
psql -h 127.0.0.1 -p 55432 -U postgres -c "create database qadam_test"
cd backend && pytest -q        # defaults to postgresql://postgres@127.0.0.1:55432/qadam_test
```

## Performance rules

- Server Components by default; `"use client"` only for interactive islands.
- Independent server fetches run in `Promise.all`.
- Never add a request to exam navigation. The paper loads once.
- No new client dependencies without a reason (current runtime deps: `next`, `react`, `react-dom`, `lucide-react`, `clsx`, `tailwind-merge`).
- Keep API payloads minimal and never select `correct_option` in student queries before submission.

## Git

- `main` deploys to production; work on branches and use Vercel preview deployments.
- Never commit `.env`, `.env.local`, or credentials.
