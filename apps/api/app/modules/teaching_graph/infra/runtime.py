from datetime import UTC, datetime


class UtcGraphClock:
    def now(self) -> datetime:
        return datetime.now(UTC)
