import { createHash } from "crypto";

export type HeroType =
  | "centered-hero"
  | "left-heavy-hero"
  | "right-heavy-hero"
  | "split-hero"
  | "minimal-hero"
  | "fullscreen-hero"
  | "video-hero"
  | "card-hero";

export type VisualHierarchy =
  | "top-heavy"
  | "even-distribution"
  | "bottom-heavy"
  | "center-focused"
  | "progressive-disclosure"
  | "inverted-pyramid";

export type ComponentGroupingStyle =
  | "isolated"
  | "clustered"
  | "paired"
  | "sequential"
  | "nested";

export interface LayoutDNA {
  heroType: HeroType;
  sectionOrder: string[];
  gridStructure: string;
  navigationType: string;
  contentDensity: string;
  componentGrouping: ComponentGroupingStyle;
  visualHierarchy: VisualHierarchy;
  sectionCount: number;
  columnPattern: number[];
  orientationPattern: string[];
  imagePlacementPattern: string[];
  cardCountPattern: number[];
  hash: string;
}

const HERO_TYPES: HeroType[] = [
  "centered-hero", "left-heavy-hero", "right-heavy-hero", "split-hero",
  "minimal-hero", "fullscreen-hero", "video-hero", "card-hero",
];

const VISUAL_HIERARCHIES: VisualHierarchy[] = [
  "top-heavy", "even-distribution", "bottom-heavy",
  "center-focused", "progressive-disclosure", "inverted-pyramid",
];

const GROUPING_STYLES: ComponentGroupingStyle[] = [
  "isolated", "clustered", "paired", "sequential", "nested",
];

const GRID_STRUCTURES = [
  "uniform-grid", "progressive-grid", "alternating-grid", "asymmetric-grid",
  "masonry-grid", "sidebar-main-grid", "split-equal-grid", "single-column",
  "wide-narrow-wide", "narrow-wide-narrow",
];

const NAV_TYPES = [
  "top-bar", "sidebar", "tabbed", "breadcrumb", "rail", "bottom-bar",
  "floating-bar", "hamburger-only",
];

const DENSITY_LEVELS = [
  "sparse", "relaxed", "balanced", "compact", "dense", "ultra-dense",
];

const SECTION_POOLS: Record<string, string[]> = {
  landing: [
    "featureGrid", "cardList", "testimonial", "cta", "stats",
    "featureGrid", "cardList", "cta",
  ],
  dashboard: [
    "stats", "featureGrid", "cardList", "stats",
    "featureGrid", "stats", "cardList",
  ],
  product_dashboard: [
    "stats", "featureGrid", "cardList", "stats",
    "featureGrid", "cardList", "stats",
  ],
  admin_dashboard: [
    "stats", "featureGrid", "cardList", "stats",
    "featureGrid", "stats",
  ],
  analytics_dashboard: [
    "stats", "stats", "featureGrid", "cardList",
    "stats", "featureGrid", "stats",
  ],
  internal_tool: [
    "stats", "featureGrid", "cardList",
    "featureGrid", "stats", "cardList",
  ],
  data_management: [
    "featureGrid", "cardList", "stats",
    "featureGrid", "cardList",
  ],
  data_management_interface: [
    "featureGrid", "cardList", "stats",
    "featureGrid", "cardList",
  ],
  workflow_management: [
    "featureGrid", "cardList", "stats",
    "cardList", "featureGrid",
  ],
  workflow_management_interface: [
    "featureGrid", "cardList", "stats",
    "cardList", "featureGrid",
  ],
  web_application: [
    "featureGrid", "stats", "cardList", "cta",
    "featureGrid", "stats", "cardList",
  ],
  webapp: [
    "featureGrid", "stats", "cardList", "cta",
    "featureGrid", "stats", "cardList",
  ],
  ecommerce: [
    "featureGrid", "cardList", "stats", "testimonial", "cta",
    "cardList", "featureGrid",
  ],
  generic: [
    "featureGrid", "cardList", "stats", "testimonial", "cta",
    "featureGrid", "cardList", "stats",
  ],
};

const ALIGNMENT_OPTIONS = ["left", "center", "right"];
const ORIENTATION_OPTIONS = ["horizontal", "vertical"];
const IMAGE_OPTIONS = ["left", "right", "top", "none"];

function seedByte(seed: string, offset: number): number {
  const idx = (offset * 2) % Math.max(1, seed.length - 1);
  const val = parseInt(seed.slice(idx, idx + 2) || "00", 16);
  return Number.isNaN(val) ? (offset * 37 + 13) % 256 : val;
}

function pickFrom<T>(arr: T[], seed: string, offset: number): T {
  return arr[seedByte(seed, offset) % arr.length];
}

function computeDNAHash(dna: Omit<LayoutDNA, "hash">): string {
  const raw = [
    dna.heroType,
    dna.sectionOrder.join(","),
    dna.gridStructure,
    dna.navigationType,
    dna.contentDensity,
    dna.componentGrouping,
    dna.visualHierarchy,
    dna.sectionCount,
    dna.columnPattern.join(","),
    dna.orientationPattern.join(","),
    dna.imagePlacementPattern.join(","),
    dna.cardCountPattern.join(","),
  ].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export interface DNAContext {
  pageType?: string;
  domain?: string;
  isDashboard?: boolean;
  productType?: string;
  interfaceCategory?: string;
}

export function generateLayoutDNA(seed: string, context?: DNAContext): LayoutDNA {
  const heroType = pickFrom(HERO_TYPES, seed, 0);
  const gridStructure = pickFrom(GRID_STRUCTURES, seed, 2);
  const navigationType = pickFrom(NAV_TYPES, seed, 4);
  let contentDensity = pickFrom(DENSITY_LEVELS, seed, 6);
  const visualHierarchy = pickFrom(VISUAL_HIERARCHIES, seed, 8);
  const componentGrouping = pickFrom(GROUPING_STYLES, seed, 10);

  const isDash = context?.isDashboard ||
    context?.pageType === "dashboard" || context?.pageType === "web_app";
  const isLanding = context?.pageType === "landing_page" || context?.pageType === "marketing_site";

  if (isLanding && contentDensity === "ultra-dense") contentDensity = "balanced";
  if (isDash && contentDensity === "sparse") contentDensity = "balanced";

  const rawCount = 3 + (seedByte(seed, 12) % 5);
  const sectionCount = isDash ? Math.min(rawCount, 5) : Math.min(rawCount, 7);

  const catKey = context?.interfaceCategory;
  const pool = (catKey && SECTION_POOLS[catKey])
    ? SECTION_POOLS[catKey]
    : isDash ? SECTION_POOLS.dashboard
    : isLanding ? SECTION_POOLS.landing
    : context?.pageType === "ecommerce_store" ? SECTION_POOLS.ecommerce
    : SECTION_POOLS.generic;

  const sectionOrder: string[] = [];
  const usedTypes = new Set<string>();
  for (let i = 0; i < sectionCount - 2; i++) {
    const idx = seedByte(seed, 14 + i * 2) % pool.length;
    const section = pool[idx];
    if (usedTypes.has(section) && pool.length > sectionCount) {
      const alt = pool[(idx + seedByte(seed, 15 + i * 2)) % pool.length];
      if (!usedTypes.has(alt)) {
        sectionOrder.push(alt);
        usedTypes.add(alt);
        continue;
      }
    }
    sectionOrder.push(section);
    usedTypes.add(section);
  }

  const ordering = seedByte(seed, 40) % 7;
  if (ordering === 1) sectionOrder.reverse();
  else if (ordering === 2) {
    for (let i = sectionOrder.length - 1; i > 0; i--) {
      const j = seedByte(seed, 42 + i) % (i + 1);
      [sectionOrder[i], sectionOrder[j]] = [sectionOrder[j], sectionOrder[i]];
    }
  } else if (ordering === 3) {
    sectionOrder.sort();
  }

  const columnPattern: number[] = [];
  const orientationPattern: string[] = [];
  const imagePlacementPattern: string[] = [];
  const cardCountPattern: number[] = [];

  for (let i = 0; i < sectionCount; i++) {
    columnPattern.push(1 + (seedByte(seed, 50 + i) % 4));
    orientationPattern.push(pickFrom(ORIENTATION_OPTIONS, seed, 60 + i));
    imagePlacementPattern.push(pickFrom(IMAGE_OPTIONS, seed, 70 + i));

    const densityBase = contentDensity === "dense" || contentDensity === "ultra-dense" ? 4
      : contentDensity === "sparse" ? 2
      : 3;
    cardCountPattern.push(densityBase + (seedByte(seed, 80 + i) % 3));
  }

  const dna: Omit<LayoutDNA, "hash"> = {
    heroType,
    sectionOrder,
    gridStructure,
    navigationType,
    contentDensity,
    componentGrouping,
    visualHierarchy,
    sectionCount,
    columnPattern,
    orientationPattern,
    imagePlacementPattern,
    cardCountPattern,
  };

  return { ...dna, hash: computeDNAHash(dna) };
}

export function mutateDNA(dna: LayoutDNA, mutationSeed: string): LayoutDNA {
  const newHero = pickFrom(HERO_TYPES.filter(h => h !== dna.heroType), mutationSeed, 0);
  const newGrid = pickFrom(GRID_STRUCTURES.filter(g => g !== dna.gridStructure), mutationSeed, 2);
  const newHierarchy = pickFrom(VISUAL_HIERARCHIES.filter(v => v !== dna.visualHierarchy), mutationSeed, 4);
  const newGrouping = pickFrom(GROUPING_STYLES.filter(g => g !== dna.componentGrouping), mutationSeed, 6);

  const newSectionOrder = [...dna.sectionOrder];
  for (let i = newSectionOrder.length - 1; i > 0; i--) {
    const j = seedByte(mutationSeed, 10 + i) % (i + 1);
    [newSectionOrder[i], newSectionOrder[j]] = [newSectionOrder[j], newSectionOrder[i]];
  }

  const newColumns = dna.columnPattern.map((c, i) => {
    const shift = (seedByte(mutationSeed, 20 + i) % 3) - 1;
    return Math.max(1, Math.min(4, c + shift));
  });

  const newOrientations = dna.orientationPattern.map((_, i) =>
    pickFrom(ORIENTATION_OPTIONS, mutationSeed, 30 + i),
  );

  const newImagePlacements = dna.imagePlacementPattern.map((_, i) =>
    pickFrom(IMAGE_OPTIONS, mutationSeed, 40 + i),
  );

  const mutated: Omit<LayoutDNA, "hash"> = {
    heroType: newHero,
    sectionOrder: newSectionOrder,
    gridStructure: newGrid,
    navigationType: dna.navigationType,
    contentDensity: dna.contentDensity,
    componentGrouping: newGrouping,
    visualHierarchy: newHierarchy,
    sectionCount: dna.sectionCount,
    columnPattern: newColumns,
    orientationPattern: newOrientations,
    imagePlacementPattern: newImagePlacements,
    cardCountPattern: dna.cardCountPattern,
  };

  return { ...mutated, hash: computeDNAHash(mutated) };
}

export function computeDNASimilarity(a: LayoutDNA, b: LayoutDNA): number {
  if (a.hash === b.hash) return 1.0;

  let score = 0;
  let dims = 0;

  dims++; if (a.heroType === b.heroType) score++;
  dims++; if (a.gridStructure === b.gridStructure) score++;
  dims++; if (a.navigationType === b.navigationType) score++;
  dims++; if (a.contentDensity === b.contentDensity) score++;
  dims++; if (a.visualHierarchy === b.visualHierarchy) score++;
  dims++; if (a.componentGrouping === b.componentGrouping) score++;
  dims++; if (a.sectionCount === b.sectionCount) score++;

  dims++;
  const orderOverlap = a.sectionOrder.filter((s, i) => b.sectionOrder[i] === s).length;
  score += orderOverlap / Math.max(1, Math.max(a.sectionOrder.length, b.sectionOrder.length));

  dims++;
  const colOverlap = a.columnPattern.filter((c, i) => b.columnPattern[i] === c).length;
  score += colOverlap / Math.max(1, Math.max(a.columnPattern.length, b.columnPattern.length));

  return score / dims;
}
