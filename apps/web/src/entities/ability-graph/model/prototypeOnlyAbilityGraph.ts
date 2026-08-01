import type {
  AbilityGraphData,
  AbilityGraphEdge,
  AbilityGraphNode,
} from './abilityGraph';
import {
  standardGraduationRequirements,
  standardCompetencies,
  standardEdges,
} from './standardLibrary';

// 示例数据 —— 标准 + 学校上传合并
// 毕业要求/能力指标直接引用 standardLibrary（系统内置标准，11 条 + 22 个）
// 课程/实验/知识点/资源 = 学校上传数据（AI 提取 + 教师审核），origin: school

// === 学校上传数据节点 ===
const schoolNodes: AbilityGraphNode[] = [
  // 课程（3 门）
  { id: 'co-ds', kind: 'Course', code: 'CS-2001', origin: 'school', name: '数据结构与算法', description: '线性表、树、图、排序与查找算法', properties: { credit: 3.0, totalHours: 56, experimentHours: 16, semester: 3 } },
  { id: 'co-mcu', kind: 'Course', code: 'B020012005', origin: 'school', name: '单片机基础', description: '基于 STM32 的嵌入式系统开发实验，覆盖 GPIO、定时器、ADC、传感器', properties: { credit: 2.0, totalHours: 48, experimentHours: 32, semester: 4 } },
  { id: 'co-fpga', kind: 'Course', code: 'B020031006', origin: 'school', name: '嵌入式系统原理', description: '基于 Verilog HDL 与 FPGA 的数字系统设计', properties: { credit: 1.5, totalHours: 32, experimentHours: 24, semester: 5 } },

  // 实验项目（4 个）
  { id: 'exp-list', kind: 'Experiment', code: 'EXP-DS-01', origin: 'school', name: '链表实现', description: '使用 C/C++ 实现单链表、双链表、循环链表的基本操作', properties: { experimentType: '设计性', hours: 4, difficulty: 'medium' } },
  { id: 'exp-sort', kind: 'Experiment', code: 'EXP-DS-02', origin: 'school', name: '排序对比', description: '对比冒泡/快排/归并/堆排序的时间复杂度与稳定性', properties: { experimentType: '验证性', hours: 3, difficulty: 'easy' } },
  { id: 'exp-system', kind: 'Experiment', code: 'EXP-EMB-01', origin: 'school', name: '系统设计', description: '基于 STM32 的综合嵌入式系统设计，含外设驱动与任务调度', properties: { experimentType: '综合性', hours: 8, difficulty: 'hard' } },
  { id: 'exp-fpga-1', kind: 'Experiment', code: 'EXP-FPGA-01', origin: 'school', name: 'LED 流水灯', description: '基于 Verilog 的 FPGA 入门实验，理解状态机与分频', properties: { experimentType: '设计性', hours: 4, difficulty: 'medium' } },

  // 知识点（4 条）
  { id: 'kp-list', kind: 'KnowledgePoint', code: 'KP-DS-01', origin: 'school', name: '链表操作', description: '单/双/循环链表的插入、删除、查找、反转', properties: { category: '数据结构', difficultyLevel: 2 } },
  { id: 'kp-sort', kind: 'KnowledgePoint', code: 'KP-DS-02', origin: 'school', name: '排序算法', description: '交换/选择/归并类排序及复杂度分析', properties: { category: '数据结构', difficultyLevel: 2 } },
  { id: 'kp-embedded', kind: 'KnowledgePoint', code: 'KP-MCU-01', origin: 'school', name: '嵌入式编程', description: 'GPIO 配置、定时器、中断、外设驱动', properties: { category: '嵌入式系统', difficultyLevel: 3 } },
  { id: 'kp-verilog', kind: 'KnowledgePoint', code: 'KP-HDL-01', origin: 'school', name: 'Verilog HDL 语言基础', description: '模块、端口、always、assign、阻塞与非阻塞赋值', properties: { category: '硬件描述语言', difficultyLevel: 2 } },

  // 教学资源（3 条）
  { id: 'res-sim', kind: 'TeachingResource', code: 'RES-SW-01', origin: 'school', name: '仿真软件', description: 'Multisim / Icarus Verilog / Proteus 电路与逻辑仿真工具', properties: { resourceType: 'software', fileFormat: 'exe' } },
  { id: 'res-board', kind: 'TeachingResource', code: 'RES-HW-01', origin: 'school', name: '开发板', description: 'STM32F103 / FPGA Cyclone IV 实验开发板', properties: { resourceType: 'hardware', fileFormat: 'kit' } },
  { id: 'res-doc', kind: 'TeachingResource', code: 'RES-DOC-01', origin: 'school', name: '实验指导书', description: '数据结构/单片机/FPGA 课程配套 PDF 实验指导书', properties: { resourceType: 'document', fileFormat: 'pdf' } },
];

// === 学校数据与标准之间的支撑关系边 ===
const schoolEdges: AbilityGraphEdge[] = [
  // SUPPORTS_REQ：课程 → 毕业要求（学校课程对标认证标准）
  { id: 'e-co-ds-gr01', source: 'co-ds', target: 'std-gr-01', kind: 'SUPPORTS_REQ', sourceType: 'rule', reviewStatus: 'approved', strength: 'strong' },
  { id: 'e-co-mcu-gr03', source: 'co-mcu', target: 'std-gr-03', kind: 'SUPPORTS_REQ', sourceType: 'rule', reviewStatus: 'approved', strength: 'strong' },
  { id: 'e-co-fpga-gr01', source: 'co-fpga', target: 'std-gr-01', kind: 'SUPPORTS_REQ', sourceType: 'rule', reviewStatus: 'approved', strength: 'medium' },

  // BELONGS_TO：实验 → 课程
  { id: 'e-exp-list-co', source: 'exp-list', target: 'co-ds', kind: 'BELONGS_TO', sourceType: 'rule', reviewStatus: 'approved' },
  { id: 'e-exp-sort-co', source: 'exp-sort', target: 'co-ds', kind: 'BELONGS_TO', sourceType: 'rule', reviewStatus: 'approved' },
  { id: 'e-exp-system-co', source: 'exp-system', target: 'co-mcu', kind: 'BELONGS_TO', sourceType: 'rule', reviewStatus: 'approved' },
  { id: 'e-exp-fpga1-co', source: 'exp-fpga-1', target: 'co-fpga', kind: 'BELONGS_TO', sourceType: 'rule', reviewStatus: 'approved' },

  // SUPPORTS：实验 → 能力指标（AI 推荐，核心审核场景）
  { id: 'e-exp-list-c0101', source: 'exp-list', target: 'std-c-01-01', kind: 'SUPPORTS', sourceType: 'ai', reviewStatus: 'pending', strength: 'strong', confidence: 0.92, aiReasoning: '链表实现实验要求理解线性表存储结构与操作效率，对应工程知识应用能力。' },
  { id: 'e-exp-list-c0102', source: 'exp-list', target: 'std-c-01-02', kind: 'SUPPORTS', sourceType: 'ai', reviewStatus: 'pending', strength: 'medium', confidence: 0.78, aiReasoning: '要求分析不同链表操作的复杂度边界，有一定的问题分析体现。' },
  { id: 'e-exp-sort-c0101', source: 'exp-sort', target: 'std-c-01-01', kind: 'SUPPORTS', sourceType: 'manual', reviewStatus: 'approved', strength: 'medium' },
  { id: 'e-exp-system-c0301', source: 'exp-system', target: 'std-c-03-01', kind: 'SUPPORTS', sourceType: 'manual', reviewStatus: 'approved', strength: 'strong' },
  { id: 'e-exp-system-c0501', source: 'exp-system', target: 'std-c-05-01', kind: 'SUPPORTS', sourceType: 'ai', reviewStatus: 'pending', strength: 'strong', confidence: 0.85, aiReasoning: '综合实验使用 STM32 开发板、Keil、示波器等多类工具，明确体现现代工具使用。' },
  { id: 'e-exp-fpga-c0301', source: 'exp-fpga-1', target: 'std-c-03-01', kind: 'SUPPORTS', sourceType: 'ai', reviewStatus: 'pending', strength: 'medium', confidence: 0.74, aiReasoning: '要求设计状态机与分频逻辑，对应一定的系统设计能力，建议教师进一步确认覆盖深度。' },
  { id: 'e-exp-fpga-c0501', source: 'exp-fpga-1', target: 'std-c-05-01', kind: 'SUPPORTS', sourceType: 'manual', reviewStatus: 'approved', strength: 'strong' },

  // COVERS_KNOWLEDGE：实验 → 知识点
  { id: 'e-exp-list-kp-list', source: 'exp-list', target: 'kp-list', kind: 'COVERS_KNOWLEDGE', sourceType: 'rule', reviewStatus: 'approved' },
  { id: 'e-exp-sort-kp-sort', source: 'exp-sort', target: 'kp-sort', kind: 'COVERS_KNOWLEDGE', sourceType: 'rule', reviewStatus: 'approved' },
  { id: 'e-exp-system-kp-emb', source: 'exp-system', target: 'kp-embedded', kind: 'COVERS_KNOWLEDGE', sourceType: 'rule', reviewStatus: 'approved' },
  { id: 'e-exp-fpga-kp-verilog', source: 'exp-fpga-1', target: 'kp-verilog', kind: 'COVERS_KNOWLEDGE', sourceType: 'rule', reviewStatus: 'approved' },

  // USES_RESOURCE：实验 → 教学资源
  { id: 'e-exp-list-resdoc', source: 'exp-list', target: 'res-doc', kind: 'USES_RESOURCE', sourceType: 'rule', reviewStatus: 'approved' },
  { id: 'e-exp-sort-resdoc', source: 'exp-sort', target: 'res-doc', kind: 'USES_RESOURCE', sourceType: 'rule', reviewStatus: 'approved' },
  { id: 'e-exp-system-board', source: 'exp-system', target: 'res-board', kind: 'USES_RESOURCE', sourceType: 'rule', reviewStatus: 'approved' },
  { id: 'e-exp-system-sim', source: 'exp-system', target: 'res-sim', kind: 'USES_RESOURCE', sourceType: 'rule', reviewStatus: 'approved' },
  { id: 'e-exp-fpga-sim', source: 'exp-fpga-1', target: 'res-sim', kind: 'USES_RESOURCE', sourceType: 'rule', reviewStatus: 'approved' },
];

// 合并：标准节点 + 标准边 + 学校节点 + 学校边
export const prototypeOnlyAbilityGraph: AbilityGraphData = {
  nodes: [...standardGraduationRequirements, ...standardCompetencies, ...schoolNodes],
  edges: [...standardEdges, ...schoolEdges],
};
