"""Onboarding track, quizzes, difficulty filter, Mistake Notebook and dashboard overview."""


async def _subject(client, category: str, code: str) -> dict:
    ov = (await client.get(f"/categories/{category}/overview")).json()
    sec = next(s for s in ov["sections"] if s["code"] == code)
    return sec["subjects"][0]


async def test_overview_needs_track(other_student):
    r = await other_student.get("/me/overview")
    assert r.status_code == 409 and r.json()["error"]["code"] == "no_track"
    me = (
        await other_student.patch("/me", json={"preferred_category": "USAT-E", "daily_goal": 30})
    ).json()
    assert me["preferred_category"] == "USAT-E" and me["target_exam"] == "USAT"
    assert me["daily_goal"] == 30
    assert (await other_student.patch("/me", json={"daily_goal": 1})).status_code == 422

    ov = (await other_student.get("/me/overview")).json()
    assert ov["category"]["code"] == "USAT-E"
    assert ov["progress"]["seen"] == 0 and ov["streak"]["current"] == 0
    assert ov["recommendations"][0]["kind"] == "start"
    assert len(ov["streak"]["last14"]) == 14
    assert {g["key"] for g in ov["goals"]} == {"daily", "weekly", "mock"}
    assert not any(a["earned"] for a in ov["achievements"])


async def test_quiz_and_difficulty(other_student, question_bank):
    await other_student.patch("/me", json={"preferred_category": "USAT-E"})
    r = await other_student.post(
        "/practice", json={"category": "USAT-E", "mode": "quiz", "count": 10}
    )
    assert r.status_code == 201, r.text
    quiz_id = r.json()["id"]
    paper = (await other_student.get(f"/attempts/{quiz_id}")).json()
    assert paper["mode"] == "quiz" and len(paper["questions"]) == 10
    # Quizzes give instant feedback, like practice.
    chk = await other_student.post(f"/attempts/{quiz_id}/check/1", json={"selected": "A", "seq": 1})
    assert chk.status_code == 200 and chk.json()["correct"] in "ABCD"
    assert len({q["subject_id"] for q in paper["questions"]}) >= 1

    # Imported questions default to "medium": no "hard" ones exist.
    r = await other_student.post(
        "/practice", json={"category": "USAT-E", "mode": "quiz", "difficulty": "hard"}
    )
    assert r.status_code == 400 and r.json()["error"]["code"] == "no_questions"
    r = await other_student.post(
        "/practice", json={"category": "USAT-E", "mode": "quiz", "difficulty": "medium", "count": 5}
    )
    assert r.status_code == 201
    # subject / section still need ref_id
    r = await other_student.post("/practice", json={"category": "USAT-E", "mode": "subject"})
    assert r.status_code == 400


async def test_mistake_notebook_and_overview(other_student, question_bank):
    await other_student.patch("/me", json={"preferred_category": "USAT-E"})
    assert (await other_student.get("/me/mistakes")).json()["counts"]["all"] == 0
    r = await other_student.post(
        "/practice", json={"category": "USAT-E", "mode": "mistakes", "count": 5}
    )
    assert r.status_code == 400 and r.json()["error"]["code"] == "no_mistakes"

    maths = await _subject(other_student, "USAT-E", "quantitative")
    aid = (
        await other_student.post(
            "/practice",
            json={"category": "USAT-E", "mode": "subject", "ref_id": maths["id"], "count": 5},
        )
    ).json()["id"]
    # Q1 checked (right or wrong), Q2 answered + flagged, Q3-5 skipped.
    chk = (
        await other_student.post(f"/attempts/{aid}/check/1", json={"selected": "A", "seq": 1})
    ).json()
    await other_student.put(
        f"/attempts/{aid}/answers",
        json={"answers": [{"position": 2, "selected": "B", "marked": True, "seq": 2}]},
    )
    await other_student.post(f"/attempts/{aid}/submit")

    nb = (await other_student.get("/me/mistakes")).json()
    expected = 3 + 1 + (0 if chk["is_correct"] else 1)  # skipped + flagged + maybe wrong
    assert nb["counts"]["all"] == expected
    assert nb["counts"]["skipped"] == 3 and nb["counts"]["flagged"] == 1
    assert nb["items"][0]["correct"] in "ABCD"
    assert (await other_student.get("/me/mistakes?kind=skipped")).json()["total"] == 3
    assert (await other_student.get("/me/mistakes?kind=flagged")).json()["total"] == 1

    # Revising mistakes: answer every one correctly -> notebook empties.
    rid = (
        await other_student.post(
            "/practice", json={"category": "USAT-E", "mode": "mistakes", "count": 20}
        )
    ).json()["id"]
    paper = (await other_student.get(f"/attempts/{rid}")).json()
    assert paper["mode"] == "mistakes" and len(paper["questions"]) == expected
    key = {
        it["stem"]: it["correct"]
        for it in (await other_student.get("/me/mistakes?page_size=50")).json()["items"]
    }
    answers = [
        {"position": q["position"], "selected": key[q["stem"]], "marked": False, "seq": 5}
        for q in paper["questions"]
    ]
    await other_student.put(f"/attempts/{rid}/answers", json={"answers": answers})
    await other_student.post(f"/attempts/{rid}/submit")
    assert (await other_student.get("/me/mistakes")).json()["counts"]["all"] == 0

    ov = (await other_student.get("/me/overview")).json()
    assert ov["progress"]["answered"] >= 2 and ov["progress"]["seen"] >= 2
    assert ov["streak"]["current"] == 1 and ov["streak"]["active_today"]
    assert ov["completed"]["attempts"] >= 2
    assert ov["streak"]["last14"][-1]["count"] >= 2
    assert ov["achievements"][0]["earned"]  # first step
    assert ov["scores"]["recent"]
