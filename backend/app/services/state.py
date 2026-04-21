from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import asdict
from datetime import datetime
from uuid import uuid4

from app.core.config import RuntimeConfig
from app.models.entities import User, WalletRequest
from app.utils.time_window import cutoff_time


class InMemoryState:
    def __init__(self) -> None:
        self.config = RuntimeConfig()
        self.users: dict[str, User] = {
            "u-1": User(user_id="u-1", name="Demo Trader", wallet_balance=25000),
            "u-2": User(user_id="u-2", name="Scalper", wallet_balance=45000),
        }
        self.wallet_requests: dict[str, WalletRequest] = {}
        self.notifications: deque[dict] = deque(maxlen=500)
        self.market_data: dict[str, deque[dict]] = defaultdict(lambda: deque(maxlen=120))

    def create_deposit(self, user_id: str, amount: float) -> WalletRequest:
        req = WalletRequest(
            request_id=str(uuid4()),
            user_id=user_id,
            amount=amount,
            status="pending",
            request_type="deposit",
        )
        self.wallet_requests[req.request_id] = req
        self.notifications.appendleft({"event": "deposit_requested", "request_id": req.request_id})
        return req

    def create_withdraw(self, user_id: str, amount: float, upi_id: str, upi_name: str) -> WalletRequest:
        req = WalletRequest(
            request_id=str(uuid4()),
            user_id=user_id,
            amount=amount,
            status="pending",
            request_type="withdraw",
            upi_id=upi_id,
            upi_name=upi_name,
        )
        self.wallet_requests[req.request_id] = req
        self.notifications.appendleft({"event": "withdraw_requested", "request_id": req.request_id})
        return req

    def resolve_request(self, request_id: str, approve: bool) -> WalletRequest:
        req = self.wallet_requests[request_id]
        req.status = "approved" if approve else "rejected"
        if approve:
            user = self.users[req.user_id]
            if req.request_type == "deposit":
                user.wallet_balance += req.amount
            elif req.request_type == "withdraw":
                if user.wallet_balance < req.amount:
                    req.status = "rejected"
                else:
                    user.wallet_balance -= req.amount
        self.notifications.appendleft({"event": "wallet_request_resolved", "request_id": req.request_id, "status": req.status})
        return req

    def prune_market_history(self, symbol: str) -> None:
        window = self.market_data[symbol]
        cutoff = cutoff_time()
        while window and datetime.fromtimestamp(window[0]["timestamp"]) < cutoff:
            window.popleft()

    def serialize_requests(self) -> list[dict]:
        return [asdict(item) for item in self.wallet_requests.values()]


state = InMemoryState()
