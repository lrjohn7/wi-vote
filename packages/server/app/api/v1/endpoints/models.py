from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.mrp_service import MrpService
from app.services.scenario_service import ScenarioService

router = APIRouter(prefix="/models", tags=["models"])


class PredictRequest(BaseModel):
    model_id: str
    parameters: dict


class MrpFitRequest(BaseModel):
    year: int
    race_type: str
    draws: int = 2000
    tune: int = 1000


class ScenarioCreateRequest(BaseModel):
    name: str = Field(..., max_length=255)
    description: str | None = None
    model_id: str
    parameters: dict


class ScenarioResponse(BaseModel):
    id: str
    name: str
    description: str | None
    model_id: str
    parameters: dict
    created_at: str


class ScenarioListResponse(BaseModel):
    scenarios: list[ScenarioResponse]
    total: int


@router.get("/available")
async def list_models(db: AsyncSession = Depends(get_db)) -> dict:
    """List available models and their parameters."""
    mrp_service = MrpService(db)
    fitted = await mrp_service.get_fitted_models()

    return {
        "models": [
            {
                "id": "uniform-swing",
                "name": "Uniform Swing",
                "description": "Applies a constant vote share adjustment to every ward.",
                "version": "1.0.0",
                "serverSide": False,
            },
            {
                "id": "proportional-swing",
                "name": "Proportional Swing",
                "description": "Applies a multiplicative vote share adjustment to every ward.",
                "version": "1.0.0",
                "serverSide": False,
            },
            {
                "id": "demographic-swing",
                "name": "Demographic Swing",
                "description": "Applies differential swings based on urban/suburban/rural classification.",
                "version": "1.0.0",
                "serverSide": False,
            },
            {
                "id": "mrp",
                "name": "MRP (Bayesian)",
                "description": "Multilevel regression with poststratification. Uses demographics and geographic random effects for ward-level predictions with credible intervals.",
                "version": "1.0.0",
                "serverSide": True,
                "fittedElections": [
                    {
                        "year": m["year"],
                        "raceType": m["race_type"],
                        "wardVintage": m["ward_vintage"],
                        "fittedAt": m.get("fitted_at"),
                        "diagnostics": m.get("diagnostics", {}),
                    }
                    for m in fitted
                ],
            },
        ]
    }


@router.post("/predict")
async def predict(
    request: PredictRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Run a model with given parameters.

    For client-side models (uniform-swing, proportional-swing, demographic-swing),
    computation happens in the browser. This endpoint handles server-side MRP.
    """
    if request.model_id != "mrp":
        return {
            "model_id": request.model_id,
            "predictions": {},
            "message": "Client-side models compute in the browser. Use the Web Worker.",
        }

    params = request.parameters
    year = params.get("baseElectionYear")
    race_type = params.get("baseRaceType")

    if not year or not race_type:
        raise HTTPException(
            status_code=400,
            detail="MRP requires baseElectionYear and baseRaceType parameters",
        )

    adjustments = {
        "turnoutChange": params.get("turnoutChange", 0),
        "collegeShift": params.get("collegeShift", 0),
        "urbanShift": params.get("urbanShift", 0),
        "ruralShift": params.get("ruralShift", 0),
        "incomeShift": params.get("incomeShift", 0),
    }

    mrp_service = MrpService(db)
    try:
        result = await mrp_service.predict(
            year=int(year),
            race_type=str(race_type),
            adjustments=adjustments,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return result


@router.post("/mrp/fit")
async def trigger_mrp_fit(request: MrpFitRequest) -> dict:
    """Trigger async MRP model fitting via Celery."""
    try:
        from app.tasks.mrp_tasks import fit_mrp_model_task
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Celery/PyMC not available. Run in Docker to enable MRP fitting.",
        )

    task = fit_mrp_model_task.delay(
        year=request.year,
        race_type=request.race_type,
        draws=request.draws,
        tune=request.tune,
    )

    return {
        "task_id": task.id,
        "status": "PENDING",
        "message": f"Fitting MRP model for {request.race_type} {request.year}",
    }


@router.get("/mrp/fit/{task_id}")
async def get_fit_status(
    task_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Check the status of an MRP fitting task."""
    mrp_service = MrpService(db)
    return await mrp_service.get_fit_status(task_id)


@router.get("/mrp/fitted")
async def list_fitted_mrp_models(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List all pre-fitted MRP models available for prediction."""
    mrp_service = MrpService(db)
    models = await mrp_service.get_fitted_models()
    return {"models": models}


@router.get("/scenarios")
async def list_scenarios(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> ScenarioListResponse:
    """List recent saved scenarios."""
    service = ScenarioService(db)
    result = await service.list_recent(limit=limit, offset=offset)
    return ScenarioListResponse(**result)


@router.post("/scenarios", status_code=201)
async def save_scenario(
    request: ScenarioCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> ScenarioResponse:
    """Save a scenario and return its short ID for sharing."""
    service = ScenarioService(db)
    result = await service.create(
        name=request.name,
        model_id=request.model_id,
        parameters=request.parameters,
        description=request.description,
    )
    return ScenarioResponse(**result)


@router.get("/scenarios/{scenario_id}")
async def load_scenario(
    scenario_id: str,
    db: AsyncSession = Depends(get_db),
) -> ScenarioResponse:
    """Load a saved scenario by its short ID."""
    service = ScenarioService(db)
    result = await service.get_by_short_id(scenario_id)
    if not result:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return ScenarioResponse(**result)
