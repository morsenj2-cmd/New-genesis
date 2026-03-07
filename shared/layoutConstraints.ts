import type { LayoutGraph, SectionType } from "./layoutEngine";

export interface PageLayoutRules {
  maxSections: number;
  maxColumns: number;
  maxCardCount: number;
  allowedSections: SectionType[];
  forbiddenComponentTypes: Set<string>;
}

const DASHBOARD_COMPONENTS = new Set([
  "analytics_chart",
  "data_table",
  "metric_cards",
  "filters",
  "storage_usage_bar",
  "revenue_chart",
  "admin_table",
  "metrics_panel",
]);

const MARKETING_ONLY_SECTIONS: SectionType[] = ["testimonial", "cta"];

export const PAGE_RULES: Record<string, PageLayoutRules> = {
  landing_page: {
    maxSections: 6,
    maxColumns: 3,
    maxCardCount: 4,
    allowedSections: ["hero", "featureGrid", "cardList", "testimonial", "cta", "footer"],
    forbiddenComponentTypes: DASHBOARD_COMPONENTS,
  },
  marketing_site: {
    maxSections: 6,
    maxColumns: 3,
    maxCardCount: 4,
    allowedSections: ["hero", "featureGrid", "cardList", "testimonial", "cta", "footer"],
    forbiddenComponentTypes: DASHBOARD_COMPONENTS,
  },
  dashboard: {
    maxSections: 5,
    maxColumns: 3,
    maxCardCount: 4,
    allowedSections: ["hero", "stats", "featureGrid", "cardList", "footer"],
    forbiddenComponentTypes: new Set(),
  },
  web_app: {
    maxSections: 6,
    maxColumns: 3,
    maxCardCount: 5,
    allowedSections: ["hero", "featureGrid", "cardList", "stats", "cta", "footer"],
    forbiddenComponentTypes: DASHBOARD_COMPONENTS,
  },
  portfolio: {
    maxSections: 6,
    maxColumns: 3,
    maxCardCount: 4,
    allowedSections: ["hero", "featureGrid", "cardList", "cta", "footer"],
    forbiddenComponentTypes: DASHBOARD_COMPONENTS,
  },
  blog: {
    maxSections: 5,
    maxColumns: 3,
    maxCardCount: 6,
    allowedSections: ["hero", "cardList", "featureGrid", "footer"],
    forbiddenComponentTypes: DASHBOARD_COMPONENTS,
  },
};

export const DEFAULT_RULES: PageLayoutRules = PAGE_RULES.landing_page;

export function getRules(pageType?: string | null): PageLayoutRules {
  if (pageType && PAGE_RULES[pageType]) return PAGE_RULES[pageType];
  return DEFAULT_RULES;
}

export function applyLayoutConstraints(
  layout: LayoutGraph,
  pageType?: string | null,
): LayoutGraph {
  const rules = getRules(pageType);

  let sections = layout.sections
    .filter(s => {
      if (!rules.allowedSections.includes(s.type)) return false;
      if (s.componentType && rules.forbiddenComponentTypes.has(s.componentType)) return false;
      return true;
    })
    .map(s => ({
      ...s,
      columns: s.columns !== undefined ? Math.min(s.columns, rules.maxColumns) : s.columns,
      cardCount: s.cardCount !== undefined ? Math.min(s.cardCount, rules.maxCardCount) : s.cardCount,
    }));

  const hero = sections.find(s => s.type === "hero");
  const footer = sections.find(s => s.type === "footer");
  const middle = sections.filter(s => s.type !== "hero" && s.type !== "footer");

  const maxMiddle = rules.maxSections - (hero ? 1 : 0) - (footer ? 1 : 0);
  const trimmedMiddle = middle.slice(0, Math.max(0, maxMiddle));

  const finalSections = [
    ...(hero ? [hero] : []),
    ...trimmedMiddle,
    ...(footer ? [footer] : []),
  ];

  const alignCounts: Record<string, number> = { left: 0, center: 0, right: 0 };
  finalSections.forEach(s => alignCounts[s.alignment]++);
  const dominantAlignment = (Object.entries(alignCounts).sort((a, b) => b[1] - a[1])[0][0]) as "left" | "center" | "right";

  return {
    sections: finalSections,
    metadata: {
      sectionCount: finalSections.length,
      dominantAlignment,
      hasMedia: finalSections.some(s => s.imagePlacement !== "none"),
      gridStyle: layout.metadata.gridStyle,
    },
  };
}

export function scoreComplexity(layout: LayoutGraph): number {
  let score = 0;
  score += layout.sections.length * 8;
  for (const s of layout.sections) {
    if (s.columns) score += (s.columns - 1) * 4;
    if (s.cardCount) score += (s.cardCount - 2) * 3;
    if (s.componentType) score += 5;
  }
  return score;
}

export function simplifyIfNeeded(layout: LayoutGraph, pageType?: string | null, maxScore = 60): LayoutGraph {
  const score = scoreComplexity(layout);
  if (score <= maxScore) return layout;
  const trimmed: LayoutGraph = {
    ...layout,
    sections: layout.sections.map(s => ({
      ...s,
      columns: s.columns ? Math.min(s.columns, 2) : s.columns,
      cardCount: s.cardCount ? Math.min(s.cardCount, 3) : s.cardCount,
    })),
  };
  return applyLayoutConstraints(trimmed, pageType);
}
