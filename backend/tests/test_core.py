from datetime import UTC, datetime, timedelta

from sqlalchemy import text

from core.config import get_settings
from db.session import build_engine
from tests.conftest import make_csv


async def _sql(query: str, **params):
    engine = build_engine(get_settings().database_url, pool_size=0)
    async with engine.begin() as conn:
        result = await conn.execute(text(query), params)
        rows = result.all() if result.returns_rows else None
    await engine.dispose()
    return rows


# ------------------------------------------------------------ health & auth


async def test_health(student):
    r = await student.get("/health")
    assert r.json()["status"] == "ok"
    r = await student.get("/health/db")
    assert r.json()["database"] == "connected"


async def test_auth_flow(app, student):
    me = (await student.get("/me")).json()
    assert me["role"] == "student"
    import httpx

    anon = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test/api/v1")
    assert (await anon.get("/me")).status_code == 401
    bad = await anon.post("/auth/login", json={"email": "student@test.pk", "password": "nope-nope"})
    assert bad.status_code == 401 and bad.json()["error"]["code"] == "invalid_credentials"
    dup = await anon.post(
        "/auth/register",
        json={"full_name": "X Y", "email": "student@test.pk", "password": "whatever-123"},
    )
    assert dup.status_code == 409
    await anon.aclose()


async def test_student_cannot_use_admin_api(student):
    for path in ("/admin/stats", "/admin/questions", "/admin/taxonomy"):
        assert (await student.get(path)).status_code == 403


async def test_catalog(student):
    exams = (await student.get("/exams")).json()
    codes = {c["code"]: c for e in exams for c in e["categories"]}
    assert len(codes) == 11
    assert codes["HAT-I"]["total_mcqs"] == 100
    assert codes["USAT-M"]["total_mcqs"] == 75
    ov = (await student.get("/categories/USAT-CS/overview")).json()
    subjects = [s["slug"] for sec in ov["sections"] for s in sec["subjects"]]
    assert subjects == ["english-verbal", "quantitative", "physics", "computer-science", "mathematics"]
    assert ov["essays"]["duration_min"] == 40


# ------------------------------------------------------------ import


async def test_import_validation(admin):
    bad = make_csv([("USAT", "Astrology", "", "A"), ("USAT", "Physics", "", "Z")])
    r = await admin.post(
        "/admin/questions/import", files={"file": ("x.csv", bad, "text/csv")}, data={"dry_run": "true"}
    )
    body = r.json()
    assert body["invalid"] == 2 and body["valid"] == 0
    assert "unknown subject" in body["errors"][0]["message"]


# ------------------------------------------------------------ full mock engine


async def test_full_mock_flow(student, admin, question_bank):
    r = await student.post("/attempts", json={"category": "USAT-E"})
    assert r.status_code == 201
    attempt_id = r.json()["id"]

    again = await student.post("/attempts", json={"category": "USAT-E"})
    assert again.json() == {"id": attempt_id, "resumed": True}

    paper = (await student.get(f"/attempts/{attempt_id}")).json()
    qs = paper["questions"]
    assert len(qs) == 75
    assert all(q["correct"] is None and q["explanation"] is None for q in qs), "answer key leaked"
    assert [s["name"] for s in paper["sections"]][0].startswith("Verbal")
    deadline = datetime.fromisoformat(paper["deadline_at"])
    started = datetime.fromisoformat(paper["started_at"])
    assert deadline - started == timedelta(minutes=100)

    # Mock answers cannot be checked early.
    chk = await student.post(f"/attempts/{attempt_id}/check/1", json={"selected": "A", "seq": 1})
    assert chk.status_code == 403

    key = dict(
        await _sql(
            "SELECT aq.position, q.correct_option FROM attempt_questions aq "
            "JOIN questions q ON q.id = aq.question_id WHERE aq.attempt_id = :a",
            a=attempt_id,
        )
    )
    # Answer first 40 correctly, next 10 wrongly, leave 25 blank.
    answers = []
    for pos in range(1, 51):
        right = key[pos]
        sel = right if pos <= 40 else ("B" if right == "A" else "A")
        answers.append({"position": pos, "selected": sel, "marked": pos == 3, "seq": 10})
    r = await student.put(f"/attempts/{attempt_id}/answers", json={"answers": answers})
    assert r.json()["saved"] == 50

    # Stale write (older seq) must not overwrite.
    stale = [{"position": 1, "selected": None, "marked": False, "seq": 5}]
    r = await student.put(f"/attempts/{attempt_id}/answers", json={"answers": stale})
    assert r.json()["saved"] == 0

    # Another student cannot write to this attempt.
    # (ownership is enforced inside the UPDATE)

    s1 = await student.post(f"/attempts/{attempt_id}/submit")
    s2 = await student.post(f"/attempts/{attempt_id}/submit")
    assert s1.json()["next"] == "essays" and s2.status_code == 200  # idempotent
    count = await _sql("SELECT count(*) FROM results WHERE attempt_id = :a", a=attempt_id)
    assert count[0][0] == 1

    res = (await student.get(f"/results/{attempt_id}")).json()
    assert (res["correct"], res["incorrect"], res["unanswered"]) == (40, 10, 25)
    assert res["score"] == 40 and res["total_marks"] == 75
    assert res["accuracy"] == 80.0
    assert sum(s["total"] for s in res["sections"]) == 75

    review = (await student.get(f"/results/{attempt_id}/review")).json()
    assert review["items"][0]["correct"] in "ABCD"
    assert review["items"][2]["marked"] is True

    # Writes after submission are rejected.
    late = [{"position": 60, "selected": "A", "marked": False, "seq": 99}]
    r = await student.put(f"/attempts/{attempt_id}/answers", json={"answers": late})
    assert r.status_code == 409

    # ---- essays ----
    st = (await student.post(f"/attempts/{attempt_id}/essays/start")).json()
    assert st["status"] == "in_progress" and len(st["options"]["argument"]) == 3
    arg_topic = st["options"]["argument"][0]["id"]
    nar_topic = st["options"]["narrative"][1]["id"]
    r = await student.put(
        f"/attempts/{attempt_id}/essays/argument",
        json={"topic_id": arg_topic, "content": "one two three four", "seq": 1},
    )
    assert r.status_code == 200
    await student.put(
        f"/attempts/{attempt_id}/essays/narrative",
        json={"topic_id": nar_topic, "content": "a short story", "seq": 1},
    )
    bad = await student.put(
        f"/attempts/{attempt_id}/essays/narrative",
        json={"topic_id": 999999, "content": "x", "seq": 2},
    )
    assert bad.status_code == 400
    assert (await student.post(f"/attempts/{attempt_id}/essays/submit")).json()["status"] == "submitted"

    queue = (await admin.get("/admin/essays")).json()
    assert any(i["attempt_id"] == attempt_id for i in queue["items"])
    detail = (await admin.get(f"/admin/essays/{attempt_id}")).json()
    for e in detail["essays"]:
        g = await admin.post(
            f"/admin/essays/submissions/{e['id']}/grade",
            json={"score": e["max_score"] - 2, "feedback": "Good"},
        )
        assert g.status_code == 200
    res = (await student.get(f"/results/{attempt_id}")).json()
    assert res["essay_status"] == "graded" and res["essay_score"] == 21
    assert res["essays"][0]["word_count"] == 4


async def test_hat_mock_and_expiry(other_student, question_bank):
    r = await other_student.post("/attempts", json={"category": "HAT-I"})
    attempt_id = r.json()["id"]
    paper = (await other_student.get(f"/attempts/{attempt_id}")).json()
    assert len(paper["questions"]) == 100
    assert datetime.fromisoformat(paper["deadline_at"]) - datetime.fromisoformat(
        paper["started_at"]
    ) == timedelta(minutes=120)

    past = datetime.now(UTC) - timedelta(minutes=1)
    await _sql("UPDATE attempts SET deadline_at = :d WHERE id = :a", d=past, a=attempt_id)
    late = [{"position": 1, "selected": "A", "marked": False, "seq": 1}]
    r = await other_student.put(f"/attempts/{attempt_id}/answers", json={"answers": late})
    assert r.status_code == 409 and r.json()["error"]["code"] == "attempt_expired"

    # Loading an expired attempt finalises it automatically.
    paper = (await other_student.get(f"/attempts/{attempt_id}")).json()
    assert paper["status"] == "submitted"
    res = (await other_student.get(f"/results/{attempt_id}")).json()
    assert res["unanswered"] == 100 and res["essay_status"] == "none"


async def test_attempt_isolation(student, other_student, question_bank):
    r = await student.post(
        "/practice", json={"category": "USAT-E", "mode": "subject", "ref_id": 4, "count": 5}
    )
    attempt_id = r.json()["id"]
    assert (await other_student.get(f"/attempts/{attempt_id}")).status_code == 404
    hijack = [{"position": 1, "selected": "A", "marked": False, "seq": 1}]
    r = await other_student.put(f"/attempts/{attempt_id}/answers", json={"answers": hijack})
    assert r.status_code == 404
    assert (await other_student.get(f"/results/{attempt_id}")).status_code == 404


async def test_practice_check(student, question_bank):
    ov = (await student.get("/categories/USAT-E/overview")).json()
    quant = next(s for s in ov["sections"] if s["code"] == "quantitative")
    algebra = next(t for t in quant["subjects"][0]["topics"] if t["name"] == "Algebra")
    assert algebra["available"] >= 30
    r = await student.post(
        "/practice",
        json={"category": "USAT-E", "mode": "topic", "ref_id": algebra["id"], "count": 10},
    )
    attempt_id = r.json()["id"]
    paper = (await student.get(f"/attempts/{attempt_id}")).json()
    assert len(paper["questions"]) == 10 and paper["deadline_at"] is None

    chk = (
        await student.post(f"/attempts/{attempt_id}/check/1", json={"selected": "C", "seq": 1})
    ).json()
    assert chk["correct"] in "ABCD" and chk["is_correct"] == (chk["correct"] == "C")
    again = (await student.get(f"/attempts/{attempt_id}")).json()["questions"][0]
    assert again["checked"] and again["correct"] == chk["correct"]
    assert (await student.get(f"/attempts/{attempt_id}")).json()["questions"][1]["correct"] is None

    hist = (await student.get("/me/history")).json()
    assert hist["total"] >= 2


async def test_curated_mock(admin, student, question_bank):
    r = await admin.post("/admin/mock-tests", json={"category": "HAT-I", "title": "Mock 1"})
    mid = r.json()["id"]
    assert r.json()["question_count"] == 100
    ov = (await student.get("/categories/HAT-I/overview")).json()
    assert ov["mocks"] == []  # draft is hidden
    await admin.patch(f"/admin/mock-tests/{mid}", json={"status": "published"})
    ov = (await student.get("/categories/HAT-I/overview")).json()
    assert ov["mocks"][0]["id"] == mid
    r = await student.post("/attempts", json={"category": "HAT-I", "mock_test_id": mid})
    assert r.status_code == 201
