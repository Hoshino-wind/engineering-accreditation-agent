import type { RecognitionCandidate } from './recognitionCandidate';

export const prototypeOnlyRecognitionCandidates: RecognitionCandidate[] = [
  {
    id: 'candidate-ds-tree-ct3',
    title: '“二叉树遍历”实验支撑课程目标 CT-3',
    course: '数据结构',
    candidateType: '关系候选',
    confidence: 78,
    risk: 'highImpact',
    sourceNode: '二叉树遍历实验',
    relation: '支撑',
    targetNode: '课程目标 CT-3',
    explanation:
      '实验内容涉及二叉树的递归与非递归遍历实现，可直接支撑学生对树结构算法设计与实现能力的培养。',
    processorVersion: 'recognition-pipeline v3.2',
    generatedAt: '2026-07-28 10:26',
    impact: { courseObjectives: 1, abilityNodes: 1, rubricItems: 2 },
    conflictMessage:
      '与候选“排序算法实验支撑 CT-2”存在潜在目标聚合冲突，需确认课程目标边界。',
    evidence: [
      {
        id: 'evidence-tree-01',
        resourceName: '数据结构实验指导书',
        resourceVersion: 'v2',
        coordinate: '第 41 页 · 表 5-1',
        excerpt:
          '实验五要求完成二叉树的创建、递归与非递归遍历，并分析不同遍历算法的适用场景和复杂度。',
        hash: 'SHA256 8304…b719',
      },
      {
        id: 'evidence-tree-02',
        resourceName: '《数据结构》课程教学大纲',
        resourceVersion: 'v3',
        coordinate: '第 12 页 · 表 3-2 · 第 4 行',
        excerpt:
          '课程目标 CT-3：能够针对复杂数据组织问题设计并实现适当的数据结构与算法。',
        hash: 'SHA256 d204…91c6',
      },
    ],
  },
  {
    id: 'candidate-ds-backtracking-ct4',
    title: '“回溯路径”实验支撑课程目标 CT-4',
    course: '数据结构',
    candidateType: '关系候选',
    confidence: 66,
    risk: 'lowConfidence',
    sourceNode: '回溯路径实验',
    relation: '支撑',
    targetNode: '课程目标 CT-4',
    explanation:
      '材料描述了路径搜索与回溯，但未明确对应课程目标，需要教师补充目标定位。',
    processorVersion: 'recognition-pipeline v3.2',
    generatedAt: '2026-07-28 10:26',
    impact: { courseObjectives: 1, abilityNodes: 0, rubricItems: 1 },
    evidence: [
      {
        id: 'evidence-backtracking-01',
        resourceName: '数据结构实验指导书',
        resourceVersion: 'v2',
        coordinate: '第 27 页 · 实验三 · 任务 2',
        excerpt:
          '使用栈实现迷宫路径搜索，记录回溯过程并比较不同搜索策略。',
        hash: 'SHA256 7a33…2bc1',
      },
    ],
  },
  {
    id: 'candidate-ds-correctness-ba2',
    title: '评分项“正确性”映射能力节点 BA-2',
    course: '数据结构',
    candidateType: '映射候选',
    confidence: 59,
    risk: 'lowConfidence',
    sourceNode: '评分项：算法正确性',
    relation: '评价',
    targetNode: '能力节点 BA-2',
    explanation:
      '评分项名称过于宽泛，尚不足以证明其完整评价 BA-2，需要结合评分描述确认。',
    processorVersion: 'recognition-pipeline v3.2',
    generatedAt: '2026-07-28 10:27',
    impact: { courseObjectives: 0, abilityNodes: 1, rubricItems: 1 },
    evidence: [
      {
        id: 'evidence-correctness-01',
        resourceName: '数据结构综合实验评分表',
        resourceVersion: 'v4',
        coordinate: '工作表“评分标准” · C4:C8',
        excerpt:
          '算法正确性：能够正确处理正常输入、边界输入和异常输入，占总评分 40%。',
        hash: 'SHA256 aa27…0dd9',
      },
    ],
  },
  {
    id: 'candidate-ds-sort-conflict',
    title: '“排序算法”实验与课程目标 CT-2 冲突',
    course: '数据结构',
    candidateType: '关系候选',
    confidence: 82,
    risk: 'conflict',
    sourceNode: '排序算法综合实验',
    relation: '支撑',
    targetNode: '课程目标 CT-2',
    explanation:
      '实验任务与 CT-2 相关，但现有图谱已将同名实验关联到 CT-3，需要确认实验版本和目标定义。',
    processorVersion: 'recognition-pipeline v3.2',
    generatedAt: '2026-07-28 10:27',
    impact: { courseObjectives: 2, abilityNodes: 1, rubricItems: 2 },
    conflictMessage:
      '正式图谱中存在“排序算法综合实验 → CT-3”关系，来源版本为指导书 v1。',
    existingFormalValue: {
      sourceNode: '排序算法综合实验',
      relation: '支撑',
      targetNode: '课程目标 CT-3',
      version: '图谱 v0.3',
    },
    evidence: [
      {
        id: 'evidence-sort-01',
        resourceName: '数据结构实验指导书',
        resourceVersion: 'v2',
        coordinate: '第 63 页 · 实验七',
        excerpt:
          '实现并比较快速排序、归并排序和堆排序，完成复杂度分析与实验验证。',
        hash: 'SHA256 641a…ec72',
      },
    ],
  },
  {
    id: 'candidate-ds-performance-pi5',
    title: '“性能分析”评分项映射指标点 PI-5',
    course: '数据结构',
    candidateType: '映射候选',
    confidence: 71,
    risk: 'normal',
    sourceNode: '评分项：性能分析',
    relation: '评价',
    targetNode: '指标点 PI-5',
    explanation:
      '评分标准要求以复杂度和测试数据论证算法性能，与指标点 PI-5 的证据要求一致。',
    processorVersion: 'recognition-pipeline v3.2',
    generatedAt: '2026-07-28 10:28',
    impact: { courseObjectives: 0, abilityNodes: 1, rubricItems: 1 },
    evidence: [
      {
        id: 'evidence-performance-01',
        resourceName: '数据结构综合实验评分表',
        resourceVersion: 'v4',
        coordinate: '工作表“评分标准” · D6:D10',
        excerpt:
          '性能分析需同时包含理论复杂度、测试数据与不同规模输入下的趋势解释。',
        hash: 'SHA256 c551…26b0',
      },
    ],
  },
  {
    id: 'candidate-ds-hash-ct1',
    title: '“哈希表实现”实验支撑课程目标 CT-1',
    course: '数据结构',
    candidateType: '关系候选',
    confidence: 90,
    risk: 'highImpact',
    sourceNode: '哈希表实现实验',
    relation: '支撑',
    targetNode: '课程目标 CT-1',
    explanation:
      '实验目标、任务与课程目标表述高度一致，且具有两个独立来源。',
    processorVersion: 'recognition-pipeline v3.2',
    generatedAt: '2026-07-28 10:28',
    impact: { courseObjectives: 1, abilityNodes: 1, rubricItems: 1 },
    evidence: [
      {
        id: 'evidence-hash-01',
        resourceName: '数据结构实验指导书',
        resourceVersion: 'v2',
        coordinate: '第 72 页 · 实验八',
        excerpt:
          '设计散列表并比较不同冲突处理方法，分析装载因子对查找性能的影响。',
        hash: 'SHA256 4f71…910e',
      },
      {
        id: 'evidence-hash-02',
        resourceName: '《数据结构》课程教学大纲',
        resourceVersion: 'v3',
        coordinate: '第 13 页 · 表 3-2 · 第 7 行',
        excerpt:
          '课程目标 CT-1 要求学生掌握典型数据结构的组织、存储与基本操作。',
        hash: 'SHA256 097b…4a16',
      },
    ],
  },
  {
    id: 'candidate-se-requirement-node',
    title: '“需求评审”能力节点疑似重复',
    course: '软件工程',
    candidateType: '节点候选',
    confidence: 88,
    risk: 'conflict',
    sourceNode: '候选能力：需求评审',
    relation: '等价于',
    targetNode: '正式能力：需求分析与评审',
    explanation:
      '候选名称与正式能力节点语义接近，建议合并而非创建新节点。',
    processorVersion: 'recognition-pipeline v3.2',
    generatedAt: '2026-07-28 10:29',
    impact: { courseObjectives: 1, abilityNodes: 2, rubricItems: 0 },
    conflictMessage:
      '正式图谱已有“需求分析与评审”节点，并被 3 个实验项目引用。',
    existingFormalValue: {
      sourceNode: '候选能力：需求评审',
      relation: '等价于',
      targetNode: '需求分析与评审',
      version: '图谱 v0.3',
    },
    evidence: [
      {
        id: 'evidence-requirement-01',
        resourceName: '软件工程课程设计指导书',
        resourceVersion: 'v2',
        coordinate: '第 18 页 · 2.3 需求评审',
        excerpt:
          '项目组需组织需求评审，记录问题、决议和需求基线变更。',
        hash: 'SHA256 e8b2…671a',
      },
    ],
  },
];
