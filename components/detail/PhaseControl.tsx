"use client";

import { useState, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { toCelsius } from "@/lib/elements";
import { formatPressure, pressureToSlider, sliderToPressure } from "@/lib/physics";
import { PHASES, phaseAt, posToTemp, representativeTemp, tempToPos, type Phase, type PhaseModel } from "@/lib/phase";

const LABEL: Record<Phase, string> = { solid: "Solid", liquid: "Liquid", gas: "Gas" };
const SHADE: Record<Phase, string> = {
  solid: "rgba(255,255,255,0.55)",
  liquid: "rgba(255,255,255,0.3)",
  gas: "rgba(255,255,255,0.12)",
};
const STEPS = 4000;

interface Props {
  model: PhaseModel;
  temp: number;
  pressure: number;
  /** relative inter-particle spacing for the readout (1 = 298 K, 1 atm) */
  spacing: number;
  onTemp: (t: number) => void;
  onPressure: (p: number) => void;
  /** hide the S / L / G buttons (structure tab shows the same sliders without them) */
  showPhases?: boolean;
  /** an extra line appended to the notes at the bottom of the card */
  extraNote?: string | null;
}

function transitionLabel(from: Phase, to: Phase) {
  if (from === "solid" && to === "liquid") return "Melts";
  if (from === "liquid" && to === "gas") return "Boils";
  if (from === "solid" && to === "gas") return "Sublimes";
  return "";
}

const fmtK = (t: number) => t.toLocaleString(undefined, { maximumFractionDigits: 1 });

export default function PhaseControl({ model, temp, pressure, spacing, onTemp, onPressure, showPhases = true, extraNote }: Props) {
  const [equal, setEqual] = useState(false);
  const phase = phaseAt(model, temp);
  const pos = (t: number) => tempToPos(model, t, equal) * 100;

  // gradient track that shows which phase each temperature range belongs to
  let lower = 0;
  const stops: string[] = [];
  model.bands.forEach((b) => {
    const upper = Math.min(b.upTo, model.tMax);
    stops.push(`${SHADE[b.phase]} ${pos(lower)}%`, `${SHADE[b.phase]} ${b.upTo === Infinity ? 100 : pos(upper)}%`);
    lower = upper;
  });
  const track = `linear-gradient(to right, ${stops.join(", ")})`;

  // transition marks; labels that would collide are pushed to a second row
  const marks: { at: number; label: string; t: number; row: number }[] = [];
  model.bands.slice(0, -1).forEach((b, i) => {
    const at = pos(b.upTo);
    const prev = marks[marks.length - 1];
    marks.push({
      at,
      label: transitionLabel(b.phase, model.bands[i + 1].phase),
      t: b.upTo,
      row: prev && at - prev.at < 26 ? (prev.row + 1) % 2 : 0,
    });
  });

  const clampT = (t: number) => Math.min(model.tMax, Math.max(0, Math.round(t)));

  // ←/→ move by 1 K (Shift: 10 K) so the exact moment of a transition can be reached
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    onTemp(clampT(temp + dir * (e.shiftKey ? 10 : 1)));
  };

  const delta = (spacing - 1) * 100;
  const roomTick = 298 < model.tMax ? pos(298) : null;

  return (
    <div className="w-full max-w-2xl space-y-3 rounded-xl border border-white/12 bg-black/80 p-3.5 backdrop-blur-md sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {showPhases ? (
          <div role="group" aria-label="Physical state" className="flex gap-1 rounded-full border border-white/15 p-1">
            {PHASES.map((p) => {
              const available = model.available[p];
              const on = phase === p;
              return (
                <button
                  key={p}
                  type="button"
                  disabled={!available}
                  aria-pressed={on}
                  title={available ? undefined : "Not stable at this pressure / no data"}
                  onClick={() => onTemp(clampT(representativeTemp(model, p)))}
                  className="relative rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white/60 transition-colors enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-25 aria-pressed:text-black"
                >
                  {on && (
                    <motion.span
                      layoutId="phase-pill"
                      className="absolute inset-0 rounded-full bg-white"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10">{LABEL[p]}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">
            Crystal lattice
            {phase !== "solid" && (
              <span className="mt-0.5 block text-[10px] normal-case tracking-normal text-white/40">
                Not solid at these conditions — spacing is held at its melting-point value.
              </span>
            )}
          </p>
        )}
        <p className="font-mono text-[11px] tabular-nums text-white/55" title="Relative distance between neighbouring atoms. Real changes are far smaller — the effect is exaggerated so it is visible.">
          Spacing (exaggerated) <span className="text-white">{delta >= 0 ? "+" : "−"}{Math.abs(delta).toFixed(1)}%</span>
        </p>
      </div>

      {/* temperature */}
      <div>
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <label htmlFor="temp" className="text-[10px] uppercase tracking-[0.16em] text-white/45">
            Temperature
          </label>
          <div className="flex items-baseline gap-3">
            {model.bands.length > 1 && (
              <button
                type="button"
                aria-pressed={equal}
                onClick={() => setEqual((v) => !v)}
                title="Give every phase the same share of the slider"
                className="rounded-full border border-white/20 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-white/50 transition-colors hover:text-white aria-pressed:border-white aria-pressed:bg-white aria-pressed:text-black"
              >
                Equal phase widths
              </button>
            )}
            <p className="font-mono text-[12px] tabular-nums text-white">
              {fmtK(temp)} K<span className="ml-2 text-white/45">{Math.round(toCelsius(temp)).toLocaleString()} °C</span>
            </p>
          </div>
        </div>
        <div className="relative pt-1">
          <div className="pointer-events-none absolute left-0 right-0 top-[11px] h-[4px] rounded-full" style={{ background: track }} />
          {roomTick !== null && (
            <div className="pointer-events-none absolute top-[7px] h-3 w-px bg-white/35" style={{ left: `${roomTick}%` }} title="298 K" />
          )}
          <input
            id="temp"
            type="range"
            className="temp relative z-10"
            min={0}
            max={STEPS}
            step={1}
            value={Math.round(tempToPos(model, temp, equal) * STEPS)}
            aria-valuetext={`${temp} kelvin`}
            aria-describedby="temp-hint"
            onKeyDown={onKey}
            onChange={(e) => onTemp(clampT(posToTemp(model, Number(e.target.value) / STEPS, equal)))}
          />
          <div className="relative mt-1.5 h-9">
            {marks.map((m) => (
              <button
                key={m.label + m.t}
                type="button"
                onClick={() => onTemp(clampT(Math.floor(m.t) + 1))}
                title={`Jump just past the transition (${fmtK(m.t)} K)`}
                className="group absolute top-0 -translate-x-1/2 cursor-pointer text-center"
                style={{ left: `${m.at}%`, paddingTop: m.row * 14 }}
              >
                <span className="mx-auto block h-1.5 w-px bg-white/50 group-hover:bg-white" />
                <span className="block whitespace-nowrap font-mono text-[9px] uppercase tracking-wider text-white/45 underline-offset-2 group-hover:text-white group-hover:underline">
                  {m.label} {fmtK(m.t)} K
                </span>
              </button>
            ))}
          </div>
          {equal && (
            <p className="mt-1 text-[10px] leading-relaxed text-white/45">
              Non-uniform scale: each phase gets the same width, so the slider position is not proportional to temperature — read the K value.
            </p>
          )}
          <div className="mt-0.5 flex justify-between font-mono text-[9px] uppercase tracking-wider text-white/30">
            <span>0 K</span>
            <span id="temp-hint" className="hidden sm:inline">
              ← → 1 K · Shift 10 K · click a mark to jump
            </span>
            <span>{fmtK(model.tMax)} K</span>
          </div>
        </div>
      </div>

      {/* pressure */}
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <label htmlFor="pressure" className="text-[10px] uppercase tracking-[0.16em] text-white/45">
            Pressure
          </label>
          <p className="font-mono text-[12px] tabular-nums text-white">{formatPressure(pressure)}</p>
        </div>
        <div className="relative pt-1">
          <div className="pointer-events-none absolute left-0 right-0 top-[11px] h-[4px] rounded-full bg-white/20" />
          <div className="pointer-events-none absolute top-[7px] h-3 w-px bg-white/50" style={{ left: "50%" }} />
          <input
            id="pressure"
            type="range"
            className="temp relative z-10"
            min={0}
            max={1000}
            step={1}
            value={Math.round(pressureToSlider(pressure) * 1000)}
            aria-valuetext={formatPressure(pressure)}
            onChange={(e) => {
              const s = Number(e.target.value) / 1000;
              onPressure(Math.abs(s - 0.5) < 0.012 ? 1 : sliderToPressure(s)); // snap to 1 atm
            }}
          />
          <div className="mt-1.5 flex justify-between font-mono text-[9px] uppercase tracking-wider text-white/35">
            <span>0.001 atm</span>
            <span>1 atm</span>
            <span>1000 atm</span>
          </div>
        </div>
      </div>

      {(model.notes.length > 0 || extraNote) && (
        <p className="text-[10px] leading-relaxed text-white/40">{[...model.notes, extraNote].filter(Boolean).join(" ")}</p>
      )}
    </div>
  );
}
