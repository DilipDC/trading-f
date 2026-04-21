from pydantic import BaseModel, Field


class DepositCreate(BaseModel):
    user_id: str
    amount: float = Field(ge=100)


class WithdrawCreate(BaseModel):
    user_id: str
    amount: float = Field(ge=1)
    upi_id: str
    upi_name: str


class WalletDecision(BaseModel):
    request_id: str
    approve: bool


class WalletResponse(BaseModel):
    request_id: str
    status: str
    message: str
