import ast
from pathlib import Path

MODULES_ROOT = Path(__file__).parents[1] / "app" / "modules"


def imported_modules(source_file: Path) -> set[str]:
    syntax_tree = ast.parse(source_file.read_text(encoding="utf-8"))
    imports: set[str] = set()

    for node in ast.walk(syntax_tree):
        if isinstance(node, ast.Import):
            imports.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imports.add(node.module)

    return imports


def assert_layer_does_not_import(
    layer: str,
    forbidden_fragments: tuple[str, ...],
) -> None:
    violations: list[str] = []

    for source_file in MODULES_ROOT.glob(f"*/{layer}/**/*.py"):
        for imported_module in imported_modules(source_file):
            if any(fragment in imported_module for fragment in forbidden_fragments):
                violations.append(
                    f"{source_file.relative_to(MODULES_ROOT)} -> {imported_module}"
                )

    assert violations == [], "检测到反向架构依赖:\n" + "\n".join(violations)


def test_domain_layer_is_framework_independent() -> None:
    assert_layer_does_not_import(
        "domain",
        (
            "app.core",
            "app.infrastructure",
            ".application",
            ".contracts",
            ".infra",
            ".routes",
        ),
    )


def test_application_layer_depends_only_on_domain_and_ports() -> None:
    assert_layer_does_not_import(
        "application",
        (
            "app.core",
            "app.infrastructure",
            ".contracts",
            ".infra",
            ".routes",
        ),
    )


def test_route_layer_does_not_reach_infrastructure() -> None:
    assert_layer_does_not_import(
        "routes",
        (
            "app.core",
            "app.infrastructure",
            ".domain",
            ".infra",
        ),
    )
