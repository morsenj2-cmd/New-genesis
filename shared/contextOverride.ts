import type { UniversalContext } from "./universalContext";
import { extractUniversalContext } from "./universalContext";
import type { DomainCluster } from "./domainVocabulary";
import { getDomainVocabulary } from "./domainVocabulary";

export interface CorrectionResult {
  corrected: boolean;
  updatedContext: UniversalContext;
  corrections: CorrectionDetail[];
}

export interface CorrectionDetail {
  field: string;
  oldValue: string | string[] | null;
  newValue: string | string[] | null;
  reason: string;
}

interface ParsedCorrection {
  removeIndustry: string | null;
  setIndustry: string | null;
  removeCompanyType: string | null;
  setCompanyType: string | null;
  removeActivities: string[];
  addActivities: string[];
}

const CORRECTION_PATTERNS: { pattern: RegExp; extractor: (match: RegExpMatchArray) => Partial<ParsedCorrection> }[] = [
  {
    pattern: /\bthis\s+is\s+(?:a|an)\s+([\w\s]+?)\s+(?:company|firm|agency|startup|organization|business|platform|service)\s*[,.]?\s*not\s+(?:a|an)\s+([\w\s]+?)\s+(?:company|firm|agency|startup|organization|business|platform|service)\b/i,
    extractor: (m) => ({ setIndustry: m[1].trim(), removeIndustry: m[2].trim() }),
  },
  {
    pattern: /\bnot\s+(?:a|an)\s+([\w\s]+?)\s+(?:company|firm|agency|startup|organization|business|platform|service)\s*[,.]?\s*(?:it'?s|this\s+is|we\s+are|it\s+is)\s+(?:a|an)\s+([\w\s]+?)\s+(?:company|firm|agency|startup|organization|business|platform|service)\b/i,
    extractor: (m) => ({ removeIndustry: m[1].trim(), setIndustry: m[2].trim() }),
  },
  {
    pattern: /\b(?:it'?s|this\s+is|we\s+are|it\s+is)\s+(?:a|an)\s+([\w\s]+?)\s+(?:company|firm|agency|startup|organization|business|platform|service)\s*[,.]?\s*not\s+(?:a|an)\s+([\w\s]+?)\s+(?:company|firm|agency|startup|organization|business|platform|service)\b/i,
    extractor: (m) => ({ setIndustry: m[1].trim(), removeIndustry: m[2].trim() }),
  },
  {
    pattern: /\bnot\s+(?:a|an)\s+([\w\s]+?)\s+(?:company|firm|agency|startup|organization|business|platform|service)\b/i,
    extractor: (m) => ({ removeIndustry: m[1].trim() }),
  },
  {
    pattern: /\b(?:actually|really)\s+(?:a|an)\s+([\w\s]+?)\s+(?:company|firm|agency|startup|organization|business|platform|service)\b/i,
    extractor: (m) => ({ setIndustry: m[1].trim() }),
  },
  {
    pattern: /\b(?:change|switch|update|correct|fix)\s+(?:the\s+)?(?:industry|category|type)\s+(?:to|from)\s+([\w\s]+?)(?:\s+(?:to|from)\s+([\w\s]+?))?(?:\.|,|$)/i,
    extractor: (m) => {
      if (m[2]) {
        return { removeIndustry: m[1].trim(), setIndustry: m[2].trim() };
      }
      return { setIndustry: m[1].trim() };
    },
  },
  {
    pattern: /\b(?:it'?s|this\s+is|we\s+are)\s+(?:a|an)\s+([\w\s]+?)\s+(?:company|firm|agency|startup|organization|business|platform|service)\b/i,
    extractor: (m) => ({ setIndustry: m[1].trim() }),
  },
  {
    pattern: /\bwe\s+(?:do|provide|offer|specialize\s+in|focus\s+on)\s+([\w\s]+?)\s*(?:not|,\s*not)\s+([\w\s]+?)(?:\.|,|$)/i,
    extractor: (m) => ({ addActivities: [m[1].trim()], removeActivities: [m[2].trim()] }),
  },
  {
    pattern: /\b(?:not|don'?t)\s+(?:do|provide|offer)\s+([\w\s]+?)(?:\.|,|$)/i,
    extractor: (m) => ({ removeActivities: [m[1].trim()] }),
  },
  {
    pattern: /\bwe\s+(?:also|actually)\s+(?:do|provide|offer)\s+([\w\s]+?)(?:\.|,|$)/i,
    extractor: (m) => ({ addActivities: [m[1].trim()] }),
  },
];

const INDUSTRY_ALIASES: Record<string, string> = {
  ai: "technology",
  "artificial intelligence": "technology",
  ml: "technology",
  "machine learning": "technology",
  tech: "technology",
  software: "technology",
  saas: "technology",
  fintech: "finance",
  edtech: "education",
  healthtech: "healthcare",
  medtech: "healthcare",
  proptech: "real_estate",
  agritech: "agriculture",
  agtech: "agriculture",
  foodtech: "food_beverage",
  biotech: "healthcare",
  cleantech: "environmental",
  greentech: "environmental",
  insurtech: "insurance",
  legaltech: "legal",
  martech: "media",
  adtech: "media",
  ecommerce: "retail",
  "e-commerce": "retail",
  crypto: "finance",
  blockchain: "finance",
  automotive: "automotive",
  auto: "automotive",
  telecom: "telecom",
  telecommunications: "telecom",
  hospitality: "hospitality",
  hotel: "hospitality",
  restaurant: "food_beverage",
  construction: "construction",
  manufacturing: "manufacturing",
  logistics: "logistics",
  shipping: "logistics",
  education: "education",
  healthcare: "healthcare",
  medical: "healthcare",
  finance: "finance",
  banking: "finance",
  legal: "legal",
  law: "legal",
  consulting: "consulting",
  media: "media",
  entertainment: "entertainment",
  gaming: "entertainment",
  fitness: "fitness",
  gym: "fitness",
  beauty: "beauty",
  salon: "beauty",
  cosmetics: "beauty",
  pets: "pets",
  pet: "pets",
  veterinary: "pets",
  energy: "energy",
  power: "energy",
  solar: "energy",
  environmental: "environmental",
  sustainability: "environmental",
  nonprofit: "nonprofit",
  charity: "nonprofit",
  government: "government",
  science: "science",
  research: "science",
  agriculture: "agriculture",
  farming: "agriculture",
  real_estate: "real_estate",
  "real estate": "real_estate",
  property: "real_estate",
  retail: "retail",
  insurance: "insurance",
  food: "food_beverage",
  beverage: "food_beverage",
};

function resolveIndustryAlias(input: string): string {
  const lower = input.toLowerCase().trim();
  if (INDUSTRY_ALIASES[lower]) return INDUSTRY_ALIASES[lower];

  for (const [alias, industry] of Object.entries(INDUSTRY_ALIASES)) {
    if (lower.includes(alias) || alias.includes(lower)) {
      return industry;
    }
  }

  return lower.replace(/\s+/g, "_");
}

function parseCorrection(prompt: string): ParsedCorrection {
  const result: ParsedCorrection = {
    removeIndustry: null,
    setIndustry: null,
    removeCompanyType: null,
    setCompanyType: null,
    removeActivities: [],
    addActivities: [],
  };

  for (const { pattern, extractor } of CORRECTION_PATTERNS) {
    const match = prompt.match(pattern);
    if (match) {
      const extracted = extractor(match);
      if (extracted.removeIndustry && !result.removeIndustry) result.removeIndustry = extracted.removeIndustry;
      if (extracted.setIndustry && !result.setIndustry) result.setIndustry = extracted.setIndustry;
      if (extracted.removeCompanyType) result.removeCompanyType = extracted.removeCompanyType;
      if (extracted.setCompanyType) result.setCompanyType = extracted.setCompanyType;
      if (extracted.removeActivities) result.removeActivities.push(...extracted.removeActivities);
      if (extracted.addActivities) result.addActivities.push(...extracted.addActivities);
    }
  }

  return result;
}

export function isCorrectionPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase();

  const correctionIndicators = [
    /\bnot\s+(?:a|an)\s+[\w\s]+(?:company|firm|agency|startup|organization|business|platform|service)\b/i,
    /\b(?:actually|really)\s+(?:a|an)\s+[\w\s]+(?:company|firm|agency|startup|organization|business|platform|service)\b/i,
    /\b(?:change|switch|update|correct|fix)\s+(?:the\s+)?(?:industry|category|type)\b/i,
    /\bthis\s+is\s+(?:a|an)\s+[\w\s]+(?:company|firm|agency|startup|organization|business|platform|service)\s*[,.]?\s*not\b/i,
    /\b(?:it'?s|we\s+are)\s+(?:a|an)\s+[\w\s]+(?:company|firm|agency|startup|organization|business|platform|service)\s*[,.]?\s*not\b/i,
    /\bwrong\s+(?:industry|category|type)\b/i,
    /\b(?:don'?t|do\s+not)\s+(?:do|provide|offer)\b/i,
    /\bwe\s+(?:do|provide|offer|specialize)\b.*\bnot\b/i,
  ];

  return correctionIndicators.some(p => p.test(lower));
}

export function applyContextCorrection(
  currentContext: UniversalContext,
  correctionPrompt: string,
  originalPrompt: string,
): CorrectionResult {
  const parsed = parseCorrection(correctionPrompt);
  const corrections: CorrectionDetail[] = [];
  let updatedContext = { ...currentContext };

  if (parsed.setIndustry) {
    const newIndustry = resolveIndustryAlias(parsed.setIndustry);
    if (newIndustry !== currentContext.industry) {
      corrections.push({
        field: "industry",
        oldValue: currentContext.industry,
        newValue: newIndustry,
        reason: `Corrected from "${currentContext.industry}" to "${newIndustry}" based on user correction`,
      });

      const newVocab = getDomainVocabulary(newIndustry);
      const reExtracted = extractUniversalContext(originalPrompt);

      const mergedVocab: DomainCluster = {
        core: Array.from(new Set([...newVocab.core, ...reExtracted.domainVocabulary.core.filter(w => !isFromIndustry(w, currentContext.industry))])).slice(0, 20),
        actions: Array.from(new Set([...newVocab.actions, ...reExtracted.domainVocabulary.actions.filter(w => !isFromIndustry(w, currentContext.industry))])).slice(0, 20),
        objects: Array.from(new Set([...newVocab.objects, ...reExtracted.domainVocabulary.objects.filter(w => !isFromIndustry(w, currentContext.industry))])).slice(0, 25),
        qualities: Array.from(new Set([...newVocab.qualities, ...reExtracted.domainVocabulary.qualities.filter(w => !isFromIndustry(w, currentContext.industry))])).slice(0, 15),
        roles: Array.from(new Set([...newVocab.roles, ...reExtracted.domainVocabulary.roles.filter(w => !isFromIndustry(w, currentContext.industry))])).slice(0, 15),
      };

      corrections.push({
        field: "domainVocabulary",
        oldValue: `${currentContext.domainVocabulary.core.slice(0, 3).join(", ")}...`,
        newValue: `${mergedVocab.core.slice(0, 3).join(", ")}...`,
        reason: `Domain vocabulary updated to match "${newIndustry}" industry`,
      });

      updatedContext = {
        ...updatedContext,
        industry: newIndustry,
        industryConfidence: 1.0,
        domainVocabulary: mergedVocab,
      };
    }
  }

  if (parsed.removeActivities.length > 0) {
    const oldActivities = [...updatedContext.coreActivities];
    const removeSet = new Set(parsed.removeActivities.map(a => a.toLowerCase()));
    updatedContext.coreActivities = updatedContext.coreActivities.filter(
      a => !removeSet.has(a.toLowerCase()) && !parsed.removeActivities.some(r => a.toLowerCase().includes(r.toLowerCase()))
    );

    if (updatedContext.coreActivities.length !== oldActivities.length) {
      corrections.push({
        field: "coreActivities",
        oldValue: oldActivities,
        newValue: updatedContext.coreActivities,
        reason: `Removed activities: ${parsed.removeActivities.join(", ")}`,
      });
    }
  }

  if (parsed.addActivities.length > 0) {
    const oldActivities = [...updatedContext.coreActivities];
    for (const activity of parsed.addActivities) {
      if (!updatedContext.coreActivities.some(a => a.toLowerCase() === activity.toLowerCase())) {
        updatedContext.coreActivities.push(activity);
      }
    }

    if (updatedContext.coreActivities.length !== oldActivities.length) {
      corrections.push({
        field: "coreActivities",
        oldValue: oldActivities,
        newValue: updatedContext.coreActivities,
        reason: `Added activities: ${parsed.addActivities.join(", ")}`,
      });
    }
  }

  if (parsed.setCompanyType) {
    const oldType = updatedContext.companyType;
    updatedContext.companyType = parsed.setCompanyType;
    corrections.push({
      field: "companyType",
      oldValue: oldType,
      newValue: parsed.setCompanyType,
      reason: `Company type updated to "${parsed.setCompanyType}"`,
    });
  }

  return {
    corrected: corrections.length > 0,
    updatedContext,
    corrections,
  };
}

function isFromIndustry(word: string, industry: string): boolean {
  const vocab = getDomainVocabulary(industry);
  const lower = word.toLowerCase();
  const allTerms = [...vocab.core, ...vocab.actions, ...vocab.objects, ...vocab.qualities, ...vocab.roles];
  return allTerms.some(t => t.toLowerCase() === lower);
}
