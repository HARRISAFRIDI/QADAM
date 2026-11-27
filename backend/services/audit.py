from sqlalchemy.ext.asyncio import AsyncSession

from models import AuditLog, User


def audit(
    db: AsyncSession,
    actor: User,
    action: str,
    entity: str,
    entity_id: object | None = None,
    payload: dict | None = None,
) -> None:
    """Queue an audit row in the current transaction (committed with the change)."""
    db.add(
        AuditLog(
            actor_id=actor.id,
            action=action,
            entity=entity,
            entity_id=str(entity_id) if entity_id is not None else None,
            payload=payload,
        )
    )
