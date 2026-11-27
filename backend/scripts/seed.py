"""Seed / upsert the official HAT & USAT structure. Safe to run repeatedly.

    python -m scripts.seed
"""

import asyncio

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from core.config import get_settings
from db.session import build_engine
from models import Blueprint, Category, EssayTopic, Exam, Section, Subject, Topic
from utils.text import slugify

EXAMS = [
    ("HAT", "Higher Education Aptitude Test", "Aptitude test for MS/MPhil and PhD admissions.", 1),
    ("USAT", "Undergraduate Studies Admission Test", "Admission test for undergraduate programmes.", 2),
]

SECTIONS = {
    "HAT": [
        ("verbal", "English / Verbal", "mcq"),
        ("analytical", "Analytical Reasoning", "mcq"),
        ("quantitative", "Quantitative Reasoning", "mcq"),
    ],
    "USAT": [
        ("verbal", "Verbal Reasoning (English)", "mcq"),
        ("quantitative", "Quantitative Reasoning (Mathematics)", "mcq"),
        ("subject", "Category Subjects", "mcq"),
        ("essay", "Essays", "essay"),
    ],
}

SUBJECTS = [
    ("english-verbal", "English / Verbal"),
    ("analytical", "Analytical Reasoning"),
    ("quantitative", "Quantitative Reasoning"),
    ("physics", "Physics"),
    ("chemistry", "Chemistry"),
    ("mathematics", "Mathematics"),
    ("biology", "Biology"),
    ("computer-science", "Computer Science"),
    ("statistics", "Statistics"),
    ("economics", "Economics"),
    ("accounting", "Accounting"),
    ("commerce", "Commerce"),
    ("islamiat-ethics", "Islamiat / Ethics"),
    ("pakistan-studies", "Pakistan Studies"),
    ("general-knowledge", "General Knowledge"),
]

HAT_CATEGORIES = [
    ("HAT-I", "HAT-I", ["Engineering and Technology", "Computer Science", "Mathematics", "Statistics", "Physics"], (30, 30, 40)),
    ("HAT-II", "HAT-II", ["Management Sciences", "Business Education"], (30, 40, 30)),
    ("HAT-III", "HAT-III", ["Arts and Humanities", "Social Sciences", "Psychology (Clinical and Applied)", "Law"], (40, 35, 25)),
    ("HAT-IV", "HAT-IV", ["Agriculture and Veterinary Sciences", "Biological and Medical Sciences", "Physical Sciences", "Education", "Media and Mass Communication"], (40, 30, 30)),
    ("HAT-GENERAL", "HAT-General", ["Religious Studies (Madrassa graduates)"], (40, 30, 30)),
]

USAT_CATEGORIES = [
    ("USAT-E", "USAT-E (Engineering)", [("physics", 10), ("chemistry", 10), ("mathematics", 10)]),
    ("USAT-M", "USAT-M (Medical)", [("physics", 8), ("chemistry", 8), ("biology", 14)]),
    ("USAT-CS", "USAT-CS (Computer Science)", [("physics", 8), ("computer-science", 14), ("mathematics", 8)]),
    ("USAT-GS", "USAT-GS (General Science)", [("mathematics", 10), ("statistics", 10), ("economics", 10)]),
    ("USAT-COM", "USAT-COM (Commerce)", [("accounting", 10), ("commerce", 10), ("economics", 10)]),
    ("USAT-A", "USAT-A (Arts & Humanities)", [("islamiat-ethics", 10), ("pakistan-studies", 10), ("general-knowledge", 10)]),
]

TOPICS = {
    "english-verbal": ["Vocabulary", "Synonyms", "Antonyms", "Sentence Completion", "Reading Comprehension", "Grammar", "Verbal Logic"],
    "analytical": ["Logical Puzzles", "Arrangements", "Ordering", "Conditions", "Statements", "Deductions", "Logical Problems"],
    "quantitative": ["Arithmetic", "Percentages", "Ratios", "Algebra", "Equations", "Geometry", "Probability", "Statistics", "Word Problems"],
    # Starter lists (D15) - admins can rename/extend these.
    "physics": ["Measurements", "Kinematics", "Dynamics", "Work, Energy and Power", "Circular Motion", "Waves and Oscillations", "Thermodynamics", "Electrostatics", "Current Electricity", "Magnetism", "Optics", "Modern Physics"],
    "chemistry": ["Atomic Structure", "Chemical Bonding", "States of Matter", "Stoichiometry", "Thermochemistry", "Chemical Equilibrium", "Acids, Bases and Salts", "Electrochemistry", "Periodic Table", "Organic Chemistry"],
    "mathematics": ["Algebra", "Functions and Graphs", "Trigonometry", "Coordinate Geometry", "Calculus", "Matrices and Determinants", "Sequences and Series", "Permutations and Combinations"],
    "biology": ["Cell Biology", "Biomolecules", "Enzymes", "Genetics", "Evolution", "Human Physiology", "Plant Biology", "Ecology", "Microbiology"],
    "computer-science": ["Computer Fundamentals", "Number Systems", "Programming Concepts", "Data Structures", "Algorithms", "Databases", "Networking", "Operating Systems", "Digital Logic"],
    "statistics": ["Descriptive Statistics", "Probability", "Probability Distributions", "Sampling", "Correlation and Regression", "Hypothesis Testing"],
    "economics": ["Basic Concepts", "Demand and Supply", "Market Structures", "National Income", "Money and Banking", "Public Finance", "International Trade", "Economy of Pakistan"],
    "accounting": ["Accounting Principles", "Journal and Ledger", "Trial Balance", "Financial Statements", "Depreciation", "Bank Reconciliation", "Partnership Accounts"],
    "commerce": ["Business Organization", "Trade", "Banking", "Insurance", "Marketing", "Business Communication"],
    "islamiat-ethics": ["Quran and Hadith", "Pillars of Islam", "Seerah", "Islamic History", "Ethics and Morality"],
    "pakistan-studies": ["Pakistan Movement", "Constitutional History", "Geography of Pakistan", "Economy of Pakistan", "Foreign Policy", "Culture and Society"],
    "general-knowledge": ["Current Affairs", "World Geography", "Science and Technology", "International Organizations", "Sports", "Famous Personalities"],
}

# Sample essay prompts so the USAT essay flow can be tested; manage in Admin > Essays.
ESSAY_TOPICS = {
    "argument": [
        "Online education can fully replace classroom learning. Do you agree or disagree?",
        "Social media does more harm than good to young people. Discuss.",
        "Technology has made people more isolated rather than more connected. Argue for or against.",
    ],
    "narrative": [
        "Describe a day that changed the way you think about your future.",
        "Write about a time you helped someone and what you learned from it.",
        "Narrate a journey you will never forget.",
    ],
}


async def upsert(conn, model, rows, index, update_cols):
    stmt = pg_insert(model).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=index, set_={c: getattr(stmt.excluded, c) for c in update_cols}
    )
    await conn.execute(stmt)


async def main() -> None:
    s = get_settings()
    engine = build_engine(s.database_url_migrations or s.database_url, pool_size=0)
    async with engine.begin() as conn:
        await upsert(
            conn,
            Exam,
            [{"code": c, "name": n, "description": d, "sort_order": o} for c, n, d, o in EXAMS],
            ["code"],
            ["name", "description", "sort_order"],
        )
        exams = dict((await conn.execute(select(Exam.code, Exam.id))).all())

        for exam_code, sections in SECTIONS.items():
            await upsert(
                conn,
                Section,
                [
                    {"exam_id": exams[exam_code], "code": c, "name": n, "kind": k, "sort_order": i}
                    for i, (c, n, k) in enumerate(sections, start=1)
                ],
                ["exam_id", "code"],
                ["name", "kind", "sort_order"],
            )
        sections = {
            (e, c): i for i, e, c in (await conn.execute(select(Section.id, Section.exam_id, Section.code))).all()
        }

        await upsert(
            conn,
            Subject,
            [{"slug": sl, "name": n, "sort_order": i} for i, (sl, n) in enumerate(SUBJECTS, start=1)],
            ["slug"],
            ["name", "sort_order"],
        )
        subjects = dict((await conn.execute(select(Subject.slug, Subject.id))).all())

        cat_rows = []
        for i, (code, name, disciplines, _) in enumerate(HAT_CATEGORIES, start=1):
            cat_rows.append(
                {
                    "exam_id": exams["HAT"],
                    "code": code,
                    "name": name,
                    "disciplines": disciplines,
                    "mcq_duration_min": 120,
                    "essay_duration_min": None,
                    "sort_order": i,
                }
            )
        for i, (code, name, _) in enumerate(USAT_CATEGORIES, start=1):
            cat_rows.append(
                {
                    "exam_id": exams["USAT"],
                    "code": code,
                    "name": name,
                    "disciplines": [],
                    "mcq_duration_min": 100,
                    "essay_duration_min": 40,
                    "sort_order": i,
                }
            )
        await upsert(
            conn,
            Category,
            cat_rows,
            ["code"],
            ["exam_id", "name", "disciplines", "mcq_duration_min", "essay_duration_min", "sort_order"],
        )
        cats = dict((await conn.execute(select(Category.code, Category.id))).all())

        h, u = exams["HAT"], exams["USAT"]
        bp = []
        for code, _, _, (v, a, q) in HAT_CATEGORIES:
            for order, (sec, subj, n) in enumerate(
                [("verbal", "english-verbal", v), ("analytical", "analytical", a), ("quantitative", "quantitative", q)],
                start=1,
            ):
                bp.append(
                    {"category_id": cats[code], "section_id": sections[(h, sec)], "subject_id": subjects[subj], "mcq_count": n, "sort_order": order}
                )
        for code, _, specific in USAT_CATEGORIES:
            rows = [("verbal", "english-verbal", 20), ("quantitative", "quantitative", 25)] + [
                ("subject", slug, n) for slug, n in specific
            ]
            for order, (sec, subj, n) in enumerate(rows, start=1):
                bp.append(
                    {"category_id": cats[code], "section_id": sections[(u, sec)], "subject_id": subjects[subj], "mcq_count": n, "sort_order": order}
                )
        await upsert(
            conn, Blueprint, bp, ["category_id", "subject_id"], ["section_id", "mcq_count", "sort_order"]
        )

        topic_rows = [
            {"subject_id": subjects[slug], "name": name, "slug": slugify(name), "sort_order": i}
            for slug, names in TOPICS.items()
            for i, name in enumerate(names, start=1)
        ]
        await conn.execute(
            pg_insert(Topic).values(topic_rows).on_conflict_do_nothing(constraint="uq_topics_subject_slug")
        )

        has_essays = await conn.scalar(select(EssayTopic.id).limit(1))
        if not has_essays:
            await conn.execute(
                pg_insert(EssayTopic).values(
                    [
                        {"exam_id": u, "essay_type": t, "prompt": p, "status": "published"}
                        for t, prompts in ESSAY_TOPICS.items()
                        for p in prompts
                    ]
                )
            )
    await engine.dispose()
    print("Seed complete: exams, sections, subjects, 11 categories, blueprints, topics.")


if __name__ == "__main__":
    asyncio.run(main())
