from pydantic import BaseModel, Field
from typing import Literal

ChartType = Literal["candlestick", "line", "area"]
Timeframe = Literal["1m", "2m", "3m", "5m"]


class CandlePoint(BaseModel):
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: int


class ChartResponse(BaseModel):
    symbol: str
    chart_type: ChartType
    timeframe: Timeframe
    points: list[CandlePoint]
    window_minutes: int = Field(default=60)
