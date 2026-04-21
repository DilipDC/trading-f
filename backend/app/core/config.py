from pydantic import BaseModel, Field


class FeatureFlags(BaseModel):
    animations_enabled: bool = True
    deposit_enabled: bool = True
    withdraw_enabled: bool = True
    low_ram_mode: bool = False
    chart_type: str = "candlestick"
    timeframe: str = "1m"
    refresh_rate_ms: int = 3000


class WalletRules(BaseModel):
    min_deposit: int = 100
    min_withdraw: int = 100
    max_withdraw: int = 100000
    deposit_hours: tuple[int, int] = (9, 21)
    withdraw_hours: tuple[int, int] = (10, 18)


class RuntimeConfig(BaseModel):
    features: FeatureFlags = Field(default_factory=FeatureFlags)
    wallet: WalletRules = Field(default_factory=WalletRules)
