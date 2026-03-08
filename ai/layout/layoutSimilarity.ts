import type { LayoutDNA } from "./layoutDNA";
import { computeDNASimilarity, mutateDNA } from "./layoutDNA";
import { createHash } from "crypto";

const SIMILARITY_THRESHOLD = 0.65;
const MAX_HISTORY = 50;

const dnaHistory: LayoutDNA[] = [];

export function storeDNA(dna: LayoutDNA): void {
  dnaHistory.push(dna);
  if (dnaHistory.length > MAX_HISTORY) {
    dnaHistory.splice(0, dnaHistory.length - MAX_HISTORY);
  }
}

export function isDNATooSimilar(
  candidate: LayoutDNA,
  threshold: number = SIMILARITY_THRESHOLD,
): { similar: boolean; highestScore: number; matchIndex: number | null } {
  let highestScore = 0;
  let matchIndex: number | null = null;

  for (let i = 0; i < dnaHistory.length; i++) {
    const score = computeDNASimilarity(candidate, dnaHistory[i]);
    if (score > highestScore) {
      highestScore = score;
      matchIndex = i;
    }
  }

  return {
    similar: highestScore >= threshold,
    highestScore,
    matchIndex: highestScore >= threshold ? matchIndex : null,
  };
}

export function ensureUniqueDNA(
  dna: LayoutDNA,
  maxRetries: number = 5,
): { dna: LayoutDNA; attempts: number } {
  let current = dna;
  let attempts = 0;

  while (attempts < maxRetries) {
    const result = isDNATooSimilar(current);
    if (!result.similar) {
      storeDNA(current);
      return { dna: current, attempts };
    }

    attempts++;
    const mutationSeed = createHash("sha256")
      .update(current.hash + "|mutate|" + attempts + "|" + Date.now())
      .digest("hex");
    current = mutateDNA(current, mutationSeed);
  }

  storeDNA(current);
  return { dna: current, attempts };
}

export function getDNAHistorySize(): number {
  return dnaHistory.length;
}

export function clearDNAHistory(): void {
  dnaHistory.length = 0;
}
