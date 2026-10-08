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
  structure: Structure | null;
}

/** Everything that touches WebGL lives behind this one dynamic (client-only) import. */
/** Camera distance that keeps the outermost electron shell inside the view (matches AtomView's radii). */
function atomCameraZ(shells: number[]) {
  const n = shells.length;
  const outer = 1.1 + (n - 1) * Math.min(0.55, 3.6 / n);
  // vertical half-height at distance d is d·tan(19°) ≈ 0.344·d for the 38° field of view; add 8% margin
  return Math.max(9, (outer / 0.344) * 1.08);
}

export default function ModalScene({ element, view, phase, temp, pressure, structure }: Props) {
  const atomZ = atomCameraZ(element.shells);
  return (
    <SceneCanvas cameraZ={view === "atom" ? atomZ : 6} maxDistance={view === "atom" ? atomZ * 2 : 14}>
      {view === "substance" && <SubstanceView element={element} phase={phase} temp={temp} pressure={pressure} />}
      {view === "atom" && <AtomView element={element} />}
      {view === "structure" && structure && <StructureView structure={structure} tint={element.color} />}
    </SceneCanvas>
  );
}
