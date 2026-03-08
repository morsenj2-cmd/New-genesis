import { infer } from "./model/inference";
import { intentToPatchSet, applyGenomePatch } from "./patch/patchEngine";
import { extractProjectContext } from "./context/projectContext";
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
}

export function routePrompt(input: RouterInput): RouterOutput {
  const context = input.project
    ? extractProjectContext(input.project)
    : undefined;

  const intent = infer(input.prompt, context);
  const patchSet = intentToPatchSet(intent);

  const shouldRegenerateLayout =
    intent.intentType === "layout_modification" ||
    intent.intentType === "context_correction" ||
    (intent.intentType === "compound" && intent.layoutChanges.length > 0) ||
    (intent.intentType === "regenerate");

  const shouldRegenerateStyle =
    intent.intentType === "style_change" ||
    intent.intentType === "regenerate" ||
    (intent.intentType === "compound" && intent.styleChanges.length > 0);

  const shouldCorrectContext =
    intent.intentType === "context_correction" ||
    intent.contextOverrides.length > 0;

  const brandRename = intent.contentChanges.find(c => c.field === "brandName")?.value;

  return {
    intent,
    patchSet,
    shouldRegenerateLayout,
    shouldRegenerateStyle,
    shouldCorrectContext,
    brandRename,
    description: patchSet.description,
  };
}

export function interpretDesignPrompt(prompt: string): StructuredIntent {
  return infer(prompt);
}

export function interpretWithProject(
  prompt: string,
  project: RouterInput["project"],
): RouterOutput {
  return routePrompt({ prompt, project });
}

export { applyGenomePatch } from "./patch/patchEngine";
export { infer as inferIntent } from "./model/inference";
