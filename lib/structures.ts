export type Vec3 = [number, number, number];

export interface StructAtom {
  p: Vec3;
  r: number;
}

export interface Structure {
  id: string;
  label: string;
  caption: string;
  atoms: StructAtom[];
  /** [a, b, bondOrder] */
  bonds: [number, number, number][];
  /** thin guide lines for a unit cell */
  cell?: [Vec3, Vec3][];
  /** true for crystal lattices, whose spacing / allotrope responds to temperature and pressure */
  lattice?: boolean;
}

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function autoBonds(atoms: StructAtom[], cutoff: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < atoms.length; i++)
    for (let j = i + 1; j < atoms.length; j++)
      if (dist(atoms[i].p, atoms[j].p) <= cutoff) out.push([i, j, 1]);
  return out;
}

function cubeEdges(h = 1): [Vec3, Vec3][] {
  const c: Vec3[] = [];
  for (const x of [-h, h]) for (const y of [-h, h]) for (const z of [-h, h]) c.push([x, y, z]);
  const e: [Vec3, Vec3][] = [];
  for (let i = 0; i < 8; i++)
    for (let j = i + 1; j < 8; j++) {
      const d = c[i].filter((v, k) => v !== c[j][k]).length;
      if (d === 1) e.push([c[i], c[j]]);
    }
  return e;
}

export function bcc(): Structure {
  const atoms: StructAtom[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) atoms.push({ p: [x, y, z], r: 0.36 });
  atoms.push({ p: [0, 0, 0], r: 0.4 });
  const bonds: [number, number, number][] = [];
  for (let i = 0; i < 8; i++) bonds.push([i, 8, 1]);
  return {
    id: "bcc",
    lattice: true,
    label: "Body-centred cubic",
    caption: "Body-centred cubic (BCC) unit cell — coordination number 8.",
    atoms,
    bonds,
    cell: cubeEdges(),
  };
}

export function fcc(): Structure {
  const atoms: StructAtom[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) atoms.push({ p: [x, y, z], r: 0.34 });
  const faces: Vec3[] = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  faces.forEach((p) => atoms.push({ p, r: 0.34 }));
  return {
    id: "fcc",
    lattice: true,
    label: "Face-centred cubic",
    caption: "Face-centred cubic (FCC) unit cell — close-packed, coordination number 12.",
    atoms,
    bonds: autoBonds(atoms, Math.SQRT2 + 0.05),
    cell: cubeEdges(),
  };
}

export function hcp(): Structure {
  const a = 1.5;
  const c = a * 1.633;
  const atoms: StructAtom[] = [];
  for (const z of [-c / 2, c / 2]) {
    for (let k = 0; k < 6; k++) {
      const t = (k * Math.PI) / 3;
      atoms.push({ p: [a * Math.cos(t), z, a * Math.sin(t)], r: 0.36 });
    }
    atoms.push({ p: [0, z, 0], r: 0.36 });
  }
  for (let k = 0; k < 3; k++) {
    const t = Math.PI / 6 + (k * 2 * Math.PI) / 3;
    atoms.push({ p: [(a / Math.sqrt(3)) * Math.cos(t), 0, (a / Math.sqrt(3)) * Math.sin(t)], r: 0.36 });
  }
  const cell: [Vec3, Vec3][] = [];
  for (const y of [-c / 2, c / 2])
    for (let k = 0; k < 6; k++) {
      const t1 = (k * Math.PI) / 3;
      const t2 = ((k + 1) * Math.PI) / 3;
      cell.push([
        [a * Math.cos(t1), y, a * Math.sin(t1)],
        [a * Math.cos(t2), y, a * Math.sin(t2)],
      ]);
    }
  for (let k = 0; k < 6; k++) {
    const t = (k * Math.PI) / 3;
    cell.push([
      [a * Math.cos(t), -c / 2, a * Math.sin(t)],
      [a * Math.cos(t), c / 2, a * Math.sin(t)],
    ]);
  }
  return {
    id: "hcp",
    lattice: true,
    label: "Hexagonal close-packed",
    caption: "Hexagonal close-packed (HCP) cell — ABAB layer stacking, coordination number 12.",
    atoms,
    bonds: autoBonds(atoms, a * 1.04),
    cell,
  };
}

export function diamond(): Structure {
  const f: Vec3[] = [];
  for (const x of [0, 1]) for (const y of [0, 1]) for (const z of [0, 1]) f.push([x, y, z]);
  f.push([0.5, 0.5, 0], [0.5, 0.5, 1], [0.5, 0, 0.5], [0.5, 1, 0.5], [0, 0.5, 0.5], [1, 0.5, 0.5]);
  f.push([0.25, 0.25, 0.25], [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75]);
  const atoms = f.map((p) => ({
    p: p.map((v) => (v - 0.5) * 2) as Vec3,
    r: 0.26,
  }));
  return {
    id: "diamond",
    lattice: true,
    label: "Diamond cubic",
    caption: "Diamond cubic — every atom bonds tetrahedrally to four neighbours.",
    atoms,
    bonds: autoBonds(atoms, 0.866 + 0.04),
    cell: cubeEdges(),
  };
}

export function graphite(): Structure {
  const atoms: StructAtom[] = [];
  const a1: [number, number] = [Math.sqrt(3), 0];
  const a2: [number, number] = [Math.sqrt(3) / 2, 1.5];
  const layers = [
    { y: -0.85, shift: [0, 0] as [number, number] },
    { y: 0.85, shift: [Math.sqrt(3) / 2, 0.5] as [number, number] },
  ];
  for (const L of layers)
    for (let i = -4; i <= 4; i++)
      for (let j = -4; j <= 4; j++)
        for (const b of [
          [0, 0],
          [0, 1],
        ]) {
          const x = i * a1[0] + j * a2[0] + b[0] + L.shift[0] - 0.9;
          const z = i * a1[1] + j * a2[1] + b[1] + L.shift[1] - 1.4;
          if (Math.hypot(x, z) < 2.9) atoms.push({ p: [x * 0.78, L.y, z * 0.78], r: 0.2 });
        }
  const bonds = autoBonds(atoms, 0.78 * 1.05).filter(([i, j]) => atoms[i].p[1] === atoms[j].p[1]);
  return {
    id: "graphite",
    lattice: true,
    label: "Graphite",
    caption: "Graphite — stacked honeycomb sheets, bonded loosely between layers.",
    atoms,
    bonds,
  };
}

function diatomic(id: string, name: string, d: number, r: number, order: number): Structure {
  return {
    id,
    label: name,
    caption: `${name} — bond order ${order}.`,
    atoms: [
      { p: [-d / 2, 0, 0], r },
      { p: [d / 2, 0, 0], r },
    ],
    bonds: [[0, 1, order]],
  };
}

function p4(): Structure {
  const s = 0.75;
  const pts: Vec3[] = [
    [s, s, s],
    [s, -s, -s],
    [-s, s, -s],
    [-s, -s, s],
  ];
  const atoms = pts.map((p) => ({ p, r: 0.42 }));
  const bonds: [number, number, number][] = [];
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) bonds.push([i, j, 1]);
  return { id: "p4", label: "P₄ tetrahedron", caption: "White phosphorus — a strained P₄ tetrahedron.", atoms, bonds };
}

function ring8(id: string, label: string): Structure {
  const atoms: StructAtom[] = [];
  const R = 1.35;
  for (let k = 0; k < 8; k++) {
    const t = (k * Math.PI) / 4;
    atoms.push({ p: [R * Math.cos(t), k % 2 ? 0.38 : -0.38, R * Math.sin(t)], r: 0.34 });
  }
  const bonds: [number, number, number][] = [];
  for (let k = 0; k < 8; k++) bonds.push([k, (k + 1) % 8, 1]);
  return { id, label, caption: `${label} — a puckered eight-membered ring (crown shape).`, atoms, bonds };
}

/** Grey (trigonal) selenium: parallel helical chains with three atoms per turn. */
function seChains(): Structure {
  const atoms: StructAtom[] = [];
  const bonds: [number, number, number][] = [];
  const centres: [number, number][] = [
    [0, 0],
    [1.9, 0],
    [0.95, 1.65],
    [-0.95, 1.65],
    [-1.9, 0],
    [-0.95, -1.65],
    [0.95, -1.65],
  ];
  const perChain = 9;
  centres.forEach(([cx, cz], c) => {
    const first = atoms.length;
    for (let k = 0; k < perChain; k++) {
      const a = (k * 2 * Math.PI) / 3 + c * 0.7;
      atoms.push({ p: [cx + 0.55 * Math.cos(a), (k - (perChain - 1) / 2) * 0.5, cz + 0.55 * Math.sin(a)], r: 0.2 });
      if (k > 0) bonds.push([first + k - 1, first + k, 1]);
    }
  });
  return {
    id: "se-chain",
    lattice: true,
    label: "Grey selenium",
    caption: "Grey (trigonal) selenium — the stable form is made of parallel helical chains, not rings.",
    atoms,
    bonds,
  };
}

function single(symbolLabel: string): Structure {
  return {
    id: "mono",
    label: "Monatomic",
    caption: `${symbolLabel} exists as isolated atoms — no covalent bonds.`,
    atoms: [{ p: [0, 0, 0], r: 0.9 }],
    bonds: [],
  };
}

const BCC = ["Li", "Na", "K", "Rb", "Cs", "Ba", "V", "Cr", "Fe", "Nb", "Mo", "Ta", "W", "Eu", "Ra"];
const FCC = ["Ca", "Sr", "Al", "Ni", "Cu", "Rh", "Pd", "Ag", "Ir", "Pt", "Au", "Pb", "Ac", "Th", "Yb"];
// La, Pr, Nd, Pm are double-hexagonal (ABAC) and Sn is β-Sn (body-centred tetragonal) at room
// temperature, so none of them are listed here — their structure tab is intentionally unavailable.
const HCP = [
  "Be", "Mg", "Sc", "Ti", "Co", "Zn", "Y", "Zr", "Tc", "Ru", "Cd", "Hf", "Re", "Os", "Tl",
  "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Lu",
];
const DIAMOND = ["Si", "Ge"];
const NOBLE = ["He", "Ne", "Ar", "Kr", "Xe", "Rn"];

type Kind = "bcc" | "fcc" | "hcp" | "diamond";

/**
 * Solid–solid transitions at 1 atm: [upper temperature bound in K, structure, label].
 * Above the last bound the final entry applies. `null` structure = not modelled here.
 */
const ALLOTROPES: Record<string, [number, Kind | null, string][]> = {
  Fe: [
    [1185, "bcc", "α-iron (ferrite)"],
    [1667, "fcc", "γ-iron (austenite)"],
    [Infinity, "bcc", "δ-iron"],
  ],
  Ti: [[1155, "hcp", "α-titanium"], [Infinity, "bcc", "β-titanium"]],
  Zr: [[1136, "hcp", "α-zirconium"], [Infinity, "bcc", "β-zirconium"]],
  Co: [[700, "hcp", "ε-cobalt"], [Infinity, "fcc", "α-cobalt"]],
  Ca: [[716, "fcc", "α-calcium"], [Infinity, "bcc", "β-calcium"]],
  Sr: [[835, "fcc", "α-strontium"], [Infinity, "bcc", "β-strontium"]],
  Be: [[1527, "hcp", "α-beryllium"], [Infinity, "bcc", "β-beryllium"]],
  Tl: [[507, "hcp", "α-thallium"], [Infinity, "bcc", "β-thallium"]],
  Sc: [[1610, "hcp", "α-scandium"], [Infinity, "bcc", "β-scandium"]],
  Hf: [[2016, "hcp", "α-hafnium"], [Infinity, "bcc", "β-hafnium"]],
  // grey (α) tin is the diamond-cubic form, stable only below ~13 °C; room-temperature white tin is body-centred tetragonal
  Sn: [[286.4, "diamond", "α-tin (grey tin)"], [Infinity, null, "β-tin"]],
};

const BUILD: Record<Kind, () => Structure> = { bcc, fcc, hcp, diamond };

/** Identifier of the allotrope at temperature `t` (used to avoid rebuilding while a slider moves). */
export function allotropeKey(symbol: string, t: number) {
  const table = ALLOTROPES[symbol];
  if (!table) return "";
  return table.find(([upTo]) => t < upTo)![2];
}

/** Returns one or more selectable structures for the element, or null when no data. */
export function structuresFor(symbol: string, name: string, temp = 298): Structure[] | null {
  const table = ALLOTROPES[symbol];
  if (table) {
    const [upTo, kind, label] = table.find(([u]) => temp < u)!;
    if (!kind) return null;
    const s = BUILD[kind]();
    const lower = table[table.indexOf(table.find(([u]) => temp < u)!) - 1]?.[0];
    const range = lower ? `${lower} K – ${Number.isFinite(upTo) ? `${upTo} K` : "melting point"}` : Number.isFinite(upTo) ? `below ${upTo} K` : "";
    return [{ ...s, id: `${s.id}-${label}`, label, caption: `${label} — ${s.caption}${range ? ` Stable ${range} at 1 atm.` : ""}` }];
  }
  if (symbol === "C") return [diamond(), graphite()];
  if (BCC.includes(symbol)) return [bcc()];
  if (FCC.includes(symbol)) return [fcc()];
  if (HCP.includes(symbol)) return [hcp()];
  if (DIAMOND.includes(symbol)) return [diamond()];
  if (NOBLE.includes(symbol)) return [single(name)];
  switch (symbol) {
    // bond lengths are the real values in Å (H₂ 0.74, N₂ 1.10, O₂ 1.21, F₂ 1.42, Cl₂ 1.99, Br₂ 2.28,
    // I₂ 2.67); ball radii are 0.6 × covalent radius so that the relative sizes stay honest.
    case "H":
      return [diatomic("h2", "H₂ molecule", 0.74, 0.19, 1)];
    case "N":
      return [diatomic("n2", "N₂ molecule", 1.1, 0.43, 3)];
    case "O":
      return [diatomic("o2", "O₂ molecule", 1.21, 0.4, 2)];
    case "F":
      return [diatomic("f2", "F₂ molecule", 1.42, 0.34, 1)];
    case "Cl":
      return [diatomic("cl2", "Cl₂ molecule", 1.99, 0.61, 1)];
    case "Br":
      return [diatomic("br2", "Br₂ molecule", 2.28, 0.72, 1)];
    case "I":
      return [diatomic("i2", "I₂ molecule", 2.67, 0.83, 1)];
    case "P":
      return [p4()];
    case "S":
      return [ring8("s8", "S₈ crown ring")];
    case "Se":
      return [seChains()];
    default:
      return null;
  }
}
