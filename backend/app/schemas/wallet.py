from datetime import datetime
from pydantic import BaseModel, Field
from typing import Literal


class DepositRequestIn(BaseModel):
    user_id: str
    amount: int = Field(ge=100)


class WithdrawRequestIn(BaseModel):
    user_id: str
    amount: int = Field(gt=0)
    upi_id: str
    upi_name: str


class WalletRequestOut(BaseModel):
    request_id: str
    user_id: str
    amount: int
    request_type: Literal["deposit", "withdraw"]
    status: Literal["pending", "approved", "rejected"]
    created_at: datetime


class WalletBalanceOut(BaseModel):
    user_id: str
    balance: int
