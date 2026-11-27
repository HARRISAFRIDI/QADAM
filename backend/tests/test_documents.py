import io
import zipfile

from services.document_parser import answer_key_from_text, extract_text, parse_mcqs

SAMPLE = """
Subject: Physics
Topic: Kinematics

1. What is the SI unit of force?
A) Joule
B) Newton
C) Watt
D) Pascal
Answer: B
Explanation: Force = mass x acceleration, measured in newtons.

Q2. A car accelerates from rest at 2 m/s2 for 5 s. Its final speed is
(a) 5 m/s (b) 7 m/s (c) 10 m/s (d) 12 m/s
Ans: (c)

Question 3: Which quantity is a vector?
a. Mass
b. Time
c. Displacement
d. Temperature
Correct option: c

Topic: Optics
4) Light travels fastest in
A. Glass B. Water C. Vacuum D. Diamond
Answer: C
"""


def test_parse_common_layouts():
    qs, warnings = parse_mcqs(SAMPLE)
    assert [q["number"] for q in qs] == [1, 2, 3, 4]
    assert qs[0]["stem"] == "What is the SI unit of force?"
    assert qs[0]["options"] == {"A": "Joule", "B": "Newton", "C": "Watt", "D": "Pascal"}
    assert qs[0]["answer"] == "B" and "newtons" in qs[0]["explanation"]
    assert qs[1]["options"]["C"] == "10 m/s" and qs[1]["answer"] == "C"
    assert qs[2]["answer"] == "C" and qs[2]["options"]["C"] == "Displacement"
    assert qs[0]["subject"] == "Physics" and qs[0]["topic"] == "Kinematics"
    assert qs[3]["topic"] == "Optics" and qs[3]["options"]["C"] == "Vacuum"
    assert not warnings


def test_answer_key_at_end_and_multiline_stem():
    text = """
1. Choose the synonym of
ABUNDANT
A) Scarce
B) Plentiful
C) Rare
D) Meagre
2. 20% of 150 is
A) 20  B) 25  C) 30  D) 35

Answer Key
1-B   2-C
"""
    qs, _ = parse_mcqs(text)
    assert len(qs) == 2
    assert qs[0]["stem"] == "Choose the synonym of ABUNDANT"
    assert [q["answer"] for q in qs] == ["B", "C"]


def test_separate_answer_sheet_key():
    assert answer_key_from_text("1. B\n2) c\n3 - D\nQ4: a") == {1: "B", 2: "C", 3: "D", 4: "A"}


def _docx(paragraphs: list[str]) -> bytes:
    body = "".join(f"<w:p><w:r><w:t xml:space=\"preserve\">{p}</w:t></w:r></w:p>" for p in paragraphs)
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{body}</w:body></w:document>"
    )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("word/document.xml", xml)
    return buf.getvalue()


def _pdf(lines: list[str]) -> bytes:
    content = "BT /F1 12 Tf 72 760 Td 14 TL " + " ".join(
        f"({ln.replace('(', r'\(').replace(')', r'\)')}) Tj T*" for ln in lines
    ) + " ET"
    objs = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        "/Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(content)} >>\nstream\n{content}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = b"%PDF-1.4\n"
    offsets = []
    for i, o in enumerate(objs, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n{o}\nendobj\n".encode()
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
    out += "".join(f"{o:010d} 00000 n \n" for o in offsets).encode()
    out += f"trailer << /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return out


LINES = ["1. 2 + 2 = ?", "A) 3", "B) 4", "C) 5", "D) 6", "Answer: B"]


def test_docx_extraction():
    qs, _ = parse_mcqs(extract_text("paper.docx", _docx(LINES)))
    assert len(qs) == 1 and qs[0]["answer"] == "B" and qs[0]["options"]["B"] == "4"


def test_pdf_extraction():
    qs, _ = parse_mcqs(extract_text("paper.pdf", _pdf(LINES)))
    assert len(qs) == 1 and qs[0]["answer"] == "B" and qs[0]["stem"] == "2 + 2 = ?"


def test_txt_and_doc_extraction():
    qs, _ = parse_mcqs(extract_text("paper.txt", "\n".join(LINES).encode("utf-8")))
    assert qs[0]["answer"] == "B"
    fake_doc = b"\xd0\xcf\x11\xe0" + b"\x00" * 64 + "\r".join(LINES).encode("utf-16le") + b"\x00" * 32
    qs, _ = parse_mcqs(extract_text("paper.doc", fake_doc))
    assert qs and qs[0]["answer"] == "B"


async def test_document_import_api(admin):
    files = {
        "file": ("paper.txt", SAMPLE.replace("Answer: C\n", "").encode(), "text/plain"),
        "answer_file": ("key.txt", b"4 - C", "text/plain"),
    }
    r = await admin.post(
        "/admin/questions/import", files=files, data={"dry_run": "true", "exam": "USAT"}
    )
    body = r.json()
    assert r.status_code == 200, body
    assert body["kind"] == "document" and body["valid"] == 4 and body["invalid"] == 0
    assert body["preview"][0]["correct"] == "B"
    assert "Kinematics" not in body["new_topics"]  # already seeded
    assert "Answer sheet" in body["warnings"][0]

    # Missing subject in the document and no default -> clear per-question errors.
    r = await admin.post(
        "/admin/questions/import",
        files={"file": ("p.txt", "\n".join(LINES).encode(), "text/plain")},
        data={"dry_run": "true", "exam": "HAT"},
    )
    assert r.json()["errors"][0]["row"] == "Q1"
    r = await admin.post(
        "/admin/questions/import",
        files={"file": ("p.txt", "\n".join(LINES).encode(), "text/plain")},
        data={"dry_run": "false", "exam": "HAT", "subject": "quantitative", "topic": "Arithmetic"},
    )
    assert r.json()["inserted"] == 1
