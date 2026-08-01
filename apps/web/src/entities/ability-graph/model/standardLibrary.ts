import type {
  AbilityGraphData,
  AbilityGraphEdge,
  AbilityGraphNode,
} from './abilityGraph';

// 系统内置认证标准库 —— 2024 版工程教育认证标准
// 数据来源：《学院汇报-工程认证推动课程建设.pptx》第 13~23 页原文
// 毕业要求 11 条 + 能力指标 22 个，学校不可修改

export const STANDARD_VERSION = '2024';

// 11 条毕业要求（PPT 原文）
export const standardGraduationRequirements: AbilityGraphNode[] = [
  { id: 'std-gr-01', kind: 'GraduationRequirement', code: 'GR-01', origin: 'standard', name: '工程知识', description: '能够将数学、自然科学、计算、工程基础和专业知识用于解决复杂工程问题。', properties: { sortOrder: 1, standardVersion: STANDARD_VERSION } },
  { id: 'std-gr-02', kind: 'GraduationRequirement', code: 'GR-02', origin: 'standard', name: '问题分析', description: '能够应用数学、自然科学和工程科学的基本原理，识别、表达并通过文献研究分析复杂工程问题，综合考虑可持续发展要求，以获得有效结论。', properties: { sortOrder: 2, standardVersion: STANDARD_VERSION } },
  { id: 'std-gr-03', kind: 'GraduationRequirement', code: 'GR-03', origin: 'standard', name: '设计/开发解决方案', description: '能够设计针对复杂工程问题的解决方案，设计满足特定需求的系统、单元或工艺流程，并能够在设计环节中体现创新思维和考虑健康、安全与环境等因素。', properties: { sortOrder: 3, standardVersion: STANDARD_VERSION } },
  { id: 'std-gr-04', kind: 'GraduationRequirement', code: 'GR-04', origin: 'standard', name: '研究', description: '能够基于科学原理并采用科学方法对复杂工程问题进行研究，包括设计实验、分析与解释数据、并通过信息综合得到合理有效的结论。', properties: { sortOrder: 4, standardVersion: STANDARD_VERSION } },
  { id: 'std-gr-05', kind: 'GraduationRequirement', code: 'GR-05', origin: 'standard', name: '使用现代工具', description: '能够选择与使用恰当的技术、资源、现代工程工具和信息技术工具，对复杂工程问题进行预测与模拟，并能够理解其局限性。', properties: { sortOrder: 5, standardVersion: STANDARD_VERSION } },
  { id: 'std-gr-06', kind: 'GraduationRequirement', code: 'GR-06', origin: 'standard', name: '工程与可持续发展', description: '能够基于工程相关背景知识，分析和评价工程实践活动对健康、安全、环境、法律及经济和社会可持续发展的影响，并理解应承担的责任。', properties: { sortOrder: 6, standardVersion: STANDARD_VERSION } },
  { id: 'std-gr-07', kind: 'GraduationRequirement', code: 'GR-07', origin: 'standard', name: '工程伦理和职业规范', description: '具有人文社会科学素养和社会责任感，恪守并践行工程伦理准则，能够理解并遵守工程职业道德、规范和相关法律法规，自觉履行工程师的社会责任。', properties: { sortOrder: 7, standardVersion: STANDARD_VERSION } },
  { id: 'std-gr-08', kind: 'GraduationRequirement', code: 'GR-08', origin: 'standard', name: '个人与团队', description: '能够在多样化、多学科背景下的团队中独立或合作承担个体、团队成员或负责人的角色，能够与团队成员进行有效、包容地沟通与合作。', properties: { sortOrder: 8, standardVersion: STANDARD_VERSION } },
  { id: 'std-gr-09', kind: 'GraduationRequirement', code: 'GR-09', origin: 'standard', name: '沟通', description: '能够就复杂工程问题以口头、文稿、图表等方式与业界同行及社会公众进行有效沟通和交流，具备跨文化和跨学科背景下沟通交流的能力。', properties: { sortOrder: 9, standardVersion: STANDARD_VERSION } },
  { id: 'std-gr-10', kind: 'GraduationRequirement', code: 'GR-10', origin: 'standard', name: '项目管理', description: '理解并掌握工程管理与经济决策方法，能够在多学科环境下在设计开发解决方案的过程中运用工程管理与经济决策方法。', properties: { sortOrder: 10, standardVersion: STANDARD_VERSION } },
  { id: 'std-gr-11', kind: 'GraduationRequirement', code: 'GR-11', origin: 'standard', name: '终身学习', description: '具有自主学习、终身学习的意识和能力，能够适应技术变革，应对新问题和新挑战，在解决问题过程中形成批判性思维。', properties: { sortOrder: 11, standardVersion: STANDARD_VERSION } },
];

// 22 个能力指标（PPT 原文，每条毕业要求细分 2 个指标点）
export const standardCompetencies: AbilityGraphNode[] = [
  // GR-01 工程知识
  { id: 'std-c-01-01', kind: 'Competency', code: 'C-01-01', origin: 'standard', name: '1.1 工程知识应用', description: '能够运用数学、自然科学、工程基础和专业知识正确表述复杂工程问题，并理解各要素对解决问题的意义和基本方法。', properties: { parent: 'GR-01', level: 2, standardVersion: STANDARD_VERSION } },
  { id: 'std-c-01-02', kind: 'Competency', code: 'C-01-02', origin: 'standard', name: '1.2 问题推演与分析', description: '能够运用工程专业知识和数学分析方法对复杂工程问题进行推演、分析，并对不同解决方案进行比较、综合与改进。', properties: { parent: 'GR-01', level: 2, standardVersion: STANDARD_VERSION } },
  // GR-02 问题分析
  { id: 'std-c-02-01', kind: 'Competency', code: 'C-02-01', origin: 'standard', name: '2.1 问题识别与表达', description: '能够运用数学、自然科学和工程科学的基本原理、基本思维方法正确解析、识别和表达复杂工程问题。', properties: { parent: 'GR-02', level: 2, standardVersion: STANDARD_VERSION } },
  { id: 'std-c-02-02', kind: 'Competency', code: 'C-02-02', origin: 'standard', name: '2.2 文献研究与结论', description: '能够结合工程实际，通过文献研究分析复杂工程问题可能的多种解决方案，综合考虑可持续发展要求，以获得有效结论。', properties: { parent: 'GR-02', level: 2, standardVersion: STANDARD_VERSION } },
  // GR-03 设计/开发解决方案
  { id: 'std-c-03-01', kind: 'Competency', code: 'C-03-01', origin: 'standard', name: '3.1 系统设计方法', description: '掌握针对复杂工程问题的工程设计全周期、全流程的设计/开发方法和技术，能够针对特定需求完成系统、构件或过程的设计，体现创新思维。', properties: { parent: 'GR-03', level: 2, standardVersion: STANDARD_VERSION } },
  { id: 'std-c-03-02', kind: 'Competency', code: 'C-03-02', origin: 'standard', name: '3.2 可行性与影响考量', description: '能够从健康、安全与环境、全生命周期成本与净零碳要求、法律与伦理、社会与文化等角度考虑解决方案的可行性和实现路径。', properties: { parent: 'GR-03', level: 2, standardVersion: STANDARD_VERSION } },
  // GR-04 研究
  { id: 'std-c-04-01', kind: 'Competency', code: 'C-04-01', origin: 'standard', name: '4.1 实验方案设计', description: '能够基于科学原理，通过文献研究或相关方法对复杂工程问题的解决方案进行调研分析、选择研究路线、设计实验或实现方案。', properties: { parent: 'GR-04', level: 2, standardVersion: STANDARD_VERSION } },
  { id: 'std-c-04-02', kind: 'Competency', code: 'C-04-02', origin: 'standard', name: '4.2 数据分析与解释', description: '能够根据实验方案构建实验系统、正确采集数据并安全开展实验，能对实验结果进行分析与解释，并通过信息综合得到合理有效的结论。', properties: { parent: 'GR-04', level: 2, standardVersion: STANDARD_VERSION } },
  // GR-05 使用现代工具
  { id: 'std-c-05-01', kind: 'Competency', code: 'C-05-01', origin: 'standard', name: '5.1 现代工具选择与使用', description: '能够了解解决复杂工程问题常用的主流技术、工具、模拟软件的使用原理和方法，并能够选择与使用恰当的技术、工具和专业模拟软件。', properties: { parent: 'GR-05', level: 2, standardVersion: STANDARD_VERSION } },
  { id: 'std-c-05-02', kind: 'Competency', code: 'C-05-02', origin: 'standard', name: '5.2 工具创造性使用与局限分析', description: '能够通过组合、选配、改进和二次开发等方式创造性地使用现代工具对复杂工程问题进行预测与模拟仿真，并能够分析其局限性。', properties: { parent: 'GR-05', level: 2, standardVersion: STANDARD_VERSION } },
  // GR-06 工程与可持续发展
  { id: 'std-c-06-01', kind: 'Competency', code: 'C-06-01', origin: 'standard', name: '6.1 工程影响评价', description: '在解决复杂工程问题时，能够基于工程相关背景知识，分析和评价工程实践活动对健康、安全、环境、法律及经济和社会可持续发展的影响。', properties: { parent: 'GR-06', level: 2, standardVersion: STANDARD_VERSION } },
  { id: 'std-c-06-02', kind: 'Competency', code: 'C-06-02', origin: 'standard', name: '6.2 责任理解与承担', description: '能够理解健康、安全、环境、法律及经济和社会可持续发展等非技术制约因素对项目实施的影响，并理解工程实践活动中应承担的责任。', properties: { parent: 'GR-06', level: 2, standardVersion: STANDARD_VERSION } },
  // GR-07 工程伦理和职业规范
  { id: 'std-c-07-01', kind: 'Competency', code: 'C-07-01', origin: 'standard', name: '7.1 伦理素养与规范遵守', description: '有正确的价值观和工程报国、为民造福的意识，具有人文社会科学素养和社会责任感，恪守并践行工程伦理准则，能够理解并遵守工程职业道德、规范和相关法律法规。', properties: { parent: 'GR-07', level: 2, standardVersion: STANDARD_VERSION } },
  { id: 'std-c-07-02', kind: 'Competency', code: 'C-07-02', origin: 'standard', name: '7.2 社会责任履行', description: '能够在工程实践活动中自觉履行工程师的社会责任。', properties: { parent: 'GR-07', level: 2, standardVersion: STANDARD_VERSION } },
  // GR-08 个人与团队
  { id: 'std-c-08-01', kind: 'Competency', code: 'C-08-01', origin: 'standard', name: '8.1 团队角色承担', description: '能够在多样化、多学科背景下的团队中独立或合作承担个体、团队成员的角色，能够与团队成员进行有效地、包容性地沟通与合作。', properties: { parent: 'GR-08', level: 2, standardVersion: STANDARD_VERSION } },
  { id: 'std-c-08-02', kind: 'Competency', code: 'C-08-02', origin: 'standard', name: '8.2 团队负责人能力', description: '具备高效的团队沟通协作能力并能够承担团队负责人角色，有效组织、协调和推进团队开展工作。', properties: { parent: 'GR-08', level: 2, standardVersion: STANDARD_VERSION } },
  // GR-09 沟通
  { id: 'std-c-09-01', kind: 'Competency', code: 'C-09-01', origin: 'standard', name: '9.1 专业沟通表达', description: '能够就复杂工程问题以口头、文稿、图表等方式表达观点，与业界同行及社会公众进行有效沟通和交流，能够撰写实验报告、技术文档和总结报告。', properties: { parent: 'GR-09', level: 2, standardVersion: STANDARD_VERSION } },
  { id: 'std-c-09-02', kind: 'Competency', code: 'C-09-02', origin: 'standard', name: '9.2 跨文化沟通', description: '具备在跨文化和跨学科背景下进行沟通和交流的语言和书面表达能力，理解、尊重语言和文化差异。', properties: { parent: 'GR-09', level: 2, standardVersion: STANDARD_VERSION } },
  // GR-10 项目管理
  { id: 'std-c-10-01', kind: 'Competency', code: 'C-10-01', origin: 'standard', name: '10.1 成本与管理方法', description: '理解并掌握与工程项目及产品全周期的成本构成，掌握相关的管理与经济决策方法。', properties: { parent: 'GR-10', level: 2, standardVersion: STANDARD_VERSION } },
  { id: 'std-c-10-02', kind: 'Competency', code: 'C-10-02', origin: 'standard', name: '10.2 多学科环境应用', description: '能够在多学科环境下，在设计开发解决方案的过程中运用工程管理与经济决策方法。', properties: { parent: 'GR-10', level: 2, standardVersion: STANDARD_VERSION } },
  // GR-11 终身学习
  { id: 'std-c-11-01', kind: 'Competency', code: 'C-11-01', origin: 'standard', name: '11.1 学习意识与批判性思维', description: '具有自主学习、终身学习的意识和能力，能够在提出问题、分析问题和解决问题的过程中形成批判性思维。', properties: { parent: 'GR-11', level: 2, standardVersion: STANDARD_VERSION } },
  { id: 'std-c-11-02', kind: 'Competency', code: 'C-11-02', origin: 'standard', name: '11.2 技术变革适应', description: '深刻认知广泛的技术变革对工程和社会的潜在影响，适应新技术变革、应对新问题和新挑战。', properties: { parent: 'GR-11', level: 2, standardVersion: STANDARD_VERSION } },
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
