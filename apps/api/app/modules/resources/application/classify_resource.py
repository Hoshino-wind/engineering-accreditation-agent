"""材料分类用例 —— 上传前调用 LLM 判断材料类型，老师确认后再正式入库。

不是替代老师判断，而是预填降低操作成本；老师可修改 category 后再上传。
"""

from app.modules.llm.application.ports import LLMClientPort
from app.modules.llm.domain.models import ClassificationResult, LLMResponse
from app.modules.resources.application.material_text import extract_material_text


class ClassifyResource:
    """调用 LLM 判断材料类型。"""

    def __init__(self, llm: LLMClientPort) -> None:
        self._llm = llm

    async def execute(
        self,
        *,
        file_name: str,
        course: str,
        category: str,
        content: bytes,
    ) -> LLMResponse[ClassificationResult]:
        """根据文件名 + 文件内容提取预览，返回分类结果 + 置信度 + 依据。"""
        text_preview = extract_material_text(file_name, course, category, content)
        return await self._llm.classify_material(file_name, text_preview)
