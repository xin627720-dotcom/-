"use client";

import type { ReactNode } from "react";

export type CategoryTabItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

export function CategoryTabBar({
  items,
  value,
  onChange,
  className = "",
}: {
  items: CategoryTabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <section className={`border-y border-[#dfe4e5] py-2 ${className}`}>
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8">
        <CategoryTabStrip items={items} value={value} onChange={onChange} />
      </div>
    </section>
  );
}

export function CategoryTabStrip({
  items,
  value,
  onChange,
  className = "",
}: {
  items: CategoryTabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-2 overflow-x-auto py-1 ${className}`}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm transition ${
            value === item.id
              ? "bg-[#dde4e5] font-semibold text-[#2d3435]"
              : "bg-transparent text-[#5a6061] hover:bg-[#ebeeef] hover:text-[#2d3435]"
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
