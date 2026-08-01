"""LLM 基础设施层。

具体实现通过子模块直接导入（如 ``app.modules.llm.infra.llm_client``），
此包不在 ``__init__`` 中强制导入任何实现，避免在缺少可选依赖时阻断应用启动。
"""
