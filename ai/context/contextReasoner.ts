import { tokenize, type Token } from "../model/tokenizer";
import { embedToken, meanPool, cosineSimilarity, EMBEDDING_DIM } from "../model/model";

export interface ReasonedContext {
  domain: string;
  systemType: string;
  userActions: string[];
  entities: string[];
  operationalConcepts: string[];
  interfaceRequirements: string[];
  confidence: number;
  domainTraits: DomainTraits;
}

export interface DomainTraits {
  isDataDriven: boolean;
  isTransactional: boolean;
  isContentOriented: boolean;
  isCommunicationFocused: boolean;
  isWorkflowBased: boolean;
  isCreative: boolean;
  isAnalytical: boolean;
  primaryInteraction: "view" | "create" | "manage" | "communicate" | "transact" | "explore";
}

interface SemanticCluster {
  label: string;
  centroid: number[];
  traits: Partial<DomainTraits>;
}

const DOMAIN_ARCHETYPES: Array<{ name: string; seeds: string[]; traits: Partial<DomainTraits> }> = [
  { name: "data_management", seeds: ["data", "analytics", "dashboard", "metrics", "reports", "charts", "insights", "tracking"], traits: { isDataDriven: true, isAnalytical: true, primaryInteraction: "manage" } },
  { name: "commerce", seeds: ["shop", "store", "cart", "checkout", "payment", "product", "catalog", "order", "buy", "sell", "price"], traits: { isTransactional: true, primaryInteraction: "transact" } },
  { name: "content", seeds: ["article", "blog", "post", "publish", "write", "read", "content", "media", "gallery", "portfolio"], traits: { isContentOriented: true, primaryInteraction: "view" } },
  { name: "communication", seeds: ["chat", "message", "email", "notification", "inbox", "conversation", "call", "contact"], traits: { isCommunicationFocused: true, primaryInteraction: "communicate" } },
  { name: "workflow", seeds: ["task", "project", "kanban", "sprint", "workflow", "assign", "schedule", "pipeline", "approve", "review"], traits: { isWorkflowBased: true, primaryInteraction: "manage" } },
  { name: "creative", seeds: ["design", "draw", "canvas", "edit", "compose", "create", "template", "layout", "color", "style"], traits: { isCreative: true, primaryInteraction: "create" } },
  { name: "discovery", seeds: ["search", "explore", "browse", "discover", "filter", "sort", "recommend", "curate", "map"], traits: { primaryInteraction: "explore" } },
];

function buildArchetypeCentroids(): SemanticCluster[] {
  return DOMAIN_ARCHETYPES.map(arch => {
    const embeddings = arch.seeds.map(s => embedToken(s));
    return {
      label: arch.name,
      centroid: meanPool(embeddings),
      traits: arch.traits,
    };
  });
}

let _archetypeClusters: SemanticCluster[] | null = null;
function getArchetypeClusters(): SemanticCluster[] {
  if (!_archetypeClusters) _archetypeClusters = buildArchetypeCentroids();
  return _archetypeClusters;
}

const ACTION_INDICATORS = new Set([
  "manage", "create", "build", "track", "monitor", "view", "edit", "update",
  "delete", "remove", "add", "assign", "schedule", "approve", "reject",
  "submit", "send", "receive", "upload", "download", "share", "export",
  "import", "filter", "sort", "search", "browse", "publish", "archive",
  "book", "reserve", "order", "pay", "invoice", "register", "login",
  "configure", "customize", "analyze", "report", "notify", "review",
  "rate", "comment", "follow", "subscribe", "unsubscribe", "compare",
  "calculate", "convert", "generate", "automate", "integrate", "sync",
  "backup", "restore", "deploy", "test", "debug", "log", "audit",
]);

const ENTITY_SUFFIXES = ["ment", "tion", "sion", "ness", "ity", "ance", "ence", "ure", "age", "dom", "ship", "ism"];
const ENTITY_INDICATORS = new Set([
  "user", "admin", "customer", "client", "patient", "student", "teacher",
  "employee", "manager", "team", "group", "organization", "company",
  "product", "item", "order", "invoice", "payment", "transaction",
  "account", "profile", "dashboard", "report", "document", "file",
  "message", "notification", "event", "task", "project", "ticket",
  "appointment", "booking", "reservation", "subscription", "plan",
  "category", "tag", "label", "status", "role", "permission",
  "setting", "configuration", "template", "workflow", "pipeline",
  "asset", "resource", "inventory", "stock", "shipment", "delivery",
  "campaign", "lead", "contact", "opportunity", "deal", "contract",
]);

function classifyWord(word: string): "action" | "entity" | "concept" | "modifier" | "unknown" {
  const lower = word.toLowerCase();
  if (ACTION_INDICATORS.has(lower)) return "action";
  if (ENTITY_INDICATORS.has(lower)) return "entity";
  if (lower.endsWith("ing") && lower.length > 4) return "action";
  if (lower.endsWith("er") && ACTION_INDICATORS.has(lower.slice(0, -2))) return "entity";
  for (const suffix of ENTITY_SUFFIXES) {
    if (lower.endsWith(suffix) && lower.length > suffix.length + 2) return "entity";
  }
  if (lower.endsWith("ly") || lower.endsWith("ful") || lower.endsWith("ive") || lower.endsWith("ous")) return "modifier";
  return "unknown";
}

function extractNounPhrases(tokens: Token[]): string[] {
  const phrases: string[] = [];
  let current: string[] = [];

  for (const token of tokens) {
    if (token.isStopword) {
      if (current.length > 0) {
        phrases.push(current.join(" "));
        current = [];
      }
      continue;
    }
    const cls = classifyWord(token.normalized);
    if (cls === "entity" || cls === "concept" || cls === "unknown") {
      current.push(token.normalized);
    } else {
      if (current.length > 0) {
        phrases.push(current.join(" "));
        current = [];
      }
    }
  }
  if (current.length > 0) phrases.push(current.join(" "));
  return phrases;
}

function inferDomain(prompt: string, tokens: Token[], nounPhrases: string[] = []): { domain: string; confidence: number; traits: DomainTraits } {
  const clusters = getArchetypeClusters();
  const promptEmbeddings = tokens
    .filter(t => !t.isStopword)
    .map(t => {
      const e1 = embedToken(t.stem);
      const e2 = embedToken(t.normalized);
      return e1.map((v, i) => (v + e2[i]) / 2);
    });

  if (promptEmbeddings.length === 0) {
    return {
      domain: "general",
      confidence: 0.1,
      traits: {
        isDataDriven: false, isTransactional: false, isContentOriented: true,
        isCommunicationFocused: false, isWorkflowBased: false, isCreative: false,
        isAnalytical: false, primaryInteraction: "view",
      },
    };
  }

  const promptVec = meanPool(promptEmbeddings);
  const scores = clusters.map(c => ({
    label: c.label,
    score: cosineSimilarity(promptVec, c.centroid),
    traits: c.traits,
  })).sort((a, b) => b.score - a.score);

  const top = scores[0];
  const second = scores[1];
  const confidence = Math.min(0.95, Math.max(0.1, top.score));

  const blendedTraits: DomainTraits = {
    isDataDriven: false, isTransactional: false, isContentOriented: false,
    isCommunicationFocused: false, isWorkflowBased: false, isCreative: false,
    isAnalytical: false, primaryInteraction: "view",
  };

  const topWeight = 0.7;
  const secondWeight = 0.3;
  for (const [key, val] of Object.entries(top.traits)) {
    if (typeof val === "boolean" && val) (blendedTraits as any)[key] = true;
    if (typeof val === "string") (blendedTraits as any)[key] = val;
  }
  if (second && second.score > 0.3) {
    for (const [key, val] of Object.entries(second.traits)) {
      if (typeof val === "boolean" && val && !(blendedTraits as any)[key]) {
        (blendedTraits as any)[key] = second.score > 0.5;
      }
    }
  }

  const lower = prompt.toLowerCase();
  const domainWords = tokens.filter(t => !t.isStopword).map(t => t.normalized);
  let domain = top.label;

  const domainOverrides: Array<{ keywords: string[]; domain: string }> = [
    { keywords: ["hospital", "clinic", "medical", "health", "patient", "doctor", "pharmacy"], domain: "healthcare" },
    { keywords: ["school", "university", "course", "student", "teacher", "education", "learning", "classroom"], domain: "education" },
    { keywords: ["restaurant", "food", "menu", "recipe", "cooking", "kitchen", "dining", "cafe"], domain: "food_service" },
    { keywords: ["fitness", "gym", "workout", "exercise", "training", "sport"], domain: "fitness" },
    { keywords: ["legal", "law", "attorney", "court", "contract", "compliance"], domain: "legal" },
    { keywords: ["real estate", "property", "listing", "rental", "lease", "tenant", "landlord", "housing"], domain: "real_estate" },
    { keywords: ["travel", "hotel", "booking", "flight", "destination", "tourism", "vacation"], domain: "travel" },
    { keywords: ["finance", "bank", "investment", "trading", "stock", "crypto", "wallet", "fintech"], domain: "finance" },
    { keywords: ["logistics", "shipping", "delivery", "warehouse", "supply chain", "freight", "fleet"], domain: "logistics" },
    { keywords: ["agriculture", "farm", "crop", "livestock", "harvest", "soil", "irrigation"], domain: "agriculture" },
    { keywords: ["drone", "aerial", "uav", "quadcopter", "flying", "aviation"], domain: "aviation" },
    { keywords: ["pet", "animal", "veterinary", "vet", "grooming", "kennel", "shelter"], domain: "pet_services" },
    { keywords: ["music", "audio", "recording", "studio", "playlist", "streaming", "podcast"], domain: "entertainment" },
    { keywords: ["construction", "building", "architecture", "blueprint", "contractor", "renovation"], domain: "construction" },
    { keywords: ["insurance", "policy", "claim", "coverage", "premium", "underwriting"], domain: "insurance" },
  ];

  for (const override of domainOverrides) {
    const matchCount = override.keywords.filter(kw =>
      lower.includes(kw) || domainWords.some(w => w === kw)
    ).length;
    if (matchCount >= 2 || (matchCount === 1 && override.keywords.some(kw => kw.length > 5 && lower.includes(kw)))) {
      domain = override.domain;
      break;
    }
  }

  if (domain === top.label) {
    const multiWords = nounPhrases.filter(p => p.includes(" ") && p.length > 6);
    if (multiWords.length > 0) {
      const bestPhrase = multiWords.sort((a, b) => b.length - a.length)[0];
      const phraseAsKey = bestPhrase.replace(/\s+/g, "_");
      if (!["data_management", "commerce", "content", "communication", "workflow", "creative", "discovery"].includes(domain)) {
        domain = phraseAsKey;
      }
    }
  }

  return { domain, confidence, traits: blendedTraits };
}

function inferSystemType(domain: string, actions: string[], entities: string[], traits: DomainTraits): string {
  if (traits.isTransactional && entities.some(e => ["product", "cart", "checkout", "order", "shop", "store"].includes(e))) {
    return "marketplace";
  }
  if (traits.isDataDriven && traits.isAnalytical) return "analytics_platform";
  if (traits.isWorkflowBased) return "management_system";
  if (traits.isCommunicationFocused) return "communication_platform";
  if (traits.isCreative) return "creative_tool";
  if (traits.isContentOriented) return "content_platform";
  if (actions.length > entities.length) return "service_application";
  return "information_system";
}

function extractActions(tokens: Token[]): string[] {
  const actions: string[] = [];
  for (const token of tokens) {
    if (token.isStopword) continue;
    const cls = classifyWord(token.normalized);
    if (cls === "action") {
      actions.push(token.normalized);
    }
    if (token.normalized.endsWith("ing") && token.normalized.length > 4) {
      const base = token.normalized.slice(0, -3);
      if (base.length > 2 && !actions.includes(base)) actions.push(token.normalized);
    }
  }
  return [...new Set(actions)];
}

function extractEntities(tokens: Token[], nounPhrases: string[]): string[] {
  const entities: string[] = [];
  for (const token of tokens) {
    if (token.isStopword) continue;
    const cls = classifyWord(token.normalized);
    if (cls === "entity") entities.push(token.normalized);
  }
  for (const phrase of nounPhrases) {
    if (phrase.includes(" ") && !entities.includes(phrase)) {
      entities.push(phrase);
    }
  }
  return [...new Set(entities)];
}

function deriveOperationalConcepts(actions: string[], entities: string[], traits: DomainTraits): string[] {
  const concepts: string[] = [];

  if (traits.isDataDriven) concepts.push("data_visualization", "metric_tracking", "reporting");
  if (traits.isTransactional) concepts.push("transaction_processing", "payment_handling", "order_management");
  if (traits.isWorkflowBased) concepts.push("task_assignment", "status_tracking", "process_automation");
  if (traits.isCommunicationFocused) concepts.push("messaging", "notification_system", "contact_management");
  if (traits.isCreative) concepts.push("content_creation", "template_management", "asset_library");
  if (traits.isAnalytical) concepts.push("data_analysis", "trend_detection", "performance_monitoring");
  if (traits.isContentOriented) concepts.push("content_publishing", "media_management", "categorization");

  for (const action of actions) {
    for (const entity of entities.slice(0, 5)) {
      const concept = `${action}_${entity}`.replace(/\s+/g, "_");
      if (!concepts.includes(concept)) concepts.push(concept);
    }
  }

  return concepts.slice(0, 15);
}

function deriveInterfaceRequirements(
  actions: string[], entities: string[], concepts: string[], traits: DomainTraits
): string[] {
  const requirements: string[] = [];

  if (traits.primaryInteraction === "view") requirements.push("display_panels", "content_cards", "media_gallery");
  if (traits.primaryInteraction === "create") requirements.push("form_builder", "input_fields", "file_upload");
  if (traits.primaryInteraction === "manage") requirements.push("list_views", "detail_panels", "action_buttons", "status_indicators");
  if (traits.primaryInteraction === "communicate") requirements.push("message_thread", "input_area", "contact_list");
  if (traits.primaryInteraction === "transact") requirements.push("product_grid", "cart_widget", "checkout_flow", "price_display");
  if (traits.primaryInteraction === "explore") requirements.push("search_bar", "filter_panel", "result_grid", "map_view");

  if (traits.isDataDriven) requirements.push("charts", "data_tables", "metric_cards", "date_range_picker");
  if (traits.isWorkflowBased) requirements.push("kanban_board", "timeline", "progress_bar", "assignment_widget");
  if (traits.isCreative) requirements.push("canvas", "toolbar", "property_panel", "layer_panel");

  if (actions.some(a => ["search", "filter", "browse"].includes(a))) requirements.push("search_interface");
  if (actions.some(a => ["upload", "import"].includes(a))) requirements.push("upload_widget");
  if (actions.some(a => ["export", "download"].includes(a))) requirements.push("export_button");
  if (actions.some(a => ["schedule", "book", "reserve"].includes(a))) requirements.push("calendar_widget", "booking_form");
  if (actions.some(a => ["notify", "alert"].includes(a))) requirements.push("notification_panel");
  if (entities.some(e => ["user", "profile", "account"].includes(e))) requirements.push("user_profile", "auth_forms");
  if (entities.some(e => ["map", "location", "address"].includes(e))) requirements.push("map_component");

  return [...new Set(requirements)].slice(0, 20);
}

export function reasonContext(prompt: string): ReasonedContext {
  const { tokens, meaningful } = tokenize(prompt);
  const nounPhrases = extractNounPhrases(tokens);
  const { domain, confidence, traits } = inferDomain(prompt, meaningful, nounPhrases);

  const actions = extractActions(meaningful);
  const entities = extractEntities(meaningful, nounPhrases);
  const concepts = deriveOperationalConcepts(actions, entities, traits);
  const interfaceReqs = deriveInterfaceRequirements(actions, entities, concepts, traits);
  const systemType = inferSystemType(domain, actions, entities, traits);

  return {
    domain,
    systemType,
    userActions: actions,
    entities,
    operationalConcepts: concepts,
    interfaceRequirements: interfaceReqs,
    confidence,
    domainTraits: traits,
  };
}

export function reasonContextWithHistory(
  prompt: string,
  previousContext?: ReasonedContext,
): ReasonedContext {
  const current = reasonContext(prompt);

  if (!previousContext) return current;

  if (current.confidence < 0.3 && previousContext.confidence > 0.5) {
    return {
      ...current,
      domain: previousContext.domain,
      domainTraits: previousContext.domainTraits,
      entities: [...new Set([...current.entities, ...previousContext.entities])],
      confidence: Math.max(current.confidence, previousContext.confidence * 0.7),
    };
  }

  return current;
}
