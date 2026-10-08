import raw from "@/data/elements.json";

export interface ChemElement {
  name: string;
  symbol: string;
  number: number;
  mass: number;
  category: string;
  xpos: number;
  ypos: number;
  period: number;
  group: number;
  melt: number | null;
  boil: number | null;
  density: number | null;
  phase: string;
  config: string;
  shells: number[];
  appearance: string | null;
  electronegativity: number | null;
  color: string | null;
  summary: string;
}

export const elements = raw as ChemElement[];

/** Simplified categories used for filtering and styling. */
export type CategoryKey =
  | "alkali"
  | "alkaline"
  | "transition"
  | "post-transition"
  | "metalloid"
  | "nonmetal"
  | "noble"
  | "lanthanide"
  | "actinide"
  | "unknown";

export const CATEGORIES: { key: CategoryKey; label: string; hue: number }[] = [
  { key: "alkali", label: "Alkali metal", hue: 25 },
  { key: "alkaline", label: "Alkaline earth", hue: 70 },
  { key: "transition", label: "Transition metal", hue: 240 },
  { key: "post-transition", label: "Post-transition", hue: 200 },
  { key: "metalloid", label: "Metalloid", hue: 150 },
  { key: "nonmetal", label: "Nonmetal", hue: 110 },
  { key: "noble", label: "Noble gas", hue: 300 },
  { key: "lanthanide", label: "Lanthanide", hue: 330 },
  { key: "actinide", label: "Actinide", hue: 5 },
  { key: "unknown", label: "Unknown", hue: 0 },
];

export function categoryOf(el: ChemElement): CategoryKey {
  const c = el.category;
  if (c.startsWith("unknown")) return "unknown";
  if (c.includes("alkali metal")) return "alkali";
  if (c.includes("alkaline")) return "alkaline";
  if (c.includes("post-transition")) return "post-transition";
  if (c.includes("transition")) return "transition";
  if (c.includes("metalloid")) return "metalloid";
  if (c.includes("noble")) return "noble";
  if (c.includes("lanthanide")) return "lanthanide";
  if (c.includes("actinide")) return "actinide";
  return "nonmetal";
}

export function categoryLabel(key: CategoryKey) {
  return CATEGORIES.find((c) => c.key === key)!.label;
}

export function categoryHue(key: CategoryKey) {
  return CATEGORIES.find((c) => c.key === key)!.hue;
}

export const toCelsius = (k: number) => k - 273.15;
