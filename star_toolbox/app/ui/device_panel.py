"""中间设备列表面板。

以表格形式展示设备序列号、型号、品牌、Android 版本、状态，支持单击选中（含多选）。
"""

from __future__ import annotations

from typing import Callable, List, Optional

import customtkinter as ctk

from ..core.adb_manager import Device
from ..theme import COLORS, FONTS


class DevicePanel(ctk.CTkFrame):
    """可滚动的设备列表，支持选中回调。"""

    COLUMNS = [
        ("serial", "序列号", 150),
        ("model", "型号", 110),
        ("brand", "品牌", 90),
        ("android", "系统", 70),
        ("state", "状态", 70),
    ]

    def __init__(self, master, on_selection_change: Optional[Callable[[List[Device]], None]] = None, **kwargs):
        super().__init__(master, fg_color=COLORS["panel_bg"], corner_radius=8, **kwargs)
        self._on_selection_change = on_selection_change
        self._devices: List[Device] = []
        self._selected: set[str] = set()
        self._rows: dict[str, ctk.CTkFrame] = {}

        header = ctk.CTkLabel(
            self, text="设备列表", font=FONTS["section"],
            text_color=COLORS["text_primary"], anchor="w",
        )
        header.pack(fill="x", padx=12, pady=(10, 4))

        # 列标题
        col_bar = ctk.CTkFrame(self, fg_color=COLORS["device_header"], corner_radius=6, height=32)
        col_bar.pack(fill="x", padx=10, pady=(0, 4))
        col_bar.pack_propagate(False)
        for key, label, width in self.COLUMNS:
            ctk.CTkLabel(
                col_bar, text=label, width=width, font=FONTS["small"],
                text_color=COLORS["text_secondary"], anchor="w",
            ).pack(side="left", padx=(8, 0))

        self._list = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self._list.pack(fill="both", expand=True, padx=10, pady=(0, 4))

        self._empty_label = ctk.CTkLabel(
            self._list, text="暂无设备，点击「获取设备列表」扫描",
            font=FONTS["body"], text_color=COLORS["text_secondary"],
        )
        self._empty_label.pack(pady=30)

        self._count_label = ctk.CTkLabel(
            self, text="共 0 台设备，已选 0 台", font=FONTS["small"],
            text_color=COLORS["text_secondary"], anchor="w",
        )
        self._count_label.pack(fill="x", padx=12, pady=(0, 8))

    # -- 数据更新 ----------------------------------------------------------
    def set_devices(self, devices: List[Device]) -> None:
        self._devices = devices
        # 保留仍存在设备的选中状态
        alive = {d.serial for d in devices}
        self._selected &= alive
        self._render()

    def _render(self) -> None:
        for child in self._list.winfo_children():
            child.destroy()
        self._rows.clear()

        if not self._devices:
            self._empty_label = ctk.CTkLabel(
                self._list, text="暂无设备，点击「获取设备列表」扫描",
                font=FONTS["body"], text_color=COLORS["text_secondary"],
            )
            self._empty_label.pack(pady=30)
            self._update_count()
            return

        for idx, dev in enumerate(self._devices):
            bg = COLORS["device_row"] if idx % 2 == 0 else COLORS["device_row_alt"]
            if dev.serial in self._selected:
                bg = COLORS["device_selected"]
            row = ctk.CTkFrame(self._list, fg_color=bg, corner_radius=6, height=34)
            row.pack(fill="x", pady=2)
            row.pack_propagate(False)
            self._rows[dev.serial] = row

            values = {
                "serial": dev.serial,
                "model": dev.display_model,
                "brand": dev.brand or "-",
                "android": dev.android or "-",
                "state": "在线" if dev.online else dev.state,
            }
            for key, _, width in self.COLUMNS:
                color = COLORS["text_primary"]
                if key == "state":
                    color = COLORS["device_online"] if dev.online else COLORS["device_offline"]
                lbl = ctk.CTkLabel(
                    row, text=values[key], width=width, font=FONTS["small"],
                    text_color=color, anchor="w",
                )
                lbl.pack(side="left", padx=(8, 0))
                lbl.bind("<Button-1>", lambda e, s=dev.serial: self._toggle(s))
            row.bind("<Button-1>", lambda e, s=dev.serial: self._toggle(s))

        self._update_count()

    # -- 选择逻辑 ----------------------------------------------------------
    def _toggle(self, serial: str) -> None:
        if serial in self._selected:
            self._selected.discard(serial)
        else:
            self._selected.add(serial)
        self._render()
        if self._on_selection_change:
            self._on_selection_change(self.selected_devices())

    def select_all(self) -> None:
        self._selected = {d.serial for d in self._devices if d.online}
        self._render()
        if self._on_selection_change:
            self._on_selection_change(self.selected_devices())

    def selected_devices(self) -> List[Device]:
        return [d for d in self._devices if d.serial in self._selected]

    def all_devices(self) -> List[Device]:
        return list(self._devices)

    def _update_count(self) -> None:
        self._count_label.configure(
            text=f"共 {len(self._devices)} 台设备，已选 {len(self._selected)} 台"
        )
