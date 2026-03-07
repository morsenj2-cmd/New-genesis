import contextLibrary from "./contextLibrary.json";
import type { InterpretedIntent } from "./intentInterpreter";
import type { LayoutGraph, LayoutSection, SectionType, Alignment, ImagePlacement, Orientation } from "./layoutEngine";
import type { UniversalContext } from "./universalContext";
import type { DomainCluster } from "./domainVocabulary";
import { hasMetricsCapability, deriveMetricsFromActivities, validateMetrics } from "./metricValidator";

const DASHBOARD_ONLY_COMPONENTS = new Set([
  "metric_cards",
  "analytics_chart",
  "data_table",
  "filters",
  "storage_usage_bar",
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

export interface DynamicDashboardWidget {
  type: SectionType;
  componentType: string;
  columns: number;
  metricName?: string;
  metricLabel?: string;
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

function shouldAllowDashboardComponents(
  productType: string,
  universalCtx?: UniversalContext
): boolean {
  const explicitDashboardTypes = new Set([
    "analytics_dashboard",
    "crm",
    "project_management",
    "fintech",
  ]);

  if (explicitDashboardTypes.has(productType)) return true;

  if (universalCtx) {
    if (universalCtx.pageType === "dashboard") return true;

    if (hasMetricsCapability(universalCtx.coreActivities, universalCtx.domainVocabulary)) {
      return true;
    }
  }

  return false;
}

export function generateContextualLayout(
  seed: string,
  context: ProductContext,
  universalCtx?: UniversalContext
): LayoutGraph {
  const isDashboard = shouldAllowDashboardComponents(context.productType, universalCtx);
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

export function deriveDashboardWidgets(
  seed: string,
  universalCtx: UniversalContext
): DynamicDashboardWidget[] {
  if (!hasMetricsCapability(universalCtx.coreActivities, universalCtx.domainVocabulary)) {
    return [];
  }

  const rawMetrics = deriveMetricsFromActivities(
    universalCtx.coreActivities,
    universalCtx.domainVocabulary,
    universalCtx.industry
  );

  const { valid: metrics } = validateMetrics(
    rawMetrics,
    universalCtx.domainVocabulary,
    universalCtx.industry,
    universalCtx.coreActivities
  );

  if (metrics.length === 0) return [];

  const widgets: DynamicDashboardWidget[] = [];
  const metricCardCount = Math.min(4, metrics.length);

  widgets.push({
    type: "stats",
    componentType: "metric_cards",
    columns: metricCardCount,
  });

  if (metrics.length > 2) {
    widgets.push({
      type: "featureGrid",
      componentType: "analytics_chart",
      columns: 2,
      metricName: metrics[0].name,
      metricLabel: metrics[0].label,
    });
  }

  if (metrics.length > 4) {
    widgets.push({
      type: "cardList",
      componentType: "data_table",
      columns: 1,
    });
  }

  return widgets;
}

export function generateDynamicDashboardLayout(
  seed: string,
  universalCtx: UniversalContext
): LayoutGraph | null {
  const widgets = deriveDashboardWidgets(seed, universalCtx);
  if (widgets.length === 0) return null;

  const sections: LayoutSection[] = [];

  sections.push({
    type: "hero",
    alignment: ALIGNMENTS[seedByte(seed, 7) % ALIGNMENTS.length],
    imagePlacement: "none",
    orientation: "horizontal",
    componentType: "metric_cards",
    columns: Math.min(4, widgets[0]?.columns ?? 3),
  });

  for (const widget of widgets) {
    const idx = sections.length;
    const base = idx * 5;
    sections.push({
      type: widget.type,
      alignment: ALIGNMENTS[seedByte(seed, base + 7) % ALIGNMENTS.length],
      imagePlacement: "none",
      orientation: seedByte(seed, base + 8) % 2 === 0 ? "horizontal" : "vertical",
      componentType: widget.componentType,
      columns: widget.columns,
    });
  }

  sections.push({
    type: "footer",
    alignment: "center",
    imagePlacement: "none",
    orientation: "horizontal",
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
