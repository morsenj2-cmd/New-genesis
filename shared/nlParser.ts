export interface NLPatch {
  op: "set";
  path: string;
  value: unknown;
}

export interface ParseResult {
  patches: NLPatch[];
  description: string[];
}

const COLOR_MAP: Record<string, { h: number; s: number; l: number }> = {
  blue:   { h: 210, s: 70, l: 55 },
  cobalt: { h: 215, s: 75, l: 48 },
  navy:   { h: 220, s: 65, l: 35 },
  azure:  { h: 200, s: 70, l: 55 },
  sky:    { h: 200, s: 80, l: 60 },
  cyan:   { h: 185, s: 70, l: 50 },
  teal:   { h: 173, s: 60, l: 40 },
  green:  { h: 145, s: 60, l: 45 },
  emerald:{ h: 152, s: 65, l: 42 },
  mint:   { h: 160, s: 55, l: 50 },
  lime:   { h: 85,  s: 70, l: 48 },
  yellow: { h: 45,  s: 85, l: 52 },
  amber:  { h: 35,  s: 85, l: 52 },
  orange: { h: 25,  s: 82, l: 55 },
  red:    { h: 0,   s: 68, l: 55 },
  crimson:{ h: 348, s: 72, l: 48 },
  rose:   { h: 345, s: 65, l: 58 },
  pink:   { h: 330, s: 70, l: 60 },
  purple: { h: 265, s: 65, l: 58 },
  violet: { h: 255, s: 68, l: 60 },
  indigo: { h: 240, s: 60, l: 52 },
  lavender:{h: 265, s: 50, l: 68 },
};

function toHsl(c: { h: number; s: number; l: number }): string {
  return `hsl(${c.h}, ${c.s}%, ${c.l}%)`;
}

function derivePalette(primary: { h: number; s: number; l: number }): NLPatch[] {
  const secH = (primary.h + 30) % 360;
  const accH = (primary.h + 150) % 360;
  return [
    { op: "set", path: "colors.primary",   value: toHsl(primary) },
    { op: "set", path: "colors.secondary", value: toHsl({ h: secH, s: primary.s - 10, l: primary.l - 5 }) },
    { op: "set", path: "colors.accent",    value: toHsl({ h: accH, s: primary.s + 5, l: primary.l }) },
    { op: "set", path: "colors.hues.primary",   value: primary.h },
    { op: "set", path: "colors.hues.secondary", value: secH },
    { op: "set", path: "colors.hues.accent",    value: accH },
  ];
}

export function parseNLCommand(input: string): ParseResult {
  const text = input.toLowerCase().trim();
  const patches: NLPatch[] = [];
  const description: string[] = [];

  const has = (...terms: string[]) => terms.some(t => text.includes(t));

  const noMotion = has("no animation", "no motion", "reduce animation", "reduce motion",
    "disable animation", "disable motion", "minimal motion", "less animation",
    "no heavy motion", "no effect", "no effects", "static");
  const noIcons = has("standard icon", "neutral icon", "disable icon", "plain icon",
    "no custom icon", "disable custom icon", "remove icon", "simple icon");
  const forceStd = has("disable unique", "turn off unique", "no unique", "disable genome",
    "standard genome", "force standard", "forcestandard");
  const isSaas = has("saas", "cloud storage", "cloud platform", "b2b", "enterprise platform");
  const isAccessible = has("accessible", "more readable", "legible", "large text", "bigger text");
  const isMinimal = has("minimal", "more minimal", "clean", "simplify", "stripped", "simple layout");
  const isBold = has("bold", "heavy", "strong visual", "more impact");
  const isModern = has("modern", "sleek", "contemporary");

  if (isMinimal) {
    patches.push(
      { op: "set", path: "settings.tone", value: "clean" },
      { op: "set", path: "spacing.ratio", value: 1.25 },
      { op: "set", path: "motion.duration.fast",  value: "80ms" },
      { op: "set", path: "motion.duration.base",  value: "160ms" },
      { op: "set", path: "motion.duration.slow",  value: "280ms" },
    );
    description.push("Applied minimal/clean style — reduced motion and tightened spacing");
  }

  if (isBold) {
    patches.push(
      { op: "set", path: "settings.tone", value: "bold" },
      { op: "set", path: "typography.scaleRatio", value: 1.5 },
    );
    description.push("Applied bold style — increased type scale");
  }

  if (isModern) {
    patches.push(
      { op: "set", path: "typography.heading", value: "Inter" },
      { op: "set", path: "typography.body", value: "Inter" },
      { op: "set", path: "iconStyle.geometryBias", value: "geometric" },
    );
    description.push("Applied modern style — Inter font, geometric icons");
  }

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

  if (noIcons) {
    patches.push({ op: "set", path: "settings.uniqueIcons", value: false });
    description.push("Switched to standard neutral icons");
  }

  if (forceStd) {
    patches.push(
      { op: "set", path: "settings.forceStandardGenome", value: true },
      { op: "set", path: "settings.uniqueIcons", value: false },
    );
    description.push("Disabled unique genome — using conservative defaults");
  }

  if (isSaas) {
    patches.push(
      { op: "set", path: "settings.industry", value: "saas" },
      { op: "set", path: "settings.forceStandardGenome", value: true },
      { op: "set", path: "settings.uniqueIcons", value: false },
      ...derivePalette({ h: 210, s: 55, l: 50 }),
      { op: "set", path: "typography.heading", value: "Inter" },
      { op: "set", path: "typography.body", value: "Inter" },
      { op: "set", path: "motion.duration.fast",  value: "100ms" },
      { op: "set", path: "motion.duration.base",  value: "200ms" },
      { op: "set", path: "motion.duration.slow",  value: "350ms" },
    );
    description.push("Applied SaaS industry constraints — muted blues, Inter font, minimal motion");
  }

  if (isAccessible) {
    patches.push(
      { op: "set", path: "typography.sizes.base", value: "18px" },
      { op: "set", path: "typography.sizes.sm",   value: "15px" },
    );
    description.push("Improved accessibility — larger base text size");
  }

  for (const [colorName, hsl] of Object.entries(COLOR_MAP)) {
    const primaryPattern = new RegExp(
      `(?:use |primary (?:color )?|set (?:primary|color) (?:to )?|(?:make it|change it to) )${colorName}|${colorName}(?: as primary| as the primary| primary)`,
    );
    if (primaryPattern.test(text) || (text.includes(colorName) && has("primary", "color", "theme"))) {
      patches.push(...derivePalette(hsl));
      description.push(`Set primary color to ${colorName}`);
      break;
    }
  }

  if (patches.length === 0) {
    description.push("No recognized design commands found. Try: 'use blue as primary', 'make it minimal', 'reduce animations', 'set industry to saas'.");
  }

  return { patches, description };
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
