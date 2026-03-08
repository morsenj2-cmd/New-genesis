import { tokenize } from "./tokenizer";
import { embedToken, meanPool, EMBEDDING_DIM } from "./model";
import type { IntentType, ModelWeights, ModelConfig } from "./promptSchema";
import { TRAINING_DATA } from "../training/dataset";

let _cachedWeights: ModelWeights | null = null;

export function computePromptEmbedding(prompt: string): number[] {
  const { meaningful } = tokenize(prompt);
  if (meaningful.length === 0) return new Array(EMBEDDING_DIM).fill(0);
  const embeds = meaningful.map(t => {
    const stemEmbed = embedToken(t.stem);
    const normEmbed = embedToken(t.normalized);
    return stemEmbed.map((v, i) => (v + normEmbed[i]) / 2);
  });
  return meanPool(embeds);
}

export function trainModel(): ModelWeights {
  if (_cachedWeights) return _cachedWeights;

  const intentGroups: Record<string, number[][]> = {};

  for (const example of TRAINING_DATA) {
    const embedding = computePromptEmbedding(example.prompt);
    if (!intentGroups[example.intentType]) {
      intentGroups[example.intentType] = [];
    }
    intentGroups[example.intentType].push(embedding);
  }

  const intentPrototypes: Record<string, number[]> = {};
  for (const [intentType, embeddings] of Object.entries(intentGroups)) {
    intentPrototypes[intentType] = meanPool(embeddings);
  }

  const attentionKeys: number[][] = Array.from({ length: 4 }, (_, i) =>
    new Array(EMBEDDING_DIM).fill(0).map((_, d) => {
      const h = (i * 0x9e3779b9 + d * 0x517cc1b7) >>> 0;
      return (h / 0xffffffff) * 2 - 1;
    }),
  );

  const config: ModelConfig = {
    embeddingDim: EMBEDDING_DIM,
    numAttentionHeads: 4,
    numConceptDims: 16,
    vocabSize: Object.keys(intentPrototypes).length,
    version: "1.0.0",
  };

  _cachedWeights = {
    vocabEmbeddings: {},
    intentPrototypes: intentPrototypes as Record<IntentType, number[]>,
    attentionKeys,
    config,
  };

  return _cachedWeights;
}

export function getOrTrainWeights(): ModelWeights {
  return _cachedWeights ?? trainModel();
}
