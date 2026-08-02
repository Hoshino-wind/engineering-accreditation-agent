import argparse
import json
import os
import tempfile
from pathlib import Path
from unittest.mock import patch


def main() -> None:
    parser = argparse.ArgumentParser(description="导出 FastAPI OpenAPI 契约")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    output: Path = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(
        prefix="engineering-accreditation-openapi-"
    ) as contract_data_dir, patch.dict(
        os.environ,
        {"EA_LOCAL_DATA_DIR": contract_data_dir},
    ):
        # 契约导出不得初始化或污染开发者正在使用的本地业务数据。
        os.environ["EA_LOCAL_DATA_DIR"] = contract_data_dir
        from app.core.config import get_settings
        from app.factory import create_app

        get_settings.cache_clear()
        specification = create_app().openapi()
        get_settings.cache_clear()
    output.write_text(
        json.dumps(specification, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
