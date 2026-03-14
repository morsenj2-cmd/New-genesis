import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DesignGenome } from "@shared/genomeGenerator";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

function getModel(modelName = "gemini-2.0-flash") {
  if (!genAI) throw new Error("GEMINI_API_KEY not configured");
  return genAI.getGenerativeModel({ model: modelName });
}

export interface GeminiInterpretResult {
  productName: string;
  productType: string;
  industry: string;
  pageType: "landing_page" | "web_app" | "dashboard";
  style: string;
  personality: string;
  primaryColor: string;
  isDarkMode: boolean;
  features: string[];
  targetAudience: string;
  keyBenefit: string;
  navigationStyle: "minimal" | "standard" | "rich";
  contentDensity: "minimal" | "standard" | "rich";
  hasDashboard: boolean;
  hasBackend: boolean;
  uniqueToken: string;
}

export interface GeminiGenerateResult {
  appJsx: string;
  serverJs?: string;
}

function extractJson(text: string): string {
  const jsonBlock = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlock) return jsonBlock[1];
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1) return text.slice(jsonStart, jsonEnd + 1);
  return text;
}

function extractCode(text: string): string {
  const jsxBlock = text.match(/```(?:jsx?|tsx?|javascript|react)?\s*([\s\S]*?)\s*```/);
  if (jsxBlock) return jsxBlock[1].trim();
  return text.trim();
}

function genomeToTokenString(genome: DesignGenome): string {
  return `--color-primary: ${genome.colors.primary}
--color-secondary: ${genome.colors.secondary}
--color-accent: ${genome.colors.accent}
--color-bg: ${genome.colors.background}
--color-surface: ${genome.colors.surface}
--radius-sm: ${genome.radius.sm}
--radius-md: ${genome.radius.md}
--radius-lg: ${genome.radius.lg}
--font-heading: '${genome.typography.heading}', sans-serif
--font-body: '${genome.typography.body}', sans-serif
--spacing-xs: ${genome.spacing.xs}
--spacing-sm: ${genome.spacing.sm}
--spacing-md: ${genome.spacing.md}
--spacing-lg: ${genome.spacing.lg}
--spacing-xl: ${genome.spacing.xl}
--duration-base: ${genome.motion.duration.base}
--easing: ${genome.motion.easing}`;
}

export async function geminiInterpret(
  prompt: string,
  projectName: string,
): Promise<GeminiInterpretResult | null> {
  if (!genAI) return null;
  try {
    const model = getModel();
    const systemPrompt = `You are a product analyst interpreting a software product description to guide UI generation. Return ONLY valid JSON, no explanation.

Project name: "${projectName}"
User prompt: "${prompt}"

Return a JSON object with exactly these fields:
{
  "productName": "short product name",
  "productType": "saas | ecommerce | dashboard | social | productivity | fintech | healthcare | education | other",
  "industry": "technology | finance | health | education | retail | media | other",
  "pageType": "landing_page | web_app | dashboard",
  "style": "one adjective like modern | minimal | bold | elegant | playful",
  "personality": "one sentence describing the brand voice",
  "primaryColor": "#hexcode that fits the product",
  "isDarkMode": true,
  "features": ["3-6 specific features of this product"],
  "targetAudience": "specific description of who uses this",
  "keyBenefit": "the single clearest value proposition",
  "navigationStyle": "minimal | standard | rich",
  "contentDensity": "minimal | standard | rich",
  "hasDashboard": true if this is a web app with a dashboard or data views,
  "hasBackend": true if the app needs API endpoints for real data,
  "uniqueToken": "one word that captures the unique feel of this product"
}`;

    const result = await model.generateContent(systemPrompt);
    const text = result.response.text();
    const json = extractJson(text);
    return JSON.parse(json) as GeminiInterpretResult;
  } catch (err) {
    console.error("[Gemini] Stage 1 (interpret) failed:", err);
    return null;
  }
}

export async function geminiGenerateApp(
  prompt: string,
  projectName: string,
  brandName: string,
  genome: DesignGenome,
  interpret: GeminiInterpretResult,
  fontUrl?: string | null,
): Promise<string | null> {
  if (!genAI) return null;
  try {
    const model = getModel();
    const tokens = genomeToTokenString(genome);
    const fontFaceNote = fontUrl
      ? `\nNote: The heading/body font is a custom uploaded font already declared via @font-face. Use 'var(--font-heading)' and 'var(--font-body)' CSS variables for all font-family values.`
      : "";

    const systemPrompt = `You are an expert React developer generating a complete, fully functional single-page application. This will be exported as a runnable Vite + React project.

BRAND: ${brandName}
PRODUCT: ${interpret.productName}
TYPE: ${interpret.productType} / ${interpret.pageType}
DESCRIPTION: ${prompt}
FEATURES: ${interpret.features.join(", ")}
AUDIENCE: ${interpret.targetAudience}
KEY BENEFIT: ${interpret.keyBenefit}
STYLE: ${interpret.style} / ${interpret.personality}

DESIGN TOKENS (CSS variables already defined in globals.css — use them for all styling):
${tokens}
${fontFaceNote}

STRICT REQUIREMENTS:
1. Single file, default export function named "Home"
2. Import ONLY from 'react': import React, { useState, useEffect, useRef } from 'react'
3. Use inline styles everywhere. Reference design tokens like: style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-heading)', borderRadius: 'var(--radius-md)' }}
4. Background: 'var(--color-bg)', card/surface backgrounds: 'var(--color-surface)'
5. ALL interactive features must work: forms submit, filters filter, tabs switch, modals open/close, counters count
6. Realistic pre-loaded demo data with specific names, numbers, and descriptions — no "Lorem ipsum" or placeholders
7. Complete navigation bar with brand name "${brandName}" and relevant nav links
8. Proper hero section with a compelling headline specific to this product
9. Dark theme throughout (the globals.css sets dark backgrounds)
10. Include sections relevant to this product type (features, pricing, dashboard, testimonials, etc.)
11. Write at least 300 lines of meaningful JSX — this is a complete product, not a demo

OUTPUT: Return ONLY the JSX code starting with the import statement. No explanation, no markdown fences.`;

    const result = await model.generateContent(systemPrompt);
    const text = result.response.text();
    return extractCode(text);
  } catch (err) {
    console.error("[Gemini] Stage 2 (generate app) failed:", err);
    return null;
  }
}

export async function geminiGenerateBackend(
  prompt: string,
  projectName: string,
  interpret: GeminiInterpretResult,
): Promise<string | null> {
  if (!genAI) return null;
  if (!interpret.hasBackend) return null;
  try {
    const model = getModel();
    const systemPrompt = `You are an expert Node.js developer generating a complete Express.js backend server.

PRODUCT: ${interpret.productName}
TYPE: ${interpret.productType}
DESCRIPTION: ${prompt}
FEATURES: ${interpret.features.join(", ")}

Requirements:
1. Complete Express.js server in a single file (server.js)
2. Use only: express, cors (add via require)
3. In-memory data store seeded with realistic demo data (at least 10 records per entity)
4. Full CRUD routes for all relevant entities
5. Proper error handling and status codes
6. CORS enabled for localhost
7. Listen on port 3001
8. Realistic, named demo data — no "test" or "example" entries

OUTPUT: Return ONLY the Node.js code. No explanation, no markdown fences.`;

    const result = await model.generateContent(systemPrompt);
    const text = result.response.text();
    return extractCode(text);
  } catch (err) {
    console.error("[Gemini] Stage 3 (generate backend) failed:", err);
    return null;
  }
}

export async function geminiInterpretEdit(
  editPrompt: string,
  productPrompt: string,
  productType: string,
): Promise<{
  intent: "style_change" | "layout_modification" | "content_change" | "regenerate" | "compound";
  shouldRegenerate: boolean;
  description: string;
} | null> {
  if (!genAI) return null;
  try {
    const model = getModel();
    const systemPrompt = `You are classifying a user's edit command for a generated web application. Return ONLY valid JSON.

Original product type: ${productType}
Original product description: "${productPrompt.slice(0, 500)}"
Edit command: "${editPrompt}"

Classify the edit into one of these intents and return JSON:
{
  "intent": "style_change | layout_modification | content_change | regenerate | compound",
  "shouldRegenerate": true if the full app needs to be regenerated with Gemini,
  "description": "one sentence explaining what will change"
}

Guidelines:
- style_change: color, font, spacing, radius changes → shouldRegenerate = false
- layout_modification: add/remove sections, reorder → shouldRegenerate = true
- content_change: update text, headlines, features → shouldRegenerate = false
- regenerate: "redo", "start over", "regenerate" → shouldRegenerate = true
- compound: multiple types of changes → shouldRegenerate = true if layout changes included`;

    const result = await model.generateContent(systemPrompt);
    const text = result.response.text();
    const json = extractJson(text);
    return JSON.parse(json);
  } catch (err) {
    console.error("[Gemini] Edit interpret failed:", err);
    return null;
  }
}

export function isGeminiAvailable(): boolean {
  return !!genAI;
}
