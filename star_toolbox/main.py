"""星宇工具箱 V2.0 — 程序入口。

Android 设备管理 + USB 串口通信工具，基于 customtkinter 构建。

运行：
    python main.py
"""

from __future__ import annotations

import sys


def main() -> int:
    try:
        import customtkinter  # noqa: F401
    except ImportError:
        print("缺少依赖 customtkinter，请先运行：pip install -r requirements.txt")
        return 1

    from app.ui.main_window import MainWindow

    app = MainWindow()
    app.protocol("WM_DELETE_WINDOW", app.on_close)
    app.mainloop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
