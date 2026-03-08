import { createHash } from "crypto";
import type { LayoutGraph } from "../../shared/layoutEngine";
import type { LayoutEntropy } from "./layoutEntropy";
import { perturbEntropy } from "./layoutEntropy";
import { createFingerprint, checkSimilarity, registerLayout } from "./layoutRegistry";
import type { LayoutFingerprint } from "./layoutRegistry";
import { composeLayout } from "./layoutComposer";
import type { ComposerContext } from "./layoutComposer";
import { applyLayoutConstraints, simplifyIfNeeded } from "../../shared/layoutConstraints";

const MAX_RETRIES = 5;
const SIMILARITY_THRESHOLD = 0.75;

export function buildFingerprint(layout: LayoutGraph, entropy?: LayoutEntropy): LayoutFingerprint {
  const sectionTypes = layout.sections.map(s => s.type);
  const gridConfigurations = layout.sections.map(s =>
    `${s.type}:${s.columns ?? 0}:${s.orientation}`,
  );
  const componentArrangement = layout.sections.map(s =>
    `${s.componentType ?? "default"}:${s.alignment}:${s.imagePlacement}`,
  );

  if (entropy) {
    gridConfigurations.push(`nav:${entropy.navigationStructure}`);
    gridConfigurations.push(`density:${entropy.contentDensity}`);
    gridConfigurations.push(`spacing:${entropy.spacingScale.toFixed(0)}:${entropy.spacingRatio.toFixed(2)}`);
    componentArrangement.push(`grouping:${entropy.componentGrouping}`);
    componentArrangement.push(`entropy:${entropy.entropyHash}`);
  }

  return createFingerprint({
    sectionTypes,
    gridConfigurations,
    componentArrangement,
    sectionCount: layout.metadata.sectionCount,
    dominantAlignment: layout.metadata.dominantAlignment,
    hasMedia: layout.metadata.hasMedia,
    gridStyle: layout.metadata.gridStyle,
  });
}

export function ensureLayoutDiversity(
  layout: LayoutGraph,
  entropy: LayoutEntropy,
  context: ComposerContext,
  maxRetries: number = MAX_RETRIES,
): { layout: LayoutGraph; entropy: LayoutEntropy; attempts: number; fingerprint: LayoutFingerprint } {
  let currentLayout = layout;
  let currentEntropy = entropy;
  let attempts = 0;

  while (attempts < maxRetries) {
    const fingerprint = buildFingerprint(currentLayout, currentEntropy);
    const similarity = checkSimilarity(fingerprint, SIMILARITY_THRESHOLD);

    if (!similarity.isSimilar) {
      registerLayout(fingerprint);
      return { layout: currentLayout, entropy: currentEntropy, attempts, fingerprint };
    }

    attempts++;
    const perturbSeed = createHash("sha256")
      .update(currentEntropy.entropyHash + "|retry|" + attempts)
      .digest("hex");

    currentEntropy = perturbEntropy(currentEntropy, perturbSeed);
    let composed = composeLayout(currentEntropy, context);
    composed = applyLayoutConstraints(composed, context.pageType);
    composed = simplifyIfNeeded(composed, context.pageType);
    currentLayout = composed;
  }

  const finalFingerprint = buildFingerprint(currentLayout, currentEntropy);
  registerLayout(finalFingerprint);
  return { layout: currentLayout, entropy: currentEntropy, attempts, fingerprint: finalFingerprint };
}

export function evaluateLayoutDiversity(layout: LayoutGraph): {
  sectionVariety: number;
  gridVariety: number;
  componentVariety: number;
  overallScore: number;
} {
  const sections = layout.sections;

  const uniqueSectionTypes = new Set(sections.map(s => s.type)).size;
  const sectionVariety = uniqueSectionTypes / Math.max(1, sections.length);

  const gridSignatures = sections.map(s => `${s.columns ?? 0}:${s.orientation}`);
  const uniqueGrids = new Set(gridSignatures).size;
  const gridVariety = uniqueGrids / Math.max(1, sections.length);

  const componentSignatures = sections.map(s => s.componentType ?? "default");
  const uniqueComponents = new Set(componentSignatures).size;
  const componentVariety = uniqueComponents / Math.max(1, sections.length);

  const overallScore = (sectionVariety + gridVariety + componentVariety) / 3;

  return { sectionVariety, gridVariety, componentVariety, overallScore };
}
