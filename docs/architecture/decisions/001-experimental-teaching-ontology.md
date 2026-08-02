# ADR-001：实验教学能力图谱正式本体

- 状态：已接受
- 日期：2026-07-30
- 适用范围：M2～M8 的产品定义、数据契约、识别候选、诊断规则、评价映射和认证支撑

## 1. 背景

现有文档和原型存在两类冲突：

1. 宽口径定义把材料版本、证据片段、评价结果和改进问题都列成图谱节点，使主图退化为“所有业务对象关系图”；
2. 窄口径实现只支持毕业要求、指标点、课程目标、实验、考核任务和评分项，无法正式承接 M4 已识别、M5 已诊断、M6 已消费的能力、技能和知识对象。

同时，“教学资源”被当作上传材料的同义词，评分项“评价什么”与“分数汇总到哪里”也被同一关系混合表达，导致 M2、M3、M6 的对象所有权和状态边界不清。

本 ADR 冻结首期唯一正式本体。后续如需增删节点或关系，必须通过新的 ADR 和 `GraphSchemaVersion` 升级，不允许在页面、提示词或单个 API 中局部扩展。

## 2. 决策原则

正式图谱只回答五类长期稳定的问题：

1. 认证要求期待学生形成什么能力；
2. 能力由哪些技能和知识构成；
3. 哪些课程目标和实验项目负责培养；
4. 哪些教学资源支撑培养过程；
5. 哪些评分项直接评价能力，以及分数汇总到哪个课程目标。

材料、识别、分析、计算、改进和输出是围绕这套语义运行的业务记录，不与语义节点并列。

## 3. 首期主图节点

| 节点类型 | 中文含义 | 权威所有者 | 最小语义 |
| --- | --- | --- | --- |
| `GraduateOutcome` | 毕业要求 | M2 | 稳定编号、名称、定义、适用专业 |
| `PerformanceIndicator` | 指标点 | M2 | 稳定编号、定义、可观察要求 |
| `Ability` | 综合能力 | M2 | 领域、定义、可观察行为 |
| `Skill` | 可训练技能 | M2 | 定义、可观察行为、熟练层级 |
| `Knowledge` | 知识点 | M2 | 概念/原理/方法边界 |
| `Course` | 课程 | M2 | 课程编号、名称、适用专业 |
| `CourseOutcome` | 课程目标 | M2 | 稳定编号、定义、可观察行为 |
| `Experiment` | 实验项目 | M2 | 编号、名称、类型、教学目的 |
| `AssessmentTask` | 考核任务 | M2 | 任务名称、提交物和评价场景 |
| `RubricCriterion` | 原子评分项 | M2 | 评分项描述和被观察行为 |
| `TeachingResource` | 教学资源 | M3 | 资源类型、能力边界、适用范围和有效版本 |

`TeachingResource` 是主图中的一等可寻址节点，但其稳定身份、内容和版本由 M3 管理。M2 的 `GraphVersionSnapshot` 只固定 `teaching_resource_version_id` 并发布相关正式关系，不复制 M3 字段。

可观察行为、能力领域、认知层级、难度、资源类型等是属性，不另建节点。实验步骤在需要独立来源、培养关系或评价关系前作为 `Experiment` 的结构化内容，不纳入首期主图。

## 4. 非主图对象

| 类别 | 对象示例 | 正确处理 |
| --- | --- | --- |
| 范围上下文 | 工作空间、专业、培养方案、评价周期、教学班、用户、数据范围 | 作为查询和权限范围 |
| 材料与来源 | `Material`、`MaterialVersion`、`EvidenceFragment` | 由 M3 拥有，通过 `GraphSourceRef` 引用 |
| 候选审核 | `RecognitionRun`、`NodeCandidate`、`EdgeCandidate`、审核决定 | 由 M4 拥有，正式化后生成 M2 对象 |
| 分析诊断 | `GraphAnalysisRun`、`DiagnosticFinding` | 由 M5 拥有，引用图谱快照 |
| 评价运行 | 评分记录、计分配置、策略、输入快照、运行和结果 | 由 M6 拥有，引用图谱快照 |
| 持续改进 | 质量问题、原因、措施、实际变更和复评 | 由 M7 拥有，引用变化前后版本 |
| 认证输出 | 支撑包、章节快照和导出文件 | 由 M8 拥有，引用已批准事实 |

这些对象不得为了“可视化关联”被复制成主图节点。需要下钻时使用稳定 ID、版本引用和查询投影。

## 5. 权威关系与合法端点

| 关系 | 起点 | 终点 | 回答的问题 |
| --- | --- | --- | --- |
| `REFINES` | `GraduateOutcome` | `PerformanceIndicator` | 毕业要求如何分解 |
| `EXPECTS` | `PerformanceIndicator` | `Ability` | 指标点期待什么能力 |
| `COMPOSED_OF` | `Ability` | `Skill` | 能力由什么技能构成 |
| `REQUIRES` | `Skill` | `Knowledge` | 技能需要什么知识 |
| `DEFINES` | `Course` | `CourseOutcome` | 课程承诺哪些目标 |
| `BELONGS_TO` | `Experiment` | `Course` | 实验属于哪门课程 |
| `SUPPORTS` | `CourseOutcome` | `PerformanceIndicator` | 课程目标支撑哪个指标点 |
| `CONTRIBUTES_TO` | `Experiment` | `CourseOutcome` | 实验贡献于哪个课程目标 |
| `CULTIVATES` | `Experiment` | `Ability` | 实验培养什么综合能力 |
| `TRAINS` | `Experiment` | `Skill` | 实验训练什么技能 |
| `COVERS` | `Experiment` | `Knowledge` | 实验涉及什么知识 |
| `USES` | `Experiment` | `TeachingResource` | 实验使用什么教学资源 |
| `ENABLES` | `TeachingResource` | `Skill` 或 `Knowledge` | 资源支撑什么技能或知识 |
| `CONTAINS_TASK` | `Experiment` | `AssessmentTask` | 实验包含什么考核任务 |
| `CONTAINS_CRITERION` | `AssessmentTask` | `RubricCriterion` | 任务由哪些评分项评价 |
| `ASSESSES` | `RubricCriterion` | `Ability` 或 `Skill` | 评分项直接测量什么 |
| `CONTRIBUTES_TO` | `RubricCriterion` | `CourseOutcome` | 评分结果汇总到哪里 |

同一关系名称可以有多种经 Schema 明确列出的端点组合，但不允许通过任意字符串创建新组合。`GraphEdgeVersion` 必须固定两端对象版本、适用范围、生效周期、来源、创建方式和审核决定。

### 5.1 `ASSESSES` 与 `CONTRIBUTES_TO`

这两类关系必须独立存在、独立审核：

- `RubricCriterion ASSESSES Ability / Skill` 是评价效度关系，不包含分值、权重、样本或达成结论；
- `RubricCriterion CONTRIBUTES_TO CourseOutcome` 是聚合路径关系，不等同于“直接评价课程目标”；
- M6 的 `EvaluationPolicyEdgeBinding` 对指定 `RubricCriterion CONTRIBUTES_TO CourseOutcome` 关系版本配置权重和聚合参数；
- M6 读取两类正式关系生成输入快照，但不能修改或补写关系。

因此修改能力评价语义进入 M2 新修订；修改分值、权重、阈值或缺失策略进入 M6 新策略版本。

## 6. 禁止的快捷边

首期禁止：

- `CourseOutcome SUPPORTS GraduateOutcome`；
- `Experiment SUPPORTS PerformanceIndicator / GraduateOutcome`；
- `RubricCriterion ASSESSES CourseOutcome / PerformanceIndicator / GraduateOutcome`；
- `EvidenceFragment PROVES GraphNode / GraphEdge`；
- 评价结果、诊断发现或改进措施与教学对象之间的应用边；
- 与权威边语义重复的反向边；
- 传递闭包边；
- 未经人工正式化的 AI 推断边。

这些关系均可在查询时通过正式路径、来源引用或应用记录计算和展示，但不得重复写入正式图谱。

## 7. 所有权边界

### M2

拥有：

- `GraphSchemaVersion`；
- M2 语义节点的稳定身份与版本；
- 外部对象版本被纳入图谱快照的决定；
- `GraphEdgeVersion`、`GraphReviewDecision`、`GraphVersionSnapshot` 和影响清单。

不拥有材料正文、教学资源内容、评价权重、成绩、评价结果或改进结论。

### M3

拥有：

- `TeachingResource` / `TeachingResourceVersion`；
- `Material` / `MaterialVersion`；
- `EvidenceFragment`、处理产物、来源坐标、哈希和访问状态。

M3 不发布能力、培养或评价关系。

M4 若识别出新的教学资源，必须先请求 M3 解析、复用或创建 `TeachingResourceVersion`；取得稳定版本 ID 后，才能向 M2 提交包含该资源端点的关系正式化请求。

### M6

拥有：

- `RubricVersion`、`CriterionScoringRule`；
- `ScoreImportBatch`、`ScoreRecord`；
- `EvaluationPolicyEdgeBinding`、`EvaluationPolicyVersion`；
- 输入校验、运行、结果和审批快照。

M6 的评分项配置引用 M2 `RubricCriterion` 节点版本；它不拥有评分项的正式能力语义。

## 8. 状态模型

不同事实使用独立状态轴：

| 领域 | 状态轴 | 示例 |
| --- | --- | --- |
| M2 | 图谱修订生命周期 | `draft → under_review → published → superseded / retired` |
| M2 | 单项审核决定 | `pending → approved / rejected` |
| M2 | 节点/关系效力 | `scheduled → effective → superseded / expired` |
| M3 | 材料处理 | `upload_pending → verifying → processing → ready`，失败和隔离为独立结果 |
| M3 | 教学资源生命周期 | `draft → active → superseded / archived` |
| M6 | 输入就绪度 | `unchecked → blocked / ready` |
| M6 | 运行状态 | `draft → queued → running → succeeded / failed` |
| M6 | 达成结论 | `achieved / partially_achieved / not_achieved / not_applicable` |
| M6 | 审批状态 | `not_submitted → pending → approved / rejected` |

禁止把处理进度、业务结论和审批结果压缩进一个 `status` 字段。

M6 的 `blocked` 只表示输入尚不就绪；此时 `EvaluationResult` 和达成结论均不存在，读契约必须返回 `result=null`，不得将其投影为 `not_achieved`。当前试点 v1 读契约的达成结论只开放 `achieved / not_achieved`；未来引入 `partially_achieved` 或 `not_applicable` 时必须同步演进公开契约，不可仅在前端自行派生。

## 9. 来源、版本与信任属性

每个正式节点或关系至少记录：

- 稳定身份与不可变版本 ID；
- `GraphSchemaVersion`；
- 适用专业、课程和周期；
- 人工创建、规则辅助或 AI 辅助的创建方式；
- `material_version_id`、`evidence_fragment_id` 和精确坐标等来源引用；
- 审核人、决定、时间和理由；
- 生效周期和效力状态。

候选置信度不是正式关系的信任等级。AI 候选只有经过 M4 审核、M2 Schema 校验和 M2 发布后，才成为正式图谱事实。

## 10. 迁移规则

1. 现有 `CapabilitySemantics` 中可复用的能力定义迁移为独立 `Ability` / `Skill` / `Knowledge` 节点；指标点和课程目标只保留自身的可观察要求。
2. 现有 `CourseOutcome SUPPORTS GraduateOutcome` 关系必须重新映射到 `PerformanceIndicator`，不能原样发布。
3. 现有 `RubricCriterion ASSESSES CourseOutcome` 拆分为 `ASSESSES Ability / Skill` 和 `CONTRIBUTES_TO CourseOutcome`。
4. 材料版本、证据片段、评价结果和改进记录若已作为图谱节点保存，迁移为所属模块对象和引用，不保留兼容快捷边。
5. 现有评分项得分率、权重、样本、输入哈希和达成结论从 M2 迁入 M6 评价输入或结果快照。
6. 旧 Schema 快照保持只读；新写入只接受本 ADR 对应的新版 `GraphSchemaVersion`。

## 11. 验证场景

以一项实验为最小验收切片，必须能够证明：

```text
GraduateOutcome
  → PerformanceIndicator
  → Ability
  → Skill
  → Knowledge

Course → CourseOutcome ← Experiment
Experiment → TeachingResource
Experiment → AssessmentTask → RubricCriterion
RubricCriterion → Ability / Skill
RubricCriterion → CourseOutcome
```

并满足：

- 任一节点或关系都能回到版本和来源；
- 删除 `ASSESSES` 只产生直接评价缺口，不改变 M6 权重；
- 删除 `CONTRIBUTES_TO` 只产生聚合路径缺口，不改变能力语义；
- 修改资源进入 M3 新版本，修改图谱语义进入 M2 新修订，修改权重进入 M6 新策略；
- 评价结果和改进记录可以下钻到图谱，但不会出现在主图节点目录中。

## 12. 结果与代价

收益：

- M4 的能力候选能正式进入 M2，M5/M6 不再消费不存在的节点；
- 主图规模和语义保持稳定，材料、运行和改进不会污染本体；
- 资源优化、能力诊断和直接评价具备可计算路径；
- M2、M3、M6 的改动位置和审核责任明确。

代价：

- 需要升级现有 M2 Schema、契约和原型数据；
- 旧关系和原型状态字段不能无损兼容，需要显式迁移；
- 页面必须用多种业务投影呈现同一图谱，不能依赖一张全量自由布局图。
