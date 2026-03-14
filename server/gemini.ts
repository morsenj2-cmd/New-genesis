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

// Inject safety script into generated HTML to fix navigation, external redirects, etc.
function injectSafetyScript(html: string): string {
  const safetyScript = `
<script>
// Morse safety: intercept all anchor clicks and handle in-page navigation
(function() {
  function initNavigation() {
    document.querySelectorAll('a[href^="#"]').forEach(function(a) {
      a.addEventListener('click', function(e) {
        e.preventDefault();
        var href = a.getAttribute('href');
        if (!href || href === '#') return;
        var target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }
  // Prevent window.location navigation to external placeholder URLs
  var _origAssign = window.location.assign.bind(window.location);
  try {
    Object.defineProperty(window, '__safeNav', { value: true, writable: false });
  } catch(e) {}
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
  } else {
    initNavigation();
  }
  // Re-run after any dynamic content changes
  var observer = new MutationObserver(function() { initNavigation(); });
  observer.observe(document.body, { childList: true, subtree: true });
})();
</script>`;

  // Inject before </body>
  if (html.includes("</body>")) {
    return html.replace("</body>", safetyScript + "\n</body>");
  }
  return html + safetyScript;
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

export interface Integration {
  name: string;
  key: string;
  value: string;
}

export async function geminiGenerateApp(
  prompt: string,
  projectName: string,
  brandName: string,
  genome: DesignGenome,
  interpret: GeminiInterpretResult,
  fontUrl?: string | null,
  logoUrl?: string | null,
  nlInstruction?: string | null,
  integrations?: Integration[] | null,
): Promise<string | null> {
  if (!client) return null;
  try {
    const colorVars = genomeToColorVars(genome);
    const headingFont = genome.typography.heading;
    const bodyFont = genome.typography.body;
    const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;600;700&family=${encodeURIComponent(bodyFont)}:wght@400;500&display=swap`;

    const logoInstruction = logoUrl
      ? `LOGO: The brand has an uploaded logo image. Use this exact URL in an <img> tag inside the navigation bar (left side, height 36px): ${logoUrl}`
      : `LOGO: No logo image. Show the brand name "${brandName}" as styled text in the navigation bar.`;

    const nlSection = nlInstruction
      ? `\nUSER EDIT REQUEST: The user has requested the following change to the design: "${nlInstruction}"\nMake sure this change is clearly applied in the generated application.`
      : "";

    const isDashboard = interpret.hasDashboard || interpret.pageType === "dashboard" || interpret.productType === "dashboard";

    const system = `You are an expert web developer. Generate complete, self-contained HTML applications. Output ONLY a complete HTML document starting with <!DOCTYPE html> — no explanation, no markdown fences, no commentary before or after the HTML.`;

    const layoutSection = isDashboard
      ? `LAYOUT: DASHBOARD UI with fixed left sidebar + main content area. Each sidebar item shows a different panel. NO hero/marketing sections.`
      : `LAYOUT: MULTI-PAGE SPA. Each nav item is a separate "page" (full viewport, not a scrollable section). Structure:
  <nav class="navbar">...</nav>
  <div class="pages-container">
    <section id="page-home" class="page active">Home content</section>
    <section id="page-[name]" class="page">Page content</section>
    ... one <section class="page"> per nav item ...
  </div>
CSS: .page { display:none; min-height:calc(100vh - 70px); padding: 3rem 2rem; } .page.active { display:block; }
JS router (REQUIRED): function navigate(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById(id).classList.add('active');window.scrollTo(0,0);}
Each nav link calls navigate('page-name') — do NOT use href="#..."  for page switching`;

    const combinedText = `${prompt} ${nlInstruction ?? ""}`.toLowerCase();
    const hasImages = combinedText.includes("picture") || combinedText.includes("photo") || combinedText.includes("image") || combinedText.includes("gallery") || combinedText.includes("banner") || combinedText.includes("hero image");
    const imageKeywords = interpret.productName.toLowerCase().replace(/\s+/g, "+");

    const imageInstruction = hasImages
      ? `IMAGES: This product requires real photos. Use Unsplash source URLs to fetch relevant images:
  - Use this exact format for images: <img src="https://source.unsplash.com/featured/800x500?${imageKeywords}" ...>
  - For gallery sections with multiple images, vary the keyword by appending numbers or synonyms: ?${imageKeywords}+1, ?${imageKeywords}+nature, ?${imageKeywords}+wildlife, etc.
  - Always set width="100%" and appropriate height on images. Never leave image src empty.`
      : "";

    const user = `Generate a complete, fully functional single-page web application as a self-contained HTML file.

BRAND: ${brandName}
PRODUCT: ${interpret.productName}
TYPE: ${interpret.productType} / ${interpret.pageType}
DESCRIPTION: ${prompt}
FEATURES: ${interpret.features.join(", ")}
AUDIENCE: ${interpret.targetAudience}
KEY BENEFIT: ${interpret.keyBenefit}
STYLE: ${interpret.style} — ${interpret.personality}
${nlSection}

${layoutSection}

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

${logoInstruction}

${imageInstruction}

REQUIREMENTS:

1. STRUCTURE: Complete single HTML file — all CSS in <style>, all JS in <script>. Load fonts: <link href="${googleFontsUrl}" rel="stylesheet">

2. DESIGN TOKENS: Add to :root { ${colorVars} }

3. LOGO IN NAV: ${logoUrl
      ? `Place EXACTLY this img tag on the left of the navbar: <img src="${logoUrl}" alt="${brandName}" style="height:36px;width:auto;object-fit:contain;display:block;"> — never replace with text`
      : `Show "${brandName}" as bold text on the left of the navbar`}

4. MULTI-PAGE NAVIGATION (CRITICAL):
   - Nav labels must be specific to this product — e.g. for a defence company: "Company Story", "Products", "Philanthropy", "News", "About" — NEVER generic "Features", "Solutions", "Resources"
   - Use the page router pattern from the LAYOUT section above
   - Every nav button calls navigate('page-id') — no href="#..." for page switching
   - Active nav link highlighted with border-bottom or background

5. TYPOGRAPHY SCALE (STRICT — do not exceed these sizes):
   - Page/section title h1: max 2.5rem, font-weight: 700, line-height: 1.2
   - Sub-headings h2: max 1.75rem, font-weight: 600, line-height: 1.3
   - Card titles h3: max 1.25rem, font-weight: 600
   - Body text p: 1rem, line-height: 1.7
   - Small/meta text: 0.875rem
   - All text must have adequate breathing room (margin-bottom: 1rem on paragraphs)
   - NEVER use font sizes above 2.5rem for headings (avoid oversized text)

6. CONTRAST (CRITICAL — poor contrast is a failure):
   - Background: var(--color-bg) which is dark. ALL text on this background: color: var(--color-text) = #f1f5f9 (light)
   - Cards/surfaces: var(--color-surface) which is also dark. ALL text on cards: color: var(--color-text) = #f1f5f9, NEVER a dark color
   - Muted/secondary text: var(--color-text-muted) = #94a3b8 (light gray) — acceptable on dark backgrounds
   - Buttons: use var(--color-primary) background with white or #000 text, whichever has better contrast
   - NEVER put dark text on dark backgrounds. NEVER use the same or similar color for text and its background.
   - Test rule: if background is dark (starts with hsl with low L%), text MUST be light (#f1f5f9 or similar)

7. LAYOUT SPACING:
   - body { padding-top: 70px; margin: 0; } — for fixed navbar
   - Navbar height: 64px, fixed, z-index: 100
   - Page padding: 3rem 4rem on desktop, 2rem 1rem on mobile
   - Card gap: 1.5rem between cards, 1rem internal padding minimum
   - Max content width: 1100px, margin: 0 auto — prevents wide text blocks

8. CALL-TO-ACTION PAGES (any "Donate", "Take Action", "Sign Up", "Contact" button):
   - Must navigate to a dedicated page (use navigate() function) — NOT a redirect to example.com
   - That page must contain a COMPLETE working form with fields, validation, and a success message on submit

9. IMAGES: ${hasImages
      ? `Use Unsplash for real photos: <img src="https://source.unsplash.com/featured/800x500?${imageKeywords}" style="width:100%;height:300px;object-fit:cover;border-radius:var(--radius-md);">. Vary keywords for gallery: add +wildlife, +nature, +2, etc.`
      : `Use CSS gradients or solid colored placeholder blocks for any image areas — no broken img tags`}

10. INTERACTIVITY: All tabs, accordions, modals, forms must work. Show success state on form submit.

11. REALISTIC CONTENT: Use specific names, real-sounding data, real dates — NO lorem ipsum, NO "Test User"

12. RESPONSIVE: Use CSS grid/flex. Works on mobile screens.

13. NO EXTERNAL LIBRARIES: Vanilla HTML, CSS, JS only.

${integrations && integrations.length > 0 ? `14. INTEGRATIONS (CRITICAL — include initialization for ALL of these):
${integrations.map(ig => `   - ${ig.name}: Key = "${ig.value}"
     Include the full <script> initialization for ${ig.name} using this key/value. Place initialization scripts in <head> before other scripts.`).join("\n")}` : ""}

Write at minimum 700 lines. Start with <!DOCTYPE html> immediately.`;

    const text = await chat(system, user, 8000);
    const html = extractHtml(text);
    return injectSafetyScript(html);
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
