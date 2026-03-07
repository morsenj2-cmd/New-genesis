import contextLibrary from "./contextLibrary.json";

export interface InterpretedIntent {
  industry: string | null;
  productType: string | null;
  style: string | null;
  features: string[];
  colorHint: string | null;
  fontHint: string | null;
  logoColorHint: string | null;
  spacingHint: "increase" | "decrease" | null;
  radiusHint: "increase" | "decrease" | null;
  backgroundHint: "light" | "dark" | null;
  textSizeHint: "increase" | "decrease" | null;
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

export const COLOR_KEYWORDS: Record<string, string> = {
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
  silver:  "gray",
};

const FONT_NAME_MAP: Record<string, string> = {
  inter:            "Inter",
  roboto:           "Roboto",
  poppins:          "Poppins",
  montserrat:       "Montserrat",
  "open sans":      "Open Sans",
  opensans:         "Open Sans",
  lato:             "Lato",
  raleway:          "Raleway",
  oswald:           "Oswald",
  nunito:           "Nunito",
  "source sans":    "Source Sans 3",
  ubuntu:           "Ubuntu",
  rubik:            "Rubik",
  "work sans":      "Work Sans",
  worksans:         "Work Sans",
  manrope:          "Manrope",
  outfit:           "Outfit",
  "dm sans":        "DM Sans",
  geist:            "Geist",
  syne:             "Syne",
  "fira sans":      "Fira Sans",
  "space grotesk":  "Space Grotesk",
  spacegrotesk:     "Space Grotesk",
  "ibm plex":       "IBM Plex Sans",
  "plus jakarta":   "Plus Jakarta Sans",
  playfair:         "Playfair Display",
  "playfair display": "Playfair Display",
  lora:             "Lora",
  merriweather:     "Merriweather",
  "libre baskerville": "Libre Baskerville",
  "cormorant":      "Cormorant",
  fraunces:         "Fraunces",
  serif:            "Playfair Display",
  "sans serif":     "Inter",
  "sans-serif":     "Inter",
  monospace:        "JetBrains Mono",
  mono:             "JetBrains Mono",
  "jetbrains":      "JetBrains Mono",
  "jetbrains mono": "JetBrains Mono",
  "fira code":      "Fira Code",
  "firacode":       "Fira Code",
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
  "real estate": "real_estate",
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

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(t => t.length > 0);
}

function detectFontHint(text: string): string | null {
  for (const [keyword, fontName] of Object.entries(FONT_NAME_MAP)) {
    if (text.includes(keyword)) {
      return fontName;
    }
  }
  return null;
}

function detectLogoColor(text: string): string | null {
  const logoPatterns = [
    /logo\s+(?:color\s+)?(?:to\s+|is\s+|be\s+)?(\w+)/,
    /(?:make|set|change|turn)\s+(?:the\s+)?(?:\w+\s+)*logo\s+(?:color\s+)?(?:to\s+)?(\w+)/,
    /logo\s+should\s+(?:be\s+)?(\w+)/,
    /logo\s+(?:color\s+)?=\s*(\w+)/,
    /(\w+)\s+(?:colored?\s+)?logo/,
  ];
  for (const pattern of logoPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && COLOR_KEYWORDS[match[1]]) {
      return COLOR_KEYWORDS[match[1]];
    }
  }

  const tokens = tokenize(text);
  const logoIdx = tokens.indexOf("logo");
  if (logoIdx !== -1) {
    for (let offset = -3; offset <= 3; offset++) {
      if (offset === 0) continue;
      const candidate = tokens[logoIdx + offset];
      if (candidate && COLOR_KEYWORDS[candidate]) {
        return COLOR_KEYWORDS[candidate];
      }
    }
  }
  return null;
}

function detectSpacingHint(text: string): "increase" | "decrease" | null {
  const tokens = tokenize(text);
  const decrease = [
    "reduce spacing", "less spacing", "tight spacing", "compact", "reduce padding",
    "less padding", "smaller spacing", "decrease spacing", "narrow spacing",
    "tighter spacing", "condense", "condensed",
  ];
  const increase = [
    "increase spacing", "more spacing", "spacious", "airy", "more padding",
    "larger spacing", "bigger spacing", "open layout", "more whitespace", "more white space",
    "expand spacing", "wider spacing", "breathe",
  ];
  if (decrease.some(p => text.includes(p))) return "decrease";
  if (increase.some(p => text.includes(p))) return "increase";

  const spacingIdx = tokens.findIndex(t => ["spacing", "space", "padding", "gaps", "gap"].includes(t));
  if (spacingIdx !== -1) {
    const nearby = tokens.slice(Math.max(0, spacingIdx - 3), spacingIdx + 3);
    if (nearby.some(t => ["increase", "more", "add", "bigger", "larger", "wider"].includes(t))) return "increase";
    if (nearby.some(t => ["decrease", "reduce", "less", "smaller", "tighter", "narrow"].includes(t))) return "decrease";
  }
  return null;
}

function detectRadiusHint(text: string): "increase" | "decrease" | null {
  const tokens = tokenize(text);
  const increase = [
    "rounded", "round corners", "soft corners", "pill", "pill buttons",
    "more rounded", "circular", "more round", "make corners round",
    "make rounded", "rounder", "smooth corners", "curved",
  ];
  const decrease = [
    "sharp corners", "square corners", "no rounded", "no round", "sharp buttons",
    "angular", "straight corners", "less rounded", "flat corners",
    "make corners sharp", "sharp edges", "boxy", "no radius",
  ];
  if (decrease.some(p => text.includes(p))) return "decrease";
  if (increase.some(p => text.includes(p))) return "increase";

  const cornerIdx = tokens.findIndex(t => ["corners", "corner", "radius", "buttons"].includes(t));
  if (cornerIdx !== -1) {
    const nearby = tokens.slice(Math.max(0, cornerIdx - 3), cornerIdx + 3);
    if (nearby.some(t => ["round", "rounded", "smooth", "soft", "curved"].includes(t))) return "increase";
    if (nearby.some(t => ["sharp", "square", "flat", "angular", "straight"].includes(t))) return "decrease";
  }

  if (tokens.includes("rounded") && !tokens.includes("less") && !tokens.includes("remove")) return "increase";
  if (tokens.includes("sharp") && tokens.some(t => ["make", "be", "use"].includes(t))) return "decrease";

  return null;
}

function detectBackgroundHint(text: string): "light" | "dark" | null {
  const light = [
    "light background", "white background", "light mode", "bright background",
    "light theme", "make it light", "light color scheme", "bright mode",
  ];
  const dark = [
    "dark background", "black background", "dark mode", "dark theme",
    "make it dark", "dark color scheme",
  ];
  if (light.some(p => text.includes(p))) return "light";
  if (dark.some(p => text.includes(p))) return "dark";

  const tokens = tokenize(text);
  const bgIdx = tokens.findIndex(t => ["background", "bg", "theme", "mode"].includes(t));
  if (bgIdx !== -1) {
    const nearby = tokens.slice(Math.max(0, bgIdx - 3), bgIdx + 3);
    if (nearby.some(t => ["light", "white", "bright", "pale"].includes(t))) return "light";
    if (nearby.some(t => ["dark", "black", "night", "dim"].includes(t))) return "dark";
  }
  return null;
}

function detectTextSizeHint(text: string): "increase" | "decrease" | null {
  const increase = [
    "larger text", "bigger text", "increase font size", "larger font",
    "bigger font", "make text larger", "make text bigger", "increase text size",
    "more readable", "increase typography", "larger type",
  ];
  const decrease = [
    "smaller text", "smaller font", "reduce font size", "decrease font size",
    "make text smaller", "reduce text size", "decrease typography", "compact text",
  ];
  if (increase.some(p => text.includes(p))) return "increase";
  if (decrease.some(p => text.includes(p))) return "decrease";

  const tokens = tokenize(text);
  const textIdx = tokens.findIndex(t => ["text", "font", "type", "typography", "size"].includes(t));
  if (textIdx !== -1) {
    const nearby = tokens.slice(Math.max(0, textIdx - 3), textIdx + 3);
    if (nearby.some(t => ["larger", "bigger", "increase", "large", "more"].includes(t))) return "increase";
    if (nearby.some(t => ["smaller", "smaller", "decrease", "small", "less"].includes(t))) return "decrease";
  }
  return null;
}

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

  const logoColorHint = detectLogoColor(text);

  let colorHint: string | null = null;
  if (!logoColorHint) {
    for (const [word, color] of Object.entries(COLOR_KEYWORDS)) {
      if (new RegExp(`\\b${word}\\b`).test(text)) {
        colorHint = color;
        break;
      }
    }
  }

  const fontHint = detectFontHint(text);
  const spacingHint = detectSpacingHint(text);
  const radiusHint = detectRadiusHint(text);
  const backgroundHint = detectBackgroundHint(text);
  const textSizeHint = detectTextSizeHint(text);

  return {
    industry,
    productType,
    style,
    features,
    colorHint,
    fontHint,
    logoColorHint,
    spacingHint,
    radiusHint,
    backgroundHint,
    textSizeHint,
    rawText: input,
  };
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
  if (intent.fontHint) lines.push(`Font: ${intent.fontHint}`);
  if (intent.logoColorHint) lines.push(`Logo color: ${intent.logoColorHint}`);
  return lines;
}
