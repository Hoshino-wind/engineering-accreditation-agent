from pydantic import BaseModel, Field


class ClassifyResourceResponse(BaseModel):
    """材料分类接口的响应。

    上传前调用 LLM 预判文件类型，老师可修改 category 后再正式上传。
    isEvaluationEvidence=True 的材料本轮不进入节点提取主流水线。
    """

    category: str = Field(..., description="材料分类（培养方案/课程大纲/实验指导书/...）")
    confidence: float = Field(..., ge=0.0, le=1.0, description="置信度 0~1")
    reason: str = Field(..., description="判断依据，可溯源")
    isEvaluationEvidence: bool = Field(
        ..., description="是否为评价证据（评分表/学生报告/评价结果）"
    )
    model: str = Field(..., description="实际使用的模型")
    latencyMs: int = Field(..., description="耗时（毫秒）")
