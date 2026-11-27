from pydantic import BaseModel


class CategoryBrief(BaseModel):
    id: int
    code: str
    name: str
    description: str | None
    disciplines: list[str]
    mcq_duration_min: int
    essay_duration_min: int | None
    total_mcqs: int
    sections: list[dict]  # [{code, name, mcq_count}]


class ExamOut(BaseModel):
    id: int
    code: str
    name: str
    description: str | None
    categories: list[CategoryBrief]


class TopicOut(BaseModel):
    id: int
    name: str
    available: int


class SubjectOut(BaseModel):
    id: int
    slug: str
    name: str
    mcq_count: int  # in the full mock
    available: int  # published questions in the pool
    topics: list[TopicOut]


class SectionOut(BaseModel):
    id: int
    code: str
    name: str
    mcq_count: int
    available: int
    subjects: list[SubjectOut]


class MockBrief(BaseModel):
    id: int
    title: str
    description: str | None
    duration_min: int
    question_count: int


class CategoryOverview(BaseModel):
    exam: dict  # {id, code, name}
    category: dict  # {id, code, name, description, disciplines, mcq_duration_min, essay_duration_min}
    total_mcqs: int
    total_available: int
    sections: list[SectionOut]
    mocks: list[MockBrief]
    essays: dict | None  # {argument: n, narrative: n, duration_min} for USAT
