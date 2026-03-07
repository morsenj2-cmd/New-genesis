import { interpretIntent } from "./intentInterpreter";
import contextLibrary from "./contextLibrary.json";

export interface NLPatch {
  op: "set";
  path: string;
  value: unknown;
}

export interface ParseResult {
  patches: NLPatch[];
  description: string[];
  productType: string | null;
  intent: ReturnType<typeof interpretIntent>;
}

const COLOR_MAP: Record<string, { h: number; s: number; l: number }> = {
  blue:    { h: 210, s: 70, l: 55 },
  cobalt:  { h: 215, s: 75, l: 48 },
  navy:    { h: 220, s: 65, l: 35 },
  azure:   { h: 200, s: 70, l: 55 },
  sky:     { h: 200, s: 80, l: 60 },
  cyan:    { h: 185, s: 70, l: 50 },
  teal:    { h: 173, s: 60, l: 40 },
  green:   { h: 145, s: 60, l: 45 },
  emerald: { h: 152, s: 65, l: 42 },
  mint:    { h: 160, s: 55, l: 50 },
  lime:    { h: 85,  s: 70, l: 48 },
  yellow:  { h: 45,  s: 85, l: 52 },
  amber:   { h: 35,  s: 85, l: 52 },
  orange:  { h: 25,  s: 82, l: 55 },
  red:     { h: 0,   s: 68, l: 55 },
  crimson: { h: 348, s: 72, l: 48 },
  rose:    { h: 345, s: 65, l: 58 },
  pink:    { h: 330, s: 70, l: 60 },
  purple:  { h: 265, s: 65, l: 58 },
  violet:  { h: 255, s: 68, l: 60 },
  indigo:  { h: 240, s: 60, l: 52 },
  lavender:{ h: 265, s: 50, l: 68 },
};

const STYLE_GENOME_PATCHES: Record<string, NLPatch[]> = {
  minimal: [
    { op: "set", path: "settings.tone", value: "clean" },
    { op: "set", path: "spacing.ratio", value: 1.25 },
    { op: "set", path: "motion.duration.fast", value: "80ms" },
    { op: "set", path: "motion.duration.base", value: "160ms" },
    { op: "set", path: "motion.duration.slow", value: "280ms" },
  ],
  bold: [
    { op: "set", path: "settings.tone", value: "bold" },
    { op: "set", path: "typography.scaleRatio", value: 1.5 },
  ],
  modern: [
    { op: "set", path: "typography.heading", value: "Inter" },
    { op: "set", path: "typography.body", value: "Inter" },
    { op: "set", path: "iconStyle.geometryBias", value: "geometric" },
  ],
  futuristic: [
    { op: "set", path: "typography.heading", value: "Space Grotesk" },
    { op: "set", path: "typography.body", value: "Space Grotesk" },
    { op: "set", path: "iconStyle.geometryBias", value: "geometric" },
    { op: "set", path: "iconStyle.variant", value: "outline" },
    { op: "set", path: "iconStyle.strokeWidth", value: 1 },
  ],
  elegant: [
    { op: "set", path: "typography.heading", value: "Playfair Display" },
    { op: "set", path: "typography.body", value: "Lora" },
    { op: "set", path: "iconStyle.geometryBias", value: "organic" },
  ],
  playful: [
    { op: "set", path: "typography.heading", value: "Nunito" },
    { op: "set", path: "typography.body", value: "Nunito" },
    { op: "set", path: "iconStyle.geometryBias", value: "organic" },
    { op: "set", path: "iconStyle.variant", value: "filled" },
    { op: "set", path: "radius.md", value: "24px" },
    { op: "set", path: "radius.lg", value: "32px" },
  ],
  corporate: [
    { op: "set", path: "typography.heading", value: "IBM Plex Sans" },
    { op: "set", path: "typography.body", value: "IBM Plex Sans" },
    { op: "set", path: "iconStyle.geometryBias", value: "geometric" },
    { op: "set", path: "settings.tone", value: "clean" },
  ],
};

function toHsl(c: { h: number; s: number; l: number }): string {
  return `hsl(${c.h}, ${c.s}%, ${c.l}%)`;
}

function derivePalette(primary: { h: number; s: number; l: number }): NLPatch[] {
  const secH = (primary.h + 30) % 360;
  const accH = (primary.h + 150) % 360;
  return [
    { op: "set", path: "colors.primary",          value: toHsl(primary) },
    { op: "set", path: "colors.secondary",         value: toHsl({ h: secH, s: primary.s - 10, l: primary.l - 5 }) },
    { op: "set", path: "colors.accent",            value: toHsl({ h: accH, s: primary.s + 5, l: primary.l }) },
    { op: "set", path: "colors.hues.primary",      value: primary.h },
    { op: "set", path: "colors.hues.secondary",    value: secH },
    { op: "set", path: "colors.hues.accent",       value: accH },
  ];
}

export function parseNLCommand(input: string): ParseResult {
  const text = input.toLowerCase().trim();
  const patches: NLPatch[] = [];
  const description: string[] = [];

  const intent = interpretIntent(input);

  const has = (...terms: string[]) => terms.some(t => text.includes(t));

  if (intent.productType) {
    const entry = contextLibrary[intent.productType as keyof typeof contextLibrary] as { label: string } | undefined;
    description.push(`Switching layout to: ${entry?.label ?? intent.productType}`);
  }

  if (intent.style && STYLE_GENOME_PATCHES[intent.style]) {
    patches.push(...STYLE_GENOME_PATCHES[intent.style]);
    description.push(`Applied ${intent.style} style`);
  }

  if (intent.colorHint && COLOR_MAP[intent.colorHint]) {
    const hasColorIntent = has("color", "primary", "theme", "make it", "use", "set");
    if (hasColorIntent || text.split(" ").length <= 4) {
      patches.push(...derivePalette(COLOR_MAP[intent.colorHint]));
      description.push(`Set primary color to ${intent.colorHint}`);
    }
  }

  const noMotion = has("no animation", "no motion", "reduce animation", "reduce motion",
    "disable animation", "disable motion", "less animation", "static");
  if (noMotion) {
    patches.push(
      { op: "set", path: "motion.duration.fast",  value: "50ms" },
      { op: "set", path: "motion.duration.base",  value: "100ms" },
      { op: "set", path: "motion.duration.slow",  value: "150ms" },
      { op: "set", path: "motion.easing",         value: "cubic-bezier(0.4, 0, 0.2, 1)" },
      { op: "set", path: "motion.easingName",     value: "Ease In-Out" },
    );
    description.push("Reduced animation speed");
  }

  const noIcons = has("standard icon", "neutral icon", "disable icon", "plain icon",
    "no custom icon", "disable custom icon", "remove icon", "simple icon");
  if (noIcons) {
    patches.push({ op: "set", path: "settings.uniqueIcons", value: false });
    description.push("Switched to standard neutral icons");
  }

  const forceStd = has("disable unique", "turn off unique", "no unique", "disable genome",
    "standard genome", "force standard");
  if (forceStd) {
    patches.push(
      { op: "set", path: "settings.forceStandardGenome", value: true },
      { op: "set", path: "settings.uniqueIcons", value: false },
    );
    description.push("Using conservative design defaults");
  }

  const isAccessible = has("accessible", "more readable", "legible", "large text", "bigger text");
  if (isAccessible) {
    patches.push(
      { op: "set", path: "typography.sizes.base", value: "18px" },
      { op: "set", path: "typography.sizes.sm",   value: "15px" },
    );
    description.push("Improved accessibility — larger base text size");
  }

  if (intent.industry === "saas" && !intent.productType) {
    patches.push(
      { op: "set", path: "settings.industry", value: "saas" },
      { op: "set", path: "settings.forceStandardGenome", value: true },
      ...derivePalette({ h: 210, s: 55, l: 50 }),
      { op: "set", path: "typography.heading", value: "Inter" },
      { op: "set", path: "typography.body", value: "Inter" },
    );
    description.push("Applied SaaS constraints");
  }

  if (patches.length === 0 && !intent.productType) {
    description.push("No recognized changes found. Try: 'use blue as primary', 'make it minimal', 'turn this into a cloud storage platform', 'make it futuristic'.");
  }

  return { patches, description, productType: intent.productType, intent };
}

export function applyPatchesToGenome(
  genome: Record<string, unknown>,
  patches: NLPatch[],
): Record<string, unknown> {
  const result = JSON.parse(JSON.stringify(genome));
  for (const patch of patches) {
    const parts = patch.path.split(".");
    let obj = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (obj[parts[i]] == null || typeof obj[parts[i]] !== "object") {
        obj[parts[i]] = {};
      }
      obj = obj[parts[i]] as Record<string, unknown>;
    }
    obj[parts[parts.length - 1]] = patch.value;
  }
  return result;
}
