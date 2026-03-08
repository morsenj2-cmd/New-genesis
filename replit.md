# Morse — replit.md

## Overview

Morse is a web application for creating and managing generative AI projects with **deterministic seeds** and reproducible genome structures. Users can sign up, create named projects with text prompts, and view their project details including a seed hash derived from project data.

Key features:
- User authentication via Clerk (dashboard public, only project creation gated)
- Project creation with name + prompt inputs
- Brand setup: logo upload (stored on Cloudinary), font selection (preset or custom upload stored on Cloudinary), theme color (custom picker + presets)
- Deterministic seed generation (SHA-256 hash) per project
- Deterministic Design Genome Generator: derives colors, typography, spacing, radius, icon style, and motion from the seed
- Dashboard for listing user projects (public, tagline shown for guests)
- Project editor: two-panel layout with live GenomePreview + two separate regeneration controls: "Regenerate Style" (calls backend with randomUUID entropy → truly unique per click) and "Regenerate Layout" (uses layout seed + iteration counter)
- Layout Lock: lock/unlock toggle per project — locked layout cannot be regenerated or overwritten by NL commands
- Style vs Layout Separation: `styleSeed` column tracks evolving style seed; `seed` column tracks immutable layout seed; each regeneration path is fully independent
- Style Regeneration History: last 5 genome signatures (hue-bucket + font) stored in `previousGenomesJson`; regeneration avoids repeating recent designs (up to 5 attempts)
- Design Variation Engine: genome now generates `variation` object with `colorMode` (vibrant/muted/pastel/deep/neon), `spacingMode` (tight/balanced/spacious/airy), `surfaceStyle`, `buttonStyle` (rounded/pill/sharp/soft), `cardStyle`; 30 font pairs total
- NL Design Editor — unified semantic interpreter (`interpretSemanticMulti`):
  - Multi-intent: compound commands ("use blue and make it minimal", "round corners and increase spacing")
  - Brand rename: "call it X", "change brand name to X" (with NON_NAME_TARGETS guard)
  - Logo color: "make the logo white", "change logo color to blue"
  - Primary color: "use blue", "change the theme color to teal"
  - Style presets: "make it minimal", "make it elegant", "bold style" (9 presets)
  - Fonts: "use Inter font", "use serif", "use monospace" (30+ font name mappings)
  - Heading weight: "make headings bold", "light headings"
  - Letter spacing: "increase letter spacing", "tighter letters"
  - Text size: "larger text", "smaller text"
  - Spacing: "reduce spacing", "increase spacing", "airy", "compact"
  - Border radius: "rounded corners", "sharp corners", "pill buttons"
  - Background: "light background", "dark background"
  - Gradients: "remove gradients", "add gradients"
  - Animations: "no animation", "enable animation"
  - Icons: "standard icons", "plain icons"
  - Accessibility: "more readable", "accessible"
  - Content: "change headline to X", "set CTA to Y"
  - Smart fallback: context-aware suggestions when nothing matches
- Branding tokens: `genome.branding.logoColor/logoFont/logoWeight` — GenomeNavbar applies these to logo text and icon color
- Design Source Priority: user's uploaded logo, selected font, selected primary color always override generator output via `mergeDesignSources()` in `shared/designMerger.ts`
- Content Generator: category-specific headlines, subheadlines, CTA labels, features, stats, testimonials, CTA copy, and footer taglines from `shared/contentGenerator.ts` — 14 product types each with realistic copy, each with a distinct `brandName` (Vault, Relay, Lens, Shopbase, Sprint, Pipeline, Pulse, Flowbase, Devkit, Streamly, Clair, Medi, Coursify, Tempo)
- Brand names shown in preview instead of project names: Navbar, hero badge, footer — all use `content.brandName` from `getProductContent()`; overridable via `contentOverrides.brandName`
- Canvas Editor: rebuilt with 3-tab mode toggle (Auto | Canvas | Elements):
  - **Auto Design mode**: AI-managed layout, read-only GenomePreview
  - **Canvas mode**: drag-and-drop section reordering (HTML5 drag API), section selection with visual highlight overlay (colored border + label badge), delete section, add section dropdown (Feature Grid, Card List, Stats Bar, Testimonials, CTA), column count selector, inline content editing for hero/featureGrid/cardList/CTA; clicking sections in preview selects them
  - **Elements mode** (new Figma-like editor, `client/src/components/ElementCanvas.tsx`):
    - Renders each section as a relative container with absolutely positioned element nodes
    - Virtual 1200px canvas scaled to fit container (zoom slider 30%-120%)
    - Element types: badge, headline, subheadline, paragraph, button_primary, button_secondary, section_title, card_icon, card_title, card_description, stat_value, stat_label, testimonial_text, testimonial_author
    - Click to select — bounding box outline appears + 8 resize handles (corners + edges)
    - Pointer-based drag to reposition (8px grid snap), drag via pointer capture on element
    - 8-handle resize system: each handle direction (nw/n/ne/e/se/s/sw/w) adjusts x/y/width/height
    - Double-click text element to edit inline (textarea overlay replaces element)
    - Sidebar shows: element type label, X/Y/W/H number inputs (snap 8px), content textarea, Forward/Back layer order buttons, Lock toggle, Delete button
    - Locked elements show a lock icon badge; cannot be moved/resized
    - Section backgrounds match genome tokens: hero=radial gradient, featureGrid/cardList=surface, stats=background with borders, cta=linear gradient
    - Decomposition functions in `shared/elementCanvas.ts`: decomposeHero, decomposeFeatureGrid, decomposeCardList, decomposeStats, decomposeCta, decomposeTestimonial — all generate initial element positions on a 1200px reference canvas
    - ContentOverrides type extended with `ctaHeadline`, `ctaBody` optional fields
- Multi-page navigation: GenomePreview manages `activePage` state, navbar links navigate between home/features/pricing/about/blog/contact; full page components for each: GenomeFeaturesPage, GenomePricingPage (3-tier with FAQs), GenomeAboutPage (mission+stats+testimonials), GenomeBlogPage, GenomeContactPage; footer links also navigate
- Context-driven layout generation: `shared/layoutEngine.ts` has `SITE_TYPE_POOLS` per page type (landing_page, marketing_site, web_app, dashboard, blog, portfolio, social_platform, ecommerce_store); `generateLayout` uses the correct section pool when `pageType` is provided in design context; `server/routes.ts` passes `intent.pageType` to `generateLayout`
- **Generation Refactor (v2)**:
  - **Strict page type enforcement**: `landing_page` prompts always use `generateLayout` (never `generateContextualLayout`) — dashboard/analytics components are fully blocked from landing pages
  - **Landing page pool**: `featureGrid, cardList, testimonial, cta` only — no stats, no dashboard-only components
  - **Max sections**: landing_page=6, dashboard=5, web_app=6, enforced by `MAX_MIDDLE_SECTIONS` and `applyLayoutConstraints()`
  - **Max columns**: 3 for landing_page/marketing_site (was up to 4)
  - **Max card count**: 4 for landing pages (was up to 5 random)
  - **`shared/layoutConstraints.ts`**: Page layout rules registry, `applyLayoutConstraints()`, `simplifyIfNeeded()` (complexity score ≤ 60), `scoreComplexity()`
  - **`shared/layoutSignature.ts`**: 6-dimension genome signature (hueBucket | font | colorMode | buttonStyle | spacingMode | surfaceStyle); `isGenomeTooSimilar()` (4/6 dimensions = too similar), `hasSufficientMutation()` (needs ≥2 dimensions changed), `legacySigToNew()` for backward compat
  - **Style regeneration**: Up to 8 attempts (was 5); checks 6-dimension similarity against last 5 designs AND requires ≥2 dimensions to change from current design; history stored in 6-part `|`-delimited format (legacy 2-part `hue-font` format auto-normalized)
  - **Page type detection fix**: `detectPageType()` now finds the longest matching signal (most specific wins) — "analytics dashboard" now correctly detects `dashboard` even when "saas" is also present
- Analytics/dashboard component filtering: `shared/productContextEngine.ts` strips `metric_cards`, `analytics_chart`, `data_table`, `filters`, `storage_usage_bar` component types from non-dashboard product types (only shown for analytics_dashboard, crm, project_management, fintech)
- pageType detection in intent interpreter: `shared/intentInterpreter.ts` detects "landing_page", "web_app", "dashboard", "blog", "ecommerce_store", "social_platform", "portfolio" from free-form prompts
- Unified NL pipeline: `shared/semanticInterpreter.ts` (Jaro-Winkler fuzzy matching, multi-intent detection via `interpretSemanticMulti()`, compound command splitting on "and"/","), `shared/semanticDictionary.ts` (synonym maps), `shared/patchGenerator.ts` (`generateMultiPatches()` — iterates all intents, generates combined genomePatch + settingsPatch + contentPatch)
- NL brand rename fully wired: `/apply-nl` runs unified interpreter → if `change_name` detected, saves `brandName` to `settingsJson`, returns `contentPatch` in response → client updates `contentOverrides.brandName` immediately
- NL pipeline architecture: single-pass semantic interpreter replaces the legacy dual-pass system; `interpretSemanticMulti()` detects all intents from a single command; `generateMultiPatches()` combines patches; route applies once; legacy `parseNLCommand` in `nlParser.ts` retained but no longer called from routes (only `applyPatchesToGenome` is used)
- No "AI-Generated Design" labels — preview looks like a real product website
- Product Context Engine: 14 product types (cloud_storage, chat_app, analytics_dashboard, ecommerce, project_management, crm, social_media, saas_generic, developer_tool, video_platform, fintech, healthcare, education, calendar_scheduling) each with specific UI components
- **Universal Context Engine**: `shared/universalContext.ts` — NLP-lite industry detection with confidence scoring, noun/verb/adjective extraction, core activity discovery, dynamic domain vocabulary building, page type detection; no hard-coded industry requirement. Works for ANY industry including novel ones (pet grooming, underwater archaeology, artisan cheese, drone racing)
- **Dynamic Domain Vocabulary**: `shared/domainVocabulary.ts` — `extractDynamicVocabulary()` extracts vocabulary from prompt text; when industry has no direct match in `DOMAIN_VOCABULARY`, starts with empty sets so prompt-extracted terms dominate
- **Context Correction**: `shared/contextOverride.ts` — handles "this is an AI company not a construction company" patterns; swaps industry, updates vocabulary, sets confidence to 1.0
- **Context Locking**: `shared/contextLock.ts` — locks industry/productType/activities/pageType during style regeneration so visual changes don't alter semantic context
- **Layout Uniqueness**: `shared/layoutSignature.ts` (SHA256 genome signatures, similarity detection) + `shared/layoutMutation.ts` (30%+ mutation when collisions occur)
- **Metric Validation**: `shared/metricValidator.ts` — domain-aware metric rejection; ensures dashboard metrics match project context
- **Context Validation**: `shared/contextValidator.ts` — pre-render content validation against dynamic vocabulary graph
- **Semantic Content Generation Pipeline**: `shared/domainVocabulary.ts` (18-industry vocabulary clusters — core terms, actions, objects, qualities, roles), `shared/genericPhraseFilter.ts` (banned marketing clichés — `containsBannedPhrase()`, `isGenericHeadline()`), `shared/relevanceScoring.ts` (domain-vocabulary + prompt-keyword scoring with `scoreRelevance()`, `pickMostRelevant()`, `extractPromptKeywords()`); `generateContextContent` in `contextGraph.ts` uses semantic headline builder (prompt service extraction → "[Capability] for [audience]" pattern), relevance-ranked content selection, generic phrase filtering; `SemanticContext` stored per project in `settingsJson.semanticContext` and preserved during style regeneration
- **Universal Content Generation**: when no matching INDUSTRY_LIBRARY template exists OR industry confidence is ≤ 0.3 (semantic fallback), `generateUniversalContent()` in `contextGraph.ts` builds headlines/features/stats from extracted vocabulary. Features use domain terms with management/services suffixes; headlines use best multi-word activity + brand name
- Context Library: `shared/contextLibrary.json` defines product types, keywords, and component sets — easily extensible
- Intent Interpreter: keyword-based parser extracts productType, industry, style, features, and colorHint from free-form prompts
- Export project as a downloadable zip — complete Vite + React project with genome baked in, runs with `npm install && npm run dev`; includes universal navigation system (`lib/navigation.js`) with dynamic nav links derived from layout sections, smooth scroll to section IDs, global link interceptor, auto section registration, and hash fallback; no hardcoded routes
- Delete project with confirmation dialog
- Dark theme (pure black background)
- Hero section shows category-specific copy (e.g. "Secure cloud storage built for modern teams" for cloud_storage, "Your money. Smarter." for fintech)

## User Preferences

- App name: **Morse** (not "Genome Studio")
- Logo: `@assets/--._1772868829725.png` — black PNG, use `dark:invert-0 invert` for light/dark mode
- Font: Arimo (set via inline `<style>` tag in index.html overriding `--font-sans`)
- Dark theme: `class="dark"` on `<html>` tag in index.html with pure black backgrounds via CSS variable overrides
- Auth: Clerk dev keys (pk_test_/sk_test_) — production keys domain-locked to morse.co.in
- No fake stats, no pricing claims anywhere in the UI
- Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack TypeScript Monorepo

- `client/` — React frontend (Vite)
- `server/` — Express backend (Node.js)
- `shared/` — Shared types and DB schema

### Frontend Architecture

- **Framework:** React 18 with TypeScript, bundled by Vite
- **Routing:** `wouter` (lightweight client-side routing)
- **State / Data fetching:** TanStack Query (React Query v5)
- **Forms:** React Hook Form + Zod validation
- **UI Components:** shadcn/ui (New York style) + Tailwind CSS
- **Authentication UI:** Clerk React (`@clerk/clerk-react`)

The app bootstraps by fetching `/api/config` to get the Clerk publishable key before rendering.

Protected routes check `useAuth()` and redirect to `/sign-in`. Public routes redirect authenticated users to `/dashboard`. Root `/` renders sign-in directly (no redirect loop).

### Backend Architecture

- **Framework:** Express.js (ESM, TypeScript via `tsx`)
- **Authentication:** `@clerk/express` — `clerkMiddleware()` globally; `requireAuth` helper
- **Config endpoint:** `GET /api/config` registered BEFORE `clerkMiddleware()` to avoid auth interception
- **Storage layer:** `DatabaseStorage` class wraps all DB operations

### Database

- **Database:** PostgreSQL (Neon) with SSL (`rejectUnauthorized: false`)
- **ORM:** Drizzle ORM (`drizzle-orm/node-postgres`)
- **Schema:** `shared/schema.ts` — single source of truth
- **Migrations:** `drizzle-kit push` (schema push)

**Tables:**
| Table | Key columns |
|---|---|
| `users` | `id` (Clerk user ID, PK), `email`, `created_at` |
| `projects` | `id` (UUID, PK), `user_id` (FK), `name`, `prompt`, `seed`, `font`, `font_url`, `theme_color`, `logo_url`, `genome_json`, `layout_json`, `settings_json`, `product_type`, `layout_locked` (bool), `created_at` |
| `prompt_logs` | `id` (UUID, PK), `user_id` (FK), `project_id` (FK), `prompt_text`, `sanitized_prompt`, `intent_type`, `confidence` (real), `intent_json`, `patches_json`, `project_context_json`, `feedback_signal`, `corrected_intent_json`, `pattern_id`, `used_for_training` (bool), `created_at` |

- `seed`: SHA-256 hash generated server-side
- `logo_url`: Cloudinary HTTPS URL (uploaded from base64; resized to 256×256 server-side)
- `font_url`: Cloudinary HTTPS URL of uploaded custom font file (.ttf/.otf/.woff/.woff2)
- `font`: font name (preset name or custom font filename without extension)

### Genome UI Components

`client/src/components/genome-ui/index.tsx` — 7 fully genome-aware UI components that consume design tokens to render a live website preview on the project detail page.

**Components** (all take `tokens: GenomeTokens` = `{ genome, projectName, projectPrompt }` + `section: LayoutSection`):
- `GenomeNavbar` — brand logo (compass icon), nav links, CTA button styled with genome colors/fonts/radius
- `GenomeHero` — headline split at midpoint with primary color accent, subtitle from deterministic tagline (not raw prompt), image placeholder when `section.imagePlacement !== "none"`, alignment from section data
- `GenomeFeatureGrid` — feature cards in `section.columns` columns, icon per feature, horizontal/vertical orientation from section
- `GenomeCardList` — `section.cardCount` cards in `section.columns` grid, each with icon + title + description
- `GenomeStats` — `section.columns` stat blocks with large genome-primary-colored numbers
- `GenomeTestimonial` — `section.cardCount` quote cards in a grid
- `GenomeCTA` — gradient background (primary → accent), full-width call-to-action
- `GenomeFooter` — brand, 3 link columns, social icons from icon generator

**GenomePreview** composite — renders layout sections in order using the correct component per section type, wrapped in a 640px scrollable container on the project detail page. Only shown when both `genome` and `layout` are available.

All typography uses `@import` from Google Fonts loaded dynamically via `useEffect`. All colors, spacing, radius, and icon style come directly from genome tokens — no hardcoded values.

### Icon Generator

`shared/iconGenerator.ts` — procedural SVG icon generator. All 25 icons across 5 semantic groups are rendered using parameterized SVG paths derived from the project's genome `iconStyle`.

- **Groups**: `communication`, `navigation`, `system`, `commerce`, `media` (5 icons each)
- **Icon names**: chat, mail, phone, notification, broadcast / search, menu, home, arrow, compass / settings, filter, grid, list, close / cart, tag, wallet, receipt, package / play, image, video, music, microphone
- **Parameters**: `strokeWidth`, `cornerRoundness` (→ SVG rx), `geometryBias` (organic curves vs geometric angles), `variant` (filled vs outline)
- **API**: `renderIconSvgContent(name, style)` → inner SVG string; `buildSvgString(name, style, size)` → full `<svg>` string
- Rendered in the browser via `dangerouslySetInnerHTML` on a React `<svg>` wrapper (safe — no user input)
- Project detail page shows icon style preview (5 sample icons) and a full **Icon Family** panel grouped by category

### Cloudinary Integration

Logos and custom fonts are uploaded to Cloudinary on project creation. The server receives base64 data URLs from the client, uploads them to Cloudinary, and stores the resulting HTTPS URL in the database.

- `server/cloudinary.ts` — Cloudinary v2 SDK, `uploadBase64Image`, `uploadBase64Font`, `deleteFile`
- Logos: stored at `morse/logos/{userId}/logo_{seedPrefix}` as images (auto-resized to 256×256)
- Fonts: stored at `morse/fonts/{userId}/font_{seedPrefix}` as raw files
- Required env vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Body size limit on Express is 10mb to accommodate base64 upload payloads

### Important Files

| File | Purpose |
|---|---|
| `shared/schema.ts` | DB schema, Zod schemas, TypeScript types |
| `server/routes.ts` | All API endpoints with Clerk auth |
| `server/storage.ts` | Database CRUD operations |
| `server/db.ts` | Drizzle + Neon PostgreSQL connection |
| `client/src/App.tsx` | ClerkProvider, routing, protected/public route wrappers |
| `client/src/pages/new-project.tsx` | 2-step project creation wizard |
| `client/src/pages/dashboard.tsx` | Project listing page |
| `client/src/pages/project.tsx` | Project detail view |
| `client/src/pages/sign-in.tsx` | Sign-in page |
| `client/src/pages/sign-up.tsx` | Sign-up page |
| `client/src/components/app-sidebar.tsx` | Morse-branded sidebar |
| `client/src/components/NLDesigner.tsx` | NL design editor component (textarea + apply-nl API call) |
| `shared/nlParser.ts` | Keyword→genome patch parser + `applyPatchesToGenome` |
| `shared/saasConstraints.ts` | SaaS constraints, industry detection, settings parsing |
| `client/index.html` | Arimo font, dark theme overrides, Google Fonts |

### Implementation Notes

- `apiRequest` from `@lib/queryClient` takes (method, url, data)
- Project queries use `getToken()` manually for Authorization header
- TanStack Query default queryFn joins queryKey array as URL path
- Custom fonts are loaded via dynamic `@font-face` injection in project views
- Color picker: native `<input type="color">` + hex text input + preset swatches
- Font upload accepts .ttf, .otf, .woff, .woff2 up to 5MB, converted to base64

## External Dependencies

### Authentication — Clerk
- **Packages:** `@clerk/clerk-react`, `@clerk/express`, `@clerk/backend`
- **Env vars:** `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

### Database — PostgreSQL
- **Env var:** `DATABASE_URL`
- Connected via `pg` Pool with SSL

### Other Notable Packages
| Package | Purpose |
|---|---|
| `@tanstack/react-query` | Server state / data fetching |
| `wouter` | Client-side routing |
| `react-hook-form` + `zod` | Form validation |
| `date-fns` | Date formatting |
| `lucide-react` | Icon library |
| `drizzle-zod` | Zod schemas from Drizzle tables |

### AI System — Local Prototype Network

Morse includes a locally-run AI model for prompt interpretation — no external API calls needed.

**Architecture:**
- `ai/model/tokenizer.ts` — Tokenizer with stemming, normalization, stopword removal
- `ai/model/model.ts` — 64-dim embedding layer, cosine similarity, mean pooling
- `ai/model/training.ts` — Prototype network training, lazy weight initialization via `getOrTrainWeights()`
- `ai/model/inference.ts` — Full pipeline: tokenize → embed → classify → extract → structure
- `ai/model/promptSchema.ts` — TypeScript interfaces for intents, model config, structured results
- `ai/promptRouter.ts` — Universal router (`routePrompt`, `interpretDesignPrompt`, `interpretWithProject`)
- `ai/patch/patchEngine.ts` — Intent → patch conversion (`intentToPatchSet`, `applyGenomePatch`)
- `ai/context/projectContext.ts` — Project context extraction for context-aware routing
- `ai/training/dataset.ts` — 150+ curated training examples across 10 intent types

**Dynamic Context Reasoning Pipeline:**
- `ai/context/contextReasoner.ts` — Semantic domain recognition: infers domain, systemType, userActions, entities, operationalConcepts, interfaceRequirements, and domainTraits from any prompt; uses embedding similarity against 7 archetype clusters + 15 domain overrides + noun phrase extraction for novel industries
- `ai/context/domainReasoner.ts` — Translates domain concepts into UI capability requirements: maps actions → components, entities → data structures, derives interaction patterns and layout suggestions (dashboard/landing/marketplace/portal/crud/content/wizard)
- `ai/context/contextGraphAI.ts` — Builds a traversable context graph with 5 node types (actor, action, data_object, capability, interface_element) and relationship edges (performs, operates_on, requires, renders_in, displayed_in)
- `ai/context/contextExtractor.ts` — Structured context extraction from prompt + internet knowledge: extracts actors, operations, data objects, workflows, user goals; merges prompt reasoning with internet context
- `ai/context/contextValidator.ts` — Validates interpretation quality: checks action coverage, entity coverage, domain consistency, graph connectivity, minimum capabilities, actor coverage, workflow coverage, operation coverage; returns score 0-1 and triggers re-interpretation on errors
- `ai/retrieval/internetContext.ts` — Multi-source internet context retrieval engine: extracts entities/concepts/industries/tasks from prompt, builds multiple search queries with different strategies, performs parallel internet searches, aggregates and summarizes results
- `ai/retrieval/webKnowledge.ts` — Domain knowledge retrieval with 24hr caching, 6 built-in knowledge bases (healthcare, finance, education, logistics, real_estate, food_service), web search fallback, graceful degradation
- `ai/retrieval/contextAugmentation.ts` — Full RAG pipeline: prompt → context reasoning → context database lookup → internet retrieval → context extraction → knowledge retrieval → domain reasoning → context graph → validated interpretation; both async (with internet) and sync (local-only) modes
- `ai/knowledge/contextDatabase.ts` — Persistent context knowledge storage: stores prompt interpretations with hash lookup, domain-based retrieval, context enrichment from stored data, in-memory LRU cache, DB persistence via context_knowledge table
- `ai/learning/promptKnowledge.ts` — Continuous context learning: stores prompt interpretations, enables domain-specific learning, enriches future contexts from accumulated knowledge, tracks correction patterns
- `ai/learning/promptHistory.ts` — Full prompt history logging: records every prompt with interpreted context, internet sources, generated layout structure, validation score; stores to context database for long-term learning

**Continuous Learning System:**
- `ai/learning/promptLogger.ts` — Privacy sanitization (emails, keys, tokens redacted) + log entry builder + feedback signal detection
- `ai/learning/learningDataset.ts` — In-memory dataset expansion from logs, intent bucketing, weighted export for retraining
- `ai/learning/trainingQueue.ts` — Auto-retraining queue (triggers after 50 prompts, 30min cooldown), training job history
- `ai/learning/patternDiscovery.ts` — Recurring pattern detection via token normalization + FNV hashing, top-N pattern retrieval
- `ai/model/adaptation.ts` — Online learning adapter: weighted prototype shifting between full retrains (max 30% adaptation strength)
- `ai/model/retraining.ts` — Full retraining from base + learned data, model versioning (up to 10 versions), rollback support

**DB Tables:**
- `prompt_logs` — stores every prompt with sanitized text, intent classification, confidence, patches summary, feedback signal, pattern ID, training flag
- `context_knowledge` — persistent context knowledge storage with promptHash, domain, interpretedContext (JSON), retrievedSources (JSON), generatedInterfacePatterns (JSON), internetContext (JSON), validationScore, usageCount

**API Endpoints:**
- `POST /api/ai/interpret` — Full internet-augmented prompt interpretation with reasoning output
- `GET /api/ai/learning/stats` — Learning system stats (queue, patterns, adaptation, model version)
- `GET /api/ai/learning/patterns` — Top recurring prompt patterns
- `GET /api/ai/learning/logs` — Recent prompt logs
- `GET /api/ai/learning/history` — Prompt history with domain/validation/source tracking
- `POST /api/ai/learning/feedback` — Submit feedback on a prompt log
- `POST /api/ai/learning/retrain` — Manually trigger model retraining
- `GET /api/ai/context/lookup?domain=X` — Look up stored contexts by domain

**Internet-Augmented Pipeline Flow:**
prompt → internet retrieval (multi-query) → context extraction (actors/operations/data/workflows) → context database lookup → context validation → LLM reasoning (3 inputs: prompt + internet context + system graph) → UI generation
