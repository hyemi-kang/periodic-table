"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Phase } from "@/lib/phase";
import { spacingFactor, thermalSpeed } from "@/lib/physics";
import { mulberry32 } from "@/lib/noise";
import { particleOpacity, type PhaseAnim } from "./phaseAnim";

const NX = 18;
const NY = 10;
const NZ = 15;
const N = NX * NY * NZ;
const FLOOR = -0.95;

interface Layouts {
  solid: Float32Array;
  liquid: Float32Array;
  gas: Float32Array;
  delay: Float32Array;
  swirl: Float32Array;
  seed: Float32Array;
  size: Float32Array;
}

function buildLayouts(): Layouts {
  const rnd = mulberry32(42);
  const solid = new Float32Array(N * 3);
  const liquid = new Float32Array(N * 3);
  const gas = new Float32Array(N * 3);
  const delay = new Float32Array(N);
  const swirl = new Float32Array(N * 3);
  const seed = new Float32Array(N * 3);
  const size = new Float32Array(N);
  const step = 0.115;
  let i = 0;
  for (let x = 0; x < NX; x++)
    for (let y = 0; y < NY; y++)
      for (let z = 0; z < NZ; z++, i++) {
        solid[i * 3] = (x - (NX - 1) / 2) * step;
        solid[i * 3 + 1] = (y - (NY - 1) / 2) * step;
        solid[i * 3 + 2] = (z - (NZ - 1) / 2) * step;
      }
  for (let k = 0; k < N; k++) {
    // liquid: a shallow mound resting on the floor
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * 1.2;
    const mound = 1 - (r / 1.2) ** 2;
    liquid[k * 3] = Math.cos(a) * r;
    liquid[k * 3 + 1] = FLOOR + Math.pow(rnd(), 1.5) * 0.5 * (0.3 + mound);
    liquid[k * 3 + 2] = Math.sin(a) * r;
    // gas: a diffuse cloud (radius 1 — scaled per frame by the ideal-gas factor)
    const u = rnd() * 2 - 1;
    const phi = rnd() * Math.PI * 2;
    const rad = Math.cbrt(rnd()) * 1.2;
    const s = Math.sqrt(1 - u * u);
    gas[k * 3] = rad * s * Math.cos(phi);
    gas[k * 3 + 1] = rad * u * 0.9;
    gas[k * 3 + 2] = rad * s * Math.sin(phi);
    delay[k] = rnd() * 0.4;
    swirl[k * 3] = rnd() * 2 - 1;
    swirl[k * 3 + 1] = rnd() * 2 - 1;
    swirl[k * 3 + 2] = rnd() * 2 - 1;
    seed[k * 3] = rnd() * 6.28;
    seed[k * 3 + 1] = rnd() * 6.28;
    seed[k * 3 + 2] = rnd() * 6.28;
    size[k] = 0.03 + rnd() * 0.03;
  }
  return { solid, liquid, gas, delay, swirl, seed, size };
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const vertexShader = /* glsl */ `
  attribute float aSize;
  uniform float uPx;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPx / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(uColor, a * uOpacity);
    #include <colorspace_fragment>
  }
`;

interface Props {
  anim: MutableRefObject<PhaseAnim>;
  color: string;
  glow: boolean;
  mass: number;
}

export default function PhaseParticles({ anim, color, glow, mass }: Props) {
  const layouts = useMemo(buildLayouts, []);
  const pointsRef = useRef<THREE.Points>(null);
  // eased spacing factors and an accumulated "thermal clock" (faster when hotter / lighter atoms)
  const sp = useRef({ solid: 1, liquid: 1, gas: 1 });
  const clock = useRef(0);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aSize", new THREE.BufferAttribute(layouts.size, 1));
    return g;
  }, [layouts]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: 0 },
          uPx: { value: 600 },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const out = useMemo(() => new Float32Array(3), []);

  /** Position of particle k in `phase`, including spacing change and thermal motion. */
  const place = (phase: Phase, k: number, t: number, amp: number) => {
    const base = layouts[phase];
    const s = sp.current[phase];
    const i3 = k * 3;
    const sx = layouts.seed[i3];
    const sy = layouts.seed[i3 + 1];
    const sz = layouts.seed[i3 + 2];
    let x = base[i3] * s;
    let y = base[i3 + 1] * s;
    let z = base[i3 + 2] * s;
    if (phase === "solid") {
      const a = 0.009 * amp;
      x += Math.sin(t * 16 + sx) * a;
      y += Math.sin(t * 15 + sy) * a;
      z += Math.sin(t * 17 + sz) * a;
    } else if (phase === "liquid") {
      // the floor stays put; the pool spreads / contracts above it
      y = FLOOR + (base[i3 + 1] - FLOOR) * s;
      const a = amp;
      x += Math.sin(t * 0.8 + sx) * 0.05 * a;
      y += (Math.sin(base[i3] * 3.2 + t * 1.8) * 0.035 + Math.cos(base[i3 + 2] * 2.8 + t * 1.4) * 0.03) * a;
      z += Math.cos(t * 0.7 + sz) * 0.05 * a;
    } else {
      const a = 0.18 + 0.12 * amp;
      x += Math.sin(t * 0.55 + sx) * a + Math.sin(t * 1.9 + sy) * 0.04 * amp;
      y += Math.sin(t * 0.45 + sy) * a + Math.sin(t * 1.7 + sz) * 0.04 * amp;
      z += Math.sin(t * 0.5 + sz) * a + Math.sin(t * 2.1 + sx) * 0.04 * amp;
    }
    out[0] = x;
    out[1] = y;
    out[2] = z;
  };

  const fromBuf = useMemo(() => new Float32Array(3), []);

  useFrame((state, dt) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const a = anim.current;
    const opacity = particleOpacity(a);
    pts.visible = opacity > 0.003;
    if (!pts.visible) return;

    const fov = (state.camera as THREE.PerspectiveCamera).fov;
    material.uniforms.uPx.value = (state.size.height * state.viewport.dpr) / (2 * Math.tan((fov * Math.PI) / 360));
    material.uniforms.uOpacity.value = opacity * (glow ? 0.9 : 0.75);
    material.uniforms.uColor.value.set(color);

    // ease spacing towards the physical target for the current T and P
    const ease = 1 - Math.exp(-dt * 5);
    (["solid", "liquid", "gas"] as Phase[]).forEach((ph) => {
      const target = spacingFactor(ph, a.temp, a.pressure);
      sp.current[ph] += (target - sp.current[ph]) * ease;
    });

    const speed = thermalSpeed(a.temp, mass);
    clock.current += dt * speed;
    const t = clock.current;
    const amp = Math.min(2.4, Math.max(0.35, Math.sqrt(a.temp / 298)));

    const arr = pts.geometry.attributes.position.array as Float32Array;
    const moving = a.from !== a.to && a.p < 1;

    for (let k = 0; k < N; k++) {
      const i3 = k * 3;
      let q = 1;
      if (moving) q = easeInOut(Math.min(1, Math.max(0, (a.p - layouts.delay[k]) / 0.6)));
      let swirlW = 0;
      if (moving) {
        place(a.from, k, t, amp);
        fromBuf[0] = out[0];
        fromBuf[1] = out[1];
        fromBuf[2] = out[2];
        place(a.to, k, t, amp);
        swirlW = Math.sin(Math.PI * q) * 0.55;
        for (let c = 0; c < 3; c++) arr[i3 + c] = fromBuf[c] + (out[c] - fromBuf[c]) * q + layouts.swirl[i3 + c] * swirlW;
      } else {
        place(a.to, k, t, amp);
        arr[i3] = out[0];
        arr[i3 + 1] = out[1];
        arr[i3 + 2] = out[2];
      }
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}
