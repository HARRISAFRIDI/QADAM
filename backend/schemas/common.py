from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")

OptionLetter = Literal["A", "B", "C", "D"]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class OkResponse(BaseModel):
    ok: bool = True
