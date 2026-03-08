import { tokenize, type Token } from "../model/tokenizer";
import { embedToken, meanPool, cosineSimilarity, EMBEDDING_DIM } from "../model/model";

export interface PromptInterpretation {
  systemPurpose: string;
  interfaceType: InterfaceType;
  userWorkflows: WorkflowDescriptor[];
  dataEntities: string[];
  coreActions: string[];
  domainSignals: DomainSignal[];
  structuralRequirements: StructuralRequirement[];
  semanticConfidence: number;
  interpretationMethod: "semantic";
}

export type InterfaceType =
  | "data_management_interface"
  | "transactional_interface"
  | "content_consumption_interface"
  | "communication_interface"
  | "workflow_orchestration_interface"
  | "creative_tool_interface"
  | "discovery_exploration_interface"
  | "monitoring_analytics_interface"
  | "marketplace_interface"
  | "social_platform_interface"
  | "educational_interface"
  | "scheduling_interface"
  | "general_purpose_interface";

export interface WorkflowDescriptor {
  name: string;
  steps: string[];
  primaryAction: string;
  dataFlow: "input" | "output" | "bidirectional" | "passive";
}

export interface DomainSignal {
  domain: string;
  strength: number;
  evidence: string[];
}

export interface StructuralRequirement {
  component: string;
  priority: "essential" | "recommended" | "optional";
  reason: string;
}

interface SemanticFrame {
  subject: string[];
  predicate: string[];
  object: string[];
  modifiers: string[];
  context: string[];
}

const INTERFACE_PROTOTYPES: Array<{
  type: InterfaceType;
  seeds: string[];
  structuralHints: string[];
}> = [
  {
    type: "data_management_interface",
    seeds: ["data", "table", "record", "database", "list", "entry", "field", "schema", "column", "row", "query", "crud"],
    structuralHints: ["data_table", "filter_panel", "detail_view", "bulk_actions"],
  },
  {
    type: "transactional_interface",
    seeds: ["buy", "sell", "cart", "checkout", "payment", "order", "purchase", "transaction", "price", "billing"],
    structuralHints: ["product_grid", "cart_sidebar", "checkout_flow", "payment_form"],
  },
  {
    type: "content_consumption_interface",
    seeds: ["read", "article", "blog", "post", "content", "media", "gallery", "portfolio", "story", "feed"],
    structuralHints: ["content_feed", "article_layout", "media_gallery", "reading_view"],
  },
  {
    type: "communication_interface",
    seeds: ["chat", "message", "email", "inbox", "conversation", "notification", "send", "receive", "thread"],
    structuralHints: ["message_list", "conversation_panel", "compose_form", "contact_list"],
  },
  {
    type: "workflow_orchestration_interface",
    seeds: ["task", "project", "kanban", "sprint", "pipeline", "workflow", "assign", "status", "progress", "milestone"],
    structuralHints: ["kanban_board", "task_list", "timeline_view", "progress_tracker"],
  },
  {
    type: "creative_tool_interface",
    seeds: ["design", "draw", "canvas", "edit", "compose", "create", "template", "color", "layer", "brush"],
    structuralHints: ["canvas_workspace", "tool_palette", "layer_panel", "property_inspector"],
  },
  {
    type: "discovery_exploration_interface",
    seeds: ["search", "explore", "browse", "discover", "filter", "recommend", "curate", "map", "navigate"],
    structuralHints: ["search_bar", "filter_sidebar", "results_grid", "map_view"],
  },
  {
    type: "monitoring_analytics_interface",
    seeds: ["monitor", "analytics", "dashboard", "chart", "metric", "report", "insight", "trend", "kpi", "performance"],
    structuralHints: ["metric_cards", "chart_grid", "alert_panel", "trend_graphs"],
  },
  {
    type: "marketplace_interface",
    seeds: ["marketplace", "listing", "vendor", "seller", "buyer", "auction", "bid", "review", "rating"],
    structuralHints: ["listing_grid", "seller_profile", "review_section", "category_nav"],
  },
  {
    type: "social_platform_interface",
    seeds: ["profile", "follow", "share", "like", "comment", "community", "group", "network", "social", "connect"],
    structuralHints: ["profile_card", "activity_feed", "connection_list", "interaction_bar"],
  },
  {
    type: "educational_interface",
    seeds: ["course", "lesson", "quiz", "student", "teacher", "learn", "curriculum", "grade", "assignment", "module"],
    structuralHints: ["course_viewer", "progress_bar", "quiz_interface", "content_navigator"],
  },
  {
    type: "scheduling_interface",
    seeds: ["calendar", "schedule", "appointment", "booking", "event", "reservation", "availability", "slot", "time"],
    structuralHints: ["calendar_view", "booking_form", "availability_grid", "event_list"],
  },
];

let _prototypeVectors: Array<{ type: InterfaceType; vector: number[]; hints: string[] }> | null = null;

function getPrototypeVectors() {
  if (!_prototypeVectors) {
    _prototypeVectors = INTERFACE_PROTOTYPES.map(proto => {
      const embeddings = proto.seeds.map(s => embedToken(s));
      return {
        type: proto.type,
        vector: meanPool(embeddings),
        hints: proto.structuralHints,
      };
    });
  }
  return _prototypeVectors;
}

function buildSemanticFrame(tokens: Token[], rawPrompt: string): SemanticFrame {
  const frame: SemanticFrame = { subject: [], predicate: [], object: [], modifiers: [], context: [] };

  const actionVerbs = new Set([
    "manage", "create", "build", "track", "monitor", "view", "edit", "update",
    "delete", "add", "assign", "schedule", "book", "reserve", "order", "pay",
    "search", "browse", "publish", "share", "upload", "download", "analyze",
    "report", "configure", "deploy", "test", "generate", "automate", "integrate",
    "register", "login", "collaborate", "design", "compose", "draw", "teach",
    "learn", "grade", "diagnose", "treat", "prescribe", "ship", "deliver",
    "invest", "trade", "insure", "audit", "consult", "recruit", "train",
  ]);

  const modifierWords = new Set([
    "modern", "minimal", "clean", "elegant", "bold", "professional", "simple",
    "advanced", "interactive", "responsive", "fast", "secure", "scalable",
    "intuitive", "powerful", "lightweight", "robust", "flexible", "smart",
    "automated", "real-time", "collaborative", "enterprise", "startup",
  ]);

  const contextWords = new Set([
    "for", "with", "using", "in", "at", "by", "through", "via", "within",
    "across", "between", "among", "during", "before", "after", "about",
  ]);

  let phase: "seeking_subject" | "seeking_predicate" | "seeking_object" = "seeking_subject";
  let foundVerb = false;

  for (const token of tokens) {
    if (token.isStopword) {
      if (contextWords.has(token.normalized)) {
        frame.context.push(token.normalized);
        phase = "seeking_object";
      }
      continue;
    }

    const word = token.normalized;
    const stem = token.stem;

    if (modifierWords.has(word)) {
      frame.modifiers.push(word);
      continue;
    }

    const isAction = actionVerbs.has(word) || actionVerbs.has(stem) ||
      (word.endsWith("ing") && actionVerbs.has(word.slice(0, -3))) ||
      (word.endsWith("ing") && actionVerbs.has(word.slice(0, -4)));

    if (isAction && !foundVerb) {
      frame.predicate.push(word);
      foundVerb = true;
      phase = "seeking_object";
      continue;
    }

    if (isAction) {
      frame.predicate.push(word);
      continue;
    }

    if (phase === "seeking_subject" || (!foundVerb && phase === "seeking_predicate")) {
      frame.subject.push(word);
    } else {
      frame.object.push(word);
    }
  }

  if (frame.predicate.length === 0 && frame.subject.length > 0) {
    const firstSubject = frame.subject[0];
    if (actionVerbs.has(firstSubject)) {
      frame.predicate.push(frame.subject.shift()!);
    } else {
      frame.predicate.push("present");
    }
  }

  return frame;
}

function deriveSystemPurpose(frame: SemanticFrame, rawPrompt: string): string {
  const actions = frame.predicate.length > 0 ? frame.predicate.join(", ") : "present";
  const subjects = [...frame.subject, ...frame.object].filter(Boolean);
  const target = subjects.length > 0 ? subjects.join(" ") : "content";
  const mods = frame.modifiers.length > 0 ? ` (${frame.modifiers.join(", ")})` : "";

  return `System to ${actions} ${target}${mods}`;
}

function classifyInterface(tokens: Token[]): { type: InterfaceType; confidence: number; structuralHints: string[] } {
  const prototypes = getPrototypeVectors();

  const contentTokens = tokens.filter(t => !t.isStopword);
  if (contentTokens.length === 0) {
    return { type: "general_purpose_interface", confidence: 0.1, structuralHints: [] };
  }

  const embeddings = contentTokens.map(t => {
    const e1 = embedToken(t.stem);
    const e2 = embedToken(t.normalized);
    return e1.map((v, i) => (v + e2[i]) / 2);
  });

  const promptVec = meanPool(embeddings);

  const scores = prototypes.map(proto => ({
    type: proto.type,
    score: cosineSimilarity(promptVec, proto.vector),
    hints: proto.hints,
  })).sort((a, b) => b.score - a.score);

  const top = scores[0];

  if (top.score < 0.15) {
    return { type: "general_purpose_interface", confidence: 0.15, structuralHints: [] };
  }

  return {
    type: top.type,
    confidence: Math.min(0.95, top.score * 1.2),
    structuralHints: top.hints,
  };
}

function extractWorkflows(frame: SemanticFrame, interfaceType: InterfaceType): WorkflowDescriptor[] {
  const workflows: WorkflowDescriptor[] = [];

  for (const action of frame.predicate) {
    const relatedObjects = frame.object.length > 0 ? frame.object : frame.subject;
    const target = relatedObjects[0] || "item";

    const steps = buildWorkflowSteps(action, target, interfaceType);
    workflows.push({
      name: `${action}_${target}`,
      steps,
      primaryAction: action,
      dataFlow: inferDataFlow(action),
    });
  }

  if (workflows.length === 0) {
    workflows.push({
      name: "view_content",
      steps: ["navigate_to_content", "browse_items", "view_details"],
      primaryAction: "view",
      dataFlow: "passive",
    });
  }

  return workflows;
}

function buildWorkflowSteps(action: string, target: string, interfaceType: InterfaceType): string[] {
  const stepPatterns: Record<string, string[]> = {
    create: [`open_${target}_form`, `fill_${target}_details`, `validate_${target}`, `save_${target}`],
    manage: [`list_${target}s`, `select_${target}`, `view_${target}_details`, `modify_${target}`],
    track: [`view_${target}_status`, `update_${target}_progress`, `review_${target}_history`],
    search: [`enter_search_query`, `filter_results`, `browse_${target}s`, `select_${target}`],
    monitor: [`view_${target}_metrics`, `check_${target}_alerts`, `analyze_${target}_trends`],
    order: [`browse_${target}s`, `add_to_cart`, `review_order`, `complete_payment`],
    schedule: [`view_calendar`, `select_time_slot`, `confirm_${target}`, `send_notification`],
    analyze: [`load_${target}_data`, `apply_filters`, `generate_${target}_report`, `export_results`],
    communicate: [`compose_message`, `select_recipients`, `send_${target}`, `view_responses`],
    design: [`open_workspace`, `select_tools`, `create_${target}`, `save_and_export`],
  };

  const matchedSteps = stepPatterns[action];
  if (matchedSteps) return matchedSteps;

  return [`navigate_to_${target}`, `${action}_${target}`, `confirm_${action}`];
}

function inferDataFlow(action: string): WorkflowDescriptor["dataFlow"] {
  const inputActions = new Set(["create", "submit", "upload", "compose", "write", "add", "register"]);
  const outputActions = new Set(["view", "read", "browse", "search", "monitor", "analyze", "export", "download"]);
  const bidirectionalActions = new Set(["manage", "edit", "update", "configure", "trade", "communicate", "collaborate"]);

  if (inputActions.has(action)) return "input";
  if (outputActions.has(action)) return "output";
  if (bidirectionalActions.has(action)) return "bidirectional";
  return "passive";
}

const DOMAIN_SEED_VECTORS: Array<{ domain: string; seeds: string[] }> = [
  { domain: "healthcare", seeds: ["patient", "doctor", "diagnosis", "treatment", "clinical", "medical", "pharmacy", "health", "hospital"] },
  { domain: "finance", seeds: ["account", "transaction", "investment", "portfolio", "banking", "trading", "stock", "crypto", "loan", "insurance"] },
  { domain: "education", seeds: ["student", "course", "curriculum", "grade", "lesson", "teacher", "quiz", "assignment", "learning"] },
  { domain: "logistics", seeds: ["shipment", "warehouse", "delivery", "freight", "fleet", "supply", "tracking", "fulfillment", "routing"] },
  { domain: "real_estate", seeds: ["property", "listing", "rental", "tenant", "landlord", "mortgage", "realtor", "lease", "housing"] },
  { domain: "food_service", seeds: ["restaurant", "menu", "recipe", "kitchen", "dining", "reservation", "catering", "chef", "cuisine"] },
  { domain: "ecommerce", seeds: ["product", "cart", "checkout", "catalog", "order", "marketplace", "retail", "pricing", "storefront"] },
  { domain: "fitness", seeds: ["workout", "exercise", "training", "gym", "wellness", "nutrition", "routine", "cardio", "strength"] },
  { domain: "travel", seeds: ["hotel", "flight", "booking", "destination", "itinerary", "tourism", "vacation", "reservation"] },
  { domain: "construction", seeds: ["blueprint", "contractor", "renovation", "building", "architecture", "permit", "inspection"] },
  { domain: "entertainment", seeds: ["music", "video", "streaming", "playlist", "podcast", "gaming", "concert", "recording", "studio"] },
  { domain: "agriculture", seeds: ["farm", "crop", "livestock", "harvest", "soil", "irrigation", "agtech", "greenhouse"] },
  { domain: "hr", seeds: ["employee", "recruitment", "payroll", "onboarding", "talent", "benefits", "hiring", "interview", "compensation"] },
  { domain: "crm", seeds: ["customer", "lead", "pipeline", "sales", "contact", "opportunity", "deal", "engagement", "retention"] },
  { domain: "legal", seeds: ["contract", "compliance", "regulation", "attorney", "court", "litigation", "filing", "statute"] },
  { domain: "automotive", seeds: ["vehicle", "car", "fleet", "maintenance", "dealership", "inspection", "diagnostic", "repair"] },
  { domain: "energy", seeds: ["solar", "wind", "grid", "power", "utility", "consumption", "renewable", "battery", "efficiency"] },
  { domain: "nonprofit", seeds: ["donation", "volunteer", "fundraising", "campaign", "grant", "impact", "community", "charity"] },
];

let _domainVectors: Array<{ domain: string; vector: number[]; seeds: string[] }> | null = null;

function getDomainVectors() {
  if (!_domainVectors) {
    _domainVectors = DOMAIN_SEED_VECTORS.map(d => ({
      domain: d.domain,
      vector: meanPool(d.seeds.map(s => embedToken(s))),
      seeds: d.seeds,
    }));
  }
  return _domainVectors;
}

function inferDomainSignals(tokens: Token[], rawPrompt: string): DomainSignal[] {
  const contentTokens = tokens.filter(t => !t.isStopword);
  if (contentTokens.length === 0) return [];

  const embeddings = contentTokens.map(t => {
    const e1 = embedToken(t.stem);
    const e2 = embedToken(t.normalized);
    return e1.map((v, i) => (v + e2[i]) / 2);
  });
  const promptVec = meanPool(embeddings);

  const domainVecs = getDomainVectors();
  const signals: DomainSignal[] = [];

  const wordSet = new Set(contentTokens.map(t => t.normalized));
  const lower = rawPrompt.toLowerCase();

  for (const dv of domainVecs) {
    const similarity = cosineSimilarity(promptVec, dv.vector);
    const lexicalMatches = dv.seeds.filter(term => wordSet.has(term) || lower.includes(term));

    const hasLexicalEvidence = lexicalMatches.length > 0;
    const lexicalStrength = Math.min(0.95, lexicalMatches.length * 0.2 + 0.1);
    const vectorStrength = Math.min(0.6, similarity * 0.8);

    if (hasLexicalEvidence) {
      const combined = Math.min(0.95, lexicalStrength + vectorStrength * 0.3);
      signals.push({ domain: dv.domain, strength: combined, evidence: lexicalMatches });
    } else if (similarity > 0.35) {
      signals.push({ domain: dv.domain, strength: vectorStrength * 0.5, evidence: [`semantic:${similarity.toFixed(3)}`] });
    }
  }

  signals.sort((a, b) => b.strength - a.strength);
  return signals.slice(0, 5);
}

function inferStructuralRequirements(
  interfaceType: InterfaceType,
  workflows: WorkflowDescriptor[],
  domainSignals: DomainSignal[],
): StructuralRequirement[] {
  const requirements: StructuralRequirement[] = [];

  const interfaceDefaults: Partial<Record<InterfaceType, StructuralRequirement[]>> = {
    data_management_interface: [
      { component: "data_table", priority: "essential", reason: "Core data display" },
      { component: "filter_controls", priority: "essential", reason: "Data filtering capability" },
      { component: "detail_panel", priority: "recommended", reason: "Record detail view" },
    ],
    transactional_interface: [
      { component: "product_display", priority: "essential", reason: "Item browsing" },
      { component: "cart_summary", priority: "essential", reason: "Transaction tracking" },
      { component: "checkout_form", priority: "recommended", reason: "Purchase completion" },
    ],
    monitoring_analytics_interface: [
      { component: "metric_dashboard", priority: "essential", reason: "KPI visualization" },
      { component: "chart_container", priority: "essential", reason: "Data visualization" },
      { component: "alert_panel", priority: "recommended", reason: "Status monitoring" },
    ],
    workflow_orchestration_interface: [
      { component: "task_board", priority: "essential", reason: "Work item management" },
      { component: "status_tracker", priority: "essential", reason: "Progress monitoring" },
      { component: "assignment_panel", priority: "recommended", reason: "Resource allocation" },
    ],
    content_consumption_interface: [
      { component: "content_feed", priority: "essential", reason: "Content browsing" },
      { component: "reading_view", priority: "essential", reason: "Content consumption" },
      { component: "media_player", priority: "optional", reason: "Rich media support" },
    ],
    communication_interface: [
      { component: "message_list", priority: "essential", reason: "Message browsing" },
      { component: "compose_area", priority: "essential", reason: "Message creation" },
      { component: "contact_panel", priority: "recommended", reason: "Recipient selection" },
    ],
    scheduling_interface: [
      { component: "calendar_view", priority: "essential", reason: "Time visualization" },
      { component: "booking_form", priority: "essential", reason: "Appointment creation" },
      { component: "availability_display", priority: "recommended", reason: "Open slot display" },
    ],
  };

  const defaults = interfaceDefaults[interfaceType];
  if (defaults) requirements.push(...defaults);

  for (const workflow of workflows) {
    if (workflow.dataFlow === "input" || workflow.dataFlow === "bidirectional") {
      if (!requirements.find(r => r.component === "input_form")) {
        requirements.push({ component: "input_form", priority: "recommended", reason: `Data entry for ${workflow.name}` });
      }
    }
    if (workflow.dataFlow === "output") {
      if (!requirements.find(r => r.component === "results_display")) {
        requirements.push({ component: "results_display", priority: "recommended", reason: `Output display for ${workflow.name}` });
      }
    }
  }

  return requirements;
}

export function interpretPrompt(prompt: string): PromptInterpretation {
  const { tokens } = tokenize(prompt);
  const frame = buildSemanticFrame(tokens, prompt);

  const systemPurpose = deriveSystemPurpose(frame, prompt);
  const { type: interfaceType, confidence, structuralHints } = classifyInterface(tokens);
  const domainSignals = inferDomainSignals(tokens, prompt);
  const workflows = extractWorkflows(frame, interfaceType);
  const structuralRequirements = inferStructuralRequirements(interfaceType, workflows, domainSignals);

  const dataEntities = [...frame.subject, ...frame.object].filter(w => {
    const cls = classifyWordType(w);
    return cls === "entity" || cls === "concept";
  });

  return {
    systemPurpose,
    interfaceType,
    userWorkflows: workflows,
    dataEntities: [...new Set(dataEntities)],
    coreActions: [...new Set(frame.predicate)],
    domainSignals,
    structuralRequirements,
    semanticConfidence: confidence,
    interpretationMethod: "semantic",
  };
}

function classifyWordType(word: string): "action" | "entity" | "concept" | "modifier" | "unknown" {
  const entitySuffixes = ["ment", "tion", "sion", "ness", "ity", "ance", "ence", "ure", "age", "dom", "ship"];
  const lower = word.toLowerCase();
  for (const suffix of entitySuffixes) {
    if (lower.endsWith(suffix) && lower.length > suffix.length + 2) return "entity";
  }
  if (lower.endsWith("ly") || lower.endsWith("ful") || lower.endsWith("ive") || lower.endsWith("ous")) return "modifier";
  return "concept";
}

export function interpretationToReasonedContextPatch(interp: PromptInterpretation): {
  systemType: string;
  interfaceRequirements: string[];
  userActions: string[];
  entities: string[];
  domainHint: string | undefined;
  domainConfidence: number;
} {
  const topDomain = interp.domainSignals[0];
  return {
    systemType: interp.interfaceType.replace(/_interface$/, "").replace(/_/g, " "),
    interfaceRequirements: interp.structuralRequirements.map(r => r.component),
    userActions: interp.coreActions,
    entities: interp.dataEntities,
    domainHint: topDomain ? topDomain.domain : undefined,
    domainConfidence: interp.semanticConfidence,
  };
}
