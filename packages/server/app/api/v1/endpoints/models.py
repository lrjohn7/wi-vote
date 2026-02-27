from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/models", tags=["models"])


class PredictRequest(BaseModel):
    model_id: str
    parameters: dict


@router.get("/available")
async def list_models() -> dict:
    """List available models and their parameters."""
    return {
        "models": [
            {
                "id": "uniform-swing",
                "name": "Uniform Swing",
                "description": "Applies a constant vote share adjustment to every ward.",
                "version": "1.0.0",
            }
        ]
    }


@router.post("/predict")
async def predict(request: PredictRequest) -> dict:
    """Run a model with given parameters."""
    return {
        "model_id": request.model_id,
        "predictions": [],
        "message": "Server-side prediction not yet implemented",
    }


@router.post("/scenarios")
async def save_scenario(scenario: dict) -> dict:
    """Save a scenario."""
    return {"id": "not-implemented", "message": "Scenario saving not yet implemented"}


@router.get("/scenarios/{scenario_id}")
async def load_scenario(scenario_id: str) -> dict:
    """Load a saved scenario."""
    return {"id": scenario_id, "message": "Scenario loading not yet implemented"}
