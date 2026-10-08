"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { categoryLabel, categoryOf, elements, type CategoryKey, type ChemElement } from "@/lib/elements";
import CategoryFilter from "./CategoryFilter";
import ElementCell, { type Origin } from "./ElementCell";

interface Props {
  onSelect: (el: ChemElement, origin: Origin) => void;
}

function CenterPanel({ hovered }: { hovered: ChemElement | null }) {
  return (
    <div className="relative h-full min-h-0">
      <AnimatePresence mode="wait" initial={false}>
        {hovered ? (
          <motion.div
            key={hovered.symbol}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
            className="flex items-end gap-5"
          >
            <span className="text-[clamp(44px,6.5vw,96px)] font-semibold leading-[0.85] tracking-tighter">{hovered.symbol}</span>
            <div className="pb-1">
              <p className="font-mono text-[11px] text-white/45">
                {String(hovered.number).padStart(3, "0")} · {hovered.mass.toFixed(3)} u
              </p>
              <p className="text-[clamp(16px,1.9vw,28px)] font-light leading-tight">{hovered.name}</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">{categoryLabel(categoryOf(hovered))}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="title"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
          >
            <h1 className="text-[clamp(22px,3vw,44px)] font-light leading-[1.05] tracking-tight">
              Periodic Table
              <br />
              <span className="font-semibold">of the Elements</span>
            </h1>
            <p className="mt-3 max-w-md text-[12px] leading-relaxed text-white/45">
              Select an element to explore its matter in 3D, watch it melt and boil, and inspect its atom and structure.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PeriodicTable({ onSelect }: Props) {
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [hovered, setHovered] = useState<ChemElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="overflow-x-auto pb-4">
      <div
        className="mx-auto grid w-full min-w-[880px] max-w-[1500px] gap-[3px] md:gap-1"
        style={{ gridTemplateColumns: "repeat(18, minmax(0, 1fr))", gridTemplateRows: "repeat(7, auto) 14px repeat(2, auto)" }}
      >
        <div className="flex flex-col justify-between gap-4 pl-4 pr-4 sm:pl-8" style={{ gridColumn: "3 / 13", gridRow: "1 / 4" }}>
          <CenterPanel hovered={hovered} />
          <CategoryFilter active={category} onChange={setCategory} />
        </div>

        {elements.map((el) => (
          <ElementCell
            key={el.number}
            el={el}
            dimmed={category !== null && categoryOf(el) !== category}
            ready={ready}
            onSelect={onSelect}
            onHover={setHovered}
          />
        ))}

        {/* f-block placeholders in the main body */}
        {[
          { row: 6, label: "57–71" },
          { row: 7, label: "89–103" },
        ].map((p) => (
          <div
            key={p.row}
            aria-hidden
            style={{ gridColumn: 3, gridRow: p.row }}
            className="flex aspect-[1/1.1] w-full items-center justify-center rounded-[3px] border border-dashed border-white/20 font-mono text-[clamp(7px,0.75vw,11px)] text-white/35"
          >
            {p.label}
          </div>
        ))}
      </div>
    </div>
  );
}
