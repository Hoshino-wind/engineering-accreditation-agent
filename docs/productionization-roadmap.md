# 生产化路线图：从演示版到真实生产应用（对齐 PRD v1.0）

> 生成日期：2026-08-03 ｜ 更新：同日对齐 `prd/engineering-cert-agent-prd-v1.0.md` 的需求口径。
> 背景：8 月 8 日演示后，将平台从"内存演示版"升级为真实生产级应用。
> 原则：**演示前冻结**（8.8 之前不动基础设施），演示后按阶段推进，每阶段独立可验收。

## 一、现状盘点

### 已经是真的（不用动）

- 认证鉴权（JWT 7 天 + bcrypt）、六边形架构 + AST 边界测试（20 个测试绿）
- 上传 → PDF 真实文本提取（pymupdf）→ 真实 LLM 提取/推断/诊断/改进/报告
- LangGraph 8 节点编排 + interrupt 人工审核闭环
- 覆盖度纯规则计算（strong=3/medium=2/weak=1，达标线 ≥3）、pipeline 状态聚合接口
- 前后端真实联调（图谱/进度条/横幅/控制台审核均消费真实数据）
- per-user 数据隔离（内存克隆版）、无 LLM Key 自动 mock 降级

### 骨架已就位、实现是空的（生产化的主战场）

| 已有骨架 | 位置 | 缺的实现 |
|---|---|---|
| `Database`（SQLAlchemy async） | `apps/api/app/infrastructure/database.py` | 无人引用；无 ORM 模型、无 alembic |
| compose 全家桶 | `infra/compose/compose.yaml` | pgvector:pg17、redis:8、MinIO、worker-document/worker-ai、nginx 都定义好了，API 侧没用 |
| Celery worker | `apps/worker/worker_app/` | 只有 `system.ping` 任务 |
| Web 生产构建 | `apps/web/Dockerfile` + `nginx.conf` | 前端代码里还有 prototypeOnly 兜底 |
| 仓储 Protocol 端口 | 各模块 `application/ports.py` | 实现全是 `memory_store`，换成 SQL 实现不影响路由层 |
| 配置字段 | `config.py`：`database_url` / `redis_url` / `object_storage_endpoint` | `.env` 里没配 |

### 明确是演示态的

- 所有数据内存态（重启即清，PRD 4.2 已明确列为 v1.0 取舍项）
- 上传文件字节不落盘（只存元数据 + 当场提取文本）
- LangGraph `InMemorySaver`（运行记录重启即失）
- 前端种子数据 + 本地 state（刷新丢上传记录）；`rag=None`

## 二、PRD 需求口径对齐

### 2.1 PRD v1.1 候选清单 ↔ 本路线图映射

PRD 11.3 列出的 Demo 后规划，逐项落位：

| PRD v1.1 候选项 | 路线图位置 | 优先级 |
|---|---|---|
| 持久化数据库切换（PostgreSQL） | Phase 1 + Phase 3 | P0 |
| **认证材料导出（Excel/PDF/JSON）** | **Phase 5（新增）** | **P0（PRD 明确"Demo 后第一迭代补齐"，且 v0.1 曾列入 MVP）** |
| 管理员端与多角色权限（admin/reviewer） | Phase 7 增强项 | P1 |
| 站内消息通知与协作 | Phase 7 增强项 | P2 |
| AI 效果评估集与量化指标 | Phase 7 增强项 | P2 |
| 多专业方向支持（突破电子信息工程） | Phase 7（标准库/seed 配置化） | P2 |

### 2.2 PRD 非功能需求（第 7 节）核验结果

| 维度 | PRD 要求 | 实际核验 |
|---|---|---|
| 性能 | 提取 ≤30s；50 节点流畅；Autopilot ≤2min | 提取实测约 5s ✅；图谱 21 节点流畅 ✅；**Autopilot 全链路未实测，Phase 1 后需计时验证** |
| 安全 | bcrypt / JWT / Key 走环境变量 | ✅ 符合 |
| 降级能力 | 无 Key 自动 mock | ✅ 符合（建议改为显式 `EA_LLM_MOCK` 开关） |
| 数据隔离 | per-user 互不可见 | ✅ 内存版符合；Phase 1 改行级 `owner_id` 后需补隔离回归测试 |
| 可演示性 | 离线可跑 Demo | ✅ 符合 |
| **日志** | **关键操作记录操作人与时间；AI 任务记录输入输出** | **⚠️ PRD 标注"已实现"，实际代码中没有审计日志模块 → Phase 6 必做，按 PRD 口径实现操作审计表 + AI 调用留痕** |
| 持久化 | 上线前切 PostgreSQL | ⚠️ 待做（本路线图主体） |

### 2.3 目标技术栈决策（相对 v0.1 设想）

v0.1 设想 PostgreSQL + Neo4j + MinIO + Milvus。建议调整为：

- **PostgreSQL**：照做（compose 已备，含 pgvector 扩展）。
- **Milvus → pgvector 替代**：RAG 向量检索规模小（每用户数百 chunk），pgvector 足够，少维护一个组件。
- **MinIO**：照做（compose 已备），Phase 2 接入。
- **Neo4j 缓做**：图谱规模 ≤50 节点，关系型表 + JSONB 完全够用；若甲方评审时强调图数据库，再在 Phase 7 补（接口已按端口隔离，切换成本可控）。**需与需求方确认此项。**

## 三、分阶段计划

### Phase 0：演示冻结期（现在 → 8.8）

只做演示脚本（V1）+ 录屏兜底（V2）+ 全栈冒烟，**不碰存储/部署**。

同时完成 PRD 11.2 交付件清单中的未完成项：

| 交付件（PRD 口径） | 负责人 | 状态与对策 |
|---|---|---|
| 可运行 Demo 环境（含 seed 数据） | 后端（Qoder） | 内存态已就绪，演示期间不重启 |
| Demo 演示脚本（标准流程走查） | 产品 + Qoder | V1 脚本起草中 |
| 离线 mock 模式验证 | 后端 | ✅ 已具备 |
| 演示账号（预置数据的 teacher 账号） | 后端（Qoder） | 已有 wang/123456，演示前再建一个预置完整数据的账号 |
| 演示用教学材料（电子信息工程方向） | 产品 | 桌面 `实验资料/` 已有 10 门课真实材料（单片机基础、数字信号处理、通信原理、FPGA 基础等）+ 学院汇报 PPT，直接选用；已自制一份培养方案测试 PDF 备用 |

### Phase 1：PostgreSQL 持久化（P0，约 3 人日，Qoder）

目标：所有业务数据落库，重启不丢。

1. **ORM 模型**（新建 `app/infrastructure/models.py`）：
   `users`、`teaching_resources`、`recognition_candidates`、`diagnostic_findings`、
   `improvement_cases`、`orchestration_runs`（运行快照 JSONB）、`audit_logs`（Phase 6 用，先建表）。
   多用户隔离：表级 `owner_id` 列（替代 per-user 内存克隆）。
2. **alembic 初始化**：`uv add alembic`，首个迁移建全部表。
3. **SQL 仓储实现**：每个模块 `infra/sql_store.py` 实现同名 Protocol（6 个端口），
   路由层零改动；`main.py` 按 `EA_DATABASE_URL` 有无切换 SQL/内存实现。
4. **users 表 + seed 脚本** `scripts/seed.py`：演示账号与示例数据由脚本注入
   （`seed --demo` 注入示范专业数据，生产空启动）。
5. **删除 `PerUserRepositoryManager`**，仓储查询全部带 `owner_id`；
   `_process_resource_background` 里"遍历所有用户找 resource"改为按 owner 直查。

验收：compose 起 postgres → 全流程走通 → 重启数据仍在；pytest 全绿（新增 SQL 集成测试 ≥10 个）；**隔离回归：A 用户数据对 B 不可见**。

### Phase 2：文件对象存储（约 1 人日，Qoder）

1. `FileStoragePort` 抽象 + MinIO 实现（compose 已备 MinIO），本地磁盘实现兜底。
2. 上传写存储，`teaching_resources` 记 `storage_key` + `sha256`。
3. `GET /resources/{id}/download`（带鉴权），前端材料行加"下载原件"。

验收：上传 → 重启 → 仍可下载且哈希一致。

### Phase 3：LangGraph 持久化（约 0.5 人日，Qoder）

`uv add langgraph-checkpoint-postgres`，有库时用 `AsyncPostgresSaver`。
验收：上传触发 run → 重启 → 控制台仍可见并可继续审核。

### Phase 4：前端生产化（约 1 人日，trea，依赖 Phase 1）

1. 材料列表改 `GET /resources` 真实数据；上传后 refetch。
2. `prototypeOnly*` 兜底改为错误态/重试；仅 `VITE_DEMO_FALLBACK=true` 允许假数据。
3. `pnpm build` 走 web Dockerfile，验证 nginx 路由与 `/api` 反代。

验收：compose 起全套后浏览器全流程无假数据；刷新不丢记录。

### Phase 5：认证材料导出（约 1.5 人日，PRD v1.1 首位候选；后端 1 + 前端 0.5）

PRD 4.3 明确"Demo 后第一迭代补齐"，v0.1 曾列入 MVP，甲方大概率会问。

1. 后端 `POST /export`：聚合图谱/覆盖度/诊断/改进/达成度，输出 Excel（openpyxl）、
   PDF（自评报告章节拼装）、JSON（结构化全量）三种格式。
2. 前端报告页加导出按钮（复用 generate-report 的 ReportExportButton 壳）。

验收：一键导出三格式，内容与页面数据一致。

### Phase 6：部署与环境（约 1 人日，联合）

1. `.env.example` 全字段说明；`EA_LLM_MOCK` 显式开关。
2. compose 补 MinIO 数据卷、`restart: unless-stopped`；API entrypoint 先跑
   `alembic upgrade head`。
3. 健康检查 `/api/v1/system/live`（compose 已写好）。
4. **补齐 PRD 第 7 节日志要求**：`audit_logs` 记录注册/上传/审核/改进的操作人与时间；
   AI 调用输入输出留痕（供效果评估）。
5. 一键启动文档：`docker compose -f infra/compose/compose.yaml up --build`。

验收：干净环境一条命令起全套，5 分钟内走完演示流程；审计表可查关键操作。

### Phase 7：增强项（v1.1+，按需排期）

| 项 | 说明 | 预估 |
|---|---|---|
| 多角色权限 | admin/reviewer 角色（PRD 5.1 预留） | 2 人日 |
| Celery 真实任务 | 上传处理迁 worker-document，AI 调用走 worker-ai（compose 已备） | 2 人日 |
| RAG 落地 | `rag=None` → pgvector 检索，诊断叙述带真实引证 | 2 人日 |
| 限流与上传校验 | 类型白名单、大小上限、慢速攻击防护 | 1 人日 |
| 站内消息通知 | PRD v0.1 8.3.1 遗留项 | 1.5 人日 |
| AI 效果评估集 | 固定材料集 + 提取准确率回归 | 1.5 人日 |
| 多专业方向 | 标准库/seed 按专业配置化 | 2 人日 |
| Neo4j（如甲方要求） | 图存储迁移 | 2 人日 |
| 监控 | 结构化日志 + /metrics + Sentry | 1 人日 |

## 四、分工总览

| 阶段 | Qoder（后端） | trea（前端） |
|---|---|---|
| Phase 0 | 演示环境/账号/冒烟 | 配合走查 |
| Phase 1 | ORM + alembic + SQL 仓储 + DI + 隔离 | — |
| Phase 2 | FileStoragePort + 下载接口 | 下载按钮（小） |
| Phase 3 | PostgresSaver | — |
| Phase 4 | 联调支持 | 真实数据接入、摘兜底、构建验证 |
| Phase 5 | 导出 API（三格式） | 导出按钮与交互 |
| Phase 6 | entrypoint + 审计日志 | nginx/产物验证 |

关键依赖：Phase 4/5 前端部分须等 Phase 1；Phase 2/3 与 Phase 4 可并行。

## 五、风险与决策点（需与需求方确认）

1. **Neo4j 是否必需**：v0.1 设想含 Neo4j，建议 pgvector + 关系表替代并缓做 Neo4j，需确认。
2. **seed 数据去留**：建议空启动 + `seed --demo` 注入示范专业数据（评审/销售演示用）。
3. **内存模式保留**：`EA_DATABASE_URL` 为空自动降级内存，便于测试与离线演示；生产必配库。
4. **审计日志是 PRD 已承诺项**：PRD 标注"已实现"但实际未做，Phase 6 必须补齐，避免验收穿帮。
5. **LLM Key**：生产只进容器环境变量；补 `EA_LLM_MOCK` 显式开关替代隐式约定。

## 六、总排期

Phase 1–6 合计约 **8 人日**（Qoder 6 + trea 1.5 + 联合 0.5），8.8 演示后启动，
约一周半交付生产级 v1.0（含 PRD 承诺的持久化 + 导出 + 审计日志）；Phase 7 作为 v1.1+ 迭代。
