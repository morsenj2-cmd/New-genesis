import type { IntentType } from "../model/promptSchema";
import { tokenize } from "../model/tokenizer";

export interface PromptPattern {
  id: string;
  template: string;
  intentType: IntentType;
  frequency: number;
  examples: string[];
  tokens: string[];
  firstSeen: number;
  lastSeen: number;
}

const _patterns: Map<string, PromptPattern> = new Map();
const MAX_PATTERNS = 500;
const MAX_EXAMPLES_PER_PATTERN = 10;

function normalizeToTemplate(prompt: string): string {
  const { meaningful } = tokenize(prompt);
  const stems = meaningful.map(t => t.stem).filter(s => s.length > 2);
  stems.sort();
  return stems.join("|");
}

function generatePatternId(template: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < template.length; i++) {
    hash ^= template.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `pat-${hash.toString(16)}`;
}

export function recordPattern(prompt: string, intentType: IntentType): string {
  const template = normalizeToTemplate(prompt);
  const patternId = generatePatternId(template);
  const { meaningful } = tokenize(prompt);

  const existing = _patterns.get(patternId);
  if (existing) {
    existing.frequency++;
    existing.lastSeen = Date.now();
    if (existing.examples.length < MAX_EXAMPLES_PER_PATTERN) {
      existing.examples.push(prompt);
    }
  } else {
    if (_patterns.size >= MAX_PATTERNS) {
      let lowestFreq = Infinity;
      let lowestId = "";
      for (const [id, p] of _patterns) {
        if (p.frequency < lowestFreq) {
          lowestFreq = p.frequency;
          lowestId = id;
        }
      }
      if (lowestId) _patterns.delete(lowestId);
    }

    _patterns.set(patternId, {
      id: patternId,
      template,
      intentType,
      frequency: 1,
      examples: [prompt],
      tokens: meaningful.map(t => t.normalized),
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    });
  }

  return patternId;
}

export function getTopPatterns(count: number = 20): PromptPattern[] {
  return [..._patterns.values()]
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, count);
}

export function getPatternsByIntent(intentType: IntentType): PromptPattern[] {
  return [..._patterns.values()]
    .filter(p => p.intentType === intentType)
    .sort((a, b) => b.frequency - a.frequency);
}

export function findSimilarPattern(prompt: string): PromptPattern | undefined {
  const template = normalizeToTemplate(prompt);
  const patternId = generatePatternId(template);
  return _patterns.get(patternId);
}

export function getPatternStats(): {
  totalPatterns: number;
  byIntent: Record<string, number>;
  topRecurring: Array<{ template: string; frequency: number; intentType: string }>;
} {
  const byIntent: Record<string, number> = {};
  for (const p of _patterns.values()) {
    byIntent[p.intentType] = (byIntent[p.intentType] ?? 0) + 1;
  }
  const topRecurring = getTopPatterns(5).map(p => ({
    template: p.template,
    frequency: p.frequency,
    intentType: p.intentType,
  }));
  return { totalPatterns: _patterns.size, byIntent, topRecurring };
}
