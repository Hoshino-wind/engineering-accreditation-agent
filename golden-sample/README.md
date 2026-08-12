# 达成度金标准样例（标尺）

## 1. 这是什么

一份**由人工先算出来**的课程目标达成度分析，连同它依赖的图谱路径、来源引用和逐生逐项原始分，一起固定成可机读的样例。

它的唯一用途是：**当系统算出一个达成度时，判断这个数对不对。**

没有这把尺子，"计算一致率 100%"这类指标没有判据——因为没有第二个独立结果可比。

## 2. 为什么它必须先于系统建设

达成度计算里真正引起争议的不是加权求和，而是这些口径：

| 争议点 | 取值不同会怎样 |
| --- | --- |
| 平均分法 还是 达标人数比例法 | 完全不同的两个数 |
| 缺考剔除、记零、还是阻断 | 合成样例中 RC-2 剔除得 0.767，记零得 0.671 |
| 分母用选课人数还是有效提交人数 | 缺考越多差异越大 |
| 逐步舍入 还是 末尾一次舍入 | 合成样例中相差 0.001（0.749 / 0.748） |
| 阈值取 `>=` 还是 `>` | 恰好等于阈值时结论相反 |

这些必须在写计算代码之前冻结成书面决定，否则"系统算错了"和"我们口径不同"永远分不清。

## 3. 目录结构

```
golden-sample/
  samples/
    synth-001/             最小结构样例：2 个评价对象，数字可手算复核
    sensor-lab-demo/       ★ 一门课的完整填充示例：四份教学文档 + 机读形式
  templates/               空白录入模板
  verifier/                独立复算校验器（不依赖 apps/api）
```

**先看 [`samples/sensor-lab-demo/`](samples/sensor-lab-demo/README.md)。** 它展示了课程大纲、实验指导书、评分标准表、成绩记录表这四份文档要怎么填，才能填满一份可验收的金标准。

## 3.1 四份源文档

金标准不是凭空填的，它的每个字段都来自一份教学文档：

| 文档 | 提供 | 填写频率 |
| --- | --- | --- |
| 课程大纲 | 课程目标、**目标↔指标点矩阵**、实验一览 | 一次性 |
| 实验指导书 | 实验项目、**对应课程目标**、**考核要求** | 一次性 |
| 评分标准表 | 评分项、满分、**对应课程目标**、**权重** | 一次性 |
| 成绩记录表 | 逐生逐项原始分 | **每学期** |

粗体五项是现有教学材料最常缺失的，也是整条达成度链上**无法从其它地方推导**的信息——缺一个，链就断。

设计上刻意把评分标准表和成绩记录表拆开：前者定义"怎么评"（跨学期复用、版本化），后者记录"评了多少"（每学期新数据）。混在一个 Excel 里就无法判断达成度的变化来自学生水平还是评分标准。

**真实样例不进仓库。** 放在 `.local-data/golden-sample/<课程代号>/`，该路径已被 `.gitignore` 排除。

## 4. 录一门课

### 4.1 准备

从真实资料里挑一门**评分表齐全**的课程。资料盘点显示 9 门课只有 3 份评分表，所以这一步就是筛选条件——没有逐生逐项分数的课程做不成标尺。

需要三份材料：课程大纲（课程目标、目标与指标点对应）、实验指导书（实验项目、考核要求）、评分表（评分项、满分、逐生分数）。

### 4.2 复制模板

```bash
mkdir -p .local-data/golden-sample/<课程代号>
cp golden-sample/templates/sample.template.json .local-data/golden-sample/<课程代号>/sample.json
cp golden-sample/templates/scores.template.csv  .local-data/golden-sample/<课程代号>/scores.csv
```

### 4.3 填 sample.json（专业负责人）

按模板里的 `_说明` 逐项填写。四个易错点：

- **`digest` 必须是完整 64 位 sha256**，取值用 `shasum -a 256 <文件路径>`。省略号摘要会被直接拒绝——它无法用于复核。
- **节点类型和关系类型是白名单**。首期最小本体只有 6 类节点、6 类关系，见下节。
- **`weight` 是评分项在课程目标中的聚合权重，`max_score` 是该评分项满分**，两者不可混用。同一评价对象内 `weight` 合计必须为 1。
- **`expected` 段必须人工先算再填，不能从系统结果反抄**。反抄会让尺子和被测对象变成同一个东西，比对永远通过。

### 4.4 填成绩记录表（任课教师）

教师照常在 Excel 里填宽表（行=学生，列=评分项），列名以评分项编号开头即可：

```
学生代号,RC-0101(满分15),RC-0102(满分15),备注
20230101,13,14,
20230104,11,缺考,缺席实验二
```

导出 CSV 后转换，**这一步同时完成学号脱敏**：

```bash
make convert-scores SRC=<宽表.csv> OUT=<样例目录>/scores.csv
```

转换器会把首列换成 `S01`、`S02`…，并把「缺考」「缺席」「-」「—」「/」「N/A」和空单元格统一识别为缺失。

> 缺考录空值或缺考标记，**不要删整行**。删行就无法区分"这人缺考"和"这行漏录了"，校验器会报错。

### 4.5 校验

```bash
make verify-golden DIR=.local-data/golden-sample/<课程代号>
```

校验器会独立复算一遍，和你填的 `expected` 逐项比对，输出核对单：

```
评分项               满分      权重       有效/缺失        分数合计       得分率       贡献值
RC-1              20    0.40     8/0             127     0.794     0.318
RC-2              30    0.35     7/1             161     0.767     0.268
RC-3              20    0.25     8/0             104     0.650     0.163

权重合计：1.000
达成度：0.749    结论：achieved
```

不一致时会指出具体是哪个对象的哪个字段差多少。**不一致说明人工结论、原始分或口径声明三者中至少有一个错了，此时这份样例还不能用作验收基准。**

## 5. 首期最小本体

金标准只使用"能算出达成度"所必需的子集。完整本体见 [ADR-001](../docs/architecture/decisions/001-experimental-teaching-ontology.md)。

**节点（6 类）**：`PerformanceIndicator`、`Course`、`CourseOutcome`、`Experiment`、`AssessmentTask`、`RubricCriterion`

**关系（6 类）**：

| 关系 | 起点 → 终点 |
| --- | --- |
| `DEFINES` | Course → CourseOutcome |
| `BELONGS_TO` | Experiment → Course |
| `SUPPORTS` | CourseOutcome → PerformanceIndicator |
| `CONTRIBUTES_TO` | Experiment → CourseOutcome、RubricCriterion → CourseOutcome |
| `CONTAINS_TASK` | Experiment → AssessmentTask |
| `CONTAINS_CRITERION` | AssessmentTask → RubricCriterion |

ADR-001 中的 `Ability` / `Skill` / `Knowledge` 及其关系（`EXPECTS`、`COMPOSED_OF`、`REQUIRES`、`CULTIVATES`、`TRAINS`、`COVERS`、`ASSESSES`）**不在金标准首版范围内**。它们是认证材料的加分项而非必需项，同时是最难自动抽取、最容易产生分歧的部分，等第一条线跑通后再按 `GraphSchemaVersion` 升级纳入。

## 6. 阻断是常态，不是异常

合成样例里 `TGT-CO1` 是一个**没有任何评分数据**的评价对象。这不是为了演示错误路径，而是因为真实资料中它就是多数情况。

此时：

- `attainment` 与 `outcome` 都必须为空；
- **不得投影为"未达成"**——"没数据算不了"和"算出来没达标"是两个完全不同的事实（ADR-001 第 8 节）；
- 阻断原因必须逐条列出，指向缺什么。

系统如果把阻断显示成"未达成 0.00"，就是错的，这条由金标准和测试共同锁死。

## 7. 校验器为什么独立实现

`golden-sample/verifier/` 不 import `apps/api` 的任何代码，也不共享依赖。

如果尺子和被测对象共用同一份计算实现，比对结果恒为真，也就量不到任何东西。两份独立实现算出同一个数，才构成有效的交叉验证。

这条约束由 `verifier/pyproject.toml` 的空 `dependencies` 保证。

反方向的比对是允许的：`apps/api/tests/test_golden_sample_agreement.py` 直接读取本目录的
`sample.json` 与 `scores.csv`，用服务端派生逻辑重算同一批原始分，逐项比对人工得分率。
它只依赖金标准的**数据**，不依赖校验器的**代码**，因此两份实现仍然彼此独立。

金标准若改用服务端尚未实现的口径（例如达标人数比例法），该测试会先失败——
这正是标尺应有的作用：在试点现场之前暴露差距。

## 8. 命令

```bash
make verify-golden                                # 校验仓库内全部样例
make verify-golden DIR=<样例目录>                  # 校验指定样例
make convert-scores SRC=<宽表.csv> OUT=<scores.csv>  # 宽表转长表并脱敏
make test-golden                                  # 跑校验器自身的测试
```
