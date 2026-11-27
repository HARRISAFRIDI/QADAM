"""Dashboard overview = progress stats + flashcards + today's study plan."""

from sqlalchemy.ext.asyncio import AsyncSession

from models import User
from services import memorize_service, plan_service, progress_service


async def overview(db: AsyncSession, user: User) -> dict:
    ov = await progress_service.overview(db, user)
    mem = await memorize_service.summary(db, user)
    plan = await plan_service.today_summary(db, user)
    ov["memorize"] = mem
    ov["plan_today"] = plan

    extra: list[dict] = []
    if plan and not plan["finished"]:
        left = [t for t in plan["tasks"] if not t["done"]]
        if left:
            extra.append(
                {
                    "kind": "plan",
                    "title": f"Day {plan['day']} of your plan: {len(left)} task{'s' if len(left) != 1 else ''} left",
                    "body": left[0]["title"],
                    "action": {"type": "link", "href": "/study-plans"},
                }
            )
    elif plan is None and ov["progress"]["answered"] >= 10:
        extra.append(
            {
                "kind": "plan",
                "title": "Make a study plan",
                "body": "A 14-day or 30-day plan tells you exactly what to study each day.",
                "action": {"type": "link", "href": "/study-plans"},
            }
        )
    if mem["due"]:
        extra.append(
            {
                "kind": "memorize",
                "title": f"Review {mem['due']} flashcard{'s' if mem['due'] != 1 else ''}",
                "body": "These cards are due today. Reviewing them now is what makes them stick.",
                "action": {"type": "link", "href": "/memorize/review"},
            }
        )
    # Keep the "start" suggestion for brand-new students first.
    recs = ov["recommendations"]
    head = [r for r in recs if r["kind"] == "start"]
    rest = [r for r in recs if r["kind"] != "start"]
    ov["recommendations"] = (head + extra + rest)[:4]
    return ov
