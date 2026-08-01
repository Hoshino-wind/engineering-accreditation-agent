"""编排模块端口：多智能体编排器的抽象接口。

路由层依赖该端口（而非具体 LangGraph 实现），具体实现位于 infra 层并在 main.py 装配。
审核决策以纯 dict 传入（relation_id / decision / strength），避免路由层依赖 domain 模型。
"""

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from typing import Any

from app.modules.orchestration.domain.models import AgentRun


class AgentOrchestratorPort(ABC):
    """驱动「Supervisor + 专项智能体」协作流程的编排器接口。"""

    @abstractmethod
    async def start_run(
        self,
        goal: str,
        material_category: str | None = None,
        material_name: str | None = None,
    ) -> AgentRun:
        """启动一次新的多智能体运行，执行到人工审核网关处暂停。"""

    @abstractmethod
    async def get_run(self, run_id: str) -> AgentRun | None:
        """按 ID 获取运行快照。"""

    @abstractmethod
    async def list_runs(self) -> list[AgentRun]:
        """列出所有运行（按创建时间倒序）。"""

    @abstractmethod
    async def resume_review(self, run_id: str, decisions: list[dict[str, Any]]) -> AgentRun | None:
        """提交教师对推断关系的审核决策，并恢复运行直至完成。"""

    @abstractmethod
    def stream_events(self, run_id: str) -> AsyncIterator[dict[str, Any]]:
        """以异步流的形式产出运行事件（供 SSE 推送）。"""
