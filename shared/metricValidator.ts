import type { DomainCluster } from "./domainVocabulary";
import { getAllDomainWords } from "./domainVocabulary";

export interface MetricDefinition {
  name: string;
  label: string;
  unit?: string;
  source: string;
}

export interface MetricValidationResult {
  valid: MetricDefinition[];
  rejected: MetricDefinition[];
}

function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenizeMetric(metric: MetricDefinition): string[] {
  const combined = `${metric.name} ${metric.label} ${metric.source}`;
  return normalizeForComparison(combined)
    .split(" ")
    .filter(w => w.length > 2);
}

export function validateMetrics(
  metrics: MetricDefinition[],
  domainVocabulary: DomainCluster,
  industry: string,
  coreActivities: string[]
): MetricValidationResult {
  const domainWords = getAllDomainWords(industry);

  const vocabTerms = new Set<string>();
  for (const list of [domainVocabulary.core, domainVocabulary.actions, domainVocabulary.objects, domainVocabulary.qualities, domainVocabulary.roles]) {
    for (const term of list) {
      vocabTerms.add(term.toLowerCase());
      for (const word of term.toLowerCase().split(/\s+/)) {
        if (word.length > 2) vocabTerms.add(word);
      }
    }
  }

  const activityTerms = new Set<string>();
  for (const activity of coreActivities) {
    activityTerms.add(activity.toLowerCase());
    for (const word of activity.toLowerCase().split(/\s+/)) {
      if (word.length > 2) activityTerms.add(word);
    }
  }

  const universalMetricWords = new Set([
    "total", "count", "rate", "average", "growth", "revenue", "active",
    "daily", "weekly", "monthly", "annual", "new", "completed", "pending",
    "percentage", "ratio", "time", "duration", "satisfaction", "score",
  ]);

  const valid: MetricDefinition[] = [];
  const rejected: MetricDefinition[] = [];

  for (const metric of metrics) {
    const tokens = tokenizeMetric(metric);
    let relevanceScore = 0;

    for (const token of tokens) {
      if (vocabTerms.has(token)) relevanceScore += 3;
      else if (domainWords.has(token)) relevanceScore += 2;
      else if (activityTerms.has(token)) relevanceScore += 3;
      else if (universalMetricWords.has(token)) relevanceScore += 0.5;
    }

    const threshold = Math.max(1.5, tokens.length * 0.3);

    if (relevanceScore >= threshold) {
      valid.push(metric);
    } else {
      rejected.push(metric);
    }
  }

  return { valid, rejected };
}

export function deriveMetricsFromActivities(
  coreActivities: string[],
  domainVocabulary: DomainCluster,
  industry: string
): MetricDefinition[] {
  const metrics: MetricDefinition[] = [];
  const seen = new Set<string>();

  const metricTemplates: { pattern: RegExp; generator: (match: string) => MetricDefinition[] }[] = [
    {
      pattern: /./,
      generator: (activity: string) => {
        const base = activity.replace(/\b(ing|tion|sion|ment)\b/gi, "").trim();
        const capitalized = activity.charAt(0).toUpperCase() + activity.slice(1);
        return [
          { name: `total_${base.replace(/\s+/g, "_")}`, label: `Total ${capitalized}`, source: activity },
          { name: `active_${base.replace(/\s+/g, "_")}`, label: `Active ${capitalized}`, source: activity },
        ];
      },
    },
  ];

  for (const activity of coreActivities) {
    for (const template of metricTemplates) {
      if (template.pattern.test(activity)) {
        const generated = template.generator(activity);
        for (const m of generated) {
          if (!seen.has(m.name)) {
            seen.add(m.name);
            metrics.push(m);
          }
        }
      }
    }
  }

  const actionMetrics = deriveFromVocabularyActions(domainVocabulary, industry);
  for (const m of actionMetrics) {
    if (!seen.has(m.name)) {
      seen.add(m.name);
      metrics.push(m);
    }
  }

  const objectMetrics = deriveFromVocabularyObjects(domainVocabulary, industry);
  for (const m of objectMetrics) {
    if (!seen.has(m.name)) {
      seen.add(m.name);
      metrics.push(m);
    }
  }

  return metrics.slice(0, 12);
}

function deriveFromVocabularyActions(vocab: DomainCluster, industry: string): MetricDefinition[] {
  const metrics: MetricDefinition[] = [];
  const countableActions = vocab.actions.slice(0, 6);

  for (const action of countableActions) {
    const name = `${action.replace(/\s+/g, "_")}_count`;
    const label = `${action.charAt(0).toUpperCase() + action.slice(1)} Count`;
    metrics.push({ name, label, source: `${industry} operations` });
  }

  return metrics;
}

function deriveFromVocabularyObjects(vocab: DomainCluster, industry: string): MetricDefinition[] {
  const metrics: MetricDefinition[] = [];
  const trackableObjects = vocab.objects.slice(0, 4);

  for (const obj of trackableObjects) {
    const name = `total_${obj.replace(/\s+/g, "_")}`;
    const label = `Total ${obj.charAt(0).toUpperCase() + obj.slice(1)}`;
    metrics.push({ name, label, unit: "count", source: `${industry} tracking` });
  }

  return metrics;
}

export function hasMetricsCapability(
  coreActivities: string[],
  domainVocabulary: DomainCluster
): boolean {
  const measurableSignals = [
    ...domainVocabulary.actions,
    ...domainVocabulary.objects,
  ];

  const measurablePatterns = [
    /track/i, /monitor/i, /manage/i, /count/i, /measure/i,
    /schedule/i, /book/i, /process/i, /complete/i, /deliver/i,
    /serve/i, /produce/i, /sell/i, /buy/i, /order/i,
    /appoint/i, /groom/i, /treat/i, /consult/i, /inspect/i,
    /ship/i, /build/i, /install/i, /repair/i, /clean/i,
    /teach/i, /train/i, /hire/i, /review/i, /assess/i,
  ];

  let measurableCount = 0;
  const allTerms = [...coreActivities, ...measurableSignals];

  for (const term of allTerms) {
    if (measurablePatterns.some(p => p.test(term))) {
      measurableCount++;
    }
  }

  return measurableCount >= 1;
}
