import { tokenize } from "../model/tokenizer";

export interface InternetSource {
  title: string;
  url: string;
  snippet: string;
  queryStrategy: string;
}

export interface InternetContext {
  prompt: string;
  domain: string;
  industry: string;
  concepts: string[];
  workflows: string[];
  entities: string[];
  userTasks: string[];
  interfacePatterns: string[];
  sources: InternetSource[];
  confidence: number;
  retrievalTimestamp: number;
}

interface ExtractedSeeds {
  coreEntities: string[];
  concepts: string[];
  industries: string[];
  tasks: string[];
}

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  healthcare: ["hospital", "clinic", "medical", "health", "patient", "doctor", "pharmacy", "diagnosis", "telemedicine"],
  finance: ["bank", "investment", "trading", "stock", "crypto", "wallet", "fintech", "insurance", "loan", "accounting"],
  education: ["school", "university", "course", "student", "teacher", "learning", "classroom", "curriculum", "tutoring"],
  logistics: ["shipping", "delivery", "warehouse", "supply chain", "freight", "fleet", "tracking", "fulfillment"],
  real_estate: ["property", "listing", "rental", "lease", "tenant", "landlord", "housing", "mortgage", "realtor"],
  food_service: ["restaurant", "food", "menu", "recipe", "cooking", "kitchen", "dining", "cafe", "catering"],
  ecommerce: ["shop", "store", "cart", "checkout", "product", "catalog", "order", "marketplace", "retail"],
  fitness: ["gym", "workout", "exercise", "training", "sport", "wellness", "nutrition"],
  travel: ["hotel", "booking", "flight", "destination", "tourism", "vacation", "reservation"],
  construction: ["building", "architecture", "blueprint", "contractor", "renovation", "project"],
  legal: ["law", "attorney", "court", "contract", "compliance", "regulation"],
  entertainment: ["music", "audio", "recording", "studio", "playlist", "streaming", "podcast", "video", "gaming"],
  agriculture: ["farm", "crop", "livestock", "harvest", "soil", "irrigation", "agtech"],
  hr: ["employee", "hiring", "recruitment", "payroll", "onboarding", "talent", "hr"],
  crm: ["customer", "lead", "pipeline", "sales", "contact", "opportunity", "deal"],
  project_management: ["task", "project", "kanban", "sprint", "agile", "scrum", "milestone", "timeline"],
};

const TASK_VERBS = new Set([
  "manage", "create", "build", "track", "monitor", "view", "edit", "update",
  "delete", "add", "assign", "schedule", "approve", "submit", "send",
  "upload", "download", "share", "export", "import", "filter", "search",
  "browse", "publish", "archive", "book", "reserve", "order", "pay",
  "register", "configure", "analyze", "report", "notify", "review",
  "rate", "compare", "calculate", "generate", "automate", "integrate",
  "deploy", "test", "log", "audit", "invite", "collaborate",
]);

function extractSeeds(prompt: string): ExtractedSeeds {
  const { meaningful } = tokenize(prompt);
  const lower = prompt.toLowerCase();

  const coreEntities: string[] = [];
  const concepts: string[] = [];
  const industries: string[] = [];
  const tasks: string[] = [];

  for (const token of meaningful) {
    const word = token.normalized;
    if (TASK_VERBS.has(word)) {
      tasks.push(word);
    } else if (word.length > 3) {
      coreEntities.push(word);
    }
  }

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    const matchCount = keywords.filter(kw => lower.includes(kw)).length;
    if (matchCount >= 2 || (matchCount === 1 && keywords.some(kw => kw.length > 5 && lower.includes(kw)))) {
      industries.push(industry);
    }
  }

  const phrases = lower.split(/[,;.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
  for (const phrase of phrases) {
    if (phrase.split(/\s+/).length >= 2 && phrase.split(/\s+/).length <= 5) {
      concepts.push(phrase);
    }
  }

  return {
    coreEntities: [...new Set(coreEntities)].slice(0, 15),
    concepts: [...new Set(concepts)].slice(0, 10),
    industries: [...new Set(industries)].slice(0, 3),
    tasks: [...new Set(tasks)].slice(0, 10),
  };
}

function buildSearchQueries(prompt: string, seeds: ExtractedSeeds): Array<{ query: string; strategy: string }> {
  const queries: Array<{ query: string; strategy: string }> = [];

  const domainHint = seeds.industries[0] || seeds.coreEntities.slice(0, 3).join(" ");

  queries.push({
    query: `${domainHint} software system typical features components UI patterns`,
    strategy: "domain_patterns",
  });

  if (seeds.industries.length > 0) {
    queries.push({
      query: `${seeds.industries[0]} industry software workflows and user roles`,
      strategy: "industry_workflows",
    });
  }

  if (seeds.coreEntities.length >= 2) {
    queries.push({
      query: `${seeds.coreEntities.slice(0, 4).join(" ")} application best practices user interface`,
      strategy: "entity_documentation",
    });
  }

  if (seeds.tasks.length > 0) {
    const taskHint = seeds.tasks.slice(0, 3).join(", ");
    queries.push({
      query: `web application features for ${taskHint} ${domainHint}`,
      strategy: "task_features",
    });
  }

  const promptWords = prompt.split(/\s+/).slice(0, 30).join(" ");
  queries.push({
    query: `${promptWords} software platform explanation`,
    strategy: "direct_prompt",
  });

  return queries.slice(0, 5);
}

function parseSearchAnswer(answer: string): {
  concepts: string[];
  workflows: string[];
  entities: string[];
  interfacePatterns: string[];
} {
  const words = answer.toLowerCase().split(/[\s,;.!?():\-\u2013\u2014]+/).filter(w => w.length > 3);
  const unique = [...new Set(words)];

  const conceptSeeds = ["management", "tracking", "processing", "system", "platform", "service", "integration", "automation", "analysis", "monitoring"];
  const workflowSeeds = ["process", "workflow", "pipeline", "flow", "cycle", "procedure", "step", "stage", "phase"];
  const entitySeeds = ["user", "account", "record", "item", "data", "resource", "object", "module", "component"];
  const uiSeeds = ["dashboard", "form", "table", "list", "card", "chart", "calendar", "map", "grid", "panel", "view", "page", "widget"];

  const concepts = unique.filter(w => conceptSeeds.some(s => w.includes(s) || s.includes(w))).slice(0, 12);
  const workflows = unique.filter(w => workflowSeeds.some(s => w.includes(s) || s.includes(w))).slice(0, 8);
  const entities = unique.filter(w => entitySeeds.some(s => w.includes(s) || s.includes(w))).slice(0, 10);
  const interfacePatterns = unique.filter(w => uiSeeds.some(s => w.includes(s) || s.includes(w))).slice(0, 8);

  return { concepts, workflows, entities, interfacePatterns };
}

interface SearchResult {
  searchAnswer?: string;
  resultPages?: Array<{ title: string; url: string }>;
}

async function performSearch(_query: string): Promise<SearchResult | null> {
  return null;
}

export async function retrieveInternetContext(prompt: string): Promise<InternetContext> {
  const seeds = extractSeeds(prompt);
  const queries = buildSearchQueries(prompt, seeds);

  const allSources: InternetSource[] = [];
  const allConcepts: string[] = [...seeds.concepts];
  const allWorkflows: string[] = [];
  const allEntities: string[] = [...seeds.coreEntities];
  const allTasks: string[] = [...seeds.tasks];
  const allInterfacePatterns: string[] = [];
  let totalConfidence = 0.2;

  const searchPromises = queries.map(async (q) => {
    const result = await performSearch(q.query);
    return { query: q, result };
  });

  const searchResults = await Promise.all(searchPromises);

  for (const { query, result } of searchResults) {
    if (!result) continue;

    if (result.resultPages) {
      for (const page of result.resultPages.slice(0, 3)) {
        allSources.push({
          title: page.title || "",
          url: page.url || "",
          snippet: result.searchAnswer?.slice(0, 200) || "",
          queryStrategy: query.strategy,
        });
      }
    }

    if (result.searchAnswer) {
      const parsed = parseSearchAnswer(result.searchAnswer);
      allConcepts.push(...parsed.concepts);
      allWorkflows.push(...parsed.workflows);
      allEntities.push(...parsed.entities);
      allInterfacePatterns.push(...parsed.interfacePatterns);
      totalConfidence += 0.15;
    }
  }

  const successfulSearches = searchResults.filter(r => r.result?.searchAnswer).length;
  const confidence = Math.min(0.95, totalConfidence + successfulSearches * 0.05);

  const domain = seeds.industries[0] || inferDomainFromResults(allConcepts, allEntities) || "general";
  const industry = seeds.industries[0] || domain;

  return {
    prompt,
    domain,
    industry,
    concepts: dedup(allConcepts).slice(0, 20),
    workflows: dedup(allWorkflows).slice(0, 12),
    entities: dedup(allEntities).slice(0, 15),
    userTasks: dedup(allTasks).slice(0, 12),
    interfacePatterns: dedup(allInterfacePatterns).slice(0, 10),
    sources: allSources.slice(0, 15),
    confidence,
    retrievalTimestamp: Date.now(),
  };
}

function inferDomainFromResults(concepts: string[], entities: string[]): string | null {
  const combined = [...concepts, ...entities].join(" ").toLowerCase();
  let bestMatch: string | null = null;
  let bestCount = 0;

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    const count = keywords.filter(kw => combined.includes(kw)).length;
    if (count > bestCount) {
      bestCount = count;
      bestMatch = industry;
    }
  }

  return bestCount >= 2 ? bestMatch : null;
}

function dedup(arr: string[]): string[] {
  return [...new Set(arr.map(s => s.trim()).filter(s => s.length > 0))];
}
