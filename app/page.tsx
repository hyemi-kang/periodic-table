"use client";

import { useCallback, useState } from "react";
import { AnimatePresence } from "motion/react";
import type { ChemElement } from "@/lib/elements";
import ParticleBackground from "@/components/background/ParticleBackground";
import PeriodicTable from "@/components/table/PeriodicTable";
import type { Origin } from "@/components/table/ElementCell";
import ElementModal from "@/components/detail/ElementModal";

interface Selection {
  element: ChemElement;
  origin: Origin;
}

export default function Home() {
  const [selected, setSelected] = useState<Selection | null>(null);

  const handleSelect = useCallback((element: ChemElement, origin: Origin) => setSelected({ element, origin }), []);
  const handleClose = useCallback(() => setSelected(null), []);

  return (
    <main className="relative min-h-screen bg-black">
      <ParticleBackground />
      <div className="relative z-10 mx-auto max-w-[1560px] px-3 py-5 sm:px-6 sm:py-8">
        <PeriodicTable onSelect={handleSelect} />
        <footer className="mt-4 flex flex-wrap justify-between gap-2 text-[10px] uppercase tracking-[0.16em] text-white/30">
          <span>Element data: Periodic-Table-JSON (Bowserinator) · CC BY-SA 3.0</span>
          <span>Pressure 1 atm · 3D visuals are illustrative</span>
        </footer>
      </div>

      <AnimatePresence>
        {selected && <ElementModal key="modal" element={selected.element} origin={selected.origin} onClose={handleClose} />}
      </AnimatePresence>
    </main>
  );
}
