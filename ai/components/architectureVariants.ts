export interface ArchitectureVariant {
  id: string;
  category: string;
  name: string;
  structure: string;
  orientation: "horizontal" | "vertical" | "split" | "grid" | "overlay";
  density: "minimal" | "compact" | "standard" | "dense";
  interactionModel: "static" | "interactive" | "expandable" | "draggable";
}

const HERO_ARCHITECTURES: ArchitectureVariant[] = [
  { id: "arch-hero-centered-media", category: "hero", name: "Centered with Background Media", structure: "vertical-stack", orientation: "vertical", density: "minimal", interactionModel: "static" },
  { id: "arch-hero-split-image", category: "hero", name: "Split Content / Image", structure: "split-grid", orientation: "split", density: "standard", interactionModel: "static" },
  { id: "arch-hero-asymmetric", category: "hero", name: "Asymmetric Content Layout", structure: "asymmetric-grid", orientation: "horizontal", density: "standard", interactionModel: "static" },
  { id: "arch-hero-minimal-text", category: "hero", name: "Minimal Text Only", structure: "centered-stack", orientation: "vertical", density: "minimal", interactionModel: "static" },
  { id: "arch-hero-card-grid", category: "hero", name: "Hero with Card Grid", structure: "card-below", orientation: "vertical", density: "compact", interactionModel: "interactive" },
  { id: "arch-hero-video-bg", category: "hero", name: "Video Background Hero", structure: "overlay", orientation: "overlay", density: "minimal", interactionModel: "static" },
  { id: "arch-hero-floating-card", category: "hero", name: "Floating Card Overlay", structure: "floating-panel", orientation: "overlay", density: "standard", interactionModel: "static" },
  { id: "arch-hero-gradient-sweep", category: "hero", name: "Gradient Sweep Hero", structure: "full-width", orientation: "horizontal", density: "minimal", interactionModel: "static" },
];

const CONTENT_GRID_ARCHITECTURES: ArchitectureVariant[] = [
  { id: "arch-grid-uniform", category: "content_grid", name: "Uniform Card Grid", structure: "equal-columns", orientation: "grid", density: "standard", interactionModel: "interactive" },
  { id: "arch-grid-masonry", category: "content_grid", name: "Masonry Layout", structure: "masonry", orientation: "vertical", density: "dense", interactionModel: "interactive" },
  { id: "arch-grid-alternating", category: "content_grid", name: "Alternating Wide/Narrow", structure: "alternating-rows", orientation: "horizontal", density: "standard", interactionModel: "static" },
  { id: "arch-grid-featured", category: "content_grid", name: "Featured Item + Grid", structure: "featured-grid", orientation: "split", density: "standard", interactionModel: "interactive" },
  { id: "arch-grid-sidebar", category: "content_grid", name: "Sidebar Filter + Grid", structure: "sidebar-main", orientation: "horizontal", density: "compact", interactionModel: "interactive" },
  { id: "arch-grid-stacked", category: "content_grid", name: "Stacked Full-Width Panels", structure: "stacked-panels", orientation: "vertical", density: "standard", interactionModel: "expandable" },
  { id: "arch-grid-carousel", category: "content_grid", name: "Horizontal Scroll Carousel", structure: "horizontal-scroll", orientation: "horizontal", density: "compact", interactionModel: "draggable" },
];

const CARD_COLLECTION_ARCHITECTURES: ArchitectureVariant[] = [
  { id: "arch-cards-grid", category: "card_collection", name: "Card Grid Layout", structure: "grid", orientation: "grid", density: "standard", interactionModel: "interactive" },
  { id: "arch-cards-list", category: "card_collection", name: "Vertical List Layout", structure: "list", orientation: "vertical", density: "compact", interactionModel: "interactive" },
  { id: "arch-cards-horizontal", category: "card_collection", name: "Horizontal Card Row", structure: "row", orientation: "horizontal", density: "standard", interactionModel: "interactive" },
  { id: "arch-cards-stacked", category: "card_collection", name: "Overlapping Stack", structure: "stack", orientation: "vertical", density: "dense", interactionModel: "static" },
  { id: "arch-cards-gallery", category: "card_collection", name: "Gallery Mosaic", structure: "mosaic", orientation: "grid", density: "dense", interactionModel: "interactive" },
  { id: "arch-cards-timeline", category: "card_collection", name: "Timeline Layout", structure: "timeline", orientation: "vertical", density: "standard", interactionModel: "expandable" },
];

const DATA_DISPLAY_ARCHITECTURES: ArchitectureVariant[] = [
  { id: "arch-data-metric-cards", category: "data_display", name: "Metric Card Row", structure: "card-row", orientation: "horizontal", density: "compact", interactionModel: "interactive" },
  { id: "arch-data-chart-grid", category: "data_display", name: "Chart Grid Dashboard", structure: "chart-grid", orientation: "grid", density: "dense", interactionModel: "interactive" },
  { id: "arch-data-table", category: "data_display", name: "Data Table View", structure: "table", orientation: "vertical", density: "dense", interactionModel: "interactive" },
  { id: "arch-data-sidebar-detail", category: "data_display", name: "Sidebar with Detail Panel", structure: "sidebar-detail", orientation: "split", density: "standard", interactionModel: "expandable" },
  { id: "arch-data-stat-bands", category: "data_display", name: "Stat Highlight Bands", structure: "bands", orientation: "horizontal", density: "standard", interactionModel: "static" },
  { id: "arch-data-progress-board", category: "data_display", name: "Progress Board", structure: "board", orientation: "horizontal", density: "standard", interactionModel: "interactive" },
];

const SOCIAL_PROOF_ARCHITECTURES: ArchitectureVariant[] = [
  { id: "arch-social-carousel", category: "social_proof", name: "Testimonial Carousel", structure: "carousel", orientation: "horizontal", density: "standard", interactionModel: "interactive" },
  { id: "arch-social-grid", category: "social_proof", name: "Quote Card Grid", structure: "grid", orientation: "grid", density: "standard", interactionModel: "static" },
  { id: "arch-social-stacked", category: "social_proof", name: "Stacked Quotes", structure: "stack", orientation: "vertical", density: "compact", interactionModel: "static" },
  { id: "arch-social-featured", category: "social_proof", name: "Featured Testimonial + Mini Grid", structure: "featured-grid", orientation: "split", density: "standard", interactionModel: "static" },
  { id: "arch-social-marquee", category: "social_proof", name: "Logo Marquee with Quotes", structure: "marquee", orientation: "horizontal", density: "minimal", interactionModel: "static" },
];

const CTA_ARCHITECTURES: ArchitectureVariant[] = [
  { id: "arch-cta-gradient-banner", category: "call_to_action", name: "Full-Width Gradient Banner", structure: "banner", orientation: "horizontal", density: "minimal", interactionModel: "static" },
  { id: "arch-cta-split-action", category: "call_to_action", name: "Split Content/Action", structure: "split", orientation: "split", density: "standard", interactionModel: "static" },
  { id: "arch-cta-floating-card", category: "call_to_action", name: "Floating CTA Card", structure: "floating", orientation: "vertical", density: "compact", interactionModel: "static" },
  { id: "arch-cta-inline-form", category: "call_to_action", name: "Inline Form CTA", structure: "form", orientation: "horizontal", density: "standard", interactionModel: "interactive" },
  { id: "arch-cta-stacked", category: "call_to_action", name: "Stacked Action Block", structure: "stack", orientation: "vertical", density: "standard", interactionModel: "static" },
];

const FILE_STORAGE_ARCHITECTURES: ArchitectureVariant[] = [
  { id: "arch-file-browser-grid", category: "file_storage", name: "File Browser Grid", structure: "grid", orientation: "grid", density: "standard", interactionModel: "interactive" },
  { id: "arch-file-browser-table", category: "file_storage", name: "File Browser Table", structure: "table", orientation: "vertical", density: "dense", interactionModel: "interactive" },
  { id: "arch-file-explorer-sidebar", category: "file_storage", name: "File Explorer Sidebar", structure: "sidebar-tree", orientation: "split", density: "standard", interactionModel: "expandable" },
  { id: "arch-file-card-gallery", category: "file_storage", name: "File Card Gallery", structure: "gallery", orientation: "grid", density: "compact", interactionModel: "interactive" },
  { id: "arch-file-column-layout", category: "file_storage", name: "Column Storage Layout", structure: "columns", orientation: "horizontal", density: "standard", interactionModel: "draggable" },
  { id: "arch-file-panel-layout", category: "file_storage", name: "Panel Storage Interface", structure: "panels", orientation: "split", density: "standard", interactionModel: "expandable" },
];

const ARCHITECTURE_REGISTRY: Record<string, ArchitectureVariant[]> = {
  hero: HERO_ARCHITECTURES,
  content_grid: CONTENT_GRID_ARCHITECTURES,
  card_collection: CARD_COLLECTION_ARCHITECTURES,
  data_display: DATA_DISPLAY_ARCHITECTURES,
  social_proof: SOCIAL_PROOF_ARCHITECTURES,
  call_to_action: CTA_ARCHITECTURES,
  file_storage: FILE_STORAGE_ARCHITECTURES,
};

function seedByte(seed: string, offset: number): number {
  const idx = (offset * 2) % Math.max(1, seed.length - 1);
  const val = parseInt(seed.slice(idx, idx + 2) || "00", 16);
  return Number.isNaN(val) ? (offset * 37 + 13) % 256 : val;
}

export function selectArchitectureVariant(
  category: string,
  seed: string,
  sectionOffset: number = 0,
): ArchitectureVariant | null {
  const variants = ARCHITECTURE_REGISTRY[category];
  if (!variants || variants.length === 0) return null;
  const index = seedByte(seed, sectionOffset * 5) % variants.length;
  return variants[index];
}

export function getArchitectureCategories(): string[] {
  return Object.keys(ARCHITECTURE_REGISTRY);
}

export function getVariantsForCategory(category: string): ArchitectureVariant[] {
  return ARCHITECTURE_REGISTRY[category] || [];
}
