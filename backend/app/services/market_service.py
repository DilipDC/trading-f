from __future__ import annotations

import random
from datetime import datetime

from app.services.state import state

VALID_TIMEFRAMES = {"1m": 60, "2m": 120, "3m": 180, "5m": 300}


class MarketService:
    def get_latest(self, symbol: str, timeframe: str) -> dict:
        if timeframe not in VALID_TIMEFRAMES:
            raise ValueError("Unsupported timeframe")

        now = datetime.utcnow().timestamp()
        current_price = 100 + random.uniform(-5, 5)
        candle = {
            "timestamp": now,
            "open": round(current_price - random.uniform(0, 1), 2),
            "high": round(current_price + random.uniform(0, 2), 2),
            "low": round(current_price - random.uniform(0, 2), 2),
            "close": round(current_price, 2),
            "volume": random.randint(10_000, 150_000),
        }
        state.market_data[symbol].append(candle)
        state.prune_market_history(symbol)
        return {"symbol": symbol, "timeframe": timeframe, "points": list(state.market_data[symbol])}


market_service = MarketService()
