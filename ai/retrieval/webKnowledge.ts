export interface DomainKnowledge {
  domain: string;
  concepts: string[];
  commonActions: string[];
  typicalEntities: string[];
  interfacePatterns: string[];
  source: "web" | "cache" | "fallback";
  confidence: number;
}

const _knowledgeCache: Map<string, { knowledge: DomainKnowledge; timestamp: number }> = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_SIZE = 200;

const BUILT_IN_KNOWLEDGE: Record<string, Omit<DomainKnowledge, "source" | "confidence">> = {
  healthcare: {
    domain: "healthcare",
    concepts: ["patient care", "medical records", "appointment scheduling", "prescriptions", "diagnostics", "telemedicine"],
    commonActions: ["schedule", "diagnose", "prescribe", "admit", "discharge", "refer", "monitor"],
    typicalEntities: ["patient", "doctor", "nurse", "appointment", "prescription", "medical record", "department"],
    interfacePatterns: ["patient portal", "appointment calendar", "medical dashboard", "prescription tracker"],
  },
  finance: {
    domain: "finance",
    concepts: ["transactions", "portfolio management", "risk assessment", "compliance", "trading", "accounting"],
    commonActions: ["transfer", "invest", "withdraw", "deposit", "analyze", "trade", "audit"],
    typicalEntities: ["account", "transaction", "portfolio", "asset", "balance", "statement", "report"],
    interfacePatterns: ["financial dashboard", "transaction history", "portfolio overview", "risk matrix"],
  },
  education: {
    domain: "education",
    concepts: ["course management", "student enrollment", "grading", "curriculum", "assessments", "e-learning"],
    commonActions: ["enroll", "teach", "grade", "assess", "submit", "review", "attend"],
    typicalEntities: ["student", "teacher", "course", "assignment", "grade", "class", "curriculum"],
    interfacePatterns: ["course catalog", "grade book", "student dashboard", "assignment tracker"],
  },
  logistics: {
    domain: "logistics",
    concepts: ["supply chain", "inventory management", "route optimization", "warehouse operations", "fleet tracking"],
    commonActions: ["ship", "track", "deliver", "store", "dispatch", "route", "inventory"],
    typicalEntities: ["shipment", "warehouse", "vehicle", "route", "inventory", "package", "driver"],
    interfacePatterns: ["tracking map", "inventory grid", "route planner", "warehouse dashboard"],
  },
  real_estate: {
    domain: "real_estate",
    concepts: ["property listing", "tenant management", "lease agreements", "property valuation", "virtual tours"],
    commonActions: ["list", "search", "lease", "buy", "sell", "appraise", "inspect"],
    typicalEntities: ["property", "listing", "tenant", "landlord", "lease", "agent", "appraisal"],
    interfacePatterns: ["property search", "listing grid", "property detail", "agent dashboard"],
  },
  food_service: {
    domain: "food_service",
    concepts: ["menu management", "order processing", "table reservation", "kitchen operations", "delivery coordination"],
    commonActions: ["order", "reserve", "cook", "deliver", "serve", "customize", "rate"],
    typicalEntities: ["menu", "order", "table", "reservation", "dish", "customer", "delivery"],
    interfacePatterns: ["digital menu", "order tracker", "reservation calendar", "kitchen display"],
  },
};

function getCacheKey(domain: string): string {
  return domain.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

export function getBuiltInKnowledge(domain: string): DomainKnowledge | undefined {
  const key = getCacheKey(domain);
  const builtin = BUILT_IN_KNOWLEDGE[key];
  if (builtin) {
    return { ...builtin, source: "fallback", confidence: 0.7 };
  }
  return undefined;
}

export function getCachedKnowledge(domain: string): DomainKnowledge | undefined {
  const key = getCacheKey(domain);
  const cached = _knowledgeCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.knowledge, source: "cache" };
  }
  return undefined;
}

export function cacheKnowledge(knowledge: DomainKnowledge): void {
  const key = getCacheKey(knowledge.domain);
  if (_knowledgeCache.size >= MAX_CACHE_SIZE) {
    const oldest = [..._knowledgeCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) _knowledgeCache.delete(oldest[0]);
  }
  _knowledgeCache.set(key, { knowledge, timestamp: Date.now() });
}

export async function retrieveDomainKnowledge(domain: string, promptHints: string[] = []): Promise<DomainKnowledge> {
  const cached = getCachedKnowledge(domain);
  if (cached) return cached;

  const builtin = getBuiltInKnowledge(domain);
  if (builtin) {
    cacheKnowledge(builtin);
    return builtin;
  }

  try {
    const knowledge = await fetchWebKnowledge(domain, promptHints);
    if (knowledge) {
      cacheKnowledge(knowledge);
      return knowledge;
    }
  } catch {
  }

  const fallback: DomainKnowledge = {
    domain,
    concepts: promptHints.slice(0, 6),
    commonActions: ["manage", "view", "create", "update", "search"],
    typicalEntities: promptHints.filter(h => h.length > 3).slice(0, 5),
    interfacePatterns: ["dashboard", "list view", "detail page", "form"],
    source: "fallback",
    confidence: 0.3,
  };
  cacheKnowledge(fallback);
  return fallback;
}

async function fetchWebKnowledge(domain: string, hints: string[]): Promise<DomainKnowledge | null> {
  try {
    const { webSearch } = await import("../../.local/skills/web-search/SKILL.md" as any).catch(() => ({ webSearch: null }));
    if (!webSearch) return null;

    const query = `${domain} software system typical features components UI patterns`;
    const results = await webSearch({ query });

    if (!results?.searchAnswer) return null;

    const answer = results.searchAnswer;
    const concepts = extractTermsFromText(answer, ["feature", "capability", "function", "module"]);
    const actions = extractTermsFromText(answer, ["manage", "track", "create", "monitor", "analyze"]);
    const entities = extractTermsFromText(answer, ["user", "data", "record", "item", "object"]);

    return {
      domain,
      concepts: concepts.length > 0 ? concepts : hints,
      commonActions: actions.length > 0 ? actions : ["manage", "view", "create"],
      typicalEntities: entities.length > 0 ? entities : hints,
      interfacePatterns: ["dashboard", "list view", "detail page"],
      source: "web",
      confidence: 0.6,
    };
  } catch {
    return null;
  }
}

function extractTermsFromText(text: string, seedTerms: string[]): string[] {
  const words = text.toLowerCase().split(/[\s,;.!?()]+/).filter(w => w.length > 3);
  const unique = [...new Set(words)];
  const relevant = unique.filter(w =>
    seedTerms.some(s => w.includes(s) || s.includes(w)) ||
    w.length > 5
  );
  return relevant.slice(0, 10);
}

export function mergeKnowledge(primary: DomainKnowledge, secondary: DomainKnowledge): DomainKnowledge {
  return {
    domain: primary.domain,
    concepts: [...new Set([...primary.concepts, ...secondary.concepts])].slice(0, 12),
    commonActions: [...new Set([...primary.commonActions, ...secondary.commonActions])].slice(0, 10),
    typicalEntities: [...new Set([...primary.typicalEntities, ...secondary.typicalEntities])].slice(0, 10),
    interfacePatterns: [...new Set([...primary.interfacePatterns, ...secondary.interfacePatterns])].slice(0, 8),
    source: primary.source,
    confidence: Math.max(primary.confidence, secondary.confidence),
  };
}
