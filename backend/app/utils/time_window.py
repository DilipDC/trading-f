from datetime import datetime, timedelta

ONE_HOUR = timedelta(hours=1)


def cutoff_time(now: datetime | None = None) -> datetime:
    current = now or datetime.utcnow()
    return current - ONE_HOUR
