import type { ReasonedContext } from "./contextReasoner";
import type { UICapabilityRequirements, ComponentRequirement } from "./domainReasoner";
import type { ContextGraph } from "./contextGraphAI";

export interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  category: "missing_component" | "orphan_entity" | "action_mismatch" | "domain_conflict" | "coverage_gap";
  message: string;
  affectedElement?: string;
}

export function validateContextInterpretation(
  context: ReasonedContext,
  capabilities: UICapabilityRequirements,
  graph: ContextGraph,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const suggestions: string[] = [];

  validateActionCoverage(context, capabilities, issues, suggestions);
  validateEntityCoverage(context, capabilities, graph, issues, suggestions);
  validateDomainConsistency(context, capabilities, issues, suggestions);
  validateGraphConnectivity(graph, issues, suggestions);
  validateMinimumCapabilities(capabilities, issues, suggestions);

  const errorCount = issues.filter(i => i.severity === "error").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;
  const score = Math.max(0, 1.0 - errorCount * 0.2 - warningCount * 0.05);

  return {
    isValid: errorCount === 0,
    score,
    issues,
    suggestions,
  };
}

function validateActionCoverage(
  context: ReasonedContext,
  capabilities: UICapabilityRequirements,
  issues: ValidationIssue[],
  suggestions: string[],
): void {
  const componentActions = new Set<string>();
  for (const comp of [...capabilities.primaryComponents, ...capabilities.supportingComponents]) {
    if (comp.dataBinding) componentActions.add(comp.dataBinding);
    const actionWords = comp.type.split("_");
    for (const w of actionWords) componentActions.add(w);
  }

  for (const action of context.userActions) {
    const hasComponent = componentActions.has(action) ||
      [...componentActions].some(ca =>
        ca.includes(action) || action.includes(ca)
      );

    if (!hasComponent) {
      issues.push({
        severity: "warning",
        category: "action_mismatch",
        message: `Action "${action}" has no corresponding UI component`,
        affectedElement: action,
      });
      suggestions.push(`Consider adding a component for the "${action}" action`);
    }
  }
}

function validateEntityCoverage(
  context: ReasonedContext,
  capabilities: UICapabilityRequirements,
  graph: ContextGraph,
  issues: ValidationIssue[],
  suggestions: string[],
): void {
  const coveredEntities = new Set<string>();
  for (const ds of capabilities.dataStructures) {
    coveredEntities.add(ds.name.toLowerCase());
  }
  for (const node of graph.nodes) {
    if (node.type === "data_object") coveredEntities.add(node.label.toLowerCase());
  }

  const actorEntities = new Set(["user", "admin", "customer", "client", "manager", "employee"]);

  for (const entity of context.entities) {
    const entityLower = entity.toLowerCase();
    if (actorEntities.has(entityLower)) continue;

    const isCovered = coveredEntities.has(entityLower) ||
      [...coveredEntities].some(ce =>
        ce.includes(entityLower) || entityLower.includes(ce)
      );

    if (!isCovered) {
      issues.push({
        severity: "info",
        category: "orphan_entity",
        message: `Entity "${entity}" is not represented in any data structure`,
        affectedElement: entity,
      });
    }
  }
}

function validateDomainConsistency(
  context: ReasonedContext,
  capabilities: UICapabilityRequirements,
  issues: ValidationIssue[],
  suggestions: string[],
): void {
  const layout = capabilities.layoutSuggestion;

  if (context.domainTraits.isDataDriven && layout.pageType === "landing") {
    issues.push({
      severity: "warning",
      category: "domain_conflict",
      message: "Data-driven domain detected but layout is landing page",
    });
    suggestions.push("Consider using a dashboard layout for data-driven domains");
  }

  if (context.domainTraits.isTransactional &&
      !capabilities.primaryComponents.some(c =>
        c.type.includes("payment") || c.type.includes("order") || c.type.includes("cart")
      )) {
    issues.push({
      severity: "warning",
      category: "missing_component",
      message: "Transactional domain lacks payment/order components",
    });
  }

  if (context.domainTraits.isCommunicationFocused &&
      !capabilities.primaryComponents.some(c =>
        c.type.includes("message") || c.type.includes("inbox") || c.type.includes("chat")
      )) {
    issues.push({
      severity: "warning",
      category: "missing_component",
      message: "Communication domain lacks messaging components",
    });
  }
}

function validateGraphConnectivity(
  graph: ContextGraph,
  issues: ValidationIssue[],
  suggestions: string[],
): void {
  const connectedNodes = new Set<string>();
  for (const edge of graph.edges) {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  }

  const orphanNodes = graph.nodes.filter(n => !connectedNodes.has(n.id));
  if (orphanNodes.length > graph.nodes.length * 0.3) {
    issues.push({
      severity: "warning",
      category: "coverage_gap",
      message: `${orphanNodes.length} of ${graph.nodes.length} graph nodes are disconnected`,
    });
    suggestions.push("Consider connecting orphan nodes to improve context coverage");
  }
}

function validateMinimumCapabilities(
  capabilities: UICapabilityRequirements,
  issues: ValidationIssue[],
  suggestions: string[],
): void {
  if (capabilities.primaryComponents.length === 0) {
    issues.push({
      severity: "error",
      category: "coverage_gap",
      message: "No primary UI components identified",
    });
    suggestions.push("Add at least one essential component for the identified user actions");
  }

  if (capabilities.dataStructures.length === 0) {
    issues.push({
      severity: "info",
      category: "coverage_gap",
      message: "No data structures identified",
    });
  }

  if (capabilities.layoutSuggestion.sections.length < 2) {
    issues.push({
      severity: "warning",
      category: "coverage_gap",
      message: "Layout has fewer than 2 sections",
    });
  }
}

export function shouldReinterpret(result: ValidationResult): boolean {
  return result.issues.filter(i => i.severity === "error").length > 0 ||
    result.score < 0.5;
}
