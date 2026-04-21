from fastapi import APIRouter, HTTPException, Query

from app.schemas.chart import ChartResponse
from app.services.chart_service import chart_service

router = APIRouter()


@router.get("/{symbol}", response_model=ChartResponse)
def get_chart(
    symbol: str,
    timeframe: str = Query("1m", pattern="^(1m|2m|3m|5m)$"),
    chart_type: str = Query("candlestick", pattern="^(candlestick|line|area)$"),
) -> dict:
    try:
        return chart_service.get_series(symbol=symbol, timeframe=timeframe, chart_type=chart_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/cache")
def clear_cache(symbol: str | None = None) -> dict:
    return chart_service.clear_cache(symbol)
