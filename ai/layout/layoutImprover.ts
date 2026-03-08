import type { LayoutGraph, LayoutSection, SectionType, Alignment } from "../../shared/layoutEngine";

export interface LayoutScore {
  total: number;
  sectionDiversity: number;
  alignmentRhythm: number;
  columnVariation: number;
  structuralBalance: number;
  contentFlow: number;
}

export interface ImprovementResult {
  layout: LayoutGraph;
  score: LayoutScore;
  improvements: string[];
}

function scoreSectionDiversity(sections: LayoutSection[]): number {
  const middle = sections.filter(s => s.type !== "hero" && s.type !== "footer");
  if (middle.length === 0) return 0;

  const types = new Set(middle.map(s => s.type));
  const uniqueRatio = types.size / middle.length;

  if (uniqueRatio >= 0.8) return 10;
  if (uniqueRatio >= 0.6) return 7;
  if (uniqueRatio >= 0.4) return 5;
  return 3;
}

function scoreAlignmentRhythm(sections: LayoutSection[]): number {
  if (sections.length <= 2) return 5;

  let consecutiveSame = 0;
  for (let i = 1; i < sections.length; i++) {
    if (sections[i].alignment === sections[i - 1].alignment) {
      consecutiveSame++;
    }
  }

  const ratio = consecutiveSame / (sections.length - 1);
  if (ratio <= 0.3) return 10;
  if (ratio <= 0.5) return 7;
  if (ratio <= 0.7) return 5;
  return 3;
}

function scoreColumnVariation(sections: LayoutSection[]): number {
  const withColumns = sections.filter(s => s.columns !== undefined && s.columns > 0);
  if (withColumns.length <= 1) return 5;

  const cols = withColumns.map(s => s.columns!);
  const uniqueCols = new Set(cols);

  if (uniqueCols.size >= 3) return 10;
  if (uniqueCols.size >= 2) return 7;
  return 4;
}

function scoreStructuralBalance(sections: LayoutSection[]): number {
  const middle = sections.filter(s => s.type !== "hero" && s.type !== "footer");
  if (middle.length === 0) return 5;

  const hasStats = middle.some(s => s.type === "stats");
  const hasGrid = middle.some(s => s.type === "featureGrid");
  const hasCards = middle.some(s => s.type === "cardList");

  let score = 5;
  if (hasStats && hasGrid) score += 2;
  if (hasCards) score += 1;
  if (middle.length >= 3 && middle.length <= 5) score += 2;

  return Math.min(10, score);
}

function scoreContentFlow(sections: LayoutSection[]): number {
  if (sections.length < 3) return 3;

  let score = 5;

  if (sections[0].type === "hero") score += 2;
  if (sections[sections.length - 1].type === "footer") score += 1;

  const middle = sections.filter(s => s.type !== "hero" && s.type !== "footer");
  if (middle.length > 0) {
    const firstMiddle = middle[0];
    if (firstMiddle.type === "stats" || firstMiddle.type === "featureGrid") score += 2;
  }

  return Math.min(10, score);
}

export function scoreLayout(layout: LayoutGraph): LayoutScore {
  const s = layout.sections;

  const sectionDiversity = scoreSectionDiversity(s);
  const alignmentRhythm = scoreAlignmentRhythm(s);
  const columnVariation = scoreColumnVariation(s);
  const structuralBalance = scoreStructuralBalance(s);
  const contentFlow = scoreContentFlow(s);

  const total = Math.round(
    (sectionDiversity * 0.25) +
    (alignmentRhythm * 0.15) +
    (columnVariation * 0.15) +
    (structuralBalance * 0.25) +
    (contentFlow * 0.20)
  );

  return {
    total,
    sectionDiversity,
    alignmentRhythm,
    columnVariation,
    structuralBalance,
    contentFlow,
  };
}

function deduplicateConsecutiveSections(sections: LayoutSection[]): { sections: LayoutSection[]; changed: boolean } {
  const result: LayoutSection[] = [];
  let changed = false;

  for (let i = 0; i < sections.length; i++) {
    if (i > 0 && sections[i].type === sections[i - 1].type &&
        sections[i].type !== "hero" && sections[i].type !== "footer") {
      changed = true;
      continue;
    }
    result.push(sections[i]);
  }

  return { sections: result, changed };
}

function improveAlignmentRhythm(sections: LayoutSection[]): { sections: LayoutSection[]; changed: boolean } {
  let changed = false;
  const result = sections.map((s, i) => {
    if (s.type === "hero" || s.type === "footer") return s;

    if (i > 1 && i < sections.length - 1) {
      const prev = sections[i - 1];
      if (s.alignment === prev.alignment && s.alignment !== "center") {
        changed = true;
        const alt: Alignment = s.alignment === "left" ? "center" : "left";
        return { ...s, alignment: alt };
      }
    }
    return s;
  });

  return { sections: result, changed };
}

function improveColumnVariation(sections: LayoutSection[]): { sections: LayoutSection[]; changed: boolean } {
  let changed = false;
  const withCols = sections.filter(s => s.columns !== undefined);
  if (withCols.length < 2) return { sections, changed: false };

  const allSame = withCols.every(s => s.columns === withCols[0].columns);
  if (!allSame) return { sections, changed: false };

  const result = sections.map((s, i) => {
    if (s.columns === undefined || s.type === "hero" || s.type === "footer") return s;
    if (s.type === "stats") {
      if (s.columns !== 4) {
        changed = true;
        return { ...s, columns: 4 };
      }
      return s;
    }
    if (i % 2 === 0 && s.columns === withCols[0].columns) {
      const newCol = s.columns === 3 ? 2 : 3;
      changed = true;
      return { ...s, columns: newCol };
    }
    return s;
  });

  return { sections: result, changed };
}

function ensureMinimumSections(
  sections: LayoutSection[],
  pageType?: string,
): { sections: LayoutSection[]; changed: boolean } {
  const middle = sections.filter(s => s.type !== "hero" && s.type !== "footer");
  if (middle.length >= 2) return { sections, changed: false };

  const hero = sections.find(s => s.type === "hero");
  const footer = sections.find(s => s.type === "footer");
  const result: LayoutSection[] = [];

  if (hero) result.push(hero);

  if (middle.length === 0) {
    result.push({
      type: "featureGrid" as SectionType,
      alignment: "center",
      imagePlacement: "none",
      orientation: "vertical",
      columns: 3,
    });
    result.push({
      type: "stats" as SectionType,
      alignment: "center",
      imagePlacement: "none",
      orientation: "horizontal",
      columns: 4,
    });
  } else {
    result.push(...middle);
    const missing = middle[0].type === "featureGrid" ? "stats" : "featureGrid";
    result.push({
      type: missing as SectionType,
      alignment: "center",
      imagePlacement: "none",
      orientation: missing === "stats" ? "horizontal" : "vertical",
      columns: missing === "stats" ? 4 : 3,
    });
  }

  if (footer) result.push(footer);

  return { sections: result, changed: true };
}

function stripAllImages(sections: LayoutSection[]): { sections: LayoutSection[]; changed: boolean } {
  let changed = false;
  const result = sections.map(s => {
    if (s.imagePlacement && s.imagePlacement !== "none") {
      changed = true;
      return { ...s, imagePlacement: "none" as const };
    }
    return s;
  });
  return { sections: result, changed };
}

export function improveLayout(
  layout: LayoutGraph,
  options?: {
    pageType?: string;
    mediaAllowed?: boolean;
  },
): ImprovementResult {
  const improvements: string[] = [];
  let sections = [...layout.sections];

  if (options?.mediaAllowed === false) {
    const imgResult = stripAllImages(sections);
    if (imgResult.changed) {
      sections = imgResult.sections;
      improvements.push("Stripped image placements (not explicitly requested)");
    }
  }

  const dedupResult = deduplicateConsecutiveSections(sections);
  if (dedupResult.changed) {
    sections = dedupResult.sections;
    improvements.push("Removed consecutive duplicate section types");
  }

  const minResult = ensureMinimumSections(sections, options?.pageType);
  if (minResult.changed) {
    sections = minResult.sections;
    improvements.push("Added missing content sections for minimum quality");
  }

  const alignResult = improveAlignmentRhythm(sections);
  if (alignResult.changed) {
    sections = alignResult.sections;
    improvements.push("Improved alignment rhythm to reduce monotony");
  }

  const colResult = improveColumnVariation(sections);
  if (colResult.changed) {
    sections = colResult.sections;
    improvements.push("Varied column counts for visual interest");
  }

  const improvedLayout: LayoutGraph = {
    sections,
    metadata: {
      ...layout.metadata,
      sectionCount: sections.length,
      hasMedia: sections.some(s => s.imagePlacement !== "none"),
    },
  };

  const score = scoreLayout(improvedLayout);

  return {
    layout: improvedLayout,
    score,
    improvements,
  };
}
