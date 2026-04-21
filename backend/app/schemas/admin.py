from pydantic import BaseModel, Field


class FeatureUpdate(BaseModel):
    animations_enabled: bool | None = None
    deposit_enabled: bool | None = None
    withdraw_enabled: bool | None = None
    low_ram_mode: bool | None = None
    chart_type: str | None = Field(default=None, pattern="^(candlestick|line|area)$")
    timeframe: str | None = Field(default=None, pattern="^(1m|2m|3m|5m)$")
    refresh_rate_ms: int | None = Field(default=None, ge=500, le=60000)


class WalletRulesUpdate(BaseModel):
    min_deposit: int | None = Field(default=None, ge=100)
    min_withdraw: int | None = Field(default=None, ge=100)
    max_withdraw: int | None = Field(default=None, ge=100)
