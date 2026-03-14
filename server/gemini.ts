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
          // Try to find a contact/action section to show
          var dest = document.getElementById('contact-page') ||
                     document.getElementById('page-contact') ||
                     document.getElementById('view-contact') ||
                     document.getElementById('page-donate') ||
                     document.getElementById('view-settings') ||
                     document.querySelector('.page:not(.active)') ||
                     document.querySelector('.view:not(.active)');
          if (dest) {
            document.querySelectorAll('.page,.view').forEach(function(p) { p.classList.remove('active'); });
            dest.classList.add('active');
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

    const logoInstruction = logoUrl
      ? `LOGO: The brand has an uploaded logo image. Use this exact URL in an <img> tag inside the navigation bar (left side, height 36px): ${logoUrl}`
      : `LOGO: No logo image. Show the brand name "${brandName}" as styled text in the navigation bar.`;

    const nlSection = nlInstruction
      ? `\nUSER EDIT REQUEST: The user has requested the following change to the design: "${nlInstruction}"\nMake sure this change is clearly applied in the generated application.`
      : "";

    const isDashboard = interpret.hasDashboard || interpret.pageType === "dashboard" || interpret.productType === "dashboard";
    // Treat EVERYTHING that involves user interaction as a web app — only purely informational sites get landing page treatment
    const isWebApp = !isDashboard && (
      interpret.pageType === "web_app" ||
      interpret.productType === "saas" ||
      interpret.productType === "productivity" ||
      interpret.productType === "ecommerce" ||
      interpret.productType === "social" ||
      interpret.productType === "fintech" ||
      interpret.productType === "healthcare" ||
      interpret.productType === "education" ||
      // Also detect from features/prompt keywords — if the product DOES things, it's an app
      interpret.features.some((f: string) => /track|manage|create|edit|delete|add|search|filter|sort|calculate|convert|schedule|book|order|pay|upload|download|send|receive|login|sign|play|record|monitor|analyze|chat|message|timer|clock|count|score|vote|rate|review|share|save|export|import|generate|build|design|compose|write|draw|plan|organize|list|board|kanban|calendar|browse|shop|buy|sell|donate|subscribe|register|submit|post|comment|reply|follow|like|bookmark|archive|assign|complete|start|stop|pause|reset|toggle|switch|select|pick|choose|compare|customize|configure|set up|enroll|apply|request|reserve|check|scan|measure|log|enter|input|fill/i.test(f)) ||
      // Catch-all: if the classifier said web_app in any form
      interpret.hasBackend
    );
    const isLandingPage = !isDashboard && !isWebApp;

    const system = `You are an elite full-stack web developer who builds production-quality, fully functional applications. You build REAL working software — not mockups, not wireframes, not marketing pages. Every feature must actually work with real data manipulation, state management, and user interactions. Output ONLY a complete HTML document starting with <!DOCTYPE html> — no explanation, no markdown fences, no commentary before or after the HTML.`;

    const combinedText = `${prompt} ${nlInstruction ?? ""}`.toLowerCase();
    const hasImages = combinedText.includes("picture") || combinedText.includes("photo") || combinedText.includes("image") || combinedText.includes("gallery") || combinedText.includes("banner") || combinedText.includes("hero image");
    const imageKeywords = interpret.productName.toLowerCase().replace(/\s+/g, "+");

    const imageInstruction = hasImages
      ? `IMAGES: Use picsum.photos for guaranteed-loading images:
  - Format: <img src="https://picsum.photos/seed/${imageKeywords}/800/500" alt="..." style="width:100%;height:300px;object-fit:cover;border-radius:var(--radius-md);">
  - Gallery: vary seed: seed/${imageKeywords}1/800/500, seed/${imageKeywords}2/800/500, etc.
  - Hero/banner: seed/${imageKeywords}/1200/600
  - picsum.photos ALWAYS loads — never use source.unsplash.com (deprecated).`
      : "";

    // ========== APP-TYPE-SPECIFIC ARCHITECTURE ==========
    let architectureSection = "";
    let functionalitySection = "";

    if (isDashboard) {
      architectureSection = `ARCHITECTURE: DOMAIN-SPECIFIC FUNCTIONAL DASHBOARD
This is a REAL working dashboard for "${interpret.productName}" — not a generic template. Every label, stat card, table column, and chart MUST be specific to this product's domain.

READ THIS CAREFULLY: The user described "${prompt}". You must build a dashboard about EXACTLY THAT — with domain-specific terminology, data, and panels.

EXAMPLES OF DOMAIN-SPECIFIC DASHBOARDS:
- "F1 dashboard" → Stat cards: "Total Drivers", "Laps Completed", "Fastest Lap", "DNFs". Table columns: Position, Driver, Team, Gap to Leader, Pit Stops, Status. Data: real F1 driver names (Verstappen, Hamilton, Leclerc, Norris, etc.), real team names (Red Bull, Mercedes, Ferrari, McLaren, etc.)
- "Sales dashboard" → Stat cards: "Total Revenue", "Orders Today", "Avg Order Value", "Conversion Rate". Table: Order ID, Customer, Product, Amount, Status, Date
- "HR dashboard" → Stat cards: "Employees", "Open Positions", "Avg Tenure", "Turnover Rate". Table: Name, Department, Role, Start Date, Status
- "Fitness tracker" → Stat cards: "Workouts This Week", "Calories Burned", "Streak", "Personal Bests". Table: Date, Exercise, Duration, Reps, Weight
- "Crypto dashboard" → Stat cards: "Portfolio Value", "24h Change", "Top Gainer", "Total Assets". Table: Coin, Price, 24h Change, Holdings, Value

FOLLOW THIS PATTERN: Read the description → identify the domain → use domain-specific labels, columns, and data for EVERYTHING. NEVER use generic labels like "Total Count", "Active Count", "Revenue/Value" unless the domain is actually about revenue.

LAYOUT:
- Fixed left sidebar (240px wide, full height, dark surface color) with icon + label nav items
- Sidebar nav labels MUST be domain-specific (e.g., for F1: "Race Overview", "Driver Standings", "Lap Analysis", "Settings" — NOT generic "Dashboard", "Data Table", "Analytics")
- Top header bar (64px) with search input and product name
- Main content area changes based on active sidebar item
- Sidebar items highlight when active

DATA & STATE (CRITICAL):
- window.appState = { currentView: 'dashboard', data: {...}, filters: {...} }
- Seed with 15-25 realistic records using REAL domain-specific data (real names, real terminology, realistic numbers for this domain)
- ALL data stored in appState and rendered dynamically — no hardcoded HTML
- localStorage persistence: save on every change, load on startup

REQUIRED PANELS (ALL must use domain-specific labels and data):
1. OVERVIEW PANEL: 4 stat cards with domain-specific metrics (large number + label + trend indicator) + CSS bar chart showing relevant data + recent activity list
2. DATA TABLE PANEL: Full interactive table with:
   - Domain-specific column headers (NOT generic "Name", "Email", "Status")
   - Sortable columns (click header toggles asc/desc with arrow indicator)
   - Search/filter that filters rows in real-time
   - Status badges with domain-appropriate colors and labels
   - Add/Edit/Delete functionality with modal forms
   - Pagination: 10 rows per page with Previous/Next
3. ANALYTICS PANEL: Domain-specific charts and breakdowns (category breakdown with CSS bars, trend data, aggregated stats)
4. SETTINGS PANEL: Working preferences form that saves to localStorage

CSS CHARTS (no external libraries):
- Bar chart: CSS flexbox with div bars, height proportional to value, hover tooltip with exact value
- Stat cards: Large number + descriptive domain label + percentage trend (green ▲ / red ▼)`;

      functionalitySection = `FUNCTIONALITY REQUIREMENTS (CRITICAL — every item must actually work):
- Clicking sidebar items MUST switch the main content panel (use a renderView() function that rebuilds DOM for active panel)
- Table sorting MUST actually reorder the data array and re-render — clicking column headers toggles sort direction
- Search/filter MUST filter the data array in real-time and re-render the table
- Add/Edit forms MUST validate inputs and show inline errors — modal forms with domain-specific fields
- Delete MUST remove the record from appState.data, save to localStorage, and re-render
- Pagination MUST work — calculate correct page slice, disable Previous on page 1, Next on last page
- Charts MUST render from actual data values — not hardcoded CSS heights. Recalculate bar heights from data.
- Stat cards MUST show computed values from the actual data array (e.g., appState.data.length for count, Math.max(...) for records)
- Settings toggles MUST persist to localStorage and take effect immediately
- IMPORTANT: On initial load, call renderView() immediately so the default panel shows content — never show an empty page`;

    } else if (isWebApp) {
      architectureSection = `ARCHITECTURE: FULLY FUNCTIONAL WEB APPLICATION
This MUST be a REAL, FULLY WORKING application — not a mockup, not a template, not a static page.
The user described: "${prompt}"
Product name: "${interpret.productName}"
You must build EXACTLY that product with ALL its features working. Read the description above — every word matters.

LAYOUT:
- Top navigation bar (64px, fixed) with app name/logo, main nav items, and user actions
- Multi-view SPA where each nav item loads a completely different functional view
- Structure:
  <nav class="navbar">...</nav>
  <div class="app-container">
    <section id="view-[name]" class="view active">Functional content</section>
    ... one <section class="view"> per feature ...
  </div>
- CSS: .view { display:none; min-height:calc(100vh - 70px); padding: 2rem; } .view.active { display:block; }
- JS router: function navigate(id){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById(id)?.classList.add('active');window.scrollTo(0,0);updateNav(id);}

CRITICAL RULE — BUILD THE ACTUAL PRODUCT (THIS IS THE MOST IMPORTANT INSTRUCTION):
Read the DESCRIPTION and FEATURES carefully. Build the SPECIFIC application described — not a template, not a generic app.
- Timer/Clock/Stopwatch → setInterval/clearInterval, countdown display (MM:SS), start/pause/reset/lap buttons, alarm sound (new Audio with oscillator), session tracking
- Calculator → math operations (+−×÷%), memory, display, responsive button grid, keyboard support
- Task Manager/Todo → add/edit/delete tasks, status toggle (done/pending), categories, drag reorder, due dates, priority levels, filter/search
- Text/Note Editor → textarea with word/char count, auto-save to localStorage, multiple notes list, search, delete, export
- Game → canvas or DOM game loop with requestAnimationFrame, scoring, lives, levels, controls (keyboard/touch), win/lose/restart
- Tracker (fitness/habit/budget/mood) → data entry form, history list/chart (CSS bars), daily/weekly view, streaks, totals, averages
- Converter (unit/currency/temperature) → real formulas, bidirectional conversion, multiple unit types, swap button, copy result
- E-commerce/Store → product grid with prices, working cart (add/remove/quantity), cart total calculation, checkout form with validation, order confirmation
- Social/Chat → message list, compose input, send button that adds to conversation, user profiles, like/react buttons, real-time-feeling updates
- Booking/Scheduling → date/time picker, available slots, booking form, confirmation, booking list management
- Recipe/Cooking → recipe list, ingredient checkboxes, serving size adjuster that recalculates quantities, timer, favorites
- Finance/Budget → transaction entry, income/expense tracking, category breakdown, running balance, charts
- Quiz/Survey → question navigation, answer selection, score calculation, results page, timer optional
- Music/Audio → playlist, play/pause controls, progress bar, volume slider, track info display
- Calendar/Planner → month/week/day views, add/edit/delete events, date navigation, event details modal
- Portfolio/Gallery → grid layout, lightbox modal, category filter, project detail view
- Weather/Dashboard → data cards, charts, location selector, unit toggle (°C/°F), forecast display
- Whatever the product is → build its CORE FUNCTIONALITY with real JavaScript logic that actually does what the product promises

STATE MANAGEMENT (CRITICAL):
- Create window.appState with ALL state the app needs (timers, counters, data, settings, history)
- Use localStorage to persist state: save on every change, load on startup
- ALL UI must render FROM state using render functions — never hardcode HTML content
- State changes trigger re-renders of affected UI components

VIEWS TO BUILD (3-4 views minimum):
1. MAIN VIEW: The PRIMARY interface of this product — this is where the core functionality lives. It should take up 70%+ of the user's time. Build it with full working JavaScript.
2. HISTORY/DATA VIEW: Show past usage, records, logs, or data related to the main feature. Render dynamically from state.
3. SETTINGS VIEW: Working preferences/configuration form that persists to localStorage and affects app behavior.
4. Optional: Any additional view that makes sense for this specific product.

INTERACTIVE COMPONENTS:
- All buttons must have click handlers that DO something (never decorative)
- Toast notifications: slide-in for success/error (auto-dismiss 3s)
- Modal dialogs if needed: backdrop + close on X + close on backdrop click
- Smooth CSS transitions/animations for state changes
- Loading/disabled states on buttons during operations`;

      functionalitySection = `FUNCTIONALITY REQUIREMENTS (CRITICAL — the app MUST work):
THE #1 RULE: Every button, input, and interactive element must have a working JavaScript event handler.
- NO placeholder buttons that do nothing
- NO "coming soon" features
- NO buttons without click handlers
- NO forms without submit handlers
- NO inputs without change handlers
- If a button says "Start" it must START something
- If a button says "Save" it must SAVE something to localStorage
- If a button says "Delete" it must DELETE something and update the UI
- If there's a timer display, it must COUNT with setInterval
- If there's a form, it must VALIDATE and PROCESS the input
- Every feature mentioned in DESCRIPTION and FEATURES must be FULLY IMPLEMENTED with working JS code
- All state persists to localStorage and loads on page refresh
- Render functions update the DOM dynamically — never rely on static HTML`;

    } else {
      architectureSection = `ARCHITECTURE: MULTI-PAGE INTERACTIVE WEBSITE
This is a polished, professional website — but EVERY interactive element MUST actually work with real JavaScript.

LAYOUT: MULTI-PAGE SPA — each nav item is a separate "page" (full viewport). Structure:
  <nav class="navbar">...</nav>
  <div class="pages-container">
    <section id="page-home" class="page active">Home content</section>
    <section id="page-[name]" class="page">Page content</section>
    ... one <section class="page"> per nav item ...
  </div>
CSS: .page { display:none; min-height:calc(100vh - 70px); padding: 3rem 2rem; } .page.active { display:block; }
JS router (REQUIRED): function navigate(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById(id).classList.add('active');window.scrollTo(0,0);}
Each nav link calls navigate('page-name') — do NOT use href="#..." for page switching

CRITICAL RULE — BUILD WHAT THE USER DESCRIBED:
Read the DESCRIPTION carefully. If the product involves ANY interactive features, those features MUST work:
- Restaurant site → interactive menu with categories, dietary filters, item detail modals, order/reservation form
- Nonprofit/Charity → working donation form with amount selection, recurring toggle, payment info fields, confirmation
- Portfolio → project gallery with category filter, lightbox modal, contact form
- Event site → event schedule with filtering, RSVP form, countdown timer to event date
- Real estate → property listings with search/filter, detail modals, inquiry form
- Gym/Fitness → class schedule browser, membership signup form, trainer profiles
- School/Education → course catalog with filters, enrollment form, FAQ accordions
Whatever the site is for, the interactive elements must ACTUALLY FUNCTION with JavaScript.

REQUIRED PAGES (minimum 4-5 pages, ALL must have substantial content):
1. HOME: Hero section with headline, subheadline, and CTA button + feature highlights
2. ABOUT/STORY: Background, mission, team members with names and roles
3. PRODUCTS/SERVICES/OFFERINGS: Grid of items — each expandable or with detail modals, filterable if 6+ items
4. CONTACT/SIGN UP: Complete working form (name, email, message/subject) with JS validation and success message
5. At least ONE more page relevant to this product (e.g., Blog, Pricing with toggle, Portfolio, FAQ)

INTERACTIVE ELEMENTS (ALL must have working JavaScript):
- FAQ accordions that expand/collapse on click with smooth CSS transition
- Testimonial carousel/slider with dots/arrows and auto-advance (every 5s)
- Animated counters for statistics (count up on page visibility)
- Tab sections that switch content on click
- Working forms with field validation, error messages, and success state
- Pricing toggle (monthly/yearly) that actually recalculates and updates prices
- Gallery/portfolio items that open in a lightbox modal
- Mobile hamburger menu that opens/closes on click`;

      functionalitySection = `FUNCTIONALITY REQUIREMENTS (CRITICAL — ZERO dead/decorative elements):
- EVERY button MUST have a working onclick handler — a button that does nothing is a BUG
- EVERY form MUST validate on submit: check required fields, show red borders + error text for invalid, show success message for valid
- EVERY interactive element MUST respond: accordions toggle, tabs switch, sliders slide, modals open/close
- FAQ: click toggles open/close, only one open at a time, smooth max-height transition
- Testimonials: auto-advance every 5s, dots/arrows work, smooth CSS opacity/transform transition
- Pricing toggle: clicking monthly/yearly MUST update ALL price values dynamically via JavaScript
- Contact form: validate all fields → show success message → clear form → prevent default
- Gallery items: click opens lightbox modal with image + close button + backdrop click to close
- Hamburger menu: click toggles mobile nav dropdown, click outside closes
- CTA buttons: navigate to the relevant page (contact/signup/pricing) — never dead links
- All hover states visible: opacity, color shift, scale, or border change on interactive elements
- Tab content: clicking tab label switches visible content panel, active tab highlighted`;
    }

    const user = `Generate a complete, fully functional ${isDashboard ? "dashboard application" : isWebApp ? "web application" : "website"} as a self-contained HTML file.

BRAND: ${brandName}
PRODUCT: ${interpret.productName}
TYPE: ${interpret.productType} / ${interpret.pageType}
DESCRIPTION: ${prompt}
FEATURES: ${interpret.features.join(", ")}
AUDIENCE: ${interpret.targetAudience}
KEY BENEFIT: ${interpret.keyBenefit}
STYLE: ${interpret.style} — ${interpret.personality}
${nlSection}

${architectureSection}

${functionalitySection}

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

CORE REQUIREMENTS:

1. STRUCTURE: Complete single HTML file — all CSS in <style>, all JS in <script>. Load fonts: <link href="${googleFontsUrl}" rel="stylesheet">

2. DESIGN TOKENS: Add to :root { ${colorVars} }

3. LOGO IN NAV: ${logoUrl
      ? `Place EXACTLY this img tag on the left of the navbar: <img src="${logoUrl}" alt="${brandName}" style="height:36px;width:auto;object-fit:contain;display:block;"> — never replace with text`
      : `Show "${brandName}" as bold text on the left of the navbar`}

4. NAVIGATION:
   - Nav labels specific to this product — NEVER generic "Features", "Solutions", "Resources"
   - Active nav item highlighted with border-bottom or background color change
   - ${isDashboard ? "Sidebar items switch main panel content" : "Each nav button calls navigate('view-id') or navigate('page-id')"}

5. TYPOGRAPHY SCALE (STRICT):
   - h1: max 2.5rem, font-weight: 700   |   h2: max 1.75rem, font-weight: 600
   - h3: max 1.25rem, font-weight: 600   |   p: 1rem, line-height: 1.7
   - Small text: 0.875rem. NEVER use font sizes above 2.5rem.

6. CONTRAST & VISIBILITY (CRITICAL — broken contrast = broken app):
   - Add these CSS variables: :root { --color-text: #f1f5f9; --color-text-muted: #94a3b8; }
   - body { background: var(--color-bg); color: var(--color-text); }
   - ALL text everywhere must be light (#f1f5f9 or #e2e8f0) — NEVER use #000, #333, or dark gray text
   - Cards/surfaces: var(--color-surface) with ALL text inside as var(--color-text) — NEVER dark text on dark bg
   - Table headers: light text. Table cells: light text. Stat card numbers: light text. Chart labels: light text.
   - Muted/secondary text: #94a3b8 (still light enough to read on dark backgrounds)
   - Buttons: primary bg with WHITE or very light text for contrast
   - Inputs/selects: dark background with light text, visible border (1px solid rgba(255,255,255,0.1))
   - Sidebar text: light colored, active item has visible highlight
   - NEVER rely on default browser colors — explicitly set color on every text element

7. LAYOUT:
   - ${isDashboard ? "Sidebar: 240px fixed left. Main: flex-1. Header: 64px fixed top." : "body { padding-top: 70px; margin: 0; } Navbar: 64px fixed, z-index: 100"}
   - Max content width: ${isDashboard ? "100% (fluid)" : "1100px"}, proper spacing and padding
   - Card gap: 1.5rem, internal padding: 1rem minimum

8. NO EXTERNAL NAVIGATION (CRITICAL):
   - NEVER use window.location.href, location.assign(), window.open(), or any external URL in JS
   - ALL buttons call navigate() or toggle in-page elements — no exceptions
   - Forms use e.preventDefault() and handle submission in-page with success feedback

9. IMAGES: ${hasImages
      ? `Use picsum.photos: src="https://picsum.photos/seed/${imageKeywords}/800/500". Vary seeds for multiple images. NEVER use source.unsplash.com.`
      : `Use CSS gradient backgrounds for visual areas. No <img> tags unless specifically needed.`}

10. REALISTIC CONTENT: Use specific real-sounding names, dates, data. NO lorem ipsum, NO placeholder text.

11. RESPONSIVE: CSS grid/flex, works on mobile. ${isDashboard ? "Sidebar collapses to hamburger on mobile." : ""}

12. NO EXTERNAL LIBRARIES: Vanilla HTML, CSS, JS only. No CDN imports.

${integrations && integrations.length > 0 ? `13. INTEGRATIONS:
${integrations.map(ig => `   - ${ig.name}: Key = "${ig.value}"
     Include <script> initialization in <head>.`).join("\n")}` : ""}

UNIVERSAL FUNCTIONALITY MANDATE (applies to ALL app types — ZERO EXCEPTIONS):
✓ EVERY button has a working onclick handler — a button that does nothing is a BROKEN app
✓ EVERY form has a submit handler with validation — forms that don't respond are BROKEN
✓ EVERY interactive element responds to user input — dead UI elements are NEVER acceptable
✓ The CORE FEATURE described in the prompt works completely with real JS logic
✓ Navigation works: every nav item switches content, active state highlighted
✓ Visual feedback on ALL interactions: hover states, click feedback, success/error messages
✓ CSS is polished: transitions on state changes, hover effects on clickable elements
✓ The output feels like REAL SOFTWARE that someone would actually use — not a wireframe or mockup
${isDashboard || isWebApp ? `✓ State stored in window.appState and rendered dynamically — NOT hardcoded HTML
✓ localStorage persistence: save on every state change, load on startup/refresh
✓ Toast notifications for user actions (success/error) that auto-dismiss` : `✓ Forms show validation errors inline and success message after valid submit
✓ Accordions, sliders, tabs, modals — all interactive components work with JS
✓ Mobile menu toggle works`}

INITIALIZATION (CRITICAL — prevents blank/empty pages):
- At the END of your <script>, add: document.addEventListener('DOMContentLoaded', function() { init(); });
- ${isDashboard ? "function init() { renderView('dashboard'); } — this calls renderView which populates stat cards, tables, charts from window.appState" : isWebApp ? "function init() { navigate('view-home'); } — or whatever your first view ID is. This must show the main functional view with all content populated" : "function init() { navigate('page-home'); } — this shows the home page with all content rendered"}
- The page MUST show fully populated content immediately on load — NEVER an empty/blank state
- ALL dynamic content (tables, stats, charts, lists) must render from data in window.appState on first load

Write at minimum 800 lines of functional code. Prioritize working JavaScript over static HTML content. Start with <!DOCTYPE html> immediately.`;

    const maxTokens = (isDashboard || isWebApp) ? 12000 : 10000;
    const text = await chat(system, user, maxTokens);
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
