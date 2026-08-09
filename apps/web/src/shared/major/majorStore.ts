/**
 * 专业全局状态管理（纯 TS 模块 + localStorage，参考 courseStore 模式）。
 *
 * 选中的专业 id 持久化到 localStorage，刷新页面后保持。
 * 未选择专业时 id 为 null。
 *
 * 使用方式：
 *   import { getSelectedMajorId, setSelectedMajorId, clearSelectedMajor } from '../shared/major/majorStore';
 *   // 切换专业
 *   setSelectedMajorId('major-cs');
 *   // 读取当前选中
 *   const id = getSelectedMajorId(); // null = 未选择
 */

const MAJOR_KEY = 'ea_selected_major_v0.1';

export type SelectedMajorId = string | null;

export function getSelectedMajorId(): SelectedMajorId {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MAJOR_KEY);
    if (!raw || raw === 'null') return null;
    return raw;
  } catch {
    return null;
  }
}

export function setSelectedMajorId(id: SelectedMajorId): void {
  setSelectedMajorIdInternal(id, /* silent */ false);
}

/**
 * 静默写入选中专业：只更新 localStorage，不派发 major-changed 事件。
 * 用于 useMajorState.loadAndValidate 内部的自动校正（如选中项失效时自动切到第一个、
 * 数据为空时清空），避免派发事件触发自身订阅者又重新加载，形成死循环。
 */
export function setSelectedMajorIdSilent(id: SelectedMajorId): void {
  setSelectedMajorIdInternal(id, /* silent */ true);
}

function setSelectedMajorIdInternal(id: SelectedMajorId, silent: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (id === null) {
      window.localStorage.removeItem(MAJOR_KEY);
    } else {
      window.localStorage.setItem(MAJOR_KEY, id);
    }
    if (!silent) {
      // 派发事件，让监听组件刷新
      window.dispatchEvent(new CustomEvent('major-changed', { detail: id }));
    }
  } catch {
    // 存储不可用时静默降级
  }
}

export function clearSelectedMajor(): void {
  setSelectedMajorId(null);
}

// 订阅专业变化（组件用 useEffect 注册监听）
export function subscribeMajorChange(
  callback: (id: SelectedMajorId) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const ce = e as CustomEvent<SelectedMajorId>;
    callback(ce.detail);
  };
  window.addEventListener('major-changed', handler);
  return () => window.removeEventListener('major-changed', handler);
}
