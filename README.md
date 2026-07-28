# 工程认证智能体（实验教学方向）

面向高校工程教育认证与实验教学质量改进的证据驱动平台。系统围绕“标准—毕业要求—课程目标—实验项目—评分规则—学生证据—达成度—问题—改进—复评”构建可追溯闭环，人工智能用于材料理解、关系建议和辅助诊断，正式达成度由可复现的确定性规则计算。

## 技术基线

- 前端：React、TypeScript、Vite、Ant Design
- 后端：FastAPI
- API：REST、OpenAPI，服务端契约生成 TypeScript 客户端
- 数据：PostgreSQL、pgvector
- 文件：S3 兼容对象存储，试点环境可使用 MinIO
- 异步任务：Celery、Redis
- 模型：可替换的大模型适配层
- 登录：OIDC / 学校统一身份认证
- 部署：校内服务器或私有云；开发和首期试点采用 Docker Compose

## 文档

完整文档从 [docs/README.md](docs/README.md) 开始：

- [项目分析与产品边界](docs/product/project-analysis.md)
- [现有实验资料盘点](docs/product/material-inventory.md)
- [总体技术架构](docs/architecture/technical-architecture.md)
- [数据、评价与 AI 架构](docs/architecture/data-and-ai-architecture.md)
- [数据安全与合规基线](docs/security/data-security.md)
- [MVP 范围与实施路线](docs/implementation/mvp-roadmap.md)

## 当前状态

项目处于需求与架构基线阶段。本仓库只保存代码、配置模板和脱敏文档，不保存学生报告、成绩表、培养方案原件等私有教学材料。
