/**
 * React hook：获取当前专业信息。
 *
 * 专业是认证评判的基本单元。选中状态持久化到 localStorage，
 * 用户可在登录后的专业选择页、顶栏入口或侧边栏专业切换器切换专业。
 *
 * 行为：
 *   - 本地未选中专业（或选中项已失效）时，自动选中列表第一个专业，
 *     而不是返回 null 等待用户选择。
 *   - 提供 reload() 方法，用于添加 / 删除专业后刷新列表。
 *   - 订阅 major-changed 事件：其他组件切换专业后，本实例会同步重新加载，
 *     保证顶栏面包屑等处显示的专业名实时跟随。
 */

import { useCallback, useEffect, useState } from 'react';

import { fetchMajors, type MajorResponse } from '../api/majorsClient';

import {
  clearSelectedMajor,
  getSelectedMajorId,
  setSelectedMajorId,
  setSelectedMajorIdSilent,
  subscribeMajorChange,
  type SelectedMajorId,
} from './majorStore';

export interface MajorState {
  majorName: string;
  schoolName: string;
  major: MajorResponse | null;
  majorList: MajorResponse[];
  isLoading: boolean;
  hasSelectedMajor: boolean;
  setMajorId: (id: SelectedMajorId) => void;
  reload: () => Promise<void>;
}

export function useMajorState(): MajorState {
  const [major, setMajor] = useState<MajorResponse | null>(null);
  const [majorList, setMajorList] = useState<MajorResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载专业列表，并校验当前选中的专业是否仍然有效；
  // 若本地未选中或选中项已失效，自动选中列表第一个专业。
  // 注意：这里的清空 / 自动校正必须使用 silent 版本，否则会派发 major-changed 事件，
  // 触发下方 subscribeMajorChange 订阅者再次调用 loadAndValidate，形成死循环
  // （token 过期时尤其明显：fetchMajors 返回 null → 清空 → 事件 → 再加载 → 再清空…）。
  const loadAndValidate = useCallback(async () => {
    setIsLoading(true);
    const data = await fetchMajors();

    if (!data || data.length === 0) {
      setMajorList([]);
      setMajor(null);
      setSelectedMajorIdSilent(null);
      setIsLoading(false);
      return;
    }

    setMajorList(data);

    // 如果本地已选中某个专业，先校验它是否仍在列表中
    const storedId = getSelectedMajorId();
    const matched = storedId ? data.find((m) => m.id === storedId) : null;

    if (matched) {
      setMajor(matched);
    } else {
      // 本地未选中或选中项已失效，自动选中列表第一个专业
      const first = data[0]!;
      setMajor(first);
      setSelectedMajorIdSilent(first.id);
    }
    setIsLoading(false);
  }, []);

  // 首次加载
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await loadAndValidate();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAndValidate]);

  // 订阅专业变化：其他组件切换专业后，本实例同步重新加载
  // （顶栏面包屑、专业切换器等多处 useMajorState 实例共享同一事件源）
  useEffect(() => {
    const unsub = subscribeMajorChange(() => {
      void loadAndValidate();
    });
    return unsub;
  }, [loadAndValidate]);

  const reload = useCallback(async () => {
    await loadAndValidate();
  }, [loadAndValidate]);

  const handleSetMajorId = useCallback((id: SelectedMajorId) => {
    if (id === null) {
      clearSelectedMajor();
      setMajor(null);
    } else {
      setSelectedMajorId(id);
      // 立即从当前列表中查找并设置，避免等待 reload 的网络往返
      void fetchMajors().then((data) => {
        if (!data) return;
        const matched = data.find((m) => m.id === id) ?? null;
        setMajor(matched);
      });
    }
  }, []);

  return {
    majorName: major?.name ?? '未绑定专业',
    schoolName: major?.schoolName ?? '',
    major,
    majorList,
    isLoading,
    hasSelectedMajor: major !== null,
    setMajorId: handleSetMajorId,
    reload,
  };
}
