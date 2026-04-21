from datetime import datetime

from app.services.state import state


class WalletService:
    def _within_hours(self, allowed: tuple[int, int]) -> bool:
        hour = datetime.utcnow().hour
        return allowed[0] <= hour < allowed[1]

    def request_deposit(self, user_id: str, amount: float):
        config = state.config.wallet
        if not state.config.features.deposit_enabled:
            raise ValueError("Deposit disabled")
        if amount < config.min_deposit:
            raise ValueError(f"Minimum deposit is {config.min_deposit}")
        if not self._within_hours(config.deposit_hours):
            raise ValueError("Service Closed")
        return state.create_deposit(user_id, amount)

    def request_withdraw(self, user_id: str, amount: float, upi_id: str, upi_name: str):
        config = state.config.wallet
        if not state.config.features.withdraw_enabled:
            raise ValueError("Withdraw disabled")
        if amount < config.min_withdraw or amount > config.max_withdraw:
            raise ValueError("Withdraw amount outside limits")
        if not self._within_hours(config.withdraw_hours):
            raise ValueError("Service Closed")
        return state.create_withdraw(user_id, amount, upi_id, upi_name)


wallet_service = WalletService()
