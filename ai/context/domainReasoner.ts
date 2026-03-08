import type { ReasonedContext, DomainTraits } from "./contextReasoner";
import type { DomainKnowledge } from "../retrieval/webKnowledge";

export interface UICapabilityRequirements {
  primaryComponents: ComponentRequirement[];
  supportingComponents: ComponentRequirement[];
  dataStructures: DataStructure[];
  interactionPatterns: InteractionPattern[];
  layoutSuggestion: LayoutSuggestion;
}

export interface ComponentRequirement {
  type: string;
  purpose: string;
  priority: "essential" | "recommended" | "optional";
  dataBinding?: string;
  interactivity: "static" | "interactive" | "real_time";
}

export interface DataStructure {
  name: string;
  fields: string[];
  displayAs: "table" | "card" | "list" | "chart" | "form" | "detail";
}

export interface InteractionPattern {
  trigger: string;
  action: string;
  outcome: string;
}

export interface LayoutSuggestion {
  pageType: "dashboard" | "landing" | "crud" | "detail" | "wizard" | "marketplace" | "portal" | "content";
  sections: string[];
  navigation: "sidebar" | "topbar" | "tabs" | "breadcrumbs" | "minimal";
  density: "compact" | "balanced" | "spacious";
}

const ACTION_TO_COMPONENT: Record<string, ComponentRequirement> = {
  search: { type: "search_bar", purpose: "Find items quickly", priority: "essential", interactivity: "interactive" },
  filter: { type: "filter_panel", purpose: "Narrow results by criteria", priority: "recommended", interactivity: "interactive" },
  create: { type: "create_form", purpose: "Add new records", priority: "essential", interactivity: "interactive" },
  edit: { type: "edit_form", purpose: "Modify existing records", priority: "essential", interactivity: "interactive" },
  delete: { type: "delete_action", purpose: "Remove records", priority: "recommended", interactivity: "interactive" },
  view: { type: "detail_view", purpose: "Display record details", priority: "essential", interactivity: "static" },
  list: { type: "data_list", purpose: "Display collection of items", priority: "essential", interactivity: "interactive" },
  track: { type: "tracking_panel", purpose: "Monitor progress or status", priority: "essential", interactivity: "real_time" },
  monitor: { type: "monitor_dashboard", purpose: "Real-time system overview", priority: "essential", interactivity: "real_time" },
  schedule: { type: "calendar_widget", purpose: "Time-based planning", priority: "essential", interactivity: "interactive" },
  book: { type: "booking_form", purpose: "Reserve resources", priority: "essential", interactivity: "interactive" },
  order: { type: "order_flow", purpose: "Place and manage orders", priority: "essential", interactivity: "interactive" },
  pay: { type: "payment_widget", purpose: "Process payments", priority: "essential", interactivity: "interactive" },
  upload: { type: "upload_widget", purpose: "Add files or media", priority: "recommended", interactivity: "interactive" },
  export: { type: "export_button", purpose: "Download data", priority: "optional", interactivity: "interactive" },
  analyze: { type: "analytics_panel", purpose: "Data analysis tools", priority: "essential", interactivity: "interactive" },
  report: { type: "report_builder", purpose: "Generate reports", priority: "recommended", interactivity: "interactive" },
  notify: { type: "notification_center", purpose: "Alert users of events", priority: "recommended", interactivity: "real_time" },
  share: { type: "share_widget", purpose: "Distribute content", priority: "optional", interactivity: "interactive" },
  rate: { type: "rating_widget", purpose: "Provide feedback", priority: "optional", interactivity: "interactive" },
  comment: { type: "comment_thread", purpose: "Discuss items", priority: "optional", interactivity: "interactive" },
  configure: { type: "settings_panel", purpose: "System configuration", priority: "recommended", interactivity: "interactive" },
  compare: { type: "comparison_view", purpose: "Side-by-side analysis", priority: "optional", interactivity: "interactive" },
  assign: { type: "assignment_widget", purpose: "Delegate tasks", priority: "essential", interactivity: "interactive" },
  approve: { type: "approval_flow", purpose: "Review and approve", priority: "essential", interactivity: "interactive" },
  manage: { type: "management_panel", purpose: "Oversee resources", priority: "essential", interactivity: "interactive" },
  send: { type: "message_composer", purpose: "Send communications", priority: "essential", interactivity: "interactive" },
  receive: { type: "inbox", purpose: "Receive communications", priority: "essential", interactivity: "real_time" },
  subscribe: { type: "subscription_widget", purpose: "Manage subscriptions", priority: "recommended", interactivity: "interactive" },
};

const ENTITY_TO_DATA_STRUCTURE: Record<string, { fields: string[]; displayAs: DataStructure["displayAs"] }> = {
  user: { fields: ["name", "email", "role", "status", "avatar"], displayAs: "card" },
  product: { fields: ["name", "price", "description", "image", "category"], displayAs: "card" },
  order: { fields: ["id", "date", "status", "total", "items"], displayAs: "table" },
  task: { fields: ["title", "assignee", "status", "priority", "due_date"], displayAs: "list" },
  project: { fields: ["name", "description", "status", "team", "deadline"], displayAs: "card" },
  message: { fields: ["sender", "content", "timestamp", "read_status"], displayAs: "list" },
  appointment: { fields: ["date", "time", "patient", "provider", "type"], displayAs: "table" },
  transaction: { fields: ["date", "amount", "type", "status", "party"], displayAs: "table" },
  document: { fields: ["title", "author", "date", "type", "size"], displayAs: "list" },
  report: { fields: ["title", "date_range", "metrics", "summary"], displayAs: "detail" },
  invoice: { fields: ["number", "date", "amount", "status", "client"], displayAs: "table" },
  ticket: { fields: ["id", "subject", "priority", "assignee", "status"], displayAs: "list" },
  event: { fields: ["title", "date", "location", "attendees", "description"], displayAs: "card" },
  contact: { fields: ["name", "email", "phone", "company", "role"], displayAs: "table" },
  property: { fields: ["address", "price", "type", "bedrooms", "status"], displayAs: "card" },
  shipment: { fields: ["tracking_id", "origin", "destination", "status", "eta"], displayAs: "table" },
  course: { fields: ["title", "instructor", "duration", "level", "enrolled"], displayAs: "card" },
  reservation: { fields: ["date", "time", "party_size", "status", "name"], displayAs: "table" },
};

function mapActionsToComponents(actions: string[]): ComponentRequirement[] {
  const components: ComponentRequirement[] = [];
  const seen = new Set<string>();

  for (const action of actions) {
    const stem = action.replace(/ing$/, "").replace(/s$/, "");
    const candidates = [action, stem];
    for (const candidate of candidates) {
      const component = ACTION_TO_COMPONENT[candidate];
      if (component && !seen.has(component.type)) {
        seen.add(component.type);
        components.push({ ...component, dataBinding: action });
      }
    }
  }

  return components;
}

function mapEntitiesToDataStructures(entities: string[]): DataStructure[] {
  const structures: DataStructure[] = [];
  const seen = new Set<string>();

  for (const entity of entities) {
    const singular = entity.replace(/s$/, "").toLowerCase();
    const candidates = [entity.toLowerCase(), singular];
    for (const candidate of candidates) {
      const template = ENTITY_TO_DATA_STRUCTURE[candidate];
      if (template && !seen.has(candidate)) {
        seen.add(candidate);
        structures.push({
          name: candidate,
          fields: template.fields,
          displayAs: template.displayAs,
        });
      }
    }
  }

  if (structures.length === 0) {
    for (const entity of entities.slice(0, 3)) {
      structures.push({
        name: entity,
        fields: ["id", "name", "description", "status", "created_at"],
        displayAs: "card",
      });
    }
  }

  return structures;
}

function deriveInteractionPatterns(actions: string[], entities: string[]): InteractionPattern[] {
  const patterns: InteractionPattern[] = [];
  for (const action of actions.slice(0, 5)) {
    for (const entity of entities.slice(0, 3)) {
      patterns.push({
        trigger: `User wants to ${action}`,
        action: `${action} ${entity}`,
        outcome: `${entity} is ${action}ed`,
      });
    }
  }
  return patterns.slice(0, 10);
}

function determineLayout(traits: DomainTraits, systemType: string, componentCount: number): LayoutSuggestion {
  let pageType: LayoutSuggestion["pageType"] = "landing";
  let navigation: LayoutSuggestion["navigation"] = "topbar";
  let density: LayoutSuggestion["density"] = "balanced";

  if (systemType === "analytics_platform" || systemType === "management_system") {
    pageType = "dashboard";
    navigation = "sidebar";
    density = "compact";
  } else if (systemType === "marketplace") {
    pageType = "marketplace";
    navigation = "topbar";
  } else if (systemType === "creative_tool") {
    pageType = "crud";
    navigation = "sidebar";
  } else if (systemType === "content_platform") {
    pageType = "content";
    navigation = "topbar";
  } else if (systemType === "communication_platform") {
    pageType = "portal";
    navigation = "sidebar";
    density = "compact";
  } else if (systemType === "service_application") {
    pageType = componentCount > 5 ? "dashboard" : "crud";
    navigation = componentCount > 5 ? "sidebar" : "topbar";
  }

  if (traits.isDataDriven && pageType === "landing") pageType = "dashboard";

  const sections: string[] = [];
  if (pageType === "landing") {
    sections.push("hero", "features", "social_proof", "cta", "footer");
  } else if (pageType === "dashboard") {
    sections.push("header", "metrics", "main_content", "sidebar_widgets");
  } else if (pageType === "marketplace") {
    sections.push("search_header", "filter_sidebar", "product_grid", "pagination");
  } else if (pageType === "crud") {
    sections.push("header", "toolbar", "content_area", "detail_panel");
  } else if (pageType === "portal") {
    sections.push("header", "navigation", "main_content", "activity_feed");
  } else if (pageType === "content") {
    sections.push("header", "content_body", "sidebar", "comments", "footer");
  } else {
    sections.push("header", "main_content", "footer");
  }

  return { pageType, sections, navigation, density };
}

export function reasonDomain(
  context: ReasonedContext,
  knowledge?: DomainKnowledge,
): UICapabilityRequirements {
  let allActions = [...context.userActions];
  let allEntities = [...context.entities];

  if (knowledge) {
    allActions = [...new Set([...allActions, ...knowledge.commonActions])];
    allEntities = [...new Set([...allEntities, ...knowledge.typicalEntities])];
  }

  const primaryComponents = mapActionsToComponents(allActions)
    .filter(c => c.priority === "essential");
  const supportingComponents = mapActionsToComponents(allActions)
    .filter(c => c.priority !== "essential");

  const dataStructures = mapEntitiesToDataStructures(allEntities);
  const interactionPatterns = deriveInteractionPatterns(allActions, allEntities);
  const layoutSuggestion = determineLayout(
    context.domainTraits,
    context.systemType,
    primaryComponents.length + supportingComponents.length,
  );

  if (context.domainTraits.isDataDriven && !primaryComponents.find(c => c.type === "analytics_panel")) {
    primaryComponents.push({
      type: "analytics_panel",
      purpose: "Data visualization and insights",
      priority: "essential",
      interactivity: "interactive",
    });
  }

  if (context.domainTraits.isWorkflowBased && !primaryComponents.find(c => c.type === "tracking_panel")) {
    primaryComponents.push({
      type: "tracking_panel",
      purpose: "Workflow status tracking",
      priority: "essential",
      interactivity: "real_time",
    });
  }

  return {
    primaryComponents,
    supportingComponents,
    dataStructures,
    interactionPatterns,
    layoutSuggestion,
  };
}

export function capabilitiesToSectionTypes(caps: UICapabilityRequirements): string[] {
  const sectionTypes: string[] = [];
  const layout = caps.layoutSuggestion;

  if (layout.pageType === "landing") {
    sectionTypes.push("hero");
    if (caps.primaryComponents.length > 2) sectionTypes.push("featureGrid");
    if (caps.dataStructures.length > 0) sectionTypes.push("cardList");
    sectionTypes.push("testimonial", "cta", "footer");
  } else if (layout.pageType === "dashboard") {
    sectionTypes.push("hero");
    if (caps.primaryComponents.some(c => c.interactivity === "real_time")) sectionTypes.push("stats");
    sectionTypes.push("featureGrid", "footer");
  } else {
    sectionTypes.push("hero", "featureGrid");
    if (caps.dataStructures.length > 0) sectionTypes.push("cardList");
    sectionTypes.push("cta", "footer");
  }

  return sectionTypes;
}
