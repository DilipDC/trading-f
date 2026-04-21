from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

RequestStatus = Literal["pending", "approved", "rejected"]


@dataclass
class WalletRequest:
    request_id: str
    user_id: str
    amount: int
    request_type: Literal["deposit", "withdraw"]
    status: RequestStatus = "pending"
    created_at: datetime = field(default_factory=datetime.utcnow)
    upi_id: str | None = None
    upi_name: str | None = None


@dataclass
class WalletAccount:
    user_id: str
    balance: int = 0
