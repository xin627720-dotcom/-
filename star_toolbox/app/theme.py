"""集中管理界面配色与字体，方便统一调整视觉风格。

颜色取自附图：蓝色标题栏、黑色日志区、彩色功能按钮、黄色快捷键区。
"""

# ---------------------------------------------------------------------------
# 主题色板
# ---------------------------------------------------------------------------
COLORS = {
    # 标题栏
    "title_bar": "#1E6FD9",        # 顶部蓝色标题栏
    "title_text": "#FFFFFF",
    "version_text": "#D6E6FF",

    # 整体背景
    "window_bg": "#F0F2F5",
    "panel_bg": "#FFFFFF",
    "panel_border": "#D9DEE6",

    # 左侧日志区（黑底）
    "log_bg": "#0F1116",
    "log_default": "#E6E6E6",      # 普通文字
    "log_info": "#4DA6FF",         # 信息（蓝色）
    "log_success": "#3DDC84",      # 成功（绿色）
    "log_warning": "#FFC857",      # 警告（黄色）
    "log_error": "#FF5C5C",        # 错误（红色）

    # 中间设备列表
    "device_header": "#EAF1FB",
    "device_row": "#FFFFFF",
    "device_row_alt": "#F5F8FC",
    "device_selected": "#CFE2FF",
    "device_online": "#3DDC84",
    "device_offline": "#FF5C5C",

    # 右侧功能按钮（按图配色）
    "btn_get_devices": "#2D8CFF",      # 获取设备列表 - 蓝
    "btn_serial": "#00B894",           # 打开改串口 - 青绿
    "btn_single": "#6C5CE7",           # 单台改机操作 - 紫
    "btn_loop": "#0984E3",             # 循环处理所有设备 - 深蓝
    "btn_cloud": "#00CEC9",            # 打开云控 - 青
    "btn_install": "#E17055",          # 安装应用 - 橙
    "btn_close_usb": "#D63031",        # 关闭usb调试 - 红
    "btn_hover_overlay": "#000000",    # hover 时叠加（靠 customtkinter 自动）

    # 底部按钮
    "btn_footer_refresh": "#2D8CFF",
    "btn_footer_add": "#00B894",
    "btn_footer_edit": "#636E72",

    # 快捷键区域（黄色）
    "shortcut_bg": "#FFF4CC",
    "shortcut_border": "#F0C040",
    "shortcut_text": "#7A5C00",

    "text_primary": "#2D3436",
    "text_secondary": "#636E72",
}

# ---------------------------------------------------------------------------
# 字体
# ---------------------------------------------------------------------------
FONTS = {
    "title": ("Microsoft YaHei UI", 20, "bold"),
    "version": ("Microsoft YaHei UI", 12),
    "section": ("Microsoft YaHei UI", 13, "bold"),
    "button": ("Microsoft YaHei UI", 13, "bold"),
    "body": ("Microsoft YaHei UI", 12),
    "small": ("Microsoft YaHei UI", 11),
    "log": ("Consolas", 11),
    "shortcut": ("Consolas", 11),
}


def hover(color: str, factor: float = 0.85) -> str:
    """根据基础色生成较深的 hover 色。"""
    color = color.lstrip("#")
    r, g, b = (int(color[i:i + 2], 16) for i in (0, 2, 4))
    r, g, b = (max(0, int(c * factor)) for c in (r, g, b))
    return f"#{r:02X}{g:02X}{b:02X}"
