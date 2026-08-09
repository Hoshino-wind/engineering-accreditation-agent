"""任务取消注册表：按资源 ID 跟踪并取消正在运行的分析任务。

MVP 阶段用于"删除教学资源"场景：用户删除某份材料时，一并取消该材料
正在进行的 AI 分析/解析任务，避免资源删除后仍在后台产生无关结果。
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class CancellationToken:
    resource_id: str
    _event: asyncio.Event = field(default_factory=asyncio.Event)

    @property
    def is_cancelled(self) -> bool:
        return self._event.is_set()

    def check(self) -> None:
        if self._event.is_set():
            raise TaskCancelledError(self.resource_id)

    async def wait(self, timeout: float | None = None) -> None:
        """等待取消信号，常用于异步轮询循环中。"""
        if self._event.is_set():
            raise TaskCancelledError(self.resource_id)
        try:
            await asyncio.wait_for(self._event.wait(), timeout=timeout)
        except TimeoutError:
            return
        # 收到信号后抛出取消异常
        raise TaskCancelledError(self.resource_id)


class TaskCancelledError(Exception):
    """任务被取消的异常。"""

    def __init__(self, resource_id: str) -> None:
        self.resource_id = resource_id
        super().__init__(f"任务已取消: {resource_id}")


class TaskCancellationRegistry:
    """全局任务取消注册表。

    用法：
        token = registry.register(resource_id)
        try:
            ...  # 长任务执行过程中可调用 token.check()
        finally:
            registry.unregister(resource_id)

    删除资源时：
        registry.cancel(resource_id)
    """

    def __init__(self) -> None:
        self._tokens: dict[str, CancellationToken] = {}
        self._lock = asyncio.Lock()

    async def register(self, resource_id: str) -> CancellationToken:
        async with self._lock:
            # 如果已存在，复用并覆盖（旧任务应已被取消）
            if resource_id in self._tokens:
                token = self._tokens[resource_id]
                if not token.is_cancelled:
                    return token
            token = CancellationToken(resource_id=resource_id)
            self._tokens[resource_id] = token
            return token

    async def cancel(self, resource_id: str) -> None:
        async with self._lock:
            token = self._tokens.get(resource_id)
            if token is not None:
                token._event.set()
            else:
                # 没有运行中的任务，先占个位，防止后续任务在取消期间启动
                token = CancellationToken(resource_id=resource_id)
                token._event.set()
                self._tokens[resource_id] = token

    async def is_cancelled(self, resource_id: str) -> bool:
        async with self._lock:
            token = self._tokens.get(resource_id)
            return token is not None and token.is_cancelled

    async def unregister(self, resource_id: str) -> None:
        async with self._lock:
            self._tokens.pop(resource_id, None)

    @asynccontextmanager
    async def track(self, resource_id: str) -> AsyncIterator[CancellationToken]:
        """推荐用法：with registry.track(resource_id) as token: ..."""
        token = await self.register(resource_id)
        try:
            yield token
        finally:
            await self.unregister(resource_id)


# 全局单例
task_registry = TaskCancellationRegistry()
