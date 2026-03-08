import { retrieveInternetContext, type InternetContext } from "./internetContext";
import { retrieveDomainKnowledge, type DomainKnowledge } from "./webKnowledge";
import { extractContext, type ExtractedContext } from "../context/contextExtractor";
import { lookupContext, enrichFromStoredContext, lookupContextFromMemory } from "../knowledge/contextDatabase";
import type { PromptInterpretation } from "../context/promptInterpreter";
import type { ReasonedContext } from "../context/contextReasoner";

export interface RetrievedContext {
  internetContext: InternetContext | undefined;
  extractedContext: ExtractedContext | undefined;
  domainKnowledge: DomainKnowledge;
  storedContext: ReasonedContext | null;
  knowledgeQueries: string[];
  retrievalSources: string[];
  enrichmentApplied: boolean;
}

function generateKnowledgeQueries(interpretation: PromptInterpretation, rawPrompt: string): string[] {
  const queries: string[] = [];

  const topDomain = interpretation.domainSignals[0];
  if (topDomain) {
    queries.push(`${topDomain.domain} software interface design patterns`);
    queries.push(`${topDomain.domain} user workflows and features`);
  }

  if (interpretation.interfaceType !== "general_purpose_interface") {
    const readable = interpretation.interfaceType.replace(/_/g, " ");
    queries.push(`${readable} best practices`);
  }

  for (const workflow of interpretation.userWorkflows.slice(0, 2)) {
    queries.push(`${workflow.primaryAction} ${interpretation.dataEntities[0] || "data"} interface`);
  }

  if (interpretation.dataEntities.length > 0) {
    queries.push(`${interpretation.dataEntities.slice(0, 3).join(" ")} management system`);
  }

  if (queries.length === 0) {
    const words = rawPrompt.split(/\s+/).filter(w => w.length > 3).slice(0, 4);
    queries.push(`${words.join(" ")} web application`);
  }

  return [...new Set(queries)].slice(0, 5);
}

export async function retrieveContextForInterpretation(
  rawPrompt: string,
  interpretation: PromptInterpretation,
  existingContext?: ReasonedContext,
): Promise<RetrievedContext> {
  const sources: string[] = [];
  const knowledgeQueries = generateKnowledgeQueries(interpretation, rawPrompt);

  let storedCtx: ReasonedContext | null = null;
  try {
    const memResult = lookupContextFromMemory(rawPrompt);
    if (memResult) {
      storedCtx = enrichFromStoredContext(
        existingContext || ({} as ReasonedContext),
        memResult,
      );
      sources.push("memory_cache");
    } else {
      const dbResult = await lookupContext(rawPrompt).catch(() => null);
      if (dbResult) {
        storedCtx = enrichFromStoredContext(
          existingContext || ({} as ReasonedContext),
          dbResult,
        );
        sources.push("context_database");
      }
    }
  } catch {}

  let internetCtx: InternetContext | undefined;
  try {
    const enrichedPrompt = knowledgeQueries.length > 0
      ? `${rawPrompt}. Context: ${knowledgeQueries.slice(0, 3).join("; ")}`
      : rawPrompt;
    internetCtx = await retrieveInternetContext(enrichedPrompt);
    if (internetCtx && internetCtx.confidence > 0.2) {
      sources.push("internet_retrieval");
    }
  } catch {
    internetCtx = undefined;
  }

  let extractedCtx: ExtractedContext | undefined;
  if (internetCtx) {
    try {
      extractedCtx = extractContext(rawPrompt, internetCtx);
      sources.push("context_extraction");
    } catch {
      extractedCtx = undefined;
    }
  }

  const topDomain = interpretation.domainSignals[0];
  const domainHints = [
    ...interpretation.dataEntities.slice(0, 5),
    ...interpretation.coreActions.slice(0, 5),
  ];

  let domainKnowledge: DomainKnowledge;
  try {
    domainKnowledge = await retrieveDomainKnowledge(
      topDomain?.domain || "general",
      domainHints,
    );
    if (domainKnowledge.source === "web") sources.push("web_knowledge");
    else if (domainKnowledge.source === "cache") sources.push("cached_knowledge");
    else sources.push("builtin_knowledge");
  } catch {
    domainKnowledge = {
      domain: topDomain?.domain || "general",
      entities: [],
      actions: [],
      concepts: [],
      source: "fallback",
    };
    sources.push("fallback_knowledge");
  }

  return {
    internetContext: internetCtx,
    extractedContext: extractedCtx,
    domainKnowledge,
    storedContext: storedCtx,
    knowledgeQueries,
    retrievalSources: sources,
    enrichmentApplied: sources.length > 1,
  };
}

export function mergeRetrievedIntoContext(
  baseContext: ReasonedContext,
  retrieved: RetrievedContext,
  interpretation: PromptInterpretation,
): ReasonedContext {
  let merged = { ...baseContext };

  if (retrieved.extractedContext) {
    merged = {
      ...merged,
      entities: [...new Set([...merged.entities, ...(retrieved.extractedContext.entities || [])])].slice(0, 20),
      userActions: [...new Set([...merged.userActions, ...(retrieved.extractedContext.actions || [])])].slice(0, 15),
      operationalConcepts: [...new Set([...merged.operationalConcepts, ...(retrieved.extractedContext.concepts || [])])].slice(0, 15),
    };
  }

  if (retrieved.domainKnowledge.entities.length > 0) {
    merged = {
      ...merged,
      entities: [...new Set([...merged.entities, ...retrieved.domainKnowledge.entities])].slice(0, 20),
    };
  }

  if (retrieved.domainKnowledge.actions.length > 0) {
    merged = {
      ...merged,
      userActions: [...new Set([...merged.userActions, ...retrieved.domainKnowledge.actions])].slice(0, 15),
    };
  }

  if (interpretation.structuralRequirements.length > 0) {
    const reqComponents = interpretation.structuralRequirements.map(r => r.component);
    merged = {
      ...merged,
      interfaceRequirements: [...new Set([...merged.interfaceRequirements, ...reqComponents])].slice(0, 20),
    };
  }

  const topDomain = interpretation.domainSignals[0];
  if (topDomain && topDomain.strength > 0.3 && merged.domain === "general") {
    merged = { ...merged, domain: topDomain.domain };
  }

  if (interpretation.semanticConfidence > merged.confidence) {
    merged = {
      ...merged,
      confidence: Math.min(0.95, (merged.confidence + interpretation.semanticConfidence) / 2 + 0.1),
    };
  }

  return merged;
}
