"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Structure, Vec3 } from "@/lib/structures";

const UP = new THREE.Vector3(0, 1, 0);

function Rod({ a, b, radius, color, opacity = 1, offset = 0 }: { a: Vec3; b: Vec3; radius: number; color: string; opacity?: number; offset?: number }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    dir.normalize();
    // perpendicular for multiple bonds
    const perp = new THREE.Vector3().crossVectors(dir, Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : UP).normalize();
    const mid = va.clone().add(vb).multiplyScalar(0.5).add(perp.multiplyScalar(offset));
    return { pos: mid, quat: new THREE.Quaternion().setFromUnitVectors(UP, dir), len };
  }, [a, b, offset]);

  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[radius, radius, len, 12]} />
      <meshPhysicalMaterial color={color} roughness={0.3} metalness={0.3} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

function AtomSphere({ p, r, color, index }: { p: Vec3; r: number; color: string; index: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const born = useRef<number | null>(null);
  useFrame((state) => {
    if (!ref.current) return;
    if (born.current === null) born.current = state.clock.elapsedTime;
    const t = Math.min(1, Math.max(0, (state.clock.elapsedTime - born.current - index * 0.025) / 0.5));
    // easeOutBack for a springy pop-in
    const c1 = 1.70158;
    const s = t === 0 ? 0.0001 : 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    ref.current.scale.setScalar(Math.max(0.0001, s));
  });
  return (
    <mesh ref={ref} position={p} scale={0.0001}>
      <sphereGeometry args={[r, 32, 32]} />
      <meshPhysicalMaterial color={color} roughness={0.22} metalness={0.25} clearcoat={0.7} />
    </mesh>
  );
}

interface Props {
  structure: Structure;
  /** element colour (hex without #) used as a gentle tint */
  tint: string | null;
  /** relative inter-atomic spacing (positions scale, atom radii do not) */
  spread: number;
}

/** Smoothly follows `spread` so dragging the temperature / pressure slider breathes the lattice. */
function useSmoothed(target: number) {
  const [value, setValue] = useState(target);
  const ref = useRef(target);
  useFrame((_, dt) => {
    const next = ref.current + (target - ref.current) * (1 - Math.exp(-dt * 6));
    if (Math.abs(next - ref.current) > 1e-4) {
      ref.current = next;
      setValue(next);
    }
  });
  return value;
}

export default function StructureView({ structure: base, tint, spread }: Props) {
  const s = useSmoothed(spread);
  const structure = useMemo<Structure>(() => {
    const sc = (p: Vec3): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
    return {
      ...base,
      atoms: base.atoms.map((a) => ({ ...a, p: sc(a.p) })),
      cell: base.cell?.map(([a, b]) => [sc(a), sc(b)] as [Vec3, Vec3]),
    };
  }, [base, s]);

  const color = useMemo(() => {
    const base = new THREE.Color("#dfe3e8");
    if (tint) base.lerp(new THREE.Color(`#${tint}`), 0.35);
    return `#${base.getHexString()}`;
  }, [tint]);

  // fit using the *unspread* structure so that changing the spacing is actually visible
  const scale = useMemo(() => {
    let ext = 0.5;
    for (const a of base.atoms) ext = Math.max(ext, Math.hypot(...a.p) + a.r);
    return 1.9 / ext;
  }, [base]);

  const group = useRef<THREE.Group>(null);

  return (
    <group ref={group} scale={scale} key={structure.id}>
      {structure.atoms.map((a, i) => (
        <AtomSphere key={i} p={a.p} r={a.r} color={color} index={i} />
      ))}
      {structure.bonds.flatMap(([i, j, order], k) => {
        const offsets = order === 1 ? [0] : order === 2 ? [-0.09, 0.09] : [-0.14, 0, 0.14];
        return offsets.map((o, n) => (
          <Rod key={`${k}-${n}`} a={structure.atoms[i].p} b={structure.atoms[j].p} radius={order === 1 ? 0.06 : 0.045} color="#9aa0a8" offset={o} />
        ));
      })}
      {structure.cell?.map(([a, b], i) => (
        <Rod key={`c${i}`} a={a} b={b} radius={0.012} color="#ffffff" opacity={0.35} />
      ))}
    </group>
  );
}
