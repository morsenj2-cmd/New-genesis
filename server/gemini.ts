import OpenAI from "openai";
import type { DesignGenome } from "@shared/genomeGenerator";

const apiKey = process.env.GROQ_API_KEY;

const client = apiKey
  ? new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" })
  : null;

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

function extractHtml(text: string): string {
  const htmlBlock = text.match(/```html\s*([\s\S]*?)\s*```/);
  if (htmlBlock) return htmlBlock[1].trim();
  const start = text.indexOf("<!DOCTYPE html>");
  if (start === -1) {
    const altStart = text.indexOf("<html");
    if (altStart !== -1) return text.slice(altStart).trim();
  }
  if (start !== -1) return text.slice(start).trim();
  return text.trim();
}

function genomeToColorVars(genome: DesignGenome): string {
  return `--color-primary: ${genome.colors.primary};
    --color-secondary: ${genome.colors.secondary};
    --color-accent: ${genome.colors.accent};
    --color-bg: ${genome.colors.background};
    --color-surface: ${genome.colors.surface};
    --color-text: #f1f5f9;
    --color-text-muted: #94a3b8;
    --color-border: rgba(255,255,255,0.08);
    --radius-sm: ${genome.radius.sm};
    --radius-md: ${genome.radius.md};
    --radius-lg: ${genome.radius.lg};
    --font-heading: '${genome.typography.heading}', system-ui, sans-serif;
    --font-body: '${genome.typography.body}', system-ui, sans-serif;`;
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
    const colorVars = genomeToColorVars(genome);
    const headingFont = genome.typography.heading;
    const bodyFont = genome.typography.body;
    const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;600;700&family=${encodeURIComponent(bodyFont)}:wght@400;500&display=swap`;

    const system = `You are an expert web developer. Generate complete, self-contained HTML applications. Output ONLY a complete HTML document starting with <!DOCTYPE html> — no explanation, no markdown fences, no commentary before or after the HTML.`;

    const user = `Generate a complete, fully functional single-page web application as a self-contained HTML file.

BRAND: ${brandName}
PRODUCT: ${interpret.productName}
TYPE: ${interpret.productType} / ${interpret.pageType}
DESCRIPTION: ${prompt}
FEATURES: ${interpret.features.join(", ")}
AUDIENCE: ${interpret.targetAudience}
KEY BENEFIT: ${interpret.keyBenefit}
STYLE: ${interpret.style} — ${interpret.personality}

DESIGN TOKENS (use these exact values for ALL colors and typography):
Primary color: ${genome.colors.primary}
Secondary: ${genome.colors.secondary}
Accent: ${genome.colors.accent}
Background: ${genome.colors.background}
Surface/cards: ${genome.colors.surface}
Border radius small: ${genome.radius.sm}
Border radius medium: ${genome.radius.md}
Border radius large: ${genome.radius.lg}
Heading font: ${headingFont}
Body font: ${bodyFont}

REQUIREMENTS:
1. Complete single HTML file — all CSS in <style>, all JS in <script> tags
2. Load fonts from Google Fonts: <link href="${googleFontsUrl}" rel="stylesheet">
3. Define and use these CSS custom properties in :root:
   :root {
     ${colorVars}
   }
4. Dark background (use --color-bg for body background)
5. Navigation bar: brand name "${brandName}" on the left, relevant nav links on the right
6. Hero section: compelling headline + subheadline + CTA button specific to this product
7. ALL interactive features must actually work: tabs switch content, modals open/close, forms submit, filters filter, accordions open/close
8. Realistic pre-loaded demo data: use specific names, numbers, dates — NO Lorem ipsum, no "Test User", no placeholder text
9. Smooth scroll between sections
10. Hover effects on all interactive elements
11. Minimum 5 distinct sections relevant to this specific product type
12. Professional, polished visual design — not generic
13. Mobile responsive using CSS flexbox/grid
14. Use only vanilla HTML, CSS, and JavaScript — no external libraries or frameworks

Write at minimum 500 lines of code. Start with <!DOCTYPE html> immediately.`;

    const text = await chat(system, user, 8000);
    return extractHtml(text);
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
    const jsBlock = text.match(/```(?:js|javascript)?\s*([\s\S]*?)\s*```/);
    return jsBlock ? jsBlock[1].trim() : text.trim();
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
    const system = `You are classifying a user's edit command. Return ONLY valid JSON.`;
    const user = `Classify this edit command.

Original product type: ${productType}
Original product description: "${productPrompt.slice(0, 500)}"
Edit command: "${editPrompt}"

Return JSON:
{
  "intent": "style_change | layout_modification | content_change | regenerate | compound",
  "shouldRegenerate": true or false,
  "description": "one sentence explaining what will change"
}`;

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
