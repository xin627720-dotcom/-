"""左侧操作日志面板（黑底彩色文字）。

支持 info(蓝) / success(绿) / warning(黄) / error(红) / normal 五种级别。
线程安全：log() 内部用 after() 切回主线程更新 UI。
"""

from __future__ import annotations

import datetime
import tkinter as tk

import customtkinter as ctk

from ..theme import COLORS, FONTS


class LogPanel(ctk.CTkFrame):
    """带颜色分级的滚动日志区域。"""

    LEVEL_COLORS = {
        "normal": COLORS["log_default"],
        "info": COLORS["log_info"],
        "success": COLORS["log_success"],
        "warning": COLORS["log_warning"],
        "error": COLORS["log_error"],
    }

    def __init__(self, master, **kwargs):
        super().__init__(master, fg_color=COLORS["panel_bg"], corner_radius=8, **kwargs)

        header = ctk.CTkLabel(
            self, text="操作日志", font=FONTS["section"],
            text_color=COLORS["text_primary"], anchor="w",
        )
        header.pack(fill="x", padx=12, pady=(10, 4))

        # 用原生 tk.Text 以便实现多色标签
        self._text = tk.Text(
            self,
            bg=COLORS["log_bg"],
            fg=COLORS["log_default"],
            insertbackground=COLORS["log_default"],
            font=FONTS["log"],
            relief="flat",
            borderwidth=0,
            wrap="word",
            padx=10,
            pady=8,
            state="disabled",
        )
        self._text.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        scrollbar = ctk.CTkScrollbar(self._text, command=self._text.yview)
        scrollbar.pack(side="right", fill="y")
        self._text.configure(yscrollcommand=scrollbar.set)

        for level, color in self.LEVEL_COLORS.items():
            self._text.tag_configure(level, foreground=color)
        self._text.tag_configure("time", foreground=COLORS["text_secondary"])

        self.log("星宇工具箱 V2.0 已启动", "success")

    # -- 公共接口 ----------------------------------------------------------
    def log(self, message: str, level: str = "normal") -> None:
        """写入一条日志（可在任意线程调用）。"""
        self.after(0, self._append, message, level)

    def info(self, message: str) -> None:
        self.log(message, "info")

    def success(self, message: str) -> None:
        self.log(message, "success")

    def warning(self, message: str) -> None:
        self.log(message, "warning")

    def error(self, message: str) -> None:
        self.log(message, "error")

    def clear(self) -> None:
        self.after(0, self._clear)

    # -- 内部实现（主线程） ------------------------------------------------
    def _append(self, message: str, level: str) -> None:
        timestamp = datetime.datetime.now().strftime("[%H:%M:%S] ")
        self._text.configure(state="normal")
        self._text.insert("end", timestamp, ("time",))
        self._text.insert("end", message + "\n", (level,))
        self._text.see("end")
        self._text.configure(state="disabled")

    def _clear(self) -> None:
        self._text.configure(state="normal")
        self._text.delete("1.0", "end")
        self._text.configure(state="disabled")
        self.log("日志已清空", "info")
