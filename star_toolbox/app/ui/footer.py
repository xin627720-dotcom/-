"""底部操作栏：刷新设备、添加快捷指令、编辑快捷键。"""

from __future__ import annotations

from typing import Callable, Dict

import customtkinter as ctk

from ..theme import COLORS, FONTS, hover


class Footer(ctk.CTkFrame):
    BUTTONS = [
        ("refresh", "刷新设备", "btn_footer_refresh"),
        ("add_shortcut", "添加快捷指令", "btn_footer_add"),
        ("edit_hotkey", "编辑快捷键", "btn_footer_edit"),
    ]

    def __init__(self, master, callbacks: Dict[str, Callable[[], None]], **kwargs):
        super().__init__(master, fg_color=COLORS["panel_bg"], corner_radius=8, height=58, **kwargs)
        self.pack_propagate(False)
        inner = ctk.CTkFrame(self, fg_color="transparent")
        inner.pack(expand=True)
        for key, label, color_key in self.BUTTONS:
            color = COLORS[color_key]
            ctk.CTkButton(
                inner, text=label, font=FONTS["button"], height=38, width=160,
                fg_color=color, hover_color=hover(color), corner_radius=8,
                command=callbacks.get(key, lambda: None),
            ).pack(side="left", padx=12, pady=10)
