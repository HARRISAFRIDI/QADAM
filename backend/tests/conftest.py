"""Integration tests against a real Postgres (TEST_DATABASE_URL).

Schema is created with Alembic + seed, exactly like production.
"""

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
TEST_DB = os.environ.get("TEST_DATABASE_URL", "postgresql://postgres@127.0.0.1:55432/qadam_test")
os.environ.update(
    ENVIRONMENT="test",
    DATABASE_URL=TEST_DB,
    DATABASE_URL_MIGRATIONS=TEST_DB,
    SECRET_KEY="test-secret-key-0123456789-0123456789-abcdef",
    ATTEMPT_GRACE_SECONDS="0",
)

import httpx  # noqa: E402
from sqlalchemy import text  # noqa: E402

from db.session import build_engine  # noqa: E402


def _run(*args: str) -> None:
    subprocess.run([sys.executable, *args], cwd=ROOT, check=True, env=os.environ.copy())


@pytest.fixture(scope="session", autouse=True)
async def database():
    engine = build_engine(TEST_DB, pool_size=0)
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
    await engine.dispose()
    _run("-m", "alembic", "upgrade", "head")
    _run("-m", "scripts.seed")
    _run("-m", "scripts.create_admin", "--email", "admin@test.pk", "--password", "admin-pass-123")
    yield


@pytest.fixture(scope="session")
async def app():
    from main import app as fastapi_app

    yield fastapi_app
    from db.session import dispose_engine

    await dispose_engine()


async def _client(app, email: str, password: str, register: bool) -> httpx.AsyncClient:
    c = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test/api/v1")
    if register:
        r = await c.post(
            "/auth/register",
            json={"full_name": "Test Student", "email": email, "password": password},
        )
        assert r.status_code == 201, r.text
    else:
        r = await c.post("/auth/login", json={"email": email, "password": password})
        assert r.status_code == 200, r.text
    return c


@pytest.fixture(scope="session")
async def admin(app):
    c = await _client(app, "admin@test.pk", "admin-pass-123", register=False)
    yield c
    await c.aclose()


@pytest.fixture(scope="session")
async def student(app):
    c = await _client(app, "student@test.pk", "student-pass-123", register=True)
    yield c
    await c.aclose()


@pytest.fixture
async def other_student(app):
    import uuid

    c = await _client(app, f"s-{uuid.uuid4().hex[:8]}@test.pk", "student-pass-123", register=True)
    yield c
    await c.aclose()


def make_csv(rows: list[tuple[str, str, str, str]]) -> bytes:
    """rows: (exam, subject, topic, correct)"""
    lines = ["exam,subject,topic,question,option_a,option_b,option_c,option_d,correct,explanation"]
    for i, (exam, subject, topic, correct) in enumerate(rows):
        lines.append(
            f'{exam},{subject},{topic},"Q{i} about {subject}?",A{i},B{i},C{i},D{i},{correct},"Because {correct}"'
        )
    return ("\n".join(lines) + "\n").encode()


@pytest.fixture(scope="session")
async def question_bank(admin):
    """Publish enough questions for full USAT-E and HAT-I mocks."""
    plan = {
        ("USAT", "English"): 25,
        ("USAT", "Quantitative"): 30,
        ("USAT", "Physics"): 12,
        ("USAT", "Chemistry"): 12,
        ("USAT", "Mathematics"): 12,
        ("HAT", "Verbal"): 30,
        ("HAT", "Analytical"): 30,
        ("HAT", "Quantitative"): 40,
    }
    rows = []
    for (exam, subject), n in plan.items():
        for i in range(n):
            rows.append((exam, subject, "Algebra" if subject == "Quantitative" else "", "ABCD"[i % 4]))
    files = {"file": ("bank.csv", make_csv(rows), "text/csv")}
    r = await admin.post("/admin/questions/import", files=files, data={"dry_run": "false"})
    assert r.status_code == 200, r.text
    batch = r.json()["batch"]
    r = await admin.post("/admin/questions/bulk-status", json={"batch": batch, "status": "published"})
    assert r.json()["updated"] == len(rows)
    return batch
