"""串口通信封装，基于 pyserial。

提供端口扫描、打开/关闭、发送数据，并支持后台读取线程实时回调收到的数据。
"""

from __future__ import annotations

import threading
import time
from typing import Callable, List, Optional

try:
    import serial
    from serial.tools import list_ports
    _SERIAL_AVAILABLE = True
except ImportError:  # pragma: no cover - 运行环境缺少 pyserial 时降级
    serial = None
    list_ports = None
    _SERIAL_AVAILABLE = False


COMMON_BAUDRATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600]


class SerialError(Exception):
    """串口相关异常。"""


class SerialManager:
    """单连接串口管理器，带后台读取线程。"""

    def __init__(self) -> None:
        self._serial: Optional["serial.Serial"] = None
        self._reader: Optional[threading.Thread] = None
        self._stop = threading.Event()
        self._on_data: Optional[Callable[[bytes], None]] = None

    @staticmethod
    def available() -> bool:
        return _SERIAL_AVAILABLE

    @staticmethod
    def list_ports() -> List[str]:
        if not _SERIAL_AVAILABLE:
            return []
        return [p.device for p in list_ports.comports()]

    @staticmethod
    def describe_ports() -> List[str]:
        """返回 '端口 - 描述' 形式，便于用户辨认。"""
        if not _SERIAL_AVAILABLE:
            return []
        return [f"{p.device} - {p.description}" for p in list_ports.comports()]

    @property
    def is_open(self) -> bool:
        return self._serial is not None and self._serial.is_open

    def open(self, port: str, baudrate: int = 115200, timeout: float = 0.2) -> None:
        if not _SERIAL_AVAILABLE:
            raise SerialError("未安装 pyserial，无法使用串口功能（pip install pyserial）")
        if self.is_open:
            self.close()
        try:
            self._serial = serial.Serial(port=port, baudrate=baudrate, timeout=timeout)
        except Exception as exc:  # serial.SerialException 等
            raise SerialError(f"打开串口失败：{exc}") from exc

    def start_reading(self, on_data: Callable[[bytes], None]) -> None:
        """启动后台读取线程，收到数据时回调 on_data(bytes)。"""
        if not self.is_open:
            raise SerialError("串口未打开")
        self._on_data = on_data
        self._stop.clear()
        self._reader = threading.Thread(target=self._read_loop, daemon=True)
        self._reader.start()

    def _read_loop(self) -> None:
        while not self._stop.is_set() and self.is_open:
            try:
                waiting = self._serial.in_waiting
                if waiting:
                    data = self._serial.read(waiting)
                    if data and self._on_data:
                        self._on_data(data)
                else:
                    time.sleep(0.02)
            except Exception:
                break

    def send(self, data: str, append_newline: bool = True, encoding: str = "utf-8") -> int:
        """发送字符串，返回写入字节数。"""
        if not self.is_open:
            raise SerialError("串口未打开")
        payload = data + ("\r\n" if append_newline else "")
        try:
            return self._serial.write(payload.encode(encoding, errors="replace"))
        except Exception as exc:
            raise SerialError(f"发送失败：{exc}") from exc

    def send_hex(self, hex_str: str) -> int:
        """发送十六进制字符串，如 'A1 B2 C3'。"""
        if not self.is_open:
            raise SerialError("串口未打开")
        cleaned = hex_str.replace(" ", "").replace(",", "")
        try:
            raw = bytes.fromhex(cleaned)
        except ValueError as exc:
            raise SerialError(f"非法的十六进制数据：{hex_str}") from exc
        return self._serial.write(raw)

    def close(self) -> None:
        self._stop.set()
        if self._reader and self._reader.is_alive():
            self._reader.join(timeout=1)
        if self._serial is not None:
            try:
                self._serial.close()
            except Exception:
                pass
        self._serial = None
        self._reader = None
