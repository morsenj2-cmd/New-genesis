import type { LayoutGraph, LayoutSection, SectionType, Alignment, ImagePlacement, Orientation } from "../../shared/layoutEngine";
import type { LayoutDNA, HeroType } from "./layoutDNA";
import type { ArchitectureVariant } from "../components/architectureVariants";
import { selectArchitectureVariant } from "../components/architectureVariants";

export interface StructuralContext {
  pageType?: string;
  domain?: string;
  isDashboard?: boolean;
  productType?: string;
  componentSeed: string;
  mediaAllowed?: boolean;
}

type LayoutPrimitive =
  | "vertical-stack"
  | "split-grid"
  | "asymmetric-grid"
  | "sidebar-layout"
  | "centered-hero"
  | "left-heavy-hero"
  | "right-heavy-hero"
  | "masonry-grid"
  | "content-bands"
  | "floating-panels"
  | "dashboard-clusters"
  | "full-width-section";

function seedByte(seed: string, offset: number): number {
  const idx = (offset * 2) % Math.max(1, seed.length - 1);
  const val = parseInt(seed.slice(idx, idx + 2) || "00", 16);
  return Number.isNaN(val) ? (offset * 37 + 13) % 256 : val;
}

function heroTypeToSection(dna: LayoutDNA, seed: string, mediaAllowed?: boolean): LayoutSection {
  const heroMap: Record<HeroType, Partial<LayoutSection>> = {
    "centered-hero": { alignment: "center", imagePlacement: "top", orientation: "vertical" },
    "left-heavy-hero": { alignment: "left", imagePlacement: "right", orientation: "horizontal" },
    "right-heavy-hero": { alignment: "right", imagePlacement: "left", orientation: "horizontal" },
    "split-hero": { alignment: "left", imagePlacement: "right", orientation: "horizontal" },
    "minimal-hero": { alignment: "center", imagePlacement: "none", orientation: "vertical" },
    "fullscreen-hero": { alignment: "center", imagePlacement: "top", orientation: "vertical" },
    "video-hero": { alignment: "center", imagePlacement: "top", orientation: "vertical" },
    "card-hero": { alignment: "center", imagePlacement: "none", orientation: "horizontal" },
  };

  const heroProps = heroMap[dna.heroType] || heroMap["centered-hero"];
  const variant = selectArchitectureVariant("hero", seed, 0);

  const resolvedImagePlacement = mediaAllowed
    ? (heroProps.imagePlacement as ImagePlacement)
    : ("none" as ImagePlacement);

  return {
    type: "hero" as SectionType,
    alignment: heroProps.alignment as Alignment,
    imagePlacement: resolvedImagePlacement,
    orientation: heroProps.orientation as Orientation,
    componentType: variant?.id,
  };
}

function selectPrimitive(
  sectionType: string,
  dna: LayoutDNA,
  sectionIndex: number,
  seed: string,
): LayoutPrimitive {
  const primitiveMap: Record<string, LayoutPrimitive[]> = {
    featureGrid: ["split-grid", "asymmetric-grid", "masonry-grid", "content-bands", "full-width-section"],
    cardList: ["vertical-stack", "masonry-grid", "floating-panels", "content-bands"],
    stats: ["dashboard-clusters", "split-grid", "content-bands", "full-width-section"],
    testimonial: ["vertical-stack", "floating-panels", "content-bands"],
    cta: ["full-width-section", "content-bands", "split-grid"],
  };

  const options = primitiveMap[sectionType] || ["vertical-stack", "content-bands"];
  return options[seedByte(seed, sectionIndex * 7) % options.length];
}

function primitiveToSectionProps(
  primitive: LayoutPrimitive,
  dna: LayoutDNA,
  sectionIndex: number,
): Partial<LayoutSection> {
  switch (primitive) {
    case "vertical-stack":
      return {
        orientation: "vertical",
        columns: 1,
        alignment: "center",
      };
    case "split-grid":
      return {
        orientation: "horizontal",
        columns: 2,
        alignment: dna.columnPattern[sectionIndex] % 2 === 0 ? "left" : "right",
      };
    case "asymmetric-grid":
      return {
        orientation: "horizontal",
        columns: dna.columnPattern[sectionIndex] >= 3 ? 3 : 2,
        alignment: "left",
      };
    case "sidebar-layout":
      return {
        orientation: "horizontal",
        columns: 2,
        alignment: "left",
      };
    case "masonry-grid":
      return {
        orientation: "vertical",
        columns: Math.min(4, 2 + (dna.columnPattern[sectionIndex] % 3)),
        alignment: "center",
      };
    case "content-bands":
      return {
        orientation: "horizontal",
        columns: dna.columnPattern[sectionIndex],
        alignment: "center",
      };
    case "floating-panels":
      return {
        orientation: "horizontal",
        columns: Math.min(3, dna.columnPattern[sectionIndex]),
        alignment: "center",
      };
    case "dashboard-clusters":
      return {
        orientation: "horizontal",
        columns: Math.min(4, 2 + (dna.columnPattern[sectionIndex] % 3)),
        alignment: "left",
      };
    case "full-width-section":
      return {
        orientation: "vertical",
        alignment: "center",
      };
    default:
      return {
        orientation: (dna.orientationPattern[sectionIndex] as Orientation) || "horizontal",
        columns: dna.columnPattern[sectionIndex],
        alignment: "center",
      };
  }
}

function resolveAlignment(
  dna: LayoutDNA,
  sectionIndex: number,
  seed: string,
): Alignment {
  switch (dna.visualHierarchy) {
    case "top-heavy":
      return sectionIndex < 2 ? "center" : (["left", "right"] as Alignment[])[seedByte(seed, 90 + sectionIndex) % 2];
    case "even-distribution":
      return "center";
    case "bottom-heavy":
      return sectionIndex > dna.sectionCount - 3 ? "center" : (["left", "right", "center"] as Alignment[])[seedByte(seed, 90 + sectionIndex) % 3];
    case "center-focused": {
      const mid = Math.floor(dna.sectionCount / 2);
      return Math.abs(sectionIndex - mid) <= 1 ? "center" : (["left", "right"] as Alignment[])[seedByte(seed, 90 + sectionIndex) % 2];
    }
    case "progressive-disclosure":
      return (["left", "center", "right"] as Alignment[])[sectionIndex % 3];
    case "inverted-pyramid":
      return sectionIndex % 2 === 0 ? "center" : (["left", "right"] as Alignment[])[seedByte(seed, 90 + sectionIndex) % 2];
    default:
      return "center";
  }
}

function resolveImagePlacement(
  dna: LayoutDNA,
  sectionType: string,
  sectionIndex: number,
  seed: string,
  mediaAllowed?: boolean,
): ImagePlacement {
  if (sectionType === "stats" || sectionType === "cta" || sectionType === "footer") return "none";

  if (!mediaAllowed) return "none";

  if (sectionType === "testimonial") return "none";

  const dnaPlacement = dna.imagePlacementPattern[sectionIndex];
  if (dnaPlacement === "none") return "none";

  const options: ImagePlacement[] = ["left", "right", "top", "none"];
  const idx = seedByte(seed, 100 + sectionIndex) % options.length;
  return options[idx];
}

function resolveCardCount(
  sectionType: string,
  dna: LayoutDNA,
  sectionIndex: number,
): number | undefined {
  if (sectionType !== "cardList" && sectionType !== "testimonial") return undefined;
  return dna.cardCountPattern[sectionIndex] ?? 3;
}

function mapSectionTypeToArchCategory(sectionType: string): string {
  switch (sectionType) {
    case "featureGrid": return "content_grid";
    case "cardList": return "card_collection";
    case "stats": return "data_display";
    case "testimonial": return "social_proof";
    case "cta": return "call_to_action";
    default: return "content_grid";
  }
}

export function generateStructuralLayout(
  dna: LayoutDNA,
  context: StructuralContext,
): LayoutGraph {
  const sections: LayoutSection[] = [];
  const seed = context.componentSeed;

  sections.push(heroTypeToSection(dna, seed, context.mediaAllowed));

  for (let i = 0; i < dna.sectionOrder.length; i++) {
    const sectionType = dna.sectionOrder[i] as SectionType;
    const sectionIndex = i + 1;

    const primitive = selectPrimitive(sectionType, dna, sectionIndex, seed);
    const primitiveProps = primitiveToSectionProps(primitive, dna, sectionIndex);
    const alignment = resolveAlignment(dna, sectionIndex, seed);
    const imagePlacement = resolveImagePlacement(dna, sectionType, sectionIndex, seed, context.mediaAllowed);
    const cardCount = resolveCardCount(sectionType, dna, sectionIndex);

    const archCategory = mapSectionTypeToArchCategory(sectionType);
    const archVariant = selectArchitectureVariant(archCategory, seed, sectionIndex);

    const orientation: Orientation = (primitiveProps.orientation as Orientation) ||
      (dna.orientationPattern[sectionIndex] as Orientation) || "horizontal";

    const section: LayoutSection = {
      type: sectionType,
      alignment: primitiveProps.alignment || alignment,
      imagePlacement,
      orientation,
    };

    if (primitiveProps.columns !== undefined) section.columns = primitiveProps.columns;
    else if (dna.columnPattern[sectionIndex]) section.columns = dna.columnPattern[sectionIndex];

    if (cardCount !== undefined) section.cardCount = cardCount;
    if (archVariant?.id) section.componentType = archVariant.id;

    sections.push(section);
  }

  sections.push({
    type: "footer" as SectionType,
    alignment: "center",
    imagePlacement: "none",
    orientation: "horizontal",
  });

  const alignCounts: Record<Alignment, number> = { left: 0, center: 0, right: 0 };
  sections.forEach(s => alignCounts[s.alignment]++);
  const dominantAlignment = (
    Object.entries(alignCounts).sort((a, b) => b[1] - a[1])[0][0]
  ) as Alignment;

  const hasMedia = sections.some(s => s.imagePlacement !== "none");
  const gridStyle: "fixed" | "responsive" =
    dna.gridStructure.includes("uniform") || dna.gridStructure.includes("split-equal")
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
