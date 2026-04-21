from app.core.config import settings


class AdminService:
    feature_flags: dict[str, bool] = {
        "animations": True,
        "low_ram_mode": False,
        "deposit_enabled": True,
        "withdraw_enabled": True,
    }

    @classmethod
    def set_flag(cls, key: str, enabled: bool) -> dict:
        cls.feature_flags[key] = enabled
        if key == "deposit_enabled":
            settings.deposit_enabled = enabled
        if key == "withdraw_enabled":
            settings.withdraw_enabled = enabled
        return {"key": key, "enabled": enabled}

    @classmethod
    def set_refresh_rate(cls, refresh_rate_ms: int) -> dict:
        settings.default_refresh_rate_ms = max(500, refresh_rate_ms)
        return {"refresh_rate_ms": settings.default_refresh_rate_ms}


admin_service = AdminService()
