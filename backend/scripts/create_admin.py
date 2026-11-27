"""Create (or promote) an admin account.

    python -m scripts.create_admin --email you@example.com --name "Your Name"
    (password is asked interactively, or pass --password)
"""

import argparse
import asyncio
import getpass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from core.config import get_settings
from core.security import hash_password
from db.session import build_engine
from models import User


async def main(email: str, name: str, password: str) -> None:
    s = get_settings()
    engine = build_engine(s.database_url_migrations or s.database_url, pool_size=0)
    async with async_sessionmaker(engine)() as db:
        user = (await db.execute(select(User).where(User.email == email.lower()))).scalar_one_or_none()
        if user is None:
            user = User(email=email.lower(), full_name=name, password_hash=await hash_password(password), role="admin")
            db.add(user)
            action = "created"
        else:
            user.role = "admin"
            user.password_hash = await hash_password(password)
            user.token_version += 1
            action = "updated"
        await db.commit()
    await engine.dispose()
    print(f"Admin {action}: {email.lower()}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--email", required=True)
    p.add_argument("--name", default="QADAM Admin")
    p.add_argument("--password")
    a = p.parse_args()
    pw = a.password or getpass.getpass("Admin password (min 8 chars): ")
    if len(pw) < 8:
        raise SystemExit("Password must be at least 8 characters.")
    asyncio.run(main(a.email, a.name, pw))
