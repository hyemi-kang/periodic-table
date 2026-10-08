import type { ChemElement } from "./elements";
import { shiftBoiling } from "./physics";

export type Phase = "solid" | "liquid" | "gas";
export const PHASES: Phase[] = ["solid", "liquid", "gas"];

interface Band {
  phase: Phase;
  /** Upper temperature bound in K (exclusive). Infinity for the last band. */
  upTo: number;
}

export interface PhaseModel {
  bands: Band[];
  available: Record<Phase, boolean>;
  /** Human readable notes about data gaps or special behaviour. */
  notes: string[];
  /** Upper end of this element's temperature slider (K). The lower end is always 0 K. */
  tMax: number;
}

/** Elements whose 1 atm behaviour differs from the simple melt/boil model. */
export const SUBLIMATION: Record<string, number> = { C: 3915, As: 887 };
const BOIL_OVERRIDE: Record<string, number> = { P: 553 };
/** Triple-point pressures (atm) of the elements that can reach them inside the slider range. */
const TRIPLE_ATM: Record<string, number> = {
  H: 0.0701,
  N: 0.1245,
  O: 0.00147,
  Cl: 0.0138,
  Br: 0.0581,
  I: 0.1195,
  Ne: 0.4275,
  Ar: 0.68,
  Kr: 0.7227,
  Xe: 0.806,
};

export function buildPhaseModel(el: ChemElement, pressure = 1): PhaseModel {
  const notes: string[] = [];
  let bands: Band[];
  const boil1 = BOIL_OVERRIDE[el.symbol] ?? el.boil;
  const boil = boil1 != null ? shiftBoiling(boil1, pressure) : null;

  if (el.symbol in SUBLIMATION) {
    bands = [
      { phase: "solid", upTo: shiftBoiling(SUBLIMATION[el.symbol], pressure) },
      { phase: "gas", upTo: Infinity },
    ];
    notes.push("Sublimes at 1 atm — no stable liquid.");
  } else if (el.symbol === "He") {
    bands = [
      { phase: "liquid", upTo: boil! },
      { phase: "gas", upTo: Infinity },
    ];
    notes.push("Does not solidify at 1 atm (needs ~25 atm).");
  } else if (el.melt != null && boil != null && pressure < (TRIPLE_ATM[el.symbol] ?? 0)) {
    // below the triple-point pressure there is no liquid: the solid sublimes directly
    const sub = Math.min(boil, el.melt);
    bands = [
      { phase: "solid", upTo: sub },
      { phase: "gas", upTo: Infinity },
    ];
    notes.push(`Below its triple-point pressure (~${TRIPLE_ATM[el.symbol]} atm) it sublimes without melting.`);
  } else if (el.melt != null && boil != null) {
    bands = [
      { phase: "solid", upTo: el.melt },
      { phase: "liquid", upTo: Math.max(boil, el.melt + 1) },
      { phase: "gas", upTo: Infinity },
    ];
  } else if (el.melt != null) {
    bands = [
      { phase: "solid", upTo: el.melt },
      { phase: "liquid", upTo: Infinity },
    ];
    notes.push("Boiling point unknown — gas state not shown.");
  } else if (boil != null) {
    // only a (theoretical) boiling point exists: below it, trust the tabulated state of matter
    const below: Phase = el.phase.toLowerCase() === "liquid" ? "liquid" : "solid";
    bands = [
      { phase: below, upTo: boil },
      { phase: "gas", upTo: Infinity },
    ];
    notes.push("No measured melting point — the predicted state below the (theoretical) boiling point is shown.");
  } else {
    const p = el.phase.toLowerCase();
    const phase: Phase = p === "gas" ? "gas" : p === "liquid" ? "liquid" : "solid";
    bands = [{ phase, upTo: Infinity }];
    notes.push("No experimental melting or boiling data — only the predicted state is shown.");
  }

  if (pressure !== 1) {
    notes.push("Boiling point at this pressure is estimated (Clausius–Clapeyron with Trouton's rule — approximate for metals, H₂ and He); melting point is kept at its 1 atm value.");
  }

  const available: Record<Phase, boolean> = { solid: false, liquid: false, gas: false };
  bands.forEach((b) => (available[b.phase] = true));
  return { bands, available, notes, tMax: tempRange(bands) };
}

export function phaseAt(model: PhaseModel, t: number): Phase {
  for (const b of model.bands) if (t < b.upTo) return b.phase;
  return model.bands[model.bands.length - 1].phase;
}

/** A sensible temperature to jump to when the user picks a phase button. */
export function representativeTemp(model: PhaseModel, phase: Phase): number {
  let lower = 0;
  for (const b of model.bands) {
    if (b.phase === phase) {
      if (lower <= 298 && 298 < b.upTo) return 298;
      if (b.upTo === Infinity) return Math.min(model.tMax, Math.round(Math.max(lower * 1.15, lower + 40)));
      return Math.round((lower + b.upTo) / 2);
    }
    lower = b.upTo;
  }
  return 298;
}

/** Round up to two significant digits so the slider ends on a tidy number. */
function niceCeil(x: number) {
  const step = Math.pow(10, Math.floor(Math.log10(x)) - 1);
  return Math.ceil(x / step) * step;
}

/**
 * Per-element slider range: 0 K up to 1.4 × the last transition (boil / sublimation) so that the
 * transition sits clearly inside the range. Elements whose last transition is above 100 K are
 * never shown below 300 K, so room temperature stays reachable; cryogenic ones (He, H, N, O, Ne…)
 * get a short range instead, otherwise every transition would be squashed against the left edge.
 */
function tempRange(bands: Band[]) {
  const finite = bands.map((b) => b.upTo).filter((u) => Number.isFinite(u));
  if (finite.length === 0) return 300;
  const last = Math.max(...finite);
  const wanted = niceCeil(last * 1.4);
  return last >= 100 ? Math.max(wanted, 300) : Math.max(wanted, 10);
}

/**
 * Slider position (0..1) ↔ temperature.
 *  - linear : position is proportional to temperature
 *  - equal  : every phase gets the same share of the track (so a 4 K and a 5800 K transition are both
 *             easy to hit); the scale is then non-uniform, so always show the temperature next to it.
 */
export function tempToPos(model: PhaseModel, t: number, equal = false): number {
  const c = Math.min(Math.max(t, 0), model.tMax);
  if (!equal) return c / model.tMax;
  const n = model.bands.length;
  let lower = 0;
  for (let i = 0; i < n; i++) {
    const upper = Math.min(model.bands[i].upTo, model.tMax);
    if (c < upper || i === n - 1) return (i + (upper > lower ? (c - lower) / (upper - lower) : 0)) / n;
    lower = upper;
  }
  return 1;
}

export function posToTemp(model: PhaseModel, pos: number, equal = false): number {
  const p = Math.min(Math.max(pos, 0), 1);
  if (!equal) return Math.round(p * model.tMax);
  const n = model.bands.length;
  const i = Math.min(n - 1, Math.floor(p * n));
  const lower = i === 0 ? 0 : Math.min(model.bands[i - 1].upTo, model.tMax);
  const upper = Math.min(model.bands[i].upTo, model.tMax);
  return Math.round(lower + (p * n - i) * (upper - lower));
}
