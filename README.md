# 工程认证智能体（实验教学方向）

面向高校工程教育认证与实验教学质量改进的证据驱动平台。系统围绕“标准—毕业要求—课程目标—实验项目—评分规则—学生证据—达成度—问题—改进—复评”构建可追溯闭环，人工智能用于材料理解、关系建议和辅助诊断，正式达成度由可复现的确定性规则计算。

本仓库可直接用于本地演示、开发联调和首期试点部署验证。仓库只保存代码、配置模板和脱敏文档，不保存学生报告、成绩表、培养方案原件等私有教学材料。

## 快速开始

推荐首次交付验收使用 Docker Compose，一条命令启动前端、API、Worker、PostgreSQL、Redis 和 MinIO：

```bash
docker compose -f infra/compose/compose.yaml up --build
```

启动完成后访问：

- 管理端：`http://127.0.0.1:8080`
- API 文档：`http://127.0.0.1:8000/api/docs`
- MinIO 控制台：`http://127.0.0.1:9001`

内置演示账号：

| 用户名 | 密码 | 角色 |
| --- | --- | --- |
| `admin` | `admin123` | 系统管理员 |
| `wang` | `123456` | 教师 |
| `li` | `123456` | 教师 |

当前默认关闭公开注册，新用户由后台或种子账号创建；注册入口即使打开，也只创建最小权限的教师用户。生产环境禁止使用共享演示账号。

## 无模型 Key 演示

本项目可以在未配置大模型 Key 的情况下完成主要业务页面走查。系统内置脱敏的试点示例数据，AI 相关能力在未配置 Key 时不会阻塞管理端、系统状态、图谱、诊断、达成度、改进和认证支撑页面的演示。

如需接入真实模型，在本地 `.env` 或部署环境变量中配置：

```bash
EA_LLM_API_KEY=your-api-key
EA_LLM_API_BASE_URL=https://api.deepseek.com/v1
EA_LLM_MODEL=deepseek-chat
EA_LLM_EMBEDDING_API_KEY=your-embedding-api-key
EA_LLM_EMBEDDING_BASE_URL=https://api.deepseek.com/v1
EA_LLM_EMBEDDING_MODEL=text-embedding-3-small
```

不要把真实学校密钥、模型 Key、学生数据或生产凭据提交到仓库。

## 本地开发

环境要求：Node.js 24、pnpm 10、Python 3.13、uv。

首次安装：

```bash
make bootstrap
make generate-contracts
```

根据 `.env.example` 创建本地 `.env`，然后分别启动 API 和前端：

```bash
make api
pnpm dev
```

访问：

- 管理端：`http://127.0.0.1:5173`
- API 文档：`http://127.0.0.1:8000/api/docs`
- OpenAPI：`http://127.0.0.1:8000/api/openapi.json`

完整说明见 [本地开发与验证](docs/implementation/development-setup.md)。

## 环境变量

配置模板见 [.env.example](.env.example)。常用变量：

| 变量 | 说明 |
| --- | --- |
| `EA_ENVIRONMENT` | 运行环境，开发默认 `development` |
| `EA_DATABASE_URL` | PostgreSQL 连接串；留空时使用内存/JSON 演示存储 |
| `EA_REDIS_URL` | Redis 地址 |
| `EA_OBJECT_STORAGE_ENDPOINT` | S3 兼容对象存储地址，试点可用 MinIO |
| `EA_CORS_ORIGINS` | 允许访问 API 的前端来源 |
| `EA_ALLOW_PUBLIC_REGISTRATION` | 是否允许公开注册，默认 `false` |
| `EA_JWT_SECRET` | JWT 密钥，非开发环境必须显式配置 |
| `VITE_API_BASE_URL` | 前端 API 地址；留空表示通过当前域名访问 `/api` |

Docker Compose 中的数据库、Redis、MinIO 账号仅用于本地开发和试点验证。试点或生产部署必须改用学校批准的密钥管理、对象存储和数据库凭据。

## 验证命令

```bash
make lint
make typecheck
make test
make build
make compose-config
```

公开 API 契约以 FastAPI/Pydantic 为唯一来源。修改请求或响应后执行：

```bash
make generate-contracts
```

该命令会更新 `openapi/openapi.json` 和 `packages/api-client-generated/src/schema.d.ts`。

## 当前状态

项目已建立：

- React + TypeScript + Vite + Ant Design 桌面管理端。
- FastAPI 模块化 API 和版本化 OpenAPI 契约。
- 从 OpenAPI 自动生成的 TypeScript 类型客户端。
- Celery Worker 基础进程和任务注册测试。
- PostgreSQL + pgvector、Redis、MinIO 的 Docker Compose 试点拓扑。
- API、Worker 和前端的 lint、类型检查、测试与构建命令。

M1 总览与任务工作台已按“教学资源—识别审核—正式图谱—诊断—评价—改进—认证支撑”主线展示图谱建设进度、质量门槛和优先任务；M3 教学资源与材料已提供材料治理和证据片段查看；M4 智能识别与映射审核已提供候选筛选、候选与正式值对照、来源核验和本地审核草稿；M5 图谱分析与一致性诊断已提供发现筛选、规则与版本追溯、覆盖路径、影响范围、依据核验和本地处置草稿；M6 达成度评价与统计已提供评价对象筛选、输入就绪校验、确定性加权计算、版本与输入快照追溯、完整计算明细和本地复核草稿；M7 教学优化与持续改进已提供问题筛选、来源与根因追溯、措施和实际教学对象版本关联、图谱更新、复评对比、关闭门槛和本地有效性草稿；M8 工程认证支撑已提供支撑包筛选、M2～M7 来源快照、章节与证据索引预览、8 项导出校验、上游阻断跳转和本地导出配置草稿。

页面业务数量是显式标记的试点示例数据，系统状态来自真实 API；材料上传、识别任务、审核与诊断写入、评分导入、正式评价运行、改进审批与写入、支撑包生成/审批/导出、OIDC 和持久化仍按 MVP 路线逐步接入。

## 技术基线

- 前端：React、TypeScript、Vite、Ant Design
- 后端：FastAPI
- API：REST、OpenAPI，服务端契约生成 TypeScript 客户端
- 数据：PostgreSQL、pgvector
- 文件：S3 兼容对象存储，试点环境可使用 MinIO
- 异步任务：Celery、Redis
- 模型：可替换的大模型适配层
- 登录：当前为内置演示账号；生产目标为 OIDC / 学校统一身份认证
- 部署：校内服务器或私有云；开发和首期试点采用 Docker Compose

## 文档

完整文档从 [docs/README.md](docs/README.md) 开始：

- [项目分析与产品边界](docs/product/project-analysis.md)
- [现有实验资料盘点](docs/product/material-inventory.md)
- [总体技术架构](docs/architecture/technical-architecture.md)
- [数据、评价与 AI 架构](docs/architecture/data-and-ai-architecture.md)
- [数据安全与合规基线](docs/security/data-security.md)
- [MVP 范围与实施路线](docs/implementation/mvp-roadmap.md)

## 常见问题

**启动后前端无法访问 API。** 确认 API 已启动，并检查 `EA_CORS_ORIGINS` 是否包含当前前端地址。Docker Compose 默认包含 `http://localhost:8080`，本地开发默认包含 `http://localhost:5173`。

**没有模型 Key 能不能演示。** 可以。主要页面和试点示例数据可以离线走查；需要真实 AI 生成时再配置 `EA_LLM_*` 变量或在用户设置中填入模型配置。

**是否已经是生产可直接上线形态。** 不是。当前定位是可运行演示与首期试点工程底座，正式生产仍需接入学校 OIDC、真实持久化迁移、对象存储初始化、审计、备份和数据范围授权。
