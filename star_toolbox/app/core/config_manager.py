"""配置持久化管理。

将快捷指令、串口默认参数等保存到本地 JSON 文件，启动时自动加载。
"""

from __future__ import annotations

import json
import os
import threading
from typing import Any, Dict


DEFAULT_CONFIG: Dict[str, Any] = {
    "serial": {
        "baudrate": 115200,
        "last_port": "",
    },
    # 快捷指令：name -> command（shell 命令）
    "shortcuts": {
        "重启设备": "adb reboot",
        "显示电量": "adb shell dumpsys battery | grep level",
        "截屏到桌面": "adb exec-out screencap -p > screen.png",
    },
    # 快捷键说明（显示在右下角黄色区域）
    "hotkeys": {
        "F5": "刷新设备",
        "F1": "获取设备列表",
        "Ctrl+L": "清空日志",
    },
}


class ConfigManager:
    """线程安全的简单 JSON 配置管理器。"""

    def __init__(self, path: str | None = None) -> None:
        if path is None:
            base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            path = os.path.join(base, "config.json")
        self.path = path
        self._lock = threading.Lock()
        self.data: Dict[str, Any] = json.loads(json.dumps(DEFAULT_CONFIG))
        self.load()

    def load(self) -> None:
        if not os.path.exists(self.path):
            self.save()
            return
        try:
            with open(self.path, "r", encoding="utf-8") as fh:
                loaded = json.load(fh)
            # 合并默认值，保证新增字段存在
            self.data = self._merge(self.data, loaded)
        except (OSError, json.JSONDecodeError):
            # 配置损坏时回退默认值
            self.data = json.loads(json.dumps(DEFAULT_CONFIG))

    def save(self) -> None:
        with self._lock:
            try:
                with open(self.path, "w", encoding="utf-8") as fh:
                    json.dump(self.data, fh, ensure_ascii=False, indent=2)
            except OSError:
                pass

    # -- 便捷访问 ----------------------------------------------------------
    def get(self, *keys: str, default: Any = None) -> Any:
        node: Any = self.data
        for key in keys:
            if isinstance(node, dict) and key in node:
                node = node[key]
            else:
                return default
        return node

    def set(self, value: Any, *keys: str) -> None:
        node = self.data
        for key in keys[:-1]:
            node = node.setdefault(key, {})
        node[keys[-1]] = value
        self.save()

    @staticmethod
    def _merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
        result = dict(base)
        for key, value in override.items():
            if isinstance(value, dict) and isinstance(result.get(key), dict):
                result[key] = ConfigManager._merge(result[key], value)
            else:
                result[key] = value
        return result
