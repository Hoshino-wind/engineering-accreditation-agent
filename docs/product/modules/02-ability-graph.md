# M2 实验教学能力图谱

## 1. 模块定位

本模块拥有实验教学能力图谱的 Schema、正式语义节点、正式关系、发布快照和审核决定，是系统的核心业务资产。M3 拥有的教学资源可作为固定版本引用进入图谱，但 M2 不复制其资产内容。

它以“认证要求—能力语义—教学承载—评价结构—资源支撑”为主阅读路径：毕业要求/指标点提出能力期待，课程目标与实验项目承载能力形成，评分项直接评价能力或技能，教学资源支撑实验活动。材料、证据片段、教学班、学生作业、评分记录和评价结果只引用正式图谱快照，不作为主图节点。

本模块不拥有自动识别候选、分析诊断结果和达成度结论。

## 2. 用户结果

- 教师能解释某个实验培养什么能力、由什么评分项评价、由什么材料证明。
- 专业负责人能从毕业要求逐级下钻到课程、实验和证据。
- 正式节点和关系具有版本、来源和审核责任。
- 上游版本变化能识别受影响关系、评价和支撑材料。

## 3. 参与角色

- 课程负责人：维护课程目标、实验和评分结构。
- 专业负责人：维护毕业要求、指标点和跨课程关系。
- 实验教师：查看和申请修正课程内图谱。
- 认证工作组：只读查看正式图谱与来源。

## 4. 核心对象

| 对象 | 说明 |
| --- | --- |
| `GraphSchemaVersion` | 节点类型、关系类型和约束版本 |
| `GraphNode` / `GraphNodeVersion` | 稳定节点身份和内容版本 |
| `GraphEdgeVersion` | 两个指定节点版本之间的正式关系 |
| `CapabilityElement` | 能力、技能或知识点的一等语义节点及结构化属性 |
| `GraphSourceRef` | 节点或关系的来源材料、材料版本和精确坐标 |
| `ExternalObjectVersionRef` | 对 M3 教学资源等外部权威对象具体版本的引用 |
| `GraphReviewDecision` | 正式发布、变更和失效决定 |
| `GraphVersionSnapshot` | 供分析、评价和支撑使用的不可变图谱版本集合 |
| `GraphImpact` | 版本变化的下游影响 |

### 4.1 首期正式节点

- `GraduateOutcome`：毕业要求；
- `PerformanceIndicator`：毕业要求指标点；
- `Ability`：跨实验可复用、可由多个技能构成的综合能力；
- `Skill`：可观察、可训练、可直接评价的操作或认知技能；
- `Knowledge`：技能所需的概念、原理、方法或规则；
- `Course`：课程的稳定教学承载身份；
- `CourseOutcome`：课程目标；
- `Experiment`：实验教学活动；
- `AssessmentTask`：考核任务；
- `RubricCriterion`：具有独立评价语义的原子评分项；
- `TeachingResource`：M3 拥有并版本化的可复用教学资产，M2 固定其版本引用。

可观察行为、能力领域、认知层级、难度和资源类型是节点属性，不另建节点。实验步骤在需要独立来源、培养关系或评价关系前作为实验的结构化内容，不纳入首期主图。

`Material`、`MaterialVersion`、`EvidenceFragment`、教学班、学生、作业、识别候选、诊断发现、评价运行/结果、改进问题/措施和支撑包均不是主图节点。

### 4.2 首期正式关系

```text
GraduateOutcome REFINES PerformanceIndicator
PerformanceIndicator EXPECTS Ability
Ability COMPOSED_OF Skill
Skill REQUIRES Knowledge

Course DEFINES CourseOutcome
Experiment BELONGS_TO Course
CourseOutcome SUPPORTS PerformanceIndicator
Experiment CONTRIBUTES_TO CourseOutcome
Experiment CULTIVATES Ability
Experiment TRAINS Skill
Experiment COVERS Knowledge

Experiment USES TeachingResource
TeachingResource ENABLES Skill / Knowledge

Experiment CONTAINS_TASK AssessmentTask
AssessmentTask CONTAINS_CRITERION RubricCriterion
RubricCriterion ASSESSES Ability / Skill
RubricCriterion CONTRIBUTES_TO CourseOutcome
```

`ASSESSES` 表达评分项直接测量的能力或技能；`CONTRIBUTES_TO` 表达评分项结果进入哪个课程目标的聚合路径。两者不能互相替代。分值、权重、阈值、样本、输入哈希和评价结论归 M6，不是 M2 节点或关系属性。

页面允许反向浏览和展示传递路径，但不反转或重复保存权威边。新增关系必须先选择业务关系，再由 Schema 限定合法起点和终点。

### 4.3 禁止的快捷边

- `CourseOutcome SUPPORTS GraduateOutcome`：必须通过指标点；
- `Experiment SUPPORTS PerformanceIndicator / GraduateOutcome`：必须分别表达课程目标贡献和能力培养；
- `RubricCriterion ASSESSES CourseOutcome / PerformanceIndicator / GraduateOutcome`：评分项只直接评价能力或技能；
- `EvidenceFragment PROVES GraphNode / GraphEdge`：证据通过 `GraphSourceRef` 引用，不建图谱边；
- `EvaluationResult`、`DiagnosticFinding` 或 `ImprovementAction` 与教学对象之间的“应用关系”：保存在所属模块的引用字段中；
- 任意反向边、传递闭包边或 AI 推断边：作为查询投影展示，不作为第二套权威事实保存。

完整端点约束以 [ADR-001：实验教学能力图谱正式本体](../../architecture/decisions/001-experimental-teaching-ontology.md) 为准。

## 5. 主流程

1. 建立或选择图谱 Schema 版本。
2. 导入标准、培养方案、课程和课程目标基础数据，并引用 M3 已生效的教学资源版本。
3. 接收 M4 已审核通过的候选节点与关系；涉及教学资源的候选必须先解析到 M3 的稳定资源版本。
4. 校验两端版本、关系类型、来源和重复冲突。
5. 系统检查能力—技能—知识结构、课程目标支撑、实验培养、资源使用和直接评价路径，不以节点摆放或连线数量代替完整性。
6. 课程或专业负责人对正式基线与草稿之间的差异逐项审核，并为受影响的 M5 诊断、M6 评价和 M8 支撑包指定后续动作。
7. 发布不可变图谱快照，供 M5、M6 和 M8 引用。
8. 上游对象变更时创建新修订并执行影响分析；历史版本保持只读和可追溯。

## 6. 状态与规则

图谱修订生命周期：

```text
draft → under_review → published → superseded / retired
                    ↘ changes_requested
```

单项审核决定：

```text
pending → approved / rejected
```

节点或关系效力：

```text
scheduled → effective → superseded / expired
```

- 修订生命周期、单项审核决定和节点/关系效力是三个独立状态轴，不得压缩成一个通用 `status`。
- 正式图谱快照、节点和关系不原地覆盖；变更必须显式创建修订。
- 正式关系必须固定两端对象版本和生效周期。
- 正式节点和关系必须具备来源材料、材料版本、来源坐标和审核决定。
- 能力与技能必须具备定义和至少一项可观察行为；知识点必须具备明确边界。
- 发布门槛至少包括 Schema 合法、能力语义完整、毕业要求支撑、实验教学覆盖、直接评价覆盖和审核决定。
- 草稿必须绑定一个可查询的正式基线；空修订不得发布为新版本。
- 每一项节点或关系差异必须独立形成审核决定，不允许在发布动作中批量补确认。
- 新增或修改关系后，已有下游影响处置自动失效，必须按最新变更集重新确认。
- M4 候选不得被 M5/M6 当作正式事实消费。
- 上游失效不自动迁移关系，必须重新审核。
- M3 独立维护教学资源生命周期和材料处理状态；M2 只固定 `teaching_resource_version_id` 并维护图谱关系。
- M6 独立维护输入就绪度、运行状态、达成结论和审批状态；M2 不保存权重、分值、样本、输入哈希或评价结果。
- 图谱是业务关系模型，不以可视化连线数量衡量完成度。
- 草稿保存、发布和修订创建均携带服务端修订号；过期客户端不得覆盖较新的图谱状态。
- 正式快照由服务端重新执行发布门槛后生成，客户端提交的快照内容不得改写历史版本。
- 发布、保存和创建修订形成追加审计事件；当前本地试点操作者为固定专业负责人，真实角色权限仍由 M9/OIDC 接入完成。

## 7. 输入与输出

输入：

- M3 的证据片段；
- M3 已生效的教学资源版本；
- M4 审核通过的节点和关系候选，其中教学资源端点已解析为 M3 版本引用；
- M9 的数据范围与审核权限。

输出：

- 正式图谱版本；
- 节点路径、关系矩阵和来源链；
- 供 M5 分析、M6 评价和 M8 支撑使用的版本快照；
- 上游变化影响清单。

## 8. 页面范围

- 能力结构（默认）：以指标点为中心展示所期待的能力、能力所需技能与知识，以及对应来源。
- 支撑矩阵：毕业要求层级、课程目标覆盖矩阵和选中关系来源。
- 培养路径：课程、课程目标、实验、能力/技能/知识和教学资源的局部路径。
- 评价结构：实验、考核任务、评分项、`ASSESSES` 与 `CONTRIBUTES_TO` 的分层投影；M6 运行证据仅作只读深链。
- 版本治理：正式基线、字段级草稿差异、逐项审核、M5/M6/M8 下游影响处置和最终发布门禁。
- 新建对象与新建关系：受 Schema 约束的表单，不提供自由连线编辑器。

首期以目录、矩阵和局部路径为主，不建设复杂自由布局图编辑器。

## 9. 非目标

- 不在本模块运行全文解析或 AI 抽取。
- 不把向量相似度保存为正式关系。
- 不建设炫技式全量图谱大屏。
- 不因“知识图谱”名称提前拆分微服务或引入独立图数据库。

## 10. 验收标准

- 能从一个指标点下钻到能力、技能、知识、课程目标、实验、教学资源、考核任务和直接评价评分项。
- 默认首屏能直接回答“形成什么能力、由什么教学承载、用什么证据评价”。
- 指标点未关联能力、课程目标未支撑指标点、实验未培养能力/技能或评分项未直接评价能力/技能时，页面和发布校验必须显示对应断点。
- 同一评分项的 `ASSESSES` 与 `CONTRIBUTES_TO` 可以分别检查和修正，数值评价策略不随图谱编辑被修改。
- 教学资源可以作为一等节点参与路径查询，但材料版本和证据片段只能作为来源查看。
- 覆盖率由正式关系计算；删除任一必需关系后，相应指标和发布检查必须立即反映断点。
- 正式关系均具备两端版本、来源和审核记录。
- 非法端点组合和重复关系不能进入草稿。
- 评价输入不足或哈希未固化时，M6 输入状态必须显示阻断。
- 发布后对象和关系只读；创建新对象或关系前必须先建立图谱修订。
- 更换课程目标或评分表版本后，能够准确列出受影响的诊断、评价和认证支撑对象。
- 未审核变更、未处置影响、缺失正式基线或空修订均不能发布。
- 上游版本变化能列出受影响关系和评价。
- 历史图谱版本保持可查询和可复核。
- API 进程重启后仍能恢复同一图谱修订、正式快照和审计记录。
