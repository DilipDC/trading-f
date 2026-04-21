from fastapi import APIRouter, HTTPException

from app.schemas.admin import FeatureUpdate, WalletRulesUpdate
from app.schemas.wallet import WalletDecision
from app.services.state import state

router = APIRouter()


@router.get("/dashboard")
def dashboard():
    return {
        "features": state.config.features.model_dump(),
        "wallet_rules": state.config.wallet.model_dump(),
        "users": [u.__dict__ for u in state.users.values()],
        "wallet_requests": state.serialize_requests(),
        "notifications": list(state.notifications),
    }


@router.patch("/features")
def patch_features(payload: FeatureUpdate):
    updates = payload.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(state.config.features, key, value)
    return {"status": "ok", "features": state.config.features.model_dump()}


@router.patch("/wallet-rules")
def patch_wallet_rules(payload: WalletRulesUpdate):
    updates = payload.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(state.config.wallet, key, value)
    return {"status": "ok", "wallet_rules": state.config.wallet.model_dump()}


@router.post("/wallet/decision")
def wallet_decision(payload: WalletDecision):
    try:
        req = state.resolve_request(payload.request_id, payload.approve)
        return {"status": "ok", "request": req.__dict__, "user": state.users[req.user_id].__dict__}
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Request not found") from exc
