from __future__ import annotations

import bcrypt


def build_crypt_context():
    try:
        from passlib.context import CryptContext

        ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
        _ = ctx.hash("test")
        return ctx
    except Exception:
        pass

    class _FallbackCryptContext:
        @staticmethod
        def hash(password: str) -> str:
            password_bytes = password.encode("utf-8")[:72]
            salt = bcrypt.gensalt()
            hashed = bcrypt.hashpw(password_bytes, salt)
            return hashed.decode("utf-8")

        @staticmethod
        def verify(password: str, password_hash: str) -> bool:
            try:
                password_bytes = password.encode("utf-8")[:72]
                hash_bytes = password_hash.encode("utf-8")
                return bcrypt.checkpw(password_bytes, hash_bytes)
            except ValueError:
                return False

    return _FallbackCryptContext()
