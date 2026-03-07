import type { LayoutGraph, LayoutSection, SectionType, Alignment, ImagePlacement, Orientation } from "./layoutEngine";
import type { DesignGenome } from "./genomeGenerator";
import type { LayoutSigComponents } from "./layoutSignature";
import { computeLayoutDimensionSimilarity } from "./layoutSignature";

const SECTION_TYPES: SectionType[] = ["featureGrid", "cardList", "stats", "testimonial", "cta"];
const ALIGNMENTS: Alignment[] = ["left", "center", "right"];
const IMAGE_PLACEMENTS: ImagePlacement[] = ["left", "right", "top", "none"];
const ORIENTATIONS: Orientation[] = ["horizontal", "vertical"];

function seededRandom(seed: string, offset: number): number {
  const idx = (offset * 2) % Math.max(1, seed.length - 1);
  const hex = seed.slice(idx, idx + 2);
  return parseInt(hex || "7f", 16) / 255;
}

function pickFrom<T>(arr: T[], seed: string, offset: number): T {
  const idx = Math.floor(seededRandom(seed, offset) * arr.length);
  return arr[idx % arr.length];
}

export interface MutationResult {
  layout: LayoutGraph;
  genome: DesignGenome;
  mutatedDimensions: string[];
}

export function mutateLayout(
  layout: LayoutGraph,
  genome: DesignGenome,
  mutationSeed: string,
  previousSigComponents?: LayoutSigComponents,
): MutationResult {
  const mutatedDimensions: string[] = [];
  const r = (offset: number) => seededRandom(mutationSeed, offset);

  const mutationFlags = determineMutationTargets(mutationSeed, previousSigComponents);

  let sections = [...layout.sections.map(s => ({ ...s }))];
  let mutatedGenome = deepCloneGenome(genome);

  if (mutationFlags.sectionOrdering) {
    sections = mutateSectionOrdering(sections, mutationSeed);
    mutatedDimensions.push("sectionOrdering");
  }

  if (mutationFlags.gridSystem) {
    sections = mutateGridSystem(sections, mutationSeed);
    mutatedDimensions.push("gridSystem");
  }

  if (mutationFlags.heroAlignment) {
    sections = mutateHeroAlignment(sections, mutationSeed);
    mutatedDimensions.push("heroAlignment");
  }

  if (mutationFlags.componentGeometry) {
    sections = mutateComponentGeometry(sections, mutationSeed);
    mutatedDimensions.push("componentGeometry");
  }

  if (mutationFlags.componentDensity) {
    sections = mutateComponentDensity(sections, mutationSeed);
    mutatedDimensions.push("componentDensity");
  }

  if (mutationFlags.spacingRatios) {
    mutatedGenome = mutateSpacingRatios(mutatedGenome, mutationSeed);
    mutatedDimensions.push("spacingRatios");
  }

  if (mutationFlags.borderRadiusScale) {
    mutatedGenome = mutateBorderRadiusScale(mutatedGenome, mutationSeed);
    mutatedDimensions.push("borderRadiusScale");
  }

  if (mutationFlags.typographyScale) {
    mutatedGenome = mutateTypographyScale(mutatedGenome, mutationSeed);
    mutatedDimensions.push("typographyScale");
  }

  if (mutationFlags.colorDistribution) {
    mutatedGenome = mutateColorDistribution(mutatedGenome, mutationSeed);
    mutatedDimensions.push("colorDistribution");
  }

  const alignCounts: Record<Alignment, number> = { left: 0, center: 0, right: 0 };
  sections.forEach(s => alignCounts[s.alignment]++);
  const dominantAlignment = (
    Object.entries(alignCounts).sort((a, b) => b[1] - a[1])[0][0]
  ) as Alignment;

  const mutatedLayout: LayoutGraph = {
    sections,
    metadata: {
      sectionCount: sections.length,
      dominantAlignment,
      hasMedia: sections.some(s => s.imagePlacement !== "none"),
      gridStyle: layout.metadata.gridStyle,
    },
  };

  return {
    layout: mutatedLayout,
    genome: mutatedGenome,
    mutatedDimensions,
  };
}

interface MutationFlags {
  sectionOrdering: boolean;
  gridSystem: boolean;
  heroAlignment: boolean;
  componentGeometry: boolean;
  componentDensity: boolean;
  spacingRatios: boolean;
  borderRadiusScale: boolean;
  typographyScale: boolean;
  colorDistribution: boolean;
}

function determineMutationTargets(
  seed: string,
  previousSig?: LayoutSigComponents,
): MutationFlags {
  const dimensions = [
    "sectionOrdering",
    "gridSystem",
    "heroAlignment",
    "componentGeometry",
    "componentDensity",
    "spacingRatios",
    "borderRadiusScale",
    "typographyScale",
    "colorDistribution",
  ] as const;

  const totalDimensions = dimensions.length;
  const minMutations = Math.ceil(totalDimensions * 0.3);

  const scores = dimensions.map((d, i) => ({
    name: d,
    score: seededRandom(seed, i + 100),
  }));

  scores.sort((a, b) => b.score - a.score);

  const selected = new Set<string>();
  for (let i = 0; i < minMutations; i++) {
    selected.add(scores[i].name);
  }

  for (const s of scores.slice(minMutations)) {
    if (s.score > 0.5) {
      selected.add(s.name);
    }
  }

  if (previousSig) {
    if (selected.size < minMutations + 1) {
      selected.add(scores[minMutations]?.name ?? scores[0].name);
    }
  }

  return {
    sectionOrdering: selected.has("sectionOrdering"),
    gridSystem: selected.has("gridSystem"),
    heroAlignment: selected.has("heroAlignment"),
    componentGeometry: selected.has("componentGeometry"),
    componentDensity: selected.has("componentDensity"),
    spacingRatios: selected.has("spacingRatios"),
    borderRadiusScale: selected.has("borderRadiusScale"),
    typographyScale: selected.has("typographyScale"),
    colorDistribution: selected.has("colorDistribution"),
  };
}

function mutateSectionOrdering(sections: LayoutSection[], seed: string): LayoutSection[] {
  const hero = sections.find(s => s.type === "hero");
  const footer = sections.find(s => s.type === "footer");
  const middle = sections.filter(s => s.type !== "hero" && s.type !== "footer");

  if (middle.length < 2) return sections;

  for (let i = middle.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed, i + 200) * (i + 1));
    [middle[i], middle[j]] = [middle[j], middle[i]];
  }

  return [
    ...(hero ? [hero] : []),
    ...middle,
    ...(footer ? [footer] : []),
  ];
}

function mutateGridSystem(sections: LayoutSection[], seed: string): LayoutSection[] {
  return sections.map((s, i) => {
    if (s.columns !== undefined && s.type !== "hero" && s.type !== "footer") {
      const delta = seededRandom(seed, i + 300) > 0.5 ? 1 : -1;
      const newCols = Math.max(1, Math.min(4, s.columns + delta));
      return { ...s, columns: newCols };
    }
    return s;
  });
}

function mutateHeroAlignment(sections: LayoutSection[], seed: string): LayoutSection[] {
  return sections.map(s => {
    if (s.type === "hero") {
      const newAlignment = pickFrom(ALIGNMENTS, seed, 400);
      const newImagePlacement = pickFrom(
        ["left", "right", "top"] as ImagePlacement[],
        seed, 401,
      );
      return { ...s, alignment: newAlignment, imagePlacement: newImagePlacement };
    }
    return s;
  });
}

function mutateComponentGeometry(sections: LayoutSection[], seed: string): LayoutSection[] {
  return sections.map((s, i) => {
    if (s.type === "hero" || s.type === "footer") return s;
    const shouldFlip = seededRandom(seed, i + 500) > 0.4;
    if (shouldFlip) {
      const newOrientation: Orientation = s.orientation === "horizontal" ? "vertical" : "horizontal";
      const newImagePlacement = s.imagePlacement !== "none"
        ? pickFrom(IMAGE_PLACEMENTS.filter(p => p !== s.imagePlacement), seed, i + 501)
        : "none" as ImagePlacement;
      return { ...s, orientation: newOrientation, imagePlacement: newImagePlacement };
    }
    return s;
  });
}

function mutateComponentDensity(sections: LayoutSection[], seed: string): LayoutSection[] {
  return sections.map((s, i) => {
    if (s.cardCount !== undefined) {
      const delta = seededRandom(seed, i + 600) > 0.5 ? 1 : -1;
      const newCount = Math.max(2, Math.min(6, s.cardCount + delta));
      return { ...s, cardCount: newCount };
    }
    return s;
  });
}

function mutateSpacingRatios(genome: DesignGenome, seed: string): DesignGenome {
  const delta = (seededRandom(seed, 700) - 0.5) * 0.3;
  const newRatio = Math.max(1.1, Math.min(1.6, genome.spacing.ratio + delta));
  const base = genome.spacing.base;
  const sp = (exp: number) => `${Math.round(base * Math.pow(newRatio, exp))}px`;

  return {
    ...genome,
    spacing: {
      ...genome.spacing,
      ratio: Math.round(newRatio * 1000) / 1000,
      xs: sp(0),
      sm: sp(1),
      md: sp(2),
      lg: sp(3),
      xl: sp(4),
      "2xl": sp(5),
    },
  };
}

function mutateBorderRadiusScale(genome: DesignGenome, seed: string): DesignGenome {
  const currentBase = parseInt(genome.radius.md, 10) || 8;
  const delta = Math.round((seededRandom(seed, 800) - 0.5) * 12);
  const newBase = Math.max(1, Math.min(24, currentBase + delta));

  return {
    ...genome,
    radius: {
      sm: `${Math.max(1, Math.round(newBase * 0.5))}px`,
      md: `${newBase}px`,
      lg: `${Math.round(newBase * 1.5)}px`,
      xl: `${Math.round(newBase * 2)}px`,
      full: "9999px",
    },
  };
}

function mutateTypographyScale(genome: DesignGenome, seed: string): DesignGenome {
  const SCALE_RATIOS = [1.125, 1.2, 1.25, 1.333, 1.414, 1.5];
  const currentIdx = SCALE_RATIOS.findIndex(r => Math.abs(r - genome.typography.scaleRatio) < 0.01);
  const shift = seededRandom(seed, 900) > 0.5 ? 1 : -1;
  const newIdx = Math.max(0, Math.min(SCALE_RATIOS.length - 1, (currentIdx >= 0 ? currentIdx : 1) + shift));
  const newRatio = SCALE_RATIOS[newIdx];
  const baseSize = 16;

  return {
    ...genome,
    typography: {
      ...genome.typography,
      scaleRatio: newRatio,
      sizes: {
        xs: `${(baseSize * Math.pow(newRatio, -2)).toFixed(2)}px`,
        sm: `${(baseSize * Math.pow(newRatio, -1)).toFixed(2)}px`,
        base: `${baseSize}px`,
        lg: `${(baseSize * Math.pow(newRatio, 1)).toFixed(2)}px`,
        xl: `${(baseSize * Math.pow(newRatio, 2)).toFixed(2)}px`,
        "2xl": `${(baseSize * Math.pow(newRatio, 3)).toFixed(2)}px`,
        "3xl": `${(baseSize * Math.pow(newRatio, 4)).toFixed(2)}px`,
      },
    },
  };
}

function mutateColorDistribution(genome: DesignGenome, seed: string): DesignGenome {
  const hueShift = Math.round((seededRandom(seed, 1000) - 0.5) * 60);
  const newPrimary = (genome.colors.hues.primary + hueShift + 360) % 360;
  const newSecondary = (genome.colors.hues.secondary + hueShift + 360) % 360;
  const newAccent = (genome.colors.hues.accent + Math.round(hueShift * 0.5) + 360) % 360;

  const hsl = (h: number, s: number, l: number) =>
    `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;

  const parseSL = (color: string): [number, number] => {
    const match = color.match(/hsl\(\d+,\s*(\d+)%,\s*(\d+)%\)/);
    if (match) return [parseInt(match[1], 10), parseInt(match[2], 10)];
    return [60, 50];
  };

  const [ps, pl] = parseSL(genome.colors.primary);
  const [ss, sl] = parseSL(genome.colors.secondary);
  const [as, al] = parseSL(genome.colors.accent);

  return {
    ...genome,
    colors: {
      ...genome.colors,
      primary: hsl(newPrimary, ps, pl),
      secondary: hsl(newSecondary, ss, sl),
      accent: hsl(newAccent, as, al),
      hues: { primary: newPrimary, secondary: newSecondary, accent: newAccent },
    },
  };
}

function deepCloneGenome(genome: DesignGenome): DesignGenome {
  return JSON.parse(JSON.stringify(genome));
}

export function needsMutation(
  candidateSig: LayoutSigComponents,
  previousSigs: LayoutSigComponents[],
  similarityThreshold = 0.7,
): boolean {
  for (const prev of previousSigs) {
    const similarity = computeLayoutDimensionSimilarity(candidateSig, prev);
    if (similarity >= similarityThreshold) return true;
  }
  return false;
}
