"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { categoryLabel, categoryOf, type ChemElement } from "@/lib/elements";
import { buildPhaseModel, phaseAt } from "@/lib/phase";
import { materialFor } from "@/lib/materials";
import { spacingFactor } from "@/lib/physics";
import { structuresFor } from "@/lib/structures";
import type { Origin } from "@/components/table/ElementCell";
import type { ViewKey } from "@/components/three/ModalScene";
import ElementInfo from "./ElementInfo";
import PhaseControl from "./PhaseControl";
import ViewTabs from "./ViewTabs";

// WebGL is client-only; load it lazily so the table renders instantly.
const ModalScene = dynamic(() => import("@/components/three/ModalScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-[11px] uppercase tracking-[0.2em] text-white/35">Loading 3D…</div>
  ),
});

const EASE = [0.65, 0, 0.35, 1] as const;

interface Props {
  element: ChemElement;
  origin: Origin;
  onClose: () => void;
}

export default function ElementModal({ element, origin, onClose }: Props) {
  const [view, setView] = useState<ViewKey>("substance");
  const [rawTemp, setTemp] = useState(298);
  const [pressure, setPressure] = useState(1);
  const [structureIdx, setStructureIdx] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  const model = useMemo(() => buildPhaseModel(element, pressure), [element, pressure]);
  // each element has its own slider range, so keep the temperature inside it (e.g. He tops out at a few kelvin)
  const temp = Math.min(rawTemp, model.tMax);
  const phase = phaseAt(model, temp);
  // the structure tab always shows the standard state (298 K, 1 atm); temperature and pressure are controlled in the Substance tab
  const structures = useMemo(() => structuresFor(element.symbol, element.name, 298), [element]);
  const structure = structures ? structures[Math.min(structureIdx, structures.length - 1)] : null;
  const hasStructure = structures !== null;

  // most gases are colourless: the coloured glow is their discharge-tube emission, not their natural colour
  const spec = useMemo(() => materialFor(element), [element]);
  const naturallyColoured = ["F", "Cl", "Br", "I"].includes(element.symbol);
  const gasNote =
    view === "substance" && phase === "gas" && !naturallyColoured
      ? `The gas itself is colourless or nearly so — the ${spec.glow ? "glow" : "colour"} shown is ${spec.glow ? "its emission colour in a discharge tube" : "an artistic stand-in"}.`
      : null;
  const spacing = spacingFactor(phase, temp, pressure);

  // radius that fully covers the viewport from the clicked cell
  const radius = useMemo(() => {
    const w = typeof window === "undefined" ? 1600 : window.innerWidth;
    const h = typeof window === "undefined" ? 1000 : window.innerHeight;
    return Math.hypot(Math.max(origin.x, w - origin.x), Math.max(origin.y, h - origin.y)) + 24;
  }, [origin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const at = (r: number) => `circle(${r}px at ${origin.x}px ${origin.y}px)`;
  const reveal = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  });

  const neutrons = Math.max(0, Math.round(element.mass) - element.number);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${element.name} details`}
      className="fixed inset-0 z-50 overflow-y-auto bg-black text-white lg:overflow-hidden"
      initial={{ clipPath: at(0) }}
      animate={{ clipPath: at(radius) }}
      exit={{ clipPath: at(0) }}
      transition={{ duration: 0.75, ease: EASE }}
    >
      <div className="grid min-h-full grid-cols-1 lg:h-full lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* left column: 3D stage on top, controls underneath (never overlapping the scene) */}
        <section className="flex min-h-0 flex-col lg:h-full">
          <div className="relative h-[52vh] min-h-[340px] flex-1">
            <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.6 }}>
              <ModalScene
                key={view}
                element={element}
                view={view}
                phase={phase}
                temp={temp}
                pressure={pressure}
                structure={structure}
              />
            </motion.div>

            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <motion.div {...reveal(0.35)} className="pointer-events-none">
                  <p className="font-mono text-[11px] tracking-[0.2em] text-white/45">{String(element.number).padStart(3, "0")}</p>
                  <h2 className="text-[clamp(56px,9vw,128px)] font-semibold leading-[0.85] tracking-tighter">{element.symbol}</h2>
                  <p className="mt-2 text-[clamp(16px,1.8vw,24px)] font-light">{element.name}</p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">{categoryLabel(categoryOf(element))}</p>
                </motion.div>

                <motion.div {...reveal(0.45)} className="pointer-events-auto flex flex-col items-end gap-3">
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={onClose}
                    className="group flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/80 backdrop-blur transition-colors hover:border-white hover:text-white"
                  >
                    Close
                    <kbd className="rounded border border-white/20 px-1 font-mono text-[9px] text-white/45">Esc</kbd>
                  </button>
                  <ViewTabs view={view} onChange={setView} structureAvailable={hasStructure} />
                </motion.div>
              </div>

              <p className="hidden self-end text-[10px] uppercase tracking-[0.18em] text-white/30 sm:block">
                Drag to rotate · Scroll to zoom · Right-drag to pan
              </p>
            </div>
          </div>

          <motion.div {...reveal(0.55)} className="border-t border-white/10 px-5 py-4 sm:px-8">
            {view === "substance" && (
              <PhaseControl
                model={model}
                temp={temp}
                pressure={pressure}
                spacing={spacing}
                onTemp={setTemp}
                onPressure={setPressure}
                extraNote={gasNote}
              />
            )}
            {view === "atom" && (
              <p className="max-w-xl text-[12px] leading-relaxed text-white/70">
                Bohr-style model of {element.name}: <span className="text-white">{element.number}</span> protons (white),{" "}
                <span className="text-white">≈{neutrons}</span> neutrons (grey) and electrons in shells{" "}
                <span className="font-mono text-white">{element.shells.join("·")}</span>. The neutron count is estimated from the average
                atomic mass, not from a single isotope.
              </p>
            )}
            {view === "structure" && structure && (
              <div className="space-y-2">
                {structures && structures.length > 1 && (
                  <div className="flex gap-1">
                    {structures.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStructureIdx(i)}
                        aria-pressed={i === structureIdx}
                        className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-white/60 transition-colors hover:text-white aria-pressed:bg-white aria-pressed:text-black"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
                <p className="max-w-xl text-[12px] leading-relaxed text-white/70">{structure.caption}</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">Shown at standard conditions · 298 K · 1 atm</p>
              </div>
            )}
          </motion.div>
        </section>

        {/* data panel */}
        <aside className="border-t border-white/10 p-5 sm:p-8 lg:overflow-y-auto lg:border-l lg:border-t-0">
          <ElementInfo element={element} />
        </aside>
      </div>
    </motion.div>
  );
}
