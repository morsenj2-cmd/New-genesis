import { tokenize } from "./tokenizer";
import { embedToken, meanPool, EMBEDDING_DIM } from "./model";
import type { IntentType, ModelWeights, ModelConfig } from "./promptSchema";
import { TRAINING_DATA } from "../training/dataset";
import { exportDatasetForTraining } from "../learning/learningDataset";

export interface ModelVersion {
  id: string;
  weights: ModelWeights;
  trainingSize: number;
  timestamp: number;
  accuracy?: number;
}

const MAX_VERSIONS = 10;
const _versions: ModelVersion[] = [];
let _currentVersion: ModelVersion | null = null;

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

export function retrain(): ModelWeights {
  const intentGroups: Record<string, { embeddings: number[][]; weights: number[] }> = {};

  for (const example of TRAINING_DATA) {
    const embedding = computeEmbedding(example.prompt);
    if (!intentGroups[example.intentType]) {
      intentGroups[example.intentType] = { embeddings: [], weights: [] };
    }
    intentGroups[example.intentType].embeddings.push(embedding);
    intentGroups[example.intentType].weights.push(1.0);
  }

  const learnedData = exportDatasetForTraining();
  for (const example of learnedData) {
    const embedding = computeEmbedding(example.prompt);
    if (!intentGroups[example.intentType]) {
      intentGroups[example.intentType] = { embeddings: [], weights: [] };
    }
    intentGroups[example.intentType].embeddings.push(embedding);
    intentGroups[example.intentType].weights.push(example.weight);
  }

  const intentPrototypes: Record<string, number[]> = {};
  for (const [intentType, group] of Object.entries(intentGroups)) {
    const totalWeight = group.weights.reduce((a, b) => a + b, 0);
    const weighted = new Array(EMBEDDING_DIM).fill(0);
    for (let i = 0; i < group.embeddings.length; i++) {
      const w = group.weights[i] / totalWeight;
      for (let d = 0; d < EMBEDDING_DIM; d++) {
        weighted[d] += group.embeddings[i][d] * w;
      }
    }
    intentPrototypes[intentType] = weighted;
  }

  const attentionKeys: number[][] = Array.from({ length: 4 }, (_, i) =>
    new Array(EMBEDDING_DIM).fill(0).map((_, d) => {
      const h = (i * 0x9e3779b9 + d * 0x517cc1b7) >>> 0;
      return (h / 0xffffffff) * 2 - 1;
    }),
  );

  const totalExamples = TRAINING_DATA.length + learnedData.length;
  const config: ModelConfig = {
    embeddingDim: EMBEDDING_DIM,
    numAttentionHeads: 4,
    numConceptDims: 16,
    vocabSize: Object.keys(intentPrototypes).length,
    version: `v${_versions.length + 1}`,
  };

  const weights: ModelWeights = {
    vocabEmbeddings: {},
    intentPrototypes: intentPrototypes as Record<IntentType, number[]>,
    attentionKeys,
    config,
  };

  const version: ModelVersion = {
    id: config.version,
    weights,
    trainingSize: totalExamples,
    timestamp: Date.now(),
  };

  _versions.push(version);
  if (_versions.length > MAX_VERSIONS) {
    _versions.shift();
  }
  _currentVersion = version;

  return weights;
}

export function getCurrentVersion(): ModelVersion | null {
  return _currentVersion;
}

export function getVersionHistory(): Array<{
  id: string;
  trainingSize: number;
  timestamp: number;
  accuracy?: number;
}> {
  return _versions.map(v => ({
    id: v.id,
    trainingSize: v.trainingSize,
    timestamp: v.timestamp,
    accuracy: v.accuracy,
  }));
}

export function rollbackToVersion(versionId: string): ModelWeights | null {
  const version = _versions.find(v => v.id === versionId);
  if (!version) return null;
  _currentVersion = version;
  return version.weights;
}
