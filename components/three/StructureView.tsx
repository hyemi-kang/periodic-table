"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Structure, Vec3 } from "@/lib/structures";

const UP = new THREE.Vector3(0, 1, 0);
/** thermal vibration amplitude in structure units (the structure is always shown at 298 K) */
const VIBRATION = 0.03;

/** Static thin guide line (unit-cell edges) — these do not follow the vibrating atoms. */
function GuideLine({ a, b }: { a: Vec3; b: Vec3 }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    return { pos: va.clone().add(vb).multiplyScalar(0.5), quat: new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()), len };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[0.012, 0.012, len, 8]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
    </mesh>
  );
}

const popScale = (t: number) => {
  // easeOutBack for a springy pop-in
  const c1 = 1.70158;
  return t <= 0 ? 0.0001 : 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

interface Props {
  structure: Structure;
  /** element colour (hex without #) used as a gentle tint */
  tint: string | null;
}

export default function StructureView({ structure, tint }: Props) {
  const color = useMemo(() => {
    const base = new THREE.Color("#dfe3e8");
    if (tint) base.lerp(new THREE.Color(`#${tint}`), 0.35);
    return `#${base.getHexString()}`;
  }, [tint]);

  // fit the structure into the view
  const scale = useMemo(() => {
    let ext = 0.5;
    for (const a of structure.atoms) ext = Math.max(ext, Math.hypot(...a.p) + a.r);
    return 1.9 / ext;
  }, [structure]);

  // one rod per bond line (double / triple bonds are drawn as 2 / 3 parallel rods)
  const rods = useMemo(
    () =>
      structure.bonds.flatMap(([i, j, order]) => {
        const offsets = order === 1 ? [0] : order === 2 ? [-0.09, 0.09] : [-0.14, 0, 0.14];
        return offsets.map((offset) => ({ i, j, offset, radius: order === 1 ? 0.06 : 0.045 }));
      }),
    [structure],
  );

  const atomRefs = useRef<(THREE.Mesh | null)[]>([]);
  const rodRefs = useRef<(THREE.Mesh | null)[]>([]);
  const live = useMemo(() => structure.atoms.map(() => new THREE.Vector3()), [structure]);
  const pops = useMemo(() => new Float32Array(structure.atoms.length), [structure]);
  const born = useRef<number | null>(null);
  const tmp = useMemo(() => ({ dir: new THREE.Vector3(), perp: new THREE.Vector3(), mid: new THREE.Vector3(), axis: new THREE.Vector3(1, 0, 0), z: new THREE.Vector3(0, 0, 1) }), []);

  // atoms vibrate around their lattice / bond positions; bonds are recomputed from the live positions
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (born.current === null) born.current = t;
    const age = t - born.current;
    const w = t * 6;
    structure.atoms.forEach((a, i) => {
      live[i].set(
        a.p[0] + Math.sin(w + i * 1.7) * VIBRATION,
        a.p[1] + Math.sin(w * 1.13 + i * 2.3) * VIBRATION,
        a.p[2] + Math.sin(w * 0.91 + i * 3.1) * VIBRATION,
      );
      pops[i] = popScale(Math.min(1, Math.max(0, (age - i * 0.025) / 0.5)));
      const m = atomRefs.current[i];
      if (m) {
        m.position.copy(live[i]);
        m.scale.setScalar(Math.max(0.0001, pops[i]));
      }
    });
    rods.forEach((r, n) => {
      const m = rodRefs.current[n];
      if (!m) return;
      const A = live[r.i];
      const B = live[r.j];
      tmp.dir.subVectors(B, A);
      const len = tmp.dir.length();
      if (len < 1e-6) return;
      tmp.dir.divideScalar(len);
      // offset multiple bonds sideways in screen space (not along the viewing axis) so they stay visible
      tmp.perp.crossVectors(tmp.dir, Math.abs(tmp.dir.z) > 0.9 ? tmp.axis : tmp.z).normalize();
      tmp.mid.addVectors(A, B).multiplyScalar(0.5).addScaledVector(tmp.perp, r.offset);
      m.position.copy(tmp.mid);
      m.quaternion.setFromUnitVectors(UP, tmp.dir);
      const pop = Math.min(pops[r.i], pops[r.j]);
      m.scale.set(Math.max(0.0001, pop), len, Math.max(0.0001, pop));
    });
  });

  return (
    <group scale={scale} key={structure.id}>
      {structure.atoms.map((a, i) => (
        <mesh
          key={i}
          ref={(m) => {
            atomRefs.current[i] = m;
          }}
          position={a.p}
          scale={0.0001}
        >
          <sphereGeometry args={[a.r, 32, 32]} />
          <meshPhysicalMaterial color={color} roughness={0.22} metalness={0.25} clearcoat={0.7} />
        </mesh>
      ))}
      {rods.map((r, n) => (
        <mesh
          key={n}
          ref={(m) => {
            rodRefs.current[n] = m;
          }}
          scale={0.0001}
        >
          <cylinderGeometry args={[r.radius, r.radius, 1, 12]} />
          <meshPhysicalMaterial color="#9aa0a8" roughness={0.3} metalness={0.3} />
        </mesh>
      ))}
      {structure.cell?.map(([a, b], i) => (
        <GuideLine key={`c${i}`} a={a} b={b} />
      ))}
    </group>
  );
}
