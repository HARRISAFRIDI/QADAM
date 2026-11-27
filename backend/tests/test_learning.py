"""Memorize (decks, spaced repetition, admin editor) and study plans."""

from services.memorize_service import schedule
from services.plan_service import build_tasks
from services.taxonomy import Taxonomy


def test_schedule_grows_and_resets():
    ease, interval, reps, lapsed = schedule(2.5, 0, 0, "good")
    assert (interval, reps, lapsed) == (1, 1, False)
    ease, interval, reps, _ = schedule(ease, interval, reps, "good")
    assert interval == 3
    ease, interval, reps, _ = schedule(ease, interval, reps, "good")
    assert interval == round(3 * 2.5)
    e2, i2, r2, lapsed = schedule(ease, interval, reps, "again")
    assert (i2, r2, lapsed) == (0, 0, True) and e2 < ease
    assert schedule(2.5, 0, 0, "easy")[1] == 3
    assert schedule(1.3, 10, 4, "hard")[0] == 1.3  # ease never drops below 1.3


async def test_memorize_flow(other_student, admin):
    # Starter decks are seeded; a USAT-E student sees vocab, quant, physics, chemistry...
    await other_student.patch("/me", json={"preferred_category": "USAT-E"})
    data = (await other_student.get("/memorize/decks")).json()
    titles = {d["title"] for d in data["decks"]}
    assert "Essential Vocabulary I" in titles and "Physics Formulas" in titles
    assert "Analytical Reasoning Rules" not in titles  # HAT-only subject
    assert "Computer Science Basics" not in titles  # USAT-CS only
    assert data["totals"]["new"] == data["totals"]["cards"] > 0

    q = (await other_student.get("/memorize/queue?limit=20")).json()
    assert q["new"] == 10 and q["due"] == 0  # new cards are capped per session
    card = q["cards"][0]
    assert card["status"] == "new" and card["preview"] == {"again": "10m", "hard": "1d", "good": "1d", "easy": "3d"}

    r = (await other_student.post(f"/memorize/cards/{card['id']}/review", json={"grade": "good"})).json()
    assert r["interval_days"] == 1 and r["status"] == "learning"
    again = q["cards"][1]
    await other_student.post(f"/memorize/cards/{again['id']}/review", json={"grade": "again"})
    after = (await other_student.get("/memorize/decks")).json()["totals"]
    assert after["new"] == data["totals"]["new"] - 2 and after["reviewed_today"] == 2

    deck = (await other_student.get(f"/memorize/decks/{card['deck_id']}")).json()
    assert {c["status"] for c in deck["cards"]} >= {"new", "learning"}

    # Hidden decks and cards are not reachable.
    hat_deck = next(d for d in (await admin.get("/admin/decks")).json() if d["title"] == "Analytical Reasoning Rules")
    assert (await other_student.get(f"/memorize/decks/{hat_deck['id']}")).status_code == 404

    ov = (await other_student.get("/me/overview")).json()
    assert ov["memorize"]["reviewed_today"] == 2 and ov["plan_today"] is None


async def test_admin_deck_editor(admin, student):
    assert (await student.get("/admin/decks")).status_code == 403
    bad = await admin.post("/admin/decks", json={"kind": "fact", "title": "X", "cards": "no pipe here"})
    assert bad.status_code == 422 or bad.json()["error"]["code"] == "bad_lines"
    r = await admin.post(
        "/admin/decks",
        json={"kind": "fact", "title": "Test facts", "exam": "HAT", "cards": "Q1 | A1\nQ2 | A2 | ex"},
    )
    assert r.status_code == 201, r.text
    deck = r.json()
    assert deck["card_count"] == 2 and deck["status"] == "draft" and deck["exam"] == "HAT"
    await admin.post(f"/admin/decks/{deck['id']}/cards", json={"lines": "Q3 | A3"})
    full = (await admin.get(f"/admin/decks/{deck['id']}")).json()
    assert [c["front"] for c in full["cards"]] == ["Q1", "Q2", "Q3"] and full["cards"][1]["example"] == "ex"
    cid = full["cards"][0]["id"]
    assert (await admin.patch(f"/admin/cards/{cid}", json={"back": "A1!"})).json()["back"] == "A1!"
    assert (await admin.patch(f"/admin/decks/{deck['id']}", json={"status": "published"})).json()["status"] == "published"
    for c in full["cards"]:
        await admin.delete(f"/admin/cards/{c['id']}")
    # Emptied deck falls back to draft.
    assert (await admin.get(f"/admin/decks/{deck['id']}")).json()["status"] == "draft"
    assert (await admin.delete(f"/admin/decks/{deck['id']}")).status_code == 200


def _tax() -> Taxonomy:
    t = Taxonomy()
    t.subjects = {1: {"name": "English"}, 2: {"name": "Maths"}, 3: {"name": "Physics"}}
    t.sections = {10: {"name": "Verbal"}, 20: {"name": "Quant"}, 30: {"name": "Subject"}}
    t.blueprints_by_category = {
        5: [
            {"section_id": 10, "subject_id": 1, "mcq_count": 30},
            {"section_id": 20, "subject_id": 2, "mcq_count": 30},
            {"section_id": 30, "subject_id": 3, "mcq_count": 15},
        ]
    }
    return t


def test_build_tasks_shape():
    cat = {"id": 5, "code": "USAT-E", "mcq_duration_min": 100, "essay_duration_min": 40}
    tasks = build_tasks(_tax(), cat, 30, 60, weak_ids={3}, has_cards=True)
    by_day: dict[int, list[dict]] = {}
    for t in tasks:
        by_day.setdefault(t["day"], []).append(t)
    assert sorted(by_day) == list(range(1, 31))
    assert {t["kind"] for t in by_day[7]} == {"mock", "memorize"}
    assert by_day[8][0]["kind"] == "mistakes"  # revise after the mock
    assert by_day[29][0]["kind"] == "mock" and by_day[30][0]["kind"] == "mistakes"
    assert any(t["kind"] == "essay" for t in tasks)  # USAT
    assert all(any(t["kind"] == "memorize" for t in d) for d in by_day.values())
    subj = [t["ref_id"] for t in tasks if t["kind"] == "practice_subject"]
    # Weak physics (15 MCQs x 1.5) still gets fewer days than English/Maths (30 each), but some.
    assert subj.count(3) >= 2 and subj.count(1) > subj.count(3)
    assert any(t["kind"] == "practice_section" for t in tasks if t["day"] > 20)  # exam mode
    # HAT (no essays), no flashcards, 14 days
    hat = {"id": 5, "code": "HAT-I", "mcq_duration_min": 120, "essay_duration_min": None}
    short = build_tasks(_tax(), hat, 14, 30, set(), has_cards=False)
    assert not any(t["kind"] in ("essay", "memorize") for t in short)
    assert {t["day"] for t in short if t["kind"] == "mock"} == {7, 13}


async def test_study_plan_flow(other_student, question_bank):
    await other_student.patch("/me", json={"preferred_category": "USAT-E"})
    assert (await other_student.get("/study-plans/current")).status_code == 404
    bad = await other_student.post("/study-plans", json={"kind": "custom", "exam_date": "2020-01-01"})
    assert bad.status_code == 400
    plan = (await other_student.post("/study-plans", json={"kind": "14", "daily_minutes": 60})).json()
    assert plan["days"] == 14 and plan["today"] == 1 and plan["matches_track"]
    assert plan["progress"]["done"] == 0 and plan["progress"]["total"] > 14

    day1 = plan["schedule"][0]["tasks"]
    practice = next(t for t in day1 if t["kind"] == "practice_subject")
    go = (await other_student.post(f"/study-plans/tasks/{practice['id']}/start")).json()
    assert go["href"].startswith("/attempt/")
    again = (await other_student.post(f"/study-plans/tasks/{practice['id']}/start")).json()
    assert again["attempt_id"] == go["attempt_id"]  # resumes, no duplicate
    await other_student.post(f"/attempts/{go['attempt_id']}/submit")

    mem = next(t for t in day1 if t["kind"] == "memorize")
    assert (await other_student.post(f"/study-plans/tasks/{mem['id']}/start")).json()["href"] == "/memorize/review"
    await other_student.put(f"/study-plans/tasks/{mem['id']}/done", json={"done": True})

    now = (await other_student.get("/study-plans/current")).json()
    done = {t["id"]: t["done"] for t in now["schedule"][0]["tasks"]}
    assert done[practice["id"]] and done[mem["id"]]
    assert now["progress"]["done"] == 2

    ov = (await other_student.get("/me/overview")).json()
    assert ov["plan_today"]["day"] == 1 and len(ov["plan_today"]["tasks"]) == len(day1)

    # A new plan replaces the old one.
    p2 = (await other_student.post("/study-plans", json={"kind": "custom", "days": 10, "daily_minutes": 30})).json()
    assert p2["id"] != plan["id"] and p2["days"] == 10 and p2["progress"]["done"] == 0
    await other_student.delete("/study-plans/current")
    assert (await other_student.get("/study-plans/current")).status_code == 404
