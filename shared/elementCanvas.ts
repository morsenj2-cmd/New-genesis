export type ElementType =
  | "badge"
  | "headline"
  | "subheadline"
  | "paragraph"
  | "button_primary"
  | "button_secondary"
  | "section_title"
  | "card_icon"
  | "card_title"
  | "card_description"
  | "stat_value"
  | "stat_label"
  | "testimonial_text"
  | "testimonial_author"
  | "image_block"
  | "divider";

export interface ElementNode {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  zIndex: number;
  locked?: boolean;
}

export interface SectionCanvas {
  sectionType: string;
  height: number;
  elements: ElementNode[];
}

export const ELEMENT_CANVAS_WIDTH = 1200;

function u(id: string): string { return id; }
function snap8(n: number): number { return Math.round(n / 8) * 8; }

const CARD_TITLES = [
  "Lightning Fast", "Easy Setup", "Secure by Default",
  "Smart Analytics", "Full API Access", "24/7 Support",
  "Team Collaboration", "Custom Workflows",
];
const CARD_DESCS = [
  "Built for performance with sub-100ms response times at any scale.",
  "Get your team up and running in minutes with guided onboarding.",
  "End-to-end encryption and SOC 2 certification on all plans.",
  "Real-time insights into usage, trends, and team performance.",
  "Programmatic access to every feature via our modern REST API.",
  "Our team is available around the clock to help you succeed.",
  "Work together in real-time with shared workspaces and live updates.",
  "Build automations that match exactly how your team works.",
];

export interface ElementContent {
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
  secondaryCtaLabel?: string;
  ctaHeadline?: string;
  ctaBody?: string;
  ctaButtonLabel?: string;
  featureGridTitle?: string;
  cardListTitle?: string;
  brandName?: string;
}

export function decomposeHero(alignment = "center", content?: ElementContent): SectionCanvas {
  const W = ELEMENT_CANVAS_WIDTH;
  const cx = W / 2;
  const isCenter = alignment !== "left" && alignment !== "right";
  const isRight = alignment === "right";
  const contentX = isCenter ? 160 : isRight ? W - 640 : 80;
  const contentW = isCenter ? W - 320 : 560;
  const btnX = isCenter ? cx - 160 : contentX;

  return {
    sectionType: "hero",
    height: 500,
    elements: [
      { id: u("hero-headline"), type: "headline", x: contentX, y: 56, width: contentW, height: 100, content: content?.headline ?? "Build something incredible today", zIndex: 1 },
      { id: u("hero-subheadline"), type: "subheadline", x: isCenter ? contentX + 80 : contentX, y: 228, width: isCenter ? contentW - 160 : contentW, height: 60, content: content?.subheadline ?? "The modern platform for every workflow.", zIndex: 1 },
      { id: u("hero-btn-primary"), type: "button_primary", x: btnX, y: 320, width: 156, height: 44, content: content?.ctaLabel ?? "Get Started Free", zIndex: 2 },
      { id: u("hero-btn-secondary"), type: "button_secondary", x: btnX + 172, y: 320, width: 156, height: 44, content: content?.secondaryCtaLabel ?? "See How It Works", zIndex: 2 },
    ],
  };
}

export function decomposeFeatureGrid(columns = 3, content?: ElementContent): SectionCanvas {
  const W = ELEMENT_CANVAS_WIDTH;
  const PAD = 80;
  const GAP = 24;
  const cardW = snap8(Math.floor((W - PAD * 2 - GAP * (columns - 1)) / columns));
  const cardH = 200;
  const count = columns <= 2 ? 4 : columns === 3 ? 6 : 8;

  const elements: ElementNode[] = [
    { id: u("fg-title"), type: "section_title", x: PAD, y: 48, width: W - PAD * 2, height: 48, content: content?.featureGridTitle ?? "Everything your team needs", zIndex: 1 },
  ];

  for (let i = 0; i < count; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = PAD + col * (cardW + GAP);
    const y = 128 + row * (cardH + 20);
    elements.push(
      { id: u(`fg-icon-${i}`), type: "card_icon", x: x + 20, y: y + 20, width: 36, height: 36, content: "⚡", zIndex: 1 },
      { id: u(`fg-ctitle-${i}`), type: "card_title", x: x + 20, y: y + 68, width: cardW - 40, height: 28, content: CARD_TITLES[i % CARD_TITLES.length], zIndex: 1 },
      { id: u(`fg-cdesc-${i}`), type: "card_description", x: x + 20, y: y + 104, width: cardW - 40, height: 80, content: CARD_DESCS[i % CARD_DESCS.length], zIndex: 1 },
    );
  }

  const rowCount = Math.ceil(count / columns);
  return { sectionType: "featureGrid", height: 128 + rowCount * (cardH + 20) + 48, elements };
}

export function decomposeCardList(columns = 2, cardCount = 3, content?: ElementContent): SectionCanvas {
  const W = ELEMENT_CANVAS_WIDTH;
  const PAD = 80;
  const GAP = 24;
  const cardW = snap8(Math.floor((W - PAD * 2 - GAP * (columns - 1)) / columns));
  const cardH = 160;

  const elements: ElementNode[] = [
    { id: u("cl-title"), type: "section_title", x: PAD, y: 48, width: W - PAD * 2, height: 48, content: content?.cardListTitle ?? "Built for how teams work", zIndex: 1 },
  ];

  for (let i = 0; i < cardCount; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = PAD + col * (cardW + GAP);
    const y = 128 + row * (cardH + 20);
    elements.push(
      { id: u(`cl-ctitle-${i}`), type: "card_title", x: x + 20, y: y + 20, width: cardW - 40, height: 28, content: CARD_TITLES[(i + 2) % CARD_TITLES.length], zIndex: 1 },
      { id: u(`cl-cdesc-${i}`), type: "card_description", x: x + 20, y: y + 56, width: cardW - 40, height: 80, content: CARD_DESCS[(i + 2) % CARD_DESCS.length], zIndex: 1 },
    );
  }

  const rowCount = Math.ceil(cardCount / columns);
  return { sectionType: "cardList", height: 128 + rowCount * (cardH + 20) + 48, elements };
}

export function decomposeStats(columns = 3): SectionCanvas {
  const W = ELEMENT_CANVAS_WIDTH;
  const items = [
    { value: "99.9%", label: "Uptime" },
    { value: "50K+", label: "Teams" },
    { value: "10 min", label: "Setup" },
    { value: "24/7", label: "Support" },
  ];
  const count = Math.min(columns, items.length);
  const itemW = Math.floor((W - 160) / count);

  const elements: ElementNode[] = [];
  for (let i = 0; i < count; i++) {
    const cx = 80 + i * itemW + itemW / 2;
    elements.push(
      { id: u(`stat-value-${i}`), type: "stat_value", x: cx - 72, y: 40, width: 144, height: 52, content: items[i].value, zIndex: 1 },
      { id: u(`stat-label-${i}`), type: "stat_label", x: cx - 72, y: 100, width: 144, height: 28, content: items[i].label, zIndex: 1 },
    );
  }

  return { sectionType: "stats", height: 160, elements };
}

export function decomposeTestimonial(cardCount = 2): SectionCanvas {
  const W = ELEMENT_CANVAS_WIDTH;
  const PAD = 80;
  const GAP = 24;
  const cardW = snap8(Math.floor((W - PAD * 2 - GAP * (cardCount - 1)) / cardCount));

  const quotes = [
    "The fastest setup we've experienced. Our team was productive from day one.",
    "It replaced three tools we were paying for and works better than all of them.",
    "Support is incredible — every question answered within the hour.",
  ];
  const authors = ["Alex Kim · VP Engineering", "Sara M. · Product Lead", "Jordan R. · CTO"];

  const elements: ElementNode[] = [
    { id: u("testi-title"), type: "section_title", x: PAD, y: 48, width: W - PAD * 2, height: 48, content: "Loved by teams everywhere", zIndex: 1 },
  ];

  for (let i = 0; i < cardCount; i++) {
    const x = PAD + i * (cardW + GAP);
    elements.push(
      { id: u(`testi-text-${i}`), type: "testimonial_text", x: x + 24, y: 124, width: cardW - 48, height: 84, content: `"${quotes[i % quotes.length]}"`, zIndex: 1 },
      { id: u(`testi-author-${i}`), type: "testimonial_author", x: x + 24, y: 224, width: cardW - 48, height: 28, content: authors[i % authors.length], zIndex: 1 },
    );
  }

  return { sectionType: "testimonial", height: 296, elements };
}

export function decomposeCta(content?: ElementContent): SectionCanvas {
  const W = ELEMENT_CANVAS_WIDTH;
  const cx = W / 2;
  return {
    sectionType: "cta",
    height: 256,
    elements: [
      { id: u("cta-headline"), type: "headline", x: 200, y: 48, width: W - 400, height: 72, content: content?.ctaHeadline ?? "Start building today", zIndex: 1 },
      { id: u("cta-body"), type: "paragraph", x: 300, y: 136, width: W - 600, height: 40, content: content?.ctaBody ?? "Free to start. No credit card required.", zIndex: 1 },
      { id: u("cta-btn"), type: "button_primary", x: cx - 80, y: 192, width: 160, height: 44, content: content?.ctaButtonLabel ?? "Get started free", zIndex: 2 },
    ],
  };
}

export function decomposeSection(
  section: { type: string; alignment?: string; columns?: number; cardCount?: number },
  content?: ElementContent,
): SectionCanvas {
  switch (section.type) {
    case "hero":        return decomposeHero(section.alignment, content);
    case "featureGrid": return decomposeFeatureGrid(section.columns ?? 3, content);
    case "cardList":    return decomposeCardList(section.columns ?? 2, section.cardCount ?? 3, content);
    case "stats":       return decomposeStats(section.columns ?? 3);
    case "testimonial": return decomposeTestimonial(section.cardCount ?? 2);
    case "cta":         return decomposeCta(content);
    default:            return { sectionType: section.type, height: 80, elements: [] };
  }
}

// Returns true if an element type has editable text content
export const EDITABLE_TYPES = new Set<ElementType>([
  "badge", "headline", "subheadline", "paragraph",
  "button_primary", "button_secondary", "section_title",
  "card_title", "card_description",
  "stat_value", "stat_label",
  "testimonial_text", "testimonial_author",
]);

export const ELEMENT_TYPE_LABELS: Record<ElementType, string> = {
  badge:               "Badge",
  headline:            "Headline",
  subheadline:         "Subheadline",
  paragraph:           "Paragraph",
  button_primary:      "Primary Button",
  button_secondary:    "Secondary Button",
  section_title:       "Section Title",
  card_icon:           "Card Icon",
  card_title:          "Card Title",
  card_description:    "Card Description",
  stat_value:          "Stat Value",
  stat_label:          "Stat Label",
  testimonial_text:    "Testimonial",
  testimonial_author:  "Author",
  image_block:         "Image",
  divider:             "Divider",
};
