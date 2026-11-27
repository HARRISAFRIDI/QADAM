"""Fail fast on the requirements.txt problems that break Vercel builds.

Checks: no BOM / UTF-16, ASCII only, LF line endings, valid PEP 508 syntax,
every package pinned with ==, no duplicates.

    python scripts/check_requirements.py requirements.txt
"""

import sys
from pathlib import Path

from packaging.requirements import InvalidRequirement, Requirement


def check(path: Path) -> list[str]:
    errors: list[str] = []
    raw = path.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        errors.append("file starts with a UTF-8 BOM")
    if raw.startswith((b"\xff\xfe", b"\xfe\xff")) or b"\x00" in raw:
        errors.append("file is UTF-16 (PowerShell '>' redirection?) - must be UTF-8")
        return errors
    if b"\r\n" in raw:
        errors.append("file has CRLF line endings - must be LF")
    try:
        text = raw.decode("ascii")
    except UnicodeDecodeError as exc:
        errors.append(f"non-ASCII byte at position {exc.start}")
        return errors

    seen: set[str] = set()
    for n, line in enumerate(text.splitlines(), start=1):
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("-r "):
            continue
        try:
            req = Requirement(line)
        except InvalidRequirement as exc:
            errors.append(f"line {n}: invalid requirement '{line}' ({exc})")
            continue
        name = req.name.lower().replace("_", "-")
        if name in seen:
            errors.append(f"line {n}: duplicate package '{req.name}'")
        seen.add(name)
        specs = list(req.specifier)
        if len(specs) != 1 or specs[0].operator != "==":
            errors.append(f"line {n}: '{req.name}' must be pinned with ==")
    return errors


if __name__ == "__main__":
    files = [Path(p) for p in (sys.argv[1:] or ["requirements.txt"])]
    failed = False
    for f in files:
        problems = check(f)
        for p in problems:
            print(f"{f}: {p}")
        failed |= bool(problems)
        if not problems:
            print(f"{f}: OK")
    sys.exit(1 if failed else 0)
