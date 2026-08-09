/**
 * 课程矩阵组件。
 *
 * 在 M1 总览中展示"每门课 × 每个流水线阶段"的二维进度矩阵。
 * 专业负责人一眼能看出哪门课走到哪一步了、哪门课卡住了。
 */

import {
  CheckCircleFilled,
  CloudUploadOutlined,
  ApartmentOutlined,
  SolutionOutlined,
  FileSearchOutlined,
  ToolOutlined,
  LockOutlined,
  MinusOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Spin, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { fetchCourses } from '../../../shared/api/coursesClient';
import { fetchResources } from '../../../shared/api/resourcesClient';
import { setSelectedCourseId } from '../../../shared/course/courseStore';
import {
  buildCourseMatrix,
  type CourseMatrixData,
  type MatrixStageStatus,
} from '../model/courseMatrix';

import './courseMatrix.css';

// 状态 → 图标映射
const STATUS_ICON: Record<MatrixStageStatus, React.ReactNode> = {
  done: <CheckCircleFilled />,
  'in-progress': <span className="matrix-pulse-dot" />,
  locked: <LockOutlined />,
  'not-started': <MinusOutlined />,
  warning: <ExclamationCircleOutlined />,
};

// 列头图标
const STAGE_ICONS: Record<string, React.ReactNode> = {
  upload: <CloudUploadOutlined />,
  graph: <ApartmentOutlined />,
  recognition: <SolutionOutlined />,
  diagnostics: <FileSearchOutlined />,
  improvement: <ToolOutlined />,
};

export function CourseMatrix() {
  const navigate = useNavigate();
  const [data, setData] = useState<CourseMatrixData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const courses = await fetchCourses();
      if (cancelled || !courses || courses.length === 0) {
        setLoading(false);
        return;
      }
      const matrix = await buildCourseMatrix(courses, fetchResources);
      if (cancelled) return;
      setData(matrix);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 点击格子：切换课程 + 跳转
  const handleCellClick = (courseId: string, path: string) => {
    setSelectedCourseId(courseId);
    void navigate(path);
  };

  if (loading) {
    return (
      <div className="course-matrix-loading">
        <Spin tip="正在加载课程矩阵…" />
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="course-matrix-empty">
        暂无课程数据，请先在后台配置课程。
      </div>
    );
  }

  return (
    <div className="course-matrix-wrapper">
      {/* 矩阵说明条 */}
      <div className="course-matrix-legend">
        <span className="matrix-legend-title">图例</span>
        <span className="matrix-legend-item">
          <CheckCircleFilled style={{ color: '#52c41a' }} /> 已完成
        </span>
        <span className="matrix-legend-item">
          <span className="matrix-pulse-dot" /> 可进入
        </span>
        <span className="matrix-legend-item">
          <ExclamationCircleOutlined style={{ color: '#b08d57' }} /> 有异常
        </span>
        <span className="matrix-legend-item">
          <LockOutlined style={{ color: '#8a8a8a' }} /> 锁定
        </span>
        <span className="matrix-legend-item">
          <MinusOutlined style={{ color: '#8a8a8a' }} /> 未开始
        </span>
      </div>

      {/* 矩阵表格 */}
      <div className="course-matrix-table-scroll">
        <table className="course-matrix-table">
          <thead>
            <tr>
              <th className="matrix-col-course" rowSpan={2}>课程</th>
              {data.stages.map((stage) => (
                <th key={stage.key} className="matrix-col-stage">
                  <div className="matrix-stage-icon">
                    {STAGE_ICONS[stage.icon]}
                  </div>
                  <div className="matrix-stage-name">{stage.name}</div>
                  <div className="matrix-stage-short">{stage.shortName}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.course.id} className="matrix-row">
                <td className="matrix-cell-course">
                  <div className="matrix-course-name">{row.course.name}</div>
                  {row.course.code && (
                    <div className="matrix-course-code">{row.course.code}</div>
                  )}
                </td>
                {row.cells.map((cell, idx) => (
                  <td
                    key={idx}
                    className={`matrix-cell matrix-cell--${cell.status}`}
                    onClick={() =>
                      cell.status !== 'locked' &&
                      handleCellClick(row.course.id, cell.path)
                    }
                  >
                    <Tooltip title={cell.hint} placement="top">
                      <div className="matrix-cell-content">
                        <span className="matrix-cell-icon">
                          {STATUS_ICON[cell.status]}
                        </span>
                        <span className="matrix-cell-label">{cell.label}</span>
                      </div>
                    </Tooltip>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 底部统计 */}
      <div className="course-matrix-footer">
        共 {data.rows.length} 门课程 ·{' '}
        {data.rows.filter((r) => r.cells[0]?.status === 'done').length} 门已上传材料 ·{' '}
        {data.rows.filter((r) => r.cells[0]?.status === 'warning').length} 门有异常 ·{' '}
        {data.rows.filter((r) => r.cells[0]?.status === 'not-started').length} 门未开始
      </div>
    </div>
  );
}
