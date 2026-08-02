import json
import sys
from pathlib import Path

from app.export_openapi import main
from pytest import MonkeyPatch


def test_openapi_export_does_not_initialize_business_data(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    business_data_dir = tmp_path / "business-data"
    output = tmp_path / "openapi.json"
    monkeypatch.setenv("EA_LOCAL_DATA_DIR", str(business_data_dir))
    monkeypatch.setattr(
        sys,
        "argv",
        ["export_openapi", "--output", str(output)],
    )

    main()

    assert not business_data_dir.exists()
    specification = json.loads(output.read_text(encoding="utf-8"))
    assert specification["openapi"].startswith("3.")
    assert "/api/v1/evaluations/objects" in specification["paths"]
