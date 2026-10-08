"use client";

import type { ChemElement } from "@/lib/elements";
import type { Phase } from "@/lib/phase";
import type { Structure } from "@/lib/structures";
import AtomView from "./AtomView";
import SceneCanvas from "./SceneCanvas";
import StructureView from "./StructureView";
import SubstanceView from "./SubstanceView";

export type ViewKey = "substance" | "atom" | "structure";

interface Props {
  element: ChemElement;
  view: ViewKey;
  phase: Phase;
  temp: number;
  pressure: number;
  /** relative inter-atomic spacing used by the structure view (1 = reference) */
  spread: number;
  structure: Structure | null;
}

/** Everything that touches WebGL lives behind this one dynamic (client-only) import. */
export default function ModalScene({ element, view, phase, temp, pressure, spread, structure }: Props) {
  return (
    <SceneCanvas cameraZ={view === "atom" ? 9 : 6} maxDistance={view === "atom" ? 20 : 14}>
      {view === "substance" && <SubstanceView element={element} phase={phase} temp={temp} pressure={pressure} />}
      {view === "atom" && <AtomView element={element} />}
      {view === "structure" && structure && <StructureView structure={structure} tint={element.color} spread={spread} />}
    </SceneCanvas>
  );
}
