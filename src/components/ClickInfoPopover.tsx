"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type PopoverPosition = {
  left: number;
  top: number;
  width: number;
  placement: "above" | "below";
};

export function ClickInfoPopover({
  label,
  description,
  children,
  className = "",
}: {
  label: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const width = Math.min(320, viewportWidth - margin * 2);
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - width / 2, margin),
      viewportWidth - width - margin
    );
    const belowTop = rect.bottom + 8;
    const fitsBelow = belowTop + 152 <= viewportHeight - margin;

    setPosition({
      left,
      top: fitsBelow ? belowTop : Math.max(margin, rect.top - 8),
      width,
      placement: fitsBelow ? "below" : "above",
    });
  }, []);

  const toggleOpen = useCallback(() => {
    if (!open) updatePosition();
    setOpen((current) => !current);
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const handleReposition = () => updatePosition();

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updatePosition]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={className}
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        aria-label={`${label}：点击查看说明`}
        onClick={toggleOpen}
      >
        {children}
      </button>
      {open && position && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              id={popoverId}
              role="dialog"
              aria-label={`${label}说明`}
              className="fixed z-50 rounded-lg bg-white p-3 text-left shadow-[0_14px_38px_rgba(45,52,53,0.16)] ring-1 ring-[#adb3b4]/25"
              style={{
                left: position.left,
                top: position.top,
                width: position.width,
                transform: position.placement === "above" ? "translateY(-100%)" : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-extrabold text-[#202829]">{label}</p>
                <button
                  type="button"
                  className="-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#7f8889] transition hover:bg-[#f2f4f4] hover:text-[#202829] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#45bf78]/35"
                  aria-label="关闭说明"
                  onClick={() => setOpen(false)}
                >
                  <X size={14} />
                </button>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-[#5a6061]">{description}</p>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
