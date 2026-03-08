import { infer } from "./model/inference";
import { intentToPatchSet, applyGenomePatch } from "./patch/patchEngine";
import { extractProjectContext } from "./context/projectContext";
import { reasonContext, reasonContextWithHistory, type ReasonedContext } from "./context/contextReasoner";
import { reasonDomain, capabilitiesToSectionTypes, type UICapabilityRequirements } from "./context/domainReasoner";
import { buildContextGraph, getGraphSummary, type ContextGraph } from "./context/contextGraphAI";
import { validateContextInterpretation, shouldReinterpret } from "./context/contextValidator";
import { augmentPromptSync, augmentPrompt, type AugmentedInterpretation } from "./retrieval/contextAugmentation";
import { storeKnowledge } from "./learning/promptKnowledge";
import type { StructuredIntent } from "./model/promptSchema";
import type { UnifiedPatchSet } from "./patch/patchEngine";

export interface RouterInput {
  prompt: string;
  project?: {
    prompt: string;
    name?: string;
    productType?: string;
    font?: string;
    themeColor?: string;
    settingsJson?: string;
    layoutJson?: string;
    genomeJson?: string;
  };
}

export interface RouterOutput {
  intent: StructuredIntent;
  patchSet: UnifiedPatchSet;
  shouldRegenerateLayout: boolean;
  shouldRegenerateStyle: boolean;
  shouldCorrectContext: boolean;
  brandRename?: string;
  description: string;
  reasoning?: ReasoningOutput;
}

export interface ReasoningOutput {
  context: ReasonedContext;
  capabilities: UICapabilityRequirements;
  graphSummary: string;
  validationScore: number;
  suggestedSections: string[];
  augmentationSources: string[];
}

export function routePrompt(input: RouterInput): RouterOutput {
  const projectContext = input.project
    ? extractProjectContext(input.project)
    : undefined;

  const augmented = augmentPromptSync(input.prompt);
  const { context: reasonedContext, capabilities, graph, augmentationSources } = augmented;

  const validation = validateContextInterpretation(reasonedContext, capabilities, graph);

  let finalContext = reasonedContext;
  let finalCapabilities = capabilities;
  let finalGraph = graph;

  if (shouldReinterpret(validation)) {
    const retryContext = reasonContextWithHistory(input.prompt, reasonedContext);
    finalContext = retryContext;
    finalCapabilities = reasonDomain(retryContext);
    finalGraph = buildContextGraph(retryContext, finalCapabilities);
  }

  const intent = infer(input.prompt, projectContext, finalContext);
  const patchSet = intentToPatchSet(intent);

  if (finalContext.domainTraits.isDataDriven && intent.intentType === "design_generation") {
    if (!intent.contextOverrides.find(o => o.key === "pageType")) {
      intent.contextOverrides.push({ key: "pageType", value: "dashboard" });
    }
  }

  if (finalContext.domain && finalContext.confidence > 0.4) {
    if (!intent.industry && finalContext.domain !== "general") {
      intent.industry = finalContext.domain;
    }
  }

  const shouldRegenerateLayout =
    intent.intentType === "layout_modification" ||
    intent.intentType === "context_correction" ||
    (intent.intentType === "compound" && intent.layoutChanges.length > 0) ||
    (intent.intentType === "regenerate") ||
    (intent.intentType === "design_generation");

  const shouldRegenerateStyle =
    intent.intentType === "style_change" ||
    intent.intentType === "regenerate" ||
    (intent.intentType === "compound" && intent.styleChanges.length > 0);

  const shouldCorrectContext =
    intent.intentType === "context_correction" ||
    intent.contextOverrides.length > 0;

  const brandRename = intent.contentChanges.find(c => c.field === "brandName")?.value;

  const suggestedSections = capabilitiesToSectionTypes(finalCapabilities);
  const graphSummary = getGraphSummary(finalGraph);

  try {
    storeKnowledge({
      prompt: input.prompt,
      interpretedContext: finalContext,
      resultingComponents: suggestedSections,
      feedbackScore: validation.score,
      timestamp: Date.now(),
    });
  } catch {}

  return {
    intent,
    patchSet,
    shouldRegenerateLayout,
    shouldRegenerateStyle,
    shouldCorrectContext,
    brandRename,
    description: patchSet.description,
    reasoning: {
      context: finalContext,
      capabilities: finalCapabilities,
      graphSummary,
      validationScore: validation.score,
      suggestedSections,
      augmentationSources,
    },
  };
}

export async function routePromptAsync(input: RouterInput): Promise<RouterOutput> {
  const projectContext = input.project
    ? extractProjectContext(input.project)
    : undefined;

  const augmented = await augmentPrompt(input.prompt);
  const { context: reasonedContext, capabilities, graph, augmentationSources } = augmented;

  const validation = validateContextInterpretation(reasonedContext, capabilities, graph);

  let finalContext = reasonedContext;
  let finalCapabilities = capabilities;
  let finalGraph = graph;

  if (shouldReinterpret(validation)) {
    const retryContext = reasonContextWithHistory(input.prompt, reasonedContext);
    finalContext = retryContext;
    finalCapabilities = reasonDomain(retryContext);
    finalGraph = buildContextGraph(retryContext, finalCapabilities);
  }

  const intent = infer(input.prompt, projectContext, finalContext);
  const patchSet = intentToPatchSet(intent);

  if (finalContext.domainTraits.isDataDriven && intent.intentType === "design_generation") {
    if (!intent.contextOverrides.find(o => o.key === "pageType")) {
      intent.contextOverrides.push({ key: "pageType", value: "dashboard" });
    }
  }

  if (finalContext.domain && finalContext.confidence > 0.4) {
    if (!intent.industry && finalContext.domain !== "general") {
      intent.industry = finalContext.domain;
    }
  }

  const shouldRegenerateLayout =
    intent.intentType === "layout_modification" ||
    intent.intentType === "context_correction" ||
    (intent.intentType === "compound" && intent.layoutChanges.length > 0) ||
    (intent.intentType === "regenerate") ||
    (intent.intentType === "design_generation");

  const shouldRegenerateStyle =
    intent.intentType === "style_change" ||
    intent.intentType === "regenerate" ||
    (intent.intentType === "compound" && intent.styleChanges.length > 0);

  const shouldCorrectContext =
    intent.intentType === "context_correction" ||
    intent.contextOverrides.length > 0;

  const brandRename = intent.contentChanges.find(c => c.field === "brandName")?.value;
  const suggestedSections = capabilitiesToSectionTypes(finalCapabilities);
  const graphSummary = getGraphSummary(finalGraph);

  try {
    storeKnowledge({
      prompt: input.prompt,
      interpretedContext: finalContext,
      resultingComponents: suggestedSections,
      feedbackScore: validation.score,
      timestamp: Date.now(),
    });
  } catch {}

  return {
    intent,
    patchSet,
    shouldRegenerateLayout,
    shouldRegenerateStyle,
    shouldCorrectContext,
    brandRename,
    description: patchSet.description,
    reasoning: {
      context: finalContext,
      capabilities: finalCapabilities,
      graphSummary,
      validationScore: validation.score,
      suggestedSections,
      augmentationSources,
    },
  };
}

export function interpretDesignPrompt(prompt: string): StructuredIntent {
  const augmented = augmentPromptSync(prompt);
  return infer(prompt, undefined, augmented.context);
}

export function interpretWithProject(
  prompt: string,
  project: RouterInput["project"],
): RouterOutput {
  return routePrompt({ prompt, project });
}

export { applyGenomePatch } from "./patch/patchEngine";
export { infer as inferIntent } from "./model/inference";
