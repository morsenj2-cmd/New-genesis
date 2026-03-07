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

// ── Similarity helpers ─────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Jaro-Winkler string similarity (0-1).
 * Fast, no dependencies, good for short phrases.
 */
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
  // Winkler prefix boost
  let p = 0;
  const pfxLen = Math.min(4, Math.min(la, lb));
  while (p < pfxLen && a[p] === b[p]) p++;
  return jaro + p * 0.1 * (1 - jaro);
}

function similarity(a: string, b: string): number {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1;
  // Substring bonus
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

// ── Target resolution ──────────────────────────────────────────────────────

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

// ── Value resolution ───────────────────────────────────────────────────────

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
  // Direct map check first
  for (const [alias, type] of Object.entries(PRODUCT_TYPE_ALIASES)) {
    if (p.includes(normalize(alias))) return type;
  }
  // Fuzzy fallback
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

// ── Brand name extraction ──────────────────────────────────────────────────

const RENAME_PATTERNS = [
  // "call it X" / "name it X" (no "to") — highest priority
  /^(?:call|name)\s+it\s+"?([^"]+?)"?\s*$/i,
  // "let's call it X" / "we'll call it X"
  /(?:let(?:'s|\s+us)?|we(?:'ll|'re going to)?)\s+call\s+it\s+"?([^"]+?)"?\s*$/i,
  // "change name to X" / "rename to X"
  /(?:change|update|set|rename)\s+(?:the\s+)?(?:(?:brand\s+|site\s+|app\s+|product\s+|company\s+)?(?:name|title|brand)\s+)?(?:to|as|:)\s+"?([^"]+?)"?\s*$/i,
  // "call the brand to/as X" / "name the brand as X" — requires explicit "it" or "to/as"
  /(?:call|name)\s+(?:the\s+)?(?:(?:brand\s+|site\s+|app\s+|product\s+|company\s+)?(?:name|title|brand)\s+)?(?:it\s+)?(?:to\s+|as\s+)"?([^"]+?)"?\s*$/i,
  // "change it from X to Y"
  /(?:change|rename)\s+(?:it\s+)?(?:from\s+"?[^"]+?"?\s+)?to\s+"?([^"]+?)"?\s*$/i,
  // "[X] to [Y]" where X looks like a brand name  
  /^"?([A-Z][a-z]+(?:\s+[A-Za-z]+)*)"?\s+(?:should\s+be|is now|→|->|to)\s+"?([^"]+?)"?\s*$/i,
  // "the name should be X"
  /(?:the\s+)?(?:brand\s+|site\s+|app\s+|product\s+)?(?:name|title)\s+(?:should\s+be|is|=)\s+"?([^"]+?)"?\s*$/i,
  // "make it called X"
  /make\s+(?:it\s+)?called?\s+"?([^"]+?)"?\s*$/i,
  // "rebrand (?:to|as) X"
  /rebrand(?:\s+(?:to|as))?\s+"?([^"]+?)"?\s*$/i,
];

function extractBrandName(input: string): string | null {
  for (const pattern of RENAME_PATTERNS) {
    const m = input.match(pattern);
    if (m) {
      // Use last capture group (the new name)
      const captured = m[m.length - 1]?.trim();
      if (captured && captured.length >= 2 && captured.length <= 40) {
        // Title-case the result
        return captured
          .split(/\s+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
      }
    }
  }
  return null;
}

// ── Product type intent detection ──────────────────────────────────────────

const PRODUCT_INTENT_PATTERNS = [
  /make\s+(?:this\s+(?:a|an)\s+)?([a-z\s\-]+?)(?:\s+(?:platform|app|website|tool|product|system))?(?:\s+landing page)?$/i,
  /(?:convert|change|turn)\s+(?:this\s+)?(?:into|to)\s+(?:a\s+)?([a-z\s\-]+?)(?:\s+(?:platform|app|website|tool))?$/i,
  /this\s+is\s+(?:a\s+)?([a-z\s\-]+?)(?:\s+(?:platform|app|website|tool))?$/i,
  /build\s+(?:a\s+)?([a-z\s\-]+?)(?:\s+(?:platform|app|website|tool|landing page))?$/i,
];

function extractProductType(input: string): string | null {
  const lower = input.toLowerCase();
  // Try patterns first
  for (const pattern of PRODUCT_INTENT_PATTERNS) {
    const m = lower.match(pattern);
    if (m) {
      const phrase = m[1].trim();
      const type = resolveProductType(phrase);
      if (type) return type;
    }
  }
  // Direct phrase scan
  const direct = resolveProductType(lower);
  return direct;
}

// ── Main interpreter ───────────────────────────────────────────────────────

export function interpretSemantic(input: string): SemanticIntent {
  const raw = input.trim();
  if (!raw) return { intent: "noop", target: "", value: null, confidence: 0, raw };

  const lower = normalize(raw);

  // ── 1. Brand name rename ─────────────────────────────────────────────────
  const brandName = extractBrandName(raw);
  if (brandName) {
    return { intent: "change_name", target: "brand.name", value: brandName, confidence: 0.95, raw };
  }

  // ── 2. Explicit product type change ─────────────────────────────────────
  const productChangeSignals = [
    "make this a", "make it a", "turn this into", "convert to",
    "this is a", "change to", "switch to", "build a",
  ];
  const hasProductSignal = productChangeSignals.some(s => lower.includes(s));
  if (hasProductSignal) {
    const productType = extractProductType(raw);
    if (productType) {
      return { intent: "set_product_type", target: "product.type", value: productType, confidence: 0.88, raw };
    }
  }

  // ── 3. Explicit target + value ("change X to Y" pattern) ─────────────────
  // "change the [target] to [value]" / "set [target] to [value]"
  const changePattern = /(?:change|set|update|make)\s+(?:the\s+)?(.+?)\s+(?:to|=)\s+(.+)/i;
  const m = raw.match(changePattern);
  if (m) {
    const targetPhrase = m[1].trim();
    const valuePhrase = m[2].trim();
    const [target, tConf] = resolveTarget(targetPhrase);
    if (target && tConf >= 0.65) {
      const value = resolveValueForTarget(target, valuePhrase);
      if (value) {
        return { intent: "modify", target, value, confidence: tConf * 0.9, raw };
      }
    }
  }

  // ── 4. Style / mood setting ───────────────────────────────────────────────
  const styleSignals = ["make it", "go with", "use a", "make the design", "style"];
  const hasStyleSignal = styleSignals.some(s => lower.includes(s));
  if (hasStyleSignal || lower.match(/\b(minimal|bold|vibrant|futuristic|dark|elegant|playful|corporate|creative)\b/)) {
    const style = resolveStyleValue(raw);
    if (style) {
      return { intent: "change_style", target: "theme.style", value: style, confidence: 0.82, raw };
    }
  }

  // ── 5. Color detected without explicit "change" ───────────────────────────
  const colorHints = ["blue", "red", "green", "purple", "yellow", "orange", "pink", "teal", "cyan",
    "indigo", "violet", "emerald", "amber", "coral", "gold", "gray", "black", "white"];
  const hasColorWord = colorHints.some(c => lower.includes(c));
  if (hasColorWord) {
    const color = resolveColorValue(raw);
    if (color) {
      // Is it about the logo?
      const isLogo = lower.includes("logo") || lower.includes("brand icon");
      return {
        intent: "modify",
        target: isLogo ? "brand.logoColor" : "theme.primaryColor",
        value: color,
        confidence: 0.8,
        raw,
      };
    }
  }

  // ── 6. Target-only detection (no explicit "change") ───────────────────────
  const [target, tConf] = resolveTarget(lower);
  if (target && tConf >= 0.75) {
    const value = resolveValueForTarget(target, lower);
    if (value) {
      return { intent: "modify", target, value, confidence: tConf * 0.75, raw };
    }
  }

  return { intent: "noop", target: "", value: null, confidence: 0, raw };
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
      // Extract quoted string or just use the phrase
      return extractQuotedOrRaw(phrase);
    default:
      return null;
  }
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

function extractQuotedOrRaw(phrase: string): string | null {
  const m = phrase.match(/"([^"]+)"|'([^']+)'/);
  if (m) return m[1] || m[2];
  // Strip command verbs and return remainder
  return phrase
    .replace(/^(?:change|set|update|make|use|to|the)\s+/i, "")
    .replace(/^(?:headline|heading|title|text|subheadline|cta|button)\s+(?:to\s+)?/i, "")
    .trim() || null;
}

function titleCase(s: string): string {
  return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

// ── Bulk interpretation for project creation ───────────────────────────────

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

  // Product type
  const productType = resolveProductType(lower);
  if (productType) context.productType = productType;

  // Industry from product type
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

  // Audience
  for (const [audience, signals] of Object.entries(AUDIENCE_PATTERNS)) {
    if (signals.some(s => lower.includes(s))) {
      context.audience = audience;
      break;
    }
  }

  // Tone
  let topTone = "creative";
  let topToneScore = 0;
  for (const [tone, signals] of Object.entries(TONE_SIGNALS)) {
    const matches = signals.filter(s => lower.includes(s)).length;
    if (matches > topToneScore) { topToneScore = matches; topTone = tone; }
  }
  context.tone = topTone;

  return context;
}
