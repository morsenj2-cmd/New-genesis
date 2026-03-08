import { tokenize, type Token } from "../model/tokenizer";
import { embedToken, meanPool, cosineSimilarity } from "../model/model";
import { interpretPrompt, type PromptInterpretation } from "./promptInterpreter";
import { scaledCap } from "./promptScale";

export type InterfaceCategory =
  | "product_dashboard"
  | "admin_dashboard"
  | "analytics_dashboard"
  | "web_application"
  | "landing_page"
  | "marketing_site"
  | "internal_tool"
  | "data_management_interface"
  | "workflow_management_interface";

export interface InterfaceClassification {
  category: InterfaceCategory;
  confidence: number;
  system_type: string;
  primary_user: string;
  user_workflows: string[];
  reasoning: string;
  isMarketingContent: boolean;
}

interface CategoryPrototype {
  category: InterfaceCategory;
  seeds: string[];
  contextIndicators: string[];
  antiIndicators: string[];
  mapsToDashboard: boolean;
}

const CATEGORY_PROTOTYPES: CategoryPrototype[] = [
  {
    category: "product_dashboard",
    seeds: [
      "dashboard", "overview", "sidebar", "navigation", "metrics", "panel",
      "workspace", "manage", "settings", "activity", "notifications",
      "status", "feed", "recent", "summary", "profile",
    ],
    contextIndicators: [
      "sidebar navigation", "left sidebar", "main content", "control panel",
      "user profile", "notification", "management console", "workspace",
      "global layout", "top navigation",
    ],
    antiIndicators: ["landing page", "promotional", "marketing", "hero section"],
    mapsToDashboard: true,
  },
  {
    category: "admin_dashboard",
    seeds: [
      "admin", "administration", "users", "permissions", "roles", "logs",
      "configuration", "system", "audit", "compliance", "access", "security",
    ],
    contextIndicators: [
      "admin panel", "user management", "access control", "system settings",
      "audit log", "permission", "role management",
    ],
    antiIndicators: ["landing page", "homepage", "marketing"],
    mapsToDashboard: true,
  },
  {
    category: "analytics_dashboard",
    seeds: [
      "analytics", "metrics", "kpi", "chart", "graph", "report", "trend",
      "visualization", "insight", "data", "performance", "tracking",
      "volume", "distribution", "spending",
    ],
    contextIndicators: [
      "data visualization", "analytics dashboard", "charts", "metrics",
      "financial analytics", "performance monitoring", "trend analysis",
      "payment volume chart", "distribution chart",
    ],
    antiIndicators: ["landing", "promotional", "hero"],
    mapsToDashboard: true,
  },
  {
    category: "web_application",
    seeds: [
      "application", "app", "platform", "tool", "interface", "saas",
      "software", "system", "module", "feature", "function", "workflow",
    ],
    contextIndicators: [
      "web app", "web application", "platform", "saas", "software",
      "user interface", "functional", "interactive",
    ],
    antiIndicators: ["landing page", "promotional page", "marketing site"],
    mapsToDashboard: false,
  },
  {
    category: "landing_page",
    seeds: [
      "landing", "hero", "cta", "call-to-action", "conversion", "signup",
      "waitlist", "coming", "soon", "promotional", "homepage", "above-the-fold",
    ],
    contextIndicators: [
      "landing page", "hero section", "call to action", "call-to-action",
      "sign up", "get started", "promotional", "homepage",
      "above the fold", "conversion", "waitlist", "coming soon",
    ],
    antiIndicators: [
      "dashboard", "sidebar navigation", "admin panel", "manage",
      "employee table", "transaction history",
    ],
    mapsToDashboard: false,
  },
  {
    category: "marketing_site",
    seeds: [
      "marketing", "brand", "promotional", "company", "about", "testimonials",
      "pricing", "plans", "showcase", "portfolio",
    ],
    contextIndicators: [
      "marketing site", "marketing page", "brand page", "company website",
      "pricing page", "testimonials section",
    ],
    antiIndicators: ["dashboard", "admin", "data table", "manage employees"],
    mapsToDashboard: false,
  },
  {
    category: "internal_tool",
    seeds: [
      "internal", "backoffice", "operations", "employee", "hr", "payroll",
      "contractor", "onboarding", "compliance", "approval", "review",
    ],
    contextIndicators: [
      "internal tool", "back office", "operations manager", "employee management",
      "payroll management", "contractor management", "run payroll",
    ],
    antiIndicators: ["landing page", "promotional", "hero section"],
    mapsToDashboard: true,
  },
  {
    category: "data_management_interface",
    seeds: [
      "table", "record", "entry", "crud", "database", "list", "filter",
      "sort", "column", "row", "query", "field", "schema",
    ],
    contextIndicators: [
      "data table", "record management", "crud operations",
      "table view", "filter panel", "column", "database management",
    ],
    antiIndicators: ["landing page", "marketing", "hero"],
    mapsToDashboard: false,
  },
  {
    category: "workflow_management_interface",
    seeds: [
      "workflow", "task", "kanban", "pipeline", "process", "approval",
      "assign", "status", "progress", "milestone", "sprint", "board",
    ],
    contextIndicators: [
      "workflow management", "task management", "kanban board",
      "approval process", "pipeline management", "project management",
    ],
    antiIndicators: ["landing page", "marketing", "hero section"],
    mapsToDashboard: false,
  },
];

let _categoryVectors: Array<{ category: InterfaceCategory; vector: number[]; proto: CategoryPrototype }> | null = null;

function getCategoryVectors() {
  if (!_categoryVectors) {
    _categoryVectors = CATEGORY_PROTOTYPES.map(proto => {
      const embeddings = proto.seeds.map(s => embedToken(s));
      return {
        category: proto.category,
        vector: meanPool(embeddings),
        proto,
      };
    });
  }
  return _categoryVectors;
}

const MARKETING_CONTENT_SIGNALS = [
  "landing page", "hero section", "call to action", "call-to-action",
  "cta section", "testimonials section", "pricing section", "sign up",
  "get started", "promotional", "marketing page", "waitlist",
  "above the fold", "conversion", "social proof", "trust badges",
  "value proposition",
];

const PRODUCT_INTERFACE_SIGNALS = [
  "dashboard", "sidebar navigation", "left sidebar", "admin panel",
  "data table", "employee table", "transaction history", "manage",
  "management page", "settings page", "reports page", "overview page",
  "global layout", "main content workspace", "control panel",
  "run payroll", "send payment", "filter", "search bar",
  "top navigation bar", "user profile menu", "notifications",
  "management console", "data panels", "metric cards",
];

function detectMarketingContent(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  let marketingScore = 0;
  let productScore = 0;

  for (const signal of MARKETING_CONTENT_SIGNALS) {
    if (lower.includes(signal)) marketingScore++;
  }

  for (const signal of PRODUCT_INTERFACE_SIGNALS) {
    if (lower.includes(signal)) productScore++;
  }

  return marketingScore > productScore && marketingScore >= 2;
}

function extractPrimaryUser(prompt: string): string {
  const lower = prompt.toLowerCase();

  const userPatterns: [RegExp, string][] = [
    [/\btarget (?:users?|audience)\s*:\s*([^.]+)/i, ""],
    [/\bfor\s+([\w\s]+?)\s+(?:who|that|to)\b/i, ""],
    [/\busers?\s+(?:are|include)\s*:?\s*([^.]+)/i, ""],
    [/\b(admin|administrator|manager|developer|operator|analyst|owner|founder)\b/i, ""],
  ];

  for (const [pattern] of userPatterns) {
    const match = lower.match(pattern);
    if (match && match[1]) {
      return match[1].trim().slice(0, 100);
    }
  }

  return "end user";
}

function scoreContextIndicators(prompt: string, proto: CategoryPrototype): number {
  const lower = prompt.toLowerCase();
  let score = 0;
  let antiScore = 0;

  for (const indicator of proto.contextIndicators) {
    if (lower.includes(indicator)) score += 2;
  }

  for (const anti of proto.antiIndicators) {
    if (lower.includes(anti)) antiScore += 3;
  }

  return score - antiScore;
}

export function classifyInterface(prompt: string): InterfaceClassification {
  const { tokens, meaningful } = tokenize(prompt);
  const pLen = prompt.length;
  const lower = prompt.toLowerCase();

  const isMarketing = detectMarketingContent(prompt);

  const vectors = getCategoryVectors();
  const contentTokens = meaningful.filter(t => !t.isStopword);
  const promptEmbeddings = contentTokens.slice(0, scaledCap(50, pLen)).map(t => embedToken(t.normalized));

  if (promptEmbeddings.length === 0) {
    return {
      category: "web_application",
      confidence: 0.1,
      system_type: "general",
      primary_user: "end user",
      user_workflows: [],
      reasoning: "Empty or unparseable prompt",
      isMarketingContent: false,
    };
  }

  const promptVector = meanPool(promptEmbeddings);

  const scores: Array<{ category: InterfaceCategory; score: number; contextScore: number }> = [];
  for (const cv of vectors) {
    const vectorScore = cosineSimilarity(promptVector, cv.vector);
    const contextScore = scoreContextIndicators(prompt, cv.proto);
    const combined = vectorScore * 10 + contextScore;
    scores.push({ category: cv.category, score: combined, contextScore });
  }

  scores.sort((a, b) => b.score - a.score);

  let bestCategory = scores[0].category;
  let confidence = Math.min(0.95, Math.max(0.1, scores[0].score / 20));

  if (isMarketing && bestCategory !== "landing_page" && bestCategory !== "marketing_site") {
    const landingScore = scores.find(s => s.category === "landing_page");
    const marketingScore = scores.find(s => s.category === "marketing_site");
    if (landingScore && landingScore.score > scores[0].score * 0.5) {
      bestCategory = "landing_page";
      confidence = Math.min(0.8, landingScore.score / 20);
    } else if (marketingScore && marketingScore.score > scores[0].score * 0.5) {
      bestCategory = "marketing_site";
      confidence = Math.min(0.8, marketingScore.score / 20);
    }
  }

  if (!isMarketing && (bestCategory === "landing_page" || bestCategory === "marketing_site")) {
    const dashProto = CATEGORY_PROTOTYPES.find(p => p.mapsToDashboard);
    if (dashProto) {
      const dashScore = scoreContextIndicators(prompt, dashProto);
      if (dashScore > 0) {
        bestCategory = scores.find(s => s.category !== "landing_page" && s.category !== "marketing_site")?.category || "web_application";
        confidence = Math.max(0.3, confidence * 0.7);
      }
    }
  }

  const interpretation = interpretPrompt(prompt);
  const interfaceMapping = mapInterfaceTypeToCategory(interpretation.interfaceType);
  if (interfaceMapping && interfaceMapping !== bestCategory) {
    if (confidence < 0.6) {
      bestCategory = interfaceMapping;
    }
  }

  const systemType = deriveSystemType(prompt, bestCategory);
  const primaryUser = extractPrimaryUser(prompt);

  const userWorkflows: string[] = [];
  for (const wf of interpretation.userWorkflows.slice(0, scaledCap(10, pLen))) {
    userWorkflows.push(wf.name);
  }

  const reasoning = buildReasoning(bestCategory, scores[0], isMarketing, interpretation);

  return {
    category: bestCategory,
    confidence,
    system_type: systemType,
    primary_user: primaryUser,
    user_workflows: userWorkflows,
    reasoning,
    isMarketingContent: isMarketing,
  };
}

function mapInterfaceTypeToCategory(type: string): InterfaceCategory | null {
  const mapping: Record<string, InterfaceCategory> = {
    monitoring_analytics_interface: "analytics_dashboard",
    data_management_interface: "data_management_interface",
    workflow_orchestration_interface: "workflow_management_interface",
    transactional_interface: "web_application",
    communication_interface: "web_application",
    creative_tool_interface: "web_application",
    discovery_exploration_interface: "web_application",
    marketplace_interface: "web_application",
    social_platform_interface: "web_application",
    educational_interface: "web_application",
    scheduling_interface: "web_application",
  };
  return mapping[type] || null;
}

function deriveSystemType(prompt: string, category: InterfaceCategory): string {
  const lower = prompt.toLowerCase();

  if (lower.includes("payroll") || lower.includes("payment")) return "financial_operations";
  if (lower.includes("crm") || lower.includes("customer")) return "customer_management";
  if (lower.includes("project") || lower.includes("task")) return "project_management";
  if (lower.includes("analytics") || lower.includes("reporting")) return "analytics_platform";
  if (lower.includes("inventory") || lower.includes("warehouse")) return "inventory_management";
  if (lower.includes("hr") || lower.includes("employee")) return "human_resources";

  const categoryToSystem: Record<InterfaceCategory, string> = {
    product_dashboard: "product_platform",
    admin_dashboard: "administration_system",
    analytics_dashboard: "analytics_platform",
    web_application: "web_platform",
    landing_page: "marketing_site",
    marketing_site: "marketing_site",
    internal_tool: "internal_operations",
    data_management_interface: "data_system",
    workflow_management_interface: "workflow_system",
  };

  return categoryToSystem[category] || "general_platform";
}

function buildReasoning(
  category: InterfaceCategory,
  topScore: { score: number; contextScore: number },
  isMarketing: boolean,
  interpretation: PromptInterpretation,
): string {
  const parts: string[] = [];
  parts.push(`Classified as ${category}`);
  parts.push(`vector+context score: ${topScore.score.toFixed(2)}`);
  if (isMarketing) parts.push("marketing content detected");
  else parts.push("non-marketing content");
  parts.push(`semantic type: ${interpretation.interfaceType}`);
  return parts.join("; ");
}

export function categoryToPageType(category: InterfaceCategory): string {
  const mapping: Record<InterfaceCategory, string> = {
    product_dashboard: "dashboard",
    admin_dashboard: "dashboard",
    analytics_dashboard: "dashboard",
    web_application: "web_app",
    landing_page: "landing_page",
    marketing_site: "marketing_site",
    internal_tool: "dashboard",
    data_management_interface: "web_app",
    workflow_management_interface: "web_app",
  };
  return mapping[category] || "web_app";
}

export function categoryIsDashboard(category: InterfaceCategory): boolean {
  return [
    "product_dashboard",
    "admin_dashboard",
    "analytics_dashboard",
    "internal_tool",
  ].includes(category);
}
