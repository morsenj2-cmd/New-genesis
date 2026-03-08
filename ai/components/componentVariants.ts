export type ComponentCategory =
  | "hero"
  | "upload"
  | "dashboard"
  | "dataTable"
  | "navigation"
  | "card"
  | "form"
  | "actionPanel";

export type LayoutOrientation = "horizontal" | "vertical" | "split" | "stacked" | "overlay";
export type InformationDensity = "minimal" | "compact" | "standard" | "dense";
export type InteractionStyle = "static" | "hover-reveal" | "expandable" | "inline-edit" | "drag-drop";
export type VisualHierarchy = "flat" | "layered" | "card-based" | "bordered" | "gradient";

export interface ComponentVariant {
  id: string;
  category: ComponentCategory;
  name: string;
  orientation: LayoutOrientation;
  density: InformationDensity;
  interaction: InteractionStyle;
  hierarchy: VisualHierarchy;
  columns?: number;
  hasMedia: boolean;
  hasSecondaryAction: boolean;
  contentSlots: number;
}

const HERO_VARIANTS: ComponentVariant[] = [
  {
    id: "hero-centered-media",
    category: "hero",
    name: "Centered with Media",
    orientation: "stacked",
    density: "minimal",
    interaction: "static",
    hierarchy: "gradient",
    hasMedia: true,
    hasSecondaryAction: true,
    contentSlots: 3,
  },
  {
    id: "hero-split-left",
    category: "hero",
    name: "Split Left Content",
    orientation: "split",
    density: "standard",
    interaction: "static",
    hierarchy: "layered",
    hasMedia: true,
    hasSecondaryAction: true,
    contentSlots: 4,
  },
  {
    id: "hero-split-right",
    category: "hero",
    name: "Split Right Content",
    orientation: "split",
    density: "standard",
    interaction: "static",
    hierarchy: "layered",
    hasMedia: true,
    hasSecondaryAction: false,
    contentSlots: 3,
  },
  {
    id: "hero-fullscreen",
    category: "hero",
    name: "Full Screen Overlay",
    orientation: "overlay",
    density: "minimal",
    interaction: "static",
    hierarchy: "gradient",
    hasMedia: true,
    hasSecondaryAction: true,
    contentSlots: 2,
  },
  {
    id: "hero-compact",
    category: "hero",
    name: "Compact Banner",
    orientation: "horizontal",
    density: "compact",
    interaction: "static",
    hierarchy: "flat",
    hasMedia: false,
    hasSecondaryAction: false,
    contentSlots: 2,
  },
  {
    id: "hero-video",
    category: "hero",
    name: "Video Background",
    orientation: "overlay",
    density: "minimal",
    interaction: "hover-reveal",
    hierarchy: "gradient",
    hasMedia: true,
    hasSecondaryAction: true,
    contentSlots: 3,
  },
];

const UPLOAD_VARIANTS: ComponentVariant[] = [
  {
    id: "upload-dropzone",
    category: "upload",
    name: "Drag & Drop Zone",
    orientation: "vertical",
    density: "standard",
    interaction: "drag-drop",
    hierarchy: "bordered",
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 2,
  },
  {
    id: "upload-inline",
    category: "upload",
    name: "Inline Upload Button",
    orientation: "horizontal",
    density: "compact",
    interaction: "static",
    hierarchy: "flat",
    hasMedia: false,
    hasSecondaryAction: false,
    contentSlots: 1,
  },
  {
    id: "upload-gallery",
    category: "upload",
    name: "Gallery Upload Grid",
    orientation: "stacked",
    density: "standard",
    interaction: "drag-drop",
    hierarchy: "card-based",
    columns: 3,
    hasMedia: true,
    hasSecondaryAction: true,
    contentSlots: 4,
  },
  {
    id: "upload-split-preview",
    category: "upload",
    name: "Split with Preview",
    orientation: "split",
    density: "standard",
    interaction: "drag-drop",
    hierarchy: "layered",
    hasMedia: true,
    hasSecondaryAction: true,
    contentSlots: 3,
  },
];

const DASHBOARD_VARIANTS: ComponentVariant[] = [
  {
    id: "dashboard-metric-grid",
    category: "dashboard",
    name: "Metric Card Grid",
    orientation: "horizontal",
    density: "dense",
    interaction: "hover-reveal",
    hierarchy: "card-based",
    columns: 4,
    hasMedia: false,
    hasSecondaryAction: false,
    contentSlots: 4,
  },
  {
    id: "dashboard-sidebar-main",
    category: "dashboard",
    name: "Sidebar with Main Panel",
    orientation: "split",
    density: "standard",
    interaction: "expandable",
    hierarchy: "layered",
    columns: 2,
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 5,
  },
  {
    id: "dashboard-top-charts",
    category: "dashboard",
    name: "Top Stats with Charts",
    orientation: "stacked",
    density: "standard",
    interaction: "hover-reveal",
    hierarchy: "card-based",
    columns: 3,
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 6,
  },
  {
    id: "dashboard-compact-list",
    category: "dashboard",
    name: "Compact List View",
    orientation: "vertical",
    density: "dense",
    interaction: "inline-edit",
    hierarchy: "bordered",
    columns: 1,
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 3,
  },
  {
    id: "dashboard-wide-panels",
    category: "dashboard",
    name: "Wide Panel Layout",
    orientation: "horizontal",
    density: "standard",
    interaction: "expandable",
    hierarchy: "layered",
    columns: 2,
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 4,
  },
];

const DATA_TABLE_VARIANTS: ComponentVariant[] = [
  {
    id: "table-standard",
    category: "dataTable",
    name: "Standard Table",
    orientation: "vertical",
    density: "standard",
    interaction: "static",
    hierarchy: "bordered",
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 5,
  },
  {
    id: "table-compact",
    category: "dataTable",
    name: "Compact Dense Table",
    orientation: "vertical",
    density: "dense",
    interaction: "inline-edit",
    hierarchy: "flat",
    hasMedia: false,
    hasSecondaryAction: false,
    contentSlots: 6,
  },
  {
    id: "table-card-rows",
    category: "dataTable",
    name: "Card Row Table",
    orientation: "vertical",
    density: "standard",
    interaction: "expandable",
    hierarchy: "card-based",
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 4,
  },
  {
    id: "table-split-detail",
    category: "dataTable",
    name: "Split with Detail Panel",
    orientation: "split",
    density: "standard",
    interaction: "hover-reveal",
    hierarchy: "layered",
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 5,
  },
];

const NAVIGATION_VARIANTS: ComponentVariant[] = [
  {
    id: "nav-top-bar",
    category: "navigation",
    name: "Top Navigation Bar",
    orientation: "horizontal",
    density: "compact",
    interaction: "hover-reveal",
    hierarchy: "flat",
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 4,
  },
  {
    id: "nav-sidebar",
    category: "navigation",
    name: "Sidebar Navigation",
    orientation: "vertical",
    density: "standard",
    interaction: "expandable",
    hierarchy: "layered",
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 6,
  },
  {
    id: "nav-tabbed",
    category: "navigation",
    name: "Tabbed Navigation",
    orientation: "horizontal",
    density: "compact",
    interaction: "static",
    hierarchy: "bordered",
    hasMedia: false,
    hasSecondaryAction: false,
    contentSlots: 5,
  },
  {
    id: "nav-breadcrumb-top",
    category: "navigation",
    name: "Breadcrumb with Top Bar",
    orientation: "stacked",
    density: "compact",
    interaction: "static",
    hierarchy: "flat",
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 3,
  },
  {
    id: "nav-collapsed-rail",
    category: "navigation",
    name: "Collapsed Icon Rail",
    orientation: "vertical",
    density: "minimal",
    interaction: "hover-reveal",
    hierarchy: "flat",
    hasMedia: false,
    hasSecondaryAction: false,
    contentSlots: 6,
  },
];

const CARD_VARIANTS: ComponentVariant[] = [
  {
    id: "card-standard",
    category: "card",
    name: "Standard Card",
    orientation: "vertical",
    density: "standard",
    interaction: "hover-reveal",
    hierarchy: "card-based",
    hasMedia: true,
    hasSecondaryAction: true,
    contentSlots: 3,
  },
  {
    id: "card-horizontal",
    category: "card",
    name: "Horizontal Card",
    orientation: "horizontal",
    density: "standard",
    interaction: "hover-reveal",
    hierarchy: "card-based",
    hasMedia: true,
    hasSecondaryAction: true,
    contentSlots: 3,
  },
  {
    id: "card-compact",
    category: "card",
    name: "Compact Card",
    orientation: "vertical",
    density: "compact",
    interaction: "static",
    hierarchy: "bordered",
    hasMedia: false,
    hasSecondaryAction: false,
    contentSlots: 2,
  },
  {
    id: "card-feature",
    category: "card",
    name: "Feature Highlight Card",
    orientation: "stacked",
    density: "minimal",
    interaction: "hover-reveal",
    hierarchy: "gradient",
    hasMedia: true,
    hasSecondaryAction: true,
    contentSlots: 4,
  },
  {
    id: "card-list-item",
    category: "card",
    name: "List Item Card",
    orientation: "horizontal",
    density: "dense",
    interaction: "expandable",
    hierarchy: "flat",
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 3,
  },
  {
    id: "card-overlay",
    category: "card",
    name: "Overlay Content Card",
    orientation: "overlay",
    density: "minimal",
    interaction: "hover-reveal",
    hierarchy: "gradient",
    hasMedia: true,
    hasSecondaryAction: false,
    contentSlots: 2,
  },
];

const FORM_VARIANTS: ComponentVariant[] = [
  {
    id: "form-single-column",
    category: "form",
    name: "Single Column Form",
    orientation: "vertical",
    density: "standard",
    interaction: "static",
    hierarchy: "bordered",
    columns: 1,
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 5,
  },
  {
    id: "form-two-column",
    category: "form",
    name: "Two Column Form",
    orientation: "horizontal",
    density: "standard",
    interaction: "static",
    hierarchy: "card-based",
    columns: 2,
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 6,
  },
  {
    id: "form-stepped",
    category: "form",
    name: "Multi-Step Form",
    orientation: "stacked",
    density: "standard",
    interaction: "expandable",
    hierarchy: "layered",
    columns: 1,
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 4,
  },
  {
    id: "form-inline",
    category: "form",
    name: "Inline Compact Form",
    orientation: "horizontal",
    density: "compact",
    interaction: "inline-edit",
    hierarchy: "flat",
    columns: 1,
    hasMedia: false,
    hasSecondaryAction: false,
    contentSlots: 3,
  },
  {
    id: "form-split-preview",
    category: "form",
    name: "Form with Live Preview",
    orientation: "split",
    density: "standard",
    interaction: "static",
    hierarchy: "layered",
    columns: 1,
    hasMedia: true,
    hasSecondaryAction: true,
    contentSlots: 5,
  },
];

const ACTION_PANEL_VARIANTS: ComponentVariant[] = [
  {
    id: "action-toolbar",
    category: "actionPanel",
    name: "Horizontal Toolbar",
    orientation: "horizontal",
    density: "compact",
    interaction: "static",
    hierarchy: "flat",
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 4,
  },
  {
    id: "action-floating",
    category: "actionPanel",
    name: "Floating Action Bar",
    orientation: "horizontal",
    density: "minimal",
    interaction: "hover-reveal",
    hierarchy: "layered",
    hasMedia: false,
    hasSecondaryAction: false,
    contentSlots: 3,
  },
  {
    id: "action-sidebar",
    category: "actionPanel",
    name: "Side Action Panel",
    orientation: "vertical",
    density: "standard",
    interaction: "expandable",
    hierarchy: "card-based",
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 5,
  },
  {
    id: "action-contextual",
    category: "actionPanel",
    name: "Contextual Action Menu",
    orientation: "vertical",
    density: "compact",
    interaction: "hover-reveal",
    hierarchy: "bordered",
    hasMedia: false,
    hasSecondaryAction: true,
    contentSlots: 4,
  },
];

const VARIANT_REGISTRY: Record<ComponentCategory, ComponentVariant[]> = {
  hero: HERO_VARIANTS,
  upload: UPLOAD_VARIANTS,
  dashboard: DASHBOARD_VARIANTS,
  dataTable: DATA_TABLE_VARIANTS,
  navigation: NAVIGATION_VARIANTS,
  card: CARD_VARIANTS,
  form: FORM_VARIANTS,
  actionPanel: ACTION_PANEL_VARIANTS,
};

function seedToIndex(seed: string, offset: number): number {
  const idx = (offset * 2) % Math.max(1, seed.length - 1);
  const hex = seed.slice(idx, idx + 2) || "00";
  return parseInt(hex, 16);
}

export function selectComponentVariant(
  componentType: ComponentCategory,
  seed: string,
): ComponentVariant {
  const variants = VARIANT_REGISTRY[componentType];
  if (!variants || variants.length === 0) {
    throw new Error(`No variants defined for component type: ${componentType}`);
  }
  const index = seedToIndex(seed, 0) % variants.length;
  return variants[index];
}

export function selectMultipleVariants(
  componentTypes: ComponentCategory[],
  seed: string,
): Map<ComponentCategory, ComponentVariant> {
  const result = new Map<ComponentCategory, ComponentVariant>();
  componentTypes.forEach((type, i) => {
    const variants = VARIANT_REGISTRY[type];
    if (variants && variants.length > 0) {
      const index = seedToIndex(seed, i) % variants.length;
      result.set(type, variants[index]);
    }
  });
  return result;
}

export function getVariantsForCategory(category: ComponentCategory): ComponentVariant[] {
  return VARIANT_REGISTRY[category] || [];
}

export function getAllCategories(): ComponentCategory[] {
  return Object.keys(VARIANT_REGISTRY) as ComponentCategory[];
}
