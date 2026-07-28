# 工程认证智能体文档

## 阅读顺序

1. [项目分析与产品边界](product/project-analysis.md)：为什么做、解决什么问题、哪些内容不做。
2. [功能模块产品总图](product/modules/README.md)：8 个业务模块、1 个系统治理模块及各模块产品文档。
3. [端到端业务闭环](product/end-to-end-closed-loop.md)：模块交接、状态回退、追溯链和首个闭环验收。
4. [现有实验资料盘点](product/material-inventory.md)：真实资料的类型、规模和对产品设计的影响。
5. [总体技术架构](architecture/technical-architecture.md)：技术选型、代码模块边界、部署和 API 契约。
6. [代码架构约定](architecture/code-architecture.md)：前后端分层、依赖方向、状态所有权和架构门槛。
7. [数据、评价与 AI 架构](architecture/data-and-ai-architecture.md)：核心数据模型、确定性评价、检索增强和模型适配。
8. [数据安全与合规基线](security/data-security.md)：学生数据、权限、审计、模型调用和文件安全。
9. [MVP 范围与实施路线](implementation/mvp-roadmap.md)：按垂直切片打通产品模块和退出条件。
10. [本地开发与验证](implementation/development-setup.md)：基础工程、启动方式、契约生成和质量门槛。

## 已确认的架构决策

| 主题 | 决策 | 关键理由 |
| --- | --- | --- |
| 代码组织 | 单仓库、模块化单体 | 保持领域边界，同时降低首期部署和联调复杂度 |
| 前端 | React + TypeScript + Vite + Ant Design | 适合信息密集型管理端，组件生态成熟 |
| 后端 | FastAPI | 原生 OpenAPI、类型清晰，适合文档解析与 AI 任务编排 |
| 契约 | REST + OpenAPI | FastAPI/Pydantic 是契约源，前端客户端自动生成 |
| 主数据 | PostgreSQL | 保存权威业务关系、版本、评价结果与审计信息 |
| 语义检索 | pgvector | 与主数据同库起步，简化运维；不替代权威关系表 |
| 文件 | S3 兼容对象存储 | 原始文件不进入数据库；便于适配学校现有存储 |
| 异步任务 | Celery + Redis | 支撑解析、OCR、向量化、批量分析等长任务 |
| 模型 | 可替换适配层 | 避免业务逻辑绑定单一厂商和单一模型 |
| 身份 | OIDC / 学校统一身份认证 | 复用学校账户体系，后端会话优先 |
| 部署 | Docker Compose 起步 | 适合校内试点；达到明确规模阈值后再评估 Kubernetes |

## 文档维护规则

- 业务规则变化时，先更新项目或数据架构文档，再调整实现。
- API 以服务端 OpenAPI 为唯一机器可读契约，不在前后端重复手写模型。
- 正式评价公式、阈值和聚合规则必须版本化，并能从输入证据重算。
- 文档示例不得包含真实姓名、学号、成绩或可回溯到个人的文件内容。
