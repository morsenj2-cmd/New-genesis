import type { InterfaceCategory } from "./interfaceClassifier";

export interface ValidationResult {
  valid: boolean;
  missingComponents: string[];
  unexpectedComponents: string[];
  recommendation: string;
}

interface CategoryRequirements {
  required: string[];
  recommended: string[];
  forbidden: string[];
}

const CATEGORY_REQUIREMENTS: Record<InterfaceCategory, CategoryRequirements> = {
  product_dashboard: {
    required: ["stats", "featureGrid"],
    recommended: ["cardList"],
    forbidden: ["testimonial"],
  },
  admin_dashboard: {
    required: ["stats", "featureGrid"],
    recommended: ["cardList"],
    forbidden: ["testimonial", "cta"],
  },
  analytics_dashboard: {
    required: ["stats"],
    recommended: ["featureGrid", "cardList"],
    forbidden: ["testimonial"],
  },
  web_application: {
    required: ["featureGrid"],
    recommended: ["cardList", "stats"],
    forbidden: [],
  },
  landing_page: {
    required: ["hero", "cta"],
    recommended: ["featureGrid", "testimonial"],
    forbidden: [],
  },
  marketing_site: {
    required: ["hero"],
    recommended: ["featureGrid", "testimonial", "cta"],
    forbidden: [],
  },
  internal_tool: {
    required: ["stats", "featureGrid"],
    recommended: ["cardList"],
    forbidden: ["testimonial"],
  },
  data_management_interface: {
    required: ["featureGrid"],
    recommended: ["cardList", "stats"],
    forbidden: ["testimonial"],
  },
  workflow_management_interface: {
    required: ["featureGrid"],
    recommended: ["cardList", "stats"],
    forbidden: [],
  },
};

function extractSectionTypes(layout: any): string[] {
  if (!layout || !layout.sections) return [];
  return layout.sections.map((s: any) => s.type).filter(Boolean);
}

export function validateInterfaceLayout(
  layout: any,
  category: InterfaceCategory,
): ValidationResult {
  const requirements = CATEGORY_REQUIREMENTS[category];
  if (!requirements) {
    return {
      valid: true,
      missingComponents: [],
      unexpectedComponents: [],
      recommendation: "No requirements defined for this category",
    };
  }

  const sectionTypes = extractSectionTypes(layout);
  const typeSet = new Set(sectionTypes);

  const missing: string[] = [];
  for (const req of requirements.required) {
    if (!typeSet.has(req)) {
      missing.push(req);
    }
  }

  const unexpected: string[] = [];
  for (const forbidden of requirements.forbidden) {
    if (typeSet.has(forbidden)) {
      unexpected.push(forbidden);
    }
  }

  const valid = missing.length === 0 && unexpected.length === 0;

  let recommendation = "";
  if (!valid) {
    const parts: string[] = [];
    if (missing.length > 0) {
      parts.push(`Add required sections: ${missing.join(", ")}`);
    }
    if (unexpected.length > 0) {
      parts.push(`Remove inappropriate sections: ${unexpected.join(", ")}`);
    }
    recommendation = parts.join(". ");
  }

  return { valid, missingComponents: missing, unexpectedComponents: unexpected, recommendation };
}

export function fixLayoutForCategory(
  layout: any,
  category: InterfaceCategory,
): any {
  const requirements = CATEGORY_REQUIREMENTS[category];
  if (!requirements || !layout || !layout.sections) return layout;

  let sections = [...layout.sections];

  sections = sections.filter((s: any) => !requirements.forbidden.includes(s.type));

  const existingTypes = new Set(sections.map((s: any) => s.type));
  for (const req of requirements.required) {
    if (!existingTypes.has(req)) {
      const insertIdx = req === "hero" ? 0 :
        req === "cta" ? sections.length - 1 :
        Math.max(1, sections.length - 1);

      const newSection: any = {
        type: req,
        alignment: "center",
        imagePlacement: "none",
        orientation: req === "stats" ? "horizontal" : "vertical",
      };

      if (req === "featureGrid" || req === "cardList") {
        newSection.columns = 3;
      }
      if (req === "cardList") {
        newSection.cardCount = 3;
      }
      if (req === "stats") {
        newSection.columns = 4;
      }

      sections.splice(insertIdx, 0, newSection);
    }
  }

  return {
    ...layout,
    sections,
    metadata: {
      ...layout.metadata,
      sectionCount: sections.length,
      validatedForCategory: category,
    },
  };
}
