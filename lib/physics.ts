import type { Phase } from "./phase";

export const P_MIN_LOG = -3; // 0.001 atm
export const P_MAX_LOG = 3; // 1000 atm

/** Slider position (0..1) ↔ pressure in atm on a log scale; 0.5 is exactly 1 atm. */
export const sliderToPressure = (s: number) => Math.pow(10, P_MIN_LOG + (P_MAX_LOG - P_MIN_LOG) * s);
export const pressureToSlider = (p: number) => (Math.log10(p) - P_MIN_LOG) / (P_MAX_LOG - P_MIN_LOG);

export function formatPressure(p: number) {
  if (p >= 100) return `${Math.round(p)} atm`;
  if (p >= 10) return `${p.toFixed(0)} atm`;
  if (p >= 1) return `${p.toFixed(1)} atm`;
  if (p >= 0.01) return `${p.toFixed(2)} atm`;
  return `${p.toExponential(1)} atm`;
}

/**
 * Boiling / sublimation temperature at pressure `p` (atm), estimated from the 1 atm value with
 * Clausius–Clapeyron and Trouton's rule (ΔHvap ≈ 88 J/mol·K × Tb  →  ln p = −10.6 (Tb/T − 1)).
 */
export function shiftBoiling(tb1atm: number, p: number) {
  const denom = Math.max(0.25, 1 - Math.log(p) / 10.6);
  return tb1atm / denom;
}

/**
 * Relative inter-particle spacing (1 = reference at 298 K, 1 atm).
 * Thermal expansion and compression are exaggerated so the effect is visible on screen.
 *  - solid  : tiny expansion with T, almost incompressible
 *  - liquid : ~5× larger expansion, slightly compressible
 *  - gas    : ideal gas, volume ∝ T / P  →  spacing ∝ (T/P)^(1/3)
 */
export function spacingFactor(phase: Phase, temp: number, pressure: number): number {
  const lp = Math.log10(1 + pressure);
  if (phase === "solid") {
    return clamp(1 + 3e-5 * (temp - 298), 0.96, 1.15) / (1 + 0.02 * lp);
  }
  if (phase === "liquid") {
    return clamp(1 + 1e-4 * (temp - 298), 0.94, 1.18) / (1 + 0.04 * lp);
  }
  return clamp(Math.cbrt(Math.max(temp, 1) / 298 / pressure), 0.45, 1.35);
}

/** Thermal speed factor ~ sqrt(T / M), normalised so that 298 K and M = 40 u gives 1. */
export function thermalSpeed(temp: number, mass: number) {
  return clamp(Math.sqrt(Math.max(temp, 1) / 298 / (mass / 40)), 0.15, 2.2);
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
