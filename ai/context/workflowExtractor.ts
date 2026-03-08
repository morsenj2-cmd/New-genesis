import { tokenize } from "../model/tokenizer";
import { scaledCap } from "./promptScale";

export interface ExtractedWorkflowData {
  users: string[];
  primary_tasks: string[];
  system_features: string[];
  required_interfaces: string[];
  data_entities: string[];
  page_structures: PageStructure[];
  navigation_items: string[];
}

export interface PageStructure {
  name: string;
  purpose: string;
  components: string[];
}

const USER_PATTERNS = [
  /\btarget\s+(?:users?|audience)\s*:?\s*([^.\n]+)/gi,
  /\bfor\s+([\w\s,]+?)(?:\s+who|\s+that|\s+to\s+|\.|$)/gi,
  /\b(admin(?:istrator)?s?|managers?|owners?|founders?|operators?|analysts?|developers?|employees?|contractors?|clients?|customers?|patients?|students?|teachers?|agents?)\b/gi,
];

const TASK_VERBS = new Set([
  "manage", "create", "build", "track", "monitor", "view", "edit", "update",
  "delete", "add", "assign", "schedule", "book", "reserve", "order", "pay",
  "search", "browse", "publish", "share", "upload", "download", "analyze",
  "report", "configure", "deploy", "test", "generate", "automate", "integrate",
  "run", "send", "process", "approve", "review", "submit", "export", "import",
  "filter", "sort", "organize", "archive", "notify", "alert", "verify",
  "calculate", "distribute", "connect", "sync", "transfer", "allocate",
]);

const INTERFACE_KEYWORDS: Record<string, string> = {
  "sidebar": "sidebar_navigation",
  "navigation": "navigation_panel",
  "table": "data_table",
  "chart": "chart_component",
  "graph": "chart_component",
  "form": "input_form",
  "calendar": "calendar_view",
  "list": "list_view",
  "grid": "grid_layout",
  "card": "card_component",
  "modal": "modal_dialog",
  "dropdown": "dropdown_menu",
  "search": "search_interface",
  "filter": "filter_panel",
  "notification": "notification_system",
  "profile": "user_profile",
  "settings": "settings_panel",
  "dashboard": "dashboard_view",
  "report": "report_viewer",
  "metrics": "metrics_display",
  "status": "status_indicator",
  "button": "action_button",
  "menu": "menu_component",
  "tab": "tab_navigation",
  "panel": "content_panel",
  "feed": "activity_feed",
  "timeline": "timeline_view",
  "map": "map_component",
  "upload": "file_upload",
  "editor": "content_editor",
};

const PAGE_PATTERNS = [
  /\b(\w[\w\s]{2,30})\s+(?:page|screen|view|section|module|tab)\b/gi,
  /\b(?:page|screen|view):\s*(\w[\w\s]{2,30})/gi,
];

const NAV_ITEM_PATTERN = /(?:navigation|nav|sidebar|menu)\s+(?:items?|links?)\s*(?:such as|include|:)\s*\n?((?:[•\-\*]\s*\w[\w\s]*\n?)+)/gi;
const BULLET_PATTERN = /[•\-\*]\s*(\w[\w\s/()]*)/g;

function extractUsers(prompt: string): string[] {
  const users = new Set<string>();
  const lower = prompt.toLowerCase();

  for (const pattern of USER_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(lower)) !== null) {
      const raw = match[1].trim();
      const cleaned = raw.replace(/\b(who|that|need|want|use|can|will|should)\b.*$/i, "").trim();
      if (cleaned.length > 2 && cleaned.length < 80) {
        users.add(cleaned);
      }
    }
  }

  if (users.size === 0) users.add("end user");
  return [...users];
}

function extractTasks(prompt: string, pLen: number): string[] {
  const { tokens } = tokenize(prompt);
  const tasks = new Set<string>();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const word = token.normalized;
    const stem = token.stem;

    const isTask = TASK_VERBS.has(word) || TASK_VERBS.has(stem) ||
      (word.endsWith("ing") && TASK_VERBS.has(word.slice(0, -3)));

    if (isTask) {
      const objectWords: string[] = [];
      for (let j = i + 1; j < Math.min(i + 5, tokens.length); j++) {
        const next = tokens[j];
        if (next.isStopword && !["of", "for", "to", "in", "with"].includes(next.normalized)) break;
        if (!next.isStopword) objectWords.push(next.normalized);
        if (objectWords.length >= 3) break;
      }

      if (objectWords.length > 0) {
        tasks.add(`${word} ${objectWords.join(" ")}`);
      } else {
        tasks.add(word);
      }
    }
  }

  return [...tasks].slice(0, scaledCap(20, pLen));
}

function extractFeatures(prompt: string, pLen: number): string[] {
  const features = new Set<string>();
  const lower = prompt.toLowerCase();

  const featureBlocks = lower.split(/(?:include|features?|capabilities|functionality|components?)\s*:?\s*\n/i);
  for (const block of featureBlocks.slice(1)) {
    BULLET_PATTERN.lastIndex = 0;
    let match;
    while ((match = BULLET_PATTERN.exec(block)) !== null) {
      const item = match[1].trim();
      if (item.length > 2 && item.length < 80) {
        features.add(item);
      }
    }
  }

  const featurePatterns = [
    /[•\-\*]\s*([\w][\w\s/()'"]{3,60})/g,
  ];
  for (const pattern of featurePatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(prompt)) !== null) {
      const item = match[1].trim();
      if (item.length > 3 && item.length < 80 && !/^(the|a|an|is|are|was|for|with|from)\b/i.test(item)) {
        features.add(item.toLowerCase());
      }
    }
  }

  return [...features].slice(0, scaledCap(30, pLen));
}

function extractRequiredInterfaces(prompt: string, pLen: number): string[] {
  const interfaces = new Set<string>();
  const lower = prompt.toLowerCase();

  for (const [keyword, component] of Object.entries(INTERFACE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      interfaces.add(component);
    }
  }

  return [...interfaces].slice(0, scaledCap(20, pLen));
}

function extractDataEntities(prompt: string, pLen: number): string[] {
  const entities = new Set<string>();
  const { tokens } = tokenize(prompt);

  const entitySuffixes = ["ment", "tion", "sion", "ness", "ity", "ance", "ence", "age", "ure"];
  const dataWords = new Set([
    "employee", "contractor", "customer", "client", "user", "patient",
    "product", "order", "payment", "transaction", "invoice", "receipt",
    "task", "project", "ticket", "report", "document", "file",
    "message", "notification", "event", "appointment", "booking",
    "account", "profile", "role", "permission", "setting",
    "payroll", "salary", "deduction", "payout", "balance",
    "record", "entry", "log", "item", "asset", "resource",
  ]);

  for (const token of tokens) {
    if (token.isStopword) continue;
    const word = token.normalized;

    if (dataWords.has(word)) {
      entities.add(word);
      continue;
    }

    for (const suffix of entitySuffixes) {
      if (word.endsWith(suffix) && word.length > suffix.length + 2) {
        entities.add(word);
        break;
      }
    }
  }

  return [...entities].slice(0, scaledCap(25, pLen));
}

function extractPageStructures(prompt: string, pLen: number): PageStructure[] {
  const pages: PageStructure[] = [];
  const lower = prompt.toLowerCase();

  for (const pattern of PAGE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(lower)) !== null) {
      const name = match[1].trim();
      if (name.length > 2 && name.length < 40) {
        const existing = pages.find(p => p.name === name);
        if (!existing) {
          pages.push({ name, purpose: "", components: [] });
        }
      }
    }
  }

  const sectionHeaders = lower.split(/\n\n+/);
  for (const section of sectionHeaders) {
    const headerMatch = section.match(/^([\w\s]{3,40})\s*(?:page|screen|section)\s*\n/i);
    if (headerMatch) {
      const pageName = headerMatch[1].trim();
      const components: string[] = [];

      BULLET_PATTERN.lastIndex = 0;
      let bMatch;
      while ((bMatch = BULLET_PATTERN.exec(section)) !== null) {
        components.push(bMatch[1].trim().toLowerCase());
      }

      const existing = pages.find(p => p.name === pageName);
      if (existing) {
        existing.components.push(...components);
      } else {
        pages.push({ name: pageName, purpose: "", components });
      }
    }
  }

  return pages.slice(0, scaledCap(15, pLen));
}

function extractNavigationItems(prompt: string): string[] {
  const items = new Set<string>();
  const lower = prompt.toLowerCase();

  NAV_ITEM_PATTERN.lastIndex = 0;
  let navMatch;
  while ((navMatch = NAV_ITEM_PATTERN.exec(lower)) !== null) {
    const block = navMatch[1];
    BULLET_PATTERN.lastIndex = 0;
    let bMatch;
    while ((bMatch = BULLET_PATTERN.exec(block)) !== null) {
      const item = bMatch[1].trim();
      if (item.length > 1 && item.length < 40) {
        items.add(item);
      }
    }
  }

  return [...items];
}

export function extractFullWorkflows(prompt: string): ExtractedWorkflowData {
  const pLen = prompt.length;

  return {
    users: extractUsers(prompt),
    primary_tasks: extractTasks(prompt, pLen),
    system_features: extractFeatures(prompt, pLen),
    required_interfaces: extractRequiredInterfaces(prompt, pLen),
    data_entities: extractDataEntities(prompt, pLen),
    page_structures: extractPageStructures(prompt, pLen),
    navigation_items: extractNavigationItems(prompt),
  };
}
