from pydantic import BaseModel


class AdminFeatureToggle(BaseModel):
    key: str
    enabled: bool


class AdminRefreshConfig(BaseModel):
    refresh_rate_ms: int
