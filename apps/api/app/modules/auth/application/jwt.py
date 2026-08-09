from datetime import UTC, datetime, timedelta

import jwt


def create_access_token(
    sub: str,
    ttl_minutes: int,
    secret: str,
    algorithm: str,
) -> str:
    now = datetime.now(UTC)
    expire = now + timedelta(minutes=ttl_minutes)
    payload = {
        "sub": sub,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_token(
    token: str,
    secret: str,
    algorithm: str,
) -> dict:
    return jwt.decode(token, secret, algorithms=[algorithm])
