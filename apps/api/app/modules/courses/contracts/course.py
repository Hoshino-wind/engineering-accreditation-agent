"""课程请求/响应模型。字段名 camelCase，与前端 TS 对齐。"""

from pydantic import BaseModel, Field

from app.modules.courses.domain.course import Course


class CreateCourseRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="课程名称")
    code: str | None = Field(default=None, max_length=50, description="课程代码")
    credits: float | None = Field(default=None, ge=0, description="学分")
    semester: str | None = Field(default=None, max_length=50, description="开课学期")
    description: str | None = Field(default=None, max_length=500, description="课程简介")
    majorId: str = Field(default="major-eie", description="所属专业 ID")


class CourseResponse(BaseModel):
    id: str
    code: str
    name: str
    credits: float | None = None
    semester: str | None = None
    majorId: str
    description: str | None = None
    graphNodeId: str | None = None

    @classmethod
    def from_domain(cls, course: Course) -> "CourseResponse":
        return cls(
            id=course.id,
            code=course.code,
            name=course.name,
            credits=course.credits,
            semester=course.semester,
            majorId=course.major_id,
            description=course.description,
            graphNodeId=course.graph_node_id,
        )
