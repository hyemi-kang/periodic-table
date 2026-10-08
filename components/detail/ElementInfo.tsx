"use client";

import { motion, type Variants } from "motion/react";
import { categoryLabel, categoryOf, toCelsius, type ChemElement } from "@/lib/elements";
import { SUBLIMATION } from "@/lib/phase";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.45 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

function fmtDensity(d: number | null) {
  if (d == null) return "—";
  return `${d < 0.01 ? d.toExponential(3) : Number(d.toPrecision(4))} g/cm³`;
}

function fmtTemp(k: number | null) {
  if (k == null) return "—";
  return `${k.toLocaleString(undefined, { maximumFractionDigits: 2 })} K · ${toCelsius(k).toFixed(1)} °C`;
}

export default function ElementInfo({ element }: { element: ChemElement }) {
  // transactinides were never produced in bulk: their physical constants are calculations, not measurements
  const predicted = element.number >= 104;
  const dag = (v: string) => (predicted && v !== "—" ? `${v} †` : v);
  const sublimes = element.symbol in SUBLIMATION;

  const rows: [string, string][] = [
    ["Atomic mass", `${element.mass} u`],
    ["Category", categoryLabel(categoryOf(element))],
    ["Group / Period", `${element.group} / ${element.period}`],
    ["Density", dag(fmtDensity(element.density))],
    [sublimes ? "Melting (under pressure)" : "Melting point", dag(fmtTemp(element.melt))],
    ...(sublimes ? ([["Sublimation (1 atm)", fmtTemp(SUBLIMATION[element.symbol])]] as [string, string][]) : []),
    ["Boiling point", dag(fmtTemp(element.boil))],
    ["Electronegativity", element.electronegativity != null ? `${element.electronegativity} (Pauling)` : "—"],
    ["Shells", element.shells.join(" · ")],
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.p variants={item} className="text-[13px] leading-relaxed text-white/70">
        {element.summary}
      </motion.p>

      <dl className="divide-y divide-white/10 border-y border-white/10">
        {rows.map(([k, v]) => (
          <motion.div key={k} variants={item} className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-white/40">{k}</dt>
            <dd className="text-right font-mono text-[12px] text-white">{v}</dd>
          </motion.div>
        ))}
      </dl>

      <motion.div variants={item}>
        <p className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-white/40">Electron configuration</p>
        <p className="break-words font-mono text-[12px] leading-relaxed text-white">{element.config}</p>
      </motion.div>

      {predicted && (
        <motion.p variants={item} className="text-[11px] leading-relaxed text-white/40">
          † Theoretical estimate — this element has never been produced in bulk, so the value was never measured.
        </motion.p>
      )}

      {element.appearance && (
        <motion.div variants={item}>
          <p className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-white/40">Appearance</p>
          <p className="text-[13px] capitalize text-white/80">{element.appearance}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
