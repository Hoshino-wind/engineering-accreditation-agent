import asyncio
import shutil
import subprocess
import tempfile
import zipfile
from io import BytesIO
from pathlib import Path, PurePosixPath

from app.modules.materials.application import SecurityScanError

EICAR_MARKER = b"EICAR-STANDARD-ANTIVIRUS-TEST-FILE"
ZIP_EXTENSIONS = {"docx", "xlsx"}
TEXT_EXTENSIONS = {"csv", "md", "txt"}
MAGIC_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    "jpeg": (b"\xff\xd8\xff",),
    "jpg": (b"\xff\xd8\xff",),
    "pdf": (b"%PDF-",),
    "png": (b"\x89PNG\r\n\x1a\n",),
    "webp": (b"RIFF",),
}
ALLOWED_EXTENSIONS = set(MAGIC_SIGNATURES) | ZIP_EXTENSIONS | TEXT_EXTENSIONS
MEDIA_TYPES: dict[str, set[str]] = {
    "csv": {"application/vnd.ms-excel", "text/csv", "text/plain"},
    "docx": {
        "application/zip",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    "jpeg": {"image/jpeg"},
    "jpg": {"image/jpeg"},
    "md": {"text/markdown", "text/plain"},
    "pdf": {"application/pdf"},
    "png": {"image/png"},
    "txt": {"text/plain"},
    "webp": {"image/webp"},
    "xlsx": {
        "application/zip",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
}


class LocalMaterialSecurityScanner:
    def __init__(
        self,
        *,
        max_upload_bytes: int,
        virus_scan_mode: str,
        clamav_command: str,
    ) -> None:
        self._max_upload_bytes = max_upload_bytes
        self._virus_scan_mode = virus_scan_mode
        self._clamav_command = clamav_command

    async def scan(self, content: bytes, file_name: str, media_type: str) -> str:
        return await asyncio.to_thread(
            self._scan_sync, content, file_name, media_type
        )

    def _scan_sync(self, content: bytes, file_name: str, media_type: str) -> str:
        extension = self._validate_object(content, file_name, media_type)
        if EICAR_MARKER in content.upper():
            raise SecurityScanError(
                "本地病毒扫描发现 EICAR 测试病毒特征，文件已隔离",
                quarantined=True,
            )
        clamav = shutil.which(self._clamav_command)
        if self._virus_scan_mode == "clamav" and clamav is None:
            raise SecurityScanError("已要求 ClamAV 扫描，但本机未找到 clamscan")
        if self._virus_scan_mode in {"auto", "clamav"} and clamav is not None:
            self._run_clamav(clamav, content, f"upload.{extension}")
            return "ClamAV 本地病毒扫描通过"
        return "内置病毒特征扫描通过（未检测到本机 ClamAV）"

    def _validate_object(
        self, content: bytes, file_name: str, media_type: str
    ) -> str:
        if not content:
            raise SecurityScanError("文件为空，无法进入处理流水线")
        if len(content) > self._max_upload_bytes:
            raise SecurityScanError(
                f"文件超过 {self._max_upload_bytes // (1024 * 1024)} MB 限制"
            )
        if (
            "\x00" in file_name
            or "/" in file_name
            or "\\" in file_name
            or Path(file_name).name != file_name
        ):
            raise SecurityScanError("文件名包含不安全路径")
        extension = Path(file_name).suffix.lower().lstrip(".")
        if extension not in ALLOWED_EXTENSIONS:
            raise SecurityScanError(f"暂不支持 .{extension or '(无扩展名)'} 文件")
        normalized_media_type = media_type.partition(";")[0].strip().lower()
        if (
            normalized_media_type
            and normalized_media_type != "application/octet-stream"
            and normalized_media_type not in MEDIA_TYPES[extension]
        ):
            raise SecurityScanError("浏览器 MIME 类型与文件扩展名不一致")
        if extension in TEXT_EXTENSIONS:
            return extension
        if extension in ZIP_EXTENSIONS:
            self._validate_zip(content, extension)
            return extension
        if not any(content.startswith(value) for value in MAGIC_SIGNATURES[extension]):
            raise SecurityScanError("文件头与扩展名不一致")
        if extension == "webp" and content[8:12] != b"WEBP":
            raise SecurityScanError("文件头与 WebP 扩展名不一致")
        return extension

    @staticmethod
    def _validate_zip(content: bytes, extension: str) -> None:
        try:
            with zipfile.ZipFile(BytesIO(content)) as archive:
                entries = archive.infolist()
                if len(entries) > 5_000:
                    raise SecurityScanError("压缩包文件项过多")
                total = sum(item.file_size for item in entries)
                if total > 250 * 1024 * 1024:
                    raise SecurityScanError("压缩包解压后体积超过 250 MB")
                for item in entries:
                    path = PurePosixPath(item.filename)
                    if path.is_absolute() or ".." in path.parts:
                        raise SecurityScanError("压缩包包含路径穿越文件")
                    if item.file_size > 0 and item.compress_size == 0:
                        raise SecurityScanError("压缩包包含异常零体积压缩项")
                    if (
                        item.compress_size > 0
                        and item.file_size / item.compress_size > 200
                    ):
                        raise SecurityScanError("压缩包包含高压缩比疑似炸弹文件")
                names = {item.filename for item in entries}
                expected = "word/document.xml" if extension == "docx" else "xl/workbook.xml"
                if expected not in names:
                    raise SecurityScanError(f"文件不是有效的 {extension.upper()} 文档")
        except zipfile.BadZipFile as error:
            raise SecurityScanError("Office 文件结构损坏或不是有效 ZIP 容器") from error

    @staticmethod
    def _run_clamav(command: str, content: bytes, file_name: str) -> None:
        with tempfile.TemporaryDirectory(prefix="ea-scan-") as directory:
            path = Path(directory) / file_name
            path.write_bytes(content)
            result = subprocess.run(
                [command, "--no-summary", str(path)],
                capture_output=True,
                check=False,
                text=True,
                timeout=60,
            )
        if result.returncode == 1:
            raise SecurityScanError(
                "ClamAV 发现恶意文件，文件已隔离", quarantined=True
            )
        if result.returncode != 0:
            raise SecurityScanError(
                f"ClamAV 扫描异常：{result.stderr.strip() or '未知错误'}"
            )
