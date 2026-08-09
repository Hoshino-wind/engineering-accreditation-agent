/**
 * 课程全局状态管理（纯 TS 模块 + localStorage，参考 authStore 模式）。
 *
 * 选中的课程 id 持久化到 localStorage，刷新页面后保持。
 * 「全部课程」模式用 ALL_COURSES 常量表示，id 为 null。
 *
 * 使用方式：
 *   import { getSelectedCourseId, setSelectedCourseId, ALL_COURSES } from '../shared/course/courseStore';
 *   // 切换课程
 *   setSelectedCourseId('course-mcu');
 *   // 读取当前选中
 *   const id = getSelectedCourseId(); // null = 全部课程
 */

const COURSE_KEY = 'ea_selected_course_v0.1';

// 全部课程模式的标识（id 为 null）
export const ALL_COURSES: null = null;

export type SelectedCourseId = string | null;

export function getSelectedCourseId(): SelectedCourseId {
  if (typeof window === 'undefined') return ALL_COURSES;
  try {
    const raw = window.localStorage.getItem(COURSE_KEY);
    if (!raw || raw === 'all') return ALL_COURSES;
    return raw;
  } catch {
    return ALL_COURSES;
  }
}

export function setSelectedCourseId(id: SelectedCourseId): void {
  if (typeof window === 'undefined') return;
  try {
    if (id === ALL_COURSES) {
      window.localStorage.setItem(COURSE_KEY, 'all');
    } else {
      window.localStorage.setItem(COURSE_KEY, id);
    }
    // 派发事件，让监听组件刷新
    window.dispatchEvent(new CustomEvent('course-changed', { detail: id }));
  } catch {
    // 存储不可用时静默降级
  }
}

// 订阅课程变化（组件用 useEffect 注册监听）
export function subscribeCourseChange(callback: (id: SelectedCourseId) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const ce = e as CustomEvent<SelectedCourseId>;
    callback(ce.detail);
  };
  window.addEventListener('course-changed', handler);
  return () => window.removeEventListener('course-changed', handler);
}

// —— 课程列表变化事件（新增/删除/重命名课程后通知所有订阅方 reload）——

/** 触发课程列表变化事件。所有需要同步课程列表的组件都会收到通知。 */
export function emitCourseListChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('course-list-changed'));
}

/** 订阅课程列表变化事件。返回取消订阅函数。 */
export function subscribeCourseListChanged(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('course-list-changed', handler);
  return () => window.removeEventListener('course-list-changed', handler);
}
