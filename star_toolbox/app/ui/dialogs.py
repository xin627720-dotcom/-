"""各类弹窗：串口控制台、高级设备操作、快捷指令/快捷键编辑。"""

from __future__ import annotations

import threading
import tkinter as tk
from typing import Callable, List, Optional

import customtkinter as ctk

from ..core.adb_manager import AdbManager, Device
from ..core.serial_manager import COMMON_BAUDRATES, SerialManager
from ..theme import COLORS, FONTS, hover


class SerialDialog(ctk.CTkToplevel):
    """串口控制台：扫描端口、设置波特率、收发数据。"""

    def __init__(self, master, serial_mgr: SerialManager, config, logger: Callable[[str, str], None]):
        super().__init__(master)
        self.title("打开改串口 - 串口控制台")
        self.geometry("680x560")
        self.configure(fg_color=COLORS["window_bg"])
        self.serial = serial_mgr
        self.config_mgr = config
        self.logger = logger
        self.transient(master)

        self._build()
        self._refresh_ports()
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    def _build(self) -> None:
        # 顶部：端口 + 波特率 + 连接
        top = ctk.CTkFrame(self, fg_color=COLORS["panel_bg"], corner_radius=8)
        top.pack(fill="x", padx=12, pady=12)

        ctk.CTkLabel(top, text="端口", font=FONTS["body"]).grid(row=0, column=0, padx=8, pady=10)
        self.port_box = ctk.CTkComboBox(top, values=[], width=240, font=FONTS["small"])
        self.port_box.grid(row=0, column=1, padx=4, pady=10)

        ctk.CTkButton(
            top, text="刷新端口", width=80, font=FONTS["small"],
            command=self._refresh_ports,
        ).grid(row=0, column=2, padx=4)

        ctk.CTkLabel(top, text="波特率", font=FONTS["body"]).grid(row=1, column=0, padx=8, pady=10)
        self.baud_box = ctk.CTkComboBox(
            top, values=[str(b) for b in COMMON_BAUDRATES], width=240, font=FONTS["small"],
        )
        self.baud_box.set(str(self.config_mgr.get("serial", "baudrate", default=115200)))
        self.baud_box.grid(row=1, column=1, padx=4, pady=10)

        self.connect_btn = ctk.CTkButton(
            top, text="打开串口", width=80, font=FONTS["button"],
            fg_color=COLORS["btn_serial"], hover_color=hover(COLORS["btn_serial"]),
            command=self._toggle_connection,
        )
        self.connect_btn.grid(row=1, column=2, padx=4)

        # 接收区
        recv_frame = ctk.CTkFrame(self, fg_color=COLORS["panel_bg"], corner_radius=8)
        recv_frame.pack(fill="both", expand=True, padx=12, pady=(0, 12))
        ctk.CTkLabel(recv_frame, text="接收数据", font=FONTS["section"]).pack(anchor="w", padx=10, pady=(8, 2))
        self.recv_text = tk.Text(
            recv_frame, bg=COLORS["log_bg"], fg=COLORS["log_success"],
            font=FONTS["log"], relief="flat", wrap="word", state="disabled",
            padx=8, pady=6,
        )
        self.recv_text.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        # 发送区
        send_frame = ctk.CTkFrame(self, fg_color=COLORS["panel_bg"], corner_radius=8)
        send_frame.pack(fill="x", padx=12, pady=(0, 12))
        self.send_entry = ctk.CTkEntry(
            send_frame, placeholder_text="输入要发送的指令…", font=FONTS["body"],
        )
        self.send_entry.pack(side="left", fill="x", expand=True, padx=(10, 6), pady=10)
        self.send_entry.bind("<Return>", lambda e: self._send())

        self.hex_var = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(send_frame, text="HEX", variable=self.hex_var, width=50, font=FONTS["small"]).pack(side="left")

        ctk.CTkButton(
            send_frame, text="发送", width=80, font=FONTS["button"],
            fg_color=COLORS["btn_get_devices"], hover_color=hover(COLORS["btn_get_devices"]),
            command=self._send,
        ).pack(side="left", padx=10)

    # -- 行为 --------------------------------------------------------------
    def _refresh_ports(self) -> None:
        ports = self.serial.describe_ports()
        if not ports:
            self.port_box.configure(values=["(未检测到端口)"])
            self.port_box.set("(未检测到端口)")
            self.logger("未检测到可用串口", "warning")
        else:
            self.port_box.configure(values=ports)
            last = self.config_mgr.get("serial", "last_port", default="")
            match = next((p for p in ports if p.startswith(last)), ports[0])
            self.port_box.set(match)

    def _toggle_connection(self) -> None:
        if self.serial.is_open:
            self.serial.close()
            self.connect_btn.configure(text="打开串口", fg_color=COLORS["btn_serial"])
            self.logger("串口已关闭", "info")
            return
        raw = self.port_box.get()
        port = raw.split(" - ")[0].strip()
        if not port or port.startswith("("):
            self.logger("请选择有效端口", "warning")
            return
        try:
            baud = int(self.baud_box.get())
        except ValueError:
            self.logger("波特率无效", "warning")
            return
        try:
            self.serial.open(port, baud)
            self.serial.start_reading(self._on_serial_data)
        except Exception as exc:
            self.logger(f"打开串口失败：{exc}", "error")
            return
        self.config_mgr.set(baud, "serial", "baudrate")
        self.config_mgr.set(port, "serial", "last_port")
        self.connect_btn.configure(text="关闭串口", fg_color=COLORS["btn_close_usb"])
        self.logger(f"串口已打开：{port} @ {baud}", "success")

    def _on_serial_data(self, data: bytes) -> None:
        text = data.decode("utf-8", errors="replace")
        self.after(0, self._append_recv, text)

    def _append_recv(self, text: str) -> None:
        self.recv_text.configure(state="normal")
        self.recv_text.insert("end", text)
        self.recv_text.see("end")
        self.recv_text.configure(state="disabled")

    def _send(self) -> None:
        data = self.send_entry.get().strip()
        if not data:
            return
        if not self.serial.is_open:
            self.logger("串口未打开，无法发送", "warning")
            return
        try:
            if self.hex_var.get():
                self.serial.send_hex(data)
            else:
                self.serial.send(data)
            self.logger(f"已发送：{data}", "info")
            self.send_entry.delete(0, "end")
        except Exception as exc:
            self.logger(f"发送失败：{exc}", "error")

    def _on_close(self) -> None:
        self.serial.close()
        self.destroy()


class AdvancedOpDialog(ctk.CTkToplevel):
    """单台改机 / 高级设备操作：自定义命令 + 常用属性修改。"""

    def __init__(self, master, adb: AdbManager, devices: List[Device], logger: Callable[[str, str], None]):
        super().__init__(master)
        self.title("单台改机操作 - 高级设备操作")
        self.geometry("640x540")
        self.configure(fg_color=COLORS["window_bg"])
        self.adb = adb
        self.devices = devices
        self.logger = logger
        self.transient(master)
        self._build()

    def _build(self) -> None:
        # 设备选择
        top = ctk.CTkFrame(self, fg_color=COLORS["panel_bg"], corner_radius=8)
        top.pack(fill="x", padx=12, pady=12)
        ctk.CTkLabel(top, text="目标设备", font=FONTS["body"]).pack(side="left", padx=10, pady=10)
        labels = [f"{d.serial} ({d.display_model})" for d in self.devices] or ["(无设备)"]
        self.device_box = ctk.CTkComboBox(top, values=labels, width=380, font=FONTS["small"])
        self.device_box.set(labels[0])
        self.device_box.pack(side="left", padx=6)

        # 常用属性修改
        prop_frame = ctk.CTkFrame(self, fg_color=COLORS["panel_bg"], corner_radius=8)
        prop_frame.pack(fill="x", padx=12, pady=(0, 12))
        ctk.CTkLabel(prop_frame, text="常用修改", font=FONTS["section"]).grid(
            row=0, column=0, columnspan=3, sticky="w", padx=10, pady=(8, 4))

        ctk.CTkLabel(prop_frame, text="设备名称", font=FONTS["body"]).grid(row=1, column=0, padx=10, pady=6)
        self.name_entry = ctk.CTkEntry(prop_frame, width=300, placeholder_text="新的设备名")
        self.name_entry.grid(row=1, column=1, padx=6, pady=6)
        ctk.CTkButton(
            prop_frame, text="修改", width=70, font=FONTS["small"],
            fg_color=COLORS["btn_single"], hover_color=hover(COLORS["btn_single"]),
            command=self._change_name,
        ).grid(row=1, column=2, padx=6)

        ctk.CTkLabel(prop_frame, text="自定义属性", font=FONTS["body"]).grid(row=2, column=0, padx=10, pady=6)
        self.prop_entry = ctk.CTkEntry(prop_frame, width=180, placeholder_text="prop 名，如 net.hostname")
        self.prop_entry.grid(row=2, column=1, sticky="w", padx=6, pady=6)
        self.prop_value = ctk.CTkEntry(prop_frame, width=110, placeholder_text="值")
        self.prop_value.grid(row=2, column=1, sticky="e", padx=6, pady=6)
        ctk.CTkButton(
            prop_frame, text="setprop", width=70, font=FONTS["small"],
            fg_color=COLORS["btn_single"], hover_color=hover(COLORS["btn_single"]),
            command=self._set_prop,
        ).grid(row=2, column=2, padx=6)

        # 自定义命令
        cmd_frame = ctk.CTkFrame(self, fg_color=COLORS["panel_bg"], corner_radius=8)
        cmd_frame.pack(fill="both", expand=True, padx=12, pady=(0, 12))
        ctk.CTkLabel(cmd_frame, text="自定义 ADB / Shell 命令", font=FONTS["section"]).pack(anchor="w", padx=10, pady=(8, 2))
        ctk.CTkLabel(
            cmd_frame, text="提示：直接输入 adb 子命令（如 shell pm list packages）或完整 adb 命令",
            font=FONTS["small"], text_color=COLORS["text_secondary"],
        ).pack(anchor="w", padx=10)
        self.cmd_entry = ctk.CTkEntry(cmd_frame, font=FONTS["body"], placeholder_text="shell getprop ro.product.model")
        self.cmd_entry.pack(fill="x", padx=10, pady=6)
        self.cmd_entry.bind("<Return>", lambda e: self._run_command())

        run_bar = ctk.CTkFrame(cmd_frame, fg_color="transparent")
        run_bar.pack(fill="x", padx=10)
        ctk.CTkButton(
            run_bar, text="在选中设备执行", font=FONTS["button"],
            fg_color=COLORS["btn_get_devices"], hover_color=hover(COLORS["btn_get_devices"]),
            command=self._run_command,
        ).pack(side="left")

        self.output = tk.Text(
            cmd_frame, bg=COLORS["log_bg"], fg=COLORS["log_default"],
            font=FONTS["log"], relief="flat", wrap="word", state="disabled",
            padx=8, pady=6, height=8,
        )
        self.output.pack(fill="both", expand=True, padx=10, pady=10)

    def _current_serial(self) -> Optional[str]:
        raw = self.device_box.get()
        if raw.startswith("("):
            self.logger("没有可操作的设备", "warning")
            return None
        return raw.split(" ")[0]

    def _append_output(self, text: str) -> None:
        self.output.configure(state="normal")
        self.output.insert("end", text + "\n")
        self.output.see("end")
        self.output.configure(state="disabled")

    def _run_async(self, func, success_msg: str) -> None:
        def worker():
            try:
                result = func()
                self.after(0, self._append_output, result or "(无输出)")
                self.after(0, self.logger, success_msg, "success")
            except Exception as exc:
                self.after(0, self._append_output, f"错误：{exc}")
                self.after(0, self.logger, f"操作失败：{exc}", "error")
        threading.Thread(target=worker, daemon=True).start()

    def _change_name(self) -> None:
        serial = self._current_serial()
        name = self.name_entry.get().strip()
        if not serial or not name:
            self.logger("请填写设备名", "warning")
            return
        self._run_async(lambda: self.adb.set_device_name(serial, name), f"已修改 {serial} 设备名为 {name}")

    def _set_prop(self) -> None:
        serial = self._current_serial()
        prop = self.prop_entry.get().strip()
        value = self.prop_value.get().strip()
        if not serial or not prop:
            self.logger("请填写属性名", "warning")
            return
        self._run_async(lambda: self.adb.set_prop(serial, prop, value), f"已 setprop {prop}={value}")

    def _run_command(self) -> None:
        serial = self._current_serial()
        cmd = self.cmd_entry.get().strip()
        if not serial or not cmd:
            self.logger("请输入命令", "warning")
            return
        self.logger(f"在 {serial} 执行：adb {cmd}", "info")

        def build():
            full = cmd
            if not full.startswith("-s"):
                full = f"-s {serial} {cmd}"
            return self.adb.raw_command(full)

        self._run_async(build, "命令执行完成")


class ShortcutCommandDialog(ctk.CTkToplevel):
    """添加快捷指令。"""

    def __init__(self, master, config, logger, on_saved: Callable[[], None]):
        super().__init__(master)
        self.title("添加快捷指令")
        self.geometry("420x220")
        self.configure(fg_color=COLORS["window_bg"])
        self.config_mgr = config
        self.logger = logger
        self.on_saved = on_saved
        self.transient(master)
        self.grab_set()

        frame = ctk.CTkFrame(self, fg_color=COLORS["panel_bg"], corner_radius=8)
        frame.pack(fill="both", expand=True, padx=14, pady=14)
        ctk.CTkLabel(frame, text="指令名称", font=FONTS["body"]).pack(anchor="w", padx=12, pady=(12, 2))
        self.name_entry = ctk.CTkEntry(frame, font=FONTS["body"])
        self.name_entry.pack(fill="x", padx=12)
        ctk.CTkLabel(frame, text="命令内容", font=FONTS["body"]).pack(anchor="w", padx=12, pady=(10, 2))
        self.cmd_entry = ctk.CTkEntry(frame, font=FONTS["body"], placeholder_text="adb reboot")
        self.cmd_entry.pack(fill="x", padx=12)
        ctk.CTkButton(
            frame, text="保存", font=FONTS["button"],
            fg_color=COLORS["btn_footer_add"], hover_color=hover(COLORS["btn_footer_add"]),
            command=self._save,
        ).pack(pady=16)

    def _save(self) -> None:
        name = self.name_entry.get().strip()
        cmd = self.cmd_entry.get().strip()
        if not name or not cmd:
            self.logger("名称和命令均不能为空", "warning")
            return
        shortcuts = self.config_mgr.get("shortcuts", default={})
        shortcuts[name] = cmd
        self.config_mgr.set(shortcuts, "shortcuts")
        self.logger(f"已添加快捷指令：{name}", "success")
        self.on_saved()
        self.destroy()


class HotkeyEditDialog(ctk.CTkToplevel):
    """编辑右下角显示的快捷键说明。"""

    def __init__(self, master, config, logger, on_saved: Callable[[], None]):
        super().__init__(master)
        self.title("编辑快捷键")
        self.geometry("460x420")
        self.configure(fg_color=COLORS["window_bg"])
        self.config_mgr = config
        self.logger = logger
        self.on_saved = on_saved
        self.transient(master)
        self.grab_set()
        self._entries: dict = {}
        self._build()

    def _build(self) -> None:
        frame = ctk.CTkScrollableFrame(self, fg_color=COLORS["panel_bg"], corner_radius=8)
        frame.pack(fill="both", expand=True, padx=14, pady=14)
        ctk.CTkLabel(frame, text="快捷键 → 说明", font=FONTS["section"]).pack(anchor="w", padx=8, pady=6)

        hotkeys = self.config_mgr.get("hotkeys", default={})
        self._rows_frame = ctk.CTkFrame(frame, fg_color="transparent")
        self._rows_frame.pack(fill="x")
        for key, desc in hotkeys.items():
            self._add_row(key, desc)

        ctk.CTkButton(frame, text="+ 新增一行", font=FONTS["small"], command=lambda: self._add_row("", "")).pack(pady=6)
        ctk.CTkButton(
            self, text="保存", font=FONTS["button"],
            fg_color=COLORS["btn_footer_add"], hover_color=hover(COLORS["btn_footer_add"]),
            command=self._save,
        ).pack(pady=(0, 12))

    def _add_row(self, key: str, desc: str) -> None:
        row = ctk.CTkFrame(self._rows_frame, fg_color="transparent")
        row.pack(fill="x", pady=3)
        ke = ctk.CTkEntry(row, width=130, font=FONTS["small"])
        ke.insert(0, key)
        ke.pack(side="left", padx=4)
        de = ctk.CTkEntry(row, width=240, font=FONTS["small"])
        de.insert(0, desc)
        de.pack(side="left", padx=4)
        self._entries[row] = (ke, de)

    def _save(self) -> None:
        result = {}
        for ke, de in self._entries.values():
            k = ke.get().strip()
            d = de.get().strip()
            if k:
                result[k] = d
        self.config_mgr.set(result, "hotkeys")
        self.logger("快捷键已更新", "success")
        self.on_saved()
        self.destroy()
