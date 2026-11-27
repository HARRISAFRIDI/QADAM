# API (v1)

Base: `/api/v1` (proxied same-origin by the frontend). Interactive docs at `/api/docs` outside production.

Errors always look like `{"error": {"code": "...", "message": "...", "details": ...}}`.

## Public

| Method | Path | Notes |
|---|---|---|
| GET | `/health`, `/health/db` | liveness, DB + migration id |
| GET | `/exams` | exams with categories and section counts (cached 60 s) |
| GET | `/categories/{code}/overview` | sections → subjects → topics with available counts, published mocks, essay info |

## Auth / profile

| Method | Path |
|---|---|
| POST | `/auth/register`, `/auth/login`, `/auth/logout` |
| GET / PATCH | `/me` |
| POST | `/me/password` |
| GET | `/me/history?page=&page_size=` |

## Student: attempts

| Method | Path | Notes |
|---|---|---|
| POST | `/practice` | `{category, mode: topic/subject/section, ref_id, count, timed}` |
| POST | `/attempts` | full mock `{category, mock_test_id?}`; resumes an active one |
| POST | `/essay-practice` | `{category}` (USAT) |
| GET | `/attempts/{id}` | full paper, **no answer key** |
| PUT | `/attempts/{id}/answers` | batch `{answers:[{position, selected, marked, seq}]}` |
| POST | `/attempts/{id}/check/{position}` | practice only: locks the answer, returns correct answer + explanation |
| POST | `/attempts/{id}/submit` | idempotent → `{next: results/essays}` |
| POST | `/attempts/{id}/essays/start` | idempotent, starts the 40-minute clock |
| PUT | `/attempts/{id}/essays/{argument/narrative}` | `{topic_id, content, seq}` |
| POST | `/attempts/{id}/essays/submit` | |
| GET | `/results/{id}`, `/results/{id}/review` | only after submission |

## Admin (`role = admin`)

`/admin/stats`, `/admin/system`, `/admin/taxonomy`, `PATCH /admin/categories/{id}`, `PATCH /admin/blueprints/{id}`, `POST /admin/subjects`, `POST|PATCH /admin/topics`, `GET|POST /admin/questions`, `GET|PATCH /admin/questions/{id}`, `POST /admin/questions/bulk-status`, `POST /admin/questions/import` (multipart), `GET|POST /admin/mock-tests`, `GET|PATCH|DELETE /admin/mock-tests/{id}`, `GET|POST /admin/essay-topics`, `PATCH /admin/essay-topics/{id}`, `GET /admin/essays`, `GET /admin/essays/{attempt_id}`, `POST /admin/essays/submissions/{id}/grade`, `GET /admin/students`, `PATCH /admin/students/{id}`, `POST /admin/files/upload-url`, `POST /admin/files/{id}/complete`, `GET /admin/files/{id}/download`, `GET|POST /admin/papers`, `PATCH /admin/papers/{id}`.
