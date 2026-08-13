"""JSON 文件持久化基类。

所有仓储的持久化底座：自动将 _store 字典序列化为 JSON，启动时从文件恢复，
每次变更后自动保存（防抖 50ms）。避免每次 add/update 都触发磁盘 IO。
"""

from __future__ import annotations

import json
import threading
from dataclasses import asdict, is_dataclass
from pathlib import Path
from typing import Any, TypeVar

_T = TypeVar("_T")

_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

# 全局写入锁 + 防抖时间戳，避免频繁磁盘 IO
_save_lock = threading.Lock()
_last_save: dict[str, float] = {}
_DEBOUNCE_SECONDS = 0.05


def _ensure_data_dir() -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)


def _file_for(repo_name: str, user_id: str = "template") -> Path:
    _ensure_data_dir()
    return _DATA_DIR / f"{repo_name}_{user_id}.json"


def _serialize_value(obj: Any) -> Any:
    """将 dataclass / enum / tuple 转为 JSON 友好结构。"""
    if obj is None:
        return None
    if isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, tuple):
        return [_serialize_value(v) for v in obj]
    if isinstance(obj, list):
        return [_serialize_value(v) for v in obj]
    if isinstance(obj, dict):
        return {k: _serialize_value(v) for k, v in obj.items()}
    if is_dataclass(obj):
        return {k: _serialize_value(v) for k, v in asdict(obj).items()}
    if hasattr(obj, "value"):
        return obj.value
    return str(obj)


class JsonPersistenceMixin:
    """混入类：给 InMemory*Repository 加自动 JSON 持久化。

    使用方式：
        class InMemoryCourseRepository(JsonPersistenceMixin, ...):
            _repo_name = "courses"
            _entity_class = Course

            def __init__(self, with_seed=True, user_id=None):
                ...
                self._user_id = user_id or "template"
                self._load()   # 从 JSON 恢复

            async def add(self, course):
                ...
                self._schedule_save()  # 变更后调度保存
    """

    _repo_name: str = ""
    _entity_class: type | None = None

    def _load(self) -> None:
        """启动时从 JSON 文件恢复数据到 self._store。"""
        file_path = _file_for(self._repo_name, getattr(self, "_user_id", "template"))
        if not file_path.exists():
            return
        try:
            raw = json.loads(file_path.read_text(encoding="utf-8-sig"))
            store = {}
            for key, data in raw.items():
                entity = self._from_dict(data)
                if entity is not None:
                    store[key] = entity
            self._store = store
        except (UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError) as e:
            import logging
            logging.getLogger(__name__).warning(
                "[PERSIST] 恢复 %s 数据失败: %s", file_path, e
            )

    def _from_dict(self, data: dict) -> Any:
        """子类覆盖：将 dict 反序列化为实体对象。"""
        return data

    def _schedule_save(self) -> None:
        """调度保存（防抖 50ms）。"""
        key = f"{self._repo_name}_{getattr(self, '_user_id', 'template')}"
        with _save_lock:
            # 标记该 key 需要保存
            _last_save[key] = True
        threading.Timer(_DEBOUNCE_SECONDS, self._do_save, args=(key,)).start()

    def _do_save(self, key: str) -> None:
        """实际执行保存。"""
        with _save_lock:
            if not _last_save.get(key):
                return
            # 先清掉标记，若在保存期间又有变更，下次 timer 会再触发
            _last_save[key] = False
        file_path = _file_for(self._repo_name, getattr(self, "_user_id", "template"))
        try:
            data = {k: _serialize_value(v) for k, v in self._store.items()}
            file_path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            import logging
            logging.getLogger(__name__).debug(
                "[PERSIST] 保存 %s 成功: %d 条记录", file_path.name, len(data)
            )
        except Exception:
            import logging
            logging.getLogger(__name__).warning(
                "[PERSIST] 保存 %s 数据失败", file_path, exc_info=True
            )

    def _clear_persisted(self) -> None:
        """清空持久化文件（用于重置）。"""
        file_path = _file_for(self._repo_name, getattr(self, "_user_id", "template"))
        if file_path.exists():
            file_path.unlink()
