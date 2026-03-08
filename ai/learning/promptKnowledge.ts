import type { ReasonedContext } from "../context/contextReasoner";

export interface PromptKnowledgeEntry {
  prompt: string;
  interpretedContext: ReasonedContext;
  resultingComponents: string[];
  userCorrections?: {
    correctedDomain?: string;
    correctedSystemType?: string;
    correctedEntities?: string[];
    correctedActions?: string[];
  };
  feedbackScore: number;
  timestamp: number;
}

const MAX_KNOWLEDGE_SIZE = 2000;
const _knowledge: PromptKnowledgeEntry[] = [];
const _domainIndex: Map<string, PromptKnowledgeEntry[]> = new Map();
const _promptEmbeddingIndex: Map<string, number[]> = new Map();

export function storeKnowledge(entry: PromptKnowledgeEntry): void {
  _knowledge.push(entry);

  const domain = entry.interpretedContext.domain;
  const bucket = _domainIndex.get(domain) ?? [];
  bucket.push(entry);
  _domainIndex.set(domain, bucket);

  if (_knowledge.length > MAX_KNOWLEDGE_SIZE) {
    const removed = _knowledge.shift();
    if (removed) {
      const b = _domainIndex.get(removed.interpretedContext.domain);
      if (b) {
        const idx = b.indexOf(removed);
        if (idx >= 0) b.splice(idx, 1);
      }
    }
  }
}

export function getKnowledgeByDomain(domain: string): PromptKnowledgeEntry[] {
  return _domainIndex.get(domain) ?? [];
}

export function getRecentKnowledge(count: number = 50): PromptKnowledgeEntry[] {
  return _knowledge.slice(-count);
}

export function getCorrectedKnowledge(): PromptKnowledgeEntry[] {
  return _knowledge.filter(e => e.userCorrections !== undefined);
}

export function findSimilarPromptKnowledge(prompt: string, topK: number = 5): PromptKnowledgeEntry[] {
  const promptLower = prompt.toLowerCase();
  const promptWords = new Set(promptLower.split(/\s+/).filter(w => w.length > 2));

  const scored = _knowledge.map(entry => {
    const entryWords = new Set(entry.prompt.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    let overlap = 0;
    for (const w of promptWords) {
      if (entryWords.has(w)) overlap++;
    }
    const jaccardSim = overlap / (promptWords.size + entryWords.size - overlap || 1);
    return { entry, score: jaccardSim };
  }).filter(s => s.score > 0.1);

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(s => s.entry);
}

export function getDomainLearnings(domain: string): {
  commonEntities: string[];
  commonActions: string[];
  preferredComponents: string[];
  correctionPatterns: Array<{ original: string; corrected: string }>;
} {
  const entries = getKnowledgeByDomain(domain);
  if (entries.length === 0) {
    return { commonEntities: [], commonActions: [], preferredComponents: [], correctionPatterns: [] };
  }

  const entityCounts: Map<string, number> = new Map();
  const actionCounts: Map<string, number> = new Map();
  const componentCounts: Map<string, number> = new Map();
  const corrections: Array<{ original: string; corrected: string }> = [];

  for (const entry of entries) {
    for (const entity of entry.interpretedContext.entities) {
      entityCounts.set(entity, (entityCounts.get(entity) ?? 0) + 1);
    }
    for (const action of entry.interpretedContext.userActions) {
      actionCounts.set(action, (actionCounts.get(action) ?? 0) + 1);
    }
    for (const comp of entry.resultingComponents) {
      componentCounts.set(comp, (componentCounts.get(comp) ?? 0) + 1);
    }
    if (entry.userCorrections) {
      if (entry.userCorrections.correctedDomain) {
        corrections.push({
          original: entry.interpretedContext.domain,
          corrected: entry.userCorrections.correctedDomain,
        });
      }
    }
  }

  const sortByCount = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);

  return {
    commonEntities: sortByCount(entityCounts).slice(0, 10),
    commonActions: sortByCount(actionCounts).slice(0, 10),
    preferredComponents: sortByCount(componentCounts).slice(0, 10),
    correctionPatterns: corrections,
  };
}

export function enrichContextFromKnowledge(
  context: ReasonedContext,
  prompt: string,
): ReasonedContext {
  const domainLearnings = getDomainLearnings(context.domain);
  const similarEntries = findSimilarPromptKnowledge(prompt, 3);

  if (domainLearnings.commonEntities.length === 0 && similarEntries.length === 0) {
    return context;
  }

  const enrichedEntities = [...new Set([
    ...context.entities,
    ...domainLearnings.commonEntities.slice(0, 3),
  ])];

  const enrichedActions = [...new Set([
    ...context.userActions,
    ...domainLearnings.commonActions.slice(0, 3),
  ])];

  const enrichedRequirements = [...new Set([
    ...context.interfaceRequirements,
    ...domainLearnings.preferredComponents.slice(0, 3),
  ])];

  for (const correction of domainLearnings.correctionPatterns) {
    if (context.domain === correction.original) {
      return {
        ...context,
        domain: correction.corrected,
        entities: enrichedEntities,
        userActions: enrichedActions,
        interfaceRequirements: enrichedRequirements,
        confidence: Math.min(context.confidence + 0.1, 0.95),
      };
    }
  }

  return {
    ...context,
    entities: enrichedEntities,
    userActions: enrichedActions,
    interfaceRequirements: enrichedRequirements,
    confidence: Math.min(context.confidence + 0.05, 0.95),
  };
}

export function getKnowledgeStats(): {
  totalEntries: number;
  domainCoverage: Record<string, number>;
  correctedCount: number;
} {
  const domainCoverage: Record<string, number> = {};
  for (const [domain, entries] of _domainIndex) {
    domainCoverage[domain] = entries.length;
  }
  return {
    totalEntries: _knowledge.length,
    domainCoverage,
    correctedCount: getCorrectedKnowledge().length,
  };
}
