# 总体技术架构

## 1. 架构目标

系统首先服务校内试点，需要在可维护、可部署和可审计之间取得平衡。首期采用**单仓库、模块化单体、独立进程部署**：

- 一个 React 管理端。
- 一个 FastAPI API 服务。
- 一个或多个 Celery Worker。
- PostgreSQL、Redis 和 S3 兼容对象存储。

各业务模块在代码和数据库访问层保持明确边界，但暂不拆成网络微服务。只有当团队、扩缩容或安全隔离出现明确需求时再拆分。

## 2. 系统上下文

```mermaid
flowchart LR
    U["教师 / 专业负责人 / 管理员"] --> W["React 管理端"]
    W --> A["FastAPI API"]
    A --> P["PostgreSQL + pgvector"]
    A --> O["S3 兼容对象存储"]
    A --> R["Redis"]
    R --> C["Celery Worker"]
    C --> P
    C --> O
    C --> M["模型适配层"]
    A --> I["学校 OIDC / 统一身份认证"]
    C --> X["OCR / 文档解析组件"]
```

## 3. 技术选型

### 3.1 前端

- React + TypeScript + Vite。
- Ant Design 作为成熟管理端组件库。
- TanStack Query 管理服务端状态和缓存。
- React Hook Form + Zod 管理复杂表单和前端校验。
- 路由按业务能力拆分，页面只组合功能模块，不直接实现领域规则。

状态管理原则：

- 组件交互状态使用 `useState` / `useReducer`。
- 服务端数据使用 TanStack Query。
- 会话、当前专业和全局展示偏好使用小范围 Context。
- 跨模块本地业务操作事件由 `entities/workflow-event` 统一建模和订阅；浏览器存储只服务原型通知与审计界面，正式审计事实由 M9 后端 `audit` 模块持有。
- 首期不默认引入 Redux；只有出现可证明的跨页面复杂客户端状态时再评估。

### 3.2 后端

- FastAPI 提供 REST API 和 OpenAPI 文档。
- Pydantic 定义请求、响应和领域边界模型。
- SQLAlchemy 2.x 和 Alembic 管理持久化与迁移。
- Celery 运行解析、OCR、向量化、批量评价和导出任务。
- Redis 作为消息代理和短期协调组件，不作为业务事实来源。

### 3.3 数据与文件

- PostgreSQL 保存正式图谱节点/关系、版本、任务状态、诊断结果、评价结果和审计记录。
- pgvector 保存经过授权的脱敏片段向量，用于语义召回。
- 原始文件、解析产物和导出包保存在 S3 兼容对象存储。
- MinIO 仅作为试点环境的默认实现；生产环境优先适配学校已有对象存储，并完成许可证与运维评审。

### 3.4 身份认证

- 优先接入学校 OIDC。
- 推荐后端代理登录并使用 `HttpOnly`、`Secure`、`SameSite` Cookie 保存会话，避免浏览器长期持有访问令牌。
- 若现有环境要求纯前端客户端，使用 Authorization Code + PKCE。
- 学校仅提供 SAML、CAS 或 LDAP 时，可用 Keycloak 作为身份代理，再向本系统提供 OIDC。

### 3.5 模型

- 业务模块只依赖统一模型接口，不直接调用厂商 SDK。
- 模型、部署方式、超时、重试、数据保留策略和能力标签由配置决定。
- 外部模型默认禁止接收未经脱敏的学生材料。

## 4. 建议仓库结构

```text
apps/
  web/
    src/
      app/          # 启动、路由、全局提供者
      views/        # 页面级组合
      widgets/      # 业务复合区块
      features/     # 用户动作与业务功能
      entities/     # 前端领域展示模型
      shared/       # 通用组件、请求和工具
  api/
    app/
      factory.py      # 应用组合根
      main.py         # 部署入口
      core/         # 环境配置和应用级横切能力
      infrastructure/ # 跨模块基础设施适配器
      modules/      # 按领域模块组织；内部含 routes/contracts/application/domain/infra
  worker/
    app/
      tasks/        # 异步任务入口
      pipelines/    # 文档、向量、评价、导出流水线
packages/
  api-client-generated/  # 从 OpenAPI 生成，禁止手工维护
infra/
  compose/
  migrations/
docs/
```

这是结构目标，不要求在文档阶段提前创建空目录。

## 5. 后端领域模块

以下是代码一致性边界，不与产品菜单机械地一一对应。产品模块、状态机和交接关系以[功能模块产品总图](../product/modules/README.md)和[端到端业务闭环](../product/end-to-end-closed-loop.md)为准。

| 代码模块 | 对应产品模块 | 职责 |
| --- | --- | --- |
| `identity_access` | M9 | 用户、角色、组织范围和 OIDC 会话 |
| `workspaces` | M1 | 工作空间、评价周期、范围快照、进度聚合和业务待办索引 |
| `teaching_resources` | M3 | 材料、资源版本、解析片段、敏感内容和来源定位 |
| `teaching_graph` | M2 | 图谱 Schema、正式节点/关系、版本、来源和影响链 |
| `recognition` | M4 | 识别运行、节点/关系候选、冲突和人工审核 |
| `graph_analysis` | M5 | 分析规则、覆盖/一致性运行、诊断发现和豁免 |
| `evaluations` | M6 | 评分输入、评价策略、确定性计算、快照和复核 |
| `improvements` | M7 | 问题、原因、措施、实际变更、复评和闭环 |
| `reporting` | M8 | 固定模板、认证支撑包、引用校验和导出 |
| `processing` | M1～M8 共用 | 异步任务、执行尝试、重试和任务事件 |
| `intelligence` | M3～M7 共用 | 解析、检索、模型适配、输出校验和质量评测 |
| `audit` | M9 | 操作、下载、审批和模型调用审计 |

每个模块内部按 `routes`、`contracts`、`application`、`domain` 和 `infra` 组织。`factory.py` 是可测试的组合根，`main.py` 只创建部署实例；路由只处理协议和鉴权，应用层通过 ports 依赖外部能力，领域规则不放在路由、ORM 模型或 Celery 任务入口中。详细依赖方向见[代码架构约定](code-architecture.md)。

首期把课程、课程目标、实验、知识、技能、能力、Rubric 和评分项作为 `teaching_graph` 的正式节点管理，避免同一正式事实被多个模块同时拥有。若后续教务主数据接入形成独立生命周期，再通过明确 ADR 拆出教学目录模块。

## 6. API 契约

### 6.1 单一来源

FastAPI 的 Pydantic 请求/响应模型是 API 契约源。CI 导出固定版本的 `openapi.json`，再生成 TypeScript 客户端。

禁止：

- 前端和后端分别手写同名类型。
- 直接向前端暴露 ORM 模型。
- 在响应中无版本地改变字段含义。

### 6.2 REST 约定

- 路径使用复数资源名，如 `/api/v1/courses/{course_id}/objectives`。
- 长任务创建后返回 `202 Accepted` 和任务资源地址。
- 幂等创建使用客户端请求键或业务唯一约束。
- 分页、筛选和排序使用统一查询结构。
- 错误响应包含稳定的业务错误码、用户可读信息和关联请求 ID。
- 正式资源使用乐观锁或版本号避免覆盖并发修改。

### 6.3 契约发布门槛

- OpenAPI 生成成功。
- 生成的 TypeScript 客户端无未提交差异。
- 破坏性变更有版本迁移说明。
- 示例不含真实个人数据。

## 7. 异步任务

适合异步执行的任务包括文件解析、OCR、表格识别、个人信息检测、向量化、候选识别、图谱分析、批量评价、模型分析和支撑包导出。

任务规则：

- 消息只携带任务 ID、对象键和必要的小型参数，不携带文件字节或大段正文。
- 任务权威状态写入 PostgreSQL，Redis 不作为最终状态存储。
- 每个任务具备幂等键、重试策略、超时、进度和错误分类。
- 任务产物保存输入哈希、处理器版本和输出版本。
- 模型调用与确定性评价分开排队，避免资源相互挤占。

## 8. 部署拓扑

### 8.1 开发和首期试点

Docker Compose 编排：

- `web`
- `api`
- `worker-document`
- `worker-ai`
- `postgres`
- `redis`
- `object-storage`（没有学校存储时使用）
- 反向代理

数据库迁移由独立发布步骤执行，不在所有 API 实例启动时抢跑。

### 8.2 生产基线

- 校内 HTTPS 域名和受控网络区域。
- API、Worker 使用独立服务账户和最小权限。
- 数据库、对象存储和密钥不暴露到公网。
- 关键数据定期备份并执行恢复演练。
- 日志、指标和追踪统一关联请求 ID / 任务 ID。

### 8.3 何时考虑 Kubernetes

仅在出现以下一种或多种情况时评估：

- Worker 需要按任务类型独立弹性扩缩容。
- 多套院系实例需要统一调度。
- 发布频率、可用性目标和运维团队已能承担集群复杂度。
- 安全策略要求更强的工作负载隔离。

## 9. 官方技术参考

- [FastAPI OpenAPI 文档](https://fastapi.tiangolo.com/reference/openapi/docs/)
- [pgvector 官方仓库](https://github.com/pgvector/pgvector)
- [Celery：Brokers and Backends](https://docs.celeryq.dev/en/latest/getting-started/backends-and-brokers/index.html)
- [MinIO 容器部署文档](https://min.io/docs/minio/container/index.html)
- [Keycloak Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/)
