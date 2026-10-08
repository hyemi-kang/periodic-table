import { Color } from "three";
import { categoryOf, type ChemElement, type CategoryKey } from "./elements";

export type SolidShape = "ingot" | "nugget" | "crystal" | "octa";

export interface SurfaceSpec {
  color: string;
  metalness: number;
  roughness: number;
  clearcoat?: number;
  transmission?: number;
  ior?: number;
  thickness?: number;
  /** 0..1 strength of the procedural bump texture */
  bump?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

export interface MaterialSpec {
  shape: SolidShape;
  solid: SurfaceSpec;
  liquid: SurfaceSpec;
  /** Colour of the gas / particle cloud */
  gasColor: string;
  /** Gas glows like a discharge tube (noble gases, etc.) */
  glow: boolean;
}

const metal = (color: string, roughness = 0.3, bump = 0.4): SurfaceSpec => ({
  color,
  metalness: 1,
  roughness,
  bump,
});

const liquidMetal = (color: string): SurfaceSpec => ({
  color,
  metalness: 1,
  roughness: 0.04,
  clearcoat: 1,
});

const ice = (color: string): SurfaceSpec => ({
  color,
  metalness: 0,
  roughness: 0.12,
  transmission: 0.92,
  ior: 1.33,
  thickness: 1.2,
  bump: 0.15,
});

const liquidGlass = (color: string): SurfaceSpec => ({
  color,
  metalness: 0,
  roughness: 0.02,
  transmission: 0.95,
  ior: 1.4,
  thickness: 1.5,
  clearcoat: 1,
});

const DEFAULTS: Record<CategoryKey, MaterialSpec> = {
  alkali: {
    shape: "ingot",
    solid: metal("#c6cbd2", 0.42, 0.25),
    liquid: liquidMetal("#cfd4da"),
    gasColor: "#d7dbe0",
    glow: false,
  },
  alkaline: {
    shape: "ingot",
    solid: metal("#cfd2d6", 0.34, 0.3),
    liquid: liquidMetal("#d6d9dd"),
    gasColor: "#dfe2e6",
    glow: false,
  },
  transition: {
    shape: "nugget",
    solid: metal("#a8adb5", 0.28, 0.5),
    liquid: liquidMetal("#c3c7cd"),
    gasColor: "#c8ccd2",
    glow: false,
  },
  "post-transition": {
    shape: "ingot",
    solid: metal("#b4b9c0", 0.32, 0.4),
    liquid: liquidMetal("#c6cad0"),
    gasColor: "#cdd1d6",
    glow: false,
  },
  metalloid: {
    shape: "crystal",
    solid: { color: "#59606b", metalness: 0.85, roughness: 0.22, bump: 0.55 },
    liquid: liquidMetal("#aeb3ba"),
    gasColor: "#bfc4ca",
    glow: false,
  },
  nonmetal: {
    shape: "crystal",
    solid: ice("#dfe8f0"),
    liquid: liquidGlass("#dbe6ef"),
    gasColor: "#d0dae2",
    glow: false,
  },
  noble: {
    shape: "crystal",
    solid: ice("#e8eef5"),
    liquid: liquidGlass("#e8eef5"),
    gasColor: "#e0e8f5",
    glow: true,
  },
  lanthanide: {
    shape: "ingot",
    solid: metal("#b9bcc3", 0.38, 0.35),
    liquid: liquidMetal("#c9ccd2"),
    gasColor: "#cfd2d8",
    glow: false,
  },
  actinide: {
    shape: "ingot",
    solid: metal("#a5a9b0", 0.42, 0.35),
    liquid: liquidMetal("#b9bcc3"),
    gasColor: "#c2c5cb",
    glow: false,
  },
  unknown: {
    shape: "ingot",
    solid: metal("#6e737b", 0.5, 0.4),
    liquid: liquidMetal("#8c9199"),
    gasColor: "#aab0b8",
    glow: false,
  },
};

type Override = Partial<Omit<MaterialSpec, "solid" | "liquid">> & {
  solid?: Partial<SurfaceSpec>;
  liquid?: Partial<SurfaceSpec>;
};

/** Hand-tuned looks for the elements people care about most. */
const OVERRIDES: Record<string, Override> = {
  // --- gases / nonmetals ---
  H: { gasColor: "#ff8fe0", glow: true, solid: { color: "#f3f7fb" }, liquid: { color: "#eaf1f7" } },
  N: { gasColor: "#b9a8ff", glow: true, solid: { color: "#dfe6ff" } },
  O: {
    gasColor: "#9fd2ff",
    glow: true,
    solid: { color: "#a9d4ff" },
    liquid: { color: "#8fc4f5", transmission: 0.9 },
  },
  F: { gasColor: "#eef28a", glow: true, solid: { color: "#f4f6c8" }, liquid: { color: "#f3f2a0" } },
  Cl: {
    gasColor: "#c8e04a",
    glow: true,
    solid: { color: "#e3f08a" },
    liquid: { color: "#d4e55a", transmission: 0.85 },
  },
  Br: {
    gasColor: "#c0381b",
    glow: true,
    solid: { color: "#6e2415", transmission: 0.6, roughness: 0.2 },
    liquid: { color: "#8a2b12", transmission: 0.55, thickness: 2.4, roughness: 0.03 },
  },
  I: {
    gasColor: "#9d6bff",
    glow: true,
    shape: "nugget",
    solid: { color: "#2e2840", metalness: 0.65, roughness: 0.28, transmission: 0, bump: 0.6 },
    liquid: { color: "#3b2a55", metalness: 0.2, transmission: 0.4, thickness: 2 },
  },
  S: {
    gasColor: "#f0dc45",
    shape: "crystal",
    solid: { color: "#e8d53a", transmission: 0.45, roughness: 0.18, thickness: 1.2, ior: 1.9 },
    liquid: { color: "#e0a21b", transmission: 0.7, thickness: 2 },
  },
  P: {
    gasColor: "#f6e9c8",
    solid: { color: "#efe6cf", transmission: 0.35, roughness: 0.3, bump: 0.2 },
    liquid: { color: "#f0e6c6", transmission: 0.6 },
  },
  C: {
    shape: "nugget",
    gasColor: "#8f95a0",
    solid: { color: "#262a30", metalness: 0.7, roughness: 0.42, transmission: 0, bump: 0.8 },
  },
  Se: { shape: "nugget", solid: { color: "#57535a", metalness: 0.8, roughness: 0.25, transmission: 0 } },
  // --- noble gases (discharge-tube colours) ---
  He: { gasColor: "#ffc89a", glow: true, liquid: { color: "#f6f2ff" } },
  Ne: { gasColor: "#ff5a22", glow: true, solid: { color: "#ffd9c7" } },
  Ar: { gasColor: "#b07cff", glow: true, solid: { color: "#e5d8ff" } },
  Kr: { gasColor: "#d9e8ff", glow: true },
  Xe: { gasColor: "#7fb0ff", glow: true, solid: { color: "#d4e2ff" } },
  Rn: { gasColor: "#f5f5f5", glow: true },
  // --- metals with distinctive colour ---
  Au: {
    shape: "nugget",
    solid: { color: "#f2c14e", roughness: 0.16, bump: 0.35, clearcoat: 0.2 },
    liquid: { color: "#f2c14e" },
    gasColor: "#ffd878",
  },
  Cu: {
    shape: "ingot",
    solid: { color: "#d2764a", roughness: 0.22 },
    liquid: { color: "#e08a5c" },
    gasColor: "#7fe0b0",
  },
  Ag: { solid: { color: "#eceef0", roughness: 0.1, bump: 0.2 }, liquid: { color: "#f2f3f5" } },
  Fe: { shape: "nugget", solid: { color: "#8b8f96", roughness: 0.42, bump: 0.75 }, gasColor: "#ffb36b" },
  Al: { shape: "ingot", solid: { color: "#d2d5da", roughness: 0.2, bump: 0.15 } },
  Zn: { solid: { color: "#a9b3bb", roughness: 0.3, bump: 0.6 } },
  Ti: { shape: "nugget", solid: { color: "#8f9399", roughness: 0.26 } },
  Ni: { solid: { color: "#bfc2c6", roughness: 0.16 } },
  Cr: { solid: { color: "#dde0e4", roughness: 0.05, clearcoat: 1, bump: 0.05 } },
  Pt: { shape: "nugget", solid: { color: "#dcdee0", roughness: 0.12 } },
  W: { shape: "nugget", solid: { color: "#6b6e75", roughness: 0.34, bump: 0.65 } },
  Pb: { solid: { color: "#6c727c", roughness: 0.5, bump: 0.5 } },
  Sn: { solid: { color: "#c6c9ce", roughness: 0.22 } },
  Mg: { solid: { color: "#d6d9dc", roughness: 0.3 }, gasColor: "#f4fbff" },
  Na: { solid: { color: "#c9ced4", roughness: 0.5 }, gasColor: "#ffb21f", glow: true },
  K: { solid: { color: "#c3c8d0", roughness: 0.52 }, gasColor: "#c58cff" },
  Li: { solid: { color: "#bcbfc6", roughness: 0.46 }, gasColor: "#ff4d6a" },
  Ca: { solid: { color: "#d4d3cd", roughness: 0.4 } },
  Co: { solid: { color: "#7d838c", roughness: 0.3 } },
  Mn: { solid: { color: "#9b9ba4", roughness: 0.4 } },
  Si: {
    shape: "crystal",
    solid: { color: "#4b5563", metalness: 0.92, roughness: 0.16, bump: 0.35 },
  },
  Ge: { shape: "crystal", solid: { color: "#737b86", metalness: 0.9, roughness: 0.2 } },
  Hg: {
    shape: "ingot",
    solid: { color: "#d9dde3", roughness: 0.06, clearcoat: 1 },
    liquid: { color: "#e3e7ec", roughness: 0.02, clearcoat: 1 },
    gasColor: "#8fe1ff",
    glow: true,
  },
  Ga: { liquid: { color: "#d9dde2" } },
  U: { solid: { color: "#8c9097" } },
};

/**
 * Real bulk colours (polished metal / typical crystal). Most metals are "silver", but the
 * differences are real: Cs is pale gold, Bi pinkish, Cu red-orange, Os / Ta / Nb bluish, Mn pinkish grey…
 */
const SOLID_COLORS: Record<string, string> = {
  Li: "#c0c4cb", Be: "#a9aeb3", Na: "#cfd3d8", Mg: "#c8ccd0", Al: "#d0d4d9", K: "#c6c9d0", Ca: "#dcd9cf",
  Sc: "#c9c7c5", Ti: "#9ea1a6", V: "#8b919c", Cr: "#d6dade", Mn: "#a39ea6", Fe: "#8d9096", Co: "#80858f",
  Ni: "#c3c6c8", Cu: "#d2764a", Zn: "#b5bec6", Ga: "#c4cad2", Ge: "#767c85", As: "#6d6f73", Se: "#5a5660",
  Rb: "#d8d3c8", Sr: "#cfcdc5", Y: "#c6c6c8", Zr: "#b2b5b8", Nb: "#8f97a3", Mo: "#9aa1a8", Tc: "#8b8f94",
  Ru: "#a7abb0", Rh: "#d6d9dc", Pd: "#cfd1d3", Ag: "#eceef0", Cd: "#b9bec5", In: "#b8bcc4", Sn: "#c6c9ce",
  Sb: "#9ea3ab", Te: "#8c8f94", Cs: "#e6cf98", Ba: "#c9c7bd", La: "#bdbfc2", Ce: "#b8babd", Pr: "#c7c9a8",
  Nd: "#c1c2b0", Sm: "#c5c6c0", Eu: "#c8c9c4", Gd: "#bfc1c4", Tb: "#bcbec2", Dy: "#bcbfc0", Ho: "#c0c0bd",
  Er: "#c2c0c1", Tm: "#bdbfc2", Yb: "#c6c8c9", Lu: "#c0c2c6", Hf: "#9ea2a8", Ta: "#7e848d", W: "#757880",
  Re: "#8e9298", Os: "#7d8fa0", Ir: "#d5d7da", Pt: "#dcdee0", Au: "#f2c14e", Tl: "#9ba0a8", Pb: "#6c727c",
  Bi: "#c9b8c8", Po: "#a0a2a6", Ra: "#d6d6d4", Th: "#8d9094", U: "#8c9097", B: "#2f2a28", At: "#2a2a30",
};

const hash = (n: number) => ((n * 2654435761) % 1000) / 1000;

function mix(a: string, b: string, t: number) {
  const ca = new Color(a);
  ca.lerp(new Color(b), t);
  return `#${ca.getHexString()}`;
}

export function materialFor(el: ChemElement): MaterialSpec {
  const cat = categoryOf(el);
  const base = DEFAULTS[cat];
  const o = OVERRIDES[el.symbol];
  const isMetal = ["alkali", "alkaline", "transition", "post-transition", "lanthanide", "actinide", "unknown"].includes(cat);

  // 1. element-specific bulk colour (real appearance), 2. tiny per-element roughness variation
  const tabulated = SOLID_COLORS[el.symbol];
  const solid: SurfaceSpec = { ...base.solid };
  if (tabulated) solid.color = tabulated;
  solid.roughness = Math.min(0.9, Math.max(0.04, solid.roughness + (hash(el.number) - 0.5) * 0.08));

  // liquids of metals are brighter / more mirror-like than the solid; nonmetals keep their own colour
  const liquid: SurfaceSpec = { ...base.liquid };
  if (isMetal || cat === "metalloid") liquid.color = mix(solid.color, "#ffffff", 0.2);

  // vapour colour: element-specific discharge / vapour colour if known, otherwise the CPK colour
  let gasColor = base.gasColor;
  if (el.color && !o?.gasColor) gasColor = mix(`#${el.color}`, "#ffffff", 0.25);

  if (!o)
    return { shape: base.shape, gasColor, glow: base.glow, solid, liquid };
  return {
    shape: o.shape ?? base.shape,
    gasColor: o.gasColor ?? gasColor,
    glow: o.glow ?? base.glow,
    solid: { ...solid, ...o.solid },
    liquid: { ...liquid, ...o.liquid },
  };
}
