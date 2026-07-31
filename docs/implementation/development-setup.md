# 本地开发与验证

## 1. 当前实现范围

基础工程采用单仓库、模块化单体和独立进程部署：

```text
apps/
  web/       # React + Vite + Ant Design 桌面管理端
  api/       # FastAPI 模块化 API
  worker/    # Celery 异步任务进程
packages/
  api-client-generated/  # OpenAPI 生成的 TypeScript 契约
infra/
  compose/   # 本地与试点编排
openapi/     # 固定版本的服务端契约
```

当前公开垂直切片包括系统状态、本地教学材料和 M2 能力图谱：

- `GET /api/v1/system/status`
- `POST /api/v1/materials`
- `GET /api/v1/materials`
- `GET /api/v1/materials/{material_id}`
- `POST /api/v1/materials/{material_id}/retry`
- `GET /api/v1/teaching-graph/workspace`
- `PUT /api/v1/teaching-graph/workspace`
- `POST /api/v1/teaching-graph/workspace/publish`
- `POST /api/v1/teaching-graph/workspace/revisions`
- `GET /api/v1/teaching-graph/audit-events`

M2、M3 均通过生成契约和 TanStack Query 访问本地 API。图谱工作区保存在 `.local-data/teaching-graph.sqlite3`，材料元数据保存在 `.local-data/materials.sqlite3`，材料原件保存在 `.local-data/objects`。M2 首次连接时使用显式命名的 `prototypeOnly` 图谱初始化服务端工作区，此后草稿、快照和审计均以服务端为准。其他模块的试点数据仍来自显式命名的 `prototypeOnly` 文件，用户操作草稿保存在浏览器。

管理端以 1920×1080 PC 屏幕为主要设计和验收基准，不实现移动端导航或移动端页面重排。1440 像素宽的桌面窗口保留基础可用布局。

## 2. 环境要求

- Node.js 24。
- pnpm 10。
- Python 3.13。
- uv 0.11 或更高版本。
- 可选：Docker 28 与 Docker Compose 2.38，用于完整基础设施。

## 3. 安装

```bash
make bootstrap
make generate-contracts
```

根据 `.env.example` 创建本地 `.env`。不要把真实学生数据、学校密钥或模型凭据写入仓库。

不配置外部基础设施也可以运行 M3。普通文本和带文本层文档使用本地解析；图片和扫描 PDF 需要配置：

```bash
EA_DEEPSEEK_OCR_BASE_URL=http://localhost:8001/v1
EA_DEEPSEEK_OCR_MODEL=deepseek-ai/DeepSeek-OCR
```

该地址应指向用户自己部署的 DeepSeek-OCR OpenAI 兼容服务。官方 DeepSeek 通用 API 当前不接受图片输入，因此不能把 `https://api.deepseek.com` 当作 OCR 端点。若要用 DeepSeek 对已提取文本做结构化，再配置 `EA_DEEPSEEK_API_KEY`。

## 4. 开发启动

终端一：

```bash
make api
```

终端二：

```bash
pnpm dev
```

访问：

- 管理端：`http://127.0.0.1:5173`
- API 文档：`http://127.0.0.1:8000/api/docs`
- OpenAPI：`http://127.0.0.1:8000/api/openapi.json`

## 5. Docker Compose

```bash
docker compose -f infra/compose/compose.yaml up --build
```

默认端口：

- 管理端与反向代理：`8080`
- API：`8000`
- PostgreSQL：`5432`
- Redis：`6379`
- MinIO API：`9000`
- MinIO 控制台：`9001`

Compose 中的账户仅用于本地开发。试点或生产部署必须改用学校批准的密钥管理、对象存储和数据库凭据。

## 6. 契约更新

FastAPI/Pydantic 是 API 契约的唯一来源。修改公开请求或响应后执行：

```bash
make generate-contracts
```

该命令依次更新：

1. `openapi/openapi.json`。
2. `packages/api-client-generated/src/schema.d.ts`。

禁止在前端手写重复的请求/响应 DTO。

## 7. 质量门槛

```bash
make lint
make typecheck
make test
make build
make compose-config
```

前端使用 `antd lint apps/web/src --format json` 检查弃用 API、可访问性和常见性能问题。架构边界使用项目架构检查脚本验证，保持前端依赖方向：

```text
app → views → widgets → features → entities → shared
```

后端保持：

```text
routes → application → domain
infrastructure → application/domain ports
```

## 8. 尚未接入

- OIDC 和数据范围授权。
- PostgreSQL 领域模型与 Alembic 迁移。
- 个人信息检测、脱敏和向量化流水线。
- ClamAV 病毒库安装与自动更新（代码会在本机可用时调用）。
- DeepSeek-OCR 服务部署和真实模型密钥（仅提供适配器与配置）。
- 评价策略、确定性计算和评价快照。
- OIDC 接入后的正式关系角色授权与组织数据范围。
- M2 PostgreSQL 关系化投影、数据库级业务约束和 Alembic 迁移。
- M5—M8 对 M2 影响待办的真实跨模块消费。
