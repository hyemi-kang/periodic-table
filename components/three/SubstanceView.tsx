"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { ContactShadows, MarchingCube, MarchingCubes, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { ChemElement } from "@/lib/elements";
import { materialFor, type SurfaceSpec } from "@/lib/materials";
import { createBumpTexture, createNuggetGeometry } from "@/lib/noise";
import type { Phase } from "@/lib/phase";
import { spacingFactor } from "@/lib/physics";
import PhaseParticles from "./PhaseParticles";
import { meshVisibility, TRANSITION_SECONDS, type PhaseAnim } from "./phaseAnim";

function Surface({ spec, bump }: { spec: SurfaceSpec; bump: THREE.Texture }) {
  const translucent = (spec.transmission ?? 0) > 0;
  return (
    <meshPhysicalMaterial
      color={spec.color}
      metalness={spec.metalness}
      roughness={spec.roughness}
      clearcoat={spec.clearcoat ?? 0}
      clearcoatRoughness={0.08}
      transmission={spec.transmission ?? 0}
      ior={spec.ior ?? 1.5}
      thickness={spec.thickness ?? 0}
      attenuationColor={spec.color}
      attenuationDistance={translucent ? 1.6 : Infinity}
      bumpMap={spec.bump ? bump : null}
      bumpScale={(spec.bump ?? 0) * 3}
      envMapIntensity={1.15}
      flatShading={false}
    />
  );
}

function CrystalCluster({ spec, bump }: { spec: SurfaceSpec; bump: THREE.Texture }) {
  // three hexagonal prisms with pointed tips, leaning out of a common base
  const crystals = [
    { pos: [0, 0, 0], rot: [0, 0.2, 0], r: 0.42, h: 1.7 },
    { pos: [-0.55, -0.2, 0.2], rot: [0.1, 0.6, 0.45], r: 0.3, h: 1.25 },
    { pos: [0.5, -0.25, -0.1], rot: [-0.15, 1.1, -0.5], r: 0.33, h: 1.35 },
    { pos: [0.1, -0.3, 0.55], rot: [0.5, 0.3, -0.1], r: 0.24, h: 0.95 },
  ] as const;
  return (
    <group position={[0, -0.25, 0]}>
      {crystals.map((c, i) => (
        <group key={i} position={c.pos as unknown as [number, number, number]} rotation={c.rot as unknown as [number, number, number]}>
          <mesh position={[0, c.h / 2, 0]}>
            <cylinderGeometry args={[c.r, c.r, c.h, 6]} />
            <Surface spec={spec} bump={bump} />
          </mesh>
          <mesh position={[0, c.h + c.r * 0.55, 0]}>
            <coneGeometry args={[c.r, c.r * 1.1, 6]} />
            <Surface spec={spec} bump={bump} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SolidBody({ el, bump }: { el: ChemElement; bump: THREE.Texture }) {
  const spec = materialFor(el);
  const nugget = useMemo(() => createNuggetGeometry(1.15, el.number), [el.number]);
  useEffect(() => () => nugget.dispose(), [nugget]);

  if (spec.shape === "ingot")
    return (
      <RoundedBox args={[2.1, 1.15, 1.25]} radius={0.1} smoothness={6} rotation={[0.2, 0.45, 0]}>
        <Surface spec={spec.solid} bump={bump} />
      </RoundedBox>
    );
  if (spec.shape === "crystal") return <CrystalCluster spec={spec.solid} bump={bump} />;
  if (spec.shape === "octa")
    return (
      <mesh scale={1.3}>
        <octahedronGeometry args={[1, 0]} />
        <Surface spec={spec.solid} bump={bump} />
      </mesh>
    );
  return (
    <mesh geometry={nugget} scale={1.05}>
      <Surface spec={spec.solid} bump={bump} />
    </mesh>
  );
}

const BALLS = 6;

function LiquidBody({ el, anim }: { el: ChemElement; anim: MutableRefObject<PhaseAnim> }) {
  const spec = materialFor(el).liquid;
  const refs = useRef<(THREE.Group | null)[]>([]);
  const spread = useRef(1);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    // warmer / lower pressure -> the pool spreads out a little (exaggerated thermal expansion)
    const target = spacingFactor("liquid", anim.current.temp, anim.current.pressure);
    spread.current += (target - spread.current) * (1 - Math.exp(-dt * 5));
    const s = spread.current;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const a = t * (0.3 + i * 0.05) + i * 1.9;
      const rr = i === 0 ? 0 : (0.3 + (i % 3) * 0.1) * s;
      g.position.set(Math.cos(a) * rr, -0.74 + Math.sin(t * 0.9 + i) * 0.05, Math.sin(a * 1.1) * rr);
    });
  });

  return (
    <MarchingCubes resolution={64} maxPolyCount={40000} enableUvs={false} enableColors={false}>
      <meshPhysicalMaterial
        color={spec.color}
        metalness={spec.metalness}
        roughness={spec.roughness}
        clearcoat={spec.clearcoat ?? 0.6}
        transmission={spec.transmission ?? 0}
        ior={spec.ior ?? 1.4}
        thickness={spec.thickness ?? 0}
        attenuationColor={spec.color}
        attenuationDistance={(spec.transmission ?? 0) > 0 ? 1.4 : Infinity}
        envMapIntensity={1.8}
      />
      {Array.from({ length: BALLS }).map((_, i) => (
        <MarchingCube
          key={i}
          ref={(g) => {
            refs.current[i] = g;
          }}
          strength={i === 0 ? 1.5 : 1.0}
          subtract={12}
        />
      ))}
    </MarchingCubes>
  );
}

interface Props {
  element: ChemElement;
  phase: Phase;
  temp: number;
  pressure: number;
}

export default function SubstanceView({ element, phase, temp, pressure }: Props) {
  const spec = materialFor(element);
  const bump = useMemo(() => createBumpTexture(element.number + 3), [element.number]);
  useEffect(() => () => bump.dispose(), [bump]);

  const anim = useRef<PhaseAnim>({ from: phase, to: phase, p: 1, temp, pressure });
  const solidRef = useRef<THREE.Group>(null);
  const liquidRef = useRef<THREE.Group>(null);
  const solidScale = useRef(1);

  useEffect(() => {
    anim.current.temp = temp;
    anim.current.pressure = pressure;
  }, [temp, pressure]);

  // start a transition whenever the requested phase changes
  useEffect(() => {
    const a = anim.current;
    if (a.to === phase) return;
    // if interrupted mid-way, continue from where the *target* was heading
    a.from = a.to;
    a.to = phase;
    a.p = 0;
  }, [phase]);

  useFrame((state, dt) => {
    const a = anim.current;
    if (a.from !== a.to) {
      a.p = Math.min(1, a.p + dt / TRANSITION_SECONDS);
      if (a.p >= 1) a.from = a.to;
    }
    const t = state.clock.elapsedTime;
    const sv = meshVisibility(a, "solid");
    const lv = meshVisibility(a, "liquid");
    // the solid expands with temperature and shrinks under pressure (exaggerated, see lib/physics.ts)
    solidScale.current += (spacingFactor("solid", a.temp, a.pressure) - solidScale.current) * (1 - Math.exp(-dt * 5));
    if (solidRef.current) {
      solidRef.current.visible = sv > 0.01;
      solidRef.current.scale.setScalar(Math.max(0.001, sv * solidScale.current));
      solidRef.current.position.y = Math.sin(t * 0.8) * 0.04;
      solidRef.current.rotation.y = (1 - sv) * 1.2;
    }
    if (liquidRef.current) {
      liquidRef.current.visible = lv > 0.01;
      liquidRef.current.scale.setScalar(Math.max(0.001, lv));
    }
  });

  return (
    <>
      <group ref={solidRef} visible={phase === "solid"}>
        <SolidBody el={element} bump={bump} />
      </group>
      {/* MarchingCubes reads ball positions in world space, so this group must stay unscaled at rest */}
      <group ref={liquidRef} visible={phase === "liquid"}>
        <LiquidBody el={element} anim={anim} />
      </group>
      <PhaseParticles anim={anim} color={spec.gasColor} glow={spec.glow} mass={element.mass} />
      <ContactShadows position={[0, -1.08, 0]} opacity={0.5} scale={9} blur={2.6} far={3} />
    </>
  );
}
