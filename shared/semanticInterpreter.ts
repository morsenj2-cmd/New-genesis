import {
  TARGET_ALIASES,
  COLOR_VALUE_ALIASES,
  STYLE_VALUE_ALIASES,
  RADIUS_VALUE_ALIASES,
  SPACING_VALUE_ALIASES,
  PRODUCT_TYPE_ALIASES,
} from "./semanticDictionary";

export type IntentType =
  | "modify"
  | "set_product_type"
  | "change_style"
  | "change_name"
  | "noop";

export interface SemanticIntent {
  intent: IntentType;
  target: string;
  value: string | null;
  confidence: number;
  raw?: string;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function jaroSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length, lb = b.length;
  if (la === 0 || lb === 0) return 0;
  const range = Math.floor(Math.max(la, lb) / 2) - 1;
  const ma: boolean[] = new Array(la).fill(false);
  const mb: boolean[] = new Array(lb).fill(false);
  let matches = 0;
  let transpositions = 0;
  for (let i = 0; i < la; i++) {
    const start = Math.max(0, i - range);
    const end = Math.min(i + range + 1, lb);
    for (let j = start; j < end; j++) {
      if (mb[j] || a[i] !== b[j]) continue;
      ma[i] = mb[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  let k = 0;
  for (let i = 0; i < la; i++) {
    if (!ma[i]) continue;
    while (!mb[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  const jaro = (matches / la + matches / lb + (matches - transpositions / 2) / matches) / 3;
  let p = 0;
  const pfxLen = Math.min(4, Math.min(la, lb));
  while (p < pfxLen && a[p] === b[p]) p++;
  return jaro + p * 0.1 * (1 - jaro);
}

function similarity(a: string, b: string): number {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.92;
  return jaroSimilarity(na, nb);
}

function bestMatch(input: string, candidates: string[]): [string, number] {
  let best = candidates[0], bestScore = 0;
  for (const c of candidates) {
    const score = similarity(input, c);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return [best, bestScore];
}

function resolveTarget(phrase: string): [string | null, number] {
  let bestTarget: string | null = null;
  let bestScore = 0;
  const p = normalize(phrase);
  for (const { target, aliases } of TARGET_ALIASES) {
    const [, score] = bestMatch(p, aliases.map(normalize));
    if (score > bestScore) { bestScore = score; bestTarget = target; }
  }
  return bestScore >= 0.65 ? [bestTarget, bestScore] : [null, 0];
}

function resolveColorValue(phrase: string): string | null {
  const p = normalize(phrase);
  let best: string | null = null, bestScore = 0;
  for (const [alias, value] of Object.entries(COLOR_VALUE_ALIASES)) {
    const score = similarity(p, alias);
    if (score > bestScore) { bestScore = score; best = value; }
  }
  return bestScore >= 0.72 ? best : null;
}

function resolveProductType(phrase: string): string | null {
  const p = normalize(phrase);
  for (const [alias, type] of Object.entries(PRODUCT_TYPE_ALIASES)) {
    if (p.includes(normalize(alias))) return type;
  }
  let best: string | null = null, bestScore = 0;
  for (const [alias, type] of Object.entries(PRODUCT_TYPE_ALIASES)) {
    const score = similarity(p, alias);
    if (score > bestScore) { bestScore = score; best = type; }
  }
  return bestScore >= 0.78 ? best : null;
}

function resolveStyleValue(phrase: string): string | null {
  const p = normalize(phrase);
  for (const [alias, style] of Object.entries(STYLE_VALUE_ALIASES)) {
    if (p.includes(alias)) return style;
  }
  let best: string | null = null, bestScore = 0;
  for (const [alias, style] of Object.entries(STYLE_VALUE_ALIASES)) {
    const score = similarity(p, alias);
    if (score > bestScore) { bestScore = score; best = style; }
  }
  return bestScore >= 0.8 ? best : null;
}

function resolveRadiusValue(phrase: string): string | null {
  const p = normalize(phrase);
  for (const [alias, val] of Object.entries(RADIUS_VALUE_ALIASES)) {
    if (p.includes(alias)) return val;
  }
  return null;
}

function resolveSpacingValue(phrase: string): string | null {
  const p = normalize(phrase);
  for (const [alias, val] of Object.entries(SPACING_VALUE_ALIASES)) {
    if (p.includes(alias)) return val;
  }
  return null;
}

const NON_NAME_TARGETS = /\b(theme|color|colour|font|style|spacing|radius|corners|background|animation|layout|section|heading|headline|subheadline|cta|button|text|icon|gradient|motion|padding|margin|size|logo|primary|accent|typography)\b/i;

const RENAME_PATTERNS = [
  /^(?:call|name)\s+it\s+"?([^"]+?)"?\s*$/i,
  /(?:let(?:'s|\s+us)?|we(?:'ll|'re going to)?)\s+call\s+it\s+"?([^"]+?)"?\s*$/i,
  /(?:change|update|set|rename)\s+(?:the\s+)?(?:brand\s+|site\s+|app\s+|product\s+|company\s+)?(?:name|title|brand)\s+(?:to|as|:)\s+"?([^"]+?)"?\s*$/i,
  /(?:call|name)\s+(?:the\s+)?(?:(?:brand\s+|site\s+|app\s+|product\s+|company\s+)?(?:name|title|brand)\s+)?(?:it\s+)?(?:to\s+|as\s+)"?([^"]+?)"?\s*$/i,
  /^"?([A-Z][a-z]+(?:\s+[A-Za-z]+)*)"?\s+(?:should\s+be|is now|→|->|to)\s+"?([^"]+?)"?\s*$/i,
  /(?:the\s+)?(?:brand\s+|site\s+|app\s+|product\s+)?(?:name|title)\s+(?:should\s+be|is|=)\s+"?([^"]+?)"?\s*$/i,
  /make\s+(?:it\s+)?called?\s+"?([^"]+?)"?\s*$/i,
  /rebrand(?:\s+(?:to|as))?\s+"?([^"]+?)"?\s*$/i,
];

function extractBrandName(input: string): string | null {
  const hasNameWord = /\b(brand name|brand\s+name|name\s+to|name\s+as|rebrand|call it|name it|called)\b/i.test(input);
  if (!hasNameWord && NON_NAME_TARGETS.test(input)) return null;
  for (const pattern of RENAME_PATTERNS) {
    const m = input.match(pattern);
    if (m) {
      const captured = m[m.length - 1]?.trim();
      if (captured && captured.length >= 2 && captured.length <= 40) {
        if (NON_NAME_TARGETS.test(captured) && !hasNameWord) return null;
        return captured
          .split(/\s+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
      }
    }
  }
  return null;
}

const PRODUCT_INTENT_PATTERNS = [
  /make\s+(?:this\s+(?:a|an)\s+)?([a-z\s\-]+?)(?:\s+(?:platform|app|website|tool|product|system))?(?:\s+landing page)?$/i,
  /(?:convert|change|turn)\s+(?:this\s+)?(?:into|to)\s+(?:a\s+)?([a-z\s\-]+?)(?:\s+(?:platform|app|website|tool))?$/i,
  /this\s+is\s+(?:a\s+)?([a-z\s\-]+?)(?:\s+(?:platform|app|website|tool))?$/i,
  /build\s+(?:a\s+)?([a-z\s\-]+?)(?:\s+(?:platform|app|website|tool|landing page))?$/i,
];

function extractProductType(input: string): string | null {
  const lower = input.toLowerCase();
  for (const pattern of PRODUCT_INTENT_PATTERNS) {
    const m = lower.match(pattern);
    if (m) {
      const phrase = m[1].trim();
      const type = resolveProductType(phrase);
      if (type) return type;
    }
  }
  return resolveProductType(lower);
}

const FONT_NAME_MAP: Record<string, string> = {
  inter:            "Inter",
  roboto:           "Roboto",
  poppins:          "Poppins",
  montserrat:       "Montserrat",
  "open sans":      "Open Sans",
  opensans:         "Open Sans",
  lato:             "Lato",
  raleway:          "Raleway",
  oswald:           "Oswald",
  nunito:           "Nunito",
  "source sans":    "Source Sans 3",
  ubuntu:           "Ubuntu",
  rubik:            "Rubik",
  "work sans":      "Work Sans",
  worksans:         "Work Sans",
  manrope:          "Manrope",
  outfit:           "Outfit",
  "dm sans":        "DM Sans",
  geist:            "Geist",
  syne:             "Syne",
  "fira sans":      "Fira Sans",
  "space grotesk":  "Space Grotesk",
  spacegrotesk:     "Space Grotesk",
  "ibm plex":       "IBM Plex Sans",
  "plus jakarta":   "Plus Jakarta Sans",
  playfair:         "Playfair Display",
  "playfair display": "Playfair Display",
  lora:             "Lora",
  merriweather:     "Merriweather",
  "libre baskerville": "Libre Baskerville",
  cormorant:        "Cormorant",
  fraunces:         "Fraunces",
  serif:            "Playfair Display",
  "sans serif":     "Inter",
  "sans-serif":     "Inter",
  monospace:        "JetBrains Mono",
  mono:             "JetBrains Mono",
  jetbrains:        "JetBrains Mono",
  "jetbrains mono": "JetBrains Mono",
  "fira code":      "Fira Code",
  firacode:         "Fira Code",
};

const COLOR_KEYWORDS: Record<string, string> = {
  blue: "blue", cobalt: "cobalt", navy: "navy", azure: "azure",
  sky: "sky", cyan: "cyan", teal: "teal", green: "green",
  emerald: "emerald", mint: "mint", lime: "lime", yellow: "yellow",
  amber: "amber", orange: "orange", red: "red", crimson: "crimson",
  rose: "rose", pink: "pink", purple: "purple", violet: "violet",
  indigo: "indigo", lavender: "lavender", white: "white", black: "black",
  gray: "gray", grey: "gray", silver: "gray",
  coral: "coral", salmon: "salmon", gold: "gold", bronze: "bronze",
  brown: "brown", slate: "slate", fuchsia: "fuchsia", magenta: "magenta",
  "dark blue": "dark blue", "sky blue": "sky blue", "burnt orange": "burnt orange",
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(t => t.length > 0);
}

function detectFont(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [keyword, fontName] of Object.entries(FONT_NAME_MAP)) {
    if (lower.includes(keyword)) return fontName;
  }
  return null;
}

function detectLogoColor(text: string): string | null {
  const lower = text.toLowerCase();
  const logoPatterns = [
    /logo\s+(?:color\s+)?(?:to\s+|is\s+|be\s+)?(\w+)/,
    /(?:make|set|change|turn)\s+(?:the\s+)?(?:\w+\s+)*logo\s+(?:color\s+)?(?:to\s+)?(\w+)/,
    /logo\s+should\s+(?:be\s+)?(\w+)/,
    /(\w+)\s+(?:colored?\s+)?logo/,
  ];
  for (const pattern of logoPatterns) {
    const match = lower.match(pattern);
    if (match && match[1] && COLOR_KEYWORDS[match[1]]) {
      return COLOR_KEYWORDS[match[1]];
    }
  }
  const tokens = tokenize(text);
  const logoIdx = tokens.indexOf("logo");
  if (logoIdx !== -1) {
    for (let offset = -3; offset <= 3; offset++) {
      if (offset === 0) continue;
      const candidate = tokens[logoIdx + offset];
      if (candidate && COLOR_KEYWORDS[candidate]) return COLOR_KEYWORDS[candidate];
    }
  }
  return null;
}

function detectColorHint(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [word, color] of Object.entries(COLOR_KEYWORDS)) {
    if (new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower)) {
      return color;
    }
  }
  return null;
}

function detectDirectionHint(text: string, domain: string[], upWords: string[], downWords: string[]): "increase" | "decrease" | null {
  const lower = text.toLowerCase();
  const tokens = tokenize(text);
  for (const phrase of downWords) {
    if (lower.includes(phrase)) return "decrease";
  }
  for (const phrase of upWords) {
    if (lower.includes(phrase)) return "increase";
  }
  const idx = tokens.findIndex(t => domain.includes(t));
  if (idx !== -1) {
    const nearby = tokens.slice(Math.max(0, idx - 3), idx + 4);
    if (nearby.some(t => ["increase", "more", "add", "bigger", "larger", "wider", "higher"].includes(t))) return "increase";
    if (nearby.some(t => ["decrease", "reduce", "less", "smaller", "tighter", "narrow", "lower"].includes(t))) return "decrease";
  }
  return null;
}

function detectSpacingHint(text: string): "increase" | "decrease" | null {
  return detectDirectionHint(text,
    ["spacing", "space", "padding", "gaps", "gap"],
    ["increase spacing", "more spacing", "spacious", "airy", "more padding", "larger spacing", "bigger spacing", "open layout", "more whitespace", "more white space", "expand spacing", "wider spacing", "breathe"],
    ["reduce spacing", "less spacing", "tight spacing", "compact", "reduce padding", "less padding", "smaller spacing", "decrease spacing", "narrow spacing", "tighter spacing", "condense", "condensed"],
  );
}

function detectRadiusHint(text: string): "increase" | "decrease" | null {
  const lower = text.toLowerCase();
  const tokens = tokenize(text);
  const roundUp = ["rounded", "round corners", "soft corners", "pill", "pill buttons", "more rounded", "circular", "more round", "make corners round", "make rounded", "rounder", "smooth corners", "curved"];
  const sharpDown = ["sharp corners", "square corners", "no rounded", "no round", "sharp buttons", "angular", "straight corners", "less rounded", "flat corners", "make corners sharp", "sharp edges", "boxy", "no radius"];
  if (sharpDown.some(p => lower.includes(p))) return "decrease";
  if (roundUp.some(p => lower.includes(p))) return "increase";
  const cornerIdx = tokens.findIndex(t => ["corners", "corner", "radius", "buttons"].includes(t));
  if (cornerIdx !== -1) {
    const nearby = tokens.slice(Math.max(0, cornerIdx - 3), cornerIdx + 4);
    if (nearby.some(t => ["round", "rounded", "smooth", "soft", "curved"].includes(t))) return "increase";
    if (nearby.some(t => ["sharp", "square", "flat", "angular", "straight"].includes(t))) return "decrease";
  }
  if (tokens.includes("rounded") && !tokens.includes("less") && !tokens.includes("remove")) return "increase";
  if (tokens.includes("sharp") && tokens.some(t => ["make", "be", "use"].includes(t))) return "decrease";
  return null;
}

function detectBackgroundHint(text: string): "light" | "dark" | null {
  const lower = text.toLowerCase();
  const lightPhrases = ["light background", "white background", "light mode", "bright background", "light theme", "make it light", "light color scheme"];
  const darkPhrases = ["dark background", "black background", "dark mode", "dark theme", "make it dark", "dark color scheme"];
  if (lightPhrases.some(p => lower.includes(p))) return "light";
  if (darkPhrases.some(p => lower.includes(p))) return "dark";
  const tokens = tokenize(text);
  const bgIdx = tokens.findIndex(t => ["background", "bg", "theme", "mode"].includes(t));
  if (bgIdx !== -1) {
    const nearby = tokens.slice(Math.max(0, bgIdx - 3), bgIdx + 4);
    if (nearby.some(t => ["light", "white", "bright", "pale"].includes(t))) return "light";
    if (nearby.some(t => ["dark", "black", "night", "dim"].includes(t))) return "dark";
  }
  return null;
}

function detectTextSizeHint(text: string): "increase" | "decrease" | null {
  return detectDirectionHint(text,
    ["text", "font", "type", "typography", "size"],
    ["larger text", "bigger text", "increase font size", "larger font", "bigger font", "make text larger", "make text bigger", "increase text size", "more readable", "increase typography", "larger type"],
    ["smaller text", "smaller font", "reduce font size", "decrease font size", "make text smaller", "reduce text size", "decrease typography", "compact text"],
  );
}

function extractQuotedOrRaw(phrase: string): string | null {
  const m = phrase.match(/"([^"]+)"|'([^']+)'/);
  if (m) return m[1] || m[2];
  return phrase
    .replace(/^(?:change|set|update|make|use|to|the)\s+/i, "")
    .replace(/^(?:headline|heading|title|text|subheadline|cta|button)\s+(?:to\s+)?/i, "")
    .trim() || null;
}

function titleCase(s: string): string {
  return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function resolveValueForTarget(target: string, phrase: string): string | null {
  switch (target) {
    case "brand.name":
      return extractBrandName(phrase) || (phrase.length <= 40 ? titleCase(phrase) : null);
    case "brand.logoColor":
    case "theme.primaryColor":
    case "theme.backgroundColor":
      return resolveColorValue(phrase);
    case "theme.style":
      return resolveStyleValue(phrase);
    case "theme.radius":
      return resolveRadiusValue(phrase);
    case "theme.spacing":
      return resolveSpacingValue(phrase);
    case "product.type":
      return resolveProductType(phrase);
    case "content.headline":
    case "content.subheadline":
    case "content.ctaLabel":
      return extractQuotedOrRaw(phrase);
    default:
      return null;
  }
}

export function interpretSemantic(input: string): SemanticIntent {
  const all = interpretSemanticMulti(input);
  return all[0];
}

export function interpretSemanticMulti(input: string): SemanticIntent[] {
  const raw = input.trim();
  if (!raw) return [{ intent: "noop", target: "", value: null, confidence: 0, raw }];

  const clauses = splitCompoundCommand(raw);
  if (clauses.length > 1) {
    const allIntents: SemanticIntent[] = [];
    const seenTargets = new Set<string>();
    for (const clause of clauses) {
      const subIntents = interpretSingleCommand(clause);
      for (const si of subIntents) {
        if (si.intent !== "noop" && !seenTargets.has(si.target)) {
          allIntents.push(si);
          seenTargets.add(si.target);
        }
      }
    }
    if (allIntents.length > 0) return allIntents;
  }

  return interpretSingleCommand(raw);
}

function splitCompoundCommand(input: string): string[] {
  const hasQuotes = /["']/.test(input);
  if (hasQuotes) return [input];
  const parts = input.split(/\s+and\s+|\s*,\s+/i);
  if (parts.length <= 1) return [input];
  return parts.map(p => p.trim()).filter(p => p.length > 0);
}

function interpretSingleCommand(input: string): SemanticIntent[] {
  const raw = input.trim();
  if (!raw) return [{ intent: "noop", target: "", value: null, confidence: 0, raw }];

  const lower = normalize(raw);
  const lowerOriginal = raw.toLowerCase();
  const intents: SemanticIntent[] = [];
  const handledDomains = new Set<string>();

  const brandName = extractBrandName(raw);
  if (brandName) {
    intents.push({ intent: "change_name", target: "brand.name", value: brandName, confidence: 0.95, raw });
    handledDomains.add("name");
    handledDomains.add("brand.name");
  }

  const productChangeSignals = [
    "make this a", "make it a", "turn this into", "convert to",
    "this is a", "change to a", "switch to a", "build a",
  ];
  const hasProductSignal = productChangeSignals.some(s => lower.includes(s));
  if (hasProductSignal) {
    const productType = extractProductType(raw);
    if (productType) {
      intents.push({ intent: "set_product_type", target: "product.type", value: productType, confidence: 0.88, raw });
      handledDomains.add("product");
    }
  }

  const changePattern = /(?:change|set|update|make)\s+(?:the\s+)?(.+?)\s+(?:to|=)\s+(.+)/i;
  const m = raw.match(changePattern);
  if (m) {
    const targetPhrase = m[1].trim();
    const valuePhrase = m[2].trim();
    const [target, tConf] = resolveTarget(targetPhrase);
    if (target && tConf >= 0.65) {
      const value = resolveValueForTarget(target, valuePhrase);
      if (value) {
        const domain = target.split(".")[0];
        if (!handledDomains.has(domain) && !handledDomains.has(target)) {
          intents.push({ intent: "modify", target, value, confidence: tConf * 0.9, raw });
          handledDomains.add(domain);
          handledDomains.add(target);
        }
      }
    }
  }

  const contentHeadlinePattern = /(?:change|set|update|make)\s+(?:the\s+)?(?:headline|heading|hero text|hero heading|h1|main heading)\s+(?:to|say|read)\s+["']?(.+?)["']?\s*$/i;
  const hmatch = raw.match(contentHeadlinePattern);
  if (hmatch && !handledDomains.has("content.headline")) {
    intents.push({ intent: "modify", target: "content.headline", value: hmatch[1].trim(), confidence: 0.9, raw });
    handledDomains.add("content.headline");
  }

  const contentSubPattern = /(?:change|set|update|make)\s+(?:the\s+)?(?:subheadline|subheading|subtitle|tagline|description)\s+(?:to|say|read)\s+["']?(.+?)["']?\s*$/i;
  const smatch = raw.match(contentSubPattern);
  if (smatch && !handledDomains.has("content.subheadline")) {
    intents.push({ intent: "modify", target: "content.subheadline", value: smatch[1].trim(), confidence: 0.9, raw });
    handledDomains.add("content.subheadline");
  }

  const contentCtaPattern = /(?:change|set|update|make)\s+(?:the\s+)?(?:cta|button text|call to action|button label|cta button)\s+(?:to|say|read)\s+["']?(.+?)["']?\s*$/i;
  const cmatch = raw.match(contentCtaPattern);
  if (cmatch && !handledDomains.has("content.ctaLabel")) {
    intents.push({ intent: "modify", target: "content.ctaLabel", value: cmatch[1].trim(), confidence: 0.9, raw });
    handledDomains.add("content.ctaLabel");
  }

  const styleSignals = ["make it", "go with", "use a", "make the design", "style"];
  const hasStyleSignal = styleSignals.some(s => lower.includes(s));
  const styleWordMatch = lower.match(/\b(minimal|bold|vibrant|futuristic|dark|elegant|playful|corporate|creative)\b/);
  const styleWordIsScoped = styleWordMatch && /\b(heading|headings|text|font|corner|button|letter|icon)\b/i.test(lower);
  if ((hasStyleSignal || styleWordMatch) && !styleWordIsScoped) {
    const style = resolveStyleValue(raw);
    if (style && !handledDomains.has("style")) {
      intents.push({ intent: "change_style", target: "theme.style", value: style, confidence: 0.82, raw });
      handledDomains.add("style");
    }
  }

  const logoColor = detectLogoColor(raw);
  if (logoColor && !handledDomains.has("brand.logoColor")) {
    const resolved = resolveColorValue(logoColor) || COLOR_VALUE_ALIASES[logoColor] || null;
    if (resolved) {
      intents.push({ intent: "modify", target: "brand.logoColor", value: resolved, confidence: 0.85, raw });
      handledDomains.add("brand.logoColor");
    }
  }

  if (!handledDomains.has("background")) {
    const bgHint = detectBackgroundHint(raw);
    if (bgHint) {
      intents.push({ intent: "modify", target: "theme.background", value: bgHint, confidence: 0.85, raw });
      handledDomains.add("background");
    }
  }

  if (!handledDomains.has("primaryColor")) {
    const colorHint = detectColorHint(raw);
    if (colorHint) {
      const isLogo = lowerOriginal.includes("logo") || lowerOriginal.includes("brand icon");
      if (!isLogo || handledDomains.has("brand.logoColor")) {
        const colorVal = resolveColorValue(colorHint) || COLOR_VALUE_ALIASES[colorHint] || null;
        if (colorVal && !isLogo) {
          const isBackground = lowerOriginal.includes("background") || lowerOriginal.includes("bg ");
          const target = isBackground ? "theme.backgroundColor" : "theme.primaryColor";
          intents.push({ intent: "modify", target, value: colorVal, confidence: 0.8, raw });
          handledDomains.add("primaryColor");
        }
      }
    }
  }

  const font = detectFont(raw);
  if (font && !handledDomains.has("font")) {
    intents.push({ intent: "modify", target: "theme.font", value: font, confidence: 0.88, raw });
    handledDomains.add("font");
  }

  if (!handledDomains.has("headingWeight")) {
    const headingWeightUp = ["make headings bold", "bold headings", "heavy headings", "bold heading", "bolder headings", "thick headings"];
    const headingWeightDown = ["light headings", "thin headings", "regular headings", "lighter headings"];
    if (headingWeightUp.some(p => lowerOriginal.includes(p))) {
      intents.push({ intent: "modify", target: "theme.headingWeight", value: "bold", confidence: 0.85, raw });
      handledDomains.add("headingWeight");
    } else if (headingWeightDown.some(p => lowerOriginal.includes(p))) {
      intents.push({ intent: "modify", target: "theme.headingWeight", value: "light", confidence: 0.85, raw });
      handledDomains.add("headingWeight");
    }
  }

  if (!handledDomains.has("letterSpacing")) {
    const lsUp = ["increase letter spacing", "more letter spacing", "wider letters", "tracked text", "add letter spacing"];
    const lsDown = ["reduce letter spacing", "less letter spacing", "tighter letters", "remove letter spacing"];
    if (lsUp.some(p => lowerOriginal.includes(p))) {
      intents.push({ intent: "modify", target: "theme.letterSpacing", value: "wide", confidence: 0.85, raw });
      handledDomains.add("letterSpacing");
    } else if (lsDown.some(p => lowerOriginal.includes(p))) {
      intents.push({ intent: "modify", target: "theme.letterSpacing", value: "tight", confidence: 0.85, raw });
      handledDomains.add("letterSpacing");
    }
  }

  const textSizeHint = detectTextSizeHint(raw);
  if (textSizeHint && !handledDomains.has("textSize")) {
    intents.push({ intent: "modify", target: "theme.textSize", value: textSizeHint, confidence: 0.85, raw });
    handledDomains.add("textSize");
  }

  const spacingHint = detectSpacingHint(raw);
  if (spacingHint && !handledDomains.has("spacing")) {
    const spacingVal = spacingHint === "increase" ? "airy" : "compact";
    intents.push({ intent: "modify", target: "theme.spacing", value: spacingVal, confidence: 0.82, raw });
    handledDomains.add("spacing");
  }

  const radiusHint = detectRadiusHint(raw);
  if (radiusHint && !handledDomains.has("radius")) {
    const radiusVal = radiusHint === "increase" ? "large" : "none";
    intents.push({ intent: "modify", target: "theme.radius", value: radiusVal, confidence: 0.82, raw });
    handledDomains.add("radius");
  }

  if (!handledDomains.has("gradients")) {
    const removeGradient = ["remove gradient", "no gradient", "remove gradients", "no gradients", "flat design", "flat colors"];
    const addGradient = ["add gradient", "use gradient", "add gradients", "use gradients", "enable gradient"];
    if (removeGradient.some(p => lowerOriginal.includes(p))) {
      intents.push({ intent: "modify", target: "settings.gradients", value: "off", confidence: 0.88, raw });
      handledDomains.add("gradients");
    } else if (addGradient.some(p => lowerOriginal.includes(p))) {
      intents.push({ intent: "modify", target: "settings.gradients", value: "on", confidence: 0.88, raw });
      handledDomains.add("gradients");
    }
  }

  if (!handledDomains.has("animation")) {
    const noMotion = ["no animation", "no motion", "reduce animation", "reduce motion", "disable animation", "disable motion", "less animation", "static", "remove animation"];
    const addMotion = ["add animation", "enable animation", "more animation", "animate", "add motion"];
    if (noMotion.some(p => lowerOriginal.includes(p))) {
      intents.push({ intent: "modify", target: "settings.animation", value: "off", confidence: 0.85, raw });
      handledDomains.add("animation");
    } else if (addMotion.some(p => lowerOriginal.includes(p))) {
      intents.push({ intent: "modify", target: "settings.animation", value: "on", confidence: 0.85, raw });
      handledDomains.add("animation");
    }
  }

  if (!handledDomains.has("icons")) {
    const noIcons = ["standard icon", "neutral icon", "disable icon", "plain icon", "no custom icon", "disable custom icon", "remove icon", "simple icon"];
    if (noIcons.some(p => lowerOriginal.includes(p))) {
      intents.push({ intent: "modify", target: "settings.icons", value: "standard", confidence: 0.82, raw });
      handledDomains.add("icons");
    }
  }

  const isAccessible = lowerOriginal.includes("accessible") || lowerOriginal.includes("more readable") || lowerOriginal.includes("legible");
  if (isAccessible && !handledDomains.has("textSize")) {
    intents.push({ intent: "modify", target: "settings.accessible", value: "on", confidence: 0.82, raw });
    handledDomains.add("accessible");
  }

  if (intents.length === 0) {
    const [target, tConf] = resolveTarget(lower);
    if (target && tConf >= 0.75) {
      const value = resolveValueForTarget(target, lower);
      if (value) {
        intents.push({ intent: "modify", target, value, confidence: tConf * 0.75, raw });
      }
    }
  }

  if (intents.length === 0) {
    const suggestions = inferSuggestions(raw);
    intents.push({
      intent: "noop",
      target: "",
      value: suggestions,
      confidence: 0,
      raw,
    });
  }

  return intents;
}

function inferSuggestions(input: string): string {
  const lower = input.toLowerCase();
  const tokens = tokenize(input);

  if (tokens.some(t => ["color", "colour", "shade", "hue", "palette"].includes(t))) {
    return 'Try specifying a color: "use blue" or "make the primary color teal"';
  }
  if (tokens.some(t => ["font", "typeface", "type", "typography"].includes(t))) {
    return 'Try specifying a font: "use Inter" or "use a serif font"';
  }
  if (tokens.some(t => ["layout", "section", "structure", "arrange"].includes(t))) {
    return 'Try: "make it minimal" or "change product type to analytics dashboard"';
  }
  if (tokens.some(t => ["bigger", "smaller", "larger", "size", "scale"].includes(t))) {
    return 'Try: "larger text", "increase spacing", or "rounded corners"';
  }
  return 'Try: "use blue", "make it minimal", "use Inter font", "round the corners", "increase spacing", "change name to Acme"';
}


export interface ProjectContext {
  industry?: string;
  productType?: string;
  audience?: string;
  tone?: string;
  features?: string[];
}

const AUDIENCE_PATTERNS: Record<string, string[]> = {
  teams: ["teams", "team", "organizations", "companies", "business"],
  developers: ["developers", "engineers", "devs", "programmers"],
  consumers: ["users", "people", "consumers", "individuals", "everyone"],
  students: ["students", "learners", "education"],
  enterprises: ["enterprise", "large companies", "corporations"],
};

const TONE_SIGNALS: Record<string, string[]> = {
  creative: ["creative", "artistic", "unique", "custom", "beautiful", "design"],
  professional: ["professional", "enterprise", "business", "corporate", "serious"],
  minimal: ["minimal", "simple", "clean", "lightweight"],
  bold: ["bold", "powerful", "impactful", "strong"],
};

export function interpretProjectPrompt(prompt: string): ProjectContext {
  const lower = normalize(prompt);
  const context: ProjectContext = {};

  const productType = resolveProductType(lower);
  if (productType) context.productType = productType;

  const PRODUCT_TO_INDUSTRY: Record<string, string> = {
    cloud_storage: "saas",
    chat_app: "saas",
    analytics_dashboard: "saas",
    ecommerce: "ecommerce",
    project_management: "saas",
    crm: "saas",
    social_media: "media",
    saas_generic: "saas",
    developer_tool: "tech",
    video_platform: "media",
    fintech: "finance",
    healthcare: "healthcare",
    education: "education",
    calendar_scheduling: "saas",
  };
  if (context.productType) {
    context.industry = PRODUCT_TO_INDUSTRY[context.productType] ?? "tech";
  }

  for (const [audience, signals] of Object.entries(AUDIENCE_PATTERNS)) {
    if (signals.some(s => lower.includes(s))) {
      context.audience = audience;
      break;
    }
  }

  let topTone = "creative";
  let topToneScore = 0;
  for (const [tone, signals] of Object.entries(TONE_SIGNALS)) {
    const matches = signals.filter(s => lower.includes(s)).length;
    if (matches > topToneScore) { topToneScore = matches; topTone = tone; }
  }
  context.tone = topTone;

  return context;
}
