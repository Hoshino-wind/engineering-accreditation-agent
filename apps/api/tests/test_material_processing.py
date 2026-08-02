import asyncio
import io
import zipfile

import pytest
from app.modules.materials.application import SecurityScanError
from app.modules.materials.infra.security_scanner import LocalMaterialSecurityScanner


def test_office_zip_path_traversal_is_blocked() -> None:
    payload = io.BytesIO()
    with zipfile.ZipFile(payload, "w") as archive:
        archive.writestr("word/document.xml", "<document />")
        archive.writestr("../escape.txt", "unsafe")
    scanner = LocalMaterialSecurityScanner(
        max_upload_bytes=1024 * 1024,
        virus_scan_mode="builtin",
        clamav_command="clamscan",
    )

    with pytest.raises(SecurityScanError, match="路径穿越"):
        asyncio.run(
            scanner.scan(
                payload.getvalue(),
                "unsafe.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        )
