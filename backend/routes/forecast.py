from fastapi import APIRouter
from backend.models.schemas import ForecastResponse, ModelComparisonResponse
from backend.data.forecasts import get_forecast, get_forecast_comparison

router = APIRouter(prefix="/api/forecast", tags=["Attack Forecast"])


@router.get("", response_model=ForecastResponse)
def read_attack_forecast():
    """Returns the K=3 future-state attack progression forecast (T+1, T+2, T+3) with probabilities and recommended proactive defense actions."""
    return get_forecast()


@router.get("/comparison", response_model=ModelComparisonResponse)
def read_model_comparison():
    """Returns side-by-side performance & divergence comparison between baseline LSTM-A and Graph FastRP LSTM-B."""
    return get_forecast_comparison()
