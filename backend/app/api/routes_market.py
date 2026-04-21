from fastapi import APIRouter, HTTPException, Query

from app.services.market_service import market_service

router = APIRouter()


@router.get("/chart/{symbol}")
def get_chart(symbol: str, timeframe: str = Query(default="1m")):
    try:
        return market_service.get_latest(symbol=symbol.upper(), timeframe=timeframe)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
