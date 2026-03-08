import type { StructuredIntent } from "../model/promptSchema";
import type { UnifiedPatchSet } from "../patch/patchEngine";
import type { ProjectContext } from "../model/promptSchema";

const SENSITIVE_PATTERNS: RegExp[] = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  /(?:password|passwd|pwd)\s*[:=]\s*\S+/gi,
  /(?:api[_-]?key|apikey|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*\S+/gi,
  /(?:sk|pk)[-_](?:test|live|prod)[-_][a-zA-Z0-9]{20,}/g,
  /(?:bearer|token)\s+[a-zA-Z0-9._\-]{20,}/gi,
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
  /(?:ssh-rsa|ssh-ed25519)\s+[A-Za-z0-9+/=]{40,}/g,
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
];

export function sanitizePrompt(prompt: string): string {
  let sanitized = prompt;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }
  return sanitized;
}

export interface PromptLogEntry {
  userId: string;
  projectId?: string;
  promptText: string;
  sanitizedPrompt: string;
  intentType: string;
  confidence: number;
  intentJson: string;
  patchesJson?: string;
  projectContextJson?: string;
  feedbackSignal?: string;
  correctedIntentJson?: string;
  patternId?: string;
  usedForTraining?: boolean;
}

export function buildLogEntry(
  userId: string,
  prompt: string,
  intent: StructuredIntent,
  patchSet?: UnifiedPatchSet,
  projectId?: string,
  projectContext?: ProjectContext,
): PromptLogEntry {
  return {
    userId,
    projectId: projectId ?? undefined,
    promptText: prompt,
    sanitizedPrompt: sanitizePrompt(prompt),
    intentType: intent.intentType,
    confidence: intent.confidence,
    intentJson: JSON.stringify({
      intentType: intent.intentType,
      confidence: intent.confidence,
      pageType: intent.pageType,
      industry: intent.industry,
      actions: intent.actions,
      targets: intent.targets,
      layoutChanges: intent.layoutChanges,
      styleChanges: intent.styleChanges,
      contentChanges: intent.contentChanges,
      contextOverrides: intent.contextOverrides,
    }),
    patchesJson: patchSet ? JSON.stringify({
      genomePatchCount: patchSet.genomePatch.length,
      settingsPatchKeys: Object.keys(patchSet.settingsPatch),
      contentPatchKeys: Object.keys(patchSet.contentPatch),
      layoutPatchCount: patchSet.layoutPatch.length,
    }) : undefined,
    projectContextJson: projectContext ? JSON.stringify(projectContext) : undefined,
    feedbackSignal: "none",
    usedForTraining: false,
  };
}

export type FeedbackSignal = "none" | "correction" | "re_prompt" | "undo" | "manual_edit" | "positive";

export function detectFeedbackSignal(
  currentPrompt: string,
  previousPrompt?: string,
  wasManuallyEdited?: boolean,
  wasUndone?: boolean,
): FeedbackSignal {
  if (wasUndone) return "undo";
  if (wasManuallyEdited) return "manual_edit";

  if (previousPrompt) {
    const correctionSignals = ["actually", "no,", "wrong", "not that", "fix", "correct", "undo"];
    const lower = currentPrompt.toLowerCase();
    if (correctionSignals.some(s => lower.startsWith(s) || lower.includes(` ${s} `))) {
      return "correction";
    }

    const prevTokens = new Set(previousPrompt.toLowerCase().split(/\s+/));
    const currTokens = currentPrompt.toLowerCase().split(/\s+/);
    const overlap = currTokens.filter(t => prevTokens.has(t)).length;
    const overlapRatio = overlap / Math.max(currTokens.length, 1);
    if (overlapRatio > 0.5) return "re_prompt";
  }

  return "none";
}
