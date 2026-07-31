import asyncio
import hashlib
import re
import zipfile
from io import BytesIO
from pathlib import Path
from uuid import uuid4
from xml.etree import ElementTree

import fitz  # type: ignore[import-untyped]
from pypdf import PdfReader

from app.modules.materials.application import (
    DocumentParseError,
    OcrGateway,
    ParseResult,
    StructureGateway,
)
from app.modules.materials.domain import EvidenceFragment

IMAGE_MEDIA_TYPES = {
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}


class LocalDocumentParser:
    def __init__(
        self,
        *,
        ocr_gateway: OcrGateway | None,
        structure_gateway: StructureGateway | None,
        ocr_max_pdf_pages: int,
    ) -> None:
        self._ocr_gateway = ocr_gateway
        self._structure_gateway = structure_gateway
        self._ocr_max_pdf_pages = ocr_max_pdf_pages

    async def parse(
        self,
        *,
        content: bytes,
        file_name: str,
        media_type: str,
    ) -> ParseResult:
        extension = Path(file_name).suffix.lower().lstrip(".")
        page_count: int | None = None
        used_ocr = False
        if extension in {"csv", "md", "txt"}:
            text = self._decode_text(content)
        elif extension == "docx":
            text = await asyncio.to_thread(self._extract_docx, content)
        elif extension == "xlsx":
            text = await asyncio.to_thread(self._extract_xlsx, content)
        elif extension == "pdf":
            text, page_count, used_ocr = await self._extract_pdf(content)
        elif extension in IMAGE_MEDIA_TYPES:
            text = await self._ocr(content, IMAGE_MEDIA_TYPES[extension])
            page_count, used_ocr = 1, True
        else:
            raise DocumentParseError(f"暂不支持解析 .{extension} 文件")
        if not text.strip():
            raise DocumentParseError("未能从文件中提取可解析文本")
        fragments = (
            await self._structure_gateway.structure(text, file_name)
            if self._structure_gateway is not None
            else self._local_fragments(text, "扫描页" if used_ocr else "段落")
        )
        parser = "DeepSeek-OCR" if used_ocr else "本地文档解析器"
        structure = (
            "DeepSeek 结构化"
            if self._structure_gateway is not None
            else "本地确定性分段"
        )
        return ParseResult(
            fragments=fragments,
            page_count=page_count,
            parser_detail=f"{parser} 已提取内容；{structure}完成",
        )

    async def _extract_pdf(self, content: bytes) -> tuple[str, int, bool]:
        try:
            reader = await asyncio.to_thread(PdfReader, BytesIO(content))
            page_count = len(reader.pages)
            text_parts = await asyncio.to_thread(
                lambda: [(page.extract_text() or "") for page in reader.pages]
            )
        except Exception as error:
            raise DocumentParseError(f"PDF 文本层读取失败：{error}") from error
        text = "\n\n".join(text_parts).strip()
        if len(re.sub(r"\s+", "", text)) >= 80:
            return text, page_count, False
        if self._ocr_gateway is None:
            raise DocumentParseError(
                "扫描 PDF 没有可用文本层；请配置 EA_DEEPSEEK_OCR_BASE_URL 后重试"
            )
        try:
            document = fitz.open(stream=content, filetype="pdf")
            texts: list[str] = []
            limit = min(document.page_count, self._ocr_max_pdf_pages)
            for index in range(limit):
                pixmap = document[index].get_pixmap(matrix=fitz.Matrix(1.8, 1.8))
                recognized = await self._ocr(pixmap.tobytes("png"), "image/png")
                texts.append(f"## 扫描页 {index + 1}\n{recognized}")
            document.close()
        except DocumentParseError:
            raise
        except Exception as error:
            raise DocumentParseError(f"扫描 PDF 页面渲染失败：{error}") from error
        return "\n\n".join(texts), page_count, True

    async def _ocr(self, content: bytes, media_type: str) -> str:
        if self._ocr_gateway is None:
            raise DocumentParseError(
                "图片材料需要 DeepSeek-OCR；请配置 EA_DEEPSEEK_OCR_BASE_URL 后重试"
            )
        return await self._ocr_gateway.recognize(content, media_type)

    @staticmethod
    def _decode_text(content: bytes) -> str:
        for encoding in ("utf-8-sig", "gb18030", "utf-16"):
            try:
                return content.decode(encoding)
            except UnicodeDecodeError:
                continue
        raise DocumentParseError("文本文件编码无法识别")

    @staticmethod
    def _extract_docx(content: bytes) -> str:
        try:
            with zipfile.ZipFile(BytesIO(content)) as archive:
                root = ElementTree.fromstring(archive.read("word/document.xml"))
        except (zipfile.BadZipFile, KeyError, ElementTree.ParseError) as error:
            raise DocumentParseError("DOCX 正文结构无法读取") from error
        texts = [
            node.text or ""
            for node in root.iter()
            if node.tag.endswith("}t") and node.text
        ]
        return "\n".join(texts)

    @staticmethod
    def _extract_xlsx(content: bytes) -> str:
        try:
            with zipfile.ZipFile(BytesIO(content)) as archive:
                names = archive.namelist()
                shared: list[str] = []
                if "xl/sharedStrings.xml" in names:
                    root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
                    shared = [
                        node.text or ""
                        for node in root.iter()
                        if node.tag.endswith("}t")
                    ]
                rows: list[str] = []
                for name in sorted(
                    item
                    for item in names
                    if item.startswith("xl/worksheets/sheet") and item.endswith(".xml")
                ):
                    root = ElementTree.fromstring(archive.read(name))
                    values = []
                    for cell in (node for node in root.iter() if node.tag.endswith("}c")):
                        value = next(
                            (node.text for node in cell if node.tag.endswith("}v")),
                            None,
                        )
                        if value is not None and cell.attrib.get("t") == "s":
                            index = int(value)
                            value = shared[index] if index < len(shared) else value
                        if value:
                            values.append(value)
                    rows.append(f"[{Path(name).stem}] " + " | ".join(values))
        except (zipfile.BadZipFile, KeyError, ValueError, ElementTree.ParseError) as error:
            raise DocumentParseError("XLSX 工作表结构无法读取") from error
        return "\n".join(rows)

    @staticmethod
    def _local_fragments(text: str, kind: str) -> list[EvidenceFragment]:
        paragraphs = [
            item.strip()
            for item in re.split(r"\n\s*\n|\n(?=#+\s)", text)
            if item.strip()
        ]
        if len(paragraphs) == 1:
            paragraphs = [
                paragraphs[0][index : index + 500]
                for index in range(0, len(paragraphs[0]), 500)
            ]
        fragments: list[EvidenceFragment] = []
        for index, preview in enumerate(paragraphs[:40], start=1):
            digest = hashlib.sha256(preview.encode()).hexdigest()
            fragments.append(
                EvidenceFragment(
                    id=f"fragment-{uuid4()}",
                    coordinate=f"本地提取片段 {index}",
                    kind=kind,
                    preview=preview[:500],
                    sha256=digest,
                )
            )
        return fragments
