from __future__ import annotations

import asyncio

from app.modules.majors.application.create_major import CreateMajor


class _MemoryMajors:
    def __init__(self):
        self.items = []

    async def list_all(self):
        return list(self.items)

    async def add(self, major):
        self.items.append(major)
        return major


def test_create_major_prefers_code_for_header_safe_id() -> None:
    repo = _MemoryMajors()
    use_case = CreateMajor(repo)

    major = asyncio.run(
        use_case.execute(name="机械设计制造及其自动化", code="080202")
    )

    assert major.id == "major-080202"
    assert major.name == "机械设计制造及其自动化"
