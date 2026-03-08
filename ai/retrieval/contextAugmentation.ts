import { reasonContext, type ReasonedContext } from "../context/contextReasoner";
import { retrieveDomainKnowledge, mergeKnowledge, type DomainKnowledge } from "./webKnowledge";
import { retrieveInternetContext, type InternetContext } from "./internetContext";
import { enrichContextFromKnowledge } from "../learning/promptKnowledge";
import { reasonDomain, type UICapabilityRequirements } from "../context/domainReasoner";
import { buildContextGraph, type ContextGraph } from "../context/contextGraphAI";
import { extractContext, extractedToReasonedContext, type ExtractedContext } from "../context/contextExtractor";
import { lookupContext, enrichFromStoredContext, lookupContextFromMemory } from "../knowledge/contextDatabase";
import { interpretPrompt, interpretationToReasonedContextPatch, type PromptInterpretation } from "../context/promptInterpreter";
import { retrieveContextForInterpretation, mergeRetrievedIntoContext } from "./contextRetrieval";

export interface AugmentedInterpretation {
  context: ReasonedContext;
  knowledge: DomainKnowledge;
  capabilities: UICapabilityRequirements;
  graph: ContextGraph;
  augmentationSources: string[];
  internetContext?: InternetContext;
  extractedContext?: ExtractedContext;
  promptInterpretation?: PromptInterpretation;
}

export async function augmentPrompt(prompt: string): Promise<AugmentedInterpretation> {
  const sources: string[] = ["semantic_interpretation"];

  const interpretation = interpretPrompt(prompt);
  const interpPatch = interpretationToReasonedContextPatch(interpretation);

  let context = reasonContext(prompt);

  if (interpPatch.domainHint && interpPatch.domainConfidence > context.confidence) {
    context = {
      ...context,
      domain: interpPatch.domainHint,
      systemType: interpPatch.systemType || context.systemType,
    };
  }

  if (interpPatch.entities.length > 0) {
    context = {
      ...context,
      entities: [...new Set([...interpPatch.entities, ...context.entities])].slice(0, 20),
    };
  }
  if (interpPatch.userActions.length > 0) {
    context = {
      ...context,
      userActions: [...new Set([...interpPatch.userActions, ...context.userActions])].slice(0, 15),
    };
  }
  if (interpPatch.interfaceRequirements.length > 0) {
    context = {
      ...context,
      interfaceRequirements: [...new Set([...interpPatch.interfaceRequirements, ...context.interfaceRequirements])].slice(0, 20),
    };
  }

  const enriched = enrichContextFromKnowledge(context, prompt);
  if (enriched !== context) {
    context = enriched;
    sources.push("learned_knowledge");
  }

  const retrieved = await retrieveContextForInterpretation(prompt, interpretation, context);
  context = mergeRetrievedIntoContext(context, retrieved, interpretation);
  sources.push(...retrieved.retrievalSources);

  const internetCtx = retrieved.internetContext;
  const extractedCtx = retrieved.extractedContext;

  const promptHints = [
    ...context.entities.slice(0, 5),
    ...context.userActions.slice(0, 5),
  ];

  let knowledge: DomainKnowledge;
  try {
    knowledge = await retrieveDomainKnowledge(context.domain, promptHints);
    if (knowledge.source === "web") sources.push("web_retrieval");
    else if (knowledge.source === "cache") sources.push("cached_knowledge");
    else sources.push("builtin_knowledge");
  } catch {
    knowledge = {
      domain: context.domain,
      concepts: context.operationalConcepts.slice(0, 6),
      commonActions: context.userActions.slice(0, 5),
      typicalEntities: context.entities.slice(0, 5),
      interfacePatterns: context.interfaceRequirements.slice(0, 4),
      source: "fallback",
      confidence: 0.3,
    };
    sources.push("fallback");
  }

  if (knowledge.confidence > 0.5) {
    const knowledgeActions = knowledge.commonActions.filter(
      a => !context.userActions.includes(a)
    ).slice(0, 3);
    const knowledgeEntities = knowledge.typicalEntities.filter(
      e => !context.entities.includes(e)
    ).slice(0, 3);

    if (knowledgeActions.length > 0 || knowledgeEntities.length > 0) {
      context = {
        ...context,
        userActions: [...context.userActions, ...knowledgeActions],
        entities: [...context.entities, ...knowledgeEntities],
        confidence: Math.min(context.confidence + 0.05, 0.95),
      };
    }
  }

  const capabilities = reasonDomain(context, knowledge);
  const graph = buildContextGraph(context, capabilities);

  return {
    context,
    knowledge,
    capabilities,
    graph,
    augmentationSources: sources,
    internetContext: internetCtx,
    extractedContext: extractedCtx,
    promptInterpretation: interpretation,
  };
}

export function augmentPromptSync(prompt: string): AugmentedInterpretation {
  const sources: string[] = ["semantic_interpretation"];

  const interpretation = interpretPrompt(prompt);
  const interpPatch = interpretationToReasonedContextPatch(interpretation);

  let context = reasonContext(prompt);

  if (interpPatch.domainHint && interpPatch.domainConfidence > context.confidence) {
    context = {
      ...context,
      domain: interpPatch.domainHint,
      systemType: interpPatch.systemType || context.systemType,
    };
  }
  if (interpPatch.entities.length > 0) {
    context = {
      ...context,
      entities: [...new Set([...interpPatch.entities, ...context.entities])].slice(0, 20),
    };
  }
  if (interpPatch.userActions.length > 0) {
    context = {
      ...context,
      userActions: [...new Set([...interpPatch.userActions, ...context.userActions])].slice(0, 15),
    };
  }
  if (interpPatch.interfaceRequirements.length > 0) {
    context = {
      ...context,
      interfaceRequirements: [...new Set([...interpPatch.interfaceRequirements, ...context.interfaceRequirements])].slice(0, 20),
    };
  }

  const enriched = enrichContextFromKnowledge(context, prompt);
  if (enriched !== context) {
    context = enriched;
    sources.push("learned_knowledge");
  }

  try {
    const cachedCtx = lookupContextFromMemory(prompt);
    if (cachedCtx) {
      context = enrichFromStoredContext(context, cachedCtx);
      sources.push("context_database");
    }
  } catch {}

  const knowledge: DomainKnowledge = {
    domain: context.domain,
    concepts: context.operationalConcepts.slice(0, 6),
    commonActions: context.userActions.slice(0, 5),
    typicalEntities: context.entities.slice(0, 5),
    interfacePatterns: context.interfaceRequirements.slice(0, 4),
    source: "fallback",
    confidence: 0.3,
  };

  const capabilities = reasonDomain(context, knowledge);
  const graph = buildContextGraph(context, capabilities);

  return {
    context,
    knowledge,
    capabilities,
    graph,
    augmentationSources: sources,
    promptInterpretation: interpretation,
  };
}
