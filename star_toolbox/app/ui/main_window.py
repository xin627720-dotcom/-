"""主窗口：组装标题栏、日志、设备列表、功能区、底部栏，并连接业务逻辑。"""

from __future__ import annotations

import threading
import tkinter as tk
from tkinter import filedialog
from typing import List

import customtkinter as ctk

from ..core.adb_manager import AdbManager, AdbError, Device
from ..core.config_manager import ConfigManager
from ..core.serial_manager import SerialManager
from ..theme import COLORS, FONTS
from .action_panel import ActionPanel
from .device_panel import DevicePanel
from .dialogs import (
    AdvancedOpDialog,
    HotkeyEditDialog,
    SerialDialog,
    ShortcutCommandDialog,
)
from .footer import Footer
from .log_panel import LogPanel


class MainWindow(ctk.CTk):
    def __init__(self) -> None:
        super().__init__()
        self.title("星宇工具箱 V2.0")
        self.geometry("1180x720")
        self.minsize(1024, 640)
        self.configure(fg_color=COLORS["window_bg"])

        ctk.set_appearance_mode("light")

        # 业务对象
        self.config_mgr = ConfigManager()
        self.adb = AdbManager()
        self.serial = SerialManager()

        self._serial_dialog: SerialDialog | None = None

        self._build_layout()
        self._bind_hotkeys()
        self._refresh_hotkey_display()

        # 启动自检
        self._startup_check()

    # ------------------------------------------------------------------ 布局
    def _build_layout(self) -> None:
        # 顶部蓝色标题栏
        title_bar = ctk.CTkFrame(self, fg_color=COLORS["title_bar"], corner_radius=0, height=56)
        title_bar.pack(fill="x")
        title_bar.pack_propagate(False)
        ctk.CTkLabel(
            title_bar, text="星宇工具箱", font=FONTS["title"],
            text_color=COLORS["title_text"],
        ).pack(side="left", padx=24)
        ctk.CTkLabel(
            title_bar, text="版本 V2.0", font=FONTS["version"],
            text_color=COLORS["version_text"],
        ).pack(side="right", padx=24)

        # 底部栏（先于主体 pack 到底部，避免被 expand 的主体挤掉）
        self.footer = Footer(self, {
            "refresh": self.action_get_devices,
            "add_shortcut": self.action_add_shortcut,
            "edit_hotkey": self.action_edit_hotkey,
        })
        self.footer.pack(side="bottom", fill="x", padx=12, pady=(0, 12))

        # 主体：三栏
        body = ctk.CTkFrame(self, fg_color="transparent")
        body.pack(fill="both", expand=True, padx=12, pady=12)
        body.grid_columnconfigure(0, weight=3)   # 日志
        body.grid_columnconfigure(1, weight=4)   # 设备列表
        body.grid_columnconfigure(2, weight=3)   # 功能区
        body.grid_rowconfigure(0, weight=1)

        self.log_panel = LogPanel(body)
        self.log_panel.grid(row=0, column=0, sticky="nsew", padx=(0, 6))

        self.device_panel = DevicePanel(body, on_selection_change=self._on_selection_change)
        self.device_panel.grid(row=0, column=1, sticky="nsew", padx=6)

        callbacks = {
            "get_devices": self.action_get_devices,
            "serial": self.action_open_serial,
            "single": self.action_single_device,
            "loop": self.action_loop_all,
            "cloud": self.action_cloud_control,
            "install": self.action_install_app,
            "close_usb": self.action_close_usb,
        }
        self.action_panel = ActionPanel(body, callbacks)
        self.action_panel.grid(row=0, column=2, sticky="nsew", padx=(6, 0))

    def _bind_hotkeys(self) -> None:
        self.bind("<F5>", lambda e: self.action_get_devices())
        self.bind("<F1>", lambda e: self.action_get_devices())
        self.bind("<Control-l>", lambda e: self.log_panel.clear())

    def _refresh_hotkey_display(self) -> None:
        self.action_panel.set_hotkeys(self.config_mgr.get("hotkeys", default={}))

    # ----------------------------------------------------------- 通用辅助
    def _run_bg(self, func, on_done=None) -> None:
        """在后台线程执行 func，完成后（主线程）调用 on_done(result)。"""
        def worker():
            try:
                result = func()
                if on_done:
                    self.after(0, on_done, result)
            except Exception as exc:  # noqa: BLE001
                self.after(0, self.log_panel.error, f"操作异常：{exc}")
        threading.Thread(target=worker, daemon=True).start()

    def _startup_check(self) -> None:
        if not self.adb.available():
            self.log_panel.warning("未检测到 adb，请确认已安装并加入 PATH")
        else:
            self.log_panel.info("adb 环境正常")
        if not self.serial.available():
            self.log_panel.warning("未安装 pyserial，串口功能不可用")

    def _on_selection_change(self, devices: List[Device]) -> None:
        if devices:
            names = ", ".join(d.serial for d in devices)
            self.log_panel.info(f"已选中 {len(devices)} 台设备：{names}")

    def _require_selection(self) -> List[Device]:
        selected = self.device_panel.selected_devices()
        if not selected:
            self.log_panel.warning("请先在设备列表中选择设备")
        return selected

    # --------------------------------------------------------- 功能：设备
    def action_get_devices(self) -> None:
        self.log_panel.info("正在扫描设备…")
        if not self.adb.available():
            self.log_panel.error("adb 不可用，无法扫描设备")
            return

        def done(devices: List[Device]):
            self.device_panel.set_devices(devices)
            if devices:
                online = sum(1 for d in devices if d.online)
                self.log_panel.success(f"扫描完成：发现 {len(devices)} 台设备（在线 {online}）")
            else:
                self.log_panel.warning("未发现已连接设备")

        self._run_bg(self.adb.list_devices, done)

    def action_install_app(self) -> None:
        selected = self._require_selection()
        if not selected:
            return
        apk = filedialog.askopenfilename(title="选择 APK 文件", filetypes=[("APK", "*.apk")])
        if not apk:
            self.log_panel.info("已取消选择 APK")
            return
        self.log_panel.info(f"开始安装：{apk}")

        def task():
            for dev in selected:
                self.log_panel.info(f"[{dev.serial}] 安装中…")
                out = self.adb.install_apk(dev.serial, apk)
                level = "success" if "Success" in out else "error"
                self.log_panel.log(f"[{dev.serial}] {out}", level)
            return None

        self._run_bg(task)

    def action_single_device(self) -> None:
        devices = self.device_panel.selected_devices() or self.device_panel.all_devices()
        if not devices:
            self.log_panel.warning("没有可操作的设备，请先获取设备列表")
            return
        AdvancedOpDialog(self, self.adb, devices, self.log_panel.log)
        self.log_panel.info("已打开高级设备操作面板")

    def action_close_usb(self) -> None:
        selected = self._require_selection()
        if not selected:
            return

        def task():
            for dev in selected:
                out = self.adb.disable_usb_debug(dev.serial)
                self.log_panel.log(f"[{dev.serial}] {out}", "warning")
            return None

        self.log_panel.warning("正在关闭选中设备的 USB 调试…")
        self._run_bg(task)

    def action_loop_all(self) -> None:
        """循环处理所有设备：依次执行所选快捷指令（基础框架）。"""
        devices = self.device_panel.all_devices()
        if not devices:
            self.log_panel.warning("没有设备可循环处理，请先获取设备列表")
            return
        shortcuts = self.config_mgr.get("shortcuts", default={})
        if not shortcuts:
            self.log_panel.warning("尚未配置快捷指令，可点击「添加快捷指令」")
            return
        # 取第一条快捷指令作为批处理示例
        name, cmd = next(iter(shortcuts.items()))
        self.log_panel.info(f"循环处理 {len(devices)} 台设备，执行快捷指令：{name} -> {cmd}")

        def task():
            for dev in devices:
                if not dev.online:
                    self.log_panel.warning(f"[{dev.serial}] 离线，跳过")
                    continue
                full = cmd
                if full.lower().startswith("adb"):
                    full = full[3:].strip()
                if not full.startswith("-s"):
                    full = f"-s {dev.serial} {full}"
                out = self.adb.raw_command(full)
                self.log_panel.log(f"[{dev.serial}] {out or '(无输出)'}", "normal")
            self.log_panel.success("循环处理完成")
            return None

        self._run_bg(task)

    def action_cloud_control(self) -> None:
        """云控（基础框架，预留扩展）。"""
        self.log_panel.info("云控功能：基础框架已就绪，等待后续接入云控服务")
        self.log_panel.info("可在此扩展：设备投屏 / 远程批量控制 / 任务下发")

    # --------------------------------------------------------- 功能：串口
    def action_open_serial(self) -> None:
        if not self.serial.available():
            self.log_panel.error("未安装 pyserial，无法打开串口（pip install pyserial）")
            return
        if self._serial_dialog is not None and self._serial_dialog.winfo_exists():
            self._serial_dialog.focus()
            return
        self._serial_dialog = SerialDialog(self, self.serial, self.config_mgr, self.log_panel.log)
        self.log_panel.info("已打开串口控制台")

    # ------------------------------------------------------- 功能：底部栏
    def action_add_shortcut(self) -> None:
        ShortcutCommandDialog(self, self.config_mgr, self.log_panel.log, on_saved=lambda: None)

    def action_edit_hotkey(self) -> None:
        HotkeyEditDialog(self, self.config_mgr, self.log_panel.log, on_saved=self._refresh_hotkey_display)

    # ----------------------------------------------------------- 生命周期
    def on_close(self) -> None:
        try:
            self.serial.close()
        finally:
            self.destroy()
