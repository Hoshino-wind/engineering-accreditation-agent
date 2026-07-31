# 实验教学能力图谱产品模块总图

## 1. 产品中心

本项目的核心不是建设一套通用工程认证管理系统，而是建设：

> 以实验教学能力图谱为核心资产，以材料解析和智能审核构建图谱，以图谱分析和确定性评价发现问题，以教学改进和后续复评形成闭环的工程认证智能辅助工具。

材料是输入，能力图谱是核心资产，分析与评价是决策机制，持续改进是闭环，工程认证支撑是输出。

## 2. 上位任务映射

| 项目核心任务 | 产品实现 |
| --- | --- |
| 构建实验教学能力图谱框架 | M2 能力图谱、M3 教学资源、M4 智能识别 |
| 研究图谱构建与智能分析方法 | M4 智能识别、M5 图谱分析、M6 确定性评价 |
| 探索能力图谱应用模式 | M1 工作台、M4 审核、M5 诊断、M8 认证支撑 |
| 探索智能辅助持续改进模式 | M5 诊断、M6 评价、M7 教学优化与复评 |

## 3. 产品模块

| 编号 | 模块 | 深度 | 核心用户结果 |
| --- | --- | --- | --- |
| M1 | [总览与任务工作台](01-dashboard-and-tasks.md) | 简做 | 看清图谱建设进度、失败任务和下一步 |
| M2 | [实验教学能力图谱](02-ability-graph.md) | 重点细做 | 建立有版本、有来源、有审核的正式图谱 |
| M3 | [教学资源与材料](03-teaching-resources.md) | 产品适中、底层细做 | 把材料转成可定位、可授权的资源和证据 |
| M4 | [智能识别与映射审核](04-intelligent-recognition-review.md) | 重点细做 | 将自动识别结果经教师审核写入正式图谱 |
| M5 | [图谱分析与一致性诊断](05-graph-analysis-diagnosis.md) | 重点细做 | 发现覆盖缺口、材料冲突和结构问题 |
| M6 | [达成度评价与统计](06-attainment-evaluation.md) | 最重点细做 | 用确定性方法生成可复算评价结果 |
| M7 | [教学优化与持续改进](07-teaching-improvement.md) | 重点细做 | 将问题落实为变更并用复评验证效果 |
| M8 | [工程认证支撑](08-accreditation-support.md) | 简做 | 输出带来源、可审计的固定支撑材料 |
| M9 | [系统治理](09-system-governance.md) | 页面简做、底层严格 | 统一身份、数据范围、权限和审计 |

AI 不作为独立菜单。它嵌入 M3～M7，只能生成候选、解释和草稿，不能直接生成正式图谱关系、评价数值或改进结论。

## 4. 唯一正式图谱本体

完整决策和合法端点表见 [ADR-001：实验教学能力图谱正式本体](../../architecture/decisions/001-experimental-teaching-ontology.md)。产品文档、前后端契约、识别候选、诊断规则和评价映射不得各自定义另一套节点或关系名称。

### 4.1 主图节点

主图只保存跨材料、跨周期仍需稳定引用的教学语义和结构：

- 认证要求：毕业要求、指标点；
- 能力语义：能力、技能、知识点；
- 教学承载：课程、课程目标、实验项目；
- 评价结构：考核任务、评分项；
- 教学资源：设备、软件环境、数据集、案例、仿真平台和指导资源等可复用资产。

`TeachingResource` 是 M3 拥有和版本化的一等业务对象；M2 在正式图谱快照中固定其版本引用并拥有相关正式关系。课程材料文件不等于教学资源。

### 4.2 非主图对象

以下对象保持可追溯，但不得与能力、实验、评分项并列为主图节点：

- 工作空间、专业、培养方案、评价周期、教学班、用户和数据范围等上下文；
- `Material`、`MaterialVersion`、`EvidenceFragment` 等材料与来源对象；
- M4 的识别运行、候选和审核决定；
- M5 的分析运行与诊断发现；
- M6 的评分记录、策略、输入快照、评价运行和评价结果；
- M7 的质量问题、改进措施、实际变更和复评；
- M8 的支撑包与导出文件。

它们通过稳定 ID 和不可变版本引用正式图谱，不复制成“应用节点”。证据是 `GraphSourceRef`，不是“证明”关系；评价和改进是运行记录，不是教学语义。

### 4.3 权威关系

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

`ASSESSES` 只表达“实际测量什么能力或技能”；`CONTRIBUTES_TO` 只表达“评分汇总到哪个课程目标”。分值、权重、阈值、样本和计算结果归 M6 的评价策略与运行快照所有，不写入 M2 关系。

禁止用快捷边绕过正式路径，例如课程目标直接支撑毕业要求、实验直接支撑指标点、评分项直接评价课程目标或毕业要求。证据引用、评价结果和改进变更也不得伪装成图谱关系。系统可以计算反向导航和传递路径，但不将推导结果重复保存为权威边。

每条正式关系包含两端版本、来源引用、创建方式、审核决定、生效范围和当前效力状态。首期正式关系仍可存储在 PostgreSQL 关系表中，不因“图谱”名称提前引入复杂图数据库。

## 5. 两条闭环

### 5.1 图谱构建闭环

```text
教学资源/材料 → 解析与识别 → 候选节点/关系 → 教师审核
→ 正式能力图谱 → 一致性诊断 → 补材料或修正关系
```

### 5.2 教学持续改进闭环

```text
正式能力图谱 + 达成度评价 → 问题诊断 → 改进措施
→ M3 资源/材料、M2 图谱或 M6 评价策略新版本 → 更新依赖快照
→ 后续评价 → 验证改进效果
```

完整状态交接和回退路径见[端到端业务闭环](../end-to-end-closed-loop.md)。

## 6. 模块协作规则

- M2 拥有正式图谱 Schema、语义节点版本、关系版本、发布快照和审核决定；外部对象作为固定版本引用进入快照。
- M3 拥有 `TeachingResource` 及其版本，也拥有 `Material`、`MaterialVersion` 和 `EvidenceFragment`；M2 只拥有资源参与教学路径的正式关系。
- M4 只拥有识别运行、候选和审核过程；审核通过仍需向 M2 提交正式化请求。
- M5 只拥有分析运行和诊断发现，不直接修改图谱。
- M6 拥有 Rubric 计分配置、分值、权重、阈值、评分输入、运行状态和评价结果；正式数值只由版本化确定性策略计算。
- M7 问题关闭必须关联实际变更和复评结果。
- M8 只汇总已确认事实，不能在报告内覆盖上游数据。
- M1 聚合任务和待办，业务动作回到事实所属模块完成。
- M9 的权限判断在服务端执行，前端隐藏入口不构成安全控制。
