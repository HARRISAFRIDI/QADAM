"""Bulk MCQ import from CSV / XLSX. Rows are validated, then bulk-inserted as drafts."""

import csv
import io
import re
import secrets
from datetime import UTC, datetime

from sqlalchemy import insert
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import bad_request
from models import Question, Topic, User
from services import document_parser
from services import taxonomy as taxonomy_cache
from services.audit import audit
from services.taxonomy import Taxonomy, get_taxonomy
from utils.text import slugify

MAX_ROWS = 5000

HEADER_ALIASES = {
    "exam": "exam",
    "test": "exam",
    "subject": "subject",
    "topic": "topic",
    "question": "stem",
    "stem": "stem",
    "questiontext": "stem",
    "optiona": "option_a",
    "a": "option_a",
    "optionb": "option_b",
    "b": "option_b",
    "optionc": "option_c",
    "c": "option_c",
    "optiond": "option_d",
    "d": "option_d",
    "correct": "correct",
    "correctoption": "correct",
    "answer": "correct",
    "correctanswer": "correct",
    "explanation": "explanation",
    "solution": "solution",
    "difficulty": "difficulty",
    "marks": "marks",
    "source": "source",
    "imageurl": "image_url",
    "image": "image_url",
}

SUBJECT_ALIASES = {
    "english": "english-verbal",
    "verbal": "english-verbal",
    "englishverbal": "english-verbal",
    "verbalreasoning": "english-verbal",
    "verbalreasoningenglish": "english-verbal",
    "analytical": "analytical",
    "analyticalreasoning": "analytical",
    "quantitative": "quantitative",
    "quant": "quantitative",
    "quantitativereasoning": "quantitative",
    "quantitativereasoningmathematics": "quantitative",
    "math": "mathematics",
    "maths": "mathematics",
    "cs": "computer-science",
    "computer": "computer-science",
    "islamiat": "islamiat-ethics",
    "ethics": "islamiat-ethics",
    "islamiatethics": "islamiat-ethics",
    "pakstudies": "pakistan-studies",
    "pakistanstudies": "pakistan-studies",
    "gk": "general-knowledge",
    "stats": "statistics",
}


def _key(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def _rows_from_csv(data: bytes) -> list[dict]:
    text = None
    for enc in ("utf-8-sig", "cp1252"):  # Excel often writes BOM / Windows-1252
        try:
            text = data.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise bad_request("Could not read the file. Save it as CSV (UTF-8).")
    reader = csv.reader(io.StringIO(text))
    return _rows_from_matrix(list(reader))


def _rows_from_xlsx(data: bytes) -> list[dict]:
    from openpyxl import load_workbook  # lazy: only admins importing pay this cost

    try:
        wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    except Exception as exc:  # noqa: BLE001
        raise bad_request("Could not read the Excel file.") from exc
    ws = wb.worksheets[0]
    matrix = [
        ["" if c is None else str(c) for c in row] for row in ws.iter_rows(values_only=True)
    ]
    wb.close()
    return _rows_from_matrix(matrix)


def _rows_from_matrix(matrix: list[list[str]]) -> list[dict]:
    if not matrix:
        raise bad_request("The file is empty.")
    headers = [HEADER_ALIASES.get(_key(h), "") for h in matrix[0]]
    missing = {"subject", "stem", "option_a", "option_b", "option_c", "option_d", "correct"} - set(
        headers
    )
    if missing:
        raise bad_request(
            "Missing required columns: " + ", ".join(sorted(missing)),
            "invalid_template",
        )
    rows = []
    for line in matrix[1:]:
        if not any((c or "").strip() for c in line):
            continue
        rows.append(
            {h: (line[i] if i < len(line) else "").strip() for i, h in enumerate(headers) if h}
        )
    if len(rows) > MAX_ROWS:
        raise bad_request(f"Too many rows ({len(rows)}). The limit is {MAX_ROWS} per file.")
    return rows


def _parse_correct(v: str) -> str | None:
    v = v.strip().upper().replace("OPTION", "").strip(" .)(")
    return {"1": "A", "2": "B", "3": "C", "4": "D"}.get(v, v) if v else None


def _resolve_subject(t: Taxonomy, raw: str) -> int | None:
    k = _key(raw)
    slug = SUBJECT_ALIASES.get(k)
    for s in t.subjects.values():
        if s["slug"] == slug or _key(s["slug"]) == k or _key(s["name"]) == k:
            return s["id"]
    return None


async def run_import(
    db: AsyncSession,
    admin: User,
    *,
    filename: str,
    data: bytes,
    default_exam: str | None,
    dry_run: bool,
    create_topics: bool,
    skip_invalid: bool,
    default_subject: str | None = None,
    default_topic: str | None = None,
    answer_filename: str | None = None,
    answer_data: bytes | None = None,
) -> dict:
    name = filename.lower()
    warnings: list[str] = []
    is_document = name.endswith(document_parser.DOC_EXTENSIONS)
    if name.endswith(".csv"):
        rows = _rows_from_csv(data)
    elif name.endswith(".xlsx"):
        rows = _rows_from_xlsx(data)
    elif is_document:
        questions, warnings = document_parser.parse_mcqs(document_parser.extract_text(filename, data))
        if answer_data and answer_filename:
            key = document_parser.answer_key_from_text(
                document_parser.extract_text(answer_filename, answer_data)
            )
            filled = 0
            for q in questions:
                if q["number"] in key and not q["answer"]:
                    q["answer"] = key[q["number"]]
                    filled += 1
            warnings.append(f"Answer sheet: {len(key)} answers read, {filled} applied.")
        if not questions:
            raise bad_request(
                "No questions were found. Number each question (1. 2. ...) and label options A) B) C) D).",
                "no_questions_found",
            )
        rows = document_parser.to_import_rows(questions, default_exam, default_subject, default_topic)
        if len(rows) > MAX_ROWS:
            raise bad_request(f"Too many questions ({len(rows)}). The limit is {MAX_ROWS} per file.")
    else:
        raise bad_request("Upload a .csv, .xlsx, .pdf, .docx, .doc or .txt file.")

    t = await get_taxonomy(db)
    topic_index = {(tp["subject_id"], _key(tp["name"])): tp["id"] for tp in t.topics.values()}
    new_topics: dict[tuple[int, str], str] = {}
    errors: list[dict] = []
    valid: list[dict] = []

    for n, r in enumerate(rows, start=2):  # row 1 is the header
        if is_document:
            n = r.get("_number", n)
        problems = []
        exam_code = (r.get("exam") or default_exam or "").upper()
        exam = t.exam_by_code.get(exam_code)
        if exam is None:
            problems.append("exam must be HAT or USAT")
        subject_id = _resolve_subject(t, r.get("subject", ""))
        if subject_id is None:
            problems.append(f"unknown subject '{r.get('subject', '')}'")
        for f in ("stem", "option_a", "option_b", "option_c", "option_d"):
            if not r.get(f):
                problems.append(f"{f.replace('_', ' ')} is empty")
        correct = _parse_correct(r.get("correct", ""))
        if correct not in ("A", "B", "C", "D"):
            problems.append(
                "no correct answer found (add 'Answer: B' or an answer key)"
                if is_document
                else "correct must be A, B, C or D"
            )
        difficulty = (r.get("difficulty") or "medium").lower()
        if difficulty not in ("easy", "medium", "hard"):
            problems.append("difficulty must be easy, medium or hard")
        try:
            marks = int(float(r.get("marks") or 1))
            if not 1 <= marks <= 10:
                raise ValueError
        except ValueError:
            problems.append("marks must be a number from 1 to 10")
            marks = 1

        topic_id = None
        topic_name = r.get("topic", "")
        if topic_name and subject_id is not None:
            topic_id = topic_index.get((subject_id, _key(topic_name)))
            if topic_id is None:
                if create_topics:
                    new_topics[(subject_id, _key(topic_name))] = topic_name
                else:
                    problems.append(f"unknown topic '{topic_name}'")

        if problems:
            label = f"Q{n}" if is_document else n
            errors.append({"row": label, "message": "; ".join(problems)})
            continue
        valid.append(
            {
                "exam_id": exam["id"],  # type: ignore[index]
                "subject_id": subject_id,
                "topic_id": topic_id,
                "_topic_key": (subject_id, _key(topic_name)) if topic_name else None,
                "stem": r["stem"],
                "option_a": r["option_a"],
                "option_b": r["option_b"],
                "option_c": r["option_c"],
                "option_d": r["option_d"],
                "correct_option": correct,
                "explanation": r.get("explanation") or None,
                "solution": r.get("solution") or None,
                "difficulty": difficulty,
                "marks": marks,
                "source": r.get("source") or None,
                "image_url": r.get("image_url") or None,
            }
        )

    summary = {
        "total_rows": len(rows),
        "valid": len(valid),
        "invalid": len(errors),
        "errors": errors[:200],
        "new_topics": sorted({v for v in new_topics.values()}),
        "warnings": warnings,
        "kind": "document" if is_document else "sheet",
        "preview": [
            {
                "stem": v["stem"][:300],
                "options": {k: v[f"option_{k.lower()}"][:160] for k in "ABCD"},
                "correct": v["correct_option"],
                "explanation": (v["explanation"] or "")[:200] or None,
            }
            for v in valid[:5]
        ],
        "batch": None,
        "inserted": 0,
    }
    if dry_run or not valid:
        return summary
    if errors and not skip_invalid:
        raise bad_request(
            f"{len(errors)} row(s) have errors. Fix them or choose 'skip invalid rows'.",
            "import_has_errors",
            summary,
        )

    # Create missing topics in one bulk insert, then map ids.
    if new_topics:
        stmt = pg_insert(Topic).values(
            [
                {"subject_id": sid, "name": name, "slug": slugify(name)}
                for (sid, _), name in new_topics.items()
            ]
        )
        stmt = stmt.on_conflict_do_update(
            constraint="uq_topics_subject_slug",
            set_={"is_active": True, "name": stmt.excluded.name},
        ).returning(Topic.id, Topic.subject_id, Topic.name)
        created = await db.execute(stmt)
        for tid, sid, tname in created:
            topic_index[(sid, _key(tname))] = tid

    batch = f"imp-{datetime.now(UTC):%Y%m%d%H%M%S}-{secrets.token_hex(2)}"
    payload = []
    for v in valid:
        tk = v.pop("_topic_key")
        if v["topic_id"] is None and tk is not None:
            v["topic_id"] = topic_index.get(tk)
        payload.append({**v, "status": "draft", "import_batch": batch, "created_by": admin.id})
    await db.execute(insert(Question), payload)
    audit(db, admin, "question.import", "question", batch, {"inserted": len(payload)})
    await db.commit()
    if new_topics:
        taxonomy_cache.invalidate()
    summary.update(batch=batch, inserted=len(payload))
    return summary
