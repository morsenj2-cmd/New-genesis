import type { FeatureItem, StatItem, TestimonialItem, ProductContent } from "./contentGenerator";

// ── Context Graph ──────────────────────────────────────────────────────────────

export interface ContextGraph {
  industry: string;
  companyType: string | null;
  audience: string[];
  descriptors: string[];
  services: string[];
  tone: "enterprise" | "consumer" | "technical" | "startup";
}

// ── Industry signal keywords ───────────────────────────────────────────────────

const INDUSTRY_SIGNALS: [string, string[]][] = [
  ["energy",          ["energy", "power", "electricity", "grid", "renewable", "solar", "wind", "nuclear", "oil", "gas", "petroleum", "utility", "utilities", "fuel", "hydro", "geothermal", "clean energy"]],
  ["healthcare",      ["health", "healthcare", "medical", "hospital", "clinic", "patient", "doctor", "physician", "pharma", "pharmaceutical", "biotech", "therapy", "treatment", "clinical", "wellness", "telehealth", "radiology", "diagnostics"]],
  ["finance",         ["finance", "financial", "bank", "banking", "investment", "fintech", "payment", "payments", "lending", "credit", "insurance", "wealth", "trading", "capital", "mortgage", "fund", "portfolio", "treasury", "accounting", "audit", "tax"]],
  ["education",       ["education", "school", "university", "college", "learning", "e-learning", "course", "curriculum", "student", "teacher", "classroom", "tutoring", "edtech", "academy", "training", "certification", "skill", "study"]],
  ["logistics",       ["logistics", "supply chain", "shipping", "freight", "delivery", "transport", "transportation", "warehouse", "fleet", "cargo", "distribution", "fulfilment", "fulfillment", "tracking", "courier", "last mile", "procurement"]],
  ["retail",          ["retail", "store", "shop", "merchandise", "brand", "consumer goods", "fashion", "apparel", "grocery", "supermarket", "outlet", "franchise", "point of sale", "pos", "inventory", "checkout"]],
  ["real_estate",     ["real estate", "property", "realty", "housing", "apartment", "commercial property", "mortgage", "lease", "landlord", "tenant", "renter", "broker", "listing", "construction", "development", "architecture", "building"]],
  ["legal",           ["legal", "law", "lawyer", "attorney", "firm", "contract", "compliance", "regulation", "litigation", "ip", "intellectual property", "gdpr", "privacy", "court", "arbitration", "counsel", "paralegal"]],
  ["hospitality",     ["hotel", "hospitality", "restaurant", "food", "catering", "travel", "tourism", "booking", "reservation", "accommodation", "event", "venue", "entertainment", "bar", "cafe", "resort", "spa", "leisure"]],
  ["construction",    ["construction", "engineering", "infrastructure", "civil", "architecture", "contractor", "builder", "renovation", "project management", "site", "structural", "mechanical", "electrical", "hvac", "industrial"]],
  ["manufacturing",   ["manufacturing", "factory", "production", "assembly", "industrial", "plant", "machinery", "automation", "robotics", "quality control", "iso", "lean", "six sigma", "supply", "component", "fabrication"]],
  ["media",           ["media", "publishing", "content", "journalism", "broadcast", "streaming", "podcast", "studio", "creative", "advertising", "marketing agency", "pr", "design agency", "film", "animation", "photography"]],
  ["agriculture",     ["agriculture", "farming", "crop", "livestock", "agritech", "agtech", "soil", "harvest", "irrigation", "precision farming", "greenhouse", "organic", "food production", "agricultural"]],
  ["government",      ["government", "public sector", "municipal", "civic", "federal", "state", "city", "department", "agency", "regulatory", "nonprofit", "ngo", "charity", "foundation", "public services"]],
  ["consulting",      ["consulting", "advisory", "strategy", "management consulting", "professional services", "staffing", "recruitment", "outsourcing", "business intelligence", "transformation", "change management"]],
  ["telecom",         ["telecom", "telecommunications", "network", "connectivity", "broadband", "5g", "wireless", "carrier", "isp", "internet provider", "fiber", "infrastructure", "cellular", "mobile network"]],
  ["automotive",      ["automotive", "vehicle", "car", "truck", "fleet", "dealership", "auto", "mobility", "ev", "electric vehicle", "autonomous", "connected car", "telematics"]],
];

function detectIndustry(text: string): string {
  const lower = text.toLowerCase();
  for (const [industry, signals] of INDUSTRY_SIGNALS) {
    if (signals.some(s => lower.includes(s))) return industry;
  }
  return "technology";
}

const DESCRIPTOR_LIST = [
  "multinational", "global", "international", "enterprise", "large-scale",
  "renewable", "sustainable", "green", "clean", "eco-friendly",
  "advanced", "innovative", "cutting-edge", "next-generation", "next generation",
  "secure", "compliant", "regulated", "certified",
  "digital", "smart", "automated", "ai-powered", "ai powered", "data-driven",
  "fast", "real-time", "scalable", "cloud-native",
  "community-driven", "open-source", "collaborative",
  "affordable", "transparent", "trusted",
];

function extractDescriptors(text: string): string[] {
  const lower = text.toLowerCase();
  return DESCRIPTOR_LIST.filter(d => lower.includes(d));
}

const AUDIENCE_SIGNALS: [string, string[]][] = [
  ["enterprise clients",  ["enterprise", "large enterprise", "fortune 500", "corporate", "large company", "large companies"]],
  ["government agencies", ["government", "federal", "state agency", "municipal", "public sector"]],
  ["healthcare providers",["hospitals", "clinics", "healthcare providers", "medical institutions"]],
  ["small businesses",    ["small business", "smb", "sme", "startup", "small company"]],
  ["developers",          ["developers", "engineers", "software teams", "dev teams"]],
  ["consumers",           ["consumers", "individuals", "users", "people", "customers"]],
  ["investors",           ["investors", "fund managers", "portfolio managers"]],
  ["remote teams",        ["remote teams", "distributed teams", "remote workers"]],
  ["students",            ["students", "learners", "academic", "universities"]],
  ["retailers",           ["retailers", "merchants", "store owners", "e-commerce businesses"]],
];

function extractAudience(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [audience, signals] of AUDIENCE_SIGNALS) {
    if (signals.some(s => lower.includes(s))) found.push(audience);
  }
  if (found.length === 0) {
    const m = lower.match(/\bfor\s+((?:(?!and\s|to\s|that\s|which\s)[^\.,]){3,40})/);
    if (m) found.push(m[1].trim());
  }
  return found;
}

function detectTone(text: string, industry: string): ContextGraph["tone"] {
  const lower = text.toLowerCase();
  if (["government", "legal", "finance", "healthcare"].includes(industry)) return "enterprise";
  if (lower.match(/\b(startup|agile|fast.?moving|indie|lean|bootstrapped)\b/)) return "startup";
  if (["energy", "manufacturing", "construction", "telecom", "logistics"].includes(industry)) return "enterprise";
  if (lower.match(/\b(developer|api|sdk|open.?source|code|engineering)\b/)) return "technical";
  return "consumer";
}

export function extractContextGraph(prompt: string, productType?: string | null): ContextGraph {
  const industry = detectIndustry(prompt);
  const descriptors = extractDescriptors(prompt);
  const audience = extractAudience(prompt);
  const tone = detectTone(prompt, industry);

  const lower = prompt.toLowerCase();
  const companyTypeMatch = lower.match(/\b(company|firm|agency|organization|organisation|corporation|institute|group|platform|service|startup)\b/);

  return {
    industry,
    companyType: companyTypeMatch ? companyTypeMatch[1] : null,
    audience,
    descriptors,
    services: [],
    tone,
  };
}

// ── Industry content library ───────────────────────────────────────────────────

interface IndustryContent {
  headlines: string[];
  subheadlines: string[];
  enterpriseHeadlines: string[];
  ctaLabels: string[];
  secondaryCtaLabels: string[];
  ctaHeadlines: string[];
  ctaBodies: string[];
  featureGridTitles: string[];
  cardListTitles: string[];
  footerTaglines: string[];
  navLinks: string[];
  features: FeatureItem[];
  stats: StatItem[];
  testimonials: TestimonialItem[];
  aboutMission: string;
}

const INDUSTRY_LIBRARY: Record<string, IndustryContent> = {
  energy: {
    headlines: [
      "Powering the global energy infrastructure",
      "Engineering the future of sustainable power",
      "Energy solutions for a connected world",
      "Delivering reliable power at global scale",
    ],
    enterpriseHeadlines: [
      "Enterprise energy solutions for a changing world",
      "Reliable power infrastructure for governments and industry",
      "Global energy management at industrial scale",
    ],
    subheadlines: [
      "Delivering reliable, sustainable, and efficient energy solutions to governments and enterprises across the globe.",
      "From renewable generation to grid management — comprehensive energy services built for industrial and governmental clients.",
      "Advanced power infrastructure, renewable energy systems, and grid technology for the world's most demanding operations.",
    ],
    ctaLabels: ["Explore our solutions", "View our projects", "Contact our team", "Request a consultation"],
    secondaryCtaLabels: ["Learn more", "View case studies", "Download brochure", "See our infrastructure"],
    ctaHeadlines: ["Ready to transform your energy operations?", "Partner with a global energy leader", "Let's build the future of power together"],
    ctaBodies: ["Our team of energy engineers and project managers work with clients in over 60 countries. Talk to us about your energy infrastructure needs.", "From feasibility studies to full project delivery — we bring the expertise, scale, and commitment your energy project demands."],
    featureGridTitles: ["End-to-end energy solutions", "Our core capabilities", "Powering every sector"],
    cardListTitles: ["Industries we serve", "Our energy services", "Key infrastructure areas"],
    footerTaglines: ["Delivering reliable, sustainable energy solutions to the world's most critical operations."],
    navLinks: ["Solutions", "Projects", "About", "Contact"],
    features: [
      { icon: "broadcast", title: "Power infrastructure", description: "Design, construction, and operation of high-capacity power generation and transmission systems." },
      { icon: "grid", title: "Renewable energy", description: "Solar, wind, and hydro energy systems engineered for maximum output and long-term reliability." },
      { icon: "settings", title: "Grid technology", description: "Smart grid solutions that improve reliability, efficiency, and real-time monitoring of power distribution." },
      { icon: "filter", title: "Energy analytics", description: "Advanced monitoring and analytics to optimise consumption, reduce waste, and predict maintenance needs." },
      { icon: "play", title: "Industrial power", description: "Dedicated power supply solutions for manufacturing plants, refineries, and critical infrastructure." },
      { icon: "search", title: "Environmental compliance", description: "Full regulatory compliance services ensuring adherence to national and international environmental standards." },
    ],
    stats: [
      { icon: "broadcast", value: "60+", label: "Countries served" },
      { icon: "grid", value: "15 GW", label: "Capacity installed" },
      { icon: "settings", value: "98.7%", label: "Grid reliability" },
      { icon: "play", value: "40+", label: "Years of experience" },
    ],
    testimonials: [
      { text: "Their grid technology reduced our distribution losses by 22% in the first year. Exceptional engineering and on-site execution.", author: "Jonathan H.", role: "Director of Infrastructure, National Grid" },
      { text: "We engaged them for a 500MW renewable project across three sites. Delivered on time, on budget, and beyond specification.", author: "Maria S.", role: "VP Projects, Meridian Energy" },
      { text: "Their environmental compliance team saved us months of regulatory delays. Knowledgeable, thorough, and commercially aware.", author: "David K.", role: "Chief Operating Officer, Global Power Corp." },
    ],
    aboutMission: "We believe that access to reliable, sustainable energy is fundamental to human progress. We partner with governments, utilities, and industry to build the energy infrastructure that powers economies and protects the planet.",
  },

  healthcare: {
    headlines: [
      "Advancing patient care through innovation",
      "Healthcare technology built for clinical excellence",
      "Connecting patients with the care they need",
      "Modern infrastructure for better health outcomes",
    ],
    enterpriseHeadlines: [
      "Enterprise healthcare solutions for integrated care networks",
      "Clinical technology for health systems at scale",
    ],
    subheadlines: [
      "Delivering integrated clinical solutions that improve patient outcomes, streamline care delivery, and meet the highest standards of compliance.",
      "From electronic health records to telemedicine — comprehensive healthcare technology for hospitals, clinics, and health systems.",
      "Data-driven healthcare infrastructure that connects providers, patients, and payers across the continuum of care.",
    ],
    ctaLabels: ["Request a demo", "Talk to a specialist", "Explore our solutions", "Schedule a consultation"],
    secondaryCtaLabels: ["View case studies", "Download white paper", "Learn more", "See our platform"],
    ctaHeadlines: ["Ready to improve patient outcomes?", "Transform your care delivery model", "Speak with a healthcare technology specialist"],
    ctaBodies: ["Our clinical consultants and technology team work with hospitals and health systems of every size. Let us help you design the right solution.", "Whether you're managing a single clinic or a national health network, our platform scales to meet your clinical and operational needs."],
    featureGridTitles: ["Clinical capabilities at a glance", "Technology built for care", "Integrated healthcare solutions"],
    cardListTitles: ["Core clinical modules", "Our healthcare services", "Solutions by care setting"],
    footerTaglines: ["Technology that advances patient care and supports clinical excellence across every care setting."],
    navLinks: ["Solutions", "Specialties", "Research", "Contact"],
    features: [
      { icon: "broadcast", title: "Electronic health records", description: "Comprehensive EHR with structured clinical data, decision support, and seamless integration across care settings." },
      { icon: "play", title: "Telemedicine", description: "Secure video consultations, remote monitoring, and asynchronous messaging for modern patient engagement." },
      { icon: "grid", title: "Clinical analytics", description: "Population health analytics, outcome tracking, and predictive models to support evidence-based care decisions." },
      { icon: "settings", title: "Care coordination", description: "Multi-disciplinary care plans, referral management, and care pathway automation that reduce gaps in treatment." },
      { icon: "filter", title: "Compliance & security", description: "HIPAA-compliant infrastructure with role-based access, audit trails, and enterprise-grade data security." },
      { icon: "search", title: "Medical billing", description: "End-to-end revenue cycle management with automated coding, claims submission, and denial management." },
    ],
    stats: [
      { icon: "broadcast", value: "95%", label: "Patient satisfaction" },
      { icon: "grid", value: "2,000+", label: "Providers onboarded" },
      { icon: "settings", value: "HIPAA", label: "Certified compliant" },
      { icon: "play", value: "30%", label: "Admin time saved" },
    ],
    testimonials: [
      { text: "Implementing their EHR cut our documentation time by 40%. Our clinicians spend more time with patients and less with paperwork.", author: "Dr. Rachel F.", role: "Chief Medical Officer, Riverside Health" },
      { text: "The telemedicine platform handled 12,000 consultations in our first month alone. Robust, reliable, and easy for patients to use.", author: "Samuel O.", role: "Digital Health Director, Meridian Hospitals" },
      { text: "Their compliance team guided us through every regulatory requirement. We passed our audit with zero findings.", author: "Karen T.", role: "Privacy Officer, CareFirst Network" },
    ],
    aboutMission: "We believe every patient deserves access to excellent care, regardless of geography or circumstance. We build the technology that empowers healthcare providers to deliver better outcomes, more efficiently, for every person in their care.",
  },

  finance: {
    headlines: [
      "Financial services built for the modern economy",
      "Trusted financial infrastructure at global scale",
      "Powering the next generation of financial services",
      "Precision financial technology for discerning institutions",
    ],
    enterpriseHeadlines: [
      "Enterprise financial solutions for institutions and markets",
      "Institutional-grade financial infrastructure for complex operations",
    ],
    subheadlines: [
      "Delivering robust financial technology, compliance management, and payment infrastructure to banks, funds, and financial institutions worldwide.",
      "From payment processing to regulatory compliance — comprehensive financial solutions built for institutions that demand reliability.",
      "Advanced financial infrastructure that processes millions of transactions daily with institutional-grade security and resilience.",
    ],
    ctaLabels: ["Request a demo", "Speak to our team", "Explore our solutions", "Schedule a briefing"],
    secondaryCtaLabels: ["View case studies", "Download prospectus", "Learn more", "See our platform"],
    ctaHeadlines: ["Ready to modernise your financial operations?", "Partner with a trusted financial technology provider", "Transform your financial infrastructure today"],
    ctaBodies: ["Our financial technology specialists work with banks, asset managers, and fintechs across 40+ markets. Let's discuss your specific requirements.", "From core banking to capital markets infrastructure — we bring the technical depth and regulatory knowledge your institution demands."],
    featureGridTitles: ["Core financial capabilities", "Built for financial institutions", "Financial technology at scale"],
    cardListTitles: ["Our financial services", "Technology for every market", "Key compliance features"],
    footerTaglines: ["Institutional-grade financial technology trusted by banks, funds, and financial services firms worldwide."],
    navLinks: ["Solutions", "Markets", "Compliance", "Contact"],
    features: [
      { icon: "grid", title: "Payment processing", description: "High-throughput payment infrastructure supporting multiple rails, currencies, and settlement timeframes." },
      { icon: "filter", title: "Regulatory compliance", description: "Automated compliance workflows for AML, KYC, MiFID II, Basel III, and jurisdiction-specific regulations." },
      { icon: "broadcast", title: "Risk analytics", description: "Real-time credit, market, and operational risk monitoring with configurable alert thresholds." },
      { icon: "settings", title: "Core banking integration", description: "Seamless integration with major core banking systems via robust, well-documented APIs." },
      { icon: "search", title: "Transaction monitoring", description: "AI-powered transaction screening for fraud detection, suspicious activity, and sanction screening." },
      { icon: "play", title: "Reporting & audit", description: "Comprehensive regulatory and management reporting with full audit trail and data lineage." },
    ],
    stats: [
      { icon: "grid", value: "$1T+", label: "Transactions processed" },
      { icon: "broadcast", value: "99.99%", label: "System uptime" },
      { icon: "filter", value: "40+", label: "Regulatory frameworks" },
      { icon: "settings", value: "150+", label: "Institutions served" },
    ],
    testimonials: [
      { text: "Their compliance automation reduced our KYC processing time by 65%. Our operations team handled twice the volume with the same headcount.", author: "Elena R.", role: "Chief Compliance Officer, Meridian Bank" },
      { text: "The risk analytics platform detected a pattern our previous system had missed entirely. Within six weeks it had prevented three significant fraud events.", author: "Thomas B.", role: "Head of Risk, Apex Capital" },
      { text: "Integration with our core banking system took three weeks, not three months as we expected. The API quality is exceptional.", author: "Priya M.", role: "CTO, Nova Financial Services" },
    ],
    aboutMission: "Financial systems are the backbone of the global economy. We build the technology that keeps them running with precision, compliance, and resilience — so that institutions can focus on serving their clients with confidence.",
  },

  education: {
    headlines: [
      "Transforming education through technology",
      "Learning platforms built for student outcomes",
      "Modern learning infrastructure for every institution",
      "Empowering educators and learners at every level",
    ],
    enterpriseHeadlines: [
      "Enterprise education technology for institutions at scale",
      "Institutional learning management for universities and schools",
    ],
    subheadlines: [
      "Delivering comprehensive learning management, student analytics, and curriculum tools that help educators teach better and students achieve more.",
      "From course delivery to assessment and accreditation — a complete education technology platform built for modern institutions.",
      "Data-driven learning infrastructure that personalises the student experience and gives educators the insights they need.",
    ],
    ctaLabels: ["Request a demo", "Start your free trial", "Explore our platform", "Contact our team"],
    secondaryCtaLabels: ["View case studies", "See our features", "Learn more", "Schedule a walkthrough"],
    ctaHeadlines: ["Ready to transform your institution?", "Join thousands of educators and learners", "See what modern education looks like"],
    ctaBodies: ["Our education specialists work with schools, universities, and training organisations around the world. Let's discuss your curriculum and technology goals.", "Whether you're managing 200 students or 200,000 — our platform scales to meet your institutional needs."],
    featureGridTitles: ["Everything your institution needs", "Built for modern learning", "Education technology at scale"],
    cardListTitles: ["Core educational features", "Tools for educators", "Student success features"],
    footerTaglines: ["Empowering educators and learners with modern technology built for academic excellence."],
    navLinks: ["Platform", "Institutions", "Resources", "Contact"],
    features: [
      { icon: "play", title: "Learning management", description: "Deliver, manage, and track courses across any subject, department, or institution — all in one platform." },
      { icon: "broadcast", title: "Student analytics", description: "Track progress, identify at-risk students, and measure learning outcomes with detailed dashboards." },
      { icon: "grid", title: "Assessment tools", description: "Customisable quizzes, assignments, and proctored exams with automated grading and detailed feedback." },
      { icon: "settings", title: "Curriculum builder", description: "Design structured learning pathways with prerequisites, milestones, and competency mapping." },
      { icon: "filter", title: "Collaboration spaces", description: "Discussion boards, group projects, and peer review tools that build community and deepen understanding." },
      { icon: "search", title: "Accreditation support", description: "Built-in reporting and documentation tools designed to support accreditation and quality assurance processes." },
    ],
    stats: [
      { icon: "play", value: "5M+", label: "Active learners" },
      { icon: "broadcast", value: "92%", label: "Completion rate" },
      { icon: "grid", value: "800+", label: "Institutions" },
      { icon: "settings", value: "45%", label: "Better outcomes" },
    ],
    testimonials: [
      { text: "Our student completion rate went from 61% to 88% after switching. The engagement tools and early-alert analytics made all the difference.", author: "Prof. Linda C.", role: "Dean of Digital Learning, Westfield University" },
      { text: "Building and deploying new courses used to take months. Now our faculty can create a fully structured course in a few days.", author: "Marcus T.", role: "Head of Curriculum, Global Skills Academy" },
      { text: "The accreditation reporting module saved us over 200 staff hours preparing for our last review. The data was all there, structured exactly as the body required.", author: "Angela M.", role: "Quality Assurance Director, City College" },
    ],
    aboutMission: "We believe that access to high-quality education should not be limited by geography, budget, or circumstance. We build the tools that help educators deliver more, help students achieve more, and help institutions measure what actually matters.",
  },

  logistics: {
    headlines: [
      "Supply chain solutions for a complex world",
      "Logistics infrastructure built for reliability",
      "Moving goods efficiently across global networks",
      "End-to-end supply chain visibility and control",
    ],
    enterpriseHeadlines: [
      "Enterprise logistics technology for global supply chains",
      "Industrial-scale freight and distribution management",
    ],
    subheadlines: [
      "From warehouse management to last-mile delivery — comprehensive logistics technology that keeps your supply chain moving with precision.",
      "Real-time visibility, intelligent routing, and end-to-end tracking across the most complex global supply chains.",
      "Logistics solutions that reduce cost, increase speed, and give you complete control over every shipment.",
    ],
    ctaLabels: ["Get a quote", "Talk to logistics team", "Explore our platform", "Request a demo"],
    secondaryCtaLabels: ["View capabilities", "See our network", "Learn more", "Download overview"],
    ctaHeadlines: ["Ready to optimise your supply chain?", "Speak with a logistics specialist", "Transform your distribution operations"],
    ctaBodies: ["Our logistics technology and operations team serves clients across manufacturing, retail, and e-commerce. Tell us about your supply chain challenges.", "Whether you're moving 100 parcels or 100,000 pallets — our platform scales to meet your operational requirements."],
    featureGridTitles: ["Complete logistics capabilities", "Built for complex supply chains", "Every link in your chain"],
    cardListTitles: ["Our logistics services", "Key distribution features", "Supply chain modules"],
    footerTaglines: ["Precision logistics technology trusted by manufacturers, retailers, and distributors worldwide."],
    navLinks: ["Solutions", "Network", "Technology", "Contact"],
    features: [
      { icon: "broadcast", title: "Real-time tracking", description: "Live shipment tracking across all carriers, modes, and geographies with automatic status updates." },
      { icon: "grid", title: "Warehouse management", description: "Intelligent slotting, pick-and-pack optimisation, and inventory management for distribution centres of any size." },
      { icon: "play", title: "Route optimisation", description: "AI-powered routing that reduces fuel consumption, delivery time, and cost across your entire fleet." },
      { icon: "settings", title: "Carrier management", description: "Compare rates, book shipments, and manage relationships with 200+ carrier integrations." },
      { icon: "filter", title: "Customs & compliance", description: "Automated trade documentation, HS code classification, and customs filing for cross-border shipments." },
      { icon: "search", title: "Supply chain analytics", description: "Performance dashboards, lead time analysis, and demand forecasting across your entire network." },
    ],
    stats: [
      { icon: "broadcast", value: "200+", label: "Carrier integrations" },
      { icon: "grid", value: "99.2%", label: "On-time delivery" },
      { icon: "settings", value: "28%", label: "Cost reduction avg." },
      { icon: "play", value: "60+", label: "Countries" },
    ],
    testimonials: [
      { text: "Route optimisation alone cut our last-mile delivery cost by 31%. The ROI in the first quarter was beyond what we projected.", author: "Ryan O.", role: "VP Supply Chain, Meridian Retail Group" },
      { text: "We consolidated five carrier portals into one platform. Our team finally has a single source of truth for every shipment.", author: "Nadia P.", role: "Logistics Director, GlobaTech Manufacturing" },
      { text: "The customs documentation module transformed our cross-border process. What took our trade team three days now takes three hours.", author: "David L.", role: "Head of International Operations, Atlas Commerce" },
    ],
    aboutMission: "Supply chains are the arteries of the global economy. We build the technology that keeps them running — with visibility, reliability, and intelligence that turns complexity into competitive advantage.",
  },

  real_estate: {
    headlines: [
      "Real estate solutions for modern property markets",
      "Property management and transaction technology at scale",
      "Connecting buyers, sellers, and investors with confidence",
      "Intelligent property technology for every market",
    ],
    enterpriseHeadlines: [
      "Enterprise property management for institutional investors",
      "Commercial real estate technology for portfolios at scale",
    ],
    subheadlines: [
      "From property search and transactions to portfolio management and analytics — comprehensive real estate technology built for agents, investors, and institutions.",
      "Advanced property data, transaction management, and portfolio analytics for every segment of the real estate market.",
      "Technology that simplifies the complexity of real estate, from initial search through to long-term portfolio management.",
    ],
    ctaLabels: ["Explore listings", "Contact an agent", "Get started", "Request a consultation"],
    secondaryCtaLabels: ["View portfolio", "Learn more", "Browse properties", "Download guide"],
    ctaHeadlines: ["Find your next property opportunity", "Work with a trusted property partner", "Let's discuss your real estate goals"],
    ctaBodies: ["Our property specialists and technology team help investors, developers, and occupiers make smarter real estate decisions. Speak to us today.", "From single assets to institutional portfolios — we provide the data, technology, and expertise your real estate strategy demands."],
    featureGridTitles: ["Complete property solutions", "Technology for every transaction", "Real estate tools that work"],
    cardListTitles: ["Our property services", "Key platform features", "Real estate solutions"],
    footerTaglines: ["Property technology trusted by investors, developers, and agents across every real estate market."],
    navLinks: ["Properties", "Services", "Investors", "Contact"],
    features: [
      { icon: "search", title: "Property search", description: "Advanced search with location intelligence, filtering, and real-time market data across all property types." },
      { icon: "grid", title: "Transaction management", description: "End-to-end deal management covering offers, due diligence, contracts, and closing workflows." },
      { icon: "broadcast", title: "Portfolio analytics", description: "Performance dashboards, yield analysis, and asset-level reporting for property investors and managers." },
      { icon: "settings", title: "Property valuation", description: "Automated valuation models and comparable transaction data to support accurate pricing decisions." },
      { icon: "filter", title: "Tenant management", description: "Lease management, rent collection, maintenance requests, and communication tools for landlords and managers." },
      { icon: "play", title: "Market intelligence", description: "Local market trends, price history, and demand forecasting to inform acquisition and disposal decisions." },
    ],
    stats: [
      { icon: "grid", value: "50,000+", label: "Properties listed" },
      { icon: "broadcast", value: "$4B+", label: "Transactions facilitated" },
      { icon: "settings", value: "98%", label: "Client satisfaction" },
      { icon: "search", value: "12 markets", label: "Coverage" },
    ],
    testimonials: [
      { text: "The portfolio analytics dashboard gave us visibility we never had before. We identified two underperforming assets immediately and acted.", author: "Charlotte R.", role: "Head of Real Estate Investment, Meridian Capital" },
      { text: "Transaction management reduced our average deal closing time from 45 days to 28. The workflow tools are genuinely excellent.", author: "James O.", role: "Managing Director, Atlas Property Group" },
      { text: "The market intelligence data is the most comprehensive we've used. We make faster, better-informed acquisition decisions now.", author: "Sandra K.", role: "Director of Acquisitions, Horizon Developments" },
    ],
    aboutMission: "Real estate represents one of the most significant financial decisions individuals and institutions make. We build the technology and provide the expertise that makes every property decision more informed, more efficient, and more confident.",
  },

  legal: {
    headlines: [
      "Legal technology for modern law firms and institutions",
      "Precision legal services for complex matters",
      "Expert legal counsel supported by innovative technology",
      "Compliance, contracts, and legal services at scale",
    ],
    enterpriseHeadlines: [
      "Enterprise legal solutions for regulated industries",
      "Institutional legal technology for large-scale compliance",
    ],
    subheadlines: [
      "From contract management and compliance to litigation support — comprehensive legal technology and services for firms, corporates, and institutions.",
      "Advanced legal workflow automation, document intelligence, and compliance management for organisations that operate in complex regulatory environments.",
      "Legal expertise and technology combined to help businesses navigate contracts, compliance, and risk with greater speed and confidence.",
    ],
    ctaLabels: ["Schedule a consultation", "Speak to a specialist", "Explore our services", "Contact our team"],
    secondaryCtaLabels: ["View practice areas", "Download guide", "See our cases", "Learn more"],
    ctaHeadlines: ["Ready to simplify your legal operations?", "Speak with a legal technology expert", "Let's discuss your legal challenges"],
    ctaBodies: ["Our legal technology specialists and practitioners work with corporates, financial institutions, and law firms across multiple practice areas and jurisdictions.", "Complex legal matters require both deep expertise and smart technology. Our team brings both — to help you resolve issues faster and with greater certainty."],
    featureGridTitles: ["Our legal capabilities", "Legal technology solutions", "Services across every practice area"],
    cardListTitles: ["Our practice areas", "Key legal services", "Legal workflow tools"],
    footerTaglines: ["Legal expertise and technology trusted by law firms, corporates, and institutions across multiple jurisdictions."],
    navLinks: ["Services", "Practice Areas", "Insights", "Contact"],
    features: [
      { icon: "filter", title: "Contract management", description: "End-to-end contract lifecycle management with automated drafting, review, approval, and obligation tracking." },
      { icon: "settings", title: "Compliance management", description: "Regulatory change monitoring, compliance workflows, and audit-ready documentation across all applicable regimes." },
      { icon: "grid", title: "Document intelligence", description: "AI-powered document review, due diligence automation, and clause extraction at scale." },
      { icon: "broadcast", title: "Litigation support", description: "Case management, evidence organisation, and discovery assistance for complex commercial disputes." },
      { icon: "search", title: "Legal research", description: "Comprehensive legal research tools with jurisdiction-specific case law, statutes, and regulatory guidance." },
      { icon: "play", title: "Risk assessment", description: "Structured legal risk frameworks, scenario modelling, and board-level reporting for enterprise clients." },
    ],
    stats: [
      { icon: "grid", value: "95%", label: "Client retention" },
      { icon: "filter", value: "500+", label: "Matters handled" },
      { icon: "settings", value: "30+", label: "Jurisdictions" },
      { icon: "broadcast", value: "60%", label: "Faster contract review" },
    ],
    testimonials: [
      { text: "Their contract intelligence system reduced our review cycle by 60%. What used to take our legal team a week now takes a day.", author: "Marcus B.", role: "General Counsel, Apex Industries" },
      { text: "Outstanding regulatory compliance support across four jurisdictions simultaneously. Thorough, practical, and always commercially focused.", author: "Isabelle N.", role: "Chief Risk Officer, Northern Capital" },
      { text: "The litigation support on our recent dispute was exceptional — organised, strategic, and meticulous in their preparation.", author: "Patrick H.", role: "Senior Partner, Henderson & Webb" },
    ],
    aboutMission: "Legal complexity should not be a barrier to sound decision-making. We combine legal expertise with intelligent technology to help businesses navigate contracts, compliance, and disputes — with greater speed, clarity, and confidence.",
  },

  consulting: {
    headlines: [
      "Strategic consulting for complex business challenges",
      "Advisory services that transform organisations",
      "Expert guidance for every stage of growth",
      "Business transformation powered by deep expertise",
    ],
    enterpriseHeadlines: [
      "Enterprise advisory and transformation services for global organisations",
      "Strategic consulting for large-scale business transformation",
    ],
    subheadlines: [
      "Combining industry expertise, analytical rigour, and practical implementation capability to help organisations solve their most complex business challenges.",
      "From strategy development to operational transformation — consulting services that deliver measurable results for executives and boards.",
      "Deep sector knowledge, independent perspective, and hands-on delivery capability for businesses navigating change, growth, and complexity.",
    ],
    ctaLabels: ["Request a briefing", "Speak to an advisor", "Explore our services", "Contact our team"],
    secondaryCtaLabels: ["View case studies", "Download insights", "Learn more", "See our approach"],
    ctaHeadlines: ["Ready to transform your business?", "Speak with a senior advisor", "Let's solve your most pressing challenges"],
    ctaBodies: ["Our senior consultants bring decades of sector and functional experience. We work at board level and deliver results that our clients can measure.", "We engage at the level where it matters most — strategy, transformation, and leadership — to help organisations achieve their most important goals."],
    featureGridTitles: ["Our consulting capabilities", "Advisory services across every function", "How we create value"],
    cardListTitles: ["Our practice areas", "Consulting services", "Key advisory modules"],
    footerTaglines: ["Independent advisory and transformation consulting trusted by executives and boards across global organisations."],
    navLinks: ["Services", "Industries", "Insights", "Contact"],
    features: [
      { icon: "broadcast", title: "Strategy development", description: "Evidence-based strategic planning that aligns your organisation's resources, capabilities, and ambitions." },
      { icon: "grid", title: "Operational transformation", description: "End-to-end operational redesign that improves efficiency, quality, and cost structure across your business." },
      { icon: "filter", title: "Change management", description: "Structured change programmes that engage stakeholders, build capability, and embed lasting transformation." },
      { icon: "settings", title: "Performance improvement", description: "Targeted interventions that improve financial, operational, and organisational performance rapidly and measurably." },
      { icon: "search", title: "Market analysis", description: "Independent market research and competitive intelligence to support growth, entry, and investment decisions." },
      { icon: "play", title: "M&A advisory", description: "Commercial due diligence, integration planning, and post-merger value creation support for transactions of every scale." },
    ],
    stats: [
      { icon: "broadcast", value: "200+", label: "Engagements delivered" },
      { icon: "grid", value: "18%", label: "Average EBITDA lift" },
      { icon: "settings", value: "95%", label: "Client satisfaction" },
      { icon: "filter", value: "25+", label: "Industries served" },
    ],
    testimonials: [
      { text: "Their strategic review identified $40M of operational savings we hadn't seen. Implementation was as rigorous as the diagnosis.", author: "Catherine B.", role: "Group CEO, Meridian International" },
      { text: "Outstanding M&A support from diligence through to integration. Commercial, pragmatic, and always one step ahead.", author: "Richard T.", role: "CFO, Atlas Capital Group" },
      { text: "The change programme they designed actually stuck — 18 months later the organisation is still operating the new way. That's rare.", author: "Lisa G.", role: "Chief Operating Officer, Horizon Services" },
    ],
    aboutMission: "The best consulting doesn't just solve problems — it builds the capability to solve the next ones. We work alongside our clients as genuine partners, bringing expertise, independence, and commitment to results that endure beyond our engagement.",
  },

  technology: {
    headlines: [
      "Technology solutions built for tomorrow",
      "Digital transformation at every scale",
      "Innovation infrastructure for ambitious organisations",
      "Building the technology that drives modern business",
    ],
    enterpriseHeadlines: [
      "Enterprise technology solutions for complex digital operations",
      "Digital infrastructure for global technology organisations",
    ],
    subheadlines: [
      "From cloud architecture to custom software development — comprehensive technology services that help organisations build, scale, and operate in a digital-first world.",
      "Technology strategy, engineering, and delivery capability for companies that want to move faster and build with confidence.",
      "Modern development practices, cloud-native architecture, and deep engineering expertise to power your most ambitious technology goals.",
    ],
    ctaLabels: ["Request a demo", "Start building", "Talk to our team", "Explore our platform"],
    secondaryCtaLabels: ["See our work", "View documentation", "Learn more", "Schedule a call"],
    ctaHeadlines: ["Ready to build something remarkable?", "Speak with our engineering team", "Transform your digital capabilities today"],
    ctaBodies: ["Our engineers, architects, and product specialists work with companies at every stage — from early-stage startups to global enterprises. Let's talk about what you're building.", "Technology should enable your business strategy, not constrain it. We build systems that scale with your ambitions."],
    featureGridTitles: ["Our engineering capabilities", "Technology services at a glance", "Built for digital-first organisations"],
    cardListTitles: ["Core technology services", "Platform features", "Engineering capabilities"],
    footerTaglines: ["Engineering excellence and digital innovation trusted by technology companies and enterprises worldwide."],
    navLinks: ["Products", "Solutions", "Developers", "Contact"],
    features: [
      { icon: "grid", title: "Cloud architecture", description: "Scalable, resilient cloud infrastructure designed and deployed on AWS, GCP, and Azure for mission-critical workloads." },
      { icon: "settings", title: "Custom software", description: "Bespoke software engineering from requirements through to deployment, maintenance, and evolution." },
      { icon: "broadcast", title: "API & integrations", description: "Well-documented, reliable APIs and integration services that connect your systems and data sources seamlessly." },
      { icon: "filter", title: "Security & compliance", description: "Security architecture, penetration testing, and compliance implementation for regulated and security-conscious organisations." },
      { icon: "search", title: "Data engineering", description: "Data pipelines, warehousing, and analytics infrastructure to make your data assets actionable and reliable." },
      { icon: "play", title: "Product development", description: "Full-cycle product design and engineering — from discovery and prototyping through to launch and iteration." },
    ],
    stats: [
      { icon: "grid", value: "500+", label: "Projects delivered" },
      { icon: "broadcast", value: "99.9%", label: "Platform uptime" },
      { icon: "settings", value: "80+", label: "Engineering specialists" },
      { icon: "filter", value: "40+", label: "Technology partners" },
    ],
    testimonials: [
      { text: "They rebuilt our entire data infrastructure in four months. The new platform processes 10x the volume with half the operational overhead.", author: "Nathan R.", role: "VP Engineering, DataPoint Systems" },
      { text: "The API layer they designed has become the foundation for everything we build now. Clean, well-documented, and genuinely scalable.", author: "Yuki T.", role: "CTO, Meridian Digital" },
      { text: "We moved from a monolith to microservices without a single incident. Their migration approach was meticulous and their communication was excellent.", author: "Fiona B.", role: "Head of Platform Engineering, GlobaCommerce" },
    ],
    aboutMission: "Technology should give organisations the power to do more, not the obligation to do more just to keep up. We build systems that are robust, elegant, and built to last — so that our clients can focus on what they do best.",
  },

  manufacturing: {
    headlines: [
      "Industrial solutions for the modern manufacturer",
      "Manufacturing technology built for precision and scale",
      "Optimising production for the factory of the future",
      "Advanced manufacturing systems for complex operations",
    ],
    enterpriseHeadlines: [
      "Enterprise manufacturing technology for global production operations",
      "Industrial-scale manufacturing systems for complex multi-site operations",
    ],
    subheadlines: [
      "From production planning to quality control — comprehensive manufacturing technology that improves throughput, reduces waste, and ensures compliance.",
      "Industrial automation, quality management, and supply chain integration for manufacturers who demand precision and reliability.",
      "Smart factory technology that connects your machines, processes, and people — delivering visibility and control across every production operation.",
    ],
    ctaLabels: ["Request a demo", "Speak to an engineer", "Explore our solutions", "Contact our team"],
    secondaryCtaLabels: ["View case studies", "See our capabilities", "Download brochure", "Learn more"],
    ctaHeadlines: ["Ready to optimise your production operations?", "Speak with a manufacturing technology specialist", "Reduce waste. Improve quality. Increase throughput."],
    ctaBodies: ["Our manufacturing engineers and technology specialists work with producers across automotive, aerospace, pharma, and industrial markets. Tell us about your production challenges.", "From pilot implementation to full site deployment — we bring the expertise and technology to modernise your manufacturing operations."],
    featureGridTitles: ["Complete manufacturing solutions", "Industrial technology capabilities", "Smart factory features"],
    cardListTitles: ["Our manufacturing services", "Production management tools", "Quality and compliance features"],
    footerTaglines: ["Manufacturing technology trusted by industrial companies across automotive, pharmaceutical, and FMCG sectors."],
    navLinks: ["Solutions", "Industries", "Technology", "Contact"],
    features: [
      { icon: "settings", title: "Production planning", description: "Advanced scheduling and planning tools that balance demand, capacity, and constraints across complex production environments." },
      { icon: "grid", title: "Quality management", description: "Integrated quality control, non-conformance management, and SPC tools aligned to ISO 9001 and GMP requirements." },
      { icon: "broadcast", title: "OEE monitoring", description: "Real-time Overall Equipment Effectiveness monitoring to identify losses, downtime causes, and improvement opportunities." },
      { icon: "filter", title: "Traceability", description: "Full batch and serial traceability across materials, processes, and finished goods for compliance and recall management." },
      { icon: "play", title: "Predictive maintenance", description: "IoT-connected asset monitoring with ML-based failure prediction to eliminate unplanned downtime." },
      { icon: "search", title: "Supply chain integration", description: "Direct integration with suppliers, logistics providers, and ERP systems for seamless material flow." },
    ],
    stats: [
      { icon: "grid", value: "23%", label: "OEE improvement avg." },
      { icon: "broadcast", value: "40%", label: "Downtime reduction" },
      { icon: "settings", value: "99.5%", label: "Quality compliance" },
      { icon: "filter", value: "300+", label: "Production sites" },
    ],
    testimonials: [
      { text: "OEE across our three sites went from 62% to 78% in the first six months. The real-time monitoring identified losses we didn't even know existed.", author: "Robert H.", role: "VP Operations, Apex Manufacturing" },
      { text: "Predictive maintenance eliminated our two biggest recurring downtime causes. The ROI was achieved inside the first year.", author: "Sandra O.", role: "Plant Manager, Meridian Industrial" },
      { text: "The traceability module was a critical requirement for our pharma client. It met every GMP requirement and the validation support was excellent.", author: "David F.", role: "Head of Quality, BioProcess Solutions" },
    ],
    aboutMission: "Manufacturing excellence is built on precision, reliability, and continuous improvement. We provide the technology and expertise that helps industrial companies achieve world-class production performance — every shift, every day.",
  },

  media: {
    headlines: [
      "Creative technology for modern media organisations",
      "Content infrastructure for digital-first media",
      "Publishing and broadcast technology at scale",
      "Empowering creators with professional media tools",
    ],
    enterpriseHeadlines: [
      "Enterprise media technology for broadcast and publishing institutions",
      "Digital media infrastructure for global content operations",
    ],
    subheadlines: [
      "From content management and distribution to audience analytics — comprehensive media technology for publishers, broadcasters, and content creators.",
      "Advanced content workflows, multi-platform distribution, and audience intelligence for media organisations that publish at scale.",
      "The complete media technology stack — from creation and production through to publication, monetisation, and audience engagement.",
    ],
    ctaLabels: ["Start creating", "Explore the platform", "Request a demo", "Talk to our team"],
    secondaryCtaLabels: ["See our features", "View case studies", "Learn more", "Schedule a demo"],
    ctaHeadlines: ["Ready to power your content operations?", "Speak with a media technology specialist", "Publish faster, reach further, earn more"],
    ctaBodies: ["Our media technology platform serves publishers, broadcasters, and content studios from independent creators to global organisations. Let's discuss your content goals.", "Content is the engine of your audience relationship. We build the technology that keeps it running smoothly at scale."],
    featureGridTitles: ["Complete media capabilities", "Technology for every content format", "Built for modern publishers"],
    cardListTitles: ["Core media services", "Content management tools", "Audience and revenue features"],
    footerTaglines: ["Media technology trusted by publishers, broadcasters, and content studios worldwide."],
    navLinks: ["Platform", "Solutions", "Creators", "Contact"],
    features: [
      { icon: "play", title: "Content management", description: "Centralised content repository with structured metadata, version control, and multi-format asset management." },
      { icon: "broadcast", title: "Multi-platform publishing", description: "Publish simultaneously to web, mobile, social, and broadcast channels from a single editorial workflow." },
      { icon: "grid", title: "Audience analytics", description: "Real-time audience data, content performance metrics, and engagement insights to guide editorial decisions." },
      { icon: "settings", title: "Monetisation tools", description: "Subscription management, paywall configuration, programmatic advertising, and direct revenue tools in one platform." },
      { icon: "filter", title: "Workflow automation", description: "Editorial calendars, assignment management, approval workflows, and automated publishing schedules." },
      { icon: "search", title: "SEO & distribution", description: "Built-in SEO management, content syndication, and distribution partnerships to maximise reach and discoverability." },
    ],
    stats: [
      { icon: "play", value: "2B+", label: "Content items served" },
      { icon: "broadcast", value: "500+", label: "Publishers" },
      { icon: "settings", value: "4x", label: "Publishing speed" },
      { icon: "grid", value: "35%", label: "Revenue growth avg." },
    ],
    testimonials: [
      { text: "Our publishing velocity tripled after moving to their platform. Editorial teams love the workflow tools and our readers love the performance.", author: "Claire T.", role: "Digital Editor-in-Chief, Northern Press" },
      { text: "The audience analytics transformed how we commission content. We now know exactly what our readers want before we write it.", author: "James O.", role: "Head of Digital, Meridian Media Group" },
      { text: "Subscription revenue grew 42% in the first year after implementing their paywall and monetisation tools. Genuinely impressive results.", author: "Eva K.", role: "CEO, Atlas Publishing" },
    ],
    aboutMission: "Great content deserves technology that keeps pace with its ambitions. We build the media infrastructure that helps creators, publishers, and broadcasters reach their audiences — with the speed, scale, and intelligence the modern content landscape demands.",
  },

  telecom: {
    headlines: [
      "Network infrastructure for the connected world",
      "Telecommunications technology built for scale and reliability",
      "Connecting people and businesses across global networks",
      "Next-generation network solutions for every market",
    ],
    enterpriseHeadlines: [
      "Enterprise telecommunications infrastructure for global network operators",
      "Carrier-grade network technology for mission-critical connectivity",
    ],
    subheadlines: [
      "From network planning and deployment to operations and optimisation — comprehensive telecommunications technology for carriers, ISPs, and enterprise networks.",
      "Advanced network management, subscriber technology, and OSS/BSS solutions for telecommunications operators who demand reliability and scale.",
      "End-to-end network infrastructure — design, deployment, and intelligent operations management for the most demanding connectivity requirements.",
    ],
    ctaLabels: ["Request a demo", "Speak to our network team", "Explore our solutions", "Contact us"],
    secondaryCtaLabels: ["View capabilities", "Download technical brief", "See case studies", "Learn more"],
    ctaHeadlines: ["Ready to modernise your network?", "Speak with a network technology specialist", "Build the connectivity your customers demand"],
    ctaBodies: ["Our network engineers and technology specialists work with carriers, ISPs, and enterprise network teams across 50+ countries. Let's discuss your network goals.", "From 5G deployment to fibre infrastructure — we bring the engineering depth and technology to build networks that work, at scale, for decades."],
    featureGridTitles: ["Complete network solutions", "Telecommunications technology capabilities", "Network management at scale"],
    cardListTitles: ["Our network services", "Key platform features", "Network technology modules"],
    footerTaglines: ["Telecommunications technology trusted by network operators and connectivity providers worldwide."],
    navLinks: ["Solutions", "Network", "Technology", "Contact"],
    features: [
      { icon: "broadcast", title: "Network management", description: "Unified network operations with real-time topology visibility, fault management, and performance monitoring." },
      { icon: "settings", title: "5G deployment", description: "End-to-end 5G planning, deployment, and optimisation services for standalone and non-standalone architectures." },
      { icon: "grid", title: "Subscriber management", description: "BSS solutions covering billing, provisioning, and customer lifecycle management for millions of subscribers." },
      { icon: "filter", title: "Network security", description: "DDoS protection, intrusion detection, and network security operations for carriers and enterprise networks." },
      { icon: "play", title: "Service assurance", description: "QoS monitoring, SLA management, and automated remediation to maintain service quality across every network segment." },
      { icon: "search", title: "Network analytics", description: "Traffic analysis, capacity planning, and predictive intelligence to optimise network performance and investment." },
    ],
    stats: [
      { icon: "broadcast", value: "99.999%", label: "Network availability" },
      { icon: "grid", value: "100M+", label: "Subscribers managed" },
      { icon: "settings", value: "50+", label: "Countries" },
      { icon: "filter", value: "30+", label: "Carrier clients" },
    ],
    testimonials: [
      { text: "Network fault mean-time-to-repair dropped by 68% after deployment. The automated remediation capabilities are exceptional.", author: "Ahmad R.", role: "Network Operations Director, GlobalNet Carrier" },
      { text: "The 5G planning tools reduced our site survey time by half. The accuracy of the propagation models is genuinely class-leading.", author: "Ingrid S.", role: "VP Radio Network, Northern Telecom" },
      { text: "Their subscriber management platform handled our migration of 15 million customers without a single billing disruption. Remarkable delivery.", author: "Carlos M.", role: "CTO, Meridian Mobile" },
    ],
    aboutMission: "Connectivity is the infrastructure of the modern economy. We build the technology that helps network operators deliver reliable, high-performance connectivity — at the scale and resilience the connected world demands.",
  },

  government: {
    headlines: [
      "Technology solutions for modern public services",
      "Digital government infrastructure for citizen-first services",
      "Transforming public sector operations through technology",
      "Secure, compliant technology for government institutions",
    ],
    enterpriseHeadlines: [
      "Enterprise public sector technology for national and regional government",
      "Institutional technology solutions for government agencies and departments",
    ],
    subheadlines: [
      "From citizen service portals to data infrastructure — comprehensive technology solutions that help government agencies deliver better public services more efficiently.",
      "Secure, compliant, and accessible digital infrastructure for public sector organisations committed to modern, citizen-centred service delivery.",
      "Technology that meets the highest standards of security, accessibility, and procurement compliance — built for governments that serve at scale.",
    ],
    ctaLabels: ["Request a briefing", "Speak to our team", "Explore our solutions", "Download overview"],
    secondaryCtaLabels: ["View case studies", "Download security brief", "Learn more", "See our accreditations"],
    ctaHeadlines: ["Ready to modernise your public services?", "Speak with a public sector specialist", "Let's discuss your digital transformation goals"],
    ctaBodies: ["Our public sector technology team works with national, regional, and local government organisations across multiple jurisdictions. We understand the unique requirements of government procurement and operations.", "From initial discovery through to deployment and ongoing support — we deliver technology that meets government security standards and serves citizens effectively."],
    featureGridTitles: ["Public sector technology solutions", "Government-grade capabilities", "Digital services for every agency"],
    cardListTitles: ["Our government services", "Core platform features", "Public sector modules"],
    footerTaglines: ["Secure, compliant public sector technology trusted by government agencies and institutions."],
    navLinks: ["Solutions", "Sectors", "Compliance", "Contact"],
    features: [
      { icon: "grid", title: "Citizen service portals", description: "Accessible, multi-channel service portals that allow citizens to interact with government services online, 24/7." },
      { icon: "settings", title: "Case management", description: "Structured case and workflow management for benefits, licensing, planning, and regulatory processes." },
      { icon: "filter", title: "Security & compliance", description: "Government-grade security architecture meeting IL2/IL3 standards, GDPR, and public sector procurement requirements." },
      { icon: "broadcast", title: "Data & analytics", description: "Secure data platforms and performance dashboards that give agencies the insight to improve service delivery." },
      { icon: "search", title: "Document management", description: "Classified document management, retention schedules, and Freedom of Information workflow management." },
      { icon: "play", title: "Integration services", description: "Secure integration with national registers, payment systems, and cross-agency data sharing platforms." },
    ],
    stats: [
      { icon: "grid", value: "50+", label: "Government clients" },
      { icon: "settings", value: "ISO 27001", label: "Certified" },
      { icon: "broadcast", value: "99.9%", label: "Service availability" },
      { icon: "filter", value: "30M+", label: "Citizens served" },
    ],
    testimonials: [
      { text: "The citizen portal reduced inbound phone calls to our department by 45% in the first quarter. Residents are getting answers faster and our team is more productive.", author: "Helen B.", role: "Director of Digital Services, Westshire Council" },
      { text: "Their security team guided us through every aspect of our IL3 certification. The documentation was impeccable and the process was managed professionally.", author: "Alan R.", role: "Head of IT Security, National Revenue Agency" },
      { text: "Case management implementation went live on schedule, three months ahead of our departmental deadline. A genuinely well-managed programme.", author: "Denise O.", role: "Programme Director, Department of Public Services" },
    ],
    aboutMission: "Public sector technology must meet a higher standard — it must be secure, accessible, and designed to serve every citizen fairly. We build technology that governments can trust and citizens can rely on, delivered with the rigour that public service demands.",
  },

  automotive: {
    headlines: [
      "Automotive technology for the vehicles of tomorrow",
      "Connected mobility solutions at global scale",
      "Driving the future of transportation and mobility",
      "Precision automotive technology for every market segment",
    ],
    enterpriseHeadlines: [
      "Enterprise automotive technology for OEMs and fleet operators",
      "Industrial-grade connected vehicle solutions for the automotive sector",
    ],
    subheadlines: [
      "From connected vehicle platforms to fleet management — comprehensive automotive technology for manufacturers, dealers, and mobility operators worldwide.",
      "Advanced telematics, EV infrastructure, and dealer management systems for the automotive industry navigating its most significant transformation.",
      "Automotive technology that connects vehicles, fleets, and driver experiences — engineered for the reliability and safety that mobility demands.",
    ],
    ctaLabels: ["Request a demo", "Speak to our team", "Explore solutions", "Contact us"],
    secondaryCtaLabels: ["View capabilities", "See our platform", "Download brief", "Learn more"],
    ctaHeadlines: ["Ready to connect your fleet?", "Speak with an automotive technology specialist", "Drive efficiency across your operations"],
    ctaBodies: ["Our automotive technology specialists work with OEMs, fleet operators, and mobility companies across every market. Let's discuss your connected vehicle strategy.", "From telematics to EV charging infrastructure — we provide the technology and expertise your automotive operations require."],
    featureGridTitles: ["Automotive technology solutions", "Connected vehicle capabilities", "Mobility technology at scale"],
    cardListTitles: ["Our automotive services", "Fleet management features", "Connected vehicle modules"],
    footerTaglines: ["Automotive and mobility technology trusted by OEMs, fleet operators, and mobility companies worldwide."],
    navLinks: ["Solutions", "Fleet", "EV", "Contact"],
    features: [
      { icon: "broadcast", title: "Connected vehicle platform", description: "Telematics, OTA updates, and remote diagnostics for connected vehicle programmes at OEM scale." },
      { icon: "grid", title: "Fleet management", description: "Real-time fleet tracking, driver behaviour monitoring, and maintenance scheduling for fleets of every size." },
      { icon: "settings", title: "EV charging management", description: "Smart charging infrastructure, energy management, and network operations for electric vehicle programmes." },
      { icon: "filter", title: "Dealer management", description: "Integrated DMS solutions covering inventory, sales, service, and finance for dealership networks." },
      { icon: "play", title: "Driver experience", description: "In-vehicle infotainment systems, personalisation platforms, and connected services for the modern driver." },
      { icon: "search", title: "Predictive maintenance", description: "Condition monitoring and predictive maintenance alerting to reduce vehicle downtime and warranty costs." },
    ],
    stats: [
      { icon: "broadcast", value: "5M+", label: "Connected vehicles" },
      { icon: "grid", value: "200+", label: "Fleet customers" },
      { icon: "settings", value: "35%", label: "Maintenance cost saving" },
      { icon: "filter", value: "40+", label: "Markets" },
    ],
    testimonials: [
      { text: "The connected vehicle platform handled our 500,000 vehicle rollout without a single critical incident. The engineering quality is genuinely exceptional.", author: "Lars B.", role: "VP Connected Services, Meridian Automotive" },
      { text: "Fleet fuel costs reduced by 22% in the first six months through driver coaching and route optimisation. The ROI was immediate.", author: "Patricia O.", role: "Head of Fleet Operations, Atlas Distribution" },
      { text: "EV charging network deployment across 80 sites completed on schedule. The smart charging saved us 18% on energy costs immediately.", author: "Tobias K.", role: "Director of EV Infrastructure, Northern Mobility" },
    ],
    aboutMission: "The automotive industry is undergoing its most significant transformation in a century. We build the connected vehicle technology, fleet intelligence, and mobility infrastructure that help manufacturers, operators, and drivers navigate that transformation successfully.",
  },

  agriculture: {
    headlines: [
      "Agricultural technology for a sustainable future",
      "Precision farming solutions for modern agriculture",
      "Food systems built for efficiency and sustainability",
      "Agritech innovation for every scale of production",
    ],
    enterpriseHeadlines: [
      "Enterprise agritech for large-scale agricultural operations",
      "Industrial food and agriculture technology for producers and processors",
    ],
    subheadlines: [
      "From precision farming and crop analytics to supply chain traceability — comprehensive agricultural technology that helps producers grow more with less.",
      "Smart sensors, satellite imagery, and machine learning — the tools that bring data-driven precision to every hectare of your operation.",
      "Agricultural technology that improves yield, reduces inputs, and connects every link in the food supply chain with transparency and efficiency.",
    ],
    ctaLabels: ["Request a demo", "Speak to our agronomists", "Explore our platform", "Contact our team"],
    secondaryCtaLabels: ["View case studies", "Download guide", "See our capabilities", "Learn more"],
    ctaHeadlines: ["Ready to grow smarter?", "Speak with an agricultural technology specialist", "Maximise your yield with precision farming"],
    ctaBodies: ["Our agronomy specialists and technology team work with producers, co-operatives, and food companies across every growing region. Tell us about your operation.", "From small independent farms to large-scale commercial agriculture — our platform adapts to the scale and complexity of your operation."],
    featureGridTitles: ["Precision farming solutions", "Agricultural technology capabilities", "From field to fork"],
    cardListTitles: ["Our agritech services", "Core farming tools", "Key analytics features"],
    footerTaglines: ["Agricultural technology trusted by producers and food companies committed to sustainable, data-driven farming."],
    navLinks: ["Solutions", "Crops", "Technology", "Contact"],
    features: [
      { icon: "search", title: "Crop monitoring", description: "Satellite and drone imagery combined with ground sensor data for field-level crop health monitoring." },
      { icon: "grid", title: "Yield analytics", description: "Historical yield analysis and predictive modelling to optimise planting, irrigation, and harvest timing." },
      { icon: "broadcast", title: "Irrigation management", description: "Smart irrigation control based on soil moisture, weather data, and crop water demand models." },
      { icon: "settings", title: "Input optimisation", description: "Variable rate application mapping for fertiliser, pesticides, and seed to reduce costs and environmental impact." },
      { icon: "filter", title: "Traceability", description: "Farm-to-fork traceability covering provenance, certification, and compliance for food safety and retailer requirements." },
      { icon: "play", title: "Supply chain integration", description: "Direct connectivity with processors, traders, and logistics providers to streamline selling and fulfilment." },
    ],
    stats: [
      { icon: "grid", value: "18%", label: "Average yield increase" },
      { icon: "broadcast", value: "25%", label: "Input cost reduction" },
      { icon: "settings", value: "2,000+", label: "Farms using our platform" },
      { icon: "filter", value: "1M ha+", label: "Under management" },
    ],
    testimonials: [
      { text: "Yield on our wheat programme increased by 14% in the first season using the prescription maps. The precision is remarkable.", author: "John F.", role: "Farm Manager, Greenfields Agriculture" },
      { text: "The irrigation management module cut our water usage by 28% while maintaining yield targets. Critical in our region.", author: "Maria C.", role: "Head of Operations, Sierra Farms" },
      { text: "Traceability certification for our organic programme went from a paper nightmare to a simple digital process. Our retailers are very happy.", author: "Oliver B.", role: "Managing Director, Heritage Produce" },
    ],
    aboutMission: "Feeding a growing world sustainably is one of the defining challenges of our time. We build the agricultural technology that helps producers grow more with less — improving profitability for farmers and sustainability for the planet.",
  },
};

// ── Fallback (technology/generic) ────────────────────────────────────────────
const DEFAULT_INDUSTRY = INDUSTRY_LIBRARY["technology"];

// ── Descriptor-based headline modifiers ───────────────────────────────────────

function applyDescriptors(headline: string, descriptors: string[]): string {
  if (descriptors.includes("multinational") || descriptors.includes("global")) {
    if (!headline.toLowerCase().includes("global")) {
      headline = headline.replace(/\b(solutions?|services?|technology)\b/i, "global $1");
    }
  }
  if (descriptors.includes("renewable") || descriptors.includes("sustainable") || descriptors.includes("green")) {
    headline = headline.replace(/\b(energy|power)\b/i, "sustainable $1");
  }
  return headline;
}

// ── Audience-based CTA modifiers ──────────────────────────────────────────────

function audienceCta(ctaLabels: string[], audience: string[]): string {
  if (audience.some(a => a.includes("government"))) return "Request a government briefing";
  if (audience.some(a => a.includes("enterprise"))) return "Request an enterprise demo";
  if (audience.some(a => a.includes("developer"))) return "Start building for free";
  if (audience.some(a => a.includes("student"))) return "Start learning free";
  return ctaLabels[0];
}

// ── Main content generator ────────────────────────────────────────────────────

export function generateContextContent(
  prompt: string,
  productType: string | null,
  brandName: string | null,
): ProductContent {
  const ctx = extractContextGraph(prompt, productType);
  const lib = INDUSTRY_LIBRARY[ctx.industry] ?? DEFAULT_INDUSTRY;

  const isEnterprise = ctx.tone === "enterprise" || ctx.descriptors.some(d => ["multinational", "global", "enterprise", "large-scale"].includes(d));

  const headlinePool = isEnterprise && lib.enterpriseHeadlines.length > 0
    ? lib.enterpriseHeadlines
    : lib.headlines;

  let headline = applyDescriptors(headlinePool[0], ctx.descriptors);
  let subheadline = lib.subheadlines[0];

  const ctaLabel = audienceCta(lib.ctaLabels, ctx.audience);
  const secondaryCtaLabel = lib.secondaryCtaLabels[0];

  return {
    brandName: brandName ?? "Company",
    headline,
    subheadline,
    ctaLabel,
    secondaryCtaLabel,
    ctaHeadline: lib.ctaHeadlines[0],
    ctaBody: lib.ctaBodies[0],
    ctaButtonLabel: lib.ctaLabels[1] ?? lib.ctaLabels[0],
    featureGridTitle: lib.featureGridTitles[0],
    cardListTitle: lib.cardListTitles[0],
    footerTagline: lib.footerTaglines[0],
    navLinks: lib.navLinks,
    features: lib.features,
    stats: lib.stats,
    testimonials: lib.testimonials,
    aboutMission: lib.aboutMission,
    pricingPlans: [],
    blogPosts: [],
  };
}
