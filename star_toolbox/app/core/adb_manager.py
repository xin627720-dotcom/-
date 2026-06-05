"""ADB 设备管理封装。

通过调用系统 adb 可执行文件完成设备扫描、属性读取、命令执行、应用安装等操作。
所有耗时方法本身是同步的（阻塞），由上层用 threading 调用，避免阻塞 UI。
"""

from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class Device:
    """表示一台已连接设备。"""

    serial: str
    state: str = "device"            # device / offline / unauthorized
    model: str = ""
    brand: str = ""
    android: str = ""               # Android 版本
    name: str = ""                  # 设备名（ro.product.name）
    extra: Dict[str, str] = field(default_factory=dict)

    @property
    def online(self) -> bool:
        return self.state == "device"

    @property
    def display_model(self) -> str:
        return self.model or self.name or "未知型号"


class AdbError(Exception):
    """ADB 调用相关异常。"""


class AdbManager:
    """对 adb 命令行的轻量封装。"""

    def __init__(self, adb_path: str = "adb", timeout: int = 30) -> None:
        self.adb_path = adb_path
        self.timeout = timeout

    # -- 基础调用 ----------------------------------------------------------
    def available(self) -> bool:
        """检查 adb 是否可用。"""
        return shutil.which(self.adb_path) is not None

    def _run(self, args: List[str], timeout: Optional[int] = None) -> subprocess.CompletedProcess:
        cmd = [self.adb_path] + args
        try:
            return subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout or self.timeout,
                encoding="utf-8",
                errors="replace",
            )
        except FileNotFoundError as exc:
            raise AdbError(f"找不到 adb 可执行文件：{self.adb_path}") from exc
        except subprocess.TimeoutExpired as exc:
            raise AdbError(f"adb 命令超时：{' '.join(cmd)}") from exc

    # -- 设备发现 ----------------------------------------------------------
    def list_devices(self) -> List[Device]:
        """扫描已连接设备并读取基本属性。"""
        result = self._run(["devices", "-l"])
        devices: List[Device] = []
        for line in result.stdout.splitlines():
            line = line.strip()
            if not line or line.startswith("List of devices"):
                continue
            parts = line.split()
            if len(parts) < 2:
                continue
            serial, state = parts[0], parts[1]
            dev = Device(serial=serial, state=state)
            # devices -l 会附带 model:xxx product:xxx 等
            for token in parts[2:]:
                if ":" in token:
                    key, _, value = token.partition(":")
                    dev.extra[key] = value
            dev.model = dev.extra.get("model", "").replace("_", " ")
            if dev.online:
                self._fill_props(dev)
            devices.append(dev)
        return devices

    def _fill_props(self, dev: Device) -> None:
        """补全设备品牌 / Android 版本 / 设备名等属性。"""
        props = {
            "brand": "ro.product.brand",
            "model": "ro.product.model",
            "android": "ro.build.version.release",
            "name": "ro.product.name",
        }
        for attr, prop in props.items():
            value = self.get_prop(dev.serial, prop)
            if value:
                setattr(dev, attr, value)

    def get_prop(self, serial: str, prop: str) -> str:
        result = self._run(["-s", serial, "shell", "getprop", prop], timeout=10)
        return result.stdout.strip()

    def set_prop(self, serial: str, prop: str, value: str) -> str:
        result = self._run(["-s", serial, "shell", "setprop", prop, value], timeout=10)
        return (result.stdout + result.stderr).strip()

    # -- 通用命令 ----------------------------------------------------------
    def shell(self, serial: str, command: str) -> str:
        """在指定设备上执行 shell 命令，返回标准输出+错误。"""
        result = self._run(["-s", serial, "shell"] + command.split())
        return (result.stdout + result.stderr).strip()

    def raw_command(self, command: str) -> str:
        """执行任意 adb 子命令（用户已去掉前缀 adb）。

        例如 command="shell pm list packages" 或 "-s xxx reboot"。
        """
        command = command.strip()
        if command.lower().startswith("adb"):
            command = command[3:].strip()
        result = self._run(command.split())
        return (result.stdout + result.stderr).strip()

    # -- 应用安装 ----------------------------------------------------------
    def install_apk(self, serial: str, apk_path: str, reinstall: bool = True) -> str:
        args = ["-s", serial, "install"]
        if reinstall:
            args.append("-r")
        args.append(apk_path)
        result = self._run(args, timeout=300)
        return (result.stdout + result.stderr).strip()

    # -- 设备名称修改 ------------------------------------------------------
    def set_device_name(self, serial: str, name: str) -> str:
        """尝试修改设备名（global / system settings，部分机型需要权限）。"""
        outputs = []
        for ns in ("global", "secure", "system"):
            result = self._run(
                ["-s", serial, "shell", "settings", "put", ns, "device_name", name],
                timeout=10,
            )
            out = (result.stdout + result.stderr).strip()
            if out:
                outputs.append(f"[{ns}] {out}")
        return "\n".join(outputs) or "设备名已写入 settings.device_name"

    # -- USB 调试 ----------------------------------------------------------
    def disable_usb_debug(self, serial: str) -> str:
        """关闭 USB 调试（需要相应权限，普通设备可能无效）。"""
        result = self._run(
            ["-s", serial, "shell", "settings", "put", "global", "adb_enabled", "0"],
            timeout=10,
        )
        return (result.stdout + result.stderr).strip() or "已尝试关闭 USB 调试"
