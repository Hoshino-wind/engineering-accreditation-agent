import type {
  AbilityGraphRelationDefinition,
  AbilityGraphRelationType,
} from './abilityGraphTypes';

function defineRelation(
  definition: Omit<
    AbilityGraphRelationDefinition,
    'sourceTypes' | 'targetTypes'
  >,
): AbilityGraphRelationDefinition {
  return {
    ...definition,
    sourceTypes: Array.from(
      new Set(definition.endpoints.map((endpoint) => endpoint.sourceType)),
    ),
    targetTypes: Array.from(
      new Set(definition.endpoints.map((endpoint) => endpoint.targetType)),
    ),
  };
}

export const abilityGraphRelationDefinitions: AbilityGraphRelationDefinition[] =
  [
    defineRelation({
      relation: 'refines',
      label: '细化毕业要求',
      description: '毕业要求通过指标点细化为可观测、可评价的专业产出。',
      endpoints: [
        {
          sourceType: 'graduate-outcome',
          targetType: 'performance-indicator',
        },
      ],
    }),
    defineRelation({
      relation: 'expects',
      label: '要求能力',
      description: '指标点声明学生应形成的综合能力。',
      endpoints: [
        { sourceType: 'performance-indicator', targetType: 'ability' },
      ],
    }),
    defineRelation({
      relation: 'defines',
      label: '定义课程目标',
      description: '课程正式定义其承诺达成的课程目标。',
      endpoints: [{ sourceType: 'course', targetType: 'course-outcome' }],
    }),
    defineRelation({
      relation: 'belongs-to',
      label: '归属课程',
      description: '实验项目归属于一个正式课程。',
      endpoints: [{ sourceType: 'experiment', targetType: 'course' }],
    }),
    defineRelation({
      relation: 'supports',
      label: '支撑指标点',
      description:
        '课程目标声明其所支撑的指标点，并映射所覆盖能力的可观察行为。',
      endpoints: [
        {
          sourceType: 'course-outcome',
          targetType: 'performance-indicator',
        },
      ],
    }),
    defineRelation({
      relation: 'contributes-to',
      label: '贡献课程目标',
      description:
        '实验项目承担课程目标的培养；评分项声明归集到课程目标的正式路径，权重由 M6 评价策略管理。',
      endpoints: [
        { sourceType: 'experiment', targetType: 'course-outcome' },
        { sourceType: 'rubric-criterion', targetType: 'course-outcome' },
      ],
    }),
    defineRelation({
      relation: 'cultivates',
      label: '培养能力',
      description: '实验项目通过教学活动培养综合能力。',
      endpoints: [{ sourceType: 'experiment', targetType: 'ability' }],
    }),
    defineRelation({
      relation: 'trains',
      label: '训练技能',
      description: '实验项目提供技能练习与表现机会。',
      endpoints: [{ sourceType: 'experiment', targetType: 'skill' }],
    }),
    defineRelation({
      relation: 'covers',
      label: '覆盖知识点',
      description: '实验项目涉及并应用一个知识点。',
      endpoints: [{ sourceType: 'experiment', targetType: 'knowledge' }],
    }),
    defineRelation({
      relation: 'composed-of',
      label: '由技能构成',
      description: '综合能力由一个或多个可观察、可训练的技能构成。',
      endpoints: [{ sourceType: 'ability', targetType: 'skill' }],
    }),
    defineRelation({
      relation: 'requires',
      label: '依赖知识点',
      description: '技能依赖其正确执行所需的知识点。',
      endpoints: [{ sourceType: 'skill', targetType: 'knowledge' }],
    }),
    defineRelation({
      relation: 'uses',
      label: '使用教学资源',
      description: '实验项目使用一个逻辑教学资源。',
      endpoints: [
        { sourceType: 'experiment', targetType: 'teaching-resource' },
      ],
    }),
    defineRelation({
      relation: 'enables',
      label: '资源支持学习',
      description: '教学资源为技能训练或知识学习提供条件。',
      endpoints: [
        { sourceType: 'teaching-resource', targetType: 'skill' },
        { sourceType: 'teaching-resource', targetType: 'knowledge' },
      ],
    }),
    defineRelation({
      relation: 'contains-task',
      label: '包含考核任务',
      description: '实验项目包含一个可产生学生作答或作品的考核任务。',
      endpoints: [
        { sourceType: 'experiment', targetType: 'assessment-task' },
      ],
    }),
    defineRelation({
      relation: 'contains-criterion',
      label: '包含评分项',
      description: '考核任务包含可独立得到分数的 Rubric 评分项。',
      endpoints: [
        {
          sourceType: 'assessment-task',
          targetType: 'rubric-criterion',
        },
      ],
    }),
    defineRelation({
      relation: 'assesses',
      label: '评价能力要素',
      description:
        '评分项只表达实际评价的能力或技能；数值汇总另由贡献课程目标关系表达。',
      endpoints: [
        { sourceType: 'rubric-criterion', targetType: 'ability' },
        { sourceType: 'rubric-criterion', targetType: 'skill' },
      ],
    }),
  ];

const relationDefinitionMap = new Map(
  abilityGraphRelationDefinitions.map((definition) => [
    definition.relation,
    definition,
  ]),
);

export function getAbilityGraphRelationDefinition(
  relation: AbilityGraphRelationType,
) {
  return relationDefinitionMap.get(relation);
}
