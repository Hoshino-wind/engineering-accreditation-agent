import type {
  AbilityGraphData,
  AbilityGraphEdge,
  AbilityGraphNode,
} from './abilityGraph';

// 系统内置认证标准库 —— 2024 版工程教育认证标准
// 数据来源：《学院汇报-工程认证推动课程建设.pptx》第 13~23 页原文
// 精选电子信息工程最核心的 5 条毕业要求 + 7 个能力指标点

export const STANDARD_VERSION = '2024';

// 5 条毕业要求（PPT 原文，知识→分析→设计→研究→工具核心链条）
export const standardGraduationRequirements: AbilityGraphNode[] = [
  { id: 'std-gr-01', kind: 'GraduationRequirement', code: 'GR-01', origin: 'standard', name: '工程知识', description: '能够将数学、自然科学、计算、工程基础和专业知识用于解决复杂工程问题。', properties: { sortOrder: 1, standardVersion: STANDARD_VERSION } },
  { id: 'std-gr-02', kind: 'GraduationRequirement', code: 'GR-02', origin: 'standard', name: '问题分析', description: '能够应用数学、自然科学和工程科学的基本原理，识别、表达并通过文献研究分析复杂工程问题，综合考虑可持续发展要求，以获得有效结论。', properties: { sortOrder: 2, standardVersion: STANDARD_VERSION } },
  { id: 'std-gr-03', kind: 'GraduationRequirement', code: 'GR-03', origin: 'standard', name: '设计/开发解决方案', description: '能够设计针对复杂工程问题的解决方案，设计满足特定需求的系统、单元或工艺流程，并能够在设计环节中体现创新思维和考虑健康、安全与环境等因素。', properties: { sortOrder: 3, standardVersion: STANDARD_VERSION } },
  { id: 'std-gr-04', kind: 'GraduationRequirement', code: 'GR-04', origin: 'standard', name: '研究', description: '能够基于科学原理并采用科学方法对复杂工程问题进行研究，包括设计实验、分析与解释数据、并通过信息综合得到合理有效的结论。', properties: { sortOrder: 4, standardVersion: STANDARD_VERSION } },
  { id: 'std-gr-05', kind: 'GraduationRequirement', code: 'GR-05', origin: 'standard', name: '使用现代工具', description: '能够选择与使用恰当的技术、资源、现代工程工具和信息技术工具，对复杂工程问题进行预测与模拟，并能够理解其局限性。', properties: { sortOrder: 5, standardVersion: STANDARD_VERSION } },
];

// 7 个能力指标点（PPT 原文措辞，保留"软件工程领域"）
export const standardCompetencies: AbilityGraphNode[] = [
  // GR-01 工程知识（1 个）
  { id: 'std-c-01-01', kind: 'Competency', code: 'C-01-01', origin: 'standard', name: '1-1 工程知识应用', description: '能够运用数学、自然科学、计算、软件工程专业知识正确表述软件工程领域复杂工程问题，并理解算力、算法和数据对解决软件工程领域复杂工程问题的意义和基本方法。', properties: { parent: 'GR-01', level: 2, standardVersion: STANDARD_VERSION } },
  // GR-02 问题分析（1 个）
  { id: 'std-c-02-01', kind: 'Competency', code: 'C-02-01', origin: 'standard', name: '2-1 问题识别与表达', description: '能够运用数学、自然科学和工程科学的基本原理、基本思维方法正确解析、识别和表达软件工程领域复杂工程问题。', properties: { parent: 'GR-02', level: 2, standardVersion: STANDARD_VERSION } },
  // GR-03 设计/开发解决方案（2 个，核心能力）
  { id: 'std-c-03-01', kind: 'Competency', code: 'C-03-01', origin: 'standard', name: '3-1 系统设计方法', description: '掌握针对软件工程领域复杂工程问题的工程设计和产品开发全周期、全流程的设计/开发方法和技术，了解考虑可能影响设计目标和技术方案的各种因素，能够针对特定需求完成系统、构件或过程的设计，在设计中体现创新思维和计算思维。', properties: { parent: 'GR-03', level: 2, standardVersion: STANDARD_VERSION } },
  { id: 'std-c-03-02', kind: 'Competency', code: 'C-03-02', origin: 'standard', name: '3-2 可行性与影响考量', description: '能够从健康、安全与环境、全生命周期成本与净零碳要求、法律与伦理、社会与文化等角度考虑解决方案的可行性和实现路径。', properties: { parent: 'GR-03', level: 2, standardVersion: STANDARD_VERSION } },
  // GR-04 研究（2 个，核心能力）
  { id: 'std-c-04-01', kind: 'Competency', code: 'C-04-01', origin: 'standard', name: '4-1 实验方案设计', description: '能够基于科学原理，通过文献研究或相关方法对软件工程领域的复杂工程问题的解决方案进行调研分析、选择研究路线、设计实验或实现方案。', properties: { parent: 'GR-04', level: 2, standardVersion: STANDARD_VERSION } },
  { id: 'std-c-04-02', kind: 'Competency', code: 'C-04-02', origin: 'standard', name: '4-2 数据分析与解释', description: '能够根据实验或实现方案构建实验系统、正确采集数据并安全开展实验，能对实验结果进行分析与解释，并通过信息综合得到合理有效的结论。', properties: { parent: 'GR-04', level: 2, standardVersion: STANDARD_VERSION } },
  // GR-05 使用现代工具（1 个）
  { id: 'std-c-05-01', kind: 'Competency', code: 'C-05-01', origin: 'standard', name: '5-1 现代工具选择与使用', description: '能够了解解决软件工程领域复杂工程问题常用的主流技术、工具、模拟软件的使用原理和方法，并能够选择与使用恰当的技术、工具和专业模拟软件。', properties: { parent: 'GR-05', level: 2, standardVersion: STANDARD_VERSION } },
];

// 毕业要求 → 能力指标的内置边（CONTAINS）
export const standardEdges: AbilityGraphEdge[] = standardCompetencies.map((c) => {
  const parentCode = c.properties?.parent as string;
  const parentId = `std-gr-${parentCode?.split('-')[1]?.padStart(2, '0')}`;
  return {
    id: `std-e-${parentCode}-${c.code}`,
    source: parentId,
    target: c.id,
    kind: 'CONTAINS' as const,
    sourceType: 'rule' as const,
    reviewStatus: 'approved' as const,
  };
});

// 完整标准库数据（节点 + 边）
export const standardLibrary: AbilityGraphData = {
  nodes: [...standardGraduationRequirements, ...standardCompetencies],
  edges: standardEdges,
};
