/**
 * 课程矩阵 · 聚合模型。
 *
 * 把"每门课"×"每个流水线阶段"组织成二维矩阵，供 M1 总览渲染。
 * 数据来源：并发拉取每门课的教学资源列表，推导各阶段可达性。
 *
 * 状态语义：
 * - done        已完成（绿色对勾）— 该阶段有产出物
 * - in-progress 可进入（蓝色脉冲）— 前置已完成，可以开始这一步
 * - locked      被锁（灰色锁）— 前置阶段未完成
 * - not-started 未开始（空心圆）— 尚无数据
 * - warning     有异常（琥珀感叹）— 有数据但处理失败
 */

import type { CourseResponse } from '../../../shared/api/coursesClient';
import type { UploadResourceResponse } from '../../../shared/api/resourcesClient';

// ── 类型 ────────────────────────────────────────────────

export type MatrixStageStatus =
  | 'done'
  | 'in-progress'
  | 'locked'
  | 'not-started'
  | 'warning';

export interface CourseStageCell {
  status: MatrixStageStatus;
  /** 主标签（如 "3 份" / "—" / "可进入"） */
  label: string;
  /** hover 提示 */
  hint: string;
  /** 点击后跳转的路由 */
  path: string;
}

export interface CourseMatrixRow {
  course: CourseResponse;
  cells: CourseStageCell[];
}

export interface CourseMatrixData {
  rows: CourseMatrixRow[];
  stages: MatrixStageDef[];
}

export interface MatrixStageDef {
  key: string;
  name: string;
  shortName: string;
  path: string;
  icon: string; // 用于列头展示的图标名（前端映射）
}

// ── 阶段定义（5 列） ────────────────────────────────────

export const MATRIX_STAGES: MatrixStageDef[] = [
  {
    key: 'upload',
    name: '上传材料',
    shortName: 'M3 上传',
    path: '/resources',
    icon: 'upload',
  },
  {
    key: 'graph',
    name: '能力图谱',
    shortName: 'M4 图谱',
    path: '/graph',
    icon: 'graph',
  },
  {
    key: 'recognition',
    name: '识别审核',
    shortName: '识别',
    path: '/recognition',
    icon: 'recognition',
  },
  {
    key: 'diagnostics',
    name: '图谱诊断',
    shortName: 'M5 诊断',
    path: '/diagnostics',
    icon: 'diagnostics',
  },
  {
    key: 'improvement',
    name: '教学改进',
    shortName: 'M6 改进',
    path: '/improvements',
    icon: 'improvement',
  },
];

// ── 聚合逻辑 ────────────────────────────────────────────

interface CourseAggregate {
  materialCount: number;
  readyCount: number;
  failedCount: number;
  hasMaterials: boolean;
  allReady: boolean;
  hasFailure: boolean;
}

function aggregateCourse(resources: UploadResourceResponse[]): CourseAggregate {
  const materialCount = resources.length;
  const readyCount = resources.filter((r) => r.status === 'ready').length;
  const failedCount = resources.filter((r) => r.status === 'failed').length;
  return {
    materialCount,
    readyCount,
    failedCount,
    hasMaterials: materialCount > 0,
    allReady: materialCount > 0 && readyCount === materialCount,
    hasFailure: failedCount > 0,
  };
}

/**
 * 基于课程资源聚合推导 5 个阶段的状态。
 *
 * 推导规则：
 * 1. 上传列：有材料=done/warning，无=not-started
 * 2. 图谱列：材料全部 READY → in-progress（可进入图谱查看）
 * 3. 识别列：同上（图谱推断后才能审核）
 * 4. 诊断列：同上
 * 5. 改进列：有改进措施=done，否则=in-progress（全局，非课程维度）
 */
function buildCells(agg: CourseAggregate): CourseStageCell[] {
  const uploadCell: CourseStageCell = agg.hasMaterials
    ? agg.hasFailure
      ? {
          status: 'warning',
          label: `${agg.materialCount} 份`,
          hint: `共 ${agg.materialCount} 份材料，其中 ${agg.failedCount} 份提取失败`,
          path: '/resources',
        }
      : {
          status: 'done',
          label: `${agg.materialCount} 份`,
          hint: `${agg.materialCount} 份材料全部就绪，可进入下一阶段`,
          path: '/resources',
        }
    : {
        status: 'not-started',
        label: '—',
        hint: '尚未上传材料',
        path: '/resources',
      };

  // 后续阶段：如果上传未完成则 locked
  const isUploadReady = agg.hasMaterials && !agg.hasFailure;

  const graphCell: CourseStageCell = isUploadReady
    ? {
        status: 'in-progress',
        label: '可进入',
        hint: '材料已就绪，可查看 AI 推断的节点与支撑关系',
        path: '/graph',
      }
    : {
        status: 'locked',
        label: '—',
        hint: '需先完成材料上传',
        path: '/graph',
      };

  const recognitionCell: CourseStageCell = isUploadReady
    ? {
        status: 'in-progress',
        label: '可进入',
        hint: '可审核 AI 推断的映射关系',
        path: '/recognition',
      }
    : {
        status: 'locked',
        label: '—',
        hint: '需先完成材料上传',
        path: '/recognition',
      };

  const diagnosticsCell: CourseStageCell = isUploadReady
    ? {
        status: 'in-progress',
        label: '可进入',
        hint: '可查看覆盖缺口与材料一致性诊断',
        path: '/diagnostics',
      }
    : {
        status: 'locked',
        label: '—',
        hint: '需先完成材料上传',
        path: '/diagnostics',
      };

  // 改进阶段：暂时按全局推导（后端无课程维度改进数据）
  const improvementCell: CourseStageCell = isUploadReady
    ? {
        status: 'in-progress',
        label: '可进入',
        hint: '基于诊断结果生成改进建议',
        path: '/improvements',
      }
    : {
        status: 'locked',
        label: '—',
        hint: '需先完成材料上传',
        path: '/improvements',
      };

  return [uploadCell, graphCell, recognitionCell, diagnosticsCell, improvementCell];
}

/**
 * 聚合课程矩阵数据。
 *
 * 对每门课程并发拉取资源列表，推导各阶段状态。
 *
 * @param courses  课程列表（来自 /courses）
 * @param fetchFn  资源拉取函数（注入以便测试）
 */
export async function buildCourseMatrix(
  courses: CourseResponse[],
  fetchFn: (course?: string | null) => Promise<UploadResourceResponse[] | null>,
): Promise<CourseMatrixData> {
  // 并发拉取每门课的材料
  const results = await Promise.all(
    courses.map(async (course) => {
      const resources = await fetchFn(course.name);
      return {
        course,
        resources: resources ?? [],
      };
    }),
  );

  const rows: CourseMatrixRow[] = results.map(({ course, resources }) => {
    const agg = aggregateCourse(resources);
    return {
      course,
      cells: buildCells(agg),
    };
  });

  return {
    rows,
    stages: MATRIX_STAGES,
  };
}
