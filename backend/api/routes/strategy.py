"""Strategy simulation API routes."""

import json
from pathlib import Path

import joblib
from fastapi import APIRouter
from pydantic import BaseModel, Field

from strategy.strategy_simulator import simulate_strategy

router = APIRouter()

MODEL_PATH = Path("models/lap_time_model.pkl")
FEATURE_PATH = Path("models/lap_model_features.json")

# Request limits: every lap of every strategy runs the lap-time model, so unbounded inputs would
# let one request pin the CPU.
MAX_LAPS = 100
MAX_STRATEGIES = 6


class Stint(BaseModel):
    """Represents a single stint in a race strategy."""

    compound: str = Field(max_length=16)
    laps: int = Field(ge=1, le=MAX_LAPS)


class StrategyInput(BaseModel):
    """Represents a complete race strategy."""

    name: str = Field(max_length=60)
    stints: list[Stint] = Field(min_length=1, max_length=8)


class SimulationRequest(BaseModel):
    """Request model for strategy simulation."""

    year: int = Field(ge=1950, le=2100)
    round_number: int = Field(ge=1, le=30)
    race_name: str = Field(max_length=80)
    driver_code: str = Field(min_length=2, max_length=3)
    total_laps: int = Field(ge=1, le=MAX_LAPS)
    strategies: list[StrategyInput] = Field(min_length=1, max_length=MAX_STRATEGIES)


@router.post("/strategy/simulate", tags=["Strategy"])
async def simulate(req: SimulationRequest):
    """Simulate multiple race strategies and return results sorted by total time."""
    model = joblib.load(MODEL_PATH)
    with open(FEATURE_PATH) as f:
        feature_columns = json.load(f)

    results = []
    for strat in req.strategies:
        stints = [s.model_dump() for s in strat.stints]
        total_time, _ = simulate_strategy(
            model,
            feature_columns,
            year=req.year,
            round_number=req.round_number,
            race_name=req.race_name,
            driver_code=req.driver_code,
            total_laps=req.total_laps,
            stints=stints,
            pit_loss_s=22.0,
            starting_position=1,
        )
        results.append(
            {
                "strategy": strat.name,
                "total_time_s": total_time,
                "total_time_min": round(total_time / 60.0, 2),
            }
        )

    results.sort(key=lambda r: r["total_time_s"])
    return {"results": results}
