import re
import unicodedata


def slugify(value: str, max_len: int = 120) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value[:max_len] or "item"
