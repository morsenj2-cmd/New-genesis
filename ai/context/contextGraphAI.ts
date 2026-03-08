import type { ReasonedContext } from "./contextReasoner";
import type { UICapabilityRequirements, ComponentRequirement, DataStructure } from "./domainReasoner";

export interface ContextNode {
  id: string;
  type: "actor" | "action" | "data_object" | "capability" | "interface_element";
  label: string;
  properties: Record<string, string>;
}

export interface ContextEdge {
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

export interface ContextGraph {
  nodes: ContextNode[];
  edges: ContextEdge[];
  metadata: {
    domain: string;
    systemType: string;
    nodeCount: number;
    edgeCount: number;
    primaryActors: string[];
    primaryActions: string[];
    timestamp: number;
  };
}

function createNodeId(type: string, label: string): string {
  return `${type}:${label.toLowerCase().replace(/\s+/g, "_")}`;
}

function buildActorNodes(context: ReasonedContext): ContextNode[] {
  const actors: ContextNode[] = [];
  const actorEntities = context.entities.filter(e =>
    ["user", "admin", "customer", "client", "patient", "student", "teacher",
     "employee", "manager", "agent", "driver", "provider", "vendor",
     "developer", "operator", "viewer", "editor", "owner"].includes(e.toLowerCase())
  );

  if (actorEntities.length === 0) {
    actors.push({
      id: createNodeId("actor", "user"),
      type: "actor",
      label: "User",
      properties: { role: "primary" },
    });
    if (context.domainTraits.isWorkflowBased) {
      actors.push({
        id: createNodeId("actor", "admin"),
        type: "actor",
        label: "Admin",
        properties: { role: "administrator" },
      });
    }
  } else {
    for (const entity of actorEntities) {
      actors.push({
        id: createNodeId("actor", entity),
        type: "actor",
        label: entity.charAt(0).toUpperCase() + entity.slice(1),
        properties: { role: entity },
      });
    }
  }

  return actors;
}

function buildActionNodes(context: ReasonedContext): ContextNode[] {
  return context.userActions.map(action => ({
    id: createNodeId("action", action),
    type: "action" as const,
    label: action,
    properties: {
      category: context.domainTraits.isTransactional ? "transactional"
        : context.domainTraits.isDataDriven ? "analytical"
        : context.domainTraits.isCommunicationFocused ? "communication"
        : "operational",
    },
  }));
}

function buildDataObjectNodes(context: ReasonedContext, capabilities: UICapabilityRequirements): ContextNode[] {
  const dataNodes: ContextNode[] = [];
  const seen = new Set<string>();

  for (const ds of capabilities.dataStructures) {
    if (seen.has(ds.name)) continue;
    seen.add(ds.name);
    dataNodes.push({
      id: createNodeId("data_object", ds.name),
      type: "data_object",
      label: ds.name,
      properties: {
        fields: ds.fields.join(", "),
        displayAs: ds.displayAs,
      },
    });
  }

  for (const entity of context.entities) {
    const entityLower = entity.toLowerCase();
    if (!seen.has(entityLower) && !["user", "admin", "customer", "client"].includes(entityLower)) {
      seen.add(entityLower);
      dataNodes.push({
        id: createNodeId("data_object", entityLower),
        type: "data_object",
        label: entity,
        properties: { fields: "id, name, status", displayAs: "card" },
      });
    }
  }

  return dataNodes;
}

function buildCapabilityNodes(capabilities: UICapabilityRequirements): ContextNode[] {
  const nodes: ContextNode[] = [];
  const all = [...capabilities.primaryComponents, ...capabilities.supportingComponents];

  for (const comp of all) {
    nodes.push({
      id: createNodeId("capability", comp.type),
      type: "capability",
      label: comp.type.replace(/_/g, " "),
      properties: {
        purpose: comp.purpose,
        priority: comp.priority,
        interactivity: comp.interactivity,
      },
    });
  }

  return nodes;
}

function buildInterfaceNodes(capabilities: UICapabilityRequirements): ContextNode[] {
  return capabilities.layoutSuggestion.sections.map(section => ({
    id: createNodeId("interface_element", section),
    type: "interface_element" as const,
    label: section.replace(/_/g, " "),
    properties: {
      pageType: capabilities.layoutSuggestion.pageType,
      navigation: capabilities.layoutSuggestion.navigation,
    },
  }));
}

function buildEdges(
  actors: ContextNode[],
  actions: ContextNode[],
  dataObjects: ContextNode[],
  capabilities: ContextNode[],
  interfaceElements: ContextNode[],
): ContextEdge[] {
  const edges: ContextEdge[] = [];

  for (const actor of actors) {
    for (const action of actions) {
      edges.push({
        source: actor.id,
        target: action.id,
        relationship: "performs",
        weight: 0.8,
      });
    }
  }

  for (const action of actions) {
    for (const dataObj of dataObjects.slice(0, 5)) {
      edges.push({
        source: action.id,
        target: dataObj.id,
        relationship: "operates_on",
        weight: 0.7,
      });
    }
  }

  for (const capability of capabilities) {
    const relatedAction = actions.find(a =>
      capability.label.includes(a.label) || a.label.includes(capability.label.split(" ")[0])
    );
    if (relatedAction) {
      edges.push({
        source: relatedAction.id,
        target: capability.id,
        relationship: "requires",
        weight: 0.9,
      });
    }

    const relatedInterface = interfaceElements.find(ie =>
      capability.properties.purpose?.toLowerCase().includes(ie.label) ||
      ie.label.includes(capability.label.split(" ")[0])
    );
    if (relatedInterface) {
      edges.push({
        source: capability.id,
        target: relatedInterface.id,
        relationship: "renders_in",
        weight: 0.85,
      });
    }
  }

  for (const dataObj of dataObjects) {
    const displayAs = dataObj.properties.displayAs;
    const matchingInterface = interfaceElements.find(ie =>
      ie.label.includes("content") || ie.label.includes("main")
    );
    if (matchingInterface) {
      edges.push({
        source: dataObj.id,
        target: matchingInterface.id,
        relationship: "displayed_in",
        weight: 0.75,
      });
    }
  }

  return edges;
}

export function buildContextGraph(
  context: ReasonedContext,
  capabilities: UICapabilityRequirements,
): ContextGraph {
  const actors = buildActorNodes(context);
  const actions = buildActionNodes(context);
  const dataObjects = buildDataObjectNodes(context, capabilities);
  const capabilityNodes = buildCapabilityNodes(capabilities);
  const interfaceElements = buildInterfaceNodes(capabilities);

  const nodes = [...actors, ...actions, ...dataObjects, ...capabilityNodes, ...interfaceElements];
  const edges = buildEdges(actors, actions, dataObjects, capabilityNodes, interfaceElements);

  return {
    nodes,
    edges,
    metadata: {
      domain: context.domain,
      systemType: context.systemType,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      primaryActors: actors.map(a => a.label),
      primaryActions: actions.map(a => a.label),
      timestamp: Date.now(),
    },
  };
}

export function getGraphSummary(graph: ContextGraph): string {
  const actors = graph.nodes.filter(n => n.type === "actor").map(n => n.label);
  const actions = graph.nodes.filter(n => n.type === "action").map(n => n.label);
  const dataObjects = graph.nodes.filter(n => n.type === "data_object").map(n => n.label);
  const capabilities = graph.nodes.filter(n => n.type === "capability").map(n => n.label);

  return [
    `Domain: ${graph.metadata.domain}`,
    `System: ${graph.metadata.systemType}`,
    `Actors: ${actors.join(", ") || "user"}`,
    `Actions: ${actions.slice(0, 5).join(", ")}`,
    `Data: ${dataObjects.slice(0, 5).join(", ")}`,
    `Components: ${capabilities.slice(0, 5).join(", ")}`,
  ].join(" | ");
}

export function findRelatedNodes(graph: ContextGraph, nodeId: string): ContextNode[] {
  const relatedIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.source === nodeId) relatedIds.add(edge.target);
    if (edge.target === nodeId) relatedIds.add(edge.source);
  }
  return graph.nodes.filter(n => relatedIds.has(n.id));
}
