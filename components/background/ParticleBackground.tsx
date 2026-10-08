"use client";

import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

// A faint white dust field that reacts to the pointer; kept subtle so the table stays the hero.
const options: ISourceOptions = {
  fullScreen: { enable: false },
  background: { color: { value: "transparent" } },
  fpsLimit: 60,
  detectRetina: true,
  particles: {
    number: { value: 70, density: { enable: true, width: 1400, height: 900 } },
    color: { value: "#ffffff" },
    opacity: { value: { min: 0.05, max: 0.28 } },
    size: { value: { min: 0.6, max: 1.7 } },
    move: {
      enable: true,
      speed: 0.22,
      direction: "none",
      random: true,
      straight: false,
      outModes: { default: "out" },
    },
    links: { enable: true, distance: 120, color: "#ffffff", opacity: 0.06, width: 1 },
  },
  interactivity: {
    detectsOn: "window",
    events: { onHover: { enable: true, mode: "grab" } },
    modes: { grab: { distance: 150, links: { opacity: 0.22 } } },
  },
};

export default function ParticleBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <ParticlesProvider init={loadSlim}>
        <Particles id="bg-particles" options={options} className="h-full w-full" style={{ height: "100%", width: "100%" }} />
      </ParticlesProvider>
    </div>
  );
}
