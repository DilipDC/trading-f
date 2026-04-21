from __future__ import annotations

from uuid import uuid4

from app.core.config import settings
from app.models.entities import WalletAccount, WalletRequest


class WalletService:
    def __init__(self) -> None:
        self.accounts: dict[str, WalletAccount] = {}
        self.requests: dict[str, WalletRequest] = {}

    def _account(self, user_id: str) -> WalletAccount:
        if user_id not in self.accounts:
            self.accounts[user_id] = WalletAccount(user_id=user_id, balance=0)
        return self.accounts[user_id]

    def create_deposit(self, user_id: str, amount: int) -> WalletRequest:
        if not settings.deposit_enabled:
            raise ValueError("Deposit disabled by admin")
        if amount < settings.min_deposit_inr:
            raise ValueError(f"Minimum deposit is ₹{settings.min_deposit_inr}")

        req = WalletRequest(request_id=str(uuid4()), user_id=user_id, amount=amount, request_type="deposit")
        self.requests[req.request_id] = req
        self._account(user_id)
        return req

    def create_withdraw(self, user_id: str, amount: int, upi_id: str, upi_name: str) -> WalletRequest:
        if not settings.withdraw_enabled:
            raise ValueError("Withdraw disabled by admin")

        account = self._account(user_id)
        if amount > account.balance:
            raise ValueError("Insufficient wallet balance")

        req = WalletRequest(
            request_id=str(uuid4()),
            user_id=user_id,
            amount=amount,
            request_type="withdraw",
            upi_id=upi_id,
            upi_name=upi_name,
        )
        self.requests[req.request_id] = req
        return req

    def list_requests(self, status: str | None = None) -> list[WalletRequest]:
        items = list(self.requests.values())
        if status:
            items = [r for r in items if r.status == status]
        return sorted(items, key=lambda i: i.created_at, reverse=True)

    def approve(self, request_id: str) -> WalletRequest:
        req = self.requests[request_id]
        if req.status != "pending":
            return req

        acct = self._account(req.user_id)
        if req.request_type == "deposit":
            acct.balance += req.amount
        elif req.request_type == "withdraw":
            if acct.balance < req.amount:
                raise ValueError("Insufficient balance at approval time")
            acct.balance -= req.amount
        req.status = "approved"
        return req

    def reject(self, request_id: str) -> WalletRequest:
        req = self.requests[request_id]
        req.status = "rejected"
        return req

    def get_balance(self, user_id: str) -> WalletAccount:
        return self._account(user_id)


wallet_service = WalletService()
