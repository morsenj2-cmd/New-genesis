export interface DomainCluster {
  core: string[];
  actions: string[];
  objects: string[];
  qualities: string[];
  roles: string[];
}

export const DOMAIN_VOCABULARY: Record<string, DomainCluster> = {
  finance: {
    core: ["payments", "compliance", "transactions", "infrastructure", "settlement", "ledger", "financial operations", "automation", "bank integrations", "fintech", "banking", "capital", "treasury", "fiscal", "monetary"],
    actions: ["process", "settle", "transfer", "invest", "trade", "lend", "borrow", "underwrite", "reconcile", "audit", "automate", "manage", "monitor", "optimize", "secure", "verify"],
    objects: ["payment", "transaction", "account", "ledger", "portfolio", "fund", "deposit", "loan", "credit", "debit", "wire", "invoice", "receipt", "balance", "statement", "asset", "liability", "currency", "stock", "bond", "derivative", "equity"],
    qualities: ["compliant", "secure", "real-time", "institutional", "regulatory", "transparent", "traceable", "auditable", "scalable", "reliable", "trusted", "enterprise-grade", "high-throughput"],
    roles: ["CFO", "treasurer", "compliance officer", "risk analyst", "portfolio manager", "banker", "auditor", "controller", "investor", "trader", "fund manager", "financial advisor"],
  },
  energy: {
    core: ["grid", "renewable", "infrastructure", "power generation", "utilities", "sustainability", "transmission", "distribution", "capacity", "efficiency", "carbon", "emissions"],
    actions: ["generate", "distribute", "transmit", "store", "monitor", "optimize", "deploy", "install", "maintain", "commission", "decommission", "balance", "forecast", "curtail", "dispatch"],
    objects: ["turbine", "solar panel", "substation", "transformer", "inverter", "battery", "grid", "plant", "pipeline", "well", "reactor", "farm", "array", "capacity", "load", "demand", "supply", "kilowatt", "megawatt", "gigawatt"],
    qualities: ["renewable", "sustainable", "clean", "reliable", "resilient", "efficient", "high-capacity", "industrial-scale", "carbon-neutral", "zero-emission", "dispatchable", "baseload"],
    roles: ["grid operator", "plant manager", "energy engineer", "sustainability officer", "utility director", "project developer", "site supervisor"],
  },
  healthcare: {
    core: ["patients", "care", "medical data", "clinical systems", "diagnostics", "treatment", "health outcomes", "compliance", "interoperability", "wellness", "prevention"],
    actions: ["diagnose", "treat", "monitor", "prescribe", "consult", "refer", "admit", "discharge", "triage", "screen", "vaccinate", "rehabilitate", "coordinate", "document", "comply"],
    objects: ["patient", "record", "chart", "prescription", "lab result", "imaging", "diagnosis", "procedure", "appointment", "referral", "claim", "formulary", "protocol", "pathway", "bed", "ward", "operating room"],
    qualities: ["clinical", "evidence-based", "HIPAA-compliant", "patient-centered", "interoperable", "secure", "certified", "accredited", "peer-reviewed", "trauma-informed"],
    roles: ["physician", "nurse", "surgeon", "pharmacist", "radiologist", "administrator", "care coordinator", "medical director", "patient advocate", "clinical researcher"],
  },
  education: {
    core: ["learning", "curriculum", "assessment", "pedagogy", "enrollment", "accreditation", "outcomes", "engagement", "retention", "competency", "instruction"],
    actions: ["teach", "learn", "assess", "enroll", "certify", "graduate", "tutor", "mentor", "evaluate", "grade", "lecture", "research", "publish", "collaborate", "accredit"],
    objects: ["course", "module", "lesson", "assignment", "quiz", "exam", "rubric", "syllabus", "transcript", "degree", "certificate", "classroom", "campus", "library", "lab", "textbook"],
    qualities: ["academic", "accredited", "research-driven", "student-centered", "inclusive", "evidence-based", "interactive", "personalized", "competency-based", "blended"],
    roles: ["student", "teacher", "professor", "dean", "registrar", "counselor", "librarian", "administrator", "researcher", "tutor"],
  },
  logistics: {
    core: ["supply chain", "shipping", "freight", "delivery", "tracking", "fulfillment", "distribution", "warehousing", "procurement", "inventory", "routing"],
    actions: ["ship", "deliver", "track", "route", "warehouse", "dispatch", "pick", "pack", "consolidate", "clear", "customs", "receive", "forward", "distribute", "procure"],
    objects: ["shipment", "container", "pallet", "package", "order", "manifest", "bill of lading", "warehouse", "dock", "fleet", "truck", "vessel", "aircraft", "route", "lane", "hub"],
    qualities: ["last-mile", "cross-border", "on-time", "traceable", "temperature-controlled", "expedited", "bonded", "multimodal", "asset-light", "demand-driven"],
    roles: ["logistics manager", "fleet operator", "warehouse supervisor", "freight broker", "supply chain analyst", "dispatch coordinator", "customs broker"],
  },
  retail: {
    core: ["commerce", "inventory", "checkout", "merchandising", "consumer", "brand", "omnichannel", "point of sale", "customer experience", "loyalty", "returns"],
    actions: ["sell", "buy", "merchandise", "promote", "display", "stock", "discount", "checkout", "return", "exchange", "browse", "order", "fulfill", "personalize", "recommend"],
    objects: ["product", "SKU", "catalog", "cart", "storefront", "shelf", "POS", "barcode", "receipt", "coupon", "loyalty card", "gift card", "display", "fixture", "brand"],
    qualities: ["omnichannel", "personalized", "frictionless", "data-driven", "customer-first", "mobile-first", "experiential", "curated", "premium", "mass-market"],
    roles: ["buyer", "merchandiser", "store manager", "brand manager", "e-commerce manager", "category manager", "visual merchandiser", "retail analyst"],
  },
  real_estate: {
    core: ["property", "listings", "valuation", "construction", "leasing", "development", "zoning", "mortgage", "occupancy", "portfolio", "asset management"],
    actions: ["list", "sell", "lease", "develop", "appraise", "inspect", "renovate", "build", "zone", "finance", "close", "manage", "tenant", "occupy", "invest"],
    objects: ["property", "building", "unit", "lot", "parcel", "lease", "deed", "mortgage", "appraisal", "floor plan", "blueprint", "permit", "contract", "escrow", "title"],
    qualities: ["prime", "turnkey", "mixed-use", "Class A", "sustainable", "LEED-certified", "smart", "transit-oriented", "luxury", "affordable", "pre-construction"],
    roles: ["broker", "agent", "developer", "property manager", "appraiser", "inspector", "architect", "contractor", "landlord", "tenant", "investor"],
  },
  legal: {
    core: ["contracts", "compliance", "litigation", "regulation", "governance", "intellectual property", "arbitration", "counsel", "due diligence", "precedent", "jurisprudence"],
    actions: ["advise", "litigate", "arbitrate", "draft", "negotiate", "file", "appeal", "settle", "comply", "enforce", "represent", "counsel", "review", "amend"],
    objects: ["contract", "clause", "agreement", "brief", "filing", "motion", "ruling", "statute", "regulation", "patent", "trademark", "license", "deposition", "injunction", "judgment"],
    qualities: ["compliant", "confidential", "privileged", "binding", "enforceable", "jurisdictional", "precedent-setting", "regulatory", "fiduciary", "adversarial"],
    roles: ["attorney", "counsel", "paralegal", "partner", "associate", "judge", "arbitrator", "mediator", "compliance officer", "general counsel", "litigator"],
  },
  consulting: {
    core: ["strategy", "transformation", "advisory", "operations", "change management", "performance", "optimization", "capability", "governance", "implementation"],
    actions: ["advise", "assess", "transform", "optimize", "implement", "restructure", "benchmark", "diagnose", "recommend", "design", "deliver", "facilitate", "coach", "align"],
    objects: ["strategy", "roadmap", "assessment", "framework", "model", "methodology", "engagement", "deliverable", "workstream", "initiative", "program", "benchmark", "KPI", "OKR"],
    qualities: ["strategic", "data-driven", "actionable", "evidence-based", "outcome-oriented", "cross-functional", "scalable", "sustainable", "agile", "independent"],
    roles: ["consultant", "strategist", "analyst", "partner", "principal", "director", "engagement manager", "subject matter expert", "transformation lead"],
  },
  technology: {
    core: ["software", "platform", "infrastructure", "API", "cloud", "data", "architecture", "scalability", "security", "integration", "automation", "DevOps"],
    actions: ["build", "deploy", "scale", "integrate", "automate", "monitor", "develop", "test", "release", "migrate", "containerize", "orchestrate", "provision", "debug"],
    objects: ["application", "service", "API", "database", "server", "container", "pipeline", "repository", "endpoint", "microservice", "cluster", "instance", "module", "SDK"],
    qualities: ["scalable", "cloud-native", "open-source", "serverless", "real-time", "distributed", "fault-tolerant", "high-availability", "low-latency", "extensible"],
    roles: ["developer", "engineer", "architect", "DevOps engineer", "SRE", "product manager", "CTO", "tech lead", "data scientist", "security engineer"],
  },
  manufacturing: {
    core: ["production", "quality control", "assembly", "automation", "throughput", "lean", "six sigma", "supply", "OEE", "maintenance", "tooling"],
    actions: ["manufacture", "assemble", "inspect", "calibrate", "maintain", "automate", "tool", "fabricate", "weld", "machine", "cast", "mold", "test", "certify", "ship"],
    objects: ["part", "component", "assembly", "tooling", "fixture", "die", "mold", "conveyor", "robot", "sensor", "PLC", "batch", "lot", "BOM", "work order", "inspection report"],
    qualities: ["precision", "ISO-certified", "lean", "just-in-time", "lights-out", "high-volume", "custom", "CNC", "additive", "Industry 4.0", "smart factory"],
    roles: ["plant manager", "quality engineer", "production supervisor", "maintenance technician", "process engineer", "tool maker", "industrial engineer", "supply chain manager"],
  },
  media: {
    core: ["content", "publishing", "distribution", "audience", "engagement", "monetization", "editorial", "broadcast", "streaming", "creative", "production"],
    actions: ["publish", "broadcast", "stream", "edit", "produce", "distribute", "monetize", "curate", "syndicate", "commission", "schedule", "archive", "license"],
    objects: ["article", "video", "podcast", "show", "channel", "feed", "newsletter", "ad", "campaign", "asset", "rights", "subscriber", "viewer", "audience", "playlist"],
    qualities: ["viral", "on-demand", "live", "premium", "ad-supported", "subscriber-driven", "editorial", "algorithmic", "personalized", "cross-platform"],
    roles: ["editor", "producer", "journalist", "creator", "publisher", "director", "content strategist", "audience manager", "ad sales director"],
  },
  telecom: {
    core: ["network", "connectivity", "bandwidth", "spectrum", "coverage", "latency", "throughput", "subscriber", "roaming", "handoff", "provisioning"],
    actions: ["connect", "provision", "route", "switch", "transmit", "multiplex", "modulate", "amplify", "terminate", "peer", "handoff", "roam", "bill", "throttle"],
    objects: ["tower", "antenna", "fiber", "switch", "router", "modem", "SIM", "spectrum", "frequency", "channel", "cell", "backhaul", "core network", "RAN", "OSS", "BSS"],
    qualities: ["carrier-grade", "low-latency", "high-bandwidth", "5G", "fiber-optic", "redundant", "fault-tolerant", "always-on", "nationwide", "global"],
    roles: ["network engineer", "field technician", "NOC analyst", "spectrum manager", "RF engineer", "OSS architect", "subscriber manager"],
  },
  government: {
    core: ["public services", "citizen engagement", "transparency", "governance", "compliance", "security clearance", "procurement", "regulation", "policy", "civic"],
    actions: ["serve", "regulate", "procure", "enforce", "administer", "legislate", "adjudicate", "fund", "inspect", "audit", "report", "classify", "authorize", "certify"],
    objects: ["permit", "license", "form", "regulation", "policy", "budget", "grant", "contract", "case", "record", "clearance", "document", "census", "election", "legislation"],
    qualities: ["transparent", "accountable", "secure", "classified", "citizen-facing", "interagency", "FedRAMP", "508-compliant", "mission-critical", "sovereign"],
    roles: ["civil servant", "administrator", "analyst", "inspector", "director", "commissioner", "officer", "clerk", "legislator", "auditor"],
  },
  automotive: {
    core: ["mobility", "vehicle", "fleet", "EV", "autonomous", "telematics", "connectivity", "powertrain", "safety", "emissions", "ADAS"],
    actions: ["drive", "manufacture", "assemble", "diagnose", "maintain", "charge", "retrofit", "inspect", "recall", "test", "certify", "homologate", "connect"],
    objects: ["vehicle", "engine", "battery", "motor", "sensor", "ECU", "dashboard", "chassis", "body", "tire", "VIN", "OBD", "charger", "station", "fleet"],
    qualities: ["electric", "autonomous", "connected", "hybrid", "zero-emission", "lightweight", "aerodynamic", "crash-tested", "OEM", "aftermarket", "SAE Level"],
    roles: ["engineer", "technician", "fleet manager", "dealer", "OEM partner", "EV specialist", "diagnostics technician"],
  },
  agriculture: {
    core: ["crop", "livestock", "yield", "soil", "irrigation", "harvest", "precision farming", "sustainability", "food safety", "agronomics", "season"],
    actions: ["plant", "harvest", "irrigate", "fertilize", "spray", "rotate", "monitor", "forecast", "graze", "breed", "process", "store", "test", "certify"],
    objects: ["field", "crop", "seed", "fertilizer", "pesticide", "tractor", "combine", "silo", "greenhouse", "sensor", "drone", "sample", "yield", "soil", "water"],
    qualities: ["organic", "sustainable", "precision", "regenerative", "GPS-guided", "data-driven", "certified", "rain-fed", "irrigated", "high-yield", "non-GMO"],
    roles: ["farmer", "agronomist", "rancher", "food scientist", "extension agent", "farm manager", "sustainability officer", "quality inspector"],
  },
  hospitality: {
    core: ["guest experience", "booking", "accommodation", "dining", "event", "hospitality", "service", "tourism", "revenue management", "occupancy"],
    actions: ["book", "reserve", "check in", "check out", "serve", "host", "cater", "accommodate", "tour", "guide", "entertain", "curate", "upsell"],
    objects: ["room", "suite", "table", "reservation", "menu", "venue", "event", "guest", "review", "rate", "amenity", "spa", "pool", "lobby", "concierge"],
    qualities: ["luxury", "boutique", "all-inclusive", "five-star", "pet-friendly", "eco-friendly", "award-winning", "beachfront", "urban", "resort-style"],
    roles: ["general manager", "front desk agent", "concierge", "chef", "event planner", "housekeeper", "revenue manager", "guest relations"],
  },
  construction: {
    core: ["building", "site", "project management", "safety", "compliance", "blueprint", "engineering", "materials", "structural", "civil"],
    actions: ["build", "excavate", "pour", "frame", "wire", "plumb", "inspect", "survey", "demolish", "grade", "pave", "install", "commission", "certify"],
    objects: ["site", "foundation", "structure", "beam", "column", "slab", "rebar", "concrete", "steel", "crane", "scaffold", "permit", "blueprint", "schedule", "RFI"],
    qualities: ["structural", "load-bearing", "seismic", "fireproof", "OSHA-compliant", "LEED", "modular", "prefabricated", "reinforced", "sustainable"],
    roles: ["project manager", "foreman", "site engineer", "architect", "estimator", "safety officer", "superintendent", "subcontractor"],
  },
};

export function getDomainVocabulary(industry: string): DomainCluster {
  return DOMAIN_VOCABULARY[industry] ?? DOMAIN_VOCABULARY.technology;
}

export function getAllDomainWords(industry: string): Set<string> {
  const cluster = getDomainVocabulary(industry);
  const words = new Set<string>();
  for (const list of [cluster.core, cluster.actions, cluster.objects, cluster.qualities, cluster.roles]) {
    for (const term of list) {
      words.add(term.toLowerCase());
      for (const word of term.toLowerCase().split(/\s+/)) {
        if (word.length > 2) words.add(word);
      }
    }
  }
  return words;
}

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "can", "could", "must", "need",
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "it",
  "they", "them", "their", "its", "this", "that", "these", "those",
  "of", "in", "to", "for", "with", "on", "at", "by", "from", "as",
  "into", "through", "during", "before", "after", "above", "below",
  "between", "under", "over", "about", "up", "down", "out", "off",
  "and", "but", "or", "nor", "not", "no", "so", "if", "than", "too",
  "very", "just", "also", "only", "then", "now", "here", "there",
  "when", "where", "how", "what", "which", "who", "whom", "why",
  "all", "each", "every", "both", "few", "more", "most", "other",
  "some", "such", "any", "many", "much", "own", "am",
  "create", "build", "make", "design", "generate", "please",
  "want", "like", "website", "site", "page", "web", "app",
]);

const VERB_SUFFIXES = ["ing", "tion", "sion", "ment", "ance", "ence", "ize", "ise", "ate", "ify"];
const NOUN_SUFFIXES = ["ness", "ity", "ism", "ist", "ery", "ory", "ary", "ure", "age", "dom", "ship", "hood", "ling", "let"];
const ADJ_SUFFIXES = ["ous", "ive", "ful", "less", "able", "ible", "ical", "ial", "ent", "ant"];

function classifyWord(word: string): "noun" | "verb" | "adjective" | "unknown" {
  const lower = word.toLowerCase();
  for (const s of VERB_SUFFIXES) {
    if (lower.endsWith(s) && lower.length > s.length + 2) return "verb";
  }
  for (const s of ADJ_SUFFIXES) {
    if (lower.endsWith(s) && lower.length > s.length + 2) return "adjective";
  }
  for (const s of NOUN_SUFFIXES) {
    if (lower.endsWith(s) && lower.length > s.length + 2) return "noun";
  }
  if (lower.endsWith("s") && !lower.endsWith("ss") && lower.length > 3) return "noun";
  if (lower.endsWith("er") && lower.length > 3) return "noun";
  return "unknown";
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(t => t.length > 0);
}

function extractMeaningfulTokens(text: string): string[] {
  return tokenize(text).filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

function extractNGrams(tokens: string[], n: number): string[] {
  const result: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    const gram = tokens.slice(i, i + n).join(" ");
    result.push(gram);
  }
  return result;
}

export function extractDynamicVocabulary(prompt: string, industry: string): DomainCluster {
  const hasDirectMatch = industry in DOMAIN_VOCABULARY;
  const baseVocab = getDomainVocabulary(industry);
  const tokens = extractMeaningfulTokens(prompt);

  const nouns = tokens.filter(t => {
    const cls = classifyWord(t);
    return cls === "noun" || cls === "unknown";
  });
  const verbs = tokens.filter(t => classifyWord(t) === "verb");
  const adjectives = tokens.filter(t => classifyWord(t) === "adjective");

  const bigrams = extractNGrams(tokens, 2).filter(bg => {
    const parts = bg.split(" ");
    return parts.every(p => !STOP_WORDS.has(p) && p.length > 2);
  });
  const trigrams = extractNGrams(tokens, 3).filter(tg => {
    const parts = tg.split(" ");
    return parts.every(p => !STOP_WORDS.has(p) && p.length > 2);
  });

  const dynamicCore = new Set<string>(hasDirectMatch ? baseVocab.core : []);
  const dynamicActions = new Set<string>(hasDirectMatch ? baseVocab.actions : []);
  const dynamicObjects = new Set<string>(hasDirectMatch ? baseVocab.objects : []);
  const dynamicQualities = new Set<string>(hasDirectMatch ? baseVocab.qualities : []);
  const dynamicRoles = new Set<string>(hasDirectMatch ? baseVocab.roles : []);

  for (const noun of nouns) {
    if (noun.length > 3) {
      dynamicObjects.add(noun);
    }
  }

  for (const verb of verbs) {
    if (verb.length > 3) {
      dynamicActions.add(verb);
    }
  }

  for (const adj of adjectives) {
    if (adj.length > 3) {
      dynamicQualities.add(adj);
    }
  }

  for (const bg of bigrams) {
    dynamicCore.add(bg);
  }

  for (const tg of trigrams) {
    dynamicCore.add(tg);
  }

  const rolePatterns = [
    /\b([\w]+(?:\s[\w]+)?)\s+(?:manager|director|specialist|analyst|coordinator|officer|engineer|consultant|advisor|technician|supervisor|researcher|scientist|expert|practitioner|therapist|instructor|owner)\b/gi,
  ];
  for (const pattern of rolePatterns) {
    let match;
    while ((match = pattern.exec(prompt)) !== null) {
      if (match[0] && match[0].length < 40) {
        dynamicRoles.add(match[0].toLowerCase());
      }
    }
  }

  const servicePatterns = [
    /(?:platform|tool|service|software|system|solution)\s+(?:for|to)\s+([\w\s]+?)(?:\.|,|$)/gi,
    /(?:specializ(?:ing|es?)|focused?\s+(?:on|in)|dedicated\s+to)\s+([\w\s]+?)(?:\.|,|$)/gi,
  ];
  for (const pattern of servicePatterns) {
    let match;
    while ((match = pattern.exec(prompt)) !== null) {
      if (match[1] && match[1].trim().length > 3 && match[1].trim().length < 50) {
        const service = match[1].trim().toLowerCase();
        dynamicCore.add(service);
        for (const word of service.split(/\s+/)) {
          if (word.length > 3 && !STOP_WORDS.has(word)) {
            dynamicObjects.add(word);
          }
        }
      }
    }
  }

  return {
    core: Array.from(dynamicCore).slice(0, 25),
    actions: Array.from(dynamicActions).slice(0, 25),
    objects: Array.from(dynamicObjects).slice(0, 30),
    qualities: Array.from(dynamicQualities).slice(0, 20),
    roles: Array.from(dynamicRoles).slice(0, 15),
  };
}
