import OpenAI from "openai";
import type { DesignGenome } from "@shared/genomeGenerator";

const apiKey = process.env.GROQ_API_KEY;

const client = apiKey
  ? new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" })
  : null;

const MODEL_PREFERENCE = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
  "llama-3.2-3b-preview",
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
// Morse safety layer — keeps generated app self-contained inside the iframe
(function() {
  try { Object.defineProperty(window, '__safeNav', { value: true, writable: false }); } catch(e) {}

  // --- Override window.open to block popup windows ---
  window.open = function() { return null; };

  // --- Intercept ALL clicks that would navigate externally ---
  document.addEventListener('click', function(e) {
    var el = e.target;
    for (var i = 0; i < 6 && el && el !== document.body; i++, el = el.parentElement) {
      if (!el || !el.tagName) continue;
      var tag = el.tagName.toUpperCase();

      // External anchor links → scroll to matching section
      if (tag === 'A') {
        var href = el.getAttribute ? el.getAttribute('href') : null;
        if (href && !href.startsWith('#') && !href.startsWith('javascript')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          var dest = document.querySelector('[id*="contact"]') ||
                     document.querySelector('[id*="donate"]') ||
                     document.querySelector('[id*="signup"]') ||
                     document.querySelector('[id*="settings"]') ||
                     document.querySelector('section:not(.active)');
          if (dest) {
            document.querySelectorAll('section.active,.view.active,.page.active,[data-view].active').forEach(function(p) { p.classList.remove('active'); p.style.display = 'none'; });
            dest.classList.add('active');
            dest.style.display = 'block';
            dest.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          return;
        }
      }

      // Buttons/links with onclick containing window.location or location.href
      if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT') {
        var onclick = el.getAttribute ? el.getAttribute('onclick') : null;
        if (onclick && (onclick.includes('window.location') || onclick.includes('location.href') || onclick.includes('location.assign') || onclick.includes('window.open'))) {
          e.preventDefault();
          e.stopImmediatePropagation();
          // Show the first hidden section (donate/contact/CTA page)
          var ctaSection = document.querySelector('[id*="donate"], [id*="contact"], [id*="signup"], [id*="action"]');
          if (ctaSection) {
            ctaSection.style.display = 'block';
            ctaSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          return;
        }
      }
    }
  }, true);

  // --- Anchor scroll navigation ---
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
    // Neutralize external hrefs to prevent navigation
    document.querySelectorAll('a[href^="http"], a[href^="//"], a[href^="www"]').forEach(function(a) {
      a.removeAttribute('href');
      a.style.cursor = 'pointer';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
  } else {
    initNavigation();
  }
  var observer = new MutationObserver(function() { initNavigation(); });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
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
    for (let retry = 0; retry < 2; retry++) {
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
        const msg = err?.message ?? "";
        const isRateLimit = msg.includes("429") || msg.includes("rate") || msg.includes("quota");
        const isModelError = msg.includes("decommissioned") || msg.includes("not found") || msg.includes("not supported") || msg.includes("model_");
        console.warn(`[Groq] Model ${model} failed (attempt ${retry + 1}):`, msg.slice(0, 100));
        lastError = err;

        if (isModelError) break;
        if (isRateLimit && retry === 0) {
          console.log(`[Groq] Rate limited on ${model}, waiting 3s before retry...`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        if (!isRateLimit && !isModelError) throw err;
        break;
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
    const system = `You are a product analyst who classifies software products. Return ONLY valid JSON — no explanation, no markdown.`;
    const user = `Interpret this product description and return a JSON object.

Project name: "${projectName}"
User prompt: "${prompt}"

CLASSIFICATION GUIDE for pageType:
- "dashboard": The user wants a data visualization panel with charts, tables, stats, metrics, rankings, standings, or monitoring. Examples: analytics dashboard, admin panel, F1 race dashboard, sports standings, stock market tracker, sales dashboard, server monitoring. If the user uses the word "dashboard" or wants to track/monitor data with charts and tables, use this.
- "web_app": The user wants a FUNCTIONAL application with interactive features, data management, CRUD operations, user workflows, or tool-like behavior. Examples: task manager, CRM, inventory system, booking platform, calculator, timer, game, budget planner, social network. DEFAULT TO THIS if the product involves users interacting with data or performing tasks.
- "landing_page": The user ONLY wants a marketing/informational website to showcase a product or organization. Examples: company homepage, portfolio, restaurant menu site. Only use this if the product is purely informational with no interactive data features.

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
  "features": ["3 to 6 specific FUNCTIONAL features of this product — describe what users can DO, not just what exists"],
  "targetAudience": "specific description of who uses this",
  "keyBenefit": "the single clearest value proposition",
  "navigationStyle": "minimal | standard | rich",
  "contentDensity": "minimal | standard | rich",
  "hasDashboard": "boolean — true if user mentions dashboard/monitoring/analytics/standings/rankings/tracker/data visualization, false otherwise",
  "hasBackend": false,
  "uniqueToken": "one word that captures the unique feel"
}`;

    const text = await chat(system, user, 1024);
    const json = extractJson(text);
    const parsed = JSON.parse(json);
    parsed.hasDashboard = parsed.hasDashboard === true || parsed.hasDashboard === "true";
    parsed.hasBackend = parsed.hasBackend === true || parsed.hasBackend === "true";
    return parsed as GeminiInterpretResult;
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

    const nlSection = nlInstruction
      ? `\nUSER EDIT REQUEST: "${nlInstruction}" — apply this change clearly in the generated output.`
      : "";

    const combinedText = `${prompt} ${nlInstruction ?? ""}`.toLowerCase();
    const imageKeywords = interpret.productName.toLowerCase().replace(/\s+/g, "+");
    const visualTypes = ["ecommerce", "store", "shop", "portfolio", "gallery", "restaurant", "real_estate", "travel", "fashion", "clothing", "food", "hotel", "marketplace", "catalog"];
    const isVisualProduct = visualTypes.some(t => combinedText.includes(t) || (interpret.productType || "").toLowerCase().includes(t) || (interpret.pageType || "").toLowerCase().includes(t));
    const hasImages = isVisualProduct || combinedText.includes("picture") || combinedText.includes("photo") || combinedText.includes("image") || combinedText.includes("gallery") || combinedText.includes("banner") || combinedText.includes("hero image");

    const imageInstruction = `IMAGES: Use picsum.photos for ALL images. Format: src="https://picsum.photos/seed/${imageKeywords}/800/500". Vary seed for each image: seed/${imageKeywords}1, seed/${imageKeywords}2, seed/${imageKeywords}3, etc. Hero images: seed/${imageKeywords}/1200/600. Cards/products: seed/${imageKeywords}1/400/300, seed/${imageKeywords}2/400/300. NEVER use source.unsplash.com, via.placeholder.com, placehold.co, or placeholder.com. ALWAYS use picsum.photos.${hasImages ? " This product is visual — include prominent product/hero images throughout." : ""}`;

    const system = `You are an elite full-stack web developer. You build production-quality, fully functional applications as single self-contained HTML files. You analyze the user's product description and autonomously decide the best architecture, layout, navigation style, data model, and UI patterns. You never build generic templates — every app is unique to the user's domain. Output ONLY a complete HTML document starting with <!DOCTYPE html> — no explanation, no markdown fences, no commentary.`;

    const user = `Build a complete, fully functional application as a single self-contained HTML file.

PRODUCT BRIEF:
- Brand: ${brandName}
- Product: ${interpret.productName}
- Type: ${interpret.productType} / ${interpret.pageType}
- Description: ${prompt}
- Features: ${interpret.features.join(", ")}
- Audience: ${interpret.targetAudience}
- Key Benefit: ${interpret.keyBenefit}
- Style: ${interpret.style} — ${interpret.personality}
${nlSection}

YOUR TASK — THINK THROUGH THESE STEPS BEFORE WRITING CODE:
1. READ the description above. What EXACTLY is this product? What domain is it in?
2. DECIDE the best architecture for this specific product:
   - Does it need a sidebar + panels layout? (dashboards, admin panels, data-heavy tools)
   - Does it need a top nav + multi-view SPA? (apps, tools, interactive products)
   - Does it need a scrolling multi-section site? (showcases, portfolios, informational sites)
   - Or something else entirely? YOU decide what fits best.
3. DECIDE what data this product manages. Design the data model (window.appState) with domain-specific fields, realistic seed data (15-25 records with REAL names/terms from this domain), and localStorage persistence.
4. DECIDE the navigation labels, section names, stat card labels, table columns — ALL must use terminology specific to this product's domain. NEVER use generic labels like "Dashboard", "Data Table", "Total Count", "Active Count". Every label should make sense ONLY for this specific product.
5. DECIDE which interactive components this product needs: tables, charts, forms, modals, timers, calculators, sliders, toggles, drag-and-drop, etc. Build ONLY what makes sense for this product.
6. BUILD the complete product with full working JavaScript. Every feature described above must be fully functional.

DESIGN TOKENS (use these exact values):
Primary: ${genome.colors.primary} | Secondary: ${genome.colors.secondary} | Accent: ${genome.colors.accent}
Background: ${genome.colors.background} | Surface: ${genome.colors.surface}
Radius: ${genome.radius.sm} / ${genome.radius.md} / ${genome.radius.lg}
Heading font: ${headingFont} | Body font: ${bodyFont}
CSS variables for :root { ${colorVars} }
Font import: <link href="${googleFontsUrl}" rel="stylesheet">

${logoUrl
      ? `LOGO: Place this exact img tag in the navbar (left side): <img src="${logoUrl}" alt="${brandName}" style="height:36px;width:auto;object-fit:contain;display:block;">`
      : `LOGO: Show "${brandName}" as styled text in the navbar.`}

${imageInstruction}

HARD RULES (non-negotiable):
1. SINGLE FILE: All HTML, CSS in <style>, JS in <script>. No external libraries or CDN imports.
2. CONTRAST: Dark backgrounds require light text (#f1f5f9). Set --color-text: #f1f5f9 and --color-text-muted: #94a3b8 in :root. Explicitly set color on ALL text elements — never rely on browser defaults. Buttons use white text on colored backgrounds. Inputs have visible borders (rgba(255,255,255,0.1)).
3. TYPOGRAPHY: h1 max 2.5rem, h2 max 1.75rem, h3 max 1.25rem, body 1rem with line-height 1.7.
4. NO EXTERNAL NAVIGATION: Never use window.location, location.assign(), window.open(), or external URLs. All navigation is in-page (switch views/sections). Forms use e.preventDefault() with in-page feedback.
5. FUNCTIONALITY: Every button has a click handler. Every form validates and processes. Every input is connected to state. Zero decorative/dead UI elements. If a feature is shown, it works completely.
6. STATE: Use window.appState for all app data. Persist to localStorage on every change. Load from localStorage on startup. Render all UI dynamically from state — never hardcode content in HTML.
7. INITIALIZATION: At the end of <script>: document.addEventListener('DOMContentLoaded', function() { init(); }); — init() must populate ALL visible content from state so the page is never blank on load. Use event delegation (document.addEventListener on a parent) for dynamically rendered elements.
8. RESPONSIVE: CSS grid/flex, works on mobile. Navigation adapts (hamburger menu or collapsible sidebar on small screens).
9. REALISTIC DATA: Seed with real names, dates, and numbers specific to this domain. No lorem ipsum, no "test" entries, no placeholder text.
10. VISUAL POLISH: Hover states on all clickable elements. Smooth CSS transitions on state changes. Toast notifications for user actions. Active state on current nav item.

CONTENT REQUIREMENTS (the app must have ALL of these):
- HERO/HEADER SECTION: A visually striking top section with the product name, tagline, and primary call-to-action.
- MAIN CONTENT AREA: The core functional area (product grid, data table, dashboard panels, feature showcase, etc.) — must be rendered visibly from state data on load, NOT hidden or empty.
- MULTIPLE VIEWS/SECTIONS: At least 3 distinct content areas navigable via the nav bar. Each view must have real, substantial content.
- FOOTER: With copyright, brand name, and relevant links.
- CSS must be comprehensive: style EVERY element, including scrollbar styling (webkit), selection styling, focus states on inputs, hover transitions on cards/buttons, gradient accents.
- JavaScript must include: event delegation for dynamic elements, search/filter functionality, modal dialogs for detail views, toast notification system, data rendering functions that rebuild UI from state.

${integrations && integrations.length > 0 ? `INTEGRATIONS:\n${integrations.map(ig => `- ${ig.name}: Key = "${ig.value}" — include initialization in <head>.`).join("\n")}` : ""}

CRITICAL: You must write at MINIMUM 800 lines of actual functional code. Short/minimal output is unacceptable. The app must be DENSE with content, features, and polish — it must feel like real production software, not a prototype. Include extensive CSS (200+ lines), rich HTML structure, and comprehensive JavaScript (300+ lines). Start with <!DOCTYPE html> immediately.`;

    const maxTokens = 12000;

    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const text = await chat(system, user, maxTokens);
      let html = extractHtml(text);

      if (!html.includes("</html>") && html.includes("<html")) {
        html += "\n</body>\n</html>";
      }

      const lineCount = html.split("\n").length;
      const hasStyle = html.includes("<style>") && html.includes("</style>");
      const hasScript = html.includes("<script>") && html.includes("</script>");
      const hasInitOrRender = html.includes("DOMContentLoaded") || html.includes("init(") || html.includes("render");
      const hasBadPlaceholder = html.includes("via.placeholder.com") || html.includes("placehold.co") || html.includes("placeholder.com/");

      if (hasBadPlaceholder) {
        html = html.replace(/https?:\/\/(via\.placeholder\.com|placehold\.co|placeholder\.com)\/(\d+)(x(\d+))?/g,
          (_, _host, w, _x, h) => `https://picsum.photos/seed/${imageKeywords}${Math.floor(Math.random() * 99)}/${w}/${h || w}`);
      }

      const isValid = lineCount >= 200 && hasStyle && hasScript && hasInitOrRender;

      if (isValid || attempt === maxAttempts) {
        if (lineCount < 200) {
          console.warn(`[Groq] Generated HTML is only ${lineCount} lines (attempt ${attempt}/${maxAttempts}) — accepting anyway`);
        }
        return injectSafetyScript(html);
      }

      console.warn(`[Groq] Generated HTML too short (${lineCount} lines) or missing critical sections — retrying (attempt ${attempt}/${maxAttempts})`);
    }

    return null;
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
