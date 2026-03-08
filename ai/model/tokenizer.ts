const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought",
  "to", "of", "in", "for", "on", "with", "at", "by", "from", "up",
  "about", "into", "through", "during", "including", "until", "against",
  "among", "throughout", "despite", "towards", "upon", "concerning",
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "they",
  "it", "its", "this", "that", "these", "those", "am", "if", "then",
]);

const DESIGN_CONTRACTIONS: Record<string, string[]> = {
  "don't": ["do", "not"],
  "doesn't": ["does", "not"],
  "isn't": ["is", "not"],
  "aren't": ["are", "not"],
  "can't": ["can", "not"],
  "won't": ["will", "not"],
  "it's": ["it", "is"],
  "i'm": ["i", "am"],
  "i'd": ["i", "would"],
  "let's": ["let", "us"],
};

const STEM_RULES: Array<[RegExp, string]> = [
  [/ations?$/, "ate"],
  [/ings?$/, ""],
  [/ness$/, ""],
  [/ful$/, ""],
  [/less$/, ""],
  [/ment$/, ""],
  [/ive$/, ""],
  [/ous$/, ""],
  [/ical?$/, "ic"],
  [/ies$/, "y"],
  [/ers?$/, ""],
  [/est$/, ""],
  [/ed$/, ""],
  [/ly$/, ""],
  [/s$/, ""],
];

export interface Token {
  raw: string;
  normalized: string;
  stem: string;
  position: number;
  isStopword: boolean;
  isDesignTerm: boolean;
}

export interface TokenizerResult {
  tokens: Token[];
  meaningful: Token[];
  text: string;
}

const DESIGN_TERMS = new Set([
  "color", "colours", "palette", "hue", "shade", "tint", "tone", "gradient",
  "font", "typeface", "typography", "heading", "body", "weight", "size",
  "layout", "grid", "column", "row", "section", "hero", "footer", "navbar",
  "spacing", "padding", "margin", "gap", "dense", "compact", "airy", "spacious",
  "radius", "rounded", "sharp", "corner", "border",
  "minimal", "minimalist", "clean", "simple", "flat", "bold", "vibrant",
  "dark", "light", "bright", "muted", "contrast", "subtle",
  "modern", "classic", "elegant", "playful", "professional", "corporate",
  "style", "theme", "design", "look", "feel", "aesthetic",
  "brand", "logo", "name", "title", "headline", "tagline", "cta", "button",
  "feature", "product", "service", "company", "business", "startup",
  "saas", "app", "platform", "tool", "software", "dashboard",
  "landing", "page", "website", "site", "portfolio", "blog", "shop", "store",
  "image", "photo", "illustration", "icon", "visual", "media",
  "animation", "transition", "hover", "interactive",
  "add", "remove", "change", "update", "make", "set", "switch", "turn",
  "increase", "decrease", "bigger", "smaller", "more", "less",
  "primary", "secondary", "accent", "background", "foreground", "surface",
  "industry", "niche", "sector", "market", "audience", "user",
]);

export function tokenize(text: string): TokenizerResult {
  let normalized = text.toLowerCase().trim();

  for (const [contraction, expansion] of Object.entries(DESIGN_CONTRACTIONS)) {
    normalized = normalized.replace(new RegExp(contraction, "g"), expansion.join(" "));
  }

  normalized = normalized.replace(/[^a-z0-9\s\-]/g, " ");
  normalized = normalized.replace(/\s+/g, " ").trim();

  const rawParts = normalized.split(/\s+/);
  const tokens: Token[] = rawParts
    .filter(p => p.length > 1)
    .map((raw, position) => {
      const norm = raw.replace(/-/g, "");
      const stem = stemToken(norm);
      const isStop = STOPWORDS.has(norm) && !DESIGN_TERMS.has(norm);
      const isDesign = DESIGN_TERMS.has(norm) || DESIGN_TERMS.has(stem);
      return { raw, normalized: norm, stem, position, isStopword: isStop, isDesignTerm: isDesign };
    });

  const meaningful = tokens.filter(t => !t.isStopword || t.isDesignTerm);

  return { tokens, meaningful, text };
}

function stemToken(word: string): string {
  if (word.length <= 4) return word;
  for (const [pattern, replacement] of STEM_RULES) {
    if (pattern.test(word)) {
      const stemmed = word.replace(pattern, replacement);
      if (stemmed.length >= 3) return stemmed;
    }
  }
  return word;
}

export function extractQuotedValues(text: string): string[] {
  const matches = text.match(/["']([^"']+)["']/g) || [];
  return matches.map(m => m.replace(/["']/g, "").trim());
}

export function extractNamedValues(text: string): Record<string, string> {
  const result: Record<string, string> = {};

  const colorMatch = text.match(/(?:color|colour)\s+(?:is|to|:)?\s*([a-z#][a-z0-9#-]*)/i);
  if (colorMatch) result.color = colorMatch[1].toLowerCase();

  const nameMatch = text.match(/(?:name|call|rename|brand)\s+(?:it\s+)?(?:to\s+)?["']?([A-Z][a-zA-Z0-9\s]+)["']?/);
  if (nameMatch) result.brandName = nameMatch[1].trim();

  const fontMatch = text.match(/(?:font|typeface|use)\s+(?:is\s+)?["']?([A-Z][a-zA-Z\s]+)["']?\s*(?:font)?/i);
  if (fontMatch) result.font = fontMatch[1].trim();

  const industryMatch = text.match(/(?:this\s+is\s+(?:a|an)\s+|for\s+(?:a|an)\s+|it[''']?s\s+(?:a|an)\s+)([a-z][a-z\s]+?)(?:\s+(?:company|business|platform|startup|site|app|product|industry|sector))/i);
  if (industryMatch) result.industry = industryMatch[1].trim();

  return result;
}
