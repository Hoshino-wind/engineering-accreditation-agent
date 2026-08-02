import type { SupportPackageSection } from './supportPackage';

export function createPrototypeOnlySupportPackageSections(
  course: string,
  courseCode: string,
): SupportPackageSection[] {
  const referencePrefix = courseCode.toUpperCase();

  return [
    {
      claims: [
        {
          id: 'claim-graph-path',
          referenceIds: [
            `GRAPH-${referencePrefix}`,
            `EDGE-${referencePrefix}`,
          ],
          text: `${course}已形成从毕业要求指标点到课程目标、实验项目和评分项的正式支撑路径。`,
        },
      ],
      code: '1',
      id: 'ability-graph',
      referenceCount: 12,
      status: 'ready',
      summary:
        '本章节基于能力图谱正式版本和课程目标，说明实验教学各环节与毕业要求指标点的对应关系。',
      title: '能力图谱与课程目标',
    },
    {
      claims: [
        {
          id: 'claim-resource-consistency',
          referenceIds: [
            `RESOURCE-${referencePrefix}`,
            `DIAGNOSIS-${referencePrefix}`,
          ],
          text: '教学大纲、实验指导书和评分规则的关键名称与目标已经完成一致性核验。',
        },
      ],
      code: '2',
      id: 'resources',
      referenceCount: 8,
      status: 'ready',
      summary:
        '本章节固定教学材料版本，并汇总材料一致性诊断及处理结论。',
      title: '教学资源与一致性',
    },
    {
      claims: [
        {
          id: 'claim-attainment',
          referenceIds: [
            `EVAL-${referencePrefix}`,
            `POLICY-${referencePrefix}`,
          ],
          text: '达成度结果使用固定策略、输入快照和程序版本进行确定性计算。',
        },
      ],
      code: '3',
      id: 'attainment',
      referenceCount: 4,
      status: 'ready',
      summary:
        '本章节说明评价范围、确定性计算口径、达成结果和未达标项。',
      title: '达成度评价与分析',
    },
    {
      claims: [
        {
          id: 'claim-improvement',
          referenceIds: [
            `ISSUE-${referencePrefix}`,
            `CHANGE-${referencePrefix}`,
            `REEVAL-${referencePrefix}`,
          ],
          text: '教学改进已经落实为实际对象新版本，并通过后续评价记录效果。',
        },
      ],
      code: '4',
      id: 'improvement',
      referenceCount: 6,
      status: 'ready',
      summary:
        '本章节汇总问题来源、原因、措施、实际教学变更、图谱更新和复评结论。',
      title: '持续改进闭环',
    },
  ];
}
