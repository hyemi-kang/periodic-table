"use client";

import { memo, type MouseEvent } from "react";
import { motion } from "motion/react";
import { categoryHue, categoryOf, type ChemElement } from "@/lib/elements";

export interface Origin {
  x: number;
  y: number;
}

interface Props {
  el: ChemElement;
  dimmed: boolean;
  /** true once the intro stagger has played, so later dim/undim animations are instant-ish */
  ready: boolean;
  onSelect: (el: ChemElement, origin: Origin) => void;
  onHover: (el: ChemElement | null) => void;
}

function ElementCellBase({ el, dimmed, ready, onSelect, onHover }: Props) {
  const hue = categoryHue(categoryOf(el));
  const delay = ready ? 0 : (el.xpos + el.ypos) * 0.022;

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onSelect(el, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  };

  return (
    <motion.button
      type="button"
      aria-label={`${el.name}, atomic number ${el.number}`}
      onClick={handleClick}
      onMouseEnter={() => onHover(el)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(el)}
      onBlur={() => onHover(null)}
      style={{
        gridColumn: el.xpos,
        gridRow: el.ypos,
        background: `oklch(0.2 0.02 ${hue})`,
        borderColor: `oklch(0.6 0.04 ${hue} / 0.35)`,
      }}
      initial={{ opacity: 0, y: 14, scale: 0.88 }}
      animate={{ opacity: dimmed ? 0.12 : 1, y: 0, scale: 1 }}
      transition={{ duration: ready ? 0.3 : 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      whileHover={{ scale: 1.16, zIndex: 30, borderColor: "#ffffff", backgroundColor: "#000000", transition: { duration: 0.18, delay: 0 } }}
      whileTap={{ scale: 0.97 }}
      className="group relative flex aspect-[1/1.1] w-full cursor-pointer flex-col items-center justify-center rounded-[3px] border text-white will-change-transform"
    >
      <span className="absolute left-[7%] top-[5%] font-mono text-[clamp(7px,0.75vw,11px)] leading-none text-white/60">{el.number}</span>
      <span className="text-[clamp(13px,1.7vw,26px)] font-semibold leading-none tracking-tight">{el.symbol}</span>
      <span className="mt-[3%] hidden max-w-full truncate px-0.5 text-[clamp(6px,0.62vw,9px)] leading-none text-white/55 sm:block">{el.name}</span>
      <span className="absolute bottom-[5%] hidden font-mono text-[clamp(6px,0.58vw,8.5px)] leading-none text-white/35 md:block">
        {el.mass.toFixed(el.mass >= 100 ? 1 : 2)}
      </span>
    </motion.button>
  );
}

export default memo(ElementCellBase);
