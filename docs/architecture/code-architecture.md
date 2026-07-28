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
| `/resources` | M3 `TeachingResourcesPage`：材料治理与来源工作台 | 当前原型可用 |
| `/recognition` | M4 `RecognitionReviewPage`：候选识别与人工审核工作台 | 当前原型可用 |
| `/diagnostics` | M5 `GraphDiagnosticsPage`：图谱分析与一致性诊断工作台 | 当前原型可用 |
| `/evaluations` | M6 `AttainmentEvaluationPage`：输入校验、确定性计算与结果复核工作台 | 当前原型可用 |
| `/improvements` | M7 `TeachingImprovementPage`：问题、实际变更、复评与关闭门槛工作台 | 当前原型可用 |
| `/support` | M8 `AccreditationSupportPage`：版本快照、章节预览、校验和导出准备工作台 | 当前原型可用 |
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

当前原型数据包括图谱总览指标、图谱建设与应用主线、图谱质量门槛、试点发布门槛、最近业务活动、待处理事项，教学资源、处理流水线、来源片段、材料治理指标，识别候选、来源证据、影响范围和审核草稿，诊断发现、规则判定、覆盖路径、版本引用、影响范围和处置草稿，评价对象、评分输入、版本快照、就绪检查、证据引用和复核草稿，改进问题、来源事实、根因、措施、实际教学对象版本、图谱版本、复评运行和有效性草稿，以及认证支撑包、模板、来源快照、章节、正式结论引用、校验结果、审批快照和导出配置草稿。

M6 前端切片按以下所有权拆分：

- `entities/attainment-evaluation`：评价对象、输入、快照、就绪检查和展示状态；
- `features/calculate-attainment`：无副作用的确定性加权计算与阻断规则；
- `features/filter-attainment-evaluations`：课程、状态和关键词筛选；
- `features/inspect-calculation-trace`：输入快照、程序版本、中间值和证据追溯；
- `features/review-attainment-result`：结果确认或申请重算的本地草稿；
- `widgets/attainment-summary`、`widgets/attainment-workbench`：页面区块编排；
- `views/evaluations`：路由页面组合。

正式运行、审批和持久化仍归后端 `evaluations` 模块；前端禁用动作不得被理解为已接入 API。

M7 前端切片按以下所有权拆分：

- `entities/improvement-case`：改进问题聚合、来源、根因、措施、变更引用、图谱版本、复评和展示状态；
- `features/filter-improvement-cases`：来源、状态和关键词筛选；
- `features/assess-improvement-closure`：无副作用的关闭门槛判定；
- `features/decide-improvement-effectiveness`：人工有效性结论的本地草稿；
- `features/inspect-improvement-trace`：来源对象、证据哈希、实际变更和复评运行追溯；
- `widgets/improvement-summary`、`widgets/improvement-workbench`：页面区块编排；
- `views/improvements`：路由页面组合。

正式问题创建、措施审批、变更关联、复评待办、关闭审批和持久化仍归后端 `improvements` 模块。关闭门槛必须由服务端再次执行，不能依赖前端状态。

M8 前端切片按以下所有权拆分：

- `entities/support-package`：支撑包聚合、模板、来源快照、章节、正式结论引用、审批快照和展示状态；
- `features/filter-support-packages`：模板、状态和关键词筛选；
- `features/validate-support-package`：无副作用的 8 项复核/导出门槛及审批快照一致性判定；
- `features/configure-support-export`：导出格式和用途的本地草稿；
- `features/resolve-support-package-blocker`：返回事实所属 M2/M3/M5/M6/M7 模块；
- `features/inspect-support-evidence`：来源对象、冻结版本、内容哈希和章节结论引用追溯；
- `widgets/support-summary`、`widgets/support-workbench`：页面区块编排；
- `views/support`：路由页面组合。

正式创建、异步生成、服务端校验、审批、导出产物、下载审计和归档仍归后端 `reporting` 模块。复核和导出门槛必须由服务端再次执行，批准后的内容变化必须创建新版本。

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
