from app.modules.auth.application.jwt import create_access_token
from app.modules.auth.application.ports import UserProvisioner, UserRepository
from app.modules.auth.domain.user import User


class AuthenticateUser:
    def __init__(
        self,
        repository: UserRepository,
        crypt_context,
        jwt_secret: str,
        jwt_algorithm: str,
        jwt_access_token_ttl_minutes: int,
        repo_manager: UserProvisioner | None = None,
    ) -> None:
        self._repository = repository
        self._crypt_context = crypt_context
        self._jwt_secret = jwt_secret
        self._jwt_algorithm = jwt_algorithm
        self._jwt_access_token_ttl_minutes = jwt_access_token_ttl_minutes
        self._repo_manager = repo_manager

    async def execute(
        self,
        username: str,
        password: str,
    ) -> tuple[User, str, int] | None:
        user = await self._repository.get_by_username(username)
        if user is None:
            return None
        if not self._crypt_context.verify(password, user.password_hash):
            return None
        if self._repo_manager is not None:
            self._repo_manager.provision_user(user.id)
        ttl = self._jwt_access_token_ttl_minutes
        token = create_access_token(
            sub=user.id,
            ttl_minutes=ttl,
            secret=self._jwt_secret,
            algorithm=self._jwt_algorithm,
        )
        expires_in = ttl * 60
        return user, token, expires_in
