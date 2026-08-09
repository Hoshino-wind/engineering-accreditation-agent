"""专业请求/响应模型。字段名 camelCase，与前端 TS 对齐。"""

from pydantic import BaseModel, Field

from app.modules.majors.domain.major import Major


class CreateMajorRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="专业名称")
    code: str | None = Field(default=None, max_length=50, description="专业代码")
    schoolName: str | None = Field(default=None, max_length=100, description="所属学校")
    standardVersion: str | None = Field(default=None, max_length=50, description="认证标准版本")
    description: str | None = Field(default=None, max_length=500, description="专业简介")


class MajorResponse(BaseModel):
    id: str
    code: str
    name: str
    schoolName: str
    standardVersion: str
    description: str | None = None

    @classmethod
    def from_domain(cls, major: Major) -> "MajorResponse":
        return cls(
            id=major.id,
            code=major.code,
            name=major.name,
            schoolName=major.school_name,
            standardVersion=major.standard_version,
            description=major.description,
        )
