"""In-process cache of the (rarely changing) content hierarchy.

Exams, categories, sections, subjects, topics and blueprints are loaded once per
instance and refreshed every TTL seconds, or immediately when an admin edits them
(on that instance). Overview/attempt endpoints then don't need to query them again.
"""

import asyncio
import time
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import not_found
from models import Blueprint, Category, Exam, Section, Subject, Topic

TTL_SECONDS = 60


@dataclass
class Taxonomy:
    exams: dict[int, dict] = field(default_factory=dict)
    exam_by_code: dict[str, dict] = field(default_factory=dict)
    categories: dict[int, dict] = field(default_factory=dict)
    category_by_code: dict[str, dict] = field(default_factory=dict)
    sections: dict[int, dict] = field(default_factory=dict)
    subjects: dict[int, dict] = field(default_factory=dict)
    topics: dict[int, dict] = field(default_factory=dict)
    topics_by_subject: dict[int, list[dict]] = field(default_factory=dict)
    blueprints_by_category: dict[int, list[dict]] = field(default_factory=dict)
    loaded_at: float = 0.0

    def category(self, code: str) -> dict:
        cat = self.category_by_code.get(code.upper())
        if cat is None or not cat["is_active"]:
            raise not_found("Category")
        return cat

    def blueprint(self, category_id: int) -> list[dict]:
        return self.blueprints_by_category.get(category_id, [])

    def section_of_subject(self, category_id: int, subject_id: int) -> int | None:
        for row in self.blueprint(category_id):
            if row["subject_id"] == subject_id:
                return row["section_id"]
        return None


_cache: Taxonomy | None = None
_lock = asyncio.Lock()


def invalidate() -> None:
    global _cache
    _cache = None


async def get_taxonomy(db: AsyncSession) -> Taxonomy:
    global _cache
    if _cache is not None and time.monotonic() - _cache.loaded_at < TTL_SECONDS:
        return _cache
    async with _lock:
        if _cache is not None and time.monotonic() - _cache.loaded_at < TTL_SECONDS:
            return _cache
        _cache = await _load(db)
        return _cache


async def _load(db: AsyncSession) -> Taxonomy:
    t = Taxonomy()
    for e in (await db.execute(select(Exam).order_by(Exam.sort_order, Exam.id))).scalars():
        d = {"id": e.id, "code": e.code, "name": e.name, "description": e.description}
        t.exams[e.id] = d
        t.exam_by_code[e.code] = d

    for c in (
        await db.execute(select(Category).order_by(Category.sort_order, Category.id))
    ).scalars():
        d = {
            "id": c.id,
            "exam_id": c.exam_id,
            "code": c.code,
            "name": c.name,
            "description": c.description,
            "disciplines": list(c.disciplines or []),
            "mcq_duration_min": c.mcq_duration_min,
            "essay_duration_min": c.essay_duration_min,
            "is_active": c.is_active,
        }
        t.categories[c.id] = d
        t.category_by_code[c.code.upper()] = d

    for s in (await db.execute(select(Section).order_by(Section.sort_order, Section.id))).scalars():
        t.sections[s.id] = {
            "id": s.id,
            "exam_id": s.exam_id,
            "code": s.code,
            "name": s.name,
            "kind": s.kind,
            "sort_order": s.sort_order,
        }

    for s in (await db.execute(select(Subject).order_by(Subject.sort_order, Subject.id))).scalars():
        t.subjects[s.id] = {"id": s.id, "slug": s.slug, "name": s.name}

    for tp in (
        await db.execute(
            select(Topic).where(Topic.is_active.is_(True)).order_by(Topic.sort_order, Topic.name)
        )
    ).scalars():
        d = {"id": tp.id, "subject_id": tp.subject_id, "name": tp.name, "parent_id": tp.parent_id}
        t.topics[tp.id] = d
        t.topics_by_subject.setdefault(tp.subject_id, []).append(d)

    rows = (await db.execute(select(Blueprint))).scalars().all()
    for b in sorted(
        rows, key=lambda b: (t.sections[b.section_id]["sort_order"], b.sort_order, b.id)
    ):
        t.blueprints_by_category.setdefault(b.category_id, []).append(
            {
                "id": b.id,
                "section_id": b.section_id,
                "subject_id": b.subject_id,
                "mcq_count": b.mcq_count,
            }
        )

    t.loaded_at = time.monotonic()
    return t
