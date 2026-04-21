from pydantic import BaseModel, Field


class RuntimeSettings(BaseModel):
    max_chart_window_minutes: int = 60
    allowed_timeframes: tuple[str, ...] = ("1m", "2m", "3m", "5m")
    allowed_chart_types: tuple[str, ...] = ("candlestick", "line", "area")
    default_refresh_rate_ms: int = 2000
    min_deposit_inr: int = 100
    withdraw_limit_inr: int = 50000
    deposit_enabled: bool = True
    withdraw_enabled: bool = True
    service_hours_deposit: tuple[str, str] = Field(default=("09:00", "21:00"))
    service_hours_withdraw: tuple[str, str] = Field(default=("10:00", "18:00"))


settings = RuntimeSettings()
