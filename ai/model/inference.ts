import { tokenize, extractQuotedValues, extractNamedValues } from "./tokenizer";
import { embedToken, meanPool, classifyIntent, getConceptScores, EMBEDDING_DIM } from "./model";
import { getOrTrainWeights } from "./training";
import type {
  StructuredIntent, IntentType, LayoutChange, StyleChange,
  ContentChange, ContextOverride, Action, Target, PageType, ModelWeights,
} from "./promptSchema";
import type { ProjectContext } from "./promptSchema";

const COLOR_MAP: Record<string, string> = {
  blue: "hsl(220, 80%, 55%)", navy: "hsl(215, 70%, 35%)",
  red: "hsl(0, 75%, 55%)", crimson: "hsl(348, 83%, 47%)",
  green: "hsl(142, 71%, 45%)", emerald: "hsl(160, 84%, 39%)",
  purple: "hsl(265, 83%, 65%)", violet: "hsl(250, 80%, 60%)",
  orange: "hsl(25, 95%, 55%)", amber: "hsl(38, 92%, 50%)",
  yellow: "hsl(48, 96%, 53%)", gold: "hsl(43, 96%, 56%)",
  pink: "hsl(340, 82%, 65%)", rose: "hsl(351, 83%, 61%)",
  teal: "hsl(174, 72%, 45%)", cyan: "hsl(188, 78%, 50%)",
  indigo: "hsl(239, 84%, 67%)", slate: "hsl(215, 25%, 55%)",
  gray: "hsl(210, 10%, 55%)", white: "hsl(0, 0%, 98%)",
  black: "hsl(0, 0%, 5%)", dark: "hsl(220, 20%, 12%)",
};

const FONT_HINTS: Record<string, string> = {
  modern: "Inter", minimal: "Inter", clean: "DM Sans", elegant: "Playfair Display",
  playful: "Nunito", bold: "Space Grotesk", technical: "JetBrains Mono",
  classic: "Merriweather", corporate: "IBM Plex Sans", geometric: "Outfit",
  humanist: "Lato", rounded: "Nunito", futuristic: "Syne",
};

const INDUSTRY_MAP: Record<string, string> = {
  saas: "saas", software: "saas", tech: "tech", ai: "ai",
  healthcare: "healthcare", health: "healthcare", medical: "healthcare",
  fintech: "fintech", finance: "fintech", banking: "fintech",
  ecommerce: "ecommerce", retail: "retail",
  restaurant: "food", food: "food", cafe: "food", dining: "food",
  education: "education", learning: "education", school: "education",
  creative: "creative", design: "creative",
  legal: "legal", law: "legal",
  fitness: "fitness", gym: "fitness",
  media: "media", news: "media",
  security: "security", cybersecurity: "security",
};

const PAGE_TYPE_MAP: Array<[string, PageType]> = [
  ["landing page", "landing_page"], ["landing", "landing_page"],
  ["marketing site", "marketing_site"], ["marketing", "marketing_site"],
  ["dashboard", "dashboard"], ["analytics dashboard", "dashboard"],
  ["portfolio", "portfolio"],
  ["ecommerce", "ecommerce"], ["online store", "ecommerce"], ["shop", "ecommerce"],
  ["blog", "blog"],
  ["saas app", "saas_app"], ["saas", "saas_app"], ["platform", "saas_app"],
];

function detectColor(tokens: string[]): string | undefined {
  for (const t of tokens) { if (COLOR_MAP[t]) return COLOR_MAP[t]; }
  return undefined;
}

function detectFont(tokens: string[]): string | undefined {
  for (const t of tokens) { if (FONT_HINTS[t]) return FONT_HINTS[t]; }
  return undefined;
}

function detectIndustry(tokens: string[]): string | undefined {
  for (const t of tokens) { if (INDUSTRY_MAP[t]) return INDUSTRY_MAP[t]; }
  return undefined;
}

function detectPageType(text: string): PageType | undefined {
  const lower = text.toLowerCase();
  for (const [key, pt] of PAGE_TYPE_MAP) {
    if (lower.includes(key)) return pt;
  }
  return undefined;
}

function extractStyleChanges(tokens: string[], conceptScores: Record<string, number>): StyleChange[] {
  const changes: StyleChange[] = [];
  const color = detectColor(tokens);
  if (color) changes.push({ dimension: "color", property: "primary", value: color, direction: "set" });

  const font = detectFont(tokens);
  if (font) changes.push({ dimension: "typography", property: "heading", value: font, direction: "set" });

  const SIGNALS: Array<{ kw: string[]; val: string; dim: StyleChange["dimension"] }> = [
    { kw: ["minimal", "minimalist", "clean", "simple"], val: "minimal", dim: "density" },
    { kw: ["compact", "dense", "tight"], val: "compact", dim: "density" },
    { kw: ["airy", "spacious", "breathing", "whitespace"], val: "spacious", dim: "spacing" },
    { kw: ["rounded", "pill", "soft", "bubbly"], val: "rounded", dim: "radius" },
    { kw: ["sharp", "flat", "square", "geometric"], val: "sharp", dim: "radius" },
    { kw: ["bold", "strong", "heavy", "impactful"], val: "bold", dim: "typography" },
    { kw: ["light", "thin", "delicate", "fine"], val: "light", dim: "typography" },
    { kw: ["dark", "night", "midnight"], val: "dark", dim: "color" },
    { kw: ["vibrant", "colorful", "bright", "vivid"], val: "vibrant", dim: "color" },
    { kw: ["muted", "subtle", "pastel", "soft"], val: "muted", dim: "color" },
    { kw: ["animated", "motion", "transitions"], val: "animated", dim: "animation" },
    { kw: ["elegant", "luxury", "luxurious", "premium"], val: "elegant", dim: "spacing" },
    { kw: ["modern", "contemporary", "sleek"], val: "modern", dim: "color" },
    { kw: ["playful", "fun", "friendly"], val: "playful", dim: "radius" },
    { kw: ["professional", "corporate", "enterprise"], val: "professional", dim: "density" },
  ];

  for (const s of SIGNALS) {
    if (s.kw.some(k => tokens.includes(k))) {
      if (!changes.find(c => c.dimension === s.dim && c.value === s.val)) {
        changes.push({ dimension: s.dim, value: s.val });
      }
    }
  }

  if (Math.abs(conceptScores["size"] ?? 0) > 0.25) {
    const dir = (conceptScores["size"] ?? 0) > 0 ? "increase" : "decrease";
    const val = dir === "increase" ? "larger" : "smaller";
    if (!changes.find(c => c.dimension === "typography" && c.value === val)) {
      changes.push({ dimension: "typography", value: val, direction: dir });
    }
  }

  return changes;
}

function extractLayoutChanges(tokens: string[], text: string): LayoutChange[] {
  const changes: LayoutChange[] = [];
  const lower = text.toLowerCase();

  const SECTION_SIGNALS: Array<{ kw: string[]; type: string }> = [
    { kw: ["testimonial", "testimonials", "review", "reviews"], type: "testimonial" },
    { kw: ["pricing", "price", "plans", "tiers"], type: "pricing" },
    { kw: ["feature", "features", "feature grid"], type: "featureGrid" },
    { kw: ["faq", "frequently asked"], type: "faq" },
    { kw: ["contact", "contact form", "get in touch"], type: "contact" },
    { kw: ["stats", "statistics", "metrics", "numbers"], type: "stats" },
    { kw: ["team", "about us", "our team"], type: "team" },
    { kw: ["call to action", "cta"], type: "cta" },
  ];

  const isAdd = /\b(add|include|insert|put|show|append)\b/.test(lower);
  const isRemove = /\b(remove|delete|hide|take out|get rid)\b/.test(lower);
  const isMove = /\b(move|shift|reorder)\b/.test(lower);

  for (const { kw, type } of SECTION_SIGNALS) {
    if (kw.some(k => lower.includes(k))) {
      const op = isRemove ? "remove" : isMove ? "reorder" : isAdd ? "add" : "modify";
      changes.push({ operation: op, sectionType: type });
    }
  }

  const colMatch = lower.match(/(\d)\s*column/);
  if (colMatch) changes.push({ operation: "modify", property: "columns", value: parseInt(colMatch[1]) });

  const alignMatch = lower.match(/(?:hero|section)\s+(?:is\s+)?(?:aligned\s+)?(left|center|right)/);
  if (alignMatch) changes.push({ operation: "modify", property: "alignment", value: alignMatch[1] });

  return changes;
}

function extractContentChanges(text: string): ContentChange[] {
  const changes: ContentChange[] = [];
  const quoted = extractQuotedValues(text);
  const lower = text.toLowerCase();
  const SIGNALS: Array<{ pattern: RegExp; field: ContentChange["field"] }> = [
    { pattern: /\b(headline|title|heading)\b/, field: "headline" },
    { pattern: /\b(tagline|subheadline|subtitle)\b/, field: "subheadline" },
    { pattern: /\bcta\b|\bcall.to.action\b|\bbutton\b/, field: "ctaLabel" },
    { pattern: /\bdescription\b/, field: "description" },
  ];
  for (const { pattern, field } of SIGNALS) {
    if (pattern.test(lower) && quoted.length > 0) {
      changes.push({ field, value: quoted[0] });
    }
  }
  return changes;
}

function extractContextOverrides(tokens: string[], text: string): ContextOverride[] {
  const overrides: ContextOverride[] = [];
  const lower = text.toLowerCase();
  const isCorrection = ["actually", "this is", "it's a", "it is a", "not a", "wrong", "correction"].some(s => lower.includes(s));
  if (isCorrection) {
    const industry = detectIndustry(tokens);
    if (industry) overrides.push({ key: "industry", value: industry });
    const pt = detectPageType(text);
    if (pt) overrides.push({ key: "pageType", value: pt });
  }
  return overrides;
}

function extractBrandName(text: string): string | undefined {
  const named = extractNamedValues(text);
  if (named.brandName) return named.brandName;
  const callMatch = text.match(/(?:call|name)\s+it\s+([A-Z][a-zA-Z0-9]+)/);
  if (callMatch) return callMatch[1];
  const shouldBe = text.match(/(?:name|product)\s+(?:should\s+be\s+|is\s+)["']?([A-Z][a-zA-Z0-9\s]+?)["']?(?:\s|$)/);
  if (shouldBe) return shouldBe[1].trim();
  const renamedTo = text.match(/rename(?:\s+to)?\s+["']?([A-Z][a-zA-Z0-9\s]+?)["']?(?:\s|$)/i);
  if (renamedTo) return renamedTo[1].trim();
  return undefined;
}

function resolveIntent(
  topIntents: Array<{ intentType: IntentType; score: number }>,
  style: StyleChange[], layout: LayoutChange[], content: ContentChange[],
  ctx: ContextOverride[], brand: string | undefined,
): IntentType {
  const cats = new Set<IntentType>();
  if (style.length > 0) cats.add("style_change");
  if (layout.length > 0) cats.add("layout_modification");
  const nonBrandContent = content.filter(c => c.field !== "brandName");
  if (nonBrandContent.length > 0) cats.add("content_update");
  if (ctx.length > 0) cats.add("context_correction");
  if (brand) cats.add("brand_rename");
  if (cats.size >= 2) return "compound";
  if (cats.size === 1) return [...cats][0];
  return topIntents[0]?.intentType ?? "style_change";
}

export function infer(prompt: string, context?: ProjectContext): StructuredIntent {
  const weights = getOrTrainWeights();
  const { meaningful } = tokenize(prompt);
  const allTokens = [...new Set([
    ...meaningful.map(t => t.stem),
    ...meaningful.map(t => t.normalized),
  ])];

  const tokenEmbeds = meaningful.map(t => {
    const e1 = embedToken(t.stem);
    const e2 = embedToken(t.normalized);
    return e1.map((v, i) => (v + e2[i]) / 2);
  });

  const representationVec = meanPool(
    tokenEmbeds.length > 0 ? tokenEmbeds : [new Array(EMBEDDING_DIM).fill(0)],
  );
  const conceptScores = getConceptScores(representationVec);

  let intentRankings = classifyIntent(representationVec, weights.intentPrototypes);
  if (context) {
    intentRankings = intentRankings.map(r => ({
      ...r,
      score: r.score +
        (r.intentType === "context_correction" && (conceptScores["context"] ?? 0) > 0.1 ? 0.1 : 0) +
        (r.intentType === "brand_rename" && (conceptScores["brand"] ?? 0) > 0.3 ? 0.15 : 0),
    })).sort((a, b) => b.score - a.score);
  }

  const namedValues = extractNamedValues(prompt);
  const styleChanges = extractStyleChanges(allTokens, conceptScores);
  const layoutChanges = extractLayoutChanges(allTokens, prompt);
  const contentChanges = extractContentChanges(prompt);
  const contextOverrides = extractContextOverrides(allTokens, prompt);
  const brandName = extractBrandName(prompt);
  const industry = detectIndustry(allTokens) ?? namedValues.industry;
  const pageType = detectPageType(prompt);

  if (brandName) contentChanges.push({ field: "brandName", value: brandName });

  const intentType = resolveIntent(
    intentRankings, styleChanges, layoutChanges,
    contentChanges, contextOverrides, brandName,
  );

  const actions: Action[] = [];
  const targets: Target[] = [];

  if (styleChanges.length > 0) {
    actions.push({ verb: "modify", target: "style", value: styleChanges.map(s => s.value).join(", ") });
    targets.push({ path: "genome.colors", domain: "style" });
  }
  if (layoutChanges.length > 0) {
    actions.push({ verb: "modify", target: "layout" });
    targets.push({ path: "layout.sections", domain: "layout" });
  }
  if (contentChanges.length > 0) {
    actions.push({ verb: "update", target: "content" });
    targets.push({ path: "settings.content", domain: "content" });
  }
  if (brandName) {
    actions.push({ verb: "rename", target: "brand", value: brandName });
    targets.push({ path: "settings.brandName", domain: "brand" });
  }
  if (contextOverrides.length > 0) {
    actions.push({ verb: "correct", target: "context" });
    targets.push({ path: "settings.industry", domain: "context" });
  }

  return {
    intentType,
    confidence: intentRankings[0]?.score ?? 0,
    pageType: pageType ?? (context?.pageType as PageType | undefined),
    industry: industry ?? context?.industry,
    productType: context?.productType,
    actions,
    targets,
    layoutChanges,
    styleChanges,
    contentChanges,
    contextOverrides,
    rawTokens: allTokens,
    embeddings: representationVec,
  };
}

export function inferBatch(prompts: string[], context?: ProjectContext): StructuredIntent[] {
  return prompts.map(p => infer(p, context));
}
