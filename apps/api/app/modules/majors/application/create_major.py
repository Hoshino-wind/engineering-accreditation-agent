"""新建专业。"""

import re

from app.modules.majors.application.ports import MajorRepository
from app.modules.majors.domain.major import Major


class MajorAlreadyExistsError(Exception):
    pass


def _slugify(value: str) -> str:
    base = re.sub(r"[^0-9a-zA-Z]+", "-", value.strip()).strip("-").lower()
    return base or "major"


def _new_id(existing: list[Major], name: str, code: str | None = None) -> str:
    slug = _slugify(code or "") if code else ""
    if not slug:
        slug = _slugify(name)
    candidate = f"major-{slug}"
    used = {m.id for m in existing}
    if candidate not in used:
        return candidate
    for i in range(2, 1000):
        alt = f"major-{slug}-{i}"
        if alt not in used:
            return alt
    return f"major-{slug}-dup"


class CreateMajor:
    def __init__(self, repository: MajorRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        name: str,
        code: str | None = None,
        school_name: str | None = None,
        standard_version: str | None = None,
        description: str | None = None,
    ) -> Major:
        cleaned_name = name.strip()
        if not cleaned_name:
            raise ValueError("专业名称不能为空")
        existing = await self._repository.list_all()
        if any(m.name == cleaned_name for m in existing):
            raise MajorAlreadyExistsError(f"已存在同名专业：{cleaned_name}")
        major = Major(
            id=_new_id(existing, cleaned_name, code),
            code=(code or "").strip(),
            name=cleaned_name,
            school_name=(school_name or "").strip(),
            standard_version=(standard_version or "").strip(),
            description=(description.strip() if description else None),
        )
        return await self._repository.add(major)
