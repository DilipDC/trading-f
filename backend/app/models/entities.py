from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class User:
    user_id: str
    name: str
    is_banned: bool = False
    wallet_balance: float = 0.0


@dataclass
class WalletRequest:
    request_id: str
    user_id: str
    amount: float
    status: str
    request_type: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    upi_id: str | None = None
    upi_name: str | None = None
