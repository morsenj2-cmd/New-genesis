import type { IntentType, PageType } from "../model/promptSchema";

export interface TrainingExample {
  prompt: string;
  intentType: IntentType;
  pageType?: PageType;
  industry?: string;
  productType?: string;
  styleHints?: string[];
  colorHints?: string[];
  layoutHints?: string[];
  contentHints?: string[];
  contextHints?: string[];
}

export const TRAINING_DATA: TrainingExample[] = [
  // ── DESIGN GENERATION ──────────────────────────────────────────────
  {
    prompt: "Build a SaaS project management tool for software teams",
    intentType: "design_generation",
    pageType: "saas_app",
    industry: "saas",
    productType: "project_management",
  },
  {
    prompt: "Create a landing page for an AI writing assistant startup",
    intentType: "design_generation",
    pageType: "landing_page",
    industry: "ai",
    productType: "ai_tool",
  },
  {
    prompt: "Design a marketing site for a healthcare SaaS platform",
    intentType: "design_generation",
    pageType: "marketing_site",
    industry: "healthcare",
    productType: "saas",
  },
  {
    prompt: "Generate a portfolio website for a freelance designer",
    intentType: "design_generation",
    pageType: "portfolio",
    industry: "creative",
    productType: "portfolio",
  },
  {
    prompt: "Build an ecommerce store for handmade jewelry",
    intentType: "design_generation",
    pageType: "ecommerce",
    industry: "retail",
    productType: "ecommerce",
  },
  {
    prompt: "Create a restaurant website with online ordering",
    intentType: "design_generation",
    pageType: "landing_page",
    industry: "food",
    productType: "restaurant",
  },
  {
    prompt: "Design a fintech app for personal budgeting",
    intentType: "design_generation",
    pageType: "saas_app",
    industry: "fintech",
    productType: "finance_app",
  },
  {
    prompt: "Build a dashboard for analytics and reporting",
    intentType: "design_generation",
    pageType: "dashboard",
    industry: "saas",
    productType: "analytics",
  },
  {
    prompt: "Make a landing page for a cybersecurity startup",
    intentType: "design_generation",
    pageType: "landing_page",
    industry: "security",
    productType: "security_tool",
  },
  {
    prompt: "Create a blog platform for tech writers",
    intentType: "design_generation",
    pageType: "blog",
    industry: "media",
    productType: "blog",
  },
  {
    prompt: "Design a gym and fitness coaching website",
    intentType: "design_generation",
    pageType: "landing_page",
    industry: "fitness",
    productType: "fitness_app",
  },
  {
    prompt: "Build a legal services firm website",
    intentType: "design_generation",
    pageType: "marketing_site",
    industry: "legal",
    productType: "professional_services",
  },
  {
    prompt: "Create an education platform for online courses",
    intentType: "design_generation",
    pageType: "saas_app",
    industry: "education",
    productType: "edtech",
  },
  {
    prompt: "Design a real estate listing website",
    intentType: "design_generation",
    pageType: "landing_page",
    industry: "real_estate",
    productType: "real_estate",
  },
  {
    prompt: "Build a productivity app landing page with dark theme",
    intentType: "design_generation",
    pageType: "landing_page",
    industry: "productivity",
    productType: "productivity_tool",
    styleHints: ["dark"],
  },
  // ── STYLE CHANGE ──────────────────────────────────────────────────
  {
    prompt: "Make it more minimal",
    intentType: "style_change",
    styleHints: ["minimal"],
  },
  {
    prompt: "Switch to a dark theme",
    intentType: "style_change",
    styleHints: ["dark"],
  },
  {
    prompt: "Make the design look more professional",
    intentType: "style_change",
    styleHints: ["professional"],
  },
  {
    prompt: "Change the primary color to blue",
    intentType: "style_change",
    colorHints: ["blue"],
  },
  {
    prompt: "Make it more colorful and vibrant",
    intentType: "style_change",
    styleHints: ["vibrant", "colorful"],
  },
  {
    prompt: "Use a more playful and fun aesthetic",
    intentType: "style_change",
    styleHints: ["playful"],
  },
  {
    prompt: "Increase the border radius to make it more rounded",
    intentType: "style_change",
    styleHints: ["rounded"],
  },
  {
    prompt: "Make the typography bigger and bolder",
    intentType: "style_change",
    styleHints: ["bold"],
  },
  {
    prompt: "Tighten the spacing to make it more compact",
    intentType: "style_change",
    styleHints: ["compact"],
  },
  {
    prompt: "Give it an elegant luxury feel with more whitespace",
    intentType: "style_change",
    styleHints: ["elegant", "luxury", "spacious"],
  },
  {
    prompt: "Change the color palette to purple and dark",
    intentType: "style_change",
    colorHints: ["purple", "dark"],
  },
  {
    prompt: "Make it look like a modern tech startup",
    intentType: "style_change",
    styleHints: ["modern", "techy"],
  },
  {
    prompt: "Apply a flat design with sharp corners",
    intentType: "style_change",
    styleHints: ["flat", "sharp"],
  },
  {
    prompt: "Make the design cleaner with more breathing room",
    intentType: "style_change",
    styleHints: ["clean", "airy"],
  },
  {
    prompt: "Use a warm orange and gold color scheme",
    intentType: "style_change",
    colorHints: ["orange"],
  },
  {
    prompt: "Increase contrast and make text more readable",
    intentType: "style_change",
    styleHints: ["contrast"],
  },
  {
    prompt: "Switch the font to something more modern and geometric",
    intentType: "style_change",
    styleHints: ["modern"],
  },
  // ── LAYOUT MODIFICATION ───────────────────────────────────────────
  {
    prompt: "Add a testimonials section",
    intentType: "layout_modification",
    layoutHints: ["add_testimonial"],
  },
  {
    prompt: "Remove the stats section",
    intentType: "layout_modification",
    layoutHints: ["remove_stats"],
  },
  {
    prompt: "Add a pricing section to the page",
    intentType: "layout_modification",
    layoutHints: ["add_pricing"],
  },
  {
    prompt: "Move the call to action higher up the page",
    intentType: "layout_modification",
    layoutHints: ["reorder_cta"],
  },
  {
    prompt: "Add more feature cards to the features grid",
    intentType: "layout_modification",
    layoutHints: ["add_features"],
  },
  {
    prompt: "Remove the footer section",
    intentType: "layout_modification",
    layoutHints: ["remove_footer"],
  },
  {
    prompt: "Make the hero section centered",
    intentType: "layout_modification",
    layoutHints: ["center_hero"],
  },
  {
    prompt: "Add a contact form section at the bottom",
    intentType: "layout_modification",
    layoutHints: ["add_contact"],
  },
  {
    prompt: "Change the feature grid to 4 columns",
    intentType: "layout_modification",
    layoutHints: ["grid_columns"],
  },
  {
    prompt: "Make the layout more dense with less whitespace",
    intentType: "layout_modification",
    layoutHints: ["density"],
  },
  // ── CONTENT UPDATE ────────────────────────────────────────────────
  {
    prompt: "Change the headline to 'Ship faster with AI'",
    intentType: "content_update",
    contentHints: ["headline"],
  },
  {
    prompt: "Update the CTA button to say 'Start for free'",
    intentType: "content_update",
    contentHints: ["cta"],
  },
  {
    prompt: "Change the tagline to something more compelling",
    intentType: "content_update",
    contentHints: ["tagline"],
  },
  {
    prompt: "Update the hero description text",
    intentType: "content_update",
    contentHints: ["description"],
  },
  // ── BRAND RENAME ─────────────────────────────────────────────────
  {
    prompt: "Rename the brand to Nexus",
    intentType: "brand_rename",
  },
  {
    prompt: "Change the company name to Veritas Labs",
    intentType: "brand_rename",
  },
  {
    prompt: "Call it Orbit instead",
    intentType: "brand_rename",
  },
  {
    prompt: "The product name should be Pulse",
    intentType: "brand_rename",
  },
  // ── CONTEXT CORRECTION ───────────────────────────────────────────
  {
    prompt: "This is a restaurant, not a SaaS company",
    intentType: "context_correction",
    industry: "food",
  },
  {
    prompt: "Actually this is an AI company, not a construction firm",
    intentType: "context_correction",
    industry: "ai",
  },
  {
    prompt: "It's a healthcare platform, not an e-commerce store",
    intentType: "context_correction",
    industry: "healthcare",
  },
  {
    prompt: "This should be a portfolio site, not a landing page",
    intentType: "context_correction",
    pageType: "portfolio",
  },
  {
    prompt: "Wrong industry — this is a fintech company",
    intentType: "context_correction",
    industry: "fintech",
  },
  // ── REGENERATE ───────────────────────────────────────────────────
  {
    prompt: "Generate a completely different look",
    intentType: "regenerate",
  },
  {
    prompt: "Try a different design",
    intentType: "regenerate",
  },
  {
    prompt: "I don't like this, regenerate",
    intentType: "regenerate",
  },
  {
    prompt: "Give me another option",
    intentType: "regenerate",
  },
  // ── COMPOUND ─────────────────────────────────────────────────────
  {
    prompt: "Make it minimal and change the color to teal",
    intentType: "compound",
    styleHints: ["minimal"],
    colorHints: ["teal"],
  },
  {
    prompt: "Add a testimonials section and make the design more colorful",
    intentType: "compound",
    layoutHints: ["add_testimonial"],
    styleHints: ["colorful"],
  },
  {
    prompt: "Rename to Apex and switch to dark theme",
    intentType: "compound",
    styleHints: ["dark"],
  },
  {
    prompt: "Change the headline and make the layout more spacious",
    intentType: "compound",
    contentHints: ["headline"],
    styleHints: ["spacious"],
  },
];
