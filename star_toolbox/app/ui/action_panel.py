"""右侧扩展功能区：7 个彩色功能按钮 + 右下角黄色快捷键显示区。"""

from __future__ import annotations

from typing import Callable, Dict

import customtkinter as ctk

from ..theme import COLORS, FONTS, hover


class ActionPanel(ctk.CTkFrame):
    """功能按钮区 + 快捷键展示区。

    callbacks 为按钮 key -> 回调函数的映射。
    """

    BUTTONS = [
        ("get_devices", "获取设备列表", "btn_get_devices"),
        ("serial", "打开改串口", "btn_serial"),
        ("single", "单台改机操作", "btn_single"),
        ("loop", "循环处理所有设备", "btn_loop"),
        ("cloud", "打开云控", "btn_cloud"),
        ("install", "安装应用", "btn_install"),
        ("close_usb", "关闭usb调试", "btn_close_usb"),
    ]

    def __init__(self, master, callbacks: Dict[str, Callable[[], None]], **kwargs):
        super().__init__(master, fg_color=COLORS["panel_bg"], corner_radius=8, **kwargs)
        self._callbacks = callbacks

        ctk.CTkLabel(
            self, text="扩展功能", font=FONTS["section"],
            text_color=COLORS["text_primary"], anchor="w",
        ).pack(fill="x", padx=12, pady=(10, 6))

        btn_area = ctk.CTkFrame(self, fg_color="transparent")
        btn_area.pack(fill="x", padx=12)
        for key, label, color_key in self.BUTTONS:
            color = COLORS[color_key]
            ctk.CTkButton(
                btn_area, text=label, font=FONTS["button"], height=44,
                fg_color=color, hover_color=hover(color),
                text_color="#FFFFFF", corner_radius=8,
                command=callbacks.get(key, lambda: None),
            ).pack(fill="x", pady=5)

        # 右下角黄色快捷键区（先 pack 到底部，中间留白自然填充）
        self._shortcut_box = ctk.CTkFrame(
            self, fg_color=COLORS["shortcut_bg"],
            border_color=COLORS["shortcut_border"], border_width=2, corner_radius=8,
        )
        self._shortcut_box.pack(side="bottom", fill="x", padx=12, pady=12)

        ctk.CTkLabel(
            self._shortcut_box, text="⌨ 快捷键", font=FONTS["section"],
            text_color=COLORS["shortcut_text"], anchor="w",
        ).pack(fill="x", padx=10, pady=(8, 2))

        self._hotkey_container = ctk.CTkFrame(self._shortcut_box, fg_color="transparent")
        self._hotkey_container.pack(fill="x", padx=10, pady=(0, 8))

    def set_hotkeys(self, hotkeys: Dict[str, str]) -> None:
        for child in self._hotkey_container.winfo_children():
            child.destroy()
        if not hotkeys:
            ctk.CTkLabel(
                self._hotkey_container, text="(暂无快捷键)", font=FONTS["shortcut"],
                text_color=COLORS["shortcut_text"], anchor="w",
            ).pack(fill="x")
            return
        for key, desc in hotkeys.items():
            row = ctk.CTkFrame(self._hotkey_container, fg_color="transparent")
            row.pack(fill="x", pady=1)
            ctk.CTkLabel(
                row, text=key, font=FONTS["shortcut"], width=80,
                text_color=COLORS["shortcut_text"], anchor="w",
            ).pack(side="left")
            ctk.CTkLabel(
                row, text=desc, font=FONTS["shortcut"],
                text_color=COLORS["shortcut_text"], anchor="w",
            ).pack(side="left")
