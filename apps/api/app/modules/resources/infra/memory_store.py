# -*- coding: utf-8 -*-
from dataclasses import replace

from app.modules.resources.domain.resource import (
    EvidenceFragment,
    ProcessingStage,
    TeachingResource,
    TeachingResourceSensitivity,
    TeachingResourceStatus,
    TeachingResourceType,
)

_SEED_RESOURCES: list[TeachingResource] = [
    TeachingResource(
        id="resource-ds-syllabus",
        name="《数据结构》课程教学大纲",
        file_name="数据结构课程教学大纲-2025版.pdf",
        course="数据结构",
        resource_type=TeachingResourceType.SYLLABUS,
        version="v3",
        format="PDF",
        status=TeachingResourceStatus.READY,
        size="2.8 MB",
        sensitivity=TeachingResourceSensitivity.INTERNAL,
        updated_at="2026-07-26 16:42",
        owner="李老师",
        hash="SHA256 83d4…b719",
        next_action="可进入 M4 识别",
        source_coverage=96,
        page_count=32,
        evidence_fragments=(
            EvidenceFragment(
                id="fragment-ds-syllabus-01",
                coordinate="第 6 页 · 第 2 段",
                type="段落",
                preview="通过线性表、树和图的实验，使学生能够选择适当的数据结构解决实际问题。",
                hash="7fe1…0ab4",
            ),
            EvidenceFragment(
                id="fragment-ds-syllabus-02",
                coordinate="第 12 页 · 表 3-2 · 第 4 行",
                type="表格",
                preview="实验项目：二叉树遍历与应用；对应课程目标：CO2、CO3。",
                hash="d204…91c6",
            ),
        ),
        processing_stages=(
            ProcessingStage(label="安全校验", detail="文件头、MIME 与哈希一致", status="finish"),
            ProcessingStage(label="内容解析", detail="32 页文本与 7 个表格已提取", status="finish"),
            ProcessingStage(label="敏感检测", detail="未发现个人敏感信息", status="finish"),
            ProcessingStage(label="分类确认", detail="课程与材料类型已确认", status="finish"),
        ),
    ),
    TeachingResource(
        id="resource-ds-guide",
        name="数据结构实验指导书",
        file_name="数据结构实验指导书-v2.docx",
        course="数据结构",
        resource_type=TeachingResourceType.LAB_GUIDE,
        version="v2",
        format="DOCX",
        status=TeachingResourceStatus.READY,
        size="6.4 MB",
        sensitivity=TeachingResourceSensitivity.INTERNAL,
        updated_at="2026-07-25 10:18",
        owner="李老师",
        hash="SHA256 6ae2…af03",
        next_action="可进入 M4 识别",
        source_coverage=93,
        page_count=84,
        evidence_fragments=(
            EvidenceFragment(
                id="fragment-ds-guide-01",
                coordinate="第 14 页 · 实验二 · 目标",
                type="段落",
                preview="掌握栈与队列的基本操作，并能用于表达式求值和迷宫求解。",
                hash="fe34…6f20",
            ),
            EvidenceFragment(
                id="fragment-ds-guide-02",
                coordinate="第 41 页 · 表 5-1",
                type="表格",
                preview="关键评分点：算法正确性 40%，复杂度分析 20%，实验报告 40%。",
                hash="c551…26b0",
            ),
        ),
        processing_stages=(
            ProcessingStage(label="安全校验", detail="文件结构与哈希校验通过", status="finish"),
            ProcessingStage(label="内容解析", detail="84 页文本与 15 个表格已提取", status="finish"),
            ProcessingStage(label="敏感检测", detail="未发现个人敏感信息", status="finish"),
            ProcessingStage(label="分类确认", detail="课程与材料类型已确认", status="finish"),
        ),
    ),
    TeachingResource(
        id="resource-ds-rubric",
        name="数据结构综合实验评分表",
        file_name="综合实验评分表-2025秋.xlsx",
        course="数据结构",
        resource_type=TeachingResourceType.RUBRIC,
        version="v4",
        format="XLSX",
        status=TeachingResourceStatus.READY,
        size="780 KB",
        sensitivity=TeachingResourceSensitivity.RESTRICTED,
        updated_at="2026-07-24 14:05",
        owner="王老师",
        hash="SHA256 21f7…d38c",
        next_action="核对受限访问范围",
        source_coverage=100,
        evidence_fragments=(
            EvidenceFragment(
                id="fragment-ds-rubric-01",
                coordinate="工作表「评分标准」 · B3:F12",
                type="表格",
                preview="问题分析、数据结构选择、算法实现、测试验证和报告规范五类评分项。",
                hash="aa27…0dd9",
            ),
        ),
        processing_stages=(
            ProcessingStage(label="安全校验", detail="工作簿结构与哈希校验通过", status="finish"),
            ProcessingStage(label="内容解析", detail="6 个工作表与 32 个评分项已提取", status="finish"),
            ProcessingStage(label="敏感检测", detail="含评分数据，已切换受控视图", status="finish"),
            ProcessingStage(label="分类确认", detail="课程与材料类型已确认", status="finish"),
        ),
    ),
    TeachingResource(
        id="resource-se-guide",
        name="软件工程课程设计指导书",
        file_name="软件工程课程设计指导书-v2.pdf",
        course="软件工程",
        resource_type=TeachingResourceType.LAB_GUIDE,
        version="v2",
        format="PDF",
        status=TeachingResourceStatus.PROCESSING,
        size="12.6 MB",
        sensitivity=TeachingResourceSensitivity.INTERNAL,
        updated_at="2026-07-28 09:34",
        owner="赵老师",
        hash="SHA256 bd8e…908f",
        next_action="等待表格解析完成",
        source_coverage=58,
        page_count=116,
        evidence_fragments=(
            EvidenceFragment(
                id="fragment-se-guide-01",
                coordinate="第 8 页 · 第 3 段",
                type="段落",
                preview="学生应完成需求分析、架构设计、迭代实现与测试验收。",
                hash="e8b2…671a",
            ),
        ),
        processing_stages=(
            ProcessingStage(label="安全校验", detail="文件头、MIME 与哈希一致", status="finish"),
            ProcessingStage(label="内容解析", detail="正在解析附录中的 18 个复杂表格", status="process"),
            ProcessingStage(label="敏感检测", detail="等待内容解析完成", status="wait"),
            ProcessingStage(label="分类确认", detail="等待处理完成", status="wait"),
        ),
    ),
    TeachingResource(
        id="resource-os-rubric",
        name="操作系统实验评分记录",
        file_name="操作系统实验评分记录-扫描版.pdf",
        course="操作系统",
        resource_type=TeachingResourceType.RUBRIC,
        version="v1",
        format="PDF",
        status=TeachingResourceStatus.FAILED,
        size="18.2 MB",
        sensitivity=TeachingResourceSensitivity.RESTRICTED,
        updated_at="2026-07-28 08:12",
        owner="周老师",
        hash="SHA256 71c0…02ea",
        next_action="重新扫描后发起解析",
        source_coverage=12,
        page_count=47,
        failure_reason="第 9—31 页清晰度低于 OCR 阈值，无法稳定定位评分项。",
        processing_stages=(
            ProcessingStage(label="安全校验", detail="文件安全校验通过", status="finish"),
            ProcessingStage(label="内容解析", detail="23 页 OCR 质量不足，任务已停止", status="error"),
            ProcessingStage(label="敏感检测", detail="等待重新解析", status="wait"),
            ProcessingStage(label="分类确认", detail="等待重新解析", status="wait"),
        ),
    ),
]


class InMemoryResourceRepository:
    def __init__(self, with_seed: bool = True) -> None:
        if with_seed:
            self._store: dict[str, TeachingResource] = {
                r.id: r for r in _SEED_RESOURCES
            }
        else:
            self._store: dict[str, TeachingResource] = {}

    def clone(self) -> "InMemoryResourceRepository":
        new_repo = InMemoryResourceRepository(with_seed=False)
        new_repo._store = {
            rid: replace(resource) for rid, resource in self._store.items()
        }
        return new_repo

    async def list_all(
        self,
        *,
        course: str | None = None,
        status: str | None = None,
        resource_type: str | None = None,
    ) -> list[TeachingResource]:
        results = list(self._store.values())
        if course:
            results = [r for r in results if r.course == course]
        if status:
            results = [r for r in results if r.status == status]
        if resource_type:
            results = [r for r in results if r.resource_type == resource_type]
        return results

    async def get_by_id(self, resource_id: str) -> TeachingResource | None:
        return self._store.get(resource_id)
