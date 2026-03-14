import OpenAI from "openai";
import type { DesignGenome } from "@shared/genomeGenerator";

const apiKey = process.env.GROQ_API_KEY;

const client = apiKey
  ? new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" })
  : null;

// Models in preference order (fastest + largest context first)
const MODEL_PREFERENCE = [
  "llama-3.3-70b-versatile",
  "mixtral-8x7b-32768",
  "llama3-70b-8192",
  "llama3-8b-8192",
];

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

async function chat(
  systemPrompt: string,
  userContent: string,
  maxTokens = 2048,
): Promise<string> {
  if (!client) throw new Error("GROQ_API_KEY not configured");

  let lastError: Error | null = null;
  for (const model of MODEL_PREFERENCE) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      });
      return completion.choices[0]?.message?.content ?? "";
    } catch (err: any) {
      console.warn(`[Groq] Model ${model} failed:`, err?.message?.slice(0, 80));
      lastError = err;
      // Only continue on rate-limit / model-unavailable errors
      const msg = err?.message ?? "";
      if (!msg.includes("429") && !msg.includes("rate") && !msg.includes("quota") && !msg.includes("model")) {
        throw err;
      }
    }
  }
  throw lastError ?? new Error("All Groq models failed");
}

export async function geminiInterpret(
  prompt: string,
  projectName: string,
): Promise<GeminiInterpretResult | null> {
  if (!client) return null;
  try {
    const system = `You are a product analyst. Return ONLY valid JSON — no explanation, no markdown.`;
    const user = `Interpret this product description and return a JSON object.

Project name: "${projectName}"
User prompt: "${prompt}"

Return JSON with exactly these fields:
{
  "productName": "short product name",
  "productType": "saas | ecommerce | dashboard | social | productivity | fintech | healthcare | education | cultural | museum | other",
  "industry": "technology | finance | health | education | retail | media | cultural | museum | art | hospitality | other",
  "pageType": "landing_page | web_app | dashboard",
  "style": "one adjective: modern | minimal | bold | elegant | playful | luxurious | scholarly",
  "personality": "one sentence describing the brand voice",
  "primaryColor": "#hexcode that suits the product",
  "isDarkMode": true,
  "features": ["3 to 6 specific features of this product"],
  "targetAudience": "specific description of who uses this",
  "keyBenefit": "the single clearest value proposition",
  "navigationStyle": "minimal | standard | rich",
  "contentDensity": "minimal | standard | rich",
  "hasDashboard": false,
  "hasBackend": false,
  "uniqueToken": "one word that captures the unique feel"
}`;

    const text = await chat(system, user, 1024);
    const json = extractJson(text);
    return JSON.parse(json) as GeminiInterpretResult;
  } catch (err) {
    console.error("[Groq] Stage 1 (interpret) failed:", err);
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
  if (!client) return null;
  try {
    const tokens = genomeToTokenString(genome);
    const fontFaceNote = fontUrl
      ? `\nNote: The heading/body font is a custom uploaded font already declared via @font-face. Use 'var(--font-heading)' and 'var(--font-body)' for all font-family values.`
      : "";

    const system = `You are an expert React developer. Generate complete, production-quality single-page React applications. Output ONLY valid JSX code — no explanation, no markdown fences, no commentary.`;

    const user = `Generate a complete, fully functional React single-page application for the following product.

BRAND: ${brandName}
PRODUCT: ${interpret.productName}
TYPE: ${interpret.productType} / ${interpret.pageType}
DESCRIPTION: ${prompt}
FEATURES: ${interpret.features.join(", ")}
AUDIENCE: ${interpret.targetAudience}
KEY BENEFIT: ${interpret.keyBenefit}
STYLE: ${interpret.style} / ${interpret.personality}

DESIGN TOKENS (CSS variables already defined in globals.css — use for all styling):
${tokens}
${fontFaceNote}

STRICT REQUIREMENTS:
1. Single file, default export function named "Home"
2. Import ONLY from 'react': import React, { useState, useEffect, useRef } from 'react'
3. Use inline styles for all styling. Reference design tokens like: style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-heading)', borderRadius: 'var(--radius-md)' }}
4. Background: 'var(--color-bg)', surfaces/cards: 'var(--color-surface)'
5. ALL interactive features must work: forms submit, filters filter, tabs switch, modals open/close
6. Realistic pre-loaded demo data with specific names and numbers — no Lorem ipsum, no placeholders
7. Complete navigation bar with brand name "${brandName}" and relevant nav links that scroll to sections
8. Compelling hero section with a headline specific to this product
9. Dark theme throughout (globals.css sets dark backgrounds)
10. Include all relevant sections for this product type
11. Write at least 400 lines of meaningful, complete JSX

Start the output immediately with: import React, { useState`;

    const text = await chat(system, user, 8000);
    return extractCode(text);
  } catch (err) {
    console.error("[Groq] Stage 2 (generate app) failed:", err);
    return null;
  }
}

export async function geminiGenerateBackend(
  prompt: string,
  projectName: string,
  interpret: GeminiInterpretResult,
): Promise<string | null> {
  if (!client) return null;
  if (!interpret.hasBackend) return null;
  try {
    const system = `You are an expert Node.js developer. Output ONLY valid JavaScript code — no explanation, no markdown.`;
    const user = `Generate a complete Express.js backend server for this product.

PRODUCT: ${interpret.productName}
TYPE: ${interpret.productType}
DESCRIPTION: ${prompt}
FEATURES: ${interpret.features.join(", ")}

Requirements:
1. Complete Express.js server in a single file (server.js)
2. Use only: express, cors
3. In-memory data store seeded with at least 10 realistic records per entity
4. Full CRUD routes for all relevant entities
5. Proper error handling and status codes
6. CORS enabled for localhost
7. Listen on port 3001
8. Realistic, named demo data — no "test" or "example" entries`;

    const text = await chat(system, user, 4096);
    return extractCode(text);
  } catch (err) {
    console.error("[Groq] Stage 3 (generate backend) failed:", err);
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
  if (!client) return null;
  try {
    const system = `You are classifying a user's edit command for a generated web application. Return ONLY valid JSON.`;
    const user = `Classify this edit command.

Original product type: ${productType}
Original product description: "${productPrompt.slice(0, 500)}"
Edit command: "${editPrompt}"

Return JSON:
{
  "intent": "style_change | layout_modification | content_change | regenerate | compound",
  "shouldRegenerate": true or false,
  "description": "one sentence explaining what will change"
}

Guidelines:
- style_change: color, font, spacing, radius → shouldRegenerate = false
- layout_modification: add/remove sections → shouldRegenerate = true
- content_change: update text, headlines → shouldRegenerate = false
- regenerate: "redo", "start over" → shouldRegenerate = true
- compound: multiple types → shouldRegenerate = true if layout changes included`;

    const text = await chat(system, user, 256);
    const json = extractJson(text);
    return JSON.parse(json);
  } catch (err) {
    console.error("[Groq] Edit interpret failed:", err);
    return null;
  }
}

export function isGeminiAvailable(): boolean {
  return !!client;
}
