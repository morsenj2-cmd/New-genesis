import contextLibrary from "./contextLibrary.json";

export interface InterpretedIntent {
  industry: string | null;
  productType: string | null;
  style: string | null;
  features: string[];
  colorHint: string | null;
  rawText: string;
}

const STYLE_MAP: Record<string, string> = {
  minimal:      "minimal",
  minimalist:   "minimal",
  clean:        "minimal",
  simple:       "minimal",
  stripped:     "minimal",
  bold:         "bold",
  heavy:        "bold",
  dramatic:     "bold",
  modern:       "modern",
  sleek:        "modern",
  futuristic:   "futuristic",
  "sci-fi":     "futuristic",
  cyberpunk:    "futuristic",
  neon:         "futuristic",
  elegant:      "elegant",
  luxury:       "elegant",
  premium:      "elegant",
  playful:      "playful",
  fun:          "playful",
  vibrant:      "playful",
  corporate:    "corporate",
  professional: "corporate",
  enterprise:   "corporate",
  dark:         "dark",
  brutalist:    "brutalist",
};

const COLOR_KEYWORDS: Record<string, string> = {
  blue:    "blue",
  cobalt:  "cobalt",
  navy:    "navy",
  azure:   "azure",
  sky:     "sky",
  cyan:    "cyan",
  teal:    "teal",
  green:   "green",
  emerald: "emerald",
  mint:    "mint",
  lime:    "lime",
  yellow:  "yellow",
  amber:   "amber",
  orange:  "orange",
  red:     "red",
  crimson: "crimson",
  rose:    "rose",
  pink:    "pink",
  purple:  "purple",
  violet:  "violet",
  indigo:  "indigo",
  lavender:"lavender",
  white:   "white",
  black:   "black",
  gray:    "gray",
  grey:    "gray",
};

const INDUSTRY_MAP: Record<string, string> = {
  saas:         "saas",
  fintech:      "fintech",
  healthcare:   "healthcare",
  ecommerce:    "ecommerce",
  "e-commerce": "ecommerce",
  education:    "education",
  edtech:       "education",
  media:        "media",
  gaming:       "gaming",
  travel:       "travel",
  food:         "food",
  fashion:      "fashion",
  "real estate":  "real_estate",
  fitness:      "fitness",
  startup:      "startup",
};

const FEATURE_KEYWORDS: Record<string, string> = {
  "file upload":          "file_upload",
  "drag and drop":        "drag_drop",
  "user authentication":  "auth",
  "login":                "auth",
  "sign up":              "auth",
  "payment":              "payments",
  "subscription":         "subscription",
  "search":               "search",
  "notifications":        "notifications",
  "real-time":            "realtime",
  "real time":            "realtime",
  "offline":              "offline",
  "collaboration":        "collaboration",
  "team":                 "team",
  "api":                  "api",
  "dark mode":            "dark_mode",
  "mobile":               "mobile",
  "analytics":            "analytics",
  "reporting":            "reporting",
  "export":               "export",
  "import":               "import",
  "sharing":              "sharing",
  "permissions":          "permissions",
  "roles":                "roles",
  "workflow":             "workflow",
};

export function interpretIntent(input: string): InterpretedIntent {
  const text = input.toLowerCase().trim();

  let productType: string | null = null;
  let bestMatchLength = 0;

  for (const [key, entry] of Object.entries(contextLibrary)) {
    for (const keyword of entry.keywords) {
      if (text.includes(keyword) && keyword.length > bestMatchLength) {
        productType = key;
        bestMatchLength = keyword.length;
      }
    }
  }

  let industry: string | null = null;
  for (const [keyword, ind] of Object.entries(INDUSTRY_MAP)) {
    if (text.includes(keyword)) {
      industry = ind;
      break;
    }
  }

  if (!industry && productType) {
    const industryMap: Record<string, string> = {
      cloud_storage: "saas",
      chat_app: "saas",
      analytics_dashboard: "saas",
      ecommerce: "ecommerce",
      project_management: "saas",
      crm: "saas",
      social_media: "media",
      saas_generic: "saas",
      developer_tool: "saas",
      video_platform: "media",
      fintech: "fintech",
      healthcare: "healthcare",
      education: "education",
      calendar_scheduling: "saas",
    };
    industry = industryMap[productType] ?? null;
  }

  let style: string | null = null;
  for (const word of text.split(/\s+/)) {
    if (STYLE_MAP[word]) {
      style = STYLE_MAP[word];
      break;
    }
  }
  if (!style) {
    for (const [phrase, s] of Object.entries(STYLE_MAP)) {
      if (phrase.includes(" ") && text.includes(phrase)) {
        style = s;
        break;
      }
    }
  }

  const features: string[] = [];
  for (const [phrase, feat] of Object.entries(FEATURE_KEYWORDS)) {
    if (text.includes(phrase)) {
      features.push(feat);
    }
  }

  let colorHint: string | null = null;
  for (const [word, color] of Object.entries(COLOR_KEYWORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) {
      colorHint = color;
      break;
    }
  }

  return { industry, productType, style, features, colorHint, rawText: input };
}

export function describeIntent(intent: InterpretedIntent): string[] {
  const lines: string[] = [];
  if (intent.productType) {
    const entry = contextLibrary[intent.productType as keyof typeof contextLibrary];
    lines.push(`Detected product type: ${entry?.label ?? intent.productType}`);
  }
  if (intent.industry) lines.push(`Industry: ${intent.industry}`);
  if (intent.style) lines.push(`Style: ${intent.style}`);
  if (intent.features.length) lines.push(`Features: ${intent.features.join(", ")}`);
  if (intent.colorHint) lines.push(`Color hint: ${intent.colorHint}`);
  return lines;
}
