import OpenAI from "openai";
import type { DesignGenome } from "@shared/genomeGenerator";

const apiKey = process.env.GROQ_API_KEY;

const client = apiKey
  ? new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" })
  : null;

const MODEL_PREFERENCE = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
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

function hasGenericPlaceholders(html: string): boolean {
  const genericPatterns = [
    /\bSection\s+\d\b/i,
    /\bHeader\s+\d\b/i,
    /\bData\s+\d\b/i,
    /\bButton\s+\d\b/i,
    /\bMain\s+Content\b/i,
    /\bItem\s+\d\b/i,
    /\bColumn\s+\d\b/i,
    /\bRow\s+\d\b/i,
    /\bSample\s+Text\b/i,
    /\bPlaceholder\b/i,
    /\bLorem\s+ipsum\b/i,
  ];
  const text = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
  let matches = 0;
  for (const p of genericPatterns) {
    if (p.test(text)) matches++;
  }
  return matches >= 3;
}

function enforceGenomeColors(html: string, genome: DesignGenome): string {
  const rootVars = genomeToColorVars(genome);
  const rootBlock = `:root {\n    ${rootVars}\n  }`;

  if (html.includes(":root")) {
    html = html.replace(/:root\s*\{[^}]*\}/g, rootBlock);
  } else if (html.includes("<style>")) {
    html = html.replace("<style>", `<style>\n  ${rootBlock}\n`);
  } else if (html.includes("</head>")) {
    html = html.replace("</head>", `<style>\n  ${rootBlock}\n</style>\n</head>`);
  }

  const bodyBgMatch = html.match(/body\s*\{([^}]*)\}/);
  if (bodyBgMatch && !bodyBgMatch[1].includes("var(--color-bg)")) {
    html = html.replace(
      bodyBgMatch[0],
      bodyBgMatch[0].replace(
        bodyBgMatch[1],
        bodyBgMatch[1].replace(
          /background(-color)?\s*:\s*[^;]+;/,
          `background-color: var(--color-bg, ${genome.colors.background});`
        )
      )
    );
  }

  return html;
}

function sanitizeGeneratedCss(html: string): string {
  html = html.replace(
    /h([1-6])\s*\{[^}]*?max-width\s*:\s*[\d.]+rem[^}]*?\}/g,
    (match, level) => {
      const sizes: Record<string, string> = { "1": "2.5rem", "2": "1.75rem", "3": "1.25rem", "4": "1.1rem", "5": "1rem", "6": "0.875rem" };
      return match.replace(/max-width\s*:\s*[\d.]+rem/, `font-size: ${sizes[level] || "1rem"}`);
    }
  );

  html = html.replace(
    /h([1-6])\s*\{([^}]*?)\}/g,
    (match, _level, body) => {
      if (/max-width\s*:\s*[\d.]+rem/.test(body) && !/font-size/.test(body)) {
        return match;
      }
      return match;
    }
  );

  return html;
}

function fixOverlappingLayout(html: string): string {
  const overlapFixCSS = `
  /* Morse layout safety — prevent overlapping content */
  section, header, main, footer, nav, .hero, [class*="hero"], [class*="section"], [class*="container"] {
    position: relative !important;
    overflow: hidden;
    clear: both;
  }
  body > *, main > *, .app > *, #app > *, .container > * {
    position: relative;
    float: none;
  }
  h1, h2, h3, h4, h5, h6, p, span, a, button, img {
    position: relative;
  }
  `;

  html = html.replace(
    /position\s*:\s*absolute\s*;([^}]*?)(top\s*:\s*\d+[^;]*;[^}]*?left\s*:\s*\d+[^;]*;)/g,
    (match, mid, _rest) => {
      if (/modal|overlay|popup|dropdown|menu|tooltip|toast|notification|backdrop|dialog/i.test(match)) {
        return match;
      }
      if (/nav|sidebar|fixed/i.test(match)) {
        return match;
      }
      return match.replace("position: absolute", "position: relative");
    }
  );

  const heroPattern = /(<(?:section|div|header)[^>]*(?:class|id)\s*=\s*"[^"]*hero[^"]*"[^>]*>)([\s\S]*?)(<\/(?:section|div|header)>)/gi;
  html = html.replace(heroPattern, (match, openTag, content, closeTag) => {
    const fixedContent = content.replace(
      /position\s*:\s*absolute/g,
      (absMatch: string) => {
        if (/overlay|backdrop|bg/i.test(content.slice(Math.max(0, content.indexOf(absMatch) - 100), content.indexOf(absMatch)))) {
          return absMatch;
        }
        return "position: relative";
      }
    );
    return openTag + fixedContent + closeTag;
  });

  if (html.includes("</style>")) {
    html = html.replace("</style>", `${overlapFixCSS}\n</style>`);
  }

  return html;
}

function enforceVisualHierarchy(html: string): string {
  const hierarchyCSS = `
  /* Morse visual hierarchy enforcement */
  h1 { font-size: 2.75rem; font-weight: 800; line-height: 1.15; letter-spacing: -0.02em; }
  h2 { font-size: 1.85rem; font-weight: 700; line-height: 1.25; }
  h3 { font-size: 1.35rem; font-weight: 600; line-height: 1.35; }
  h4 { font-size: 1.1rem; font-weight: 600; }
  p, li, td, th { font-size: 1rem; line-height: 1.7; }
  section, [class*="section"] { padding-top: 80px; padding-bottom: 80px; }
  `;

  if (html.includes("</style>")) {
    html = html.replace("</style>", `${hierarchyCSS}\n</style>`);
  }

  return html;
}

function enforceContrastAndBackgrounds(html: string, genome: DesignGenome): string {
  const bgColor = genome.colors.background;
  const surfaceColor = genome.colors.surface;

  const contrastCSS = `
  /* Morse contrast & background consistency enforcement */
  body, html {
    color: #f1f5f9;
  }
  h1, h2, h3, h4, h5, h6 {
    color: #ffffff;
  }
  p, span, li, td, th, label, .text-muted, .subtitle, .description {
    color: #cbd5e1;
  }
  a:not([class*="btn"]):not([class*="button"]) {
    color: #e2e8f0;
  }
  nav, nav *, .navbar, .navbar * {
    background-color: var(--color-bg, ${bgColor});
  }
  `;

  const isDarkBg = isDarkColor(bgColor);

  if (isDarkBg) {
    if (html.includes("</style>")) {
      html = html.replace("</style>", `${contrastCSS}\n</style>`);
    }
  }

  html = html.replace(
    /(<nav\b[^>]*style="[^"]*?)background(?:-color)?\s*:\s*([^";]+)/gi,
    (match, prefix, color) => {
      if (color.includes("var(--color-bg)") || color.includes("var(--color-surface)")) return match;
      return `${prefix}background-color: var(--color-bg, ${bgColor})`;
    }
  );

  return html;
}

function isDarkColor(color: string): boolean {
  let r = 0, g = 0, b = 0;

  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
  } else if (color.startsWith("hsl")) {
    const match = color.match(/hsl\w?\(\s*([\d.]+)\s*,?\s*([\d.]+)%?\s*,?\s*([\d.]+)%?/);
    if (match) {
      const l = parseFloat(match[3]);
      return l < 40;
    }
  } else if (color.startsWith("rgb")) {
    const match = color.match(/rgb\w?\(\s*([\d.]+)\s*,?\s*([\d.]+)\s*,?\s*([\d.]+)/);
    if (match) {
      r = parseInt(match[1]);
      g = parseInt(match[2]);
      b = parseInt(match[3]);
    }
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.4;
}

function ensureNavAtTop(html: string): string {
  const navMatch = html.match(/(<nav\b[^>]*>[\s\S]*?<\/nav>)/i);
  if (!navMatch) return html;

  const nav = navMatch[1];
  const bodyMatch = html.match(/<body[^>]*>/i);
  if (!bodyMatch) return html;

  const bodyTag = bodyMatch[0];
  const bodyIndex = html.indexOf(bodyTag);
  const navIndex = html.indexOf(nav);

  if (navIndex <= bodyIndex + bodyTag.length + 50) return html;

  const heroPattern = /<(?:section|div|header)[^>]*(?:class|id)\s*=\s*"[^"]*hero[^"]*"[^>]*>/i;
  const heroMatch = html.match(heroPattern);

  if (heroMatch && navIndex > html.indexOf(heroMatch[0])) {
    html = html.replace(nav, "");
    html = html.replace(bodyTag, bodyTag + "\n" + nav);
  }

  return html;
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

  // --- Suppress auto-showing modals, toasts, and popups on page load ---
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      var selectors = '.modal, .popup, .overlay, .dialog, .toast, .notification, [class*="modal"], [class*="popup"], [class*="overlay"], [class*="dialog"], [class*="toast"], [class*="notification"], [role="dialog"], [role="alertdialog"]';
      document.querySelectorAll(selectors).forEach(function(el) {
        var style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
          var isFullOverlay = (style.position === 'fixed' || style.position === 'absolute') && (parseInt(style.zIndex) > 100 || el.className.toString().match(/modal|popup|overlay|dialog|toast|notification/i));
          if (isFullOverlay) {
            el.style.display = 'none';
          }
        }
      });
    }, 100);
  });

  // --- Intercept clicks that would navigate externally (but NOT close/dismiss buttons) ---
  document.addEventListener('click', function(e) {
    var el = e.target;
    for (var i = 0; i < 6 && el && el !== document.body; i++, el = el.parentElement) {
      if (!el || !el.tagName) continue;
      var tag = el.tagName.toUpperCase();

      // Skip interception for close/dismiss/cancel buttons — let them work naturally
      if (tag === 'BUTTON' || tag === 'A' || tag === 'SPAN') {
        var text = (el.textContent || '').trim().toLowerCase();
        var cls = (el.className || '').toLowerCase();
        if (text === 'close' || text === 'dismiss' || text === 'cancel' || text === '×' || text === '✕' || text === 'x' ||
            cls.includes('close') || cls.includes('dismiss') || cls.includes('cancel') ||
            el.getAttribute('data-dismiss') || el.getAttribute('data-close')) {
          return;
        }
      }

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

export interface ChatResult {
  content: string;
  tokensUsed: number;
}

async function chat(
  systemPrompt: string,
  userContent: string,
  maxTokens = 2048,
): Promise<ChatResult> {
  if (!client) throw new Error("GROQ_API_KEY not configured");

  let lastError: Error | null = null;
  for (const model of MODEL_PREFERENCE) {
    for (let retry = 0; retry < 3; retry++) {
      try {
        console.log(`[Groq] Trying model ${model} (attempt ${retry + 1})...`);
        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          max_tokens: maxTokens,
          temperature: 0.6,
        });
        const tokensUsed = completion.usage?.total_tokens ?? 0;
        const content = completion.choices[0]?.message?.content ?? "";
        console.log(`[Groq] Model ${model} succeeded — ${tokensUsed} tokens used`);
        return { content, tokensUsed };
      } catch (err: any) {
        const msg = err?.message ?? "";
        const isRateLimit = msg.includes("429") || msg.includes("rate") || msg.includes("quota");
        const isModelError = msg.includes("decommissioned") || msg.includes("not found") || msg.includes("not supported") || msg.includes("model_");
        console.warn(`[Groq] Model ${model} failed (attempt ${retry + 1}):`, msg.slice(0, 200));
        lastError = err;

        if (isModelError) break;
        if (isRateLimit) {
          const waitTime = (retry + 1) * 3000;
          console.log(`[Groq] Rate limited on ${model}, waiting ${waitTime / 1000}s before retry...`);
          await new Promise(r => setTimeout(r, waitTime));
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

    const result = await chat(system, user, 1024);
    const json = extractJson(result.content);
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
): Promise<{ html: string; tokensUsed: number } | null> {
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
    const stopWords = new Set(["the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "at", "by", "is", "it", "app", "platform", "system", "tool", "website"]);
    const promptWords = `${interpret.productName} ${interpret.industry} ${interpret.productType}`.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));
    const imageKeywords = [...new Set(promptWords)].slice(0, 3).join("-");
    const visualTypes = ["ecommerce", "store", "shop", "portfolio", "gallery", "restaurant", "real_estate", "travel", "fashion", "clothing", "food", "hotel", "marketplace", "catalog"];
    const isVisualProduct = visualTypes.some(t => combinedText.includes(t) || (interpret.productType || "").toLowerCase().includes(t) || (interpret.pageType || "").toLowerCase().includes(t));
    const hasImages = isVisualProduct || combinedText.includes("picture") || combinedText.includes("photo") || combinedText.includes("image") || combinedText.includes("gallery") || combinedText.includes("banner") || combinedText.includes("hero image");

    const imageInstruction = `IMAGES — CONTEXTUAL RELEVANCE IS CRITICAL:
Use picsum.photos for ALL images. Format: src="https://picsum.photos/seed/{descriptive-keyword}/width/height".

THE PRODUCT IS: "${interpret.productName}" — a ${interpret.productType} in the ${interpret.industry} industry.
Target audience: ${interpret.targetAudience}.

IMAGE SEED SELECTION RULES (read carefully):
- The seed keyword DIRECTLY controls what image appears. You MUST choose seeds that describe what a user of "${interpret.productName}" would expect to see.
- Think: "If I were a ${interpret.targetAudience} visiting ${interpret.productName}, what images would I expect on this website?"
- HERO IMAGE: Choose a seed that represents the CORE of this product. Examples:
  * Fintech app → seed/digital-banking-finance/1200/600 or seed/money-management-laptop/1200/600
  * Restaurant → seed/fine-dining-restaurant-interior/1200/600 or seed/gourmet-food-plating/1200/600
  * Fitness app → seed/gym-workout-training/1200/600 or seed/running-athlete-outdoor/1200/600
  * Real estate → seed/modern-house-exterior/1200/600 or seed/luxury-apartment-interior/1200/600
  * Education → seed/students-classroom-learning/1200/600 or seed/library-books-study/1200/600
  * Healthcare → seed/medical-doctor-hospital/1200/600 or seed/healthcare-technology/1200/600
  * E-commerce → seed/online-shopping-products/1200/600 or seed/fashion-clothing-store/1200/600
- FEATURE/CARD IMAGES: Each must relate to a SPECIFIC feature of ${interpret.productName}:
  * For each feature (${interpret.features.slice(0, 4).join(", ")}), pick a seed that visually represents THAT feature
  * Example for a CRM: "Contact Management" → seed/business-contacts-networking, "Sales Pipeline" → seed/sales-chart-growth, "Email Campaigns" → seed/email-marketing-digital
- ABOUT/TEAM: seed/professional-team-office/400/400 or seed/business-meeting-collaboration/400/400
- NEVER use generic seeds like: seed/image1, seed/photo, seed/random, seed/placeholder, seed/test, seed/example, seed/picture
- NEVER use seeds unrelated to the product (e.g., food images for a tech company, nature for a fintech)
- Each image MUST have a COMPLETELY UNIQUE seed — never repeat the same seed
- NEVER use source.unsplash.com, via.placeholder.com, placehold.co, or placeholder.com
${hasImages ? "- This product is VISUAL — include prominent product/hero images throughout with large, high-quality image areas. Use at least 5 distinct contextual images." : ""}`;

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
2. COLORS: You MUST use the CSS variables (var(--color-primary), var(--color-secondary), var(--color-accent), var(--color-bg), var(--color-surface)) for ALL colors. NEVER pick your own colors. NEVER use bright green (#00ff00), neon red, hot pink, or garish colors. The :root block with all --color-* variables is mandatory. Background: var(--color-bg). Cards/panels: var(--color-surface). Buttons: var(--color-primary). Accents: var(--color-accent). Text: var(--color-text) and var(--color-text-muted).
3. CONTRAST & READABILITY (critical — users must be able to read ALL text):
   - Dark backgrounds REQUIRE bright white or near-white text. Set --color-text: #f1f5f9 and --color-text-muted: #94a3b8 in :root.
   - EVERY text element (h1, h2, h3, h4, h5, h6, p, span, a, li, td, th, label, button text) must have an explicitly set color — NEVER rely on browser defaults.
   - Headings on dark backgrounds: color: #ffffff or color: var(--color-text). NEVER use dark gray text on dark backgrounds.
   - Subtitle/description text: color: #cbd5e1 or var(--color-text-muted) — must be clearly readable, not faint.
   - Buttons: white text (#ffffff) on colored backgrounds. NEVER dark text on dark buttons.
   - Inputs: visible borders (rgba(255,255,255,0.15)) and light text color.
   - MINIMUM contrast ratio: text must always be clearly visible against its background. If the background is dark, text must be light. If the background is light, text must be dark. No exceptions.
   - CONSISTENT BACKGROUNDS: The nav bar and the hero section MUST use the SAME background color (var(--color-bg)). ALL full-width sections must use EITHER var(--color-bg) OR var(--color-surface) — never custom shades that create visible seams between adjacent sections. Adjacent sections should either share the same background or use a clear intentional contrast (e.g., alternating between --color-bg and --color-surface). NEVER use two slightly different shades of the same color next to each other — this creates ugly visible seams.
4. TYPOGRAPHY: Apply the Google Fonts import and use the heading/body fonts on ALL text elements. Set font-family on body, h1-h6, buttons, inputs, labels, nav links, cards — EVERY text element must inherit the chosen fonts, never fall back to browser defaults. Use font-size (NOT max-width) for headings: h1 { font-size: 2.5rem; }, h2 { font-size: 1.75rem; }, h3 { font-size: 1.25rem; }, body { font-size: 1rem; line-height: 1.7; }. NEVER set max-width on heading elements. Add: * { font-family: inherit; } and body { font-family: '${bodyFont}', sans-serif; } and h1,h2,h3,h4,h5,h6 { font-family: '${headingFont}', sans-serif; }.
5. NO EXTERNAL NAVIGATION: Never use window.location, location.assign(), window.open(), or external URLs. All navigation is in-page (switch views/sections). Forms use e.preventDefault() with in-page feedback.
6. FULLY FUNCTIONAL BUTTONS: Every single button MUST have a working click handler. Close/dismiss buttons must close their parent modal/popup. "Get Started"/"Learn More" buttons must scroll to or show the relevant section. Form submit buttons must validate and process. NEVER create a button without a functional onclick handler. Modal close buttons: use onclick to set the modal's display to 'none'. Toast dismiss buttons: remove the toast element. There must be ZERO dead/decorative buttons in the entire app.
7. STATE: Use window.appState for all app data. Persist to localStorage on every change. Load from localStorage on startup. Render all UI dynamically from state — never hardcode content in HTML.
8. INITIALIZATION: At the end of <script>: document.addEventListener('DOMContentLoaded', function() { init(); }); — init() must populate ALL visible content from state so the page is never blank on load. Use event delegation (document.addEventListener on a parent) for dynamically rendered elements.
9. RESPONSIVE: CSS grid/flex, works on mobile. Navigation adapts (hamburger menu or collapsible sidebar on small screens).
10. REALISTIC DATA: Seed with real names, dates, and numbers specific to this domain. No lorem ipsum, no "test" entries, no placeholder text. NEVER use generic labels like "Section 1", "Header 1", "Data 1", "Button 1", "Item 1", "Column 1", "Main Content", "Sample Text". Every label must be specific to the product domain.
11. VISUAL POLISH: Hover states on all clickable elements. Smooth CSS transitions on state changes. Toast notifications for user actions (with working dismiss). Active state on current nav item.
12. NO POPUPS OR MODALS ON PAGE LOAD (CRITICAL): The page must load CLEAN with ZERO popups, modals, toasts, notifications, overlays, or dialogs visible. ALL modals must start with display:none or visibility:hidden. ALL toast/notification containers must start empty. The init() function must NOT trigger any showModal(), showToast(), showNotification(), or alert() calls. No element with class "modal", "toast", "notification", "overlay", "popup", or "dialog" should be visible on initial render. Modals and toasts should ONLY appear in response to user clicks — never automatically.

VISUAL HIERARCHY (critical — the design must guide the user's eye):
- SIZE HIERARCHY: h1 (2.5–3rem, font-weight: 800) > h2 (1.75–2rem, font-weight: 700) > h3 (1.25–1.5rem, font-weight: 600) > body (1rem, font-weight: 400). There must be a CLEAR size difference between each heading level — never make h1 and h2 look the same size.
- HERO SECTION: The hero h1 must be the LARGEST text on the entire page (min 2.5rem, ideally 3–3.5rem). It must be the first thing the user's eye is drawn to. The subtitle below it should be noticeably smaller (1.1–1.25rem) and use a muted color. The CTA button should be large and prominent (padding: 14px 32px, font-size: 1.1rem).
- SECTION HEADINGS: Each section's h2 must be clearly larger than the content below it. Add a subtle accent element (e.g., a small colored bar, underline, or badge above the heading) to separate sections visually.
- SPACING RHYTHM: Use generous whitespace between sections (padding: 80px 0 minimum for major sections). Within sections, use consistent spacing (24px–32px between cards, 16px between text elements). NEVER crowd elements together — whitespace is a feature, not wasted space.
- VISUAL WEIGHT: Primary CTA buttons should be bold and filled (background: var(--color-primary), large padding). Secondary actions should be outlined or ghost buttons. Links should be subtle. This creates a clear action hierarchy.
- CARD DESIGN: Cards should have subtle elevation (box-shadow or border), consistent padding (24px), and clear internal hierarchy (image > title > description > action). Card titles should be bold (font-weight: 600) and card descriptions should be muted.
- COLOR EMPHASIS: Use var(--color-primary) sparingly for emphasis — only on CTAs, active nav items, and key metrics. Use var(--color-accent) for highlights and badges. Overusing the primary color kills hierarchy.
- CONTENT WIDTH: Hero text should be contained (max-width: 700px for text area) so lines don't stretch too wide. Body content areas should use max-width: 1200px. Narrow content is easier to read.

LAYOUT QUALITY (critical — the design must look professional):
- Use CSS Grid or Flexbox for ALL layouts. NEVER use position: absolute for layout structure, text placement, or section content. Only use position: absolute for overlays, modals, dropdowns, and tooltips.
- ZERO OVERLAPPING: No text, heading, button, or content element may visually overlap another. Every element must occupy its own space in the document flow. Hero sections must use flexbox column layout (display: flex; flex-direction: column; align-items: center; justify-content: center;) — NEVER stack elements with position: absolute inside heroes.
- Consistent spacing: use a spacing scale (8px, 16px, 24px, 32px, 48px, 64px, 80px). Sections should have padding: 80px 0 or more.
- Cards must have equal heights in a row (use grid with auto-rows or flex with stretch). Card grids: use gap: 24px minimum.
- Hero section: full-width, min-height: 60vh, display: flex, flex-direction: column, align-items: center, justify-content: center. Place heading, subtitle, and CTA in normal flow — never use absolute positioning for hero text.
- Container max-width: 1200px centered with margin: 0 auto and padding: 0 24px for content areas.
- Section headings: center-aligned with margin-bottom: 48px before content grids.
- Navigation: MUST be the FIRST visible element on the page, ABOVE the hero section. Use position: sticky; top: 0; z-index: 1000; full-width, with proper padding and clear active state. Brand on left, links on right. The nav bar must NEVER appear below the hero or any other content section.
- No content should ever overflow its container or overlap other elements. If you need a background image on a section, use background-image CSS property on the section itself — do NOT create an absolute-positioned img behind the content.
- Modals must have proper overlay (fixed, inset 0, semi-transparent background), centered content, and a visible close button.

CONTENT REQUIREMENTS (the app must have ALL of these):
- HERO/HEADER SECTION: A visually striking top section with the product name, tagline, and primary call-to-action. Full-width background with overlay text.
- MAIN CONTENT AREA: The core functional area (product grid, data table, dashboard panels, feature showcase, etc.) — must be rendered visibly from state data on load, NOT hidden or empty.
- MULTIPLE VIEWS/SECTIONS: At least 3 distinct content areas navigable via the nav bar. Each view must have real, substantial content.
- FOOTER: With copyright, brand name, and relevant links. Full-width dark background.
- CSS must be comprehensive: style EVERY element, including scrollbar styling (webkit), selection styling, focus states on inputs, hover transitions on cards/buttons, gradient accents.
- JavaScript must include: event delegation for dynamic elements, search/filter functionality, modal dialogs for detail views (with working close buttons), toast notification system (with working dismiss), data rendering functions that rebuild UI from state.

${integrations && integrations.length > 0 ? `INTEGRATIONS:\n${integrations.map(ig => `- ${ig.name}: Key = "${ig.value}" — include initialization in <head>.`).join("\n")}` : ""}

CRITICAL: You must write at MINIMUM 800 lines of actual functional code. Short/minimal output is unacceptable. The app must be DENSE with content, features, and polish — it must feel like real production software, not a prototype. Include extensive CSS (200+ lines), rich HTML structure, and comprehensive JavaScript (300+ lines). Start with <!DOCTYPE html> immediately.`;

    const maxTokens = 12000;

    const maxAttempts = 3;
    let cumulativeTokens = 0;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const chatResult = await chat(system, user, maxTokens);
      cumulativeTokens += chatResult.tokensUsed;
      let html = extractHtml(chatResult.content);

      if (!html.includes("</html>") && html.includes("<html")) {
        html += "\n</body>\n</html>";
      }

      const lineCount = html.split("\n").length;
      const hasStyle = html.includes("<style>") && html.includes("</style>");
      const hasScript = html.includes("<script>") && html.includes("</script>");
      const hasInitOrRender = html.includes("DOMContentLoaded") || html.includes("init(") || html.includes("render");
      const hasBadPlaceholder = html.includes("via.placeholder.com") || html.includes("placehold.co") || html.includes("placeholder.com/");
      const isGeneric = hasGenericPlaceholders(html);

      if (hasBadPlaceholder) {
        html = html.replace(/https?:\/\/(via\.placeholder\.com|placehold\.co|placeholder\.com)\/(\d+)(x(\d+))?/g,
          (_, _host, w, _x, h) => `https://picsum.photos/seed/${imageKeywords}${Math.floor(Math.random() * 99)}/${w}/${h || w}`);
      }

      html = sanitizeGeneratedCss(html);
      html = enforceGenomeColors(html, genome);
      html = fixOverlappingLayout(html);
      html = ensureNavAtTop(html);
      html = enforceContrastAndBackgrounds(html, genome);
      html = enforceVisualHierarchy(html);

      const usesGenomeColors = html.includes("var(--color-primary)") || html.includes("var(--color-bg)") || html.includes(genome.colors.primary);

      const isValid = lineCount >= 200 && hasStyle && hasScript && hasInitOrRender && !isGeneric;

      if (isValid || attempt === maxAttempts) {
        if (lineCount < 200) {
          console.warn(`[Groq] Generated HTML is only ${lineCount} lines (attempt ${attempt}/${maxAttempts}) — accepting anyway`);
        }
        if (isGeneric) {
          console.warn(`[Groq] Generated HTML has generic placeholder content (attempt ${attempt}/${maxAttempts}) — ${attempt < maxAttempts ? "retrying" : "accepting with enforcement"}`);
        }
        if (!usesGenomeColors) {
          console.warn(`[Groq] Generated HTML does not use genome color variables — enforced via post-processing`);
        }
        return { html: injectSafetyScript(html), tokensUsed: cumulativeTokens };
      }

      console.warn(`[Groq] Generated HTML quality too low (lines=${lineCount}, style=${hasStyle}, script=${hasScript}, init=${hasInitOrRender}, generic=${isGeneric}) — retrying (attempt ${attempt}/${maxAttempts})`);
    }

    return null;
  } catch (err) {
    console.error("[Groq] Stage 2 (generate app) failed:", err);
    return null;
  }
}

export async function geminiEditApp(
  existingHtml: string,
  editInstruction: string,
  brandName: string,
  genome: DesignGenome,
): Promise<{ html: string; tokensUsed: number } | null> {
  if (!client) return null;
  try {
    const system = `You are an expert HTML/CSS/JS editor. You receive an existing single-file HTML application and an edit instruction. You must apply ONLY the requested change — do NOT rewrite, restructure, or regenerate the app. Preserve all existing functionality, layout, styling, data, and JavaScript logic. Output the COMPLETE modified HTML document starting with <!DOCTYPE html>. No explanation, no markdown fences.`;

    const trimmedHtml = existingHtml
      .replace(/<script>\s*\/\/\s*Morse safety layer[\s\S]*?<\/script>/g, "")
      .trim();

    const user = `Here is the existing HTML application:

\`\`\`html
${trimmedHtml}
\`\`\`

EDIT INSTRUCTION: "${editInstruction}"

RULES:
1. Apply ONLY the requested change. Do NOT remove, restructure, or rewrite other parts.
2. Keep ALL existing JavaScript functions, event handlers, state management, and data intact.
3. Keep ALL existing CSS styles unless the edit specifically asks to change styling.
4. Keep ALL existing HTML structure unless the edit specifically asks to change layout.
5. If the edit asks for a color change, update the CSS variables or specific color values.
6. If the edit asks for content changes, update only the relevant text/data.
7. If the edit asks to add a section, insert it in a logical position without removing existing sections.
8. Preserve the dark theme with light text (#f1f5f9) on dark backgrounds.
9. Keep all images using picsum.photos URLs.
10. Output the COMPLETE HTML document — not a diff, not a fragment.
11. Ensure ALL buttons have working click handlers. Close/dismiss buttons must close modals. No dead buttons.
12. Ensure fonts are applied to ALL text elements via * { font-family: inherit; } and body font-family setting.

Return the full modified HTML starting with <!DOCTYPE html>.`;

    const maxTokens = 12000;
    const chatResult = await chat(system, user, maxTokens);
    let html = extractHtml(chatResult.content);

    if (!html.includes("</html>") && html.includes("<html")) {
      html += "\n</body>\n</html>";
    }

    html = sanitizeGeneratedCss(html);
    html = enforceGenomeColors(html, genome);
    html = fixOverlappingLayout(html);
    html = ensureNavAtTop(html);
    html = enforceContrastAndBackgrounds(html, genome);
    html = enforceVisualHierarchy(html);

    const lineCount = html.split("\n").length;
    const hasBasicStructure = html.includes("<style") && html.includes("<script") && html.includes("<!DOCTYPE html>");
    if (lineCount < 50 || !hasBasicStructure) {
      console.warn(`[Groq] Edit result invalid (${lineCount} lines, structure=${hasBasicStructure}), falling back to full regeneration`);
      return null;
    }

    return { html: injectSafetyScript(html), tokensUsed: chatResult.tokensUsed };
  } catch (err) {
    console.error("[Groq] Edit app failed:", err);
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

    const result = await chat(system, user, 4096);
    const jsBlock = result.content.match(/```(?:js|javascript)?\s*([\s\S]*?)\s*```/);
    return jsBlock ? jsBlock[1].trim() : result.content.trim();
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

    const result = await chat(system, user, 256);
    const json = extractJson(result.content);
    return JSON.parse(json);
  } catch (err) {
    console.error("[Groq] Edit interpret failed:", err);
    return null;
  }
}

export function isGeminiAvailable(): boolean {
  return !!client;
}
