from fastapi import APIRouter, HTTPException

from app.schemas.wallet import DepositRequestIn, WalletBalanceOut, WalletRequestOut, WithdrawRequestIn
from app.services.wallet_service import wallet_service

router = APIRouter()


@router.post("/deposit", response_model=WalletRequestOut)
def create_deposit(payload: DepositRequestIn) -> dict:
    try:
        req = wallet_service.create_deposit(payload.user_id, payload.amount)
        return req.__dict__
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/withdraw", response_model=WalletRequestOut)
def create_withdraw(payload: WithdrawRequestIn) -> dict:
    try:
        req = wallet_service.create_withdraw(payload.user_id, payload.amount, payload.upi_id, payload.upi_name)
        return req.__dict__
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/balance/{user_id}", response_model=WalletBalanceOut)
def balance(user_id: str) -> dict:
    acct = wallet_service.get_balance(user_id)
    return acct.__dict__


@router.get("/requests", response_model=list[WalletRequestOut])
def list_requests(status: str | None = None) -> list[dict]:
    return [r.__dict__ for r in wallet_service.list_requests(status)]
