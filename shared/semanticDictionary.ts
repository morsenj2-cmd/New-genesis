export interface TargetAlias {
  target: string;
  aliases: string[];
}

export interface ValueAlias {
  normalized: string;
  aliases: string[];
}

export const TARGET_ALIASES: TargetAlias[] = [
  // Brand / name
  {
    target: "brand.name",
    aliases: [
      "name", "brand name", "brand", "site name", "website name", "app name",
      "product name", "company name", "logo text", "logo name", "title",
      "navbar name", "header name", "flowbase", "project name",
    ],
  },
  // Brand logo color
  {
    target: "brand.logoColor",
    aliases: [
      "logo color", "logo colour", "icon color", "logo tint", "brand color",
      "logo text color", "navbar color",
    ],
  },
  // Primary color
  {
    target: "theme.primaryColor",
    aliases: [
      "color", "colour", "primary color", "primary colour", "accent",
      "accent color", "main color", "theme color", "button color",
      "cta color", "highlight color", "palette", "color scheme", "colour scheme",
    ],
  },
  // Background color
  {
    target: "theme.backgroundColor",
    aliases: [
      "background", "background color", "bg color", "page color",
      "page background", "backdrop",
    ],
  },
  // Headline / hero copy
  {
    target: "content.headline",
    aliases: [
      "headline", "heading", "hero text", "hero heading", "main heading",
      "h1", "title text", "page title", "banner text",
    ],
  },
  // Subheadline
  {
    target: "content.subheadline",
    aliases: [
      "subheadline", "subheading", "sub heading", "subtitle", "description",
      "tagline", "hero description", "hero subtitle",
    ],
  },
  // CTA label
  {
    target: "content.ctaLabel",
    aliases: [
      "cta", "cta label", "button text", "call to action", "cta button",
      "action button", "get started button", "signup button",
    ],
  },
  // Typography / font
  {
    target: "theme.font",
    aliases: [
      "font", "typeface", "typography", "heading font", "text font",
      "font family", "type", "body font",
    ],
  },
  // Border radius / corners
  {
    target: "theme.radius",
    aliases: [
      "corners", "border radius", "roundness", "rounded", "radius",
      "corner style", "button shape",
    ],
  },
  // Spacing
  {
    target: "theme.spacing",
    aliases: [
      "spacing", "padding", "margin", "whitespace", "space", "gaps",
      "density", "compact", "airy",
    ],
  },
  // Layout / sections
  {
    target: "layout.sections",
    aliases: [
      "layout", "sections", "page layout", "structure", "arrangement",
      "page structure", "section order",
    ],
  },
  // Product type
  {
    target: "product.type",
    aliases: [
      "product type", "app type", "platform type", "industry", "category",
      "type of app", "type of website", "type of product",
    ],
  },
  // Style / mood
  {
    target: "theme.style",
    aliases: [
      "style", "theme", "mood", "vibe", "aesthetic", "look", "feel",
      "look and feel", "design style", "appearance",
    ],
  },
  // Animation / motion
  {
    target: "theme.motion",
    aliases: [
      "animation", "animations", "motion", "transitions", "effects",
      "animated", "movement",
    ],
  },
];

// Color value synonyms → normalized CSS color
export const COLOR_VALUE_ALIASES: Record<string, string> = {
  red: "hsl(0, 70%, 55%)",
  crimson: "hsl(348, 83%, 47%)",
  rose: "hsl(350, 89%, 60%)",
  pink: "hsl(330, 81%, 60%)",
  fuchsia: "hsl(292, 84%, 61%)",
  magenta: "hsl(300, 76%, 72%)",
  purple: "hsl(270, 70%, 60%)",
  violet: "hsl(258, 90%, 66%)",
  indigo: "hsl(238, 84%, 65%)",
  blue: "hsl(210, 80%, 56%)",
  "sky blue": "hsl(199, 89%, 48%)",
  cyan: "hsl(185, 75%, 50%)",
  teal: "hsl(173, 58%, 39%)",
  emerald: "hsl(152, 69%, 31%)",
  green: "hsl(142, 72%, 45%)",
  lime: "hsl(85, 75%, 45%)",
  yellow: "hsl(48, 90%, 50%)",
  amber: "hsl(38, 92%, 50%)",
  orange: "hsl(25, 95%, 53%)",
  "burnt orange": "hsl(20, 90%, 48%)",
  coral: "hsl(16, 100%, 66%)",
  salmon: "hsl(6, 93%, 71%)",
  gold: "hsl(43, 89%, 38%)",
  bronze: "hsl(29, 54%, 42%)",
  brown: "hsl(20, 37%, 38%)",
  white: "hsl(0, 0%, 98%)",
  black: "hsl(0, 0%, 5%)",
  gray: "hsl(220, 9%, 46%)",
  grey: "hsl(220, 9%, 46%)",
  slate: "hsl(215, 25%, 27%)",
  "dark blue": "hsl(222, 47%, 25%)",
  "navy": "hsl(228, 56%, 23%)",
};

// Style preset synonyms
export const STYLE_VALUE_ALIASES: Record<string, string> = {
  minimal: "minimal",
  minimalist: "minimal",
  clean: "minimal",
  simple: "minimal",
  flat: "minimal",
  bold: "bold",
  strong: "bold",
  impactful: "bold",
  vibrant: "vibrant",
  colorful: "vibrant",
  bright: "vibrant",
  futuristic: "futuristic",
  tech: "futuristic",
  cyber: "futuristic",
  dark: "dark",
  moody: "dark",
  elegant: "elegant",
  luxury: "elegant",
  premium: "elegant",
  playful: "playful",
  fun: "playful",
  energetic: "playful",
  corporate: "corporate",
  professional: "corporate",
  business: "corporate",
  creative: "creative",
  artistic: "creative",
};

// Radius value synonyms
export const RADIUS_VALUE_ALIASES: Record<string, string> = {
  round: "large",
  rounded: "large",
  pill: "pill",
  smooth: "large",
  circular: "pill",
  sharp: "none",
  square: "none",
  flat: "none",
  angular: "none",
  none: "none",
  small: "small",
  slight: "small",
  medium: "medium",
  moderate: "medium",
};

// Spacing value synonyms
export const SPACING_VALUE_ALIASES: Record<string, string> = {
  compact: "compact",
  tight: "compact",
  dense: "compact",
  narrow: "compact",
  small: "compact",
  airy: "airy",
  spacious: "airy",
  loose: "airy",
  open: "airy",
  large: "airy",
  comfortable: "balanced",
  balanced: "balanced",
  normal: "balanced",
  default: "balanced",
};

// Product type synonyms
export const PRODUCT_TYPE_ALIASES: Record<string, string> = {
  "cloud storage": "cloud_storage",
  "file storage": "cloud_storage",
  "file sharing": "cloud_storage",
  "document storage": "cloud_storage",
  "cloud files": "cloud_storage",
  "chat": "chat_app",
  "messaging": "chat_app",
  "team chat": "chat_app",
  "communication": "chat_app",
  "slack": "chat_app",
  "discord": "chat_app",
  "analytics": "analytics_dashboard",
  "dashboard": "analytics_dashboard",
  "data analytics": "analytics_dashboard",
  "business intelligence": "analytics_dashboard",
  "reporting": "analytics_dashboard",
  "metrics": "analytics_dashboard",
  "ecommerce": "ecommerce",
  "e-commerce": "ecommerce",
  "online store": "ecommerce",
  "shop": "ecommerce",
  "marketplace": "ecommerce",
  "store": "ecommerce",
  "retail": "ecommerce",
  "project management": "project_management",
  "task management": "project_management",
  "productivity": "project_management",
  "jira": "project_management",
  "trello": "project_management",
  "asana": "project_management",
  "crm": "crm",
  "customer relationship": "crm",
  "sales crm": "crm",
  "lead management": "crm",
  "contacts": "crm",
  "social media": "social_media",
  "social network": "social_media",
  "community": "social_media",
  "instagram": "social_media",
  "twitter": "social_media",
  "saas": "saas_generic",
  "software as a service": "saas_generic",
  "platform": "saas_generic",
  "developer tool": "developer_tool",
  "dev tool": "developer_tool",
  "api": "developer_tool",
  "sdk": "developer_tool",
  "developer platform": "developer_tool",
  "coding": "developer_tool",
  "video": "video_platform",
  "streaming": "video_platform",
  "youtube": "video_platform",
  "video platform": "video_platform",
  "media": "video_platform",
  "fintech": "fintech",
  "finance": "fintech",
  "banking": "fintech",
  "payments": "fintech",
  "investment": "fintech",
  "loans": "fintech",
  "healthcare": "healthcare",
  "health": "healthcare",
  "medical": "healthcare",
  "hospital": "healthcare",
  "clinic": "healthcare",
  "telemedicine": "healthcare",
  "education": "education",
  "learning": "education",
  "e-learning": "education",
  "course": "education",
  "lms": "education",
  "edtech": "education",
  "university": "education",
  "calendar": "calendar_scheduling",
  "scheduling": "calendar_scheduling",
  "booking": "calendar_scheduling",
  "appointments": "calendar_scheduling",
  "reservation": "calendar_scheduling",
};
