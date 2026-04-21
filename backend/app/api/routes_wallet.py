from fastapi import APIRouter, HTTPException

from app.schemas.wallet import DepositCreate, WalletResponse, WithdrawCreate
from app.services.wallet_service import wallet_service

router = APIRouter()


@router.post("/deposit", response_model=WalletResponse)
def create_deposit(payload: DepositCreate):
    try:
        req = wallet_service.request_deposit(payload.user_id, payload.amount)
        return WalletResponse(request_id=req.request_id, status=req.status, message="Deposit request created")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/withdraw", response_model=WalletResponse)
def create_withdraw(payload: WithdrawCreate):
    try:
        req = wallet_service.request_withdraw(payload.user_id, payload.amount, payload.upi_id, payload.upi_name)
        return WalletResponse(request_id=req.request_id, status=req.status, message="Withdraw request created")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
