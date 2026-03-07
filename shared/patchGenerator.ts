import type { SemanticIntent } from "./semanticInterpreter";
import type { NLPatch } from "./nlParser";
import { COLOR_VALUE_ALIASES } from "./semanticDictionary";

export interface PatchSet {
  genomePatch: NLPatch[];
  settingsPatch: Record<string, unknown>;
  contentPatch: Record<string, string>;
  description: string;
}

// ── Color helper ─────────────────────────────────────────────────────────────

function resolveHslColor(colorOrName: string): string {
  if (colorOrName.startsWith("hsl")) return colorOrName;
  const lower = colorOrName.toLowerCase();
  return COLOR_VALUE_ALIASES[lower] ?? colorOrName;
}

function derivePrimary(hsl: string): NLPatch[] {
  const hueMatch = hsl.match(/hsl\((\d+)/);
  if (!hueMatch) return [{ op: "set", path: "colors.primary", value: hsl }];
  const h = parseInt(hueMatch[1]);
  return [
    { op: "set", path: "colors.primary",  value: hsl },
    { op: "set", path: "colors.secondary", value: `hsl(${(h + 30) % 360}, 60%, 55%)` },
    { op: "set", path: "colors.accent",    value: `hsl(${(h + 60) % 360}, 70%, 58%)` },
    { op: "set", path: "colors.hues.primary",   value: h },
    { op: "set", path: "colors.hues.secondary", value: (h + 30) % 360 },
    { op: "set", path: "colors.hues.accent",    value: (h + 60) % 360 },
  ];
}

// ── Radius presets ─────────────────────────────────────────────────────────

const RADIUS_PRESETS: Record<string, NLPatch[]> = {
  pill: [
    { op: "set", path: "radius.sm", value: "20px" },
    { op: "set", path: "radius.md", value: "9999px" },
    { op: "set", path: "radius.lg", value: "9999px" },
    { op: "set", path: "radius.xl", value: "9999px" },
  ],
  large: [
    { op: "set", path: "radius.sm", value: "8px" },
    { op: "set", path: "radius.md", value: "16px" },
    { op: "set", path: "radius.lg", value: "24px" },
    { op: "set", path: "radius.xl", value: "32px" },
  ],
  medium: [
    { op: "set", path: "radius.sm", value: "4px" },
    { op: "set", path: "radius.md", value: "8px" },
    { op: "set", path: "radius.lg", value: "12px" },
    { op: "set", path: "radius.xl", value: "16px" },
  ],
  small: [
    { op: "set", path: "radius.sm", value: "2px" },
    { op: "set", path: "radius.md", value: "4px" },
    { op: "set", path: "radius.lg", value: "6px" },
    { op: "set", path: "radius.xl", value: "8px" },
  ],
  none: [
    { op: "set", path: "radius.sm", value: "1px" },
    { op: "set", path: "radius.md", value: "2px" },
    { op: "set", path: "radius.lg", value: "4px" },
    { op: "set", path: "radius.xl", value: "6px" },
  ],
};

// ── Spacing presets ─────────────────────────────────────────────────────────

const SPACING_PRESETS: Record<string, NLPatch[]> = {
  compact: [
    { op: "set", path: "spacing.xs",   value: "2px" },
    { op: "set", path: "spacing.sm",   value: "4px" },
    { op: "set", path: "spacing.md",   value: "6px" },
    { op: "set", path: "spacing.lg",   value: "8px" },
    { op: "set", path: "spacing.xl",   value: "12px" },
    { op: "set", path: "spacing.2xl",  value: "16px" },
    { op: "set", path: "spacing.base", value: 3 },
  ],
  balanced: [
    { op: "set", path: "spacing.xs",   value: "4px" },
    { op: "set", path: "spacing.sm",   value: "6px" },
    { op: "set", path: "spacing.md",   value: "8px" },
    { op: "set", path: "spacing.lg",   value: "12px" },
    { op: "set", path: "spacing.xl",   value: "16px" },
    { op: "set", path: "spacing.2xl",  value: "24px" },
    { op: "set", path: "spacing.base", value: 4 },
  ],
  airy: [
    { op: "set", path: "spacing.xs",   value: "6px" },
    { op: "set", path: "spacing.sm",   value: "10px" },
    { op: "set", path: "spacing.md",   value: "16px" },
    { op: "set", path: "spacing.lg",   value: "24px" },
    { op: "set", path: "spacing.xl",   value: "36px" },
    { op: "set", path: "spacing.2xl",  value: "56px" },
    { op: "set", path: "spacing.base", value: 6 },
  ],
};

// ── Style presets ─────────────────────────────────────────────────────────

const STYLE_GENOME_PATCHES: Record<string, NLPatch[]> = {
  minimal: [
    { op: "set", path: "colors.primary",    value: "hsl(220, 14%, 26%)" },
    { op: "set", path: "colors.secondary",  value: "hsl(220, 9%, 46%)" },
    { op: "set", path: "colors.accent",     value: "hsl(211, 80%, 55%)" },
    { op: "set", path: "colors.background", value: "hsl(0, 0%, 98%)" },
    { op: "set", path: "colors.surface",    value: "hsl(0, 0%, 93%)" },
    { op: "set", path: "typography.heading", value: "Inter" },
    { op: "set", path: "typography.body",    value: "Inter" },
    ...RADIUS_PRESETS.small,
  ],
  bold: [
    { op: "set", path: "colors.primary",  value: "hsl(0, 80%, 55%)" },
    { op: "set", path: "typography.heading", value: "Inter" },
    { op: "set", path: "iconStyle.strokeWidth", value: 3 },
    ...RADIUS_PRESETS.none,
  ],
  vibrant: [
    { op: "set", path: "colors.primary",  value: "hsl(270, 80%, 60%)" },
    { op: "set", path: "colors.accent",   value: "hsl(45, 95%, 55%)" },
    { op: "set", path: "variation.colorMode", value: "neon" },
  ],
  futuristic: [
    { op: "set", path: "colors.primary",    value: "hsl(198, 80%, 50%)" },
    { op: "set", path: "colors.background", value: "hsl(222, 20%, 4%)" },
    { op: "set", path: "colors.surface",    value: "hsl(222, 15%, 8%)" },
    { op: "set", path: "typography.heading", value: "JetBrains Mono" },
    { op: "set", path: "variation.colorMode", value: "neon" },
  ],
  dark: [
    { op: "set", path: "colors.background", value: "hsl(222, 15%, 5%)" },
    { op: "set", path: "colors.surface",    value: "hsl(222, 12%, 9%)" },
  ],
  elegant: [
    { op: "set", path: "colors.primary",    value: "hsl(43, 70%, 42%)" },
    { op: "set", path: "colors.background", value: "hsl(30, 15%, 7%)" },
    { op: "set", path: "colors.surface",    value: "hsl(30, 12%, 12%)" },
    { op: "set", path: "typography.heading", value: "Playfair Display" },
    { op: "set", path: "typography.body",    value: "Inter" },
    ...RADIUS_PRESETS.small,
  ],
  playful: [
    { op: "set", path: "colors.primary",  value: "hsl(330, 80%, 55%)" },
    { op: "set", path: "colors.accent",   value: "hsl(48, 90%, 55%)" },
    { op: "set", path: "typography.heading", value: "Nunito" },
    ...RADIUS_PRESETS.large,
    { op: "set", path: "variation.colorMode", value: "vibrant" },
  ],
  corporate: [
    { op: "set", path: "colors.primary",    value: "hsl(211, 80%, 42%)" },
    { op: "set", path: "colors.background", value: "hsl(0, 0%, 98%)" },
    { op: "set", path: "colors.surface",    value: "hsl(220, 14%, 94%)" },
    { op: "set", path: "typography.heading", value: "Plus Jakarta Sans" },
    { op: "set", path: "typography.body",    value: "Inter" },
    ...RADIUS_PRESETS.small,
  ],
  creative: [
    { op: "set", path: "colors.primary",  value: "hsl(258, 90%, 66%)" },
    { op: "set", path: "colors.accent",   value: "hsl(48, 90%, 55%)" },
    { op: "set", path: "typography.heading", value: "Space Grotesk" },
    { op: "set", path: "variation.colorMode", value: "vibrant" },
  ],
};

// ── Main patch generator ─────────────────────────────────────────────────────

export function generatePatches(intent: SemanticIntent): PatchSet {
  const result: PatchSet = {
    genomePatch: [],
    settingsPatch: {},
    contentPatch: {},
    description: "",
  };

  if (!intent.value || intent.intent === "noop") {
    result.description = "No changes detected.";
    return result;
  }

  switch (intent.target) {
    case "brand.name": {
      result.contentPatch.brandName = intent.value;
      result.settingsPatch.brandName = intent.value;
      result.description = `Brand name set to "${intent.value}"`;
      break;
    }
    case "brand.logoColor": {
      const color = resolveHslColor(intent.value);
      result.genomePatch.push(
        { op: "set", path: "branding.logoColor", value: color },
      );
      result.description = `Logo color set to ${intent.value}`;
      break;
    }
    case "theme.primaryColor": {
      const color = resolveHslColor(intent.value);
      result.genomePatch.push(...derivePrimary(color));
      result.description = `Primary color set to ${intent.value}`;
      break;
    }
    case "theme.backgroundColor": {
      const color = resolveHslColor(intent.value);
      const isLight = color.includes("98%") || color.includes("97%") || color.includes("100%") || intent.value === "white";
      if (isLight) {
        result.genomePatch.push(
          { op: "set", path: "colors.background", value: "hsl(0, 0%, 98%)" },
          { op: "set", path: "colors.surface",    value: "hsl(0, 0%, 93%)" },
        );
      } else {
        result.genomePatch.push(
          { op: "set", path: "colors.background", value: color },
          { op: "set", path: "colors.surface",    value: `hsl(222, 12%, 9%)` },
        );
      }
      result.description = `Background set to ${intent.value}`;
      break;
    }
    case "theme.style": {
      const patches = STYLE_GENOME_PATCHES[intent.value] ?? [];
      result.genomePatch.push(...patches);
      result.description = `Applied "${intent.value}" style`;
      break;
    }
    case "theme.radius": {
      const patches = RADIUS_PRESETS[intent.value] ?? [];
      result.genomePatch.push(...patches);
      result.description = `Border radius set to ${intent.value}`;
      break;
    }
    case "theme.spacing": {
      const patches = SPACING_PRESETS[intent.value] ?? [];
      result.genomePatch.push(...patches);
      result.description = `Spacing set to ${intent.value}`;
      break;
    }
    case "theme.font": {
      result.genomePatch.push(
        { op: "set", path: "typography.heading", value: intent.value },
        { op: "set", path: "typography.body",    value: intent.value },
      );
      result.description = `Font set to ${intent.value}`;
      break;
    }
    case "theme.motion": {
      result.description = `Motion style noted (applied to variation)`;
      break;
    }
    case "content.headline": {
      result.contentPatch.headline = intent.value;
      result.description = `Headline set to "${intent.value}"`;
      break;
    }
    case "content.subheadline": {
      result.contentPatch.subheadline = intent.value;
      result.description = `Subheadline set to "${intent.value}"`;
      break;
    }
    case "content.ctaLabel": {
      result.contentPatch.ctaLabel = intent.value;
      result.description = `CTA label set to "${intent.value}"`;
      break;
    }
    case "product.type": {
      result.settingsPatch.productType = intent.value;
      result.description = `Product type set to ${intent.value}`;
      break;
    }
    default:
      result.description = `Applied changes to ${intent.target}`;
  }

  return result;
}
