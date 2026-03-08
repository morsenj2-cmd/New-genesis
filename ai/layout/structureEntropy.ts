import { createHash } from "crypto";
import type { LayoutDNA } from "./layoutDNA";
import { generateLayoutDNA, mutateDNA } from "./layoutDNA";
import type { DNAContext } from "./layoutDNA";

function seedByte(seed: string, offset: number): number {
  const idx = (offset * 2) % Math.max(1, seed.length - 1);
  const val = parseInt(seed.slice(idx, idx + 2) || "00", 16);
  return Number.isNaN(val) ? (offset * 37 + 13) % 256 : val;
}

export interface EntropyConfig {
  sectionOrderEntropy: number;
  heroCompositionEntropy: number;
  gridColumnEntropy: number;
  contentBandEntropy: number;
  componentPlacementEntropy: number;
  navigationEntropy: number;
}

export function computeEntropy(seed: string): EntropyConfig {
  return {
    sectionOrderEntropy: (seedByte(seed, 0) % 100) / 100,
    heroCompositionEntropy: (seedByte(seed, 2) % 100) / 100,
    gridColumnEntropy: (seedByte(seed, 4) % 100) / 100,
    contentBandEntropy: (seedByte(seed, 6) % 100) / 100,
    componentPlacementEntropy: (seedByte(seed, 8) % 100) / 100,
    navigationEntropy: (seedByte(seed, 10) % 100) / 100,
  };
}

export function applyStructureEntropy(
  dna: LayoutDNA,
  entropySeed: string,
  context?: DNAContext,
): LayoutDNA {
  const entropy = computeEntropy(entropySeed);

  let mutated = { ...dna };

  if (entropy.sectionOrderEntropy > 0.4) {
    const newOrder = [...dna.sectionOrder];
    const swapCount = Math.ceil(newOrder.length * entropy.sectionOrderEntropy * 0.5);
    for (let s = 0; s < swapCount; s++) {
      const i = seedByte(entropySeed, 20 + s * 2) % newOrder.length;
      const j = seedByte(entropySeed, 21 + s * 2) % newOrder.length;
      [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
    }
    mutated = { ...mutated, sectionOrder: newOrder };
  }

  if (entropy.gridColumnEntropy > 0.3) {
    const newCols = dna.columnPattern.map((c, i) => {
      const shift = Math.round((seedByte(entropySeed, 30 + i) % 5) - 2) *
        (entropy.gridColumnEntropy > 0.7 ? 2 : 1);
      return Math.max(1, Math.min(4, c + shift));
    });
    mutated = { ...mutated, columnPattern: newCols };
  }

  if (entropy.componentPlacementEntropy > 0.5) {
    const orientations = ["horizontal", "vertical"];
    const newOrientations = dna.orientationPattern.map((_, i) =>
      orientations[seedByte(entropySeed, 40 + i) % 2],
    );
    mutated = { ...mutated, orientationPattern: newOrientations };
  }

  if (entropy.contentBandEntropy > 0.5) {
    const imgOptions = ["left", "right", "top", "none"];
    const newPlacements = dna.imagePlacementPattern.map((_, i) =>
      imgOptions[seedByte(entropySeed, 50 + i) % imgOptions.length],
    );
    mutated = { ...mutated, imagePlacementPattern: newPlacements };
  }

  const hash = createHash("sha256")
    .update([
      mutated.heroType,
      mutated.sectionOrder.join(","),
      mutated.gridStructure,
      mutated.navigationType,
      mutated.contentDensity,
      mutated.componentGrouping,
      mutated.visualHierarchy,
      mutated.sectionCount,
      mutated.columnPattern.join(","),
      mutated.orientationPattern.join(","),
      mutated.imagePlacementPattern.join(","),
      mutated.cardCountPattern.join(","),
    ].join("|"))
    .digest("hex")
    .slice(0, 32);

  return { ...mutated, hash };
}

export function generateEntropyDNA(
  baseSeed: string,
  context?: DNAContext,
): LayoutDNA {
  const dna = generateLayoutDNA(baseSeed, context);
  const entropySeed = createHash("sha256")
    .update(baseSeed + "|entropy|" + Date.now().toString(36))
    .digest("hex");
  return applyStructureEntropy(dna, entropySeed, context);
}
