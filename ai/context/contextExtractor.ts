import { reasonContext, type ReasonedContext } from "./contextReasoner";
import type { InternetContext } from "../retrieval/internetContext";

export interface ExtractedContext {
  domain: string;
  industry: string;
  systemType: string;
  entities: string[];
  userActions: string[];
  workflows: WorkflowDescriptor[];
  interfaceRequirements: string[];
  actors: string[];
  operations: string[];
  dataObjects: string[];
  userGoals: string[];
  confidence: number;
  sourceBreakdown: {
    fromPrompt: number;
    fromInternet: number;
    fromReasoning: number;
  };
}

export interface WorkflowDescriptor {
  name: string;
  steps: string[];
  actors: string[];
  dataObjects: string[];
}

const ACTOR_PATTERNS = [
  "user", "admin", "manager", "customer", "client", "patient", "doctor",
  "student", "teacher", "employee", "supervisor", "operator", "viewer",
  "editor", "moderator", "owner", "buyer", "seller", "agent", "analyst",
  "developer", "designer", "coordinator", "administrator", "member",
];

const OPERATION_INDICATORS = new Set([
  "create", "read", "update", "delete", "search", "filter", "sort",
  "approve", "reject", "assign", "schedule", "book", "cancel", "refund",
  "upload", "download", "export", "import", "share", "publish",
  "submit", "review", "verify", "validate", "process", "generate",
  "calculate", "convert", "notify", "alert", "monitor", "track",
  "archive", "restore", "merge", "split", "transfer", "escalate",
]);

const DATA_OBJECT_SUFFIXES = ["ment", "tion", "sion", "ance", "ence", "age", "ure", "dom", "ship", "ity"];

function extractActors(promptLower: string, entities: string[], internetEntities: string[]): string[] {
  const allCandidates = [...entities, ...internetEntities];
  const found = new Set<string>();

  for (const actor of ACTOR_PATTERNS) {
    if (promptLower.includes(actor) || allCandidates.some(e => e.toLowerCase().includes(actor))) {
      found.add(actor);
    }
  }

  if (found.size === 0) found.add("user");
  return [...found];
}

function extractOperations(actions: string[], internetTasks: string[]): string[] {
  const ops = new Set<string>();
  for (const action of [...actions, ...internetTasks]) {
    const lower = action.toLowerCase();
    if (OPERATION_INDICATORS.has(lower)) ops.add(lower);
    if (lower.endsWith("ing") && lower.length > 4) {
      const base = lower.slice(0, -3);
      if (OPERATION_INDICATORS.has(base)) ops.add(base);
    }
  }
  return [...ops];
}

function extractDataObjects(entities: string[], internetEntities: string[]): string[] {
  const objects = new Set<string>();
  const actorSet = new Set(ACTOR_PATTERNS);

  for (const entity of [...entities, ...internetEntities]) {
    const lower = entity.toLowerCase();
    if (actorSet.has(lower)) continue;

    if (DATA_OBJECT_SUFFIXES.some(s => lower.endsWith(s)) || lower.includes(" ") || lower.length > 4) {
      objects.add(lower);
    }
  }
  return [...objects].slice(0, 20);
}

function inferUserGoals(actions: string[], entities: string[], domain: string): string[] {
  const goals: string[] = [];

  const actionEntityPairs: Array<[string, string]> = [];
  for (const action of actions.slice(0, 5)) {
    for (const entity of entities.slice(0, 3)) {
      actionEntityPairs.push([action, entity]);
    }
  }

  for (const [action, entity] of actionEntityPairs.slice(0, 8)) {
    goals.push(`${action} ${entity}`);
  }

  const domainGoals: Record<string, string[]> = {
    healthcare: ["schedule appointments", "manage patient records", "track treatments"],
    finance: ["process transactions", "manage portfolios", "generate reports"],
    education: ["manage courses", "track student progress", "submit assignments"],
    logistics: ["track shipments", "manage inventory", "optimize routes"],
    ecommerce: ["browse products", "manage orders", "process payments"],
    food_service: ["manage menu", "handle orders", "coordinate delivery"],
    real_estate: ["list properties", "manage tenants", "schedule viewings"],
  };

  const domainSpecific = domainGoals[domain] ?? [];
  goals.push(...domainSpecific);

  return [...new Set(goals)].slice(0, 12);
}

function deriveWorkflows(
  actors: string[],
  operations: string[],
  dataObjects: string[],
  domain: string,
): WorkflowDescriptor[] {
  const workflows: WorkflowDescriptor[] = [];

  if (operations.length > 0 && dataObjects.length > 0) {
    const crudOps = operations.filter(o => ["create", "read", "update", "delete"].includes(o));
    if (crudOps.length > 0) {
      workflows.push({
        name: `${dataObjects[0]} management`,
        steps: crudOps.map(op => `${op} ${dataObjects[0]}`),
        actors: actors.slice(0, 2),
        dataObjects: dataObjects.slice(0, 3),
      });
    }

    const processOps = operations.filter(o => ["submit", "review", "approve", "process"].includes(o));
    if (processOps.length >= 2) {
      workflows.push({
        name: "approval workflow",
        steps: processOps.map(op => `${op} request`),
        actors: actors.slice(0, 3),
        dataObjects: ["request", ...dataObjects.slice(0, 2)],
      });
    }

    if (operations.includes("search") || operations.includes("filter")) {
      workflows.push({
        name: "discovery flow",
        steps: ["search", "filter results", "view details", "select item"],
        actors: [actors[0] || "user"],
        dataObjects: dataObjects.slice(0, 3),
      });
    }
  }

  return workflows.slice(0, 5);
}

export function extractContext(prompt: string, internetContext: InternetContext): ExtractedContext {
  const reasonedCtx = reasonContext(prompt);

  const mergedEntities = [...new Set([
    ...reasonedCtx.entities,
    ...internetContext.entities,
  ])];

  const mergedActions = [...new Set([
    ...reasonedCtx.userActions,
    ...internetContext.userTasks,
  ])];

  const mergedRequirements = [...new Set([
    ...reasonedCtx.interfaceRequirements,
    ...internetContext.interfacePatterns,
  ])];

  const promptLower = prompt.toLowerCase();
  const actors = extractActors(promptLower, mergedEntities, internetContext.entities);
  const operations = extractOperations(mergedActions, internetContext.userTasks);
  const dataObjects = extractDataObjects(mergedEntities, internetContext.entities);
  const userGoals = inferUserGoals(mergedActions, mergedEntities, internetContext.domain || reasonedCtx.domain);

  const domain = internetContext.domain !== "general"
    ? internetContext.domain
    : reasonedCtx.domain;

  const industry = internetContext.industry || domain;

  const workflows = deriveWorkflows(actors, operations, dataObjects, domain);

  const promptWeight = reasonedCtx.confidence;
  const internetWeight = internetContext.confidence;
  const total = promptWeight + internetWeight;
  const normalizedPrompt = total > 0 ? promptWeight / total : 0.5;
  const normalizedInternet = total > 0 ? internetWeight / total : 0.5;

  const confidence = Math.min(0.95, (reasonedCtx.confidence + internetContext.confidence) / 1.5);

  return {
    domain,
    industry,
    systemType: reasonedCtx.systemType,
    entities: mergedEntities.slice(0, 20),
    userActions: mergedActions.slice(0, 15),
    workflows,
    interfaceRequirements: mergedRequirements.slice(0, 20),
    actors,
    operations,
    dataObjects,
    userGoals,
    confidence,
    sourceBreakdown: {
      fromPrompt: Math.round(normalizedPrompt * 100),
      fromInternet: Math.round(normalizedInternet * 100),
      fromReasoning: Math.round(normalizedPrompt * 50),
    },
  };
}

export function extractedToReasonedContext(extracted: ExtractedContext): ReasonedContext {
  const reasoned = reasonContext("");

  return {
    ...reasoned,
    domain: extracted.domain,
    systemType: extracted.systemType,
    userActions: extracted.userActions,
    entities: extracted.entities,
    operationalConcepts: [
      ...extracted.workflows.map(w => w.name),
      ...extracted.userGoals.slice(0, 5),
    ],
    interfaceRequirements: extracted.interfaceRequirements,
    confidence: extracted.confidence,
  };
}
