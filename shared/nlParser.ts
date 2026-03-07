import { interpretIntent, COLOR_KEYWORDS } from "./intentInterpreter";
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
  gray:    { h: 0,   s: 0,  l: 55 },
};

const LOGO_COLOR_MAP: Record<string, string> = {
  white:   "#ffffff",
  black:   "#000000",
  gray:    "#9ca3af",
  blue:    "hsl(210, 70%, 65%)",
  red:     "hsl(0, 68%, 65%)",
  green:   "hsl(145, 60%, 55%)",
  purple:  "hsl(265, 65%, 68%)",
  orange:  "hsl(25, 82%, 65%)",
  pink:    "hsl(330, 70%, 70%)",
  yellow:  "hsl(45, 85%, 62%)",
  teal:    "hsl(173, 60%, 50%)",
  cyan:    "hsl(185, 70%, 60%)",
  indigo:  "hsl(240, 60%, 62%)",
  violet:  "hsl(255, 68%, 70%)",
  emerald: "hsl(152, 65%, 52%)",
  amber:   "hsl(35, 85%, 62%)",
  rose:    "hsl(345, 65%, 68%)",
  crimson: "hsl(348, 72%, 58%)",
  navy:    "hsl(220, 65%, 45%)",
  cobalt:  "hsl(215, 75%, 58%)",
  sky:     "hsl(200, 80%, 70%)",
  azure:   "hsl(200, 70%, 65%)",
  mint:    "hsl(160, 55%, 60%)",
  lime:    "hsl(85, 70%, 58%)",
  lavender:"hsl(265, 50%, 78%)",
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
    { op: "set", path: "colors.primary",       value: toHsl(primary) },
    { op: "set", path: "colors.secondary",      value: toHsl({ h: secH, s: primary.s - 10, l: primary.l - 5 }) },
    { op: "set", path: "colors.accent",         value: toHsl({ h: accH, s: primary.s + 5, l: primary.l }) },
    { op: "set", path: "colors.hues.primary",   value: primary.h },
    { op: "set", path: "colors.hues.secondary", value: secH },
    { op: "set", path: "colors.hues.accent",    value: accH },
  ];
}

function resolveLogoColor(colorKey: string): string {
  return LOGO_COLOR_MAP[colorKey] ?? "#ffffff";
}

function tokenizeInput(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(t => t.length > 0);
}

const FILLER_WORDS = new Set([
  "the", "a", "an", "to", "make", "set", "use", "change", "my", "our",
  "is", "be", "should", "turn", "switch", "let", "please", "just",
  "for", "of", "in", "on", "at", "by", "with", "and", "or", "i", "want",
  "would", "like", "need", "could", "can", "please", "now", "it",
]);

const OBJECT_KEYWORDS: Record<string, string[]> = {
  logo:       ["logo", "brand", "icon", "mark", "wordmark"],
  button:     ["button", "buttons", "btn", "cta", "call-to-action"],
  background: ["background", "bg", "backdrop"],
  font:       ["font", "typeface", "type", "typography", "text"],
  heading:    ["heading", "headings", "headline", "title", "h1"],
  spacing:    ["spacing", "space", "gap", "padding", "margin", "gaps"],
  radius:     ["radius", "corners", "corner", "rounding"],
  navbar:     ["navbar", "nav", "navigation", "header"],
  card:       ["card", "cards", "panel"],
};

const VALUE_KEYWORDS: Record<string, string> = {
  white:   "white",
  black:   "black",
  rounded: "rounded",
  round:   "rounded",
  sharp:   "sharp",
  square:  "square",
  large:   "large",
  bigger:  "large",
  smaller: "small",
  small:   "small",
  light:   "light",
  dark:    "dark",
};

function findObjectInTokens(tokens: string[]): string | null {
  for (const [obj, keywords] of Object.entries(OBJECT_KEYWORDS)) {
    if (keywords.some(k => tokens.includes(k))) return obj;
  }
  return null;
}

function findColorValueInTokens(tokens: string[]): string | null {
  return tokens.find(t => COLOR_KEYWORDS[t]) ?? null;
}

export function parseNLCommand(input: string): ParseResult {
  const text = input.toLowerCase().trim();
  const tokens = tokenizeInput(input);
  const contentTokens = tokens.filter(t => !FILLER_WORDS.has(t));
  const patches: NLPatch[] = [];
  const description: string[] = [];

  const intent = interpretIntent(input);

  const has = (...terms: string[]) => terms.some(t => text.includes(t));
  const hasToken = (...words: string[]) => words.some(w => tokens.includes(w));

  const detectedObject = findObjectInTokens(contentTokens);
  const detectedColorValue = findColorValueInTokens(contentTokens);

  if (intent.productType) {
    const entry = contextLibrary[intent.productType as keyof typeof contextLibrary] as { label: string } | undefined;
    description.push(`Switching layout to: ${entry?.label ?? intent.productType}`);
  }

  if (intent.style && STYLE_GENOME_PATCHES[intent.style]) {
    patches.push(...STYLE_GENOME_PATCHES[intent.style]);
    description.push(`Applied ${intent.style} style`);
  }

  // ── LOGO COLOR ──────────────────────────────────────────────────
  // Primary: intent-based detection (regex patterns)
  // Fallback: token-based detection — logo word + color word anywhere in tokens
  const logoColorSource = intent.logoColorHint ?? (
    detectedObject === "logo" && detectedColorValue ? detectedColorValue : null
  );
  if (logoColorSource) {
    const logoColor = resolveLogoColor(logoColorSource);
    patches.push({ op: "set", path: "branding.logoColor", value: logoColor });
    description.push(`Set logo color to ${logoColorSource}`);
  }

  // ── FONT CONTROL ────────────────────────────────────────────────
  if (intent.fontHint) {
    const isSerif = ["Playfair Display", "Lora", "Merriweather", "Libre Baskerville", "Cormorant", "Fraunces"].includes(intent.fontHint);
    const isMono = ["JetBrains Mono", "Fira Code", "IBM Plex Mono", "Space Mono", "Roboto Mono"].includes(intent.fontHint);
    const bodyFont = isSerif ? "Lora" : isMono ? "JetBrains Mono" : intent.fontHint;
    patches.push(
      { op: "set", path: "typography.heading", value: intent.fontHint },
      { op: "set", path: "typography.body", value: bodyFont },
    );
    description.push(`Set font to ${intent.fontHint}`);
  }

  // Heading weight
  if (has("make headings bold", "bold headings", "heavy headings", "bold heading")) {
    patches.push({ op: "set", path: "typography.headingWeight", value: 800 });
    description.push("Made headings bold");
  }
  if (has("light headings", "thin headings", "regular headings")) {
    patches.push({ op: "set", path: "typography.headingWeight", value: 400 });
    description.push("Set headings to light weight");
  }

  // Letter spacing
  if (has("increase letter spacing", "more letter spacing", "wider letters", "tracked text")) {
    patches.push({ op: "set", path: "typography.letterSpacing", value: "0.06em" });
    description.push("Increased letter spacing");
  }
  if (has("reduce letter spacing", "less letter spacing", "tighter letters")) {
    patches.push({ op: "set", path: "typography.letterSpacing", value: "-0.01em" });
    description.push("Reduced letter spacing");
  }

  // ── TEXT SIZE ────────────────────────────────────────────────────
  if (intent.textSizeHint === "increase") {
    patches.push(
      { op: "set", path: "typography.sizes.base", value: "18px" },
      { op: "set", path: "typography.sizes.sm",   value: "15px" },
      { op: "set", path: "typography.sizes.xs",   value: "13px" },
    );
    description.push("Increased text size");
  } else if (intent.textSizeHint === "decrease") {
    patches.push(
      { op: "set", path: "typography.sizes.base", value: "14px" },
      { op: "set", path: "typography.sizes.sm",   value: "12px" },
      { op: "set", path: "typography.sizes.xs",   value: "10px" },
    );
    description.push("Decreased text size");
  }

  // ── PRIMARY COLOR (non-logo) ─────────────────────────────────────
  if (!intent.logoColorHint && intent.colorHint) {
    if (intent.colorHint === "white") {
      patches.push(
        { op: "set", path: "colors.background", value: "hsl(0, 0%, 98%)" },
        { op: "set", path: "colors.surface",    value: "hsl(0, 0%, 94%)" },
      );
      description.push("Set light background");
    } else if (intent.colorHint === "black") {
      patches.push(
        { op: "set", path: "colors.background", value: "hsl(0, 0%, 3%)" },
        { op: "set", path: "colors.surface",    value: "hsl(0, 0%, 8%)" },
      );
      description.push("Set dark background");
    } else if (COLOR_MAP[intent.colorHint]) {
      const hasColorIntent = has("color", "primary", "theme", "make it", "use", "set");
      if (hasColorIntent || text.split(" ").length <= 4) {
        patches.push(...derivePalette(COLOR_MAP[intent.colorHint]));
        description.push(`Set primary color to ${intent.colorHint}`);
      }
    }
  }

  // ── SPACING ──────────────────────────────────────────────────────
  if (intent.spacingHint === "decrease") {
    patches.push(
      { op: "set", path: "spacing.ratio", value: 1.18 },
      { op: "set", path: "spacing.xs", value: "4px" },
      { op: "set", path: "spacing.sm", value: "5px" },
      { op: "set", path: "spacing.md", value: "6px" },
      { op: "set", path: "spacing.lg", value: "8px" },
      { op: "set", path: "spacing.xl", value: "10px" },
    );
    description.push("Reduced spacing");
  } else if (intent.spacingHint === "increase") {
    patches.push(
      { op: "set", path: "spacing.ratio", value: 1.5 },
      { op: "set", path: "spacing.xs", value: "6px" },
      { op: "set", path: "spacing.sm", value: "10px" },
      { op: "set", path: "spacing.md", value: "16px" },
      { op: "set", path: "spacing.lg", value: "24px" },
      { op: "set", path: "spacing.xl", value: "36px" },
    );
    description.push("Increased spacing");
  }

  // ── BORDER RADIUS ─────────────────────────────────────────────────
  if (intent.radiusHint === "increase") {
    patches.push(
      { op: "set", path: "radius.sm", value: "8px" },
      { op: "set", path: "radius.md", value: "16px" },
      { op: "set", path: "radius.lg", value: "24px" },
      { op: "set", path: "radius.xl", value: "32px" },
    );
    description.push("Made corners more rounded");
  } else if (intent.radiusHint === "decrease") {
    patches.push(
      { op: "set", path: "radius.sm", value: "1px" },
      { op: "set", path: "radius.md", value: "2px" },
      { op: "set", path: "radius.lg", value: "4px" },
      { op: "set", path: "radius.xl", value: "6px" },
    );
    description.push("Made corners sharper");
  }

  // ── BACKGROUND ─────────────────────────────────────────────────────
  if (intent.backgroundHint === "light") {
    patches.push(
      { op: "set", path: "colors.background", value: "hsl(0, 0%, 98%)" },
      { op: "set", path: "colors.surface",    value: "hsl(0, 0%, 93%)" },
    );
    description.push("Set light background");
  } else if (intent.backgroundHint === "dark") {
    patches.push(
      { op: "set", path: "colors.background", value: "hsl(222, 15%, 5%)" },
      { op: "set", path: "colors.surface",    value: "hsl(222, 12%, 9%)" },
    );
    description.push("Set dark background");
  }

  // ── GRADIENT CONTROL ───────────────────────────────────────────────
  if (has("remove gradient", "no gradient", "remove gradients", "no gradients", "flat design", "flat colors")) {
    patches.push({ op: "set", path: "settings.removeGradients", value: true });
    description.push("Removed gradient effects");
  }
  if (has("add gradient", "use gradient", "add gradients", "use gradients")) {
    patches.push({ op: "set", path: "settings.removeGradients", value: false });
    description.push("Enabled gradient effects");
  }

  // ── ANIMATION ──────────────────────────────────────────────────────
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

  // ── ICONS ──────────────────────────────────────────────────────────
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

  // ── ACCESSIBILITY ──────────────────────────────────────────────────
  const isAccessible = has("accessible", "more readable", "legible");
  if (isAccessible && intent.textSizeHint !== "increase") {
    patches.push(
      { op: "set", path: "typography.sizes.base", value: "18px" },
      { op: "set", path: "typography.sizes.sm",   value: "15px" },
    );
    description.push("Improved accessibility — larger base text size");
  }

  // ── INDUSTRY CONSTRAINTS ───────────────────────────────────────────
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

  // ── TOKEN-BASED FALLBACKS ──────────────────────────────────────
  // Handle cases not caught by phrase/regex matching above

  // button + color → set button color via primary
  if (detectedObject === "button" && detectedColorValue && !logoColorSource && !intent.colorHint) {
    if (COLOR_MAP[detectedColorValue]) {
      patches.push(...derivePalette(COLOR_MAP[detectedColorValue]));
      description.push(`Set button color to ${detectedColorValue}`);
    }
  }

  // background/bg + light/dark
  if (!intent.backgroundHint && detectedObject === "background") {
    if (hasToken("light", "white", "bright")) {
      patches.push(
        { op: "set", path: "colors.background", value: "hsl(0, 0%, 98%)" },
        { op: "set", path: "colors.surface",    value: "hsl(0, 0%, 93%)" },
      );
      description.push("Set light background");
    } else if (hasToken("dark", "black", "night")) {
      patches.push(
        { op: "set", path: "colors.background", value: "hsl(222, 15%, 5%)" },
        { op: "set", path: "colors.surface",    value: "hsl(222, 12%, 9%)" },
      );
      description.push("Set dark background");
    }
  }

  // radius / corners + round or sharp (token-based)
  if (!intent.radiusHint && detectedObject === "radius") {
    if (hasToken("round", "rounded", "smooth", "soft", "curved")) {
      patches.push(
        { op: "set", path: "radius.sm", value: "8px" },
        { op: "set", path: "radius.md", value: "16px" },
        { op: "set", path: "radius.lg", value: "24px" },
        { op: "set", path: "radius.xl", value: "32px" },
      );
      description.push("Made corners rounded");
    } else if (hasToken("sharp", "square", "flat", "angular")) {
      patches.push(
        { op: "set", path: "radius.sm", value: "1px" },
        { op: "set", path: "radius.md", value: "2px" },
        { op: "set", path: "radius.lg", value: "4px" },
        { op: "set", path: "radius.xl", value: "6px" },
      );
      description.push("Made corners sharp");
    }
  }

  // font/text + color → primary color if no other color patches
  if (detectedObject === "font" && detectedColorValue && !logoColorSource && !intent.colorHint
      && COLOR_MAP[detectedColorValue]) {
    patches.push(...derivePalette(COLOR_MAP[detectedColorValue]));
    description.push(`Set primary color to ${detectedColorValue}`);
  }

  if (patches.length === 0 && !intent.productType) {
    description.push(
      "No recognized changes found. Try: 'use blue', 'make it minimal', 'use Inter font', " +
      "'make the logo white', 'round the corners', 'increase spacing', 'larger text', " +
      "'change logo color to teal', 'logo should be black'."
    );
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
