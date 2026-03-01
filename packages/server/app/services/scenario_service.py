import secrets
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.scenario import Scenario


class ScenarioService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _generate_short_id() -> str:
        return secrets.token_urlsafe(9)

    async def create(
        self,
        name: str,
        model_id: str,
        parameters: dict,
        description: str | None = None,
    ) -> dict:
        short_id = self._generate_short_id()

        scenario = Scenario(
            short_id=short_id,
            name=name,
            description=description,
            model_id=model_id,
            parameters=parameters,
            created_at=datetime.now(),
        )
        self.db.add(scenario)

        try:
            await self.db.commit()
        except Exception:
            await self.db.rollback()
            # Retry once with a new short_id on unlikely collision
            scenario = Scenario(
                short_id=self._generate_short_id(),
                name=name,
                description=description,
                model_id=model_id,
                parameters=parameters,
                created_at=datetime.now(),
            )
            self.db.add(scenario)
            await self.db.commit()

        await self.db.refresh(scenario)
        return self._to_dict(scenario)

    async def get_by_short_id(self, short_id: str) -> dict | None:
        stmt = select(Scenario).where(Scenario.short_id == short_id)
        result = await self.db.execute(stmt)
        scenario = result.scalar_one_or_none()
        if not scenario:
            return None
        return self._to_dict(scenario)

    async def list_recent(self, limit: int = 20, offset: int = 0) -> dict:
        stmt = (
            select(Scenario)
            .order_by(Scenario.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        scenarios = result.scalars().all()

        count_stmt = select(func.count()).select_from(Scenario)
        total = (await self.db.execute(count_stmt)).scalar() or 0

        return {
            "scenarios": [self._to_dict(s) for s in scenarios],
            "total": total,
        }

    @staticmethod
    def _to_dict(scenario: Scenario) -> dict:
        return {
            "id": scenario.short_id,
            "name": scenario.name,
            "description": scenario.description,
            "model_id": scenario.model_id,
            "parameters": scenario.parameters,
            "created_at": scenario.created_at.isoformat(),
        }
