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
