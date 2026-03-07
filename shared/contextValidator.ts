import type { DomainCluster } from "./domainVocabulary";
import { getAllDomainWords } from "./domainVocabulary";
import type { UniversalContext } from "./universalContext";
import type { FeatureItem, StatItem, TestimonialItem, ProductContent } from "./contentGenerator";

export interface ValidationResult {
  valid: boolean;
  score: number;
  mismatches: ValidationMismatch[];
}

export interface ValidationMismatch {
  type: "section" | "widget" | "metric" | "sentence" | "feature" | "testimonial";
  field: string;
  value: string;
  reason: string;
}

const GENERIC_WORDS = new Set([
  "solution", "solutions", "platform", "service", "services", "system",
  "team", "teams", "business", "company", "world", "global", "modern",
  "innovative", "advanced", "powerful", "trusted", "leading", "premier",
  "comprehensive", "seamless", "robust", "reliable", "scalable",
  "efficient", "effective", "future", "technology", "digital",
]);

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
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

function buildVocabularySet(context: UniversalContext): Set<string> {
  const vocab = new Set<string>();

  const domainWords = getAllDomainWords(context.industry);
  Array.from(domainWords).forEach(w => {
    vocab.add(w.toLowerCase());
  });

  const cluster = context.domainVocabulary;
  for (const list of [cluster.core, cluster.actions, cluster.objects, cluster.qualities, cluster.roles]) {
    for (const term of list) {
      vocab.add(term.toLowerCase());
      for (const word of term.toLowerCase().split(/\s+/)) {
        if (word.length > 2) vocab.add(word);
      }
    }
  }

  for (const activity of context.coreActivities) {
    vocab.add(activity.toLowerCase());
    for (const word of activity.toLowerCase().split(/\s+/)) {
      if (word.length > 2) vocab.add(word);
    }
  }

  for (const audience of context.targetAudience) {
    vocab.add(audience.toLowerCase());
    for (const word of audience.toLowerCase().split(/\s+/)) {
      if (word.length > 2) vocab.add(word);
    }
  }

  if (context.industry) {
    vocab.add(context.industry.toLowerCase());
    for (const word of context.industry.replace(/_/g, " ").split(/\s+/)) {
      if (word.length > 2) vocab.add(word.toLowerCase());
    }
  }

  if (context.productType) {
    for (const word of context.productType.replace(/_/g, " ").split(/\s+/)) {
      if (word.length > 2) vocab.add(word.toLowerCase());
    }
  }

  if (context.companyType) {
    vocab.add(context.companyType.toLowerCase());
  }

  return vocab;
}

function scoreSentenceRelevance(text: string, vocabSet: Set<string>): number {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 1;

  const meaningfulTokens = tokens.filter(t => !GENERIC_WORDS.has(t));
  if (meaningfulTokens.length === 0) return 0.5;

  let hits = 0;
  for (const token of meaningfulTokens) {
    if (vocabSet.has(token)) {
      hits++;
      continue;
    }
    const vocabArr = Array.from(vocabSet);
    for (const vocabWord of vocabArr) {
      if (vocabWord.length > 4 && (vocabWord.includes(token) || token.includes(vocabWord))) {
        hits += 0.5;
        break;
      }
    }
  }

  return hits / meaningfulTokens.length;
}

const CROSS_INDUSTRY_TERMS: Record<string, Set<string>> = {
  healthcare: new Set(["patient", "clinical", "medical", "hospital", "physician", "doctor", "hipaa", "diagnosis", "prescription", "ehr"]),
  finance: new Set(["bank", "banking", "portfolio", "treasury", "trading", "investment", "mortgage", "fintech", "capital", "ledger"]),
  energy: new Set(["grid", "turbine", "solar", "renewable", "megawatt", "kilowatt", "power plant", "substation", "geothermal"]),
  construction: new Set(["scaffold", "excavate", "rebar", "foundation", "crane", "blueprint", "structural", "foreman"]),
  agriculture: new Set(["crop", "harvest", "irrigation", "livestock", "fertilizer", "agronomist", "farming", "soil"]),
  legal: new Set(["litigation", "arbitration", "paralegal", "deposition", "statute", "injunction", "counsel", "attorney"]),
  automotive: new Set(["vehicle", "powertrain", "chassis", "dealership", "telematics", "autonomous", "vin"]),
  manufacturing: new Set(["assembly", "fabrication", "conveyor", "tooling", "plc", "batch", "six sigma"]),
};

function detectCrossIndustryContamination(text: string, expectedIndustry: string): string | null {
  const lower = text.toLowerCase();
  const tokens = tokenize(lower);

  for (const [industry, terms] of Object.entries(CROSS_INDUSTRY_TERMS)) {
    if (industry === expectedIndustry) continue;

    let matchCount = 0;
    for (const token of tokens) {
      if (terms.has(token)) matchCount++;
    }

    if (matchCount >= 2) {
      return industry;
    }

    const termsArr = Array.from(terms);
    for (const term of termsArr) {
      if (term.includes(" ") && lower.includes(term)) {
        return industry;
      }
    }
  }

  return null;
}

export function validateSentence(
  text: string,
  context: UniversalContext,
): { valid: boolean; score: number; contaminatedIndustry: string | null } {
  const vocabSet = buildVocabularySet(context);
  const score = scoreSentenceRelevance(text, vocabSet);
  const contaminatedIndustry = detectCrossIndustryContamination(text, context.industry);

  return {
    valid: score >= 0.15 && !contaminatedIndustry,
    score,
    contaminatedIndustry,
  };
}

export function validateFeature(
  feature: FeatureItem,
  context: UniversalContext,
): ValidationMismatch | null {
  const vocabSet = buildVocabularySet(context);
  const combinedText = `${feature.title} ${feature.description}`;
  const score = scoreSentenceRelevance(combinedText, vocabSet);
  const contamination = detectCrossIndustryContamination(combinedText, context.industry);

  if (contamination) {
    return {
      type: "feature",
      field: "feature",
      value: feature.title,
      reason: `Feature contains ${contamination} industry terms but project is ${context.industry}`,
    };
  }

  if (score < 0.1) {
    return {
      type: "feature",
      field: "feature",
      value: feature.title,
      reason: `Feature relevance score ${score.toFixed(2)} is below threshold (0.1)`,
    };
  }

  return null;
}

export function validateStat(
  stat: StatItem,
  context: UniversalContext,
): ValidationMismatch | null {
  const vocabSet = buildVocabularySet(context);
  const score = scoreSentenceRelevance(stat.label, vocabSet);
  const contamination = detectCrossIndustryContamination(stat.label, context.industry);

  if (contamination) {
    return {
      type: "metric",
      field: "stat",
      value: `${stat.value} ${stat.label}`,
      reason: `Metric contains ${contamination} industry terms but project is ${context.industry}`,
    };
  }

  if (score < 0.1) {
    return {
      type: "metric",
      field: "stat",
      value: `${stat.value} ${stat.label}`,
      reason: `Metric relevance score ${score.toFixed(2)} is below threshold (0.1)`,
    };
  }

  return null;
}

export function validateTestimonial(
  testimonial: TestimonialItem,
  context: UniversalContext,
): ValidationMismatch | null {
  const vocabSet = buildVocabularySet(context);
  const combinedText = `${testimonial.text} ${testimonial.role}`;
  const score = scoreSentenceRelevance(combinedText, vocabSet);
  const contamination = detectCrossIndustryContamination(combinedText, context.industry);

  if (contamination) {
    return {
      type: "testimonial",
      field: "testimonial",
      value: testimonial.author,
      reason: `Testimonial contains ${contamination} industry terms but project is ${context.industry}`,
    };
  }

  if (score < 0.08) {
    return {
      type: "testimonial",
      field: "testimonial",
      value: testimonial.author,
      reason: `Testimonial relevance score ${score.toFixed(2)} is below threshold (0.08)`,
    };
  }

  return null;
}

export function validateContent(
  content: Partial<ProductContent>,
  context: UniversalContext,
): ValidationResult {
  const mismatches: ValidationMismatch[] = [];
  const vocabSet = buildVocabularySet(context);
  let totalChecks = 0;
  let passedChecks = 0;

  if (content.headline) {
    totalChecks++;
    const headlineResult = validateSentence(content.headline, context);
    if (headlineResult.valid) {
      passedChecks++;
    } else {
      mismatches.push({
        type: "sentence",
        field: "headline",
        value: content.headline,
        reason: headlineResult.contaminatedIndustry
          ? `Headline contains ${headlineResult.contaminatedIndustry} terms but project is ${context.industry}`
          : `Headline relevance score ${headlineResult.score.toFixed(2)} is too low`,
      });
    }
  }

  if (content.subheadline) {
    totalChecks++;
    const subResult = validateSentence(content.subheadline, context);
    if (subResult.valid) {
      passedChecks++;
    } else {
      mismatches.push({
        type: "sentence",
        field: "subheadline",
        value: content.subheadline,
        reason: subResult.contaminatedIndustry
          ? `Subheadline contains ${subResult.contaminatedIndustry} terms but project is ${context.industry}`
          : `Subheadline relevance score ${subResult.score.toFixed(2)} is too low`,
      });
    }
  }

  if (content.ctaHeadline) {
    totalChecks++;
    const ctaResult = validateSentence(content.ctaHeadline, context);
    if (ctaResult.valid) {
      passedChecks++;
    } else {
      mismatches.push({
        type: "sentence",
        field: "ctaHeadline",
        value: content.ctaHeadline,
        reason: ctaResult.contaminatedIndustry
          ? `CTA headline contains ${ctaResult.contaminatedIndustry} terms`
          : `CTA headline relevance score ${ctaResult.score.toFixed(2)} is too low`,
      });
    }
  }

  if (content.ctaBody) {
    totalChecks++;
    const ctaBodyResult = validateSentence(content.ctaBody, context);
    if (ctaBodyResult.valid) {
      passedChecks++;
    } else {
      mismatches.push({
        type: "sentence",
        field: "ctaBody",
        value: content.ctaBody,
        reason: ctaBodyResult.contaminatedIndustry
          ? `CTA body contains ${ctaBodyResult.contaminatedIndustry} terms`
          : `CTA body relevance score ${ctaBodyResult.score.toFixed(2)} is too low`,
      });
    }
  }

  if (content.aboutMission) {
    totalChecks++;
    const missionResult = validateSentence(content.aboutMission, context);
    if (missionResult.valid) {
      passedChecks++;
    } else {
      mismatches.push({
        type: "sentence",
        field: "aboutMission",
        value: content.aboutMission,
        reason: missionResult.contaminatedIndustry
          ? `Mission statement contains ${missionResult.contaminatedIndustry} terms`
          : `Mission statement relevance score ${missionResult.score.toFixed(2)} is too low`,
      });
    }
  }

  if (content.features) {
    for (const feature of content.features) {
      totalChecks++;
      const mismatch = validateFeature(feature, context);
      if (mismatch) {
        mismatches.push(mismatch);
      } else {
        passedChecks++;
      }
    }
  }

  if (content.stats) {
    for (const stat of content.stats) {
      totalChecks++;
      const mismatch = validateStat(stat, context);
      if (mismatch) {
        mismatches.push(mismatch);
      } else {
        passedChecks++;
      }
    }
  }

  if (content.testimonials) {
    for (const testimonial of content.testimonials) {
      totalChecks++;
      const mismatch = validateTestimonial(testimonial, context);
      if (mismatch) {
        mismatches.push(mismatch);
      } else {
        passedChecks++;
      }
    }
  }

  const score = totalChecks > 0 ? passedChecks / totalChecks : 1;

  return {
    valid: mismatches.length === 0,
    score,
    mismatches,
  };
}

export function validateWidget(
  widgetType: string,
  widgetLabel: string,
  context: UniversalContext,
): ValidationMismatch | null {
  const vocabSet = buildVocabularySet(context);
  const score = scoreSentenceRelevance(widgetLabel, vocabSet);
  const contamination = detectCrossIndustryContamination(widgetLabel, context.industry);

  if (contamination) {
    return {
      type: "widget",
      field: widgetType,
      value: widgetLabel,
      reason: `Widget "${widgetLabel}" contains ${contamination} terms but project is ${context.industry}`,
    };
  }

  if (score < 0.1) {
    return {
      type: "widget",
      field: widgetType,
      value: widgetLabel,
      reason: `Widget relevance score ${score.toFixed(2)} is below threshold`,
    };
  }

  return null;
}

export function validateSection(
  sectionType: string,
  sectionContent: Record<string, string>,
  context: UniversalContext,
): ValidationMismatch[] {
  const mismatches: ValidationMismatch[] = [];

  for (const [field, value] of Object.entries(sectionContent)) {
    if (!value || typeof value !== "string" || value.length < 5) continue;

    const result = validateSentence(value, context);
    if (!result.valid) {
      mismatches.push({
        type: "section",
        field: `${sectionType}.${field}`,
        value,
        reason: result.contaminatedIndustry
          ? `Section content contains ${result.contaminatedIndustry} terms but project is ${context.industry}`
          : `Section content relevance score ${result.score.toFixed(2)} is below threshold`,
      });
    }
  }

  return mismatches;
}

export function needsRegeneration(validationResult: ValidationResult): boolean {
  if (validationResult.score < 0.5) return true;

  const hasCriticalMismatch = validationResult.mismatches.some(
    m => m.type === "sentence" && (m.field === "headline" || m.field === "subheadline"),
  );
  if (hasCriticalMismatch) return true;

  const contaminationCount = validationResult.mismatches.filter(
    m => m.reason.includes("industry terms"),
  ).length;
  if (contaminationCount >= 2) return true;

  return false;
}
