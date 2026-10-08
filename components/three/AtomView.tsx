"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ChemElement } from "@/lib/elements";
import { mulberry32 } from "@/lib/noise";

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

function Nucleus({ protons, neutrons }: { protons: number; neutrons: number }) {
  const total = protons + neutrons;
  const pRef = useRef<THREE.InstancedMesh>(null);
  const nRef = useRef<THREE.InstancedMesh>(null);

  const { pts, r, kinds } = useMemo(() => {
    const rnd = mulberry32(protons * 31 + neutrons);
    const r = Math.min(0.2, 0.62 / Math.cbrt(Math.max(total, 1)) / 1.15);
    const R = r * Math.cbrt(total) * 1.15;
    const pts: THREE.Vector3[] = [];
    // golden-spiral points filled shell by shell
    for (let i = 0; i < total; i++) {
      const f = (i + 0.5) / total;
      const rad = R * Math.cbrt(f);
      const phi = Math.acos(1 - 2 * ((i * 0.618034) % 1));
      const th = i * Math.PI * (3 - Math.sqrt(5));
      pts.push(new THREE.Vector3(rad * Math.sin(phi) * Math.cos(th), rad * Math.cos(phi), rad * Math.sin(phi) * Math.sin(th)));
    }
    const kinds: number[] = Array.from({ length: total }, (_, i) => (i < protons ? 1 : 0));
    for (let i = kinds.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
    }
    return { pts, r, kinds };
  }, [protons, neutrons, total]);

  useEffect(() => {
    let pi = 0;
    let ni = 0;
    pts.forEach((p, i) => {
      _m.compose(p, _q.identity(), _s.setScalar(1));
      if (kinds[i]) pRef.current?.setMatrixAt(pi++, _m);
      else nRef.current?.setMatrixAt(ni++, _m);
    });
    [pRef.current, nRef.current].forEach((m) => m && (m.instanceMatrix.needsUpdate = true));
  }, [pts, kinds]);

  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (group.current) {
      group.current.rotation.y += dt * 0.25;
      group.current.rotation.x += dt * 0.08;
    }
  });

  return (
    <group ref={group}>
      <instancedMesh key={`p${protons}`} ref={pRef} args={[undefined, undefined, Math.max(protons, 1)]}>
        <sphereGeometry args={[r, 20, 20]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.25} metalness={0.1} clearcoat={0.8} />
      </instancedMesh>
      <instancedMesh key={`n${neutrons}`} ref={nRef} args={[undefined, undefined, Math.max(neutrons, 1)]}>
        <sphereGeometry args={[r, 20, 20]} />
        <meshPhysicalMaterial color="#5a5f68" roughness={0.35} metalness={0.4} />
      </instancedMesh>
    </group>
  );
}

function Shell({ index, count, radius }: { index: number; count: number; radius: number }) {
  const electrons = useRef<(THREE.Mesh | null)[]>([]);
  const tilt = useMemo(() => new THREE.Euler(0.45 * index + 0.3, index * 0.9, 0.2 * index), [index]);
  const speed = 0.9 / Math.sqrt(radius);

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed;
    electrons.current.forEach((m, k) => {
      if (!m) return;
      const a = t + (k / count) * Math.PI * 2;
      m.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    });
  });

  return (
    <group rotation={tilt}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.006, 8, 160]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.28} />
      </mesh>
      {Array.from({ length: count }).map((_, k) => (
        <mesh
          key={k}
          ref={(m) => {
            electrons.current[k] = m;
          }}
        >
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function AtomView({ element }: { element: ChemElement }) {
  const protons = element.number;
  const neutrons = Math.max(0, Math.round(element.mass) - element.number);
  const shells = element.shells;
  const step = Math.min(0.55, 3.6 / shells.length);

  return (
    <group>
      <Nucleus protons={protons} neutrons={neutrons} />
      {shells.map((count, i) => (
        <Shell key={i} index={i} count={count} radius={1.1 + i * step} />
      ))}
    </group>
  );
}
