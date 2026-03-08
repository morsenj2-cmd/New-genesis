import { reasonContext, type ReasonedContext } from "../context/contextReasoner";
import { retrieveDomainKnowledge, mergeKnowledge, type DomainKnowledge } from "./webKnowledge";
import { enrichContextFromKnowledge } from "../learning/promptKnowledge";
import { reasonDomain, type UICapabilityRequirements } from "../context/domainReasoner";
import { buildContextGraph, type ContextGraph } from "../context/contextGraphAI";

export interface AugmentedInterpretation {
  context: ReasonedContext;
  knowledge: DomainKnowledge;
  capabilities: UICapabilityRequirements;
  graph: ContextGraph;
  augmentationSources: string[];
}

export async function augmentPrompt(prompt: string): Promise<AugmentedInterpretation> {
  const sources: string[] = ["prompt_reasoning"];

  let context = reasonContext(prompt);

  const enriched = enrichContextFromKnowledge(context, prompt);
  if (enriched !== context) {
    context = enriched;
    sources.push("learned_knowledge");
  }

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
  };
}

export function augmentPromptSync(prompt: string): AugmentedInterpretation {
  const sources: string[] = ["prompt_reasoning"];

  let context = reasonContext(prompt);
  const enriched = enrichContextFromKnowledge(context, prompt);
  if (enriched !== context) {
    context = enriched;
    sources.push("learned_knowledge");
  }

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
  };
}
