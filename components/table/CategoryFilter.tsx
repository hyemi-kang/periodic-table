"use client";

import { motion } from "motion/react";
import { CATEGORIES, type CategoryKey } from "@/lib/elements";

interface Props {
  active: CategoryKey | null;
  onChange: (key: CategoryKey | null) => void;
}

export default function CategoryFilter({ active, onChange }: Props) {
  return (
    <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-x-1 gap-y-1">
      {CATEGORIES.map((c) => {
        const on = active === c.key;
        return (
          <button
            key={c.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? null : c.key)}
            className="relative rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/55 transition-colors hover:text-white aria-pressed:text-black sm:text-[11px]"
          >
            {on && (
              <motion.span
                layoutId="category-pill"
                className="absolute inset-0 rounded-full bg-white"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: on ? "#000" : `oklch(0.75 0.08 ${c.hue})` }}
              />
              {c.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
