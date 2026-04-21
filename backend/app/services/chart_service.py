from __future__ import annotations

import random
import time
from collections import defaultdict

from app.core.config import settings

_INTERVAL_SECONDS = {"1m": 60, "2m": 120, "3m": 180, "5m": 300}


class ChartService:
    def __init__(self) -> None:
        self._cache: dict[tuple[str, str], list[dict]] = defaultdict(list)

    def _trim_to_one_hour(self, rows: list[dict]) -> list[dict]:
        cutoff_ms = int((time.time() - (settings.max_chart_window_minutes * 60)) * 1000)
        return [r for r in rows if r["timestamp"] >= cutoff_ms]

    def get_series(self, symbol: str, timeframe: str, chart_type: str) -> dict:
        if timeframe not in settings.allowed_timeframes:
            raise ValueError("Unsupported timeframe")
        if chart_type not in settings.allowed_chart_types:
            raise ValueError("Unsupported chart type")

        key = (symbol.upper(), timeframe)
        interval = _INTERVAL_SECONDS[timeframe]
        now = int(time.time())
        start = now - settings.max_chart_window_minutes * 60
        expected = ((now - start) // interval) + 1

        rows = self._cache[key]
        if not rows:
            price = 250.0
            for i in range(int(expected)):
                ts = (start + i * interval) * 1000
                drift = random.uniform(-1.2, 1.2)
                open_p = price
                close_p = max(1.0, open_p + drift)
                high_p = max(open_p, close_p) + random.uniform(0, 0.8)
                low_p = min(open_p, close_p) - random.uniform(0, 0.8)
                rows.append(
                    {
                        "timestamp": ts,
                        "open": round(open_p, 2),
                        "high": round(high_p, 2),
                        "low": round(low_p, 2),
                        "close": round(close_p, 2),
                        "volume": random.randint(3000, 20000),
                    }
                )
                price = close_p

        rows = self._trim_to_one_hour(rows)
        self._cache[key] = rows
        return {
            "symbol": symbol.upper(),
            "chart_type": chart_type,
            "timeframe": timeframe,
            "window_minutes": settings.max_chart_window_minutes,
            "points": rows,
        }

    def clear_cache(self, symbol: str | None = None) -> dict:
        if symbol:
            symbol = symbol.upper()
            keys = [k for k in self._cache if k[0] == symbol]
            for k in keys:
                del self._cache[k]
            return {"cleared": len(keys), "symbol": symbol}

        count = len(self._cache)
        self._cache.clear()
        return {"cleared": count, "symbol": "all"}


chart_service = ChartService()
