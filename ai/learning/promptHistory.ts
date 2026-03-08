import type { ReasonedContext } from "../context/contextReasoner";
import type { ExtractedContext } from "../context/contextExtractor";
import type { InternetContext } from "../retrieval/internetContext";
import { storeContextResult, type InternetContextSummary } from "../knowledge/contextDatabase";

export interface PromptHistoryEntry {
  prompt: string;
  interpretedContext: ReasonedContext;
  extractedContext?: ExtractedContext;
  internetSources: string[];
  generatedLayoutStructure: string[];
  validationScore: number;
  timestamp: number;
}

const _recentHistory: PromptHistoryEntry[] = [];
const MAX_HISTORY_SIZE = 200;

export function recordPromptHistory(entry: PromptHistoryEntry): void {
  if (_recentHistory.length >= MAX_HISTORY_SIZE) {
    _recentHistory.shift();
  }
  _recentHistory.push(entry);

  const internetSummary: InternetContextSummary | undefined = entry.extractedContext ? {
    concepts: entry.extractedContext.userGoals.slice(0, 8),
    workflows: entry.extractedContext.workflows.map(w => w.name),
    entities: entry.extractedContext.entities.slice(0, 10),
    sources: entry.internetSources.slice(0, 10),
  } : undefined;

  storeContextResult(
    entry.prompt,
    entry.interpretedContext,
    entry.internetSources,
    entry.generatedLayoutStructure,
    internetSummary,
    entry.validationScore,
  ).catch(() => {});
}

export function recordFromPipelineResult(
  prompt: string,
  context: ReasonedContext,
  extractedContext: ExtractedContext | undefined,
  internetContext: InternetContext | undefined,
  suggestedSections: string[],
  validationScore: number,
): void {
  const sources: string[] = [];
  if (internetContext) {
    for (const src of internetContext.sources) {
      if (src.url) sources.push(src.url);
      else if (src.title) sources.push(src.title);
    }
  }

  recordPromptHistory({
    prompt,
    interpretedContext: context,
    extractedContext,
    internetSources: sources,
    generatedLayoutStructure: suggestedSections,
    validationScore,
    timestamp: Date.now(),
  });
}

export function getRecentHistory(limit: number = 20): PromptHistoryEntry[] {
  return _recentHistory.slice(-limit);
}

export function getHistoryByDomain(domain: string): PromptHistoryEntry[] {
  return _recentHistory.filter(e => e.interpretedContext.domain === domain);
}

export function getHistoryStats(): {
  totalEntries: number;
  domainBreakdown: Record<string, number>;
  averageValidationScore: number;
} {
  const domainBreakdown: Record<string, number> = {};
  let totalScore = 0;

  for (const entry of _recentHistory) {
    const d = entry.interpretedContext.domain;
    domainBreakdown[d] = (domainBreakdown[d] || 0) + 1;
    totalScore += entry.validationScore;
  }

  return {
    totalEntries: _recentHistory.length,
    domainBreakdown,
    averageValidationScore: _recentHistory.length > 0 ? totalScore / _recentHistory.length : 0,
  };
}
