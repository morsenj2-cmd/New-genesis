import { embedToken, meanPool, cosineSimilarity, EMBEDDING_DIM } from "./model";
import { tokenize } from "./tokenizer";
import { getOrTrainWeights } from "./training";
import type { IntentType, ModelWeights, StructuredIntent } from "./promptSchema";

interface AdaptationEntry {
  prompt: string;
  embedding: number[];
  intentType: IntentType;
  weight: number;
  timestamp: number;
}

const ADAPTATION_WINDOW = 200;
const _adaptationBuffer: AdaptationEntry[] = [];
let _adaptedPrototypes: Record<string, number[]> | null = null;
let _lastAdaptationTimestamp = 0;

function computeEmbedding(prompt: string): number[] {
  const { meaningful } = tokenize(prompt);
  if (meaningful.length === 0) return new Array(EMBEDDING_DIM).fill(0);
  const embeds = meaningful.map(t => {
    const e1 = embedToken(t.stem);
    const e2 = embedToken(t.normalized);
    return e1.map((v, i) => (v + e2[i]) / 2);
  });
  return meanPool(embeds);
}

export function recordAdaptation(
  prompt: string,
  intentType: IntentType,
  weight: number = 1.0,
): void {
  const embedding = computeEmbedding(prompt);
  _adaptationBuffer.push({
    prompt,
    embedding,
    intentType,
    weight,
    timestamp: Date.now(),
  });

  if (_adaptationBuffer.length > ADAPTATION_WINDOW) {
    _adaptationBuffer.shift();
  }

  _adaptedPrototypes = null;
}

export function getAdaptedPrototypes(): Record<string, number[]> {
  if (_adaptedPrototypes) return _adaptedPrototypes;

  const baseWeights = getOrTrainWeights();
  const basePrototypes = { ...baseWeights.intentPrototypes };

  if (_adaptationBuffer.length === 0) return basePrototypes;

  const groups: Record<string, { embeddings: number[][]; weights: number[] }> = {};
  for (const entry of _adaptationBuffer) {
    if (!groups[entry.intentType]) {
      groups[entry.intentType] = { embeddings: [], weights: [] };
    }
    groups[entry.intentType].embeddings.push(entry.embedding);
    groups[entry.intentType].weights.push(entry.weight);
  }

  const adaptationStrength = Math.min(0.3, _adaptationBuffer.length / 500);

  for (const [intentType, group] of Object.entries(groups)) {
    const baseProto = basePrototypes[intentType as IntentType];
    if (!baseProto) continue;

    const totalWeight = group.weights.reduce((a, b) => a + b, 0);
    const weightedMean = new Array(EMBEDDING_DIM).fill(0);
    for (let i = 0; i < group.embeddings.length; i++) {
      const w = group.weights[i] / totalWeight;
      for (let d = 0; d < EMBEDDING_DIM; d++) {
        weightedMean[d] += group.embeddings[i][d] * w;
      }
    }

    const adapted = new Array(EMBEDDING_DIM);
    for (let d = 0; d < EMBEDDING_DIM; d++) {
      adapted[d] = baseProto[d] * (1 - adaptationStrength) + weightedMean[d] * adaptationStrength;
    }
    basePrototypes[intentType as IntentType] = adapted;
  }

  _adaptedPrototypes = basePrototypes;
  _lastAdaptationTimestamp = Date.now();
  return basePrototypes;
}

export function findSimilarPrompts(
  query: string,
  topK: number = 5,
): Array<{ prompt: string; intentType: IntentType; similarity: number }> {
  const queryEmbed = computeEmbedding(query);
  const scored = _adaptationBuffer.map(entry => ({
    prompt: entry.prompt,
    intentType: entry.intentType,
    similarity: cosineSimilarity(queryEmbed, entry.embedding),
  }));
  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
}

export function getAdaptationStats(): {
  bufferSize: number;
  maxSize: number;
  lastAdaptedAt: number;
  intentDistribution: Record<string, number>;
} {
  const dist: Record<string, number> = {};
  for (const entry of _adaptationBuffer) {
    dist[entry.intentType] = (dist[entry.intentType] ?? 0) + 1;
  }
  return {
    bufferSize: _adaptationBuffer.length,
    maxSize: ADAPTATION_WINDOW,
    lastAdaptedAt: _lastAdaptationTimestamp,
    intentDistribution: dist,
  };
}

export function resetAdaptation(): void {
  _adaptationBuffer.length = 0;
  _adaptedPrototypes = null;
}
