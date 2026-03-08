import type { StructuredIntent, StyleChange, LayoutChange, ContentChange, ContextOverride } from "../model/promptSchema";

export interface GenomePatch {
  op: "set";
  path: string;
  value: unknown;
}

export interface SettingsPatch {
  key: string;
  value: unknown;
}

export interface ContentPatch {
  field: string;
  value: string;
}

export interface LayoutPatch {
  operation: LayoutChange["operation"];
  sectionType?: string;
  property?: string;
  value?: unknown;
}

export interface UnifiedPatchSet {
  genomePatch: GenomePatch[];
  settingsPatch: Record<string, unknown>;
  contentPatch: Record<string, string>;
  layoutPatch: LayoutPatch[];
  description: string;
  intentType: string;
  confidence: number;
}

const STYLE_GENOME_MAP: Record<string, GenomePatch[]> = {
  minimal: [
    { op: "set", path: "spacing.ratio", value: 1.4 },
    { op: "set", path: "typography.weight", value: 400 },
  ],
  compact: [
    { op: "set", path: "spacing.ratio", value: 1.15 },
  ],
  spacious: [
    { op: "set", path: "spacing.ratio", value: 1.55 },
  ],
  rounded: [
    { op: "set", path: "radius.md", value: "16px" },
    { op: "set", path: "radius.lg", value: "24px" },
    { op: "set", path: "radius.xl", value: "32px" },
  ],
  sharp: [
    { op: "set", path: "radius.md", value: "2px" },
    { op: "set", path: "radius.lg", value: "4px" },
    { op: "set", path: "radius.xl", value: "6px" },
  ],
  bold: [
    { op: "set", path: "typography.headingWeight", value: 800 },
    { op: "set", path: "typography.scaleRatio", value: 1.414 },
  ],
  vibrant: [],
  muted: [],
  dark: [
    { op: "set", path: "colors.background", value: "#050505" },
    { op: "set", path: "colors.surface", value: "#111111" },
  ],
  animated: [
    { op: "set", path: "animation.enabled", value: true },
    { op: "set", path: "animation.duration", value: "200ms" },
  ],
  larger: [
    { op: "set", path: "typography.scaleRatio", value: 1.5 },
  ],
  smaller: [
    { op: "set", path: "typography.scaleRatio", value: 1.2 },
  ],
};

function buildStylePatches(changes: StyleChange[]): {
  genomePatch: GenomePatch[];
  settingsPatch: Record<string, unknown>;
} {
  const genomePatch: GenomePatch[] = [];
  const settingsPatch: Record<string, unknown> = {};

  for (const change of changes) {
    if (change.dimension === "color" && change.property === "primary" && change.direction === "set") {
      genomePatch.push({ op: "set", path: "colors.primary", value: change.value });
      settingsPatch.primaryColor = change.value;
    } else if (change.dimension === "typography" && change.property === "heading") {
      genomePatch.push({ op: "set", path: "typography.heading", value: change.value });
      settingsPatch.font = change.value;
    } else {
      const mapped = STYLE_GENOME_MAP[change.value] ?? [];
      genomePatch.push(...mapped);
    }

    if (change.value === "minimal" || change.value === "compact") {
      settingsPatch.density = change.value === "compact" ? "compact" : "minimal";
    }
    if (change.value === "spacious" || change.value === "airy") {
      settingsPatch.density = "spacious";
    }
    if (change.value === "dark") {
      settingsPatch.theme = "dark";
    }
  }

  return { genomePatch, settingsPatch };
}

function buildContentPatches(changes: ContentChange[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const change of changes) {
    result[change.field] = change.value;
  }
  return result;
}

function buildContextPatches(overrides: ContextOverride[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const override of overrides) {
    result[override.key] = override.value;
  }
  return result;
}

function buildLayoutPatches(changes: LayoutChange[]): LayoutPatch[] {
  return changes.map(c => ({
    operation: c.operation,
    sectionType: c.sectionType,
    property: c.property,
    value: c.value,
  }));
}

function buildDescription(intent: StructuredIntent): string {
  const parts: string[] = [];

  for (const change of intent.styleChanges) {
    if (change.dimension === "color" && change.property === "primary") {
      parts.push(`Primary color → ${change.value}`);
    } else if (change.dimension === "typography" && change.property === "heading") {
      parts.push(`Font → ${change.value}`);
    } else {
      parts.push(`Style: ${change.value}`);
    }
  }

  for (const change of intent.layoutChanges) {
    const op = change.operation;
    const sec = change.sectionType ?? change.property ?? "section";
    parts.push(`${op.charAt(0).toUpperCase() + op.slice(1)} ${sec}`);
  }

  for (const change of intent.contentChanges) {
    if (change.field === "brandName") {
      parts.push(`Brand → ${change.value}`);
    } else {
      parts.push(`Update ${change.field}`);
    }
  }

  for (const override of intent.contextOverrides) {
    parts.push(`Context ${override.key} → ${override.value}`);
  }

  return parts.join("; ") || "Applied changes";
}

export function intentToPatchSet(intent: StructuredIntent): UnifiedPatchSet {
  const { genomePatch, settingsPatch: stylePatch } = buildStylePatches(intent.styleChanges);
  const contentPatch = buildContentPatches(intent.contentChanges);
  const contextPatch = buildContextPatches(intent.contextOverrides);
  const layoutPatch = buildLayoutPatches(intent.layoutChanges);

  const settingsPatch: Record<string, unknown> = { ...stylePatch, ...contextPatch };

  if (intent.industry) settingsPatch.industry = intent.industry;
  if (intent.pageType) settingsPatch.pageType = intent.pageType;

  return {
    genomePatch,
    settingsPatch,
    contentPatch,
    layoutPatch,
    description: buildDescription(intent),
    intentType: intent.intentType,
    confidence: intent.confidence,
  };
}

export function applyGenomePatch(genome: Record<string, any>, patches: GenomePatch[]): Record<string, any> {
  const result = JSON.parse(JSON.stringify(genome));

  for (const patch of patches) {
    const parts = patch.path.split(".");
    let obj = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]] || typeof obj[parts[i]] !== "object") {
        obj[parts[i]] = {};
      }
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = patch.value;
  }

  return result;
}
