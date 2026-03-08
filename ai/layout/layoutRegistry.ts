import { createHash } from "crypto";

export interface LayoutFingerprint {
  sectionTypes: string[];
  gridConfigurations: string[];
  componentArrangement: string[];
  sectionCount: number;
  dominantAlignment: string;
  hasMedia: boolean;
  gridStyle: string;
  hash: string;
}

const SIMILARITY_THRESHOLD = 0.75;
const registry: LayoutFingerprint[] = [];

function computeFingerprintHash(fp: Omit<LayoutFingerprint, "hash">): string {
  const raw = [
    fp.sectionTypes.join(","),
    fp.gridConfigurations.join(","),
    fp.componentArrangement.join(","),
    String(fp.sectionCount),
    fp.dominantAlignment,
    String(fp.hasMedia),
    fp.gridStyle,
  ].join("|");
  return createHash("sha256").update(raw).digest("hex");
}

export function createFingerprint(params: {
  sectionTypes: string[];
  gridConfigurations: string[];
  componentArrangement: string[];
  sectionCount: number;
  dominantAlignment: string;
  hasMedia: boolean;
  gridStyle: string;
}): LayoutFingerprint {
  const hash = computeFingerprintHash(params);
  return { ...params, hash };
}

function computeSimilarity(a: LayoutFingerprint, b: LayoutFingerprint): number {
  if (a.hash === b.hash) return 1.0;

  let score = 0;
  let dimensions = 0;

  dimensions++;
  if (a.sectionCount === b.sectionCount) score++;

  dimensions++;
  if (a.dominantAlignment === b.dominantAlignment) score++;

  dimensions++;
  if (a.hasMedia === b.hasMedia) score++;

  dimensions++;
  if (a.gridStyle === b.gridStyle) score++;

  dimensions++;
  const sectionOverlap = arrayOverlap(a.sectionTypes, b.sectionTypes);
  score += sectionOverlap;

  dimensions++;
  const gridOverlap = arrayOverlap(a.gridConfigurations, b.gridConfigurations);
  score += gridOverlap;

  dimensions++;
  const arrangementOverlap = arrayOverlap(a.componentArrangement, b.componentArrangement);
  score += arrangementOverlap;

  return score / dimensions;
}

function arrayOverlap(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const maxLen = Math.max(a.length, b.length);
  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / maxLen;
}

export interface SimilarityResult {
  isSimilar: boolean;
  highestSimilarity: number;
  matchingIndex: number | null;
}

export function checkSimilarity(
  fingerprint: LayoutFingerprint,
  threshold: number = SIMILARITY_THRESHOLD,
): SimilarityResult {
  let highestSimilarity = 0;
  let matchingIndex: number | null = null;

  for (let i = 0; i < registry.length; i++) {
    const similarity = computeSimilarity(fingerprint, registry[i]);
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      matchingIndex = i;
    }
  }

  return {
    isSimilar: highestSimilarity >= threshold,
    highestSimilarity,
    matchingIndex: highestSimilarity >= threshold ? matchingIndex : null,
  };
}

export function registerLayout(fingerprint: LayoutFingerprint): void {
  registry.push(fingerprint);
}

export function getRegistrySize(): number {
  return registry.length;
}

export function clearRegistry(): void {
  registry.length = 0;
}

export function getAllFingerprints(): LayoutFingerprint[] {
  return [...registry];
}
