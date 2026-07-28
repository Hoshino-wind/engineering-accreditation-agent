# 代码架构约定

## 1. 采用的架构画像

本仓库采用以下代码架构，不以目录数量或预留空模块衡量完成度：

- 总体：`fullstack-monorepo`，应用与生成契约位于同一仓库。
- Web：`frontend-spa-modular`，使用轻量 FSD 分层。
- API：`backend-api-modular`，按业务模块组织模块化单体。
- Worker：独立进程，仅保留异步任务入口；业务用例成熟后再按流水线切片。
- 契约：FastAPI/Pydantic → OpenAPI → TypeScript 生成客户端，禁止双写。

依赖只允许由外向内、由组合层向能力层流动。目录存在并不代表可以跨层直接引用。

## 2. Web 分层与所有权

```text
src/
  app/          # 启动、路由、全局 provider、PC 端应用壳
  views/        # 路由页面，只做页面级编排
  widgets/      # 可独立阅读的业务区块
  features/     # 用户动作、筛选、编辑、提交等能力
  entities/     # 领域对象、展示模型和实体级 UI
  shared/       # API 客户端、环境配置、无业务语义的通用能力
```

允许的依赖方向：

```text
app → views → widgets → features → entities → shared
```

上层可以按需跳过中间层引用更低层，低层不得反向引用上层。切片之间通过各自的 `index.ts` 暴露公共 API；业务代码不深挖其他切片内部目录。

### 2.1 路由与页面

| 路径 | 页面 | 状态 |
| --- | --- | --- |
| `/` | M1 `OverviewPage`：总览与任务工作台 | 当前原型可用 |
| `/graph` | M2 实验教学能力图谱 | 计划 |
| `/resources` | M3 教学资源与材料 | 计划 |
| `/recognition` | M4 智能识别与映射审核 | 计划 |
| `/diagnostics` | M5 图谱分析与一致性诊断 | 计划 |
| `/evaluations` | M6 达成度评价与统计 | 计划 |
| `/improvements` | M7 教学优化与持续改进 | 计划 |
| `/support` | M8 工程认证支撑 | 计划 |
| `/governance/users` | M9 用户、角色与数据范围 | 计划 |
| `/governance/audit` | M9 审计、风险与模型调用记录 | 计划 |

路由定义和布局只能位于 `app`。页面不能持有领域规则或大型静态业务数据，只负责组合 widgets。产品路由必须能回到[功能模块产品总图](../product/modules/README.md)中的责任模块；AI 辅助能力嵌入 M3～M7 的任务页面，不单独建设聊天入口。

现有总览原型中的旧导航占位不构成目标信息架构。进入业务功能实现时，应按上表逐项替换并删除旧入口，不同时保留两套模块命名。

### 2.2 状态所有权

- 输入值、选中行、弹层开关等局部交互状态：离使用位置最近的组件或 feature hook。
- 服务端状态：entity 内的 TanStack Query hook。
- 跨页面会话、当前专业和展示偏好：`app/providers` 中的小范围 Context。
- 生成客户端：只封装请求与类型，不承载页面状态。
- 未证明存在复杂跨页面客户端状态前，不引入 Redux。

### 2.3 原型数据

尚未接入 API 的数据必须：

- 使用 `prototypeOnly` 前缀；
- 放在拥有该语义的 entity 或 widget 中；
- 不伪装成持久化数据；
- 对应 API 可用后由 TanStack Query 替换。

当前原型数据包括总览指标、证据进度、试点准备度、最近活动和待处理事项。

## 3. API 模块边界

```text
app/
  core/                # 环境配置与应用级横切能力
  infrastructure/      # 数据库等跨模块基础设施适配器
  modules/
    <module>/
      routes/          # HTTP 输入输出与依赖声明
      contracts/       # Pydantic 请求/响应模型
      application/     # 用例、端口、事务边界
      domain/          # 纯领域模型与规则
      infra/           # 该模块的端口实现与框架适配
  main.py              # composition root，负责实例化和装配
```

依赖规则：

- `domain` 不依赖 FastAPI、Pydantic、SQLAlchemy、配置或基础设施。
- `application` 只依赖 domain 和自己定义的 ports。
- `routes` 只依赖 application 与 contracts，不创建基础设施对象。
- `infra` 实现 application ports，可以依赖 `core` 和外部库。
- `main.py` 是唯一组合根，负责把配置、适配器、用例和路由连接起来。
- ORM 模型、Pydantic 契约和领域对象职责不同，不合并为同一个类。

当前 `system` 模块用于验证以上完整链路；新业务能力按相同内部结构建立，不先创建没有用例的空目录。

目标业务模块及产品映射：

| API 模块 | 产品模块 | 权威事实 |
| --- | --- | --- |
| `workspaces` | M1 | 工作上下文、进度聚合和待办索引 |
| `teaching_graph` | M2 | 正式图谱 Schema、节点、关系和版本 |
| `teaching_resources` | M3 | 材料、资源版本和证据片段 |
| `recognition` | M4 | 候选、冲突和审核决定 |
| `graph_analysis` | M5 | 分析运行、诊断发现和豁免 |
| `evaluations` | M6 | 策略、输入快照、运行和结果 |
| `improvements` | M7 | 问题、措施、实际变更和复评 |
| `reporting` | M8 | 支撑包、校验、审批和导出 |
| `identity_access` / `audit` | M9 | 身份、授权范围和追加审计事件 |

`processing` 和 `intelligence` 是共享技术能力，不拥有图谱、评价或改进的正式业务事实。

## 4. 请求与任务数据流

同步请求：

```text
View → Widget → Feature → Entity query → generated client
  → Route → Application use case → Domain → Port → Infra
```

异步任务：

```text
Route/Application → 写入权威任务记录 → 发布 task id
  → Worker task entry → Pipeline/Application use case → Port → Infra
```

Celery task 只做参数反序列化、调用用例、记录结果；业务规则不得写在 task 函数中。消息不传文件字节或大段正文。

## 5. 契约、环境与身份边界

- 服务端 Pydantic 模型是唯一 API 契约源。
- `openapi/openapi.json` 是已导出的版本化产物。
- `packages/api-client-generated` 只能由生成命令更新。
- 浏览器环境变量只允许非敏感的 `VITE_*` 值；密钥只存在于 API/Worker 环境。
- 生产身份边界为学校 OIDC；当前总览页属于无登录原型，接入业务写操作前必须先落地会话、组织范围和后端授权。
- CORS、Cookie 和 OIDC 回调由 API/core 配置，不能散落在业务模块。

## 6. 变更与验证门槛

一次架构或业务变更至少验证：

1. Web：ESLint、TypeScript、Vitest、Vite build。
2. API：Ruff、mypy、pytest。
3. Worker：Ruff、mypy、pytest。
4. 契约：重新导出 OpenAPI、生成 TypeScript 客户端，并确认无意外差异。
5. 结构：运行 project-architecture inspector，并保留分层依赖测试。
6. UI：涉及页面呈现时，在 1920×1080 视口执行浏览器回归；使用 Ant Design 的 PC 管理端模式，本项目不以移动端适配为验收目标。

架构决策或边界变化时，先更新本文件和总体技术架构，再修改实现。新切片应包含实现或紧接着落地的用例，避免 speculative generality。
