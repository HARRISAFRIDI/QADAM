"""Extract MCQs from PDF / DOCX / DOC / TXT question papers.

Extraction is best-effort: results are ALWAYS imported as drafts and must be
reviewed by an admin before publishing.

Supported layout (flexible):

    Subject: Physics            <- optional directives, change subject/topic
    Topic: Kinematics              for the questions that follow

    1. What is the SI unit of force?          (also "Q1.", "Q.1", "1)", "Question 1:")
    A) Joule   B) Newton   C) Watt   D) Pascal (options on one line, or one per line;
                                                markers A. A) (A) a) a- ...)
    Answer: B                                  (also "Ans: (b)", "Correct option: B")
    Explanation: Force = mass x acceleration.  (also "Solution:", "Reason:")

An answer key may instead appear at the end ("Answer Key: 1-B 2-C 3. A ...")
or in a separate answer-sheet file.
"""

import io
import re
import zipfile
from xml.etree import ElementTree

from core.errors import bad_request

DOC_EXTENSIONS = (".pdf", ".docx", ".doc", ".txt")

# ------------------------------------------------------------------ text extraction


def _docx_text(data: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            xml = z.read("word/document.xml")
    except (zipfile.BadZipFile, KeyError) as exc:
        raise bad_request("Could not read the Word (.docx) file.") from exc
    ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    root = ElementTree.fromstring(xml)
    lines = []
    for p in root.iter(f"{ns}p"):
        parts = []
        for node in p.iter():
            if node.tag == f"{ns}t" and node.text:
                parts.append(node.text)
            elif node.tag == f"{ns}tab":
                parts.append(" ")
            elif node.tag in (f"{ns}br", f"{ns}cr"):
                parts.append("\n")
        lines.append("".join(parts))
    return "\n".join(lines)


def _pdf_text(data: bytes) -> str:
    from pypdf import PdfReader  # lazy import: only admins importing pay this cost

    try:
        reader = PdfReader(io.BytesIO(data), strict=False)
        pages = [page.extract_text() or "" for page in reader.pages]
    except Exception as exc:  # noqa: BLE001
        raise bad_request("Could not read the PDF file.") from exc
    text = "\n".join(pages)
    if len(text.strip()) < 20:
        raise bad_request(
            "This PDF has no selectable text (it is probably a scanned image). "
            "Use a text PDF, DOCX or TXT file."
        )
    return text


def _doc_text(data: bytes) -> str:
    """Legacy Word 97-2003 (.doc): best-effort text recovery from the binary.

    Word stores text either as UTF-16LE or as 8-bit; we pick whichever yields
    more readable text. Prefer .docx for reliable results.
    """
    utf16 = re.findall(rb"(?:[\x20-\x7e\t\r\n]\x00){4,}", data)
    t16 = "\n".join(b.decode("utf-16le", "ignore") for b in utf16)
    ansi = re.findall(rb"[\x20-\x7e\t\r\n]{6,}", data)
    t8 = "\n".join(b.decode("cp1252", "ignore") for b in ansi)
    text = t16 if len(t16) >= len(t8) * 0.6 else t8
    text = text.replace("\r", "\n")
    if len(text.strip()) < 20:
        raise bad_request("Could not read the .doc file. Save it as .docx and try again.")
    return text


def _txt_text(data: bytes) -> str:
    for enc in ("utf-8-sig", "utf-16", "cp1252"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    raise bad_request("Could not read the text file. Save it as UTF-8.")


def extract_text(filename: str, data: bytes) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        return _pdf_text(data)
    if name.endswith(".docx"):
        return _docx_text(data)
    if name.endswith(".doc"):
        return _doc_text(data)
    if name.endswith(".txt"):
        return _txt_text(data)
    raise bad_request("Unsupported file type.")


# ------------------------------------------------------------------ MCQ parsing

_Q_START = re.compile(
    r"^(?:Q(?:uestion)?\.?\s*(?:No\.?\s*)?)?(\d{1,4})\s*[\.\):\-]\s*(.*)$", re.IGNORECASE
)
_Q_START_STRICT = re.compile(r"^Q(?:uestion)?\.?\s*(?:No\.?\s*)?(\d{1,4})\s*[\.\):\-]?\s*(.*)$", re.IGNORECASE)
_OPT = re.compile(r"^\(?([A-Da-d])\s*[\)\.\:\-]\s*(.+)$")
_OPT_INLINE = re.compile(r"(?:^|\s)\(?([A-Da-d])[\)\.]\s+")
_ANSWER = re.compile(
    r"^(?:Ans(?:wer)?|Correct(?:\s*(?:Answer|Option))?|Key|Right\s*Answer)\s*[:\-\.=]?\s*"
    r"(?:Option\s*)?\(?([A-Da-d])\)?(?:\b|$)(.*)$",
    re.IGNORECASE,
)
_EXPLAIN = re.compile(r"^(?:Explanation|Solution|Reason|Explain)\s*[:\-\.]\s*(.*)$", re.IGNORECASE)
_DIRECTIVE = re.compile(r"^(Subject|Topic|Exam|Test)\s*[:\-]\s*(.+)$", re.IGNORECASE)
_KEY_HEADER = re.compile(r"^(?:answer\s*key|answers?|key|answer\s*sheet)\s*[:\-]?\s*(.*)$", re.IGNORECASE)
_KEY_PAIR = re.compile(r"(\d{1,4})\s*[\.\)\-:=]?\s*\(?([A-Da-d])\)?(?![A-Za-z])")


def answer_key_from_text(text: str) -> dict[int, str]:
    """Parse "1-B 2-C 3.A ..." / "1 b" / table rows into {number: letter}."""
    key: dict[int, str] = {}
    for m in _KEY_PAIR.finditer(text):
        key[int(m.group(1))] = m.group(2).upper()
    return key


def _split_inline_options(line: str) -> list[tuple[str, str]] | None:
    """'A) 2  B) 3  C) 4  D) 5' -> [(A,'2'), (B,'3'), ...] when >= 2 markers in order."""
    marks = list(_OPT_INLINE.finditer(line))
    if len(marks) < 2:
        return None
    letters = [m.group(1).upper() for m in marks]
    if letters != sorted(letters) or letters[0] != "A":
        return None
    out = []
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(line)
        out.append((m.group(1).upper(), line[m.end() : end].strip()))
    return out


def parse_mcqs(text: str) -> tuple[list[dict], list[str]]:
    """Return (questions, warnings). Each question: number, stem, options, answer, explanation,
    subject, topic, exam (directives in effect)."""
    text = text.replace(" ", " ").replace("–", "-").replace("—", "-").replace("\t", " ")
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in text.split("\n")]

    questions: list[dict] = []
    cur: dict | None = None
    ctx = {"subject": None, "topic": None, "exam": None}
    key: dict[int, str] = {}
    in_key = False
    mode = "stem"  # stem | options | explanation

    def finish():
        nonlocal cur
        if cur and (cur["stem"] or cur["options"]):
            cur["stem"] = " ".join(cur["stem"]).strip()
            cur["explanation"] = " ".join(cur["explanation"]).strip() or None
            questions.append(cur)
        cur = None

    for line in lines:
        if not line:
            continue
        if in_key:
            key.update(answer_key_from_text(line))
            continue

        m = _KEY_HEADER.match(line)
        if m and (not cur or mode != "stem" or not cur["stem"]) and (
            not m.group(1) or _KEY_PAIR.search(m.group(1))
        ):
            finish()
            in_key = True
            key.update(answer_key_from_text(m.group(1)))
            continue

        m = _DIRECTIVE.match(line)
        if m and (cur is None or mode != "stem"):
            finish()
            name = m.group(1).lower()
            ctx["exam" if name in ("exam", "test") else name] = m.group(2).strip()
            if name == "subject":
                ctx["topic"] = None
            continue

        m = _ANSWER.match(line)
        if m and cur is not None and cur["options"]:
            cur["answer"] = m.group(1).upper()
            rest = m.group(2).strip(" .:-")
            ex = _EXPLAIN.match(rest) if rest else None
            if ex:
                cur["explanation"].append(ex.group(1))
            mode = "explanation"
            continue

        m = _EXPLAIN.match(line)
        if m and cur is not None:
            cur["explanation"].append(m.group(1))
            mode = "explanation"
            continue

        m = _Q_START_STRICT.match(line) or _Q_START.match(line)
        starts_new = bool(m) and (cur is None or len(cur["options"]) >= 2 or mode == "explanation")
        if m and starts_new:
            finish()
            cur = {
                "number": int(m.group(1)),
                "stem": [m.group(2)] if m.group(2) else [],
                "options": {},
                "answer": None,
                "explanation": [],
                **ctx,
            }
            mode = "stem"
            inline = _split_inline_options(m.group(2) or "")
            if inline:  # stem and options on the same line is rare; keep text before 'A)'
                first = _OPT_INLINE.search(m.group(2))
                cur["stem"] = [m.group(2)[: first.start()].strip()] if first else []
                cur["options"] = dict(inline)
                mode = "options"
            continue

        if cur is None:
            continue

        inline = _split_inline_options(line)
        if inline and mode in ("stem", "options"):
            cur["options"].update(dict(inline))
            mode = "options"
            continue

        m = _OPT.match(line)
        if m and mode in ("stem", "options"):
            letter = m.group(1).upper()
            expected = "ABCD"[len(cur["options"])] if len(cur["options"]) < 4 else None
            if letter == expected or letter in cur["options"]:
                cur["options"][letter] = m.group(2).strip()
                mode = "options"
                continue

        # continuation line
        if mode == "stem":
            cur["stem"].append(line)
        elif mode == "options" and cur["options"]:
            last = sorted(cur["options"])[-1]
            cur["options"][last] = f"{cur['options'][last]} {line}".strip()
        elif mode == "explanation":
            cur["explanation"].append(line)
    finish()

    warnings = []
    for q in questions:
        if q["answer"] is None and q["number"] in key:
            q["answer"] = key[q["number"]]
    if key and not any(q["answer"] for q in questions):
        warnings.append("An answer key was found but its numbers did not match the questions.")
    return questions, warnings


def to_import_rows(
    questions: list[dict], default_exam: str | None, default_subject: str | None, default_topic: str | None
) -> list[dict]:
    """Shape parsed questions like CSV rows so they share the same validation."""
    rows = []
    for q in questions:
        rows.append(
            {
                "_number": q["number"],
                "exam": q.get("exam") or default_exam or "",
                "subject": q.get("subject") or default_subject or "",
                "topic": q.get("topic") or default_topic or "",
                "stem": q["stem"],
                "option_a": q["options"].get("A", ""),
                "option_b": q["options"].get("B", ""),
                "option_c": q["options"].get("C", ""),
                "option_d": q["options"].get("D", ""),
                "correct": q["answer"] or "",
                "explanation": q["explanation"] or "",
                "source": None,
            }
        )
    return rows
