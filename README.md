# 工程认证智能体（实验教学方向）

面向高校工程教育认证与实验教学质量改进的证据驱动平台。系统围绕“标准—毕业要求—课程目标—实验项目—评分规则—学生证据—达成度—问题—改进—复评”构建可追溯闭环，人工智能用于材料理解、关系建议和辅助诊断，正式达成度由可复现的确定性规则计算。

## 技术基线

- 前端：React、TypeScript、Vite、Ant Design
- 后端：FastAPI
- API：REST、OpenAPI，服务端契约生成 TypeScript 客户端
- 数据：当前本地 SQLite；试点目标为 PostgreSQL、pgvector
- 文件：当前本地内容寻址对象目录；试点目标为 S3 兼容对象存储
- 异步任务：当前 FastAPI 本地后台任务；试点目标为 Celery、Redis
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
- [达成度金标准样例（验收标尺）](golden-sample/README.md)

## 当前状态

项目已进入基础工程阶段，当前已建立：

- React + TypeScript + Vite + Ant Design 桌面管理端。
- FastAPI 模块化 API 和版本化 OpenAPI 契约。
- 从 OpenAPI 自动生成的 TypeScript 类型客户端。
- Celery Worker 基础进程和任务注册测试。
- PostgreSQL + pgvector、Redis、MinIO 的 Docker Compose 试点拓扑。
- M3 本地材料流水线：SQLite、内容寻址文件、对象扫描、病毒扫描、文档解析、DeepSeek-OCR/DeepSeek 适配器和失败重试。
- API、Worker 和前端的 lint、类型检查、测试与构建命令。

M1～M9 已形成可导航、可操作的 16:9 PC 闭环：M2 支持图谱节点/关系维护与版本发布，M3 已接入真实本地材料数据与扫描/解析流水线，M4～M6 支持运行、审核/处置/复核，M7 支持新建问题与有效性结论，M8 支持新建支撑包、复核和本地受控导出，M9 支持角色范围、审计记录与模型数据策略。M3 数据保存在本机 SQLite 和对象目录；其他模块的业务草稿、图谱和治理配置暂存在当前浏览器。OIDC、服务端数据范围、个人信息脱敏、审批服务、正式任务队列和其他模块数据库持久化仍需继续接入。

本仓库只保存代码、配置模板和脱敏文档，不保存学生报告、成绩表、培养方案原件等私有教学材料。

## 本地开发

环境要求：Node.js 24、pnpm 10、Python 3.13、uv。

```bash
make bootstrap
make generate-contracts
```

分别启动 API 和前端：

```bash
make api
pnpm dev
```

- 管理端：`http://127.0.0.1:5173`
- API 文档：`http://127.0.0.1:8000/api/docs`

完整说明见 [本地开发与验证](docs/implementation/development-setup.md)。
