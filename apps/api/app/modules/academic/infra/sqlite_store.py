import hashlib
import re
import sqlite3
from pathlib import Path
from typing import Any

from app.modules.academic.domain import (
    AcademicCatalog,
    AcademicProgram,
    CompetencyIndicator,
    Course,
    CourseObjective,
    ExperimentProject,
    GraduationRequirement,
    RubricItem,
    SourceMaterial,
    SupportLink,
)


class SQLiteAcademicCatalogRepository:
    def __init__(self, user_id: str, base_dir: Path | None = None) -> None:
        api_root = Path(__file__).resolve().parents[4]
        self._repo_root = Path(__file__).resolve().parents[6]
        self._base_dir = base_dir or api_root / "var"
        self._db_path = self._base_dir / "ea_mvp.sqlite3"
        self._user_id = user_id
        self._base_dir.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()
        self._ensure_seed()

    async def get_catalog(self) -> AcademicCatalog:
        with self._connect() as conn:
            program_row = conn.execute(
                """
                select * from academic_programs
                where user_id = ?
                order by code
                limit 1
                """,
                (self._user_id,),
            ).fetchone()
            course_rows = conn.execute(
                """
                select * from academic_courses
                where user_id = ?
                order by code
                """,
                (self._user_id,),
            ).fetchall()
            requirement_rows = conn.execute(
                """
                select * from graduation_requirements
                where user_id = ?
                order by code
                """,
                (self._user_id,),
            ).fetchall()
            indicator_rows = conn.execute(
                """
                select * from competency_indicators
                where user_id = ?
                order by code
                """,
                (self._user_id,),
            ).fetchall()
            objective_rows = conn.execute(
                """
                select * from course_objectives
                where user_id = ?
                order by course_id, code
                """,
                (self._user_id,),
            ).fetchall()
            experiment_rows = conn.execute(
                """
                select * from experiment_projects
                where user_id = ?
                order by course_id, code
                """,
                (self._user_id,),
            ).fetchall()
            rubric_rows = conn.execute(
                """
                select * from rubric_items
                where user_id = ?
                order by course_id, code
                """,
                (self._user_id,),
            ).fetchall()
            source_rows = conn.execute(
                """
                select * from source_materials
                where user_id = ?
                order by course_id, file_name
                """,
                (self._user_id,),
            ).fetchall()
            link_rows = conn.execute(
                """
                select * from academic_support_links
                where user_id = ?
                order by source_type, source_id, target_indicator_id
                """,
                (self._user_id,),
            ).fetchall()

        return AcademicCatalog(
            program=_row_to_program(program_row) if program_row else None,
            courses=[_row_to_course(row) for row in course_rows],
            graduation_requirements=[_row_to_requirement(row) for row in requirement_rows],
            indicators=[_row_to_indicator(row) for row in indicator_rows],
            objectives=[_row_to_objective(row) for row in objective_rows],
            experiments=[_row_to_experiment(row) for row in experiment_rows],
            rubric_items=[_row_to_rubric_item(row) for row in rubric_rows],
            source_materials=[_row_to_source_material(row) for row in source_rows],
            support_links=[_row_to_support_link(row) for row in link_rows],
        )

    async def upsert_program(self, program: AcademicProgram) -> AcademicProgram:
        with self._connect() as conn:
            conn.execute(
                """
                insert into academic_programs (
                    id, user_id, code, name, discipline, degree, owner,
                    evaluation_cycle, status
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict(user_id, id) do update set
                    code = excluded.code,
                    name = excluded.name,
                    discipline = excluded.discipline,
                    degree = excluded.degree,
                    owner = excluded.owner,
                    evaluation_cycle = excluded.evaluation_cycle,
                    status = excluded.status
                """,
                (
                    program.id,
                    self._user_id,
                    program.code,
                    program.name,
                    program.discipline,
                    program.degree,
                    program.owner,
                    program.evaluation_cycle,
                    program.status,
                ),
            )
        return program

    async def get_course(self, course_id: str) -> Course | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                select * from academic_courses
                where user_id = ? and id = ?
                """,
                (self._user_id, course_id),
            ).fetchone()
        return _row_to_course(row) if row else None

    async def upsert_course(self, course: Course) -> Course:
        with self._connect() as conn:
            conn.execute(
                """
                insert into academic_courses (
                    id, user_id, program_id, code, name, category, term,
                    credit_hours, owner, status
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict(user_id, id) do update set
                    program_id = excluded.program_id,
                    code = excluded.code,
                    name = excluded.name,
                    category = excluded.category,
                    term = excluded.term,
                    credit_hours = excluded.credit_hours,
                    owner = excluded.owner,
                    status = excluded.status
                """,
                (
                    course.id,
                    self._user_id,
                    course.program_id,
                    course.code,
                    course.name,
                    course.category,
                    course.term,
                    course.credit_hours,
                    course.owner,
                    course.status,
                ),
            )
        return course

    async def get_requirement(
        self,
        requirement_id: str,
    ) -> GraduationRequirement | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                select * from graduation_requirements
                where user_id = ? and id = ?
                """,
                (self._user_id, requirement_id),
            ).fetchone()
        return _row_to_requirement(row) if row else None

    async def upsert_requirement(
        self,
        requirement: GraduationRequirement,
    ) -> GraduationRequirement:
        with self._connect() as conn:
            conn.execute(
                """
                insert into graduation_requirements (
                    id, user_id, program_id, code, title, description
                ) values (?, ?, ?, ?, ?, ?)
                on conflict(user_id, id) do update set
                    program_id = excluded.program_id,
                    code = excluded.code,
                    title = excluded.title,
                    description = excluded.description
                """,
                (
                    requirement.id,
                    self._user_id,
                    requirement.program_id,
                    requirement.code,
                    requirement.title,
                    requirement.description,
                ),
            )
        return requirement

    async def get_indicator(self, indicator_id: str) -> CompetencyIndicator | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                select * from competency_indicators
                where user_id = ? and id = ?
                """,
                (self._user_id, indicator_id),
            ).fetchone()
        return _row_to_indicator(row) if row else None

    async def upsert_indicator(
        self,
        indicator: CompetencyIndicator,
    ) -> CompetencyIndicator:
        with self._connect() as conn:
            conn.execute(
                """
                insert into competency_indicators (
                    id, user_id, requirement_id, code, title, description
                ) values (?, ?, ?, ?, ?, ?)
                on conflict(user_id, id) do update set
                    requirement_id = excluded.requirement_id,
                    code = excluded.code,
                    title = excluded.title,
                    description = excluded.description
                """,
                (
                    indicator.id,
                    self._user_id,
                    indicator.requirement_id,
                    indicator.code,
                    indicator.title,
                    indicator.description,
                ),
            )
        return indicator

    async def get_objective(self, objective_id: str) -> CourseObjective | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                select * from course_objectives
                where user_id = ? and id = ?
                """,
                (self._user_id, objective_id),
            ).fetchone()
        return _row_to_objective(row) if row else None

    async def upsert_objective(
        self,
        objective: CourseObjective,
    ) -> CourseObjective:
        with self._connect() as conn:
            conn.execute(
                """
                insert into course_objectives (
                    id, user_id, course_id, code, title, description
                ) values (?, ?, ?, ?, ?, ?)
                on conflict(user_id, id) do update set
                    course_id = excluded.course_id,
                    code = excluded.code,
                    title = excluded.title,
                    description = excluded.description
                """,
                (
                    objective.id,
                    self._user_id,
                    objective.course_id,
                    objective.code,
                    objective.title,
                    objective.description,
                ),
            )
        return objective

    async def get_experiment(self, experiment_id: str) -> ExperimentProject | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                select * from experiment_projects
                where user_id = ? and id = ?
                """,
                (self._user_id, experiment_id),
            ).fetchone()
        return _row_to_experiment(row) if row else None

    async def upsert_experiment(
        self,
        experiment: ExperimentProject,
    ) -> ExperimentProject:
        with self._connect() as conn:
            conn.execute(
                """
                insert into experiment_projects (
                    id, user_id, course_id, code, title, description,
                    environment, source_material_id
                ) values (?, ?, ?, ?, ?, ?, ?, ?)
                on conflict(user_id, id) do update set
                    course_id = excluded.course_id,
                    code = excluded.code,
                    title = excluded.title,
                    description = excluded.description,
                    environment = excluded.environment,
                    source_material_id = excluded.source_material_id
                """,
                (
                    experiment.id,
                    self._user_id,
                    experiment.course_id,
                    experiment.code,
                    experiment.title,
                    experiment.description,
                    experiment.environment,
                    experiment.source_material_id,
                ),
            )
        return experiment

    async def get_rubric_item(self, item_id: str) -> RubricItem | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                select * from rubric_items
                where user_id = ? and id = ?
                """,
                (self._user_id, item_id),
            ).fetchone()
        return _row_to_rubric_item(row) if row else None

    async def upsert_rubric_item(self, item: RubricItem) -> RubricItem:
        with self._connect() as conn:
            conn.execute(
                """
                insert into rubric_items (
                    id, user_id, course_id, experiment_id, indicator_id,
                    code, title, points
                ) values (?, ?, ?, ?, ?, ?, ?, ?)
                on conflict(user_id, id) do update set
                    course_id = excluded.course_id,
                    experiment_id = excluded.experiment_id,
                    indicator_id = excluded.indicator_id,
                    code = excluded.code,
                    title = excluded.title,
                    points = excluded.points
                """,
                (
                    item.id,
                    self._user_id,
                    item.course_id,
                    item.experiment_id,
                    item.indicator_id,
                    item.code,
                    item.title,
                    item.points,
                ),
            )
        return item

    async def upsert_support_link(self, link: SupportLink) -> SupportLink:
        with self._connect() as conn:
            conn.execute(
                """
                insert into academic_support_links (
                    id, user_id, source_type, source_id, target_indicator_id,
                    relation, strength, evidence, status
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict(user_id, id) do update set
                    source_type = excluded.source_type,
                    source_id = excluded.source_id,
                    target_indicator_id = excluded.target_indicator_id,
                    relation = excluded.relation,
                    strength = excluded.strength,
                    evidence = excluded.evidence,
                    status = excluded.status
                """,
                (
                    link.id,
                    self._user_id,
                    link.source_type,
                    link.source_id,
                    link.target_indicator_id,
                    link.relation,
                    link.strength,
                    link.evidence,
                    link.status,
                ),
            )
        return link

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                create table if not exists academic_programs (
                    id text not null,
                    user_id text not null,
                    code text not null,
                    name text not null,
                    discipline text not null,
                    degree text not null,
                    owner text not null,
                    evaluation_cycle text not null,
                    status text not null,
                    primary key(user_id, id)
                )
                """
            )
            conn.execute(
                """
                create table if not exists academic_courses (
                    id text not null,
                    user_id text not null,
                    program_id text not null,
                    code text not null,
                    name text not null,
                    category text not null,
                    term text not null,
                    credit_hours real not null,
                    owner text not null,
                    status text not null,
                    primary key(user_id, id)
                )
                """
            )
            conn.execute(
                """
                create table if not exists graduation_requirements (
                    id text not null,
                    user_id text not null,
                    program_id text not null,
                    code text not null,
                    title text not null,
                    description text not null,
                    primary key(user_id, id)
                )
                """
            )
            conn.execute(
                """
                create table if not exists competency_indicators (
                    id text not null,
                    user_id text not null,
                    requirement_id text not null,
                    code text not null,
                    title text not null,
                    description text not null,
                    primary key(user_id, id)
                )
                """
            )
            conn.execute(
                """
                create table if not exists course_objectives (
                    id text not null,
                    user_id text not null,
                    course_id text not null,
                    code text not null,
                    title text not null,
                    description text not null,
                    primary key(user_id, id)
                )
                """
            )
            conn.execute(
                """
                create table if not exists experiment_projects (
                    id text not null,
                    user_id text not null,
                    course_id text not null,
                    code text not null,
                    title text not null,
                    description text not null,
                    environment text not null,
                    source_material_id text not null,
                    primary key(user_id, id)
                )
                """
            )
            conn.execute(
                """
                create table if not exists rubric_items (
                    id text not null,
                    user_id text not null,
                    course_id text not null,
                    experiment_id text,
                    indicator_id text not null,
                    code text not null,
                    title text not null,
                    points real not null,
                    primary key(user_id, id)
                )
                """
            )
            conn.execute(
                """
                create table if not exists source_materials (
                    id text not null,
                    user_id text not null,
                    course_id text not null,
                    file_name text not null,
                    material_type text not null,
                    source_path text not null,
                    checksum text not null,
                    status text not null,
                    primary key(user_id, id)
                )
                """
            )
            conn.execute(
                """
                create table if not exists academic_support_links (
                    id text not null,
                    user_id text not null,
                    source_type text not null,
                    source_id text not null,
                    target_indicator_id text not null,
                    relation text not null,
                    strength text not null,
                    evidence text not null,
                    status text not null,
                    primary key(user_id, id)
                )
                """
            )
            conn.execute(
                """
                create index if not exists idx_academic_courses_user_program
                on academic_courses(user_id, program_id, code)
                """
            )
            conn.execute(
                """
                create index if not exists idx_academic_links_user_target
                on academic_support_links(user_id, target_indicator_id)
                """
            )

    def _ensure_seed(self) -> None:
        with self._connect() as conn:
            existing = conn.execute(
                "select count(*) from academic_programs where user_id = ?",
                (self._user_id,),
            ).fetchone()[0]
            if existing:
                return
            seed = _build_seed(self._repo_root)
            _insert_program(conn, self._user_id, seed["program"])
            for course in seed["courses"]:
                _insert_course(conn, self._user_id, course)
            for requirement in seed["requirements"]:
                _insert_requirement(conn, self._user_id, requirement)
            for indicator in seed["indicators"]:
                _insert_indicator(conn, self._user_id, indicator)
            for objective in seed["objectives"]:
                _insert_objective(conn, self._user_id, objective)
            for experiment in seed["experiments"]:
                _insert_experiment(conn, self._user_id, experiment)
            for rubric_item in seed["rubric_items"]:
                _insert_rubric_item(conn, self._user_id, rubric_item)
            for source_material in seed["source_materials"]:
                _insert_source_material(conn, self._user_id, source_material)
            for support_link in seed["support_links"]:
                _insert_support_link(conn, self._user_id, support_link)


def _build_seed(repo_root: Path) -> dict[str, Any]:
    material_path = repo_root / "docs" / "demo-materials" / "嵌入式系统原理课程大纲.txt"
    material_text = _read_text(material_path)
    course_name = _extract_line_value(material_text, "课程名称") or "嵌入式系统原理"
    course_objective = (
        _extract_line_value(material_text, "课程目标")
        or "学生能够理解嵌入式系统基本组成，完成工程工具链下的综合设计。"
    )
    experiments = _extract_experiments(material_text)
    indicators = _extract_indicator_codes(material_text) or ["C-05-01", "C-03-01"]
    checksum = _checksum(material_text or course_name)

    program = AcademicProgram(
        id="program-ee-embedded",
        code="EE-EMB",
        name="电子信息工程（嵌入式）",
        discipline="电子信息类",
        degree="工学学士",
        owner="专业负责人",
        evaluation_cycle="2025-2026 学年试点",
        status="pilot",
    )
    course = Course(
        id="course-embedded-systems",
        program_id=program.id,
        code="C-EMB-01",
        name=course_name,
        category="专业核心课",
        term="2025-2026-1",
        credit_hours=48.0,
        owner="张老师",
        status="active",
    )
    requirements = [
        GraduationRequirement(
            id="gr-03",
            program_id=program.id,
            code="GR-03",
            title="设计/开发解决方案",
            description="能够针对复杂工程问题设计满足特定需求的系统、单元或流程。",
        ),
        GraduationRequirement(
            id="gr-05",
            program_id=program.id,
            code="GR-05",
            title="使用现代工具",
            description="能够选择与使用恰当的现代工程工具和信息技术工具。",
        ),
    ]
    indicator_rows = [
        CompetencyIndicator(
            id="indicator-c-03-01",
            requirement_id="gr-03",
            code="C-03-01",
            title="系统设计方法",
            description="能够说明系统设计方案、实验步骤和测试结果。",
        ),
        CompetencyIndicator(
            id="indicator-c-05-01",
            requirement_id="gr-05",
            code="C-05-01",
            title="现代工具选择与使用",
            description="能够使用开发板、调试工具链和测试工具完成实验任务。",
        ),
    ]
    objective = CourseObjective(
        id="objective-emb-01",
        course_id=course.id,
        code="CO-EMB-01",
        title="嵌入式系统综合设计",
        description=course_objective,
    )
    source_material = SourceMaterial(
        id="source-embedded-syllabus",
        course_id=course.id,
        file_name=material_path.name,
        material_type="课程大纲",
        source_path=str(material_path),
        checksum=checksum,
        status="seeded",
    )
    experiment_rows = [
        ExperimentProject(
            id=f"experiment-emb-{index:02d}",
            course_id=course.id,
            code=f"EXP-EMB-{index:02d}",
            title=title,
            description=description,
            environment="STM32 开发板、GPIO、定时器、ADC、串口调试工具链",
            source_material_id=source_material.id,
        )
        for index, (title, description) in enumerate(experiments, start=1)
    ]
    rubric_items = [
        RubricItem(
            id="rubric-emb-01",
            course_id=course.id,
            experiment_id=experiment_rows[0].id if experiment_rows else None,
            indicator_id="indicator-c-05-01",
            code="RUB-EMB-01",
            title="工具链配置、调试记录和实验过程",
            points=30.0,
        ),
        RubricItem(
            id="rubric-emb-02",
            course_id=course.id,
            experiment_id=experiment_rows[1].id if len(experiment_rows) > 1 else None,
            indicator_id="indicator-c-03-01",
            code="RUB-EMB-02",
            title="系统设计方案、测试结果和结果分析",
            points=40.0,
        ),
        RubricItem(
            id="rubric-emb-03",
            course_id=course.id,
            experiment_id=None,
            indicator_id="indicator-c-05-01",
            code="RUB-EMB-03",
            title="课程综合报告与工程规范表达",
            points=30.0,
        ),
    ]
    support_links = [
        SupportLink(
            id="link-course-emb-c0501",
            source_type="course",
            source_id=course.id,
            target_indicator_id="indicator-c-05-01",
            relation="supports",
            strength="strong" if "C-05-01" in indicators else "medium",
            evidence="课程大纲明确列出 GPIO、定时器、ADC、串口通信和工具链调试任务。",
            status="seeded",
        ),
        SupportLink(
            id="link-course-emb-c0301",
            source_type="course",
            source_id=course.id,
            target_indicator_id="indicator-c-03-01",
            relation="supports",
            strength="medium",
            evidence="课程目标和实验任务要求说明系统设计方案与测试结果。",
            status="seeded",
        ),
        SupportLink(
            id="link-exp-emb-01-c0501",
            source_type="experiment",
            source_id="experiment-emb-01",
            target_indicator_id="indicator-c-05-01",
            relation="supports",
            strength="strong",
            evidence="实验一要求使用 STM32 开发板完成 LED、按键中断和定时器控制。",
            status="seeded",
        ),
        SupportLink(
            id="link-exp-emb-02-c0301",
            source_type="experiment",
            source_id="experiment-emb-02",
            target_indicator_id="indicator-c-03-01",
            relation="supports",
            strength="medium",
            evidence="实验二要求完成 ADC 数据采集、串口输出、滤波处理和测试结果说明。",
            status="seeded",
        ),
    ]

    return {
        "program": program,
        "courses": [course],
        "requirements": requirements,
        "indicators": indicator_rows,
        "objectives": [objective],
        "experiments": experiment_rows,
        "rubric_items": rubric_items,
        "source_materials": [source_material],
        "support_links": support_links,
    }


def _read_text(path: Path) -> str:
    if not path.exists():
        return ""
    raw = path.read_bytes()
    for encoding in ("utf-8-sig", "utf-8", "gb18030"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="ignore")


def _extract_line_value(text: str, label: str) -> str | None:
    match = re.search(rf"^{re.escape(label)}[:：]\s*(.+)$", text, flags=re.MULTILINE)
    return match.group(1).strip() if match else None


def _extract_experiments(text: str) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    pattern = re.compile(
        r"实验[一二三四五六七八九十\d]+[:：]\s*(?P<title>[^\n\r]+)"
        r"(?:\s*实验任务[:：]\s*(?P<task>[^\n\r]+))?",
        flags=re.MULTILINE,
    )
    for match in pattern.finditer(text):
        rows.append(
            (
                match.group("title").strip(),
                (match.group("task") or "由课程资料导入，待教师补充实验目标和评分细则。").strip(),
            )
        )
    if rows:
        return rows
    return [
        (
            "GPIO 与定时器综合实验",
            "使用 STM32 开发板完成 LED 流水灯、按键中断和定时器控制。",
        ),
        (
            "传感器数据采集实验",
            "完成 ADC 数据采集、串口输出和简单滤波处理，说明系统设计方案。",
        ),
    ]


def _extract_indicator_codes(text: str) -> list[str]:
    values: list[str] = []
    for code in re.findall(r"C-\d{2}-\d{2}", text):
        if code not in values:
            values.append(code)
    return values


def _checksum(text: str) -> str:
    return f"SHA256 {hashlib.sha256(text.encode('utf-8')).hexdigest()[:16]}"


def _insert_program(
    conn: sqlite3.Connection,
    user_id: str,
    program: AcademicProgram,
) -> None:
    conn.execute(
        """
        insert into academic_programs (
            id, user_id, code, name, discipline, degree, owner, evaluation_cycle, status
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            program.id,
            user_id,
            program.code,
            program.name,
            program.discipline,
            program.degree,
            program.owner,
            program.evaluation_cycle,
            program.status,
        ),
    )


def _insert_course(conn: sqlite3.Connection, user_id: str, course: Course) -> None:
    conn.execute(
        """
        insert into academic_courses (
            id, user_id, program_id, code, name, category, term, credit_hours, owner, status
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            course.id,
            user_id,
            course.program_id,
            course.code,
            course.name,
            course.category,
            course.term,
            course.credit_hours,
            course.owner,
            course.status,
        ),
    )


def _insert_requirement(
    conn: sqlite3.Connection,
    user_id: str,
    requirement: GraduationRequirement,
) -> None:
    conn.execute(
        """
        insert into graduation_requirements (
            id, user_id, program_id, code, title, description
        ) values (?, ?, ?, ?, ?, ?)
        """,
        (
            requirement.id,
            user_id,
            requirement.program_id,
            requirement.code,
            requirement.title,
            requirement.description,
        ),
    )


def _insert_indicator(
    conn: sqlite3.Connection,
    user_id: str,
    indicator: CompetencyIndicator,
) -> None:
    conn.execute(
        """
        insert into competency_indicators (
            id, user_id, requirement_id, code, title, description
        ) values (?, ?, ?, ?, ?, ?)
        """,
        (
            indicator.id,
            user_id,
            indicator.requirement_id,
            indicator.code,
            indicator.title,
            indicator.description,
        ),
    )


def _insert_objective(
    conn: sqlite3.Connection,
    user_id: str,
    objective: CourseObjective,
) -> None:
    conn.execute(
        """
        insert into course_objectives (
            id, user_id, course_id, code, title, description
        ) values (?, ?, ?, ?, ?, ?)
        """,
        (
            objective.id,
            user_id,
            objective.course_id,
            objective.code,
            objective.title,
            objective.description,
        ),
    )


def _insert_experiment(
    conn: sqlite3.Connection,
    user_id: str,
    experiment: ExperimentProject,
) -> None:
    conn.execute(
        """
        insert into experiment_projects (
            id, user_id, course_id, code, title, description, environment, source_material_id
        ) values (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            experiment.id,
            user_id,
            experiment.course_id,
            experiment.code,
            experiment.title,
            experiment.description,
            experiment.environment,
            experiment.source_material_id,
        ),
    )


def _insert_rubric_item(
    conn: sqlite3.Connection,
    user_id: str,
    item: RubricItem,
) -> None:
    conn.execute(
        """
        insert into rubric_items (
            id, user_id, course_id, experiment_id, indicator_id, code, title, points
        ) values (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            item.id,
            user_id,
            item.course_id,
            item.experiment_id,
            item.indicator_id,
            item.code,
            item.title,
            item.points,
        ),
    )


def _insert_source_material(
    conn: sqlite3.Connection,
    user_id: str,
    material: SourceMaterial,
) -> None:
    conn.execute(
        """
        insert into source_materials (
            id, user_id, course_id, file_name, material_type, source_path, checksum, status
        ) values (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            material.id,
            user_id,
            material.course_id,
            material.file_name,
            material.material_type,
            material.source_path,
            material.checksum,
            material.status,
        ),
    )


def _insert_support_link(
    conn: sqlite3.Connection,
    user_id: str,
    link: SupportLink,
) -> None:
    conn.execute(
        """
        insert into academic_support_links (
            id, user_id, source_type, source_id, target_indicator_id,
            relation, strength, evidence, status
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            link.id,
            user_id,
            link.source_type,
            link.source_id,
            link.target_indicator_id,
            link.relation,
            link.strength,
            link.evidence,
            link.status,
        ),
    )


def _row_to_program(row: sqlite3.Row) -> AcademicProgram:
    return AcademicProgram(
        id=row["id"],
        code=row["code"],
        name=row["name"],
        discipline=row["discipline"],
        degree=row["degree"],
        owner=row["owner"],
        evaluation_cycle=row["evaluation_cycle"],
        status=row["status"],
    )


def _row_to_course(row: sqlite3.Row) -> Course:
    return Course(
        id=row["id"],
        program_id=row["program_id"],
        code=row["code"],
        name=row["name"],
        category=row["category"],
        term=row["term"],
        credit_hours=row["credit_hours"],
        owner=row["owner"],
        status=row["status"],
    )


def _row_to_requirement(row: sqlite3.Row) -> GraduationRequirement:
    return GraduationRequirement(
        id=row["id"],
        program_id=row["program_id"],
        code=row["code"],
        title=row["title"],
        description=row["description"],
    )


def _row_to_indicator(row: sqlite3.Row) -> CompetencyIndicator:
    return CompetencyIndicator(
        id=row["id"],
        requirement_id=row["requirement_id"],
        code=row["code"],
        title=row["title"],
        description=row["description"],
    )


def _row_to_objective(row: sqlite3.Row) -> CourseObjective:
    return CourseObjective(
        id=row["id"],
        course_id=row["course_id"],
        code=row["code"],
        title=row["title"],
        description=row["description"],
    )


def _row_to_experiment(row: sqlite3.Row) -> ExperimentProject:
    return ExperimentProject(
        id=row["id"],
        course_id=row["course_id"],
        code=row["code"],
        title=row["title"],
        description=row["description"],
        environment=row["environment"],
        source_material_id=row["source_material_id"],
    )


def _row_to_rubric_item(row: sqlite3.Row) -> RubricItem:
    return RubricItem(
        id=row["id"],
        course_id=row["course_id"],
        experiment_id=row["experiment_id"],
        indicator_id=row["indicator_id"],
        code=row["code"],
        title=row["title"],
        points=row["points"],
    )


def _row_to_source_material(row: sqlite3.Row) -> SourceMaterial:
    return SourceMaterial(
        id=row["id"],
        course_id=row["course_id"],
        file_name=row["file_name"],
        material_type=row["material_type"],
        source_path=row["source_path"],
        checksum=row["checksum"],
        status=row["status"],
    )


def _row_to_support_link(row: sqlite3.Row) -> SupportLink:
    return SupportLink(
        id=row["id"],
        source_type=row["source_type"],
        source_id=row["source_id"],
        target_indicator_id=row["target_indicator_id"],
        relation=row["relation"],
        strength=row["strength"],
        evidence=row["evidence"],
        status=row["status"],
    )
