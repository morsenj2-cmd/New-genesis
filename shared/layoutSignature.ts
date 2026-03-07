import type { LayoutGraph } from "./layoutEngine";
import type { DesignGenome } from "./genomeGenerator";

export interface GenomeSig {
  hueBucket: number;
  font: string;
  colorMode: string;
  buttonStyle: string;
  spacingMode: string;
  surfaceStyle: string;
}

export function buildGenomeSig(genome: DesignGenome): GenomeSig {
  return {
    hueBucket: Math.round((genome.colors.hues.primary) / 30) * 30,
    font: genome.typography.heading,
    colorMode: genome.variation?.colorMode ?? "vibrant",
    buttonStyle: genome.variation?.buttonStyle ?? "rounded",
    spacingMode: genome.variation?.spacingMode ?? "balanced",
    surfaceStyle: genome.variation?.surfaceStyle ?? "flat",
  };
}

export function serializeGenomeSig(sig: GenomeSig): string {
  return `${sig.hueBucket}|${sig.font}|${sig.colorMode}|${sig.buttonStyle}|${sig.spacingMode}|${sig.surfaceStyle}`;
}

export function parseGenomeSig(serialized: string): string[] {
  return serialized.split("|");
}

export function genomeSigFromString(serialized: string): GenomeSig | null {
  const parts = serialized.split("|");
  if (parts.length < 6) return null;
  return {
    hueBucket: parseInt(parts[0], 10) || 0,
    font: parts[1],
    colorMode: parts[2],
    buttonStyle: parts[3],
    spacingMode: parts[4],
    surfaceStyle: parts[5],
  };
}

export function isGenomeTooSimilar(
  candidate: string,
  history: string[],
  matchThreshold = 4,
): boolean {
  const parts = parseGenomeSig(candidate);
  return history.some(prev => {
    const prevParts = parseGenomeSig(prev);
    if (prevParts.length < 2) {
      return prev === candidate;
    }
    const matchCount = parts.filter((p, i) => p === (prevParts[i] ?? "")).length;
    return matchCount >= matchThreshold;
  });
}

export function countDimChanges(sigA: string, sigB: string): number {
  const partsA = parseGenomeSig(sigA);
  const partsB = parseGenomeSig(sigB);
  let changes = 0;
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    if ((partsA[i] ?? "") !== (partsB[i] ?? "")) changes++;
  }
  return changes;
}

export function hasSufficientMutation(
  candidateSig: string,
  previousSig: string,
  minChanges = 2,
): boolean {
  return countDimChanges(candidateSig, previousSig) >= minChanges;
}

export function layoutSignature(layout: LayoutGraph): string {
  const sections = layout.sections.map(s => `${s.type[0]}${s.alignment[0]}`).join(",");
  const cols = layout.sections.map(s => s.columns ?? 0).join("");
  return `${sections}:${cols}`;
}

export function legacySigToNew(legacy: string): string {
  const parts = legacy.split("-");
  if (parts.length < 2) return legacy;
  return `${parts[0]}|${parts.slice(1).join("-")}||||`;
}
