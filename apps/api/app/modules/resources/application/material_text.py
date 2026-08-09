"""B2 支撑：从上传文件字节中提取文本，供多智能体 pipeline 做真实内容解析。

支持 PDF（PyMuPDF）、纯文本类（txt/md/json）与 docx 文件名降级；
任何解析失败都返回由文件名/分类合成的描述文本，保证 LLM 有内容可分析。
"""

import logging

logger = logging.getLogger(__name__)

_MAX_CHARS = 8000


def _extract_pdf(content: bytes) -> str:
    try:
        import pymupdf

        doc = pymupdf.open(stream=content, filetype="pdf")
        pages: list[str] = []
        total = 0
        for page in doc:
            text = page.get_text("text").strip()
            if text:
                pages.append(text)
                total += len(text)
            if total >= _MAX_CHARS:
                break
        doc.close()
        return "\n".join(pages)[:_MAX_CHARS]
    except Exception as exc:  # noqa: BLE001
        logger.warning("PDF 文本提取失败：%s", exc)
        return ""


def _extract_plain(content: bytes) -> str:
    for encoding in ("utf-8", "gb18030", "latin-1"):
        try:
            return content.decode(encoding)[:_MAX_CHARS]
        except (UnicodeDecodeError, ValueError):
            continue
    return content.decode("utf-8", errors="ignore")[:_MAX_CHARS]


def extract_material_text(file_name: str, course: str, category: str, content: bytes) -> str:
    """从上传文件内容中提取文本；无法解析时用文件名/分类合成兜底文本。"""
    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""

    text = ""
    if ext == "pdf":
        text = _extract_pdf(content)
    elif ext in ("txt", "md", "json", "csv"):
        text = _extract_plain(content)

    if text.strip():
        return text

    # 兜底：合成描述文本，让 LLM 至少能基于材料元信息产出节点
    stem = file_name.rsplit(".", 1)[0] if "." in file_name else file_name
    return (
        f"材料名称：{stem}\n"
        f"所属课程：{course}\n"
        f"材料分类：{category}\n"
        f"这是一份用于工程教育认证的教学材料（{category}），"
        f"请基于材料名称与课程信息推断其中可能包含的课程、实验与知识点。"
    )
