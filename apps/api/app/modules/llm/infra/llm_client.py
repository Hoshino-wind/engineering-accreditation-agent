"""基于 OpenAI 兼容 API 的 LLM 客户端实现（DeepSeek / Qwen / OpenAI 均可用）。

使用环境变量配置：
- EA_LLM_API_KEY: API 密钥
- EA_LLM_API_BASE_URL: API 地址（如 https://api.deepseek.com/v1）
- EA_LLM_MODEL: 模型名称（如 deepseek-chat）
- EA_LLM_EMBEDDING_API_KEY: Embedding API 密钥（可与主 key 相同）
- EA_LLM_EMBEDDING_BASE_URL: Embedding API 地址
- EA_LLM_EMBEDDING_MODEL: Embedding 模型名称
"""

from __future__ import annotations

import json
import time
import logging
from typing import Any

import httpx

from app.core.config import get_settings
from app.modules.llm.application.ports import LLMClientPort
from app.modules.llm.domain.models import (
    ClassificationResult,
    ExplanationItem,
    ExtractionItem,
    LLMResponse,
    LLMUsage,
    PlanStep,
    RelationItem,
    ReportChapterItem,
    SuggestionItem,
)

logger = logging.getLogger(__name__)


class LLMConfig:
    """从环境变量读取 LLM 配置。"""

    def __init__(self) -> None:
        settings = get_settings()
        self.api_key: str = settings.llm_api_key.get_secret_value() or ""
        self.base_url: str = getattr(settings, "llm_api_base_url", "") or "https://api.deepseek.com/v1"
        self.model: str = getattr(settings, "llm_model", "") or "deepseek-chat"
        self.timeout: float = 60.0
        self.embedding_api_key: str = (
            settings.llm_embedding_api_key.get_secret_value() or self.api_key
        )
        self.embedding_base_url: str = getattr(settings, "llm_embedding_base_url", "") or self.base_url
        self.embedding_model: str = getattr(settings, "llm_embedding_model", "") or "text-embedding-3-small"

    @property
    def is_configured(self) -> bool:
        """是否配置了真实 API Key。"""
        return bool(self.api_key)


class OpenAICompatibleLLMClient(LLMClientPort):
    """调用 OpenAI 兼容 API 的 LLM 客户端。

    未配置 API Key 时自动降级为 mock 响应，保证 Demo 可用。
    """

    def __init__(self, config: LLMConfig | None = None, user_id: str | None = None) -> None:
        # 保存启动时从 .env 读取的配置作为基础；实际调用时再与页面运行时配置合并。
        self._static_config = config or LLMConfig()
        # 绑定到具体用户：配置按 user_id 隔离，每个用户使用自己配置的 Key / 模型。
        # 为 None 时回落到 env（通常为空 → mock）。
        self._user_id = user_id

    @property
    def _config(self) -> "LLMConfig":
        """实时解析配置：env 基础 + 当前用户页面运行时配置（运行时优先级更高）。

        改为动态解析后，页面修改 API Key / 模型后立即生效，无需重启服务。
        """
        from app.modules.llm.infra.runtime_settings import resolve_user_llm_config

        return resolve_user_llm_config(self._static_config, self._user_id)

    async def _call_chat(self, messages: list[dict], temperature: float = 0.3) -> dict:
        """调用 chat/completions 接口，返回 raw response dict。"""
        if not self._config.is_configured:
            logger.warning("LLM API Key 未配置，返回 mock 响应。请在 .env 中设置 EA_LLM_API_KEY")
            return {"mock": True}

        headers = {
            "Authorization": f"Bearer {self._config.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._config.model,
            "messages": messages,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=self._config.timeout) as client:
            resp = await client.post(
                f"{self._config.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()

    async def _call_embedding(self, texts: list[str]) -> list[list[float]]:
        """调用 embeddings 接口，返回向量列表。"""
        if not self._config.is_configured:
            # mock: 返回固定维度的零向量
            return [[0.0] * 512 for _ in texts]

        headers = {
            "Authorization": f"Bearer {self._config.embedding_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._config.embedding_model,
            "input": texts,
        }

        async with httpx.AsyncClient(timeout=self._config.timeout) as client:
            resp = await client.post(
                f"{self._config.embedding_base_url}/embeddings",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return [item["embedding"] for item in data["data"]]

    @staticmethod
    def _parse_json_content(content: str) -> Any:
        """从 LLM 响应中解析 JSON（兼容 ```json 包裹和裸 JSON）。"""
        text = content.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.startswith("```")]
            text = "\n".join(lines)
        return json.loads(text)

    @staticmethod
    def _build_usage(raw: dict) -> LLMUsage:
        usage = raw.get("usage", {})
        pt = usage.get("prompt_tokens", 0)
        ct = usage.get("completion_tokens", 0)
        return LLMUsage(prompt_tokens=pt, completion_tokens=ct, total_tokens=pt + ct)

    # ── 材料分类 ──────────────────────────────────────────

    # 评价证据类：本轮不进入节点提取主流水线
    _EVAL_EVIDENCE_CATEGORIES: frozenset[str] = frozenset(
        {"评分表", "学生报告", "评价结果"}
    )

    async def classify_material(
        self,
        file_name: str,
        text_preview: str,
    ) -> LLMResponse[ClassificationResult]:
        """根据文件名 + 前 500 字文本判断材料类型。

        判断依据返回给用户，可溯源；评分表/学生报告/评价结果 标记为评价证据。
        未配置 API Key 时走规则化 mock（基于文件名关键词匹配）。
        """
        start = time.time()

        if not self._config.is_configured:
            return self._mock_classify(file_name, text_preview, latency=0)

        system_prompt = (
            "你是工程教育认证材料分类助手。根据文件名和文本片段判断材料类型，"
            "严格输出 JSON。"
        )
        user_prompt = f"""文件名：{file_name}
文本片段（前 500 字符）：
{text_preview[:500]}

请判断该材料属于以下哪一类，输出 JSON 格式：
{{
  "category": "培养方案|课程大纲|实验指导书|实验项目清单|评分表|学生报告|评价结果|其他",
  "confidence": 0.0~1.0,
  "reason": "判断依据（引用文件名/文本中的关键词）"
}}

判定要点（按优先级）：
- 含"教学大纲"或课程代码[Bxxxxxx]/[B1xxxxxx] → 课程大纲
- 含"培养方案"或"毕业要求" → 培养方案
- 含"项目清单" → 实验项目清单
- 含"评分表"或"记录与评分" → 评分表
- 含学号(纯数字7-8位)+姓名或学生作业特征 → 学生报告
- 含"评价结果"、"达成度分析" → 评价结果
- 含"实验指导书"/"实验手册"/"指导书"/"手册" 或章节序号开头（如"第10章"、"第1章_xxx"）→ 实验指导书
- 课程名+数字编号模式（如"单片机基础1_xxx.pdf"、"电子信息基础实验指导书-xxx.pdf"、"Arduino串口通信实验指导书_xxx.pdf"）→ 实验指导书
- 学院汇报/规范性文件/制度类 → 其他
- 无法判断 → 其他"""

        try:
            raw = await self._call_chat([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ], temperature=0.0)
            latency = int((time.time() - start) * 1000)

            if raw.get("mock"):
                return self._mock_classify(file_name, text_preview, latency)

            content = raw["choices"][0]["message"]["content"]
            parsed = self._parse_json_content(content)
            category = str(parsed.get("category", "其他")).strip()
            # 校验 category 在白名单内
            from app.modules.resources.contracts import RESOURCE_CATEGORIES
            if category not in RESOURCE_CATEGORIES:
                category = "其他"
            confidence = float(parsed.get("confidence", 0.5))
            reason = str(parsed.get("reason", "")).strip() or f"文件名包含 {category} 相关特征"

            result = ClassificationResult(
                category=category,
                confidence=confidence,
                reason=reason,
                is_evaluation_evidence=category in self._EVAL_EVIDENCE_CATEGORIES,
            )
            return LLMResponse(
                data=result,
                model=self._config.model,
                usage=self._build_usage(raw),
                latency=latency,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("LLM 分类失败，降级到规则化判断：%s", exc)
            latency = int((time.time() - start) * 1000)
            return self._mock_classify(file_name, text_preview, latency)

    def _mock_classify(
        self,
        file_name: str,
        text_preview: str,
        latency: int,
    ) -> LLMResponse[ClassificationResult]:
        """无 API Key 时的规则化降级：基于文件名关键词匹配。

        这是确定性兜底，不调用真实 LLM；规则覆盖了实验资料库的常见命名规律。
        """
        name_lower = file_name.lower()
        # 优先级：从最特征明显的到最弱
        rules: list[tuple[str, str, list[str]]] = [
            # (category, reason_template, keywords)
            ("培养方案", "文件名含『培养方案』", ["培养方案"]),
            ("课程大纲", "文件名含『教学大纲』或课程代码 [Bxxxxxx]", ["教学大纲", "[b0", "[b1"]),
            ("实验项目清单", "文件名含『项目清单』", ["项目清单"]),
            ("评分表", "文件名含『评分表』或『记录与评分』", ["评分表", "记录与评分"]),
            ("学生报告", "文件名含学号(纯数字)或学生作业特征", []),  # 单独走正则
            ("实验指导书", "文件名含『实验指导书』或章节序号开头", ["实验指导书", "指导书"]),
            ("评价结果", "文件名含『评价结果』或『达成度分析』", ["评价结果", "达成度"]),
        ]
        import re

        category = "其他"
        reason = "无法从文件名匹配明显特征，建议老师手动确认"
        for cat, reason_tpl, keywords in rules:
            if cat == "学生报告":
                # 7-8 位连续数字（学号）作为学生报告的强信号
                if re.search(r"\d{7,8}", file_name):
                    category = cat
                    reason = reason_tpl
                    break
            else:
                if any(kw in name_lower for kw in keywords):
                    category = cat
                    reason = reason_tpl
                    break

        # 文本内容二次校验（提高置信度）
        text_lower = text_preview[:500].lower()
        if category == "其他" and text_preview:
            if "毕业要求" in text_preview or "培养目标" in text_preview:
                category = "培养方案"
                reason = "文本含『毕业要求/培养目标』关键词"
            elif "课程目标" in text_preview and "考核" in text_preview:
                category = "课程大纲"
                reason = "文本含『课程目标+考核』关键词"
            elif "实验" in text_preview and ("步骤" in text_preview or "目的" in text_preview):
                category = "实验指导书"
                reason = "文本含『实验+步骤/目的』关键词"

        confidence = 0.95 if category != "其他" else 0.3
        result = ClassificationResult(
            category=category,
            confidence=confidence,
            reason=reason,
            is_evaluation_evidence=category in self._EVAL_EVIDENCE_CATEGORIES,
        )
        return LLMResponse(
            data=result,
            model="deepseek-v4-flash (mock-rules)",
            usage=LLMUsage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
            latency=latency,
        )

    # ── 节点提取 ──────────────────────────────────────────

    async def extract_nodes(
        self,
        material_text: str,
        material_category: str,
        material_name: str,
    ) -> LLMResponse[list[ExtractionItem]]:
        # 评价证据类本轮不进入节点提取主流水线：直接返回空列表
        # （评分表 / 学生报告 / 评价结果 将在后续迭代纳入"评价证据闭环"模块）
        if material_category in self._EVAL_EVIDENCE_CATEGORIES:
            return LLMResponse(
                data=[],
                model=f"{self._config.model} (eval-evidence-skipped)",
                usage=LLMUsage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
                latency=0,
            )

        start = time.time()

        # 按 category 分流：不同类型材料提取目标不同，prompt 与输出 schema 也不同
        system_prompt, user_prompt = self._build_extract_prompt(
            material_text, material_category, material_name
        )

        latency = int((time.time() - start) * 1000)

        raw: dict[str, Any] = {}
        items: list[ExtractionItem] = []
        try:
            raw = await self._call_chat([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ])
            latency = int((time.time() - start) * 1000)

            if raw.get("mock"):
                return self._mock_extract(material_category, material_name, latency)

            content = raw["choices"][0]["message"]["content"]
            parsed = self._parse_json_content(content)
            items = [
                ExtractionItem(
                    code=item["code"],
                    name=item["name"],
                    kind=item["kind"],
                    credit_hours=item.get("credit_hours"),
                    description=item.get("description"),
                    confidence=item.get("confidence", 0.9),
                    source_excerpt=item.get("source_excerpt"),
                )
                for item in parsed.get("items", [])
            ]
        except Exception:  # noqa: BLE001
            items = []

        # 兜底：真实 LLM 解析失败或未提取到任何节点时，降级为规则化提取，
        # 保证上传材料总能产出节点（演示稳定性）。
        if not items:
            return self._mock_extract(material_category, material_name, latency)

        return LLMResponse(
            data=items,
            model=self._config.model,
            usage=self._build_usage(raw),
            latency=latency,
        )

    # 不同类型材料的差异化提取 prompt
    #
    # 工程认证 OBE 视角下，不同材料承载的信息维度不同：
    #   - 培养方案：毕业要求 + 培养目标（顶层设计）
    #   - 课程大纲：课程目标 + 考核方式 + 对应指标点（教学落地）
    #   - 实验指导书：实验项目 + 能力训练点（教学执行）
    #   - 实验项目清单：实验项目列表（教学组织）
    #   - 其他：通用提取
    #
    # 评分表 / 学生报告 / 评价结果 是评价证据，本轮不走这条路径
    @staticmethod
    def _build_extract_prompt(
        material_text: str,
        material_category: str,
        material_name: str,
    ) -> tuple[str, str]:
        # 通用 JSON 输出 schema（保持兼容）
        common_schema = """{
  "items": [
    {
      "code": "节点编号（课程/实验/知识点的代码，如 CO-DS-01、EXP-FPGA-01）",
      "name": "节点名称",
      "kind": "course|experiment|knowledge|resource",
      "credit_hours": 3.0,
      "description": "简短描述",
      "confidence": 0.9,
      "source_excerpt": "提取依据的原文片段（可溯源）"
    }
  ]
}"""

        if material_category == "培养方案":
            system = (
                "你是工程教育认证材料解析专家。从培养方案中提取毕业要求与培养目标。严格输出 JSON。"
            )
            user = f"""材料类型：培养方案
材料名称：{material_name}
材料文本（前 8000 字符）：
{material_text[:8000]}

请提取该培养方案中的【毕业要求】与【培养目标】节点：
- 毕业要求作为顶层节点（kind=course，code 形如 GR-01 ~ GR-05）
- 培养目标作为支撑节点（kind=knowledge，code 形如 GOAL-01）
- 每个节点必须给出 source_excerpt 引用原文依据

输出 JSON 格式：
{common_schema}"""
            return system, user

        if material_category == "课程大纲":
            system = (
                "你是工程教育认证材料解析专家。从课程大纲中提取【课程】与【课程目标】作为核心教学节点。严格输出 JSON。"
            )
            user = f"""材料类型：课程大纲
材料名称：{material_name}
材料文本（前 8000 字符）：
{material_text[:8000]}

【提取规则】
- 提取 1 个 Course 节点 (kind=course)，代表课程本身
  - code 格式：CO-<缩写>，如 CO-DS, CO-MCU
  - name 必须是完整的课程名称
- 提取课程的【总体目标】作为 KnowledgePoint 节点 (kind=knowledge)
  - 仅提取 3-5 条核心、方向性的课程目标
  - code 格式：OBJ-<课程缩写>-<序号>，如 OBJ-DS-01
  - name 是目标的浓缩表述，如"掌握数据结构设计能力"

【严禁提取】
- 不要提取"链表", "排序", "二叉树" 等教材章节名
- 不要将大纲目录中的知识点作为独立节点
- 知识点仅作为课程的组成部分，不作为顶层支撑节点

输出 JSON 格式：
{common_schema}"""
            return system, user

        if material_category == "实验指导书":
            system = (
                "你是工程教育认证材料解析专家。从实验指导书中提取【所属课程】与【实验项目】作为核心教学节点。严格输出 JSON。"
            )
            user = f"""材料类型：实验指导书
材料名称：{material_name}
材料文本（前 8000 字符）：
{material_text[:8000]}

【提取规则】
1. 首先提取 1 个 Course 节点 (kind=course)，代表该材料所属的课程
   - 从材料名称、标题、首页信息中推断课程名称
   - code 格式：CO-<缩写>，如 CO-MCU, CO-FPGA
   - name 必须是完整的课程名称，例如 "单片机基础", "FPGA基础", "电子信息基础实验"
2. 然后提取各 Experiment 节点 (kind=experiment)
   - code 格式：EXP-<缩写>-<序号>，如 EXP-MCU-01, EXP-FPGA-02
   - name 必须是完整的实验项目名称，例如 "单片机基础实验", "LED流水灯实验"

【严禁提取】
- 不要提取"链表", "排序", "数据结构" 等教材章节名或细碎知识点
- 不要将实验步骤中的技术术语作为独立节点
- 知识点仅作为实验项目的描述性信息，不作为独立节点

输出 JSON 格式：
{common_schema}"""
            return system, user

        if material_category == "实验项目清单":
            system = (
                "你是工程教育认证材料解析专家。从项目清单中提取【所属课程】与全部实验项目。严格输出 JSON。"
            )
            user = f"""材料类型：实验项目清单
材料名称：{material_name}
材料文本（前 8000 字符）：
{material_text[:8000]}

【提取规则】
1. 首先提取 1 个 Course 节点 (kind=course)，代表该清单所属的课程
   - 从材料名称、标题、表头信息中推断课程名称
   - code 格式：CO-<缩写>
   - name 必须是完整的课程名称
2. 然后提取该清单中列出的全部实验项目
   - 每个项目作为 Experiment 节点（kind=experiment）
   - code 按顺序生成（如 EXP-01、EXP-02）
   - name 用清单中的项目名称

输出 JSON 格式：
{common_schema}"""
            return system, user

        # 默认（其他）：通用提取
        system = (
            "你是工程教育认证材料解析专家。从给定的教学材料文本中提取结构化的课程、"
            "实验、知识点和资源节点。严格输出 JSON。"
        )
        user = f"""材料类型：{material_category}
材料名称：{material_name}
材料文本（前 8000 字符）：
{material_text[:8000]}

请提取出该材料中包含的教学节点，输出 JSON 格式：
{common_schema}"""
        return system, user

    # ── 关系推理 ──────────────────────────────────────────

    async def infer_relations(
        self,
        school_nodes: list[dict],
        standard_nodes: list[dict],
    ) -> LLMResponse[list[RelationItem]]:
        start = time.time()

        system_prompt = (
            "你是能力图谱关系推理专家。分析学校教学节点与认证标准能力指标之间的支撑关系。\n"
            "【核心规则】\n"
            "只有 kind=course (课程) 或 kind=experiment (实验) 的节点才能作为支撑源(source_id)。\n"
            "kind=knowledge (知识点) 或 kind=resource (资源) 的节点是课程/实验的组成部分，不能直接支撑毕业要求。\n"
            "严格输出 JSON。"
        )
        user_prompt = f"""学校节点：
{json.dumps(school_nodes[:50], ensure_ascii=False)}

标准能力指标：
{json.dumps(standard_nodes[:30], ensure_ascii=False)}

请推断哪些【课程/实验】节点支撑哪些标准指标。

【支撑关系定义】
- 支撑关系 (SUPPORTS)：课程/实验 覆盖、训练、达成 某个毕业要求指标点
- 支撑强度 (strength)：
  - strong (强)：核心课程/实验直接对应指标点，学分高或目标明确
  - medium (中)：相关课程/实验间接支撑
  - weak (弱)：边缘关联

【输出要求】
- 仅输出 kind 为 course 或 experiment 的节点作为 source_id
- 每条关系必须包含 reasoning (推理依据) 和 confidence (置信度)

输出 JSON：
{{
  "items": [
    {{
      "source_id": "学校课程/实验节点 ID",
      "target_id": "标准指标 ID",
      "relation_type": "SUPPORTS",
      "strength": "strong|medium|weak",
      "confidence": 0.85,
      "reasoning": "推理依据，说明该课程/实验如何支撑此指标"
    }}
  ]
}}"""

        raw = await self._call_chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])

        latency = int((time.time() - start) * 1000)

        if raw.get("mock"):
            return self._mock_relations(latency)

        content = raw["choices"][0]["message"]["content"]
        parsed = self._parse_json_content(content)
        items = [
            RelationItem(
                source_id=item["source_id"],
                target_id=item["target_id"],
                relation_type=item.get("relation_type", "SUPPORTS"),
                strength=item.get("strength", "medium"),
                confidence=item.get("confidence", 0.8),
                reasoning=item.get("reasoning", ""),
            )
            for item in parsed.get("items", [])
        ]

        return LLMResponse(
            data=items,
            model=self._config.model,
            usage=self._build_usage(raw),
            latency=latency,
        )

    # ── 诊断叙述 ──────────────────────────────────────────

    async def generate_explanation(
        self,
        gap_facts: list[dict],
        rag_context: list[str] | None = None,
    ) -> LLMResponse[list[ExplanationItem]]:
        start = time.time()

        rag_text = "\n\n".join(rag_context) if rag_context else "（无 RAG 上下文）"

        system_prompt = (
            "你是工程教育认证诊断专家。基于给定的缺口事实数据和检索到的材料原文，"
            "为每个不达标的能力指标生成连贯的诊断叙述。叙述必须引用具体数据，不要说空话。"
        )
        user_prompt = f"""缺口事实数据：
{json.dumps(gap_facts, ensure_ascii=False)}

RAG 检索到的材料原文：
{rag_text[:4000]}

请为每个缺口生成一段诊断叙述，输出 JSON：
{{
  "items": [
    {{
      "target_code": "指标编号",
      "target_name": "指标名称",
      "narrative": "诊断叙述（200-300字，引用具体数据）",
      "evidence_refs": ["证据来源1", "证据来源2"]
    }}
  ]
}}"""

        raw = await self._call_chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])

        latency = int((time.time() - start) * 1000)

        if raw.get("mock"):
            return self._mock_explanation(gap_facts, latency)

        content = raw["choices"][0]["message"]["content"]
        parsed = self._parse_json_content(content)
        items = [
            ExplanationItem(
                target_code=item["target_code"],
                target_name=item["target_name"],
                narrative=item["narrative"],
                evidence_refs=item.get("evidence_refs"),
            )
            for item in parsed.get("items", [])
        ]

        return LLMResponse(
            data=items,
            model=self._config.model,
            usage=self._build_usage(raw),
            latency=latency,
        )

    # ── 改进建议 ──────────────────────────────────────────

    async def generate_suggestions(
        self,
        gaps: list[dict],
    ) -> LLMResponse[list[SuggestionItem]]:
        start = time.time()

        system_prompt = (
            "你是工程教育认证改进专家。针对认证缺口生成具体、可操作的改进建议。"
            "建议要具体到操作层面，不要说'建议加强支撑'这种空话。严格输出 JSON。"
        )
        user_prompt = f"""缺口列表：
{json.dumps(gaps, ensure_ascii=False)}

请为每个缺口生成改进建议，输出 JSON：
{{
  "items": [
    {{
      "target_code": "指标编号",
      "target_name": "指标名称",
      "root_cause": "根因分析",
      "suggestion": "具体建议",
      "expected_effect": "预期效果"
    }}
  ]
}}"""

        raw = await self._call_chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])

        latency = int((time.time() - start) * 1000)

        if raw.get("mock"):
            return self._mock_suggestions(gaps, latency)

        content = raw["choices"][0]["message"]["content"]
        parsed = self._parse_json_content(content)
        items = [
            SuggestionItem(
                target_code=item["target_code"],
                target_name=item["target_name"],
                root_cause=item["root_cause"],
                suggestion=item["suggestion"],
                expected_effect=item["expected_effect"],
            )
            for item in parsed.get("items", [])
        ]

        return LLMResponse(
            data=items,
            model=self._config.model,
            usage=self._build_usage(raw),
            latency=latency,
        )

    # ── 报告生成 ──────────────────────────────────────────

    async def generate_report(
        self,
        report_context: list[dict],
    ) -> LLMResponse[list[ReportChapterItem]]:
        start = time.time()

        system_prompt = (
            "你是工程教育认证自评报告撰写专家。根据给定的达成度数据和改进方向，"
            "为每条毕业要求生成一段符合认证报告体例的叙述。严格输出 JSON。"
        )
        user_prompt = f"""数据：
{json.dumps(report_context, ensure_ascii=False)}

请为每条毕业要求生成自评报告章节，输出 JSON：
{{
  "items": [
    {{
      "requirement_code": "GR-01",
      "chapter_title": "GR-01 工程知识",
      "standard_ref": "工程知识",
      "narrative": "本专业在工程知识方面的达成情况...（200-300字）"
    }}
  ]
}}"""

        raw = await self._call_chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])

        latency = int((time.time() - start) * 1000)

        if raw.get("mock"):
            return self._mock_report(report_context, latency)

        content = raw["choices"][0]["message"]["content"]
        parsed = self._parse_json_content(content)
        items = [
            ReportChapterItem(
                requirement_code=item["requirement_code"],
                chapter_title=item["chapter_title"],
                standard_ref=item["standard_ref"],
                narrative=item["narrative"],
            )
            for item in parsed.get("items", [])
        ]

        return LLMResponse(
            data=items,
            model=self._config.model,
            usage=self._build_usage(raw),
            latency=latency,
        )

    # ── 规划（Supervisor） ────────────────────────────────

    async def plan(
        self,
        goal: str,
        context: list[dict] | None = None,
    ) -> LLMResponse[list[PlanStep]]:
        start = time.time()

        system_prompt = (
            "你是工程教育认证多智能体系统的规划专家（Supervisor）。"
            "给定一个认证目标，规划完成它所需的协作步骤。严格输出 JSON。"
        )
        user_prompt = f"""认证目标：{goal}

可用的专项智能体阶段：
- extract 提取教学节点
- infer 推断支撑关系
- review 人工审核（人在回路）
- coverage 覆盖度分析
- diagnose 缺口诊断
- improve 改进建议
- report 报告撰写

请输出 JSON：
{{
  "items": [
    {{"phase": "extract", "title": "步骤标题", "description": "该步骤要做什么"}}
  ]
}}"""

        raw = await self._call_chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])

        latency = int((time.time() - start) * 1000)

        if raw.get("mock"):
            return await super().plan(goal, context)

        try:
            content = raw["choices"][0]["message"]["content"]
            parsed = self._parse_json_content(content)
            items = [
                PlanStep(
                    phase=str(item.get("phase", "")),
                    title=str(item.get("title", "")),
                    description=str(item.get("description", "")),
                )
                for item in parsed.get("items", [])
                if item.get("phase")
            ]
            if not items:
                return await super().plan(goal, context)
            return LLMResponse(
                data=items,
                model=self._config.model,
                usage=self._build_usage(raw),
                latency=latency,
            )
        except Exception:  # noqa: BLE001 — 规划失败时回退到确定性计划
            logger.warning("LLM 规划失败，回退到确定性计划。")
            return await super().plan(goal, context)

    # ── Embedding 接口（给 RAG 用） ──────────────────────

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """批量文本向量化。"""
        return await self._call_embedding(texts)

    # ── Mock 降级实现（无 API Key 时） ────────────────────

    def _mock_extract(
        self, material_category: str, material_name: str, latency: int
    ) -> LLMResponse[list[ExtractionItem]]:
        """无 API Key 时的降级：返回与前端 mock 一致的静态节点。"""
        from app.modules.llm.infra.mock_data import get_mock_extraction_items

        items = get_mock_extraction_items(material_category, material_name)
        return LLMResponse(
            data=items,
            model="deepseek-v2 (mock)",
            usage=LLMUsage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
            latency=latency,
        )

    def _mock_relations(self, latency: int) -> LLMResponse[list[RelationItem]]:
        from app.modules.llm.infra.mock_data import get_mock_relation_items

        items = get_mock_relation_items()
        return LLMResponse(
            data=items,
            model="deepseek-v2 (mock)",
            usage=LLMUsage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
            latency=latency,
        )

    def _mock_explanation(
        self, gap_facts: list[dict], latency: int
    ) -> LLMResponse[list[ExplanationItem]]:
        """降级：用规则化拼装代替 LLM 生成。"""
        items = [
            ExplanationItem(
                target_code=fact.get("code", ""),
                target_name=fact.get("name", ""),
                narrative=fact.get("rule_based_explanation", "暂无诊断叙述。"),
                evidence_refs=fact.get("evidence_refs"),
            )
            for fact in gap_facts
        ]
        return LLMResponse(
            data=items,
            model="deepseek-v2 (mock)",
            usage=LLMUsage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
            latency=latency,
        )

    def _mock_suggestions(
        self, gaps: list[dict], latency: int
    ) -> LLMResponse[list[SuggestionItem]]:
        from app.modules.llm.infra.mock_data import get_mock_suggestion_items

        items = get_mock_suggestion_items(gaps)
        return LLMResponse(
            data=items,
            model="deepseek-v2 (mock)",
            usage=LLMUsage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
            latency=latency,
        )

    def _mock_report(
        self, report_context: list[dict], latency: int
    ) -> LLMResponse[list[ReportChapterItem]]:
        from app.modules.llm.infra.mock_data import get_mock_report_items

        items = get_mock_report_items(report_context)
        return LLMResponse(
            data=items,
            model="deepseek-v2 (mock)",
            usage=LLMUsage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
            latency=latency,
        )
