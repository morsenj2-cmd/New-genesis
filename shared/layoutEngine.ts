export type SectionType =
  | "hero"
  | "featureGrid"
  | "cardList"
  | "stats"
  | "testimonial"
  | "cta"
  | "footer";

export type Alignment = "left" | "center" | "right";
export type ImagePlacement = "left" | "right" | "top" | "bottom" | "none";
export type Orientation = "horizontal" | "vertical";

export interface LayoutSection {
  type: SectionType;
  alignment: Alignment;
  imagePlacement: ImagePlacement;
  orientation: Orientation;
  columns?: number;
  cardCount?: number;
  componentType?: string;
}

export interface LayoutGraph {
  sections: LayoutSection[];
  metadata: {
    sectionCount: number;
    dominantAlignment: Alignment;
    hasMedia: boolean;
    gridStyle: "fixed" | "responsive";
  };
}

export type SitePageType =
  | "landing_page"
  | "marketing_site"
  | "web_app"
  | "dashboard"
  | "blog"
  | "portfolio"
  | "social_platform"
  | "ecommerce_store";

export interface LayoutDesignContext {
  name?: string;
  prompt?: string;
  font?: string;
  themeColor?: string;
  pageType?: SitePageType | null;
}

// Sections allowed per site type (middle sections only — hero and footer are always added)
// Landing pages MUST NOT contain dashboard/analytics components — featureGrid, cardList, testimonial, cta only
const SITE_TYPE_POOLS: Record<SitePageType, SectionType[]> = {
  landing_page:    ["featureGrid", "cardList", "testimonial", "cta"],
  marketing_site:  ["featureGrid", "cardList", "testimonial", "cta"],
  web_app:         ["featureGrid", "cardList", "stats", "cta"],
  dashboard:       ["stats", "featureGrid", "cardList"],
  blog:            ["cardList", "featureGrid"],
  portfolio:       ["featureGrid", "cardList", "cta"],
  social_platform: ["cardList", "featureGrid", "stats"],
  ecommerce_store: ["featureGrid", "cardList", "stats", "cta"],
};

// Maximum section count per page type (excluding hero + footer = 2 always present)
const MAX_MIDDLE_SECTIONS: Partial<Record<SitePageType, number>> = {
  landing_page:   4,
  marketing_site: 4,
  dashboard:      3,
  web_app:        4,
  blog:           3,
  portfolio:      4,
};

function seedByte(seed: string, offset: number): number {
  const idx = (offset * 2) % (seed.length - 1);
  const hex = seed.slice(idx, idx + 2);
  return parseInt(hex || "00", 16);
}

function pick<T>(arr: T[], n: number): T {
  return arr[((n % arr.length) + arr.length) % arr.length];
}

const ALIGNMENTS: Alignment[] = ["left", "center", "right"];
const ORIENTATIONS: Orientation[] = ["horizontal", "vertical"];
const MIDDLE_POOL: SectionType[] = [
  "featureGrid",
  "cardList",
  "stats",
  "testimonial",
  "cta",
];

export function generateLayout(
  seed: string,
  designContext?: LayoutDesignContext
): LayoutGraph {
  const pageType = designContext?.pageType;
  const maxMiddle = (pageType && MAX_MIDDLE_SECTIONS[pageType]) ?? 4;
  const rawTotal = 3 + (seedByte(seed, 0) % 4);
  const totalSections = Math.min(rawTotal, maxMiddle + 2);
  const middleCount = totalSections - 2;

  // Use site-type-specific pool when pageType is known
  const pool = [...(pageType && SITE_TYPE_POOLS[pageType] ? SITE_TYPE_POOLS[pageType] : MIDDLE_POOL)];
  const middleSections: SectionType[] = [];
  for (let i = 0; i < middleCount; i++) {
    const idx = seedByte(seed, i + 1) % pool.length;
    middleSections.push(pool[idx]);
    if (pool.length > 1) pool.splice(idx, 1);
  }

  const swapSeed = seedByte(seed, 6);
  if (middleSections.length >= 2 && swapSeed % 3 === 0) {
    const swapIdx = swapSeed % (middleSections.length - 1);
    [middleSections[swapIdx], middleSections[swapIdx + 1]] = [
      middleSections[swapIdx + 1],
      middleSections[swapIdx],
    ];
  }

  const sectionTypes: SectionType[] = ["hero", ...middleSections, "footer"];

  const sections: LayoutSection[] = sectionTypes.map((type, i) => {
    const base = i * 5;

    const alignment: Alignment =
      type === "footer"
        ? "center"
        : pick(ALIGNMENTS, seedByte(seed, base + 7));

    const rawOrientation: Orientation = pick(
      ORIENTATIONS,
      seedByte(seed, base + 8)
    );

    const imgSeed = seedByte(seed, base + 9);
    const imagePlacement: ImagePlacement =
      type === "hero" || type === "testimonial"
        ? pick(["left", "right", "top"] as ImagePlacement[], imgSeed)
        : type === "cta" || type === "footer" || type === "stats"
        ? "none"
        : pick(["none", "none", "left", "right"] as ImagePlacement[], imgSeed);

    const maxCols = pageType === "landing_page" || pageType === "marketing_site" ? 3 : 4;

    let columns: number | undefined;
    if (type === "featureGrid" || type === "cardList") {
      columns = Math.min(maxCols, 2 + (seedByte(seed, base + 10) % 3));
      if (seedByte(seed, base + 11) % 5 === 0) {
        columns = Math.max(1, columns - 1);
      }
    }
    if (type === "stats") {
      columns = Math.min(maxCols, 2 + (seedByte(seed, base + 10) % 3));
    }

    let cardCount: number | undefined;
    if (type === "cardList" || type === "testimonial") {
      cardCount = 2 + (seedByte(seed, base + 12) % 3);
    }

    const flipSeed = seedByte(seed, base + 13);
    const orientation: Orientation =
      type === "featureGrid" && flipSeed % 4 === 0
        ? rawOrientation === "horizontal"
          ? "vertical"
          : "horizontal"
        : rawOrientation;

    return {
      type,
      alignment,
      imagePlacement,
      orientation,
      ...(columns !== undefined && { columns }),
      ...(cardCount !== undefined && { cardCount }),
    };
  });

  const alignCounts: Record<Alignment, number> = { left: 0, center: 0, right: 0 };
  sections.forEach((s) => alignCounts[s.alignment]++);
  const dominantAlignment = (
    Object.entries(alignCounts).sort((a, b) => b[1] - a[1])[0][0]
  ) as Alignment;

  const hasMedia = sections.some((s) => s.imagePlacement !== "none");
  const gridStyle: "fixed" | "responsive" =
    seedByte(seed, 30) % 2 === 0 ? "fixed" : "responsive";

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
