import type { PageType } from "./intentInterpreter";
import type { DomainCluster } from "./domainVocabulary";
import { DOMAIN_VOCABULARY, getDomainVocabulary } from "./domainVocabulary";

export interface UniversalContext {
  industry: string;
  industryConfidence: number;
  productType: string | null;
  companyType: string | null;
  coreActivities: string[];
  targetAudience: string[];
  domainVocabulary: DomainCluster;
  pageType: PageType | null;
}

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "can", "could", "must", "need",
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "it",
  "they", "them", "their", "its", "this", "that", "these", "those",
  "of", "in", "to", "for", "with", "on", "at", "by", "from", "as",
  "into", "through", "during", "before", "after", "above", "below",
  "between", "under", "over", "about", "up", "down", "out", "off",
  "and", "but", "or", "nor", "not", "no", "so", "if", "than", "too",
  "very", "just", "also", "only", "then", "now", "here", "there",
  "when", "where", "how", "what", "which", "who", "whom", "why",
  "all", "each", "every", "both", "few", "more", "most", "other",
  "some", "such", "any", "many", "much", "own", "am",
  "create", "build", "make", "design", "generate", "please",
  "want", "like", "website", "site", "page", "web", "app",
]);

const VERB_SUFFIXES = ["ing", "tion", "sion", "ment", "ance", "ence", "ize", "ise", "ate", "ify"];
const NOUN_SUFFIXES = ["ness", "ity", "ism", "ist", "ery", "ory", "ary", "ure", "age", "dom", "ship", "hood", "ling", "let"];
const ADJ_SUFFIXES = ["ous", "ive", "ful", "less", "able", "ible", "ical", "ial", "ent", "ant"];

function classifyWord(word: string): "noun" | "verb" | "adjective" | "unknown" {
  const lower = word.toLowerCase();
  for (const s of VERB_SUFFIXES) {
    if (lower.endsWith(s) && lower.length > s.length + 2) return "verb";
  }
  for (const s of ADJ_SUFFIXES) {
    if (lower.endsWith(s) && lower.length > s.length + 2) return "adjective";
  }
  for (const s of NOUN_SUFFIXES) {
    if (lower.endsWith(s) && lower.length > s.length + 2) return "noun";
  }
  if (lower.endsWith("s") && !lower.endsWith("ss") && lower.length > 3) return "noun";
  if (lower.endsWith("er") && lower.length > 3) return "noun";
  return "unknown";
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(t => t.length > 0);
}

function extractMeaningfulTokens(text: string): string[] {
  return tokenize(text).filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

function extractNGrams(tokens: string[], n: number): string[] {
  const result: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    const gram = tokens.slice(i, i + n).join(" ");
    result.push(gram);
  }
  return result;
}

function extractNouns(tokens: string[]): string[] {
  return tokens.filter(t => {
    const cls = classifyWord(t);
    return cls === "noun" || cls === "unknown";
  });
}

function extractVerbs(tokens: string[]): string[] {
  return tokens.filter(t => classifyWord(t) === "verb");
}

function extractAdjectives(tokens: string[]): string[] {
  return tokens.filter(t => classifyWord(t) === "adjective");
}

const INDUSTRY_SIGNALS: [string, string[], number][] = [
  ["energy",          ["energy", "power", "electricity", "grid", "renewable", "solar", "wind", "nuclear", "oil", "gas", "petroleum", "utility", "utilities", "fuel", "hydro", "geothermal", "clean energy"], 0],
  ["healthcare",      ["health", "healthcare", "medical", "hospital", "clinic", "patient", "doctor", "physician", "pharma", "pharmaceutical", "biotech", "therapy", "treatment", "clinical", "wellness", "telehealth", "radiology", "diagnostics"], 0],
  ["finance",         ["finance", "financial", "bank", "banking", "investment", "fintech", "payment", "payments", "lending", "credit", "insurance", "wealth", "trading", "capital", "mortgage", "fund", "portfolio", "treasury", "accounting", "audit", "tax"], 0],
  ["education",       ["education", "school", "university", "college", "learning", "e-learning", "course", "curriculum", "student", "teacher", "classroom", "tutoring", "edtech", "academy", "training", "certification"], 0],
  ["logistics",       ["logistics", "supply chain", "shipping", "freight", "delivery", "transport", "transportation", "warehouse", "fleet", "cargo", "distribution", "fulfillment", "tracking", "courier", "procurement"], 0],
  ["retail",          ["retail", "store", "shop", "merchandise", "brand", "consumer goods", "fashion", "apparel", "grocery", "supermarket", "outlet", "franchise", "inventory", "checkout"], 0],
  ["real_estate",     ["real estate", "property", "realty", "housing", "apartment", "commercial property", "mortgage", "lease", "landlord", "tenant", "broker", "listing", "construction", "development"], 0],
  ["legal",           ["legal", "law", "lawyer", "attorney", "firm", "contract", "compliance", "regulation", "litigation", "intellectual property", "court", "arbitration"], 0],
  ["hospitality",     ["hotel", "hospitality", "restaurant", "food", "catering", "travel", "tourism", "booking", "reservation", "accommodation", "event", "venue", "bar", "cafe", "resort", "spa"], 0],
  ["construction",    ["construction", "engineering", "infrastructure", "civil", "architecture", "contractor", "builder", "renovation", "project management", "structural", "mechanical", "hvac"], 0],
  ["manufacturing",   ["manufacturing", "factory", "production", "assembly", "industrial", "plant", "machinery", "automation", "robotics", "quality control", "lean", "six sigma", "fabrication"], 0],
  ["media",           ["media", "publishing", "journalism", "broadcast", "streaming", "podcast", "studio", "creative", "advertising", "marketing agency", "design agency", "film", "animation", "photography"], 0],
  ["agriculture",     ["agriculture", "farming", "crop", "livestock", "agritech", "soil", "harvest", "irrigation", "precision farming", "greenhouse", "organic", "food production"], 0],
  ["government",      ["government", "public sector", "municipal", "civic", "federal", "department", "agency", "regulatory", "nonprofit", "ngo", "charity", "foundation", "public services"], 0],
  ["consulting",      ["consulting", "advisory", "strategy", "management consulting", "professional services", "staffing", "recruitment", "outsourcing", "business intelligence", "transformation"], 0],
  ["telecom",         ["telecom", "telecommunications", "network", "connectivity", "broadband", "5g", "wireless", "carrier", "isp", "internet provider", "fiber", "cellular"], 0],
  ["automotive",      ["automotive", "vehicle", "car", "truck", "fleet", "dealership", "auto", "mobility", "ev", "electric vehicle", "autonomous", "telematics"], 0],
  ["fitness",         ["fitness", "gym", "workout", "exercise", "health club", "personal training", "yoga", "pilates", "crossfit", "bodybuilding", "wellness center", "wellness retreat", "retreat center", "meditation", "mindfulness", "yoga studio"], 0],
  ["beauty",          ["beauty", "cosmetics", "skincare", "makeup", "hair salon", "nail salon", "nails", "aesthetics", "barber", "beauty salon"], 0],
  ["pets",            ["pet", "pets", "veterinary", "vet", "animal", "dog", "cat", "pet grooming", "pet care", "animal hospital", "kennel", "pet store", "pet food", "grooming salon"], 0],
  ["environmental",   ["environmental", "ecology", "conservation", "sustainability", "climate", "recycling", "waste management", "pollution", "biodiversity", "ecosystem"], 0],
  ["science",         ["science", "research", "laboratory", "scientific", "experiment", "biology", "chemistry", "physics", "geology", "archaeology", "anthropology", "astronomy", "marine", "oceanography"], 0],
  ["nonprofit",       ["nonprofit", "non-profit", "charity", "foundation", "donation", "volunteer", "philanthropy", "social impact", "community service", "humanitarian"], 0],
  ["entertainment",   ["entertainment", "gaming", "music", "concert", "theater", "cinema", "amusement", "recreation", "sports", "esports", "live events"], 0],
  ["insurance",       ["insurance", "policy", "underwriting", "claims", "actuary", "premium", "coverage", "deductible", "risk management", "reinsurance"], 0],
  ["food_beverage",   ["food", "beverage", "restaurant", "catering", "bakery", "brewery", "winery", "coffee", "meal", "recipe", "cuisine", "chef", "kitchen", "dining"], 0],
];

const GENERIC_CONTEXT_WORDS: Record<string, RegExp[]> = {
  construction: [
    /\bbuild\s+(?:me|a|an|the|my|your|our)\b/i,
    /\bbuilding\s+(?:a|an|the|my)\s+(?:website|app|platform|tool|page|site|landing)/i,
    /\b(?:cloud|data|network|software|it|tech|digital|ml|ai)\s+infrastructure\b/i,
    /\binfrastructure\s+(?:for|as|management)\b/i,
  ],
  education: [/\bmachine\s+learning\b/i, /\bdeep\s+learning\b/i, /\breinforcement\s+learning\b/i, /\blearning\s+rate\b/i],
};

function matchesSignal(text: string, signal: string): boolean {
  if (signal.includes(" ")) return text.includes(signal);
  const regex = new RegExp(`\\b${signal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  return regex.test(text);
}

function detectIndustryWithScoring(text: string): { industry: string; confidence: number } {
  const lower = text.toLowerCase();
  const scores: { industry: string; score: number }[] = [];

  for (const [industry, signals] of INDUSTRY_SIGNALS) {
    const falsePositivePatterns = GENERIC_CONTEXT_WORDS[industry];
    let matchCount = 0;
    let totalWeight = 0;

    for (const signal of signals) {
      if (matchesSignal(lower, signal)) {
        if (falsePositivePatterns) {
          const isFalsePositive = falsePositivePatterns.some(p => p.test(text));
          if (isFalsePositive) continue;
        }
        matchCount++;
        totalWeight += signal.includes(" ") ? 2 : 1;
      }
    }

    if (matchCount > 0) {
      scores.push({ industry, score: totalWeight + matchCount * 0.5 });
    }
  }

  scores.sort((a, b) => b.score - a.score);

  if (scores.length > 0) {
    return { industry: scores[0].industry, confidence: Math.max(0.5, Math.min(1, scores[0].score / 5)) };
  }

  return { industry: inferIndustryFromSemantics(text), confidence: 0.2 };
}

function inferIndustryFromSemantics(text: string): string {
  const tokens = extractMeaningfulTokens(text);
  const nouns = extractNouns(tokens);
  const bigrams = extractNGrams(tokens, 2);
  const trigrams = extractNGrams(tokens, 3);
  const allPhrases = [...nouns, ...bigrams, ...trigrams];

  const industryAffinities: Record<string, number> = {};

  for (const [industry] of Object.entries(DOMAIN_VOCABULARY)) {
    const vocab = getDomainVocabulary(industry);
    let affinity = 0;
    const allTerms = [...vocab.core, ...vocab.actions, ...vocab.objects, ...vocab.qualities, ...vocab.roles];
    for (const term of allTerms) {
      const termLower = term.toLowerCase();
      for (const phrase of allPhrases) {
        if (phrase === termLower || termLower.includes(phrase) || phrase.includes(termLower)) {
          affinity += termLower === phrase ? 3 : 1;
        }
      }
    }
    if (affinity > 0) {
      industryAffinities[industry] = affinity;
    }
  }

  const sorted = Object.entries(industryAffinities).sort(([, a], [, b]) => b - a);
  if (sorted.length > 0 && sorted[0][1] >= 2) {
    return sorted[0][0];
  }

  return "technology";
}

const COMPANY_TYPE_PATTERNS = [
  /\b(company|firm|agency|organization|organisation|corporation|institute|group|startup|studio|lab|laboratory|practice|clinic|shop|store|salon|boutique|collective|cooperative|consortium|association|bureau|center|centre)\b/i,
];

function extractCompanyType(text: string): string | null {
  const lower = text.toLowerCase();
  for (const pattern of COMPANY_TYPE_PATTERNS) {
    const match = lower.match(pattern);
    if (match) return match[1];
  }
  return null;
}

const ACTIVITY_PATTERNS = [
  /(?:that|which)\s+(?:helps?|enables?|allows?|provides?|offers?|delivers?|facilitates?)\s+([\w\s]+?)(?:\s+for\b|\s+to\b|\.|\,|$)/i,
  /(?:specializ(?:ing|es?)|focused?\s+(?:on|in)|dedicated\s+to)\s+([\w\s]+?)(?:\.|,|$)/i,
  /(?:platform|tool|service|software|app|system|solution)\s+(?:for|to)\s+([\w\s]+?)(?:\.|,|$)/i,
  /(?:manage|manages|managing|monitor|monitoring|track|tracking)\s+([\w\s]+?)(?:\s+for\b|\.|,|$)/i,
  /(?:automate|automating|automation\s+of)\s+([\w\s]+?)(?:\.|,|$)/i,
  /(?:we|they|it)\s+(?:do|provide|offer|deliver|handle|perform)\s+([\w\s]+?)(?:\.|,|$)/i,
  /(?:connects?|connecting)\s+([\w\s]+?)\s+(?:with|to|and)\s+([\w\s]+?)(?:\.|,|$)/i,
];

const PAGE_TYPE_WORDS = new Set([
  "landing", "homepage", "website", "page", "site", "platform", "portal",
  "dashboard", "app", "application", "web", "online", "digital",
]);

function extractCoreActivities(text: string, tokens: string[]): string[] {
  const activities: string[] = [];
  const lower = text.toLowerCase();

  for (const pattern of ACTIVITY_PATTERNS) {
    const match = lower.match(pattern);
    if (match) {
      for (let i = 1; i < match.length; i++) {
        if (match[i] && match[i].length > 3 && match[i].length < 60) {
          const trimmed = match[i].trim()
            .replace(/^(?:a|an|the|our|their|your)\s+/i, "")
            .trim();
          if (trimmed.length > 3 && !PAGE_TYPE_WORDS.has(trimmed.toLowerCase())) {
            activities.push(trimmed);
          }
        }
      }
    }
  }

  const nouns = extractNouns(tokens);
  const bigrams = extractNGrams(tokens, 2);
  const meaningfulBigrams = bigrams.filter(bg => {
    const parts = bg.split(" ");
    return parts.every(p => !STOP_WORDS.has(p) && p.length > 2 && !PAGE_TYPE_WORDS.has(p));
  });

  for (const noun of nouns) {
    if (!STOP_WORDS.has(noun) && !PAGE_TYPE_WORDS.has(noun) && noun.length > 3 && !activities.some(a => a.includes(noun))) {
      activities.push(noun);
    }
  }
  for (const bg of meaningfulBigrams) {
    if (!activities.some(a => a.includes(bg))) {
      activities.push(bg);
    }
  }

  return Array.from(new Set(activities)).slice(0, 10);
}

const AUDIENCE_PATTERNS = [
  /\bfor\s+([\w\s]+?)(?:\s+(?:who|that|which|and|to|in)\b|\.|\,|$)/i,
  /\b(?:targeting|aimed\s+at|designed\s+for|built\s+for|serving|helping)\s+([\w\s]+?)(?:\s+(?:who|that|which)\b|\.|\,|$)/i,
  /\b([\w\s]+?)\s+(?:can|will|could)\s+(?:use|benefit|access|leverage)/i,
];

const AUDIENCE_KEYWORDS: [string, string[]][] = [
  ["enterprise clients",   ["enterprise", "large enterprise", "fortune 500", "corporate", "large company", "large companies", "corporations"]],
  ["government agencies",  ["government", "federal", "state agency", "municipal", "public sector"]],
  ["healthcare providers", ["hospitals", "clinics", "healthcare providers", "medical institutions", "doctors", "physicians"]],
  ["small businesses",     ["small business", "smb", "sme", "startup", "small company", "local business"]],
  ["developers",           ["developers", "engineers", "software teams", "dev teams", "programmers", "coders"]],
  ["consumers",            ["consumers", "individuals", "users", "people", "customers", "general public"]],
  ["investors",            ["investors", "fund managers", "portfolio managers", "shareholders"]],
  ["remote teams",         ["remote teams", "distributed teams", "remote workers"]],
  ["students",             ["students", "learners", "academic", "universities", "pupils"]],
  ["retailers",            ["retailers", "merchants", "store owners", "e-commerce businesses"]],
  ["researchers",          ["researchers", "scientists", "academics", "scholars"]],
  ["families",             ["families", "parents", "children", "kids"]],
  ["pet owners",           ["pet owners", "dog owners", "cat owners", "animal lovers"]],
  ["professionals",        ["professionals", "specialists", "experts", "practitioners"]],
  ["creatives",            ["creatives", "artists", "designers", "photographers", "musicians"]],
  ["athletes",             ["athletes", "sports teams", "coaches", "trainers", "gym members"]],
];

function extractTargetAudience(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const [audience, signals] of AUDIENCE_KEYWORDS) {
    if (signals.some(s => lower.includes(s))) {
      found.push(audience);
    }
  }

  const BUSINESS_WORDS = new Set([
    "company", "firm", "agency", "organization", "organisation", "corporation",
    "institute", "startup", "studio", "lab", "laboratory", "practice", "clinic",
    "shop", "store", "salon", "boutique", "collective", "cooperative", "consortium",
    "association", "bureau", "center", "centre", "platform", "service", "brand",
    "league", "business", "research", "management", "monitoring", "tracking",
    "solutions", "system", "software", "tool", "tools", "marketplace", "exchange",
    "network", "hub", "portal", "suite", "dashboard",
  ]);

  if (found.length === 0) {
    for (const pattern of AUDIENCE_PATTERNS) {
      const match = lower.match(pattern);
      if (match && match[1]) {
        const audience = match[1].trim()
          .replace(/^(?:a|an|the|our|their|your)\s+/i, "")
          .trim();
        const words = audience.split(/\s+/);
        const isBusiness = words.some(w => BUSINESS_WORDS.has(w));
        if (!isBusiness && audience.length > 3 && audience.length < 50) {
          found.push(audience);
          break;
        }
      }
    }
  }

  if (found.length === 0) {
    found.push("modern organisations");
  }

  return Array.from(new Set(found)).slice(0, 5);
}

const PAGE_TYPE_SIGNALS: Record<PageType, string[]> = {
  landing_page:     ["landing page", "landing", "homepage", "home page", "promotional page", "product page", "waitlist", "coming soon"],
  marketing_site:   ["marketing page", "marketing site", "marketing website"],
  web_app:          ["web app", "webapp", "application", "platform", "tool", "saas", "software"],
  dashboard:        ["dashboard", "admin panel", "admin dashboard", "analytics dashboard", "control panel", "management console"],
  blog:             ["blog", "articles", "posts", "content site", "magazine", "news site", "publication"],
  ecommerce_store:  ["store", "shop", "e-commerce", "ecommerce", "marketplace", "online store", "shopping"],
  social_platform:  ["social network", "social platform", "community", "forum", "social media", "creator platform"],
  portfolio:        ["portfolio", "personal site", "cv site", "showcase", "resume site"],
};

function detectPageType(text: string): PageType | null {
  const lower = text.toLowerCase();
  let bestMatch: PageType | null = null;
  let bestLen = 0;
  for (const [pageType, signals] of Object.entries(PAGE_TYPE_SIGNALS)) {
    for (const signal of signals) {
      if (lower.includes(signal) && signal.length > bestLen) {
        bestMatch = pageType as PageType;
        bestLen = signal.length;
      }
    }
  }
  return bestMatch;
}

const PRODUCT_TYPE_HINTS: [string, string[]][] = [
  ["analytics_dashboard", ["analytics", "dashboard", "metrics", "charts", "data visualization"]],
  ["cloud_storage",       ["cloud storage", "file storage", "file sharing", "file management"]],
  ["chat_app",            ["chat", "messaging", "instant messaging", "communication"]],
  ["ecommerce",           ["e-commerce", "ecommerce", "online store", "shop", "marketplace"]],
  ["project_management",  ["project management", "task management", "project tracker", "kanban"]],
  ["crm",                 ["crm", "customer relationship", "sales pipeline", "lead management"]],
  ["social_media",        ["social media", "social network", "social platform"]],
  ["developer_tool",      ["developer tool", "dev tool", "sdk", "api platform", "developer platform"]],
  ["video_platform",      ["video", "streaming", "video platform", "live stream"]],
  ["calendar_scheduling", ["calendar", "scheduling", "appointment", "booking"]],
];

function detectProductType(text: string): string | null {
  const lower = text.toLowerCase();
  let bestMatch: string | null = null;
  let bestLen = 0;
  for (const [type, signals] of PRODUCT_TYPE_HINTS) {
    for (const signal of signals) {
      if (lower.includes(signal) && signal.length > bestLen) {
        bestMatch = type;
        bestLen = signal.length;
      }
    }
  }
  return bestMatch;
}

function buildDynamicVocabulary(text: string, industry: string): DomainCluster {
  const hasDirectMatch = industry in DOMAIN_VOCABULARY;
  const baseVocab = getDomainVocabulary(industry);
  const tokens = extractMeaningfulTokens(text);
  const nouns = extractNouns(tokens);
  const verbs = extractVerbs(tokens);
  const adjectives = extractAdjectives(tokens);
  const bigrams = extractNGrams(tokens, 2).filter(bg => {
    const parts = bg.split(" ");
    return parts.every(p => !STOP_WORDS.has(p) && p.length > 2);
  });

  const dynamicCore = new Set<string>(hasDirectMatch ? baseVocab.core : []);
  const dynamicActions = new Set<string>(hasDirectMatch ? baseVocab.actions : []);
  const dynamicObjects = new Set<string>(hasDirectMatch ? baseVocab.objects : []);
  const dynamicQualities = new Set<string>(hasDirectMatch ? baseVocab.qualities : []);
  const dynamicRoles = new Set<string>(hasDirectMatch ? baseVocab.roles : []);

  for (const noun of nouns) {
    if (noun.length > 3 && !PAGE_TYPE_WORDS.has(noun)) {
      dynamicObjects.add(noun);
    }
  }

  for (const verb of verbs) {
    if (verb.length > 3 && !PAGE_TYPE_WORDS.has(verb)) {
      dynamicActions.add(verb);
    }
  }

  for (const adj of adjectives) {
    if (adj.length > 3 && !PAGE_TYPE_WORDS.has(adj)) {
      dynamicQualities.add(adj);
    }
  }

  for (const bg of bigrams) {
    const parts = bg.split(" ");
    if (!parts.some(p => PAGE_TYPE_WORDS.has(p))) {
      dynamicCore.add(bg);
    }
  }

  const rolePatterns = [
    /\b([\w]+(?:\s[\w]+)?)\s+(?:manager|director|specialist|analyst|coordinator|officer|engineer|consultant|advisor|technician|supervisor)\b/gi,
  ];
  for (const pattern of rolePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[0] && match[0].length < 40) {
        dynamicRoles.add(match[0].toLowerCase());
      }
    }
  }

  return {
    core: Array.from(dynamicCore).slice(0, 20),
    actions: Array.from(dynamicActions).slice(0, 20),
    objects: Array.from(dynamicObjects).slice(0, 25),
    qualities: Array.from(dynamicQualities).slice(0, 15),
    roles: Array.from(dynamicRoles).slice(0, 15),
  };
}

export function extractUniversalContext(prompt: string): UniversalContext {
  const tokens = extractMeaningfulTokens(prompt);
  const { industry, confidence } = detectIndustryWithScoring(prompt);
  const companyType = extractCompanyType(prompt);
  const coreActivities = extractCoreActivities(prompt, tokens);
  const targetAudience = extractTargetAudience(prompt);
  const pageType = detectPageType(prompt);
  const productType = detectProductType(prompt);
  const domainVocab = buildDynamicVocabulary(prompt, industry);

  return {
    industry,
    industryConfidence: confidence,
    productType,
    companyType,
    coreActivities,
    targetAudience,
    domainVocabulary: domainVocab,
    pageType,
  };
}

export function getIndustryLabel(industry: string): string {
  const labels: Record<string, string> = {
    energy: "Energy & Power",
    healthcare: "Healthcare & Medical",
    finance: "Finance & Banking",
    education: "Education & Learning",
    logistics: "Logistics & Supply Chain",
    retail: "Retail & Commerce",
    real_estate: "Real Estate & Property",
    legal: "Legal & Compliance",
    hospitality: "Hospitality & Tourism",
    construction: "Construction & Engineering",
    manufacturing: "Manufacturing & Industrial",
    media: "Media & Entertainment",
    agriculture: "Agriculture & Farming",
    government: "Government & Public Sector",
    consulting: "Consulting & Advisory",
    telecom: "Telecommunications",
    automotive: "Automotive & Mobility",
    fitness: "Fitness & Wellness",
    beauty: "Beauty & Personal Care",
    pets: "Pets & Animal Care",
    environmental: "Environmental & Conservation",
    science: "Science & Research",
    nonprofit: "Nonprofit & Social Impact",
    entertainment: "Entertainment & Gaming",
    insurance: "Insurance & Risk",
    food_beverage: "Food & Beverage",
    technology: "Technology & Software",
  };
  return labels[industry] ?? industry.charAt(0).toUpperCase() + industry.slice(1).replace(/_/g, " ");
}
