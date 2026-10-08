"use client";

import { motion } from "motion/react";
import type { ViewKey } from "@/components/three/ModalScene";

const TABS: { key: ViewKey; label: string }[] = [
  { key: "substance", label: "Substance" },
  { key: "atom", label: "Atom" },
  { key: "structure", label: "Structure" },
];

interface Props {
  view: ViewKey;
  onChange: (v: ViewKey) => void;
  structureAvailable: boolean;
}

export default function ViewTabs({ view, onChange, structureAvailable }: Props) {
  return (
    <div role="tablist" aria-label="View" className="flex gap-1 rounded-full border border-white/15 bg-black/60 p-1 backdrop-blur">
      {TABS.map((t) => {
        const disabled = t.key === "structure" && !structureAvailable;
        const on = view === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={on}
            disabled={disabled}
            title={disabled ? "Structure data unavailable" : undefined}
            onClick={() => onChange(t.key)}
            className="relative rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white/60 transition-colors enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-30 aria-selected:text-black sm:px-4"
          >
            {on && (
              <motion.span
                layoutId="view-pill"
                className="absolute inset-0 rounded-full bg-white"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
