import { createHash } from "crypto";
import type { ProjectSeeds } from "../seed/projectSeeds";

export type SectionOrderPattern =
  | "standard"
  | "inverted"
  | "alternating"
  | "front-loaded"
  | "back-loaded"
  | "bookend"
  | "cascading";

export type GridPattern =
  | "uniform"
  | "progressive"
  | "alternating-width"
  | "asymmetric"
  | "masonry"
  | "sidebar-main"
  | "split-equal";

export type AlignmentPattern =
  | "centered"
  | "left-heavy"
  | "right-heavy"
  | "alternating"
  | "progressive-indent"
  | "mixed";

export type NavigationStructure =
  | "top-bar"
  | "sidebar"
  | "tabbed"
  | "breadcrumb"
  | "rail"
  | "bottom-bar";

export type ContentDensity =
  | "sparse"
  | "balanced"
  | "dense"
  | "ultra-dense";

export interface LayoutEntropy {
  sectionOrder: SectionOrderPattern;
  gridPattern: GridPattern;
  alignmentPattern: AlignmentPattern;
  navigationStructure: NavigationStructure;
  contentDensity: ContentDensity;
  sectionCount: number;
  columnVariation: number[];
  spacingScale: number;
  spacingRatio: number;
  componentGrouping: number;
  entropyHash: string;
}

const SECTION_ORDERS: SectionOrderPattern[] = [
  "standard", "inverted", "alternating", "front-loaded",
  "back-loaded", "bookend", "cascading",
];

const GRID_PATTERNS: GridPattern[] = [
  "uniform", "progressive", "alternating-width", "asymmetric",
  "masonry", "sidebar-main", "split-equal",
];

const ALIGNMENT_PATTERNS: AlignmentPattern[] = [
  "centered", "left-heavy", "right-heavy",
  "alternating", "progressive-indent", "mixed",
];

const NAV_STRUCTURES: NavigationStructure[] = [
  "top-bar", "sidebar", "tabbed", "breadcrumb", "rail", "bottom-bar",
];

const CONTENT_DENSITIES: ContentDensity[] = [
  "sparse", "balanced", "dense", "ultra-dense",
];

function seedByte(seed: string, offset: number): number {
  const idx = (offset * 2) % Math.max(1, seed.length - 1);
  const val = parseInt(seed.slice(idx, idx + 2) || "00", 16);
  return Number.isNaN(val) ? (offset * 37 + 13) % 256 : val;
}

function seededFloat(seed: string, offset: number): number {
  return seedByte(seed, offset) / 255;
}

function pick<T>(arr: T[], seed: string, offset: number): T {
  return arr[seedByte(seed, offset) % arr.length];
}

function generateColumnVariation(seed: string, count: number): number[] {
  const cols: number[] = [];
  for (let i = 0; i < count; i++) {
    const base = 1 + (seedByte(seed, 20 + i) % 4);
    cols.push(base);
  }
  return cols;
}

export interface LayoutEntropyContext {
  pageType?: string;
  domain?: string;
  isDashboard?: boolean;
  isContentHeavy?: boolean;
}

export function generateLayoutEntropy(
  seeds: ProjectSeeds,
  context?: LayoutEntropyContext,
): LayoutEntropy {
  const ls = seeds.layoutSeed;
  const ss = seeds.spacingSeed;

  let sectionOrder = pick(SECTION_ORDERS, ls, 0);
  let gridPattern = pick(GRID_PATTERNS, ls, 2);
  let alignmentPattern = pick(ALIGNMENT_PATTERNS, ls, 4);
  let navStructure = pick(NAV_STRUCTURES, ls, 6);
  let contentDensity = pick(CONTENT_DENSITIES, ls, 8);

  if (context?.isDashboard) {
    if (gridPattern === "uniform") gridPattern = "sidebar-main";
    if (contentDensity === "sparse") contentDensity = "balanced";
    if (navStructure === "bottom-bar") navStructure = "sidebar";
  }

  if (context?.isContentHeavy) {
    if (contentDensity === "sparse") contentDensity = "dense";
  }

  if (context?.pageType === "landing_page" || context?.pageType === "marketing_site") {
    if (navStructure === "sidebar" || navStructure === "rail") navStructure = "top-bar";
    if (contentDensity === "ultra-dense") contentDensity = "balanced";
  }

  const rawSectionCount = 3 + (seedByte(ls, 10) % 5);
  const sectionCount = context?.isDashboard
    ? Math.min(rawSectionCount, 5)
    : Math.min(rawSectionCount, 7);

  const columnVariation = generateColumnVariation(ls, sectionCount);

  const spacingBase = 12 + (seedByte(ss, 0) % 12);
  const spacingRatio = 1.1 + (seededFloat(ss, 2) * 0.5);

  const componentGrouping = 1 + (seedByte(ls, 14) % 4);

  const entropyHash = createHash("sha256")
    .update([
      sectionOrder, gridPattern, alignmentPattern,
      navStructure, contentDensity,
      sectionCount, columnVariation.join(","),
      spacingBase.toFixed(1), spacingRatio.toFixed(3),
      componentGrouping,
    ].join("|"))
    .digest("hex")
    .slice(0, 16);

  return {
    sectionOrder,
    gridPattern,
    alignmentPattern,
    navigationStructure: navStructure,
    contentDensity,
    sectionCount,
    columnVariation,
    spacingScale: spacingBase,
    spacingRatio,
    componentGrouping,
    entropyHash,
  };
}

export function perturbEntropy(
  entropy: LayoutEntropy,
  perturbSeed: string,
): LayoutEntropy {
  const newOrder = pick(
    SECTION_ORDERS.filter(o => o !== entropy.sectionOrder),
    perturbSeed, 0,
  );
  const newGrid = pick(
    GRID_PATTERNS.filter(g => g !== entropy.gridPattern),
    perturbSeed, 2,
  );
  const newAlign = pick(
    ALIGNMENT_PATTERNS.filter(a => a !== entropy.alignmentPattern),
    perturbSeed, 4,
  );
  const newDensity = pick(
    CONTENT_DENSITIES.filter(d => d !== entropy.contentDensity),
    perturbSeed, 6,
  );

  const newColVariation = entropy.columnVariation.map((c, i) => {
    const shift = (seedByte(perturbSeed, 10 + i) % 3) - 1;
    return Math.max(1, Math.min(4, c + shift));
  });

  const newSectionCount = Math.max(3, Math.min(7,
    entropy.sectionCount + ((seedByte(perturbSeed, 20) % 3) - 1),
  ));

  const entropyHash = createHash("sha256")
    .update([
      newOrder, newGrid, newAlign,
      entropy.navigationStructure, newDensity,
      newSectionCount, newColVariation.join(","),
      entropy.spacingScale.toFixed(1), entropy.spacingRatio.toFixed(3),
      entropy.componentGrouping,
    ].join("|"))
    .digest("hex")
    .slice(0, 16);

  return {
    ...entropy,
    sectionOrder: newOrder,
    gridPattern: newGrid,
    alignmentPattern: newAlign,
    contentDensity: newDensity,
    columnVariation: newColVariation,
    sectionCount: newSectionCount,
    entropyHash,
  };
}
