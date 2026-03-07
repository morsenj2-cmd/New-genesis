import contextLibrary from "./contextLibrary.json";
import type { InterpretedIntent } from "./intentInterpreter";
import type { LayoutGraph, LayoutSection, SectionType, Alignment, ImagePlacement, Orientation } from "./layoutEngine";

// These component types render specialised data-heavy widgets — only appropriate for dashboard products
const DASHBOARD_ONLY_COMPONENTS = new Set([
  "metric_cards",
  "analytics_chart",
  "data_table",
  "filters",
  "storage_usage_bar",
]);

// Product types that legitimately show dashboard-style components
const DASHBOARD_PRODUCT_TYPES = new Set([
  "analytics_dashboard",
  "crm",
  "project_management",
  "fintech",
]);

export interface ProductSection {
  type: SectionType;
  componentType: string | null;
  columns?: number;
}

export interface ProductContext {
  productType: string;
  label: string;
  sections: ProductSection[];
}

function seedByte(seed: string, offset: number): number {
  const idx = (offset * 2) % (seed.length - 1);
  const hex = seed.slice(idx, idx + 2);
  return parseInt(hex || "00", 16);
}

const ALIGNMENTS: Alignment[] = ["left", "center", "right"];

export function getProductContext(intent: InterpretedIntent): ProductContext | null {
  if (!intent.productType) return null;
  const entry = contextLibrary[intent.productType as keyof typeof contextLibrary];
  if (!entry) return null;
  return {
    productType: intent.productType,
    label: entry.label,
    sections: entry.sections as ProductSection[],
  };
}

export function generateContextualLayout(
  seed: string,
  context: ProductContext,
): LayoutGraph {
  const isDashboard = DASHBOARD_PRODUCT_TYPES.has(context.productType);
  const sections: LayoutSection[] = context.sections.map((s, i) => {
    const base = i * 5;

    const alignment: Alignment =
      s.type === "footer"
        ? "center"
        : ALIGNMENTS[seedByte(seed, base + 7) % ALIGNMENTS.length];

    const imagePlacement: ImagePlacement =
      s.type === "cta" || s.type === "footer" || s.type === "stats"
        ? "none"
        : "none";

    const orientation: Orientation =
      seedByte(seed, base + 8) % 2 === 0 ? "horizontal" : "vertical";

    const columns = s.columns ?? (
      s.type === "stats" ? 3 + (seedByte(seed, base + 10) % 2) :
      s.type === "cardList" || s.type === "featureGrid" ? 2 + (seedByte(seed, base + 10) % 3) :
      undefined
    );

    const cardCount =
      s.type === "cardList" ? 3 + (seedByte(seed, base + 12) % 3) :
      s.type === "testimonial" ? 2 + (seedByte(seed, base + 12) % 3) :
      undefined;

    return {
      type: s.type,
      alignment,
      imagePlacement,
      orientation,
      ...(columns !== undefined && { columns }),
      ...(cardCount !== undefined && { cardCount }),
      ...(() => {
        if (s.componentType == null) return {};
        // Strip dashboard-only widget types from non-dashboard products so generic sections render
        if (!isDashboard && DASHBOARD_ONLY_COMPONENTS.has(s.componentType)) return {};
        return { componentType: s.componentType };
      })(),
    };
  });

  const alignCounts: Record<Alignment, number> = { left: 0, center: 0, right: 0 };
  sections.forEach((s) => alignCounts[s.alignment]++);
  const dominantAlignment = (
    Object.entries(alignCounts).sort((a, b) => b[1] - a[1])[0][0]
  ) as Alignment;

  return {
    sections,
    metadata: {
      sectionCount: sections.length,
      dominantAlignment,
      hasMedia: false,
      gridStyle: seedByte(seed, 30) % 2 === 0 ? "fixed" : "responsive",
    },
  };
}

export function detectProductTypeFromText(text: string): string | null {
  const lower = text.toLowerCase();
  let best: string | null = null;
  let bestLen = 0;
  for (const [key, entry] of Object.entries(contextLibrary)) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw) && kw.length > bestLen) {
        best = key;
        bestLen = kw.length;
      }
    }
  }
  return best;
}
