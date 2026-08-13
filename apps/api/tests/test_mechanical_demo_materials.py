from app.modules.llm.infra.mock_data import get_mock_extraction_items


def test_mechanical_demo_material_extracts_mechanical_nodes() -> None:
    items = get_mock_extraction_items(
        material_category="实验指导书",
        material_name="01_mechanical_manufacturing_lab_guide.txt",
        material_text=(
            "所属专业：机械设计制造及其自动化\n"
            "课程名称：机械制造工艺基础\n"
            "实验二：数控车削加工参数优化与质量验证\n"
            "对应指标：C-03-01\n"
        ),
    )

    codes = {item.code for item in items}
    assert "CO-ME-201" in codes
    assert "EXP-ME-C03-01" in codes
    assert "EXP-MCU-01" not in codes
