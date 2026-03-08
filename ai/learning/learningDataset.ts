import type { IntentType } from "../model/promptSchema";

export interface LearnedExample {
  prompt: string;
  intentType: IntentType;
  confidence: number;
  feedbackSignal: string;
  embedding?: number[];
  timestamp: number;
}

const MAX_DATASET_SIZE = 5000;
const _learnedExamples: LearnedExample[] = [];
const _intentBuckets: Map<IntentType, LearnedExample[]> = new Map();

export function appendExample(example: LearnedExample): void {
  _learnedExamples.push(example);

  const bucket = _intentBuckets.get(example.intentType) ?? [];
  bucket.push(example);
  _intentBuckets.set(example.intentType, bucket);

  if (_learnedExamples.length > MAX_DATASET_SIZE) {
    const removed = _learnedExamples.shift();
    if (removed) {
      const b = _intentBuckets.get(removed.intentType);
      if (b) {
        const idx = b.indexOf(removed);
        if (idx >= 0) b.splice(idx, 1);
      }
    }
  }
}

export function getExamplesByType(intentType: IntentType): LearnedExample[] {
  return _intentBuckets.get(intentType) ?? [];
}

export function getRecentExamples(count: number = 100): LearnedExample[] {
  return _learnedExamples.slice(-count);
}

export function getCorrectedExamples(): LearnedExample[] {
  return _learnedExamples.filter(e =>
    e.feedbackSignal === "correction" || e.feedbackSignal === "re_prompt"
  );
}

export function getPositiveExamples(): LearnedExample[] {
  return _learnedExamples.filter(e =>
    e.feedbackSignal === "none" || e.feedbackSignal === "positive"
  );
}

export function getDatasetStats(): {
  total: number;
  byType: Record<string, number>;
  corrected: number;
  positive: number;
} {
  const byType: Record<string, number> = {};
  for (const [type, bucket] of _intentBuckets.entries()) {
    byType[type] = bucket.length;
  }
  return {
    total: _learnedExamples.length,
    byType,
    corrected: getCorrectedExamples().length,
    positive: getPositiveExamples().length,
  };
}

export function exportDatasetForTraining(): Array<{
  prompt: string;
  intentType: IntentType;
  weight: number;
}> {
  return _learnedExamples.map(e => ({
    prompt: e.prompt,
    intentType: e.intentType,
    weight: e.feedbackSignal === "positive" ? 1.2
      : e.feedbackSignal === "correction" ? 0.5
      : e.feedbackSignal === "re_prompt" ? 0.6
      : 1.0,
  }));
}

export function loadFromDatabase(logs: Array<{
  sanitizedPrompt: string;
  intentType: string;
  confidence: number;
  feedbackSignal: string | null;
  createdAt: Date;
}>): void {
  for (const log of logs) {
    appendExample({
      prompt: log.sanitizedPrompt,
      intentType: log.intentType as IntentType,
      confidence: log.confidence,
      feedbackSignal: log.feedbackSignal ?? "none",
      timestamp: log.createdAt.getTime(),
    });
  }
}
