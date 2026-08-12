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
| `/graph` | M2 `AbilityGraphPage`：节点、关系、评价路径和版本发布 | 服务端持久化试点可用 |
| `/resources` | M3 `TeachingResourcesPage`：材料治理与来源工作台 | 当前原型可用 |
| `/recognition` | M4 `RecognitionReviewPage`：候选识别与人工审核工作台 | 当前原型可用 |
| `/diagnostics` | M5 `GraphDiagnosticsPage`：图谱分析与一致性诊断工作台 | 当前原型可用 |
| `/evaluations` | M6 `AttainmentEvaluationPage`：输入预检、确定性计算与结果复核工作台 | 服务端读取 + 输入预检 + 就绪快照试点重算 + 默认关闭的汇总批次捕获可用 |
| `/improvements` | M7 `TeachingImprovementPage`：问题、实际变更、复评与关闭门槛工作台 | 当前原型可用 |
| `/support` | M8 `AccreditationSupportPage`：版本快照、章节预览、校验和导出准备工作台 | 当前原型可用 |
| `/governance` | M9 `GovernancePage`：用户角色、数据范围、审计与模型策略 | 本地交互原型可用 |

路由定义和布局只能位于 `app`。页面不能持有领域规则或大型静态业务数据，只负责组合 widgets。产品路由必须能回到[功能模块产品总图](../product/modules/README.md)中的责任模块；AI 辅助能力嵌入 M3～M7 的任务页面，不单独建设聊天入口。

PC 端应用壳按以下所有权拆分：

- `app/layouts/app-shell/config`：单一导航目录，统一定义路径、菜单、面包屑和内容模式；
- `app/layouts/app-shell/model`：路径到壳层展示状态的纯投影；
- `app/layouts/app-shell/ui/AppShellSider`：品牌、分组菜单和试点上下文；
- `app/layouts/app-shell/ui/AppShellHeader`：面包屑、原型保存/用户展示、帮助和本地业务通知；
- `app/layouts/app-shell/ui/AppShell`：只负责 Ant Design Layout、React Router 和 Outlet 组合。

当前“草稿已保存”和用户身份仍是静态原型；通知只读取 `entities/workflow-event` 公共 API，不代表未读通知或正式审计。该应用壳仅覆盖当前单一 PC 端主题，不新增移动端布局或响应式导航。

现有总览原型中的旧导航占位不构成目标信息架构。进入业务功能实现时，应按上表逐项替换并删除旧入口，不同时保留两套模块命名。

### 2.2 状态所有权

- 输入值、选中行、弹层开关等局部交互状态：离使用位置最近的组件或 feature hook。
- 服务端状态：entity 内的 TanStack Query hook。
- 跨页面会话、当前专业和展示偏好：`app/providers` 中的小范围 Context。
- 本地业务操作事件：`entities/workflow-event` 统一持有事件模型、浏览器存储和订阅公共 API；当前只用于原型通知和 M9 审计界面，不等同于服务端权威审计记录。
- 生成客户端：只封装请求与类型，不承载页面状态。
- 未证明存在复杂跨页面客户端状态前，不引入 Redux。

### 2.3 原型数据

尚未接入 API 的数据必须：

- 使用 `prototypeOnly` 前缀；
- 放在拥有该语义的 entity 或 widget 中；
- 不伪装成持久化数据；
- 对应 API 可用后由 TanStack Query 替换。

当前原型数据包括图谱总览指标、图谱建设与应用主线、图谱质量门槛、试点发布门槛、最近业务活动、待处理事项，教学资源、处理流水线、来源片段、材料治理指标，识别候选、来源证据、影响范围和审核草稿，诊断发现、规则判定、覆盖路径、版本引用、影响范围和处置草稿，M6 复核本地草稿，改进问题、来源事实、根因、措施、实际教学对象版本、图谱版本、复评运行和有效性草稿，以及认证支撑包、模板、来源快照、章节、正式结论引用、校验结果、审批快照和导出配置草稿。M6 评价对象、运行输入/快照/证据与计算结果已从前端原型迁入服务端；当前仅允许从既有就绪快照追加试点重算运行。

M2 前端切片按以下所有权拆分：

- `entities/ability-graph`：图谱类型、关系 Schema、端点校验、业务选择器、对齐投影、质量指标、发布门禁、版本差异和原型 fixture；
- `features/edit-ability-graph`：材料来源适配、对象创建、关系创建及对应受控表单；
- `features/govern-ability-graph-version`：对象/图谱修订、变更审核、下游影响处置和版本发布；
- `widgets/ability-graph-evaluation`：课程目标评价结构的独立工作区；
- `views/graph`：路由级标签、选择状态、服务端工作区装配和其余页面专用展示区块。

服务端图谱状态仍由 `entities/ability-graph` 的 TanStack Query hook 持有；表单状态由对应 feature 内的 Ant Design Form 持有，页面不复制服务端图谱或表单字段。

M6 前端切片按以下所有权拆分：

- `entities/attainment-evaluation`：评价对象摘要、运行详情、输入、快照、就绪/审批/达成状态轴、计算与预检展示模型，以及通过生成客户端读取对象队列、运行详情、运行权威引用和精确运行预检报告的 TanStack Query；
- `entities/score-import-batch`：试点汇总评分批次、规范记录、校验报告和稳定限制码的前端展示模型；
- `features/create-attainment-evaluation-run`：冻结对象与精确来源运行的确认意图、幂等创建命令、失败后同键重试，以及新运行查询缓存预置；
- `features/inspect-attainment-input-preflight`：按服务端稳定 `owner` / `action` 展示阻断责任、缺失输入和下一步处理入口；只维护抽屉开关等局部交互状态，不解析中文阻断文案，也不伪造评分导入或正式图谱目标；
- `features/capture-pilot-score-batch`：对精确评分阻断运行捕获完整的汇总已得分、汇总可得分和观察样本数；同一提交意图复用幂等键，结果明确展示 `formalUsable=false` 和限制项，不接收个人明细；
- `features/filter-attainment-evaluations`：课程、状态和关键词筛选；
- `features/inspect-calculation-trace`：输入快照、程序版本、中间值和证据追溯；
- `features/review-attainment-result`：结果确认或申请重算的本地草稿；
- `widgets/attainment-summary`、`widgets/attainment-workbench`：页面区块编排；其中工作台在 widget 层组合预检与汇总批次 feature，两个同层 feature 不互相依赖；
- `views/evaluations`：路由页面组合，以及 `evaluation` + `run` 查询参数到精确评价对象/运行的页面级选择投影；列表加载或失败时不改写已请求地址。

后端 `evaluations` 当前提供对象/运行/引用/预检四条权威读端点、一条受限运行写端点，以及试点汇总评分批次的创建与精确读取端点。`POST /api/v1/evaluations/score-import-batches` 与 `GET /api/v1/evaluations/score-import-batches/{batch_id}` 都只在 development/test 且显式开关开启时工作；GET 按不透明 ID 读取不可变批次。预检用例由 application 读取仓储快照、domain 合并来源检查与计算派生阻断、contracts 输出 `scope=pilot_snapshot`、`reportVersion=evaluation-preflight:v1`、稳定 `owner` / `action`、`missingInputs` 和确定性 `reportHash`；route 只处理 HTTP 映射。该查询不写仓储，报告和报告哈希都不是持久化审计快照。

`GET /api/v1/evaluations/graph-sources` 是评价与 M2 之间的第一条活链路：评价**结构**（哪些评分项通过 `contributes-to` 汇总到哪个课程目标、课程目标 `supports` 哪个指标点）只从已发布图谱快照派生，评价**权重与阈值**只从 M6 策略版本读取，两者不得互相补写。评价模块不直接依赖 `teaching_graph`：application 只声明 `PublishedGraphRepository` 与 `EvaluationPolicyRepository` 两个端口，跨模块知识集中在 `infra/graph_source_runtime.py` 与 `factory.py`。策略绑定挂在具体 `edgeVersionId` 上——图谱升了关系版本而策略未同步时对应评价对象阻断，不静默沿用旧权重。草稿状态解析到其基线版本，未发布图谱返回 409 并标注 `owner=M2`，不返回空列表。试点策略暂由随代码发布的 `pilot_evaluation_policy.json` 提供；正式化时替换为数据库仓储，端口与领域模型不变。既有对象/运行读端点仍由 `pilot_evaluation_read_model.json` 供给，尚未切换到图谱派生。

运行创建命令只接收对象 ID、来源运行 ID 和幂等键；评分批次命令另行接收 `local-pilot-aggregate:v1` 汇总结构或 `local-pilot-per-student:v1` 逐生结构，不与运行来源契约混用。逐生口径由服务端按声明的 `missingScorePolicy`（`exclude` / `zero` / `block`）从原始分派生汇总值，原始分、满分、口径和 `scoreRateScale` 全部进入内容摘要并可回读，因此汇总值能被复核者重新推导；汇总口径把这些决定留在系统之外，只适用于已无法取得原始分的历史数据。领域层使用 `Decimal` 计算汇总得分率并生成与中文文案无关的内容/报告哈希；独立 SQLite 适配器在一个事务中追加批次、候选项、规范记录、校验报告和幂等命令，并禁止覆盖或删除。阻断运行返回 `result=null`，也不能作为试点重算来源；创建汇总批次同样不会修改它或使其变为 ready。学生明细、文件映射、正式范围、操作者、策略、正式运行生命周期、正式图谱目标定位、审批、RBAC 及不可变业务审计仍待接入，前端复核操作只是按运行隔离的本地草稿。

M7 前端切片按以下所有权拆分：

- `entities/improvement-case`：改进问题聚合、来源、根因、措施、变更引用、图谱版本、复评和展示状态；
- `features/filter-improvement-cases`：来源、状态和关键词筛选；
- `features/assess-improvement-closure`：无副作用的关闭门槛判定；
- `features/create-improvement-case`：本地原型问题创建、案例投影和工作流事件记录；
- `features/decide-improvement-effectiveness`：人工有效性结论的本地草稿；
- `features/inspect-improvement-trace`：来源对象、证据哈希、实际变更和复评运行追溯；
- `widgets/improvement-summary`、`widgets/improvement-workbench`：页面区块编排；
- `views/improvements`：路由页面组合，以及 `case` 查询参数到当前改进问题的页面级选择投影。

正式问题创建、措施审批、变更关联、复评待办、关闭审批和持久化仍归后端 `improvements` 模块。关闭门槛必须由服务端再次执行，不能依赖前端状态。

M8 前端切片按以下所有权拆分：

- `entities/support-package`：支撑包聚合、模板、来源快照、章节、正式结论引用、审批快照和展示状态；
- `features/create-support-package`：本地原型支撑包创建、实体投影和工作流事件记录；
- `features/filter-support-packages`：模板、状态和关键词筛选；
- `features/validate-support-package`：无副作用的 8 项复核/导出门槛及审批快照一致性判定；
- `features/configure-support-export`：本地导出配置、复核提交、原型产物交付与工作流事件记录；
- `features/resolve-support-package-blocker`：返回事实所属 M2/M3/M5/M6/M7 模块；M6 同时核对运行权威引用与当前对象队列，引用确认运行归属且对象存在时生成携带 `evaluation` + `run` 的精确地址，允许回到已冻结的历史运行；加载/服务失败保留来源阻断项，对象不可用则回退模块地址，不猜测归属；M7 通过已对齐的问题 ID 生成对象级处理地址；
- `features/inspect-support-evidence`：来源对象、冻结版本、内容哈希和章节结论引用追溯；
- `widgets/support-summary`、`widgets/support-workbench`：页面区块编排；
- `views/support`：路由页面组合。

正式创建、异步生成、服务端校验、审批、导出产物、下载审计和归档仍归后端 `reporting` 模块。复核和导出门槛必须由服务端再次执行，批准后的内容变化必须创建新版本。

M9 前端切片按以下所有权拆分：

- `entities/role-assignment`：角色授权、状态、数据范围和汇总选择器；
- `entities/model-data-policy`：模型路由、脱敏和来源引用策略；
- `entities/workflow-event`：跨模块工作流事件、筛选规则和展示状态；
- `features/manage-role-assignments`：角色授权创建、撤销和恢复的本地操作；
- `features/configure-model-data-policy`：模型数据策略的本地配置；
- `features/export-workflow-events`：审计事件 CSV 序列化与下载；
- `widgets/governance-workbench`：治理摘要、授权、审计和模型策略区块编排；
- `views/governance`：路由页面、治理说明和工作台组合。

当前角色、数据范围、模型政策和工作流事件仍是浏览器本地原型。正式身份认证、授权决策、服务端策略执行和不可变审计分别归后端 `identity_access`、业务用例与 `audit` 模块；前端配置不得被理解为生产安全边界。

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
  factory.py           # composition root，负责实例化和装配
  main.py              # 部署入口，只创建 ASGI 应用实例
```

依赖规则：

- `domain` 不依赖 FastAPI、Pydantic、SQLAlchemy、配置或基础设施。
- `application` 只依赖 domain 和自己定义的 ports。
- `routes` 只依赖 application 与 contracts，不创建基础设施对象。
- `infra` 实现 application ports，可以依赖 `core` 和外部库。
- `factory.py` 是唯一组合根，负责把配置、适配器、用例和路由连接起来；测试直接导入工厂，避免导入部署入口时写入默认本地数据目录。
- `main.py` 只创建 ASGI 应用实例，供 Uvicorn 等部署运行时加载。
- ORM 模型、Pydantic 契约和领域对象职责不同，不合并为同一个类。

当前 `system` 模块用于验证以上完整链路；新业务能力按相同内部结构建立，不先创建没有用例的空目录。

M2 当前已经建立首条服务端权威链路：

- Web 的 `entities/ability-graph` 通过 TanStack Query 和生成客户端持有服务端状态；
- API 的 `teaching_graph` 模块拥有草稿保存、发布门禁、正式快照、修订创建和审计用例；
- 本地开发使用 SQLite 聚合仓储，正式快照和审计事件以追加方式写入；
- 所有写命令携带 `expectedRevision`，由仓储执行乐观锁，过期写入不得覆盖新状态；
- 前端发布检查只用于即时反馈，服务端在发布命令中重新执行全部阻断规则；
- 当前操作者仍是本地固定专业负责人，OIDC、组织范围和真实角色授权尚未接入，因此该链路不构成生产安全边界。

`POST /api/v1/teaching-graph/imports/course-package` 是新模板的落地入口：课程大纲、实验指导书与评分标准表本身已是结构化数据，导入不经过 AI 抽取，教师填写模板即人工决定。导入把课程包展开为草稿节点与关系（`status=draft`、`reviewStatus=pending`），随后由 M2 既有的草稿校验、逐项审核与发布门禁把关；ID 与版本号由编码确定性生成，因此重复导入同一份内容是空操作，内容变化则报冲突并拒绝整批写入，不静默改写正式事实。导入不创建正式基线：工作区未初始化时返回 404，因为没有基线的草稿永远无法发布。评分项契约不含权重字段——权重属于 M6 策略版本。

已知约束：`_alignment_flags` 当前要求一个实验支撑某课程目标时，该实验考核任务下所有评价了目标能力的评分项都必须归集到同一课程目标。因此"一份实验报告的不同评分项分别度量不同课程目标"这一常见结构会被发布门禁拒绝。该行为由 `test_publish_gate_currently_rejects_criteria_split_across_outcomes` 固定，是否放宽属于业务规则决策，未在实现层单方面更改。

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
