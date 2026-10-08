import type { Phase } from "@/lib/phase";

/** Shared, mutable animation state read by every child of the substance scene. */
export interface PhaseAnim {
  from: Phase;
  to: Phase;
  /** 0..1 progress of the current transition */
  p: number;
  /** current temperature (K) and pressure (atm), kept here so frame loops can read them cheaply */
  temp: number;
  pressure: number;
}

export const TRANSITION_SECONDS = 2.0;

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** How visible the solid / liquid *mesh* of `phase` is (0..1). */
export function meshVisibility(anim: PhaseAnim, phase: Phase) {
  if (anim.from === anim.to) return anim.to === phase ? 1 : 0;
  if (phase === anim.from) return 1 - smooth(0, 0.2, anim.p);
  if (phase === anim.to) return smooth(0.8, 1, anim.p);
  return 0;
}

/** Opacity of the particle cloud: bridges transitions and *is* the gas phase. */
export function particleOpacity(anim: PhaseAnim) {
  const mid = smooth(0, 0.15, anim.p) * (1 - smooth(0.85, 1, anim.p));
  const intoGas = anim.to === "gas" ? smooth(0, 0.15, anim.p) : 0;
  const outOfGas = anim.from === "gas" ? 1 - smooth(0.85, 1, anim.p) : 0;
  return Math.max(anim.from === anim.to ? 0 : mid, intoGas, outOfGas, anim.to === "gas" && anim.from === "gas" ? 1 : 0);
}
