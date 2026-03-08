import type { LayoutGraph, LayoutSection, SectionType, Alignment, ImagePlacement, Orientation } from "../../shared/layoutEngine";
import type { LayoutEntropy } from "./layoutEntropy";
import type { ComponentVariant, ComponentCategory } from "../components/componentVariants";
import { selectComponentVariant } from "../components/componentVariants";

export interface ComposerContext {
  pageType?: string;
  domain?: string;
  isDashboard?: boolean;
  productType?: string;
  componentSeed: string;
}

type BuildingBlock =
  | "hero"
  | "content-grid"
  | "asymmetric-layout"
  | "sidebar-layout"
  | "dashboard-panel"
  | "card-cluster"
  | "split-layout"
  | "stack-layout"
  | "data-panel"
  | "interactive-module"
  | "stats-bar"
  | "testimonial-block"
  | "cta-block"
  | "footer";

interface BlockDefinition {
  block: BuildingBlock;
  sectionType: SectionType;
  componentCategory: ComponentCategory;
  weight: number;
  dashboardOnly?: boolean;
  marketingOnly?: boolean;
}

const BLOCK_DEFINITIONS: BlockDefinition[] = [
  { block: "hero", sectionType: "hero", componentCategory: "hero", weight: 1 },
  { block: "content-grid", sectionType: "featureGrid", componentCategory: "card", weight: 3 },
  { block: "asymmetric-layout", sectionType: "featureGrid", componentCategory: "card", weight: 2 },
  { block: "sidebar-layout", sectionType: "featureGrid", componentCategory: "navigation", weight: 2, dashboardOnly: true },
  { block: "dashboard-panel", sectionType: "stats", componentCategory: "dashboard", weight: 3, dashboardOnly: true },
  { block: "card-cluster", sectionType: "cardList", componentCategory: "card", weight: 3 },
  { block: "split-layout", sectionType: "featureGrid", componentCategory: "form", weight: 2 },
  { block: "stack-layout", sectionType: "cardList", componentCategory: "card", weight: 2 },
  { block: "data-panel", sectionType: "stats", componentCategory: "dataTable", weight: 2 },
  { block: "interactive-module", sectionType: "featureGrid", componentCategory: "actionPanel", weight: 1 },
  { block: "stats-bar", sectionType: "stats", componentCategory: "dashboard", weight: 2 },
  { block: "testimonial-block", sectionType: "testimonial", componentCategory: "card", weight: 2, marketingOnly: true },
  { block: "cta-block", sectionType: "cta", componentCategory: "actionPanel", weight: 2 },
  { block: "footer", sectionType: "footer", componentCategory: "navigation", weight: 1 },
];

function seedByte(seed: string, offset: number): number {
  const idx = (offset * 2) % Math.max(1, seed.length - 1);
  return parseInt(seed.slice(idx, idx + 2) || "00", 16);
}

function getAvailableBlocks(context: ComposerContext): BlockDefinition[] {
  const isDashboard = context.isDashboard ||
    context.pageType === "dashboard" ||
    context.pageType === "web_app";
  const isMarketing = context.pageType === "landing_page" ||
    context.pageType === "marketing_site";

  return BLOCK_DEFINITIONS.filter(b => {
    if (b.block === "hero" || b.block === "footer") return false;
    if (b.dashboardOnly && !isDashboard) return false;
    if (b.marketingOnly && !isMarketing && !(!context.pageType)) return false;
    return true;
  });
}

function selectMiddleBlocks(
  entropy: LayoutEntropy,
  available: BlockDefinition[],
  seed: string,
): BlockDefinition[] {
  const count = Math.max(1, entropy.sectionCount - 2);
  const selected: BlockDefinition[] = [];
  const used = new Set<string>();

  const weightedPool: BlockDefinition[] = [];
  for (const b of available) {
    for (let w = 0; w < b.weight; w++) {
      weightedPool.push(b);
    }
  }

  for (let i = 0; i < count && weightedPool.length > 0; i++) {
    const idx = seedByte(seed, i * 3) % weightedPool.length;
    const chosen = weightedPool[idx];

    if (used.has(chosen.block) && available.length > count) {
      const alt = seedByte(seed, i * 3 + 1) % available.length;
      const altBlock = available[alt];
      if (!used.has(altBlock.block)) {
        selected.push(altBlock);
        used.add(altBlock.block);
        continue;
      }
    }

    selected.push(chosen);
    used.add(chosen.block);
  }

  return applyOrdering(selected, entropy, seed);
}

function applyOrdering(
  blocks: BlockDefinition[],
  entropy: LayoutEntropy,
  seed: string,
): BlockDefinition[] {
  const arr = [...blocks];

  switch (entropy.sectionOrder) {
    case "inverted":
      arr.reverse();
      break;
    case "alternating": {
      const heavy = arr.filter((_, i) => i % 2 === 0);
      const light = arr.filter((_, i) => i % 2 !== 0);
      arr.length = 0;
      for (let i = 0; i < Math.max(heavy.length, light.length); i++) {
        if (i < light.length) arr.push(light[i]);
        if (i < heavy.length) arr.push(heavy[i]);
      }
      break;
    }
    case "front-loaded":
      arr.sort((a, b) => b.weight - a.weight);
      break;
    case "back-loaded":
      arr.sort((a, b) => a.weight - b.weight);
      break;
    case "bookend": {
      if (arr.length >= 3) {
        const mid = arr.splice(1, arr.length - 2);
        mid.reverse();
        arr.splice(1, 0, ...mid);
      }
      break;
    }
    case "cascading": {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = seedByte(seed, 30 + i) % (i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      break;
    }
    default:
      break;
  }

  return arr;
}

function resolveAlignment(
  entropy: LayoutEntropy,
  sectionIndex: number,
  seed: string,
): Alignment {
  switch (entropy.alignmentPattern) {
    case "centered": return "center";
    case "left-heavy": return sectionIndex % 3 === 0 ? "center" : "left";
    case "right-heavy": return sectionIndex % 3 === 0 ? "center" : "right";
    case "alternating": return sectionIndex % 2 === 0 ? "left" : "right";
    case "progressive-indent": {
      const aligns: Alignment[] = ["left", "center", "right"];
      return aligns[sectionIndex % 3];
    }
    case "mixed": {
      const options: Alignment[] = ["left", "center", "right"];
      return options[seedByte(seed, 40 + sectionIndex) % 3];
    }
    default: return "center";
  }
}

function resolveColumns(
  entropy: LayoutEntropy,
  sectionIndex: number,
  block: BlockDefinition,
  variant: ComponentVariant,
): number | undefined {
  if (block.sectionType === "hero" || block.sectionType === "footer" ||
      block.sectionType === "cta" || block.sectionType === "testimonial") {
    return undefined;
  }

  if (variant.columns) return variant.columns;

  const entropyCol = entropy.columnVariation[sectionIndex] ?? 2;

  switch (entropy.gridPattern) {
    case "uniform": return entropyCol;
    case "progressive": return Math.min(4, entropyCol + Math.floor(sectionIndex / 2));
    case "alternating-width": return sectionIndex % 2 === 0 ? entropyCol : Math.max(1, entropyCol - 1);
    case "asymmetric": return sectionIndex % 2 === 0 ? 3 : 1;
    case "masonry": return Math.min(4, 2 + (sectionIndex % 3));
    case "sidebar-main": return sectionIndex === 0 ? 1 : entropyCol;
    case "split-equal": return 2;
    default: return entropyCol;
  }
}

function resolveOrientation(
  variant: ComponentVariant,
  block: BuildingBlock,
): Orientation {
  if (variant.orientation === "horizontal" || variant.orientation === "split") {
    return "horizontal";
  }
  if (variant.orientation === "vertical" || variant.orientation === "stacked") {
    return "vertical";
  }
  if (block === "split-layout" || block === "asymmetric-layout") return "horizontal";
  if (block === "stack-layout") return "vertical";
  return "horizontal";
}

function resolveImagePlacement(
  block: BuildingBlock,
  variant: ComponentVariant,
  seed: string,
  index: number,
): ImagePlacement {
  if (!variant.hasMedia) return "none";
  if (block === "stats-bar" || block === "data-panel" || block === "footer") return "none";

  const placements: ImagePlacement[] = ["left", "right", "top"];
  if (block === "hero") {
    return placements[seedByte(seed, 50 + index) % 3];
  }
  if (block === "split-layout" || block === "asymmetric-layout") {
    return seedByte(seed, 50 + index) % 2 === 0 ? "left" : "right";
  }
  return placements[seedByte(seed, 50 + index) % placements.length];
}

function resolveCardCount(
  block: BuildingBlock,
  entropy: LayoutEntropy,
  seed: string,
  index: number,
): number | undefined {
  if (block !== "card-cluster" && block !== "testimonial-block" && block !== "stack-layout") {
    return undefined;
  }
  const base = entropy.contentDensity === "dense" ? 4
    : entropy.contentDensity === "ultra-dense" ? 6
    : entropy.contentDensity === "sparse" ? 2
    : 3;
  return base + (seedByte(seed, 60 + index) % 2);
}

export function composeLayout(
  entropy: LayoutEntropy,
  context: ComposerContext,
): LayoutGraph {
  const available = getAvailableBlocks(context);
  const middleBlocks = selectMiddleBlocks(entropy, available, context.componentSeed);

  const heroBlock = BLOCK_DEFINITIONS.find(b => b.block === "hero")!;
  const footerBlock = BLOCK_DEFINITIONS.find(b => b.block === "footer")!;
  const allBlocks = [heroBlock, ...middleBlocks, footerBlock];

  const sections: LayoutSection[] = allBlocks.map((block, i) => {
    const variant = selectComponentVariant(block.componentCategory, context.componentSeed);

    const alignment = block.block === "footer"
      ? "center" as Alignment
      : resolveAlignment(entropy, i, context.componentSeed);

    const columns = resolveColumns(entropy, i, block, variant);
    const orientation = resolveOrientation(variant, block.block);
    const imagePlacement = resolveImagePlacement(block.block, variant, context.componentSeed, i);
    const cardCount = resolveCardCount(block.block, entropy, context.componentSeed, i);

    const section: LayoutSection = {
      type: block.sectionType,
      alignment,
      imagePlacement,
      orientation,
    };

    if (columns !== undefined) section.columns = columns;
    if (cardCount !== undefined) section.cardCount = cardCount;
    if (variant.id) section.componentType = variant.id;

    return section;
  });

  const alignCounts: Record<Alignment, number> = { left: 0, center: 0, right: 0 };
  sections.forEach(s => alignCounts[s.alignment]++);
  const dominantAlignment = (
    Object.entries(alignCounts).sort((a, b) => b[1] - a[1])[0][0]
  ) as Alignment;

  const hasMedia = sections.some(s => s.imagePlacement !== "none");
  const gridStyle: "fixed" | "responsive" =
    entropy.gridPattern === "uniform" || entropy.gridPattern === "split-equal"
      ? "fixed" : "responsive";

  return {
    sections,
    metadata: {
      sectionCount: sections.length,
      dominantAlignment,
      hasMedia,
      gridStyle,
    },
  };
}
