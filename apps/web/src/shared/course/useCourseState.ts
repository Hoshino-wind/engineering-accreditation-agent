/**
 * React hook：封装课程全局状态 + 课程列表。
 *
 * 所有需要读取当前课程上下文的页面/组件都用这个 hook：
 *   const { selectedCourseId, selectedCourseName, courseList, refetch } = useCourseState();
 *
 * - selectedCourseId：当前选中课程 id，null = 全部课程
 * - selectedCourseName：当前选中课程名，null = 全部课程
 * - courseList：已加载的课程列表（按后端 /courses 返回）
 * - isLoading：课程列表加载中
 *
 * 兼容说明：
 * localStorage 历史版本可能存"课程名（如 单片机基础）"，新版本存"course id"。
 * useCourseState 在解析时，优先按 id 找；找不到再按 name 找；完全找不到则降级为"全部课程"。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchCourses, type CourseResponse } from '../api/coursesClient';
import {
  ALL_COURSES,
  getSelectedCourseId,
  subscribeCourseChange,
  subscribeCourseListChanged,
  type SelectedCourseId,
} from './courseStore';

export interface CourseState {
  selectedCourseId: SelectedCourseId;
  selectedCourseName: string | null; // "全部课程" 用 null；具体课返回课程名
  courseList: CourseResponse[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  findCourseName: (id: SelectedCourseId) => string | null;
}

/** 在 courseList 中找一个课程，rawKey 可能是 course id，也可能是课程名（历史兼容）。 */
function findCourseByKey(
  list: CourseResponse[],
  rawKey: string,
): CourseResponse | null {
  if (!rawKey) return null;
  // 1) 优先按 id 精确匹配（course-ds / course-mcu ...）
  const byId = list.find((x) => x.id === rawKey);
  if (byId) return byId;
  // 2) 按课程名精确匹配（历史 localStorage 存的是中文课程名）
  const byName = list.find((x) => x.name === rawKey);
  if (byName) return byName;
  // 3) 忽略大小写的课程名匹配（容错）
  const lowered = rawKey.trim().toLowerCase();
  const byNameLoose = list.find((x) => x.name.toLowerCase() === lowered);
  return byNameLoose ?? null;
}

export function useCourseState(): CourseState {
  // rawKey 直接读 localStorage 原始值，不经过 ALL_COURSES 语义化
  const [rawKey, setRawKey] = useState<SelectedCourseId>(getSelectedCourseId());
  const [courseList, setCourseList] = useState<CourseResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    const data = await fetchCourses();
    if (data) setCourseList(data);
    setIsLoading(false);
  }, []);

  // 初始加载课程列表
  useEffect(() => {
    void refetch();
  }, [refetch]);

  // 订阅课程切换事件（注意：payload 可能是 course id 或课程名，都交给 findCourseByKey 处理）
  useEffect(() => {
    const unsub = subscribeCourseChange((id) => setRawKey(id));
    return unsub;
  }, []);

  // 订阅课程列表变化事件，收到事件时重新加载课程列表
  useEffect(() => {
    const unsub = subscribeCourseListChanged(() => {
      void refetch();
    });
    return unsub;
  }, [refetch]);

  const findCourseName = useCallback(
    (id: SelectedCourseId): string | null => {
      if (id === ALL_COURSES) return null;
      const c = findCourseByKey(courseList, id);
      return c ? c.name : null;
    },
    [courseList],
  );

  // 基于 rawKey + courseList 推导出真正的 selectedCourse：
  // - rawKey = ALL_COURSES → 全部课程
  // - rawKey 是字符串，但 courseList 还没加载好 → 暂时按 ALL_COURSES 处理（列表加载好会立即重算）
  // - courseList 加载好 → 在里面找，找不到就降级为 ALL_COURSES
  const normalized = useMemo<{ id: SelectedCourseId; name: string | null }>(() => {
    if (rawKey === ALL_COURSES) return { id: ALL_COURSES, name: null };
    if (courseList.length === 0) return { id: ALL_COURSES, name: null };
    const matched = findCourseByKey(courseList, rawKey);
    if (matched) return { id: matched.id, name: matched.name };
    return { id: ALL_COURSES, name: null };
  }, [rawKey, courseList]);

  return {
    selectedCourseId: normalized.id,
    selectedCourseName: normalized.name,
    courseList,
    isLoading,
    refetch,
    findCourseName,
  };
}
