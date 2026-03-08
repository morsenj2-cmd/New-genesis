export type IntentType =
  | "design_generation"
  | "style_change"
  | "layout_modification"
  | "content_update"
  | "context_correction"
  | "brand_rename"
  | "regenerate"
  | "compound";

export type PageType =
  | "landing_page"
  | "dashboard"
  | "marketing_site"
  | "portfolio"
  | "ecommerce"
  | "blog"
  | "saas_app";

export interface Action {
  verb: string;
  target: string;
  value?: string;
}

export interface Target {
  path: string;
  domain: "style" | "layout" | "content" | "brand" | "context" | "typography" | "color" | "spacing";
}

export interface LayoutChange {
  operation: "add" | "remove" | "reorder" | "modify";
  sectionType?: string;
  property?: string;
  value?: string | number;
}

export interface StyleChange {
  dimension: "color" | "typography" | "spacing" | "radius" | "density" | "animation";
  property?: string;
  value: string;
  direction?: "increase" | "decrease" | "set";
}

export interface ContentChange {
  field: "headline" | "subheadline" | "ctaLabel" | "secondaryCtaLabel" | "brandName" | "description" | "feature";
  value: string;
}

export interface ContextOverride {
  key: "industry" | "productType" | "pageType" | "tone";
  value: string;
}

export interface StructuredIntent {
  intentType: IntentType;
  confidence: number;
  pageType?: PageType;
  industry?: string;
  productType?: string;
  actions: Action[];
  targets: Target[];
  layoutChanges: LayoutChange[];
  styleChanges: StyleChange[];
  contentChanges: ContentChange[];
  contextOverrides: ContextOverride[];
  rawTokens: string[];
  embeddings?: number[];
}

export interface ModelWeights {
  vocabEmbeddings: Record<string, number[]>;
  intentPrototypes: Record<IntentType, number[]>;
  attentionKeys: number[][];
  config: ModelConfig;
}

export interface ModelConfig {
  embeddingDim: number;
  numAttentionHeads: number;
  numConceptDims: number;
  vocabSize: number;
  version: string;
}

export interface ProjectContext {
  industry?: string;
  productType?: string;
  pageType?: string;
  brandName?: string;
  sections: string[];
  primaryColor?: string;
  font?: string;
  dominantAlignment?: string;
}
