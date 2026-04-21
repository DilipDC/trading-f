from fastapi import APIRouter, HTTPException

from app.schemas.admin import AdminFeatureToggle, AdminRefreshConfig
from app.services.admin_service import admin_service
from app.services.wallet_service import wallet_service

router = APIRouter()


@router.post("/feature-toggle")
def feature_toggle(payload: AdminFeatureToggle) -> dict:
    return admin_service.set_flag(payload.key, payload.enabled)


@router.post("/refresh-config")
def refresh_config(payload: AdminRefreshConfig) -> dict:
    return admin_service.set_refresh_rate(payload.refresh_rate_ms)


@router.post("/requests/{request_id}/approve")
def approve_request(request_id: str) -> dict:
    try:
        req = wallet_service.approve(request_id)
        return {"request_id": req.request_id, "status": req.status}
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Request not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/requests/{request_id}/reject")
def reject_request(request_id: str) -> dict:
    try:
        req = wallet_service.reject(request_id)
        return {"request_id": req.request_id, "status": req.status}
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Request not found") from exc
