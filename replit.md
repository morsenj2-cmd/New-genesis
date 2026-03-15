# Morse — replit.md

## Overview

Morse is a web application designed for creating and managing generative AI projects. It focuses on **deterministic seeds** and reproducible genome structures to ensure consistent and customizable AI-generated designs. Users can create projects, define brand elements, and generate unique design "genomes" that encompass colors, typography, spacing, and more. A core feature is the Natural Language (NL) Design Editor, allowing users to manipulate designs with plain English commands. The platform also offers a Canvas Editor for visual and element-level design adjustments, real-time collaboration features, and a subscription model (Morse Black) for enhanced capabilities.

The project's ambition is to provide a powerful, intuitive tool for rapid prototyping and design generation, leveraging advanced AI to produce high-quality, customizable web interfaces from simple textual prompts. It aims to eliminate design inconsistency and offer unparalleled control over AI-generated outputs through a deterministic design system.

## User Preferences

- App name: **Morse** (not "Genome Studio")
- Logo: `@assets/--._1772868829725.png` — black PNG, use `dark:invert-0 invert` for light/dark mode
- Font: Arimo (set via inline `<style>` tag in index.html overriding `--font-sans`)
- Dark theme: `class="dark"` on `<html>` tag in index.html with pure black backgrounds via CSS variable overrides
- Auth: Clerk dev keys (pk_test_/sk_test_) — production keys domain-locked to morse.co.in
- No fake stats, no pricing claims anywhere in the UI
- Preferred communication style: Simple, everyday language.

## System Architecture

### High-Level Design

Morse is a Full-Stack TypeScript Monorepo with a React frontend (`client/`), an Express backend (`server/`), and shared types/schemas (`shared/`). It emphasizes a deterministic design genome derived from project seeds, ensuring reproducibility. AI generation is central, translating natural language prompts into complete HTML applications with dynamic layout and styling.

### Frontend Architecture

- **Framework:** React 18 with TypeScript (Vite)
- **Routing:** `wouter`
- **State/Data Fetching:** TanStack Query (React Query v5)
- **UI Components:** shadcn/ui (New York style) + Tailwind CSS
- **Authentication:** Clerk React
- **Design Preview:** `GenomePreview` renders genome-aware UI components based on generated design tokens and layout sections.
- **Canvas Editor:** Provides `Auto Design`, `Canvas` (drag-and-drop sections, inline content editing), and `Elements` (AI iframe visual editor for DOM manipulation or `ElementCanvas` for node-based editing) modes. Supports undo/redo, duplication, and element-level controls.
- **Dynamic Font Loading:** Google Fonts are loaded dynamically; custom fonts uploaded to Cloudinary.
- **Liquid Glass Sidebar:** Frosted glass design for the navigation sidebar.

### Backend Architecture

- **Framework:** Express.js (ESM, TypeScript via `tsx`)
- **Authentication:** `@clerk/express` middleware.
- **Database Storage:** `DatabaseStorage` class abstracts DB operations.
- **Cloudinary Integration:** Handles image and custom font uploads.
- **Real-time Collaboration:** WebSocket server (`server/websocket.ts`) for room-based presence, broadcasting UI updates, and cursor movements.

### Database

- **Database:** PostgreSQL (Neon) with SSL
- **ORM:** Drizzle ORM
- **Schema:** Defined in `shared/schema.ts` for users, projects, prompt logs, blog posts, and project collaborators. Key fields include `seed`, `genome_json`, `layout_json`, `settings_json`, and `plan` (for subscriptions).

### AI Generation Core

- **Deterministic Genome Generator:** Derives colors, typography, spacing, etc., from a project seed.
- **Natural Language (NL) Design Editor:** Unified semantic interpreter (`interpretSemanticMulti`) handles multi-intent commands to modify designs (colors, fonts, spacing, content, etc.).
- **Design Variation Engine:** Generates variations like `colorMode`, `spacingMode`, `buttonStyle` from the genome.
- **Content Generator:** `shared/contentGenerator.ts` provides category-specific headlines, CTAs, and other content for 14 product types.
- **Layout Generation:** `shared/layoutEngine.ts` generates context-driven layouts using `SITE_TYPE_POOLS` and applies constraints for page types (e.g., `landing_page` sections).
- **Generation Refactor (v2):** Enforces strict page types, constraints on sections/columns, and utilizes a 6-dimension genome signature for style regeneration uniqueness (`isGenomeTooSimilar`, `hasSufficientMutation`).
- **Universal Context Engine:** `shared/universalContext.ts` performs NLP-lite industry detection, noun/verb/adjective extraction, and dynamic domain vocabulary building.
- **AI HTML Generation:** Uses Groq LLM (llama-3.3-70b-versatile, temp 0.7, 12k max tokens) to generate premium-quality full HTML applications. System prompt emphasizes world-class UI/UX design rivaling V0.dev, Lovable, and Bolt.new with glassmorphism, gradient overlays, micro-interactions, inline SVG icons, and modern CSS techniques.
  - **Premium Design System:** Glassmorphism nav (backdrop-filter:blur), radial gradient hero backgrounds, card hover lift effects (translateY(-4px)), button press animations (scale(0.98)), section fade-in animations, custom scrollbar, selection styling, focus-visible rings.
  - **Post-processors (in order):** sanitizeGeneratedCss → enforceGenomeColors → fixOverlappingLayout → ensureNavAtTop → enforceContrastAndBackgrounds → enforceVisualHierarchy → enforceStructuralGrids (no-op) → enforceFontFamily → injectPremiumPolish → injectSafetyScript
  - **Design philosophy: Fully generative.** All visual/structural decisions emerge from AI's semantic understanding of the prompt. No hardcoded themes, keyword→theme mappings, fixed templates, or deterministic section structures. Post-processors are now minimal safety nets only.
  - **enforceVisualHierarchy:** Nav structural safety only (sticky, z-index:1000, list-style removal). No forced typography, spacing, hero height, or container width — all AI-decided.
  - **enforceStructuralGrids:** No-op (disabled). AI decides all grid layouts.
  - **enforceFontFamily:** Injects Google Fonts link + CSS font-family rules from genome typography, ensuring user-chosen fonts survive regeneration.
  - **injectPremiumPolish:** Minimal: smooth scroll, box-sizing, scrollbar, selection, focus rings, cursor:pointer on buttons. No forced hover effects, animations, or responsive overrides.
  - **enforceContrastAndBackgrounds:** Dark-mode only: semi-transparent nav rgba background. No hardcoded text colors.
  - **fixOverlappingLayout:** Float removal only. Does NOT convert position:absolute→relative (preserves overlapping/asymmetric layouts).
  - **System prompt:** 4-phase generative design: Semantic Vibe Inference → Dynamic Visual Language → Layout Intelligence → Procedural Variation. Banned template: "hero → 3 cards → stats → footer".
  - **Icons:** Prompt requires domain-specific SVG icons (not generic shapes). No generic icon injector.
  - **Safety:** injectSafetyScript blocks external navigation, window.open, auto-showing modals
  - **NL Edit:** geminiEditApp sends existing HTML + edit instruction for targeted changes, falls back to full regeneration
- **Local AI System:** A locally-run AI model handles prompt interpretation using a prototype network, embedding layers, and cosine similarity. It includes dynamic context reasoning, domain translation, context graph building, structured context extraction, validation, and continuous learning systems (logging, dataset expansion, retraining).

### Features and Design Patterns

- **Deterministic Seeds:** SHA-256 hash for project seeds.
- **Layout Lock:** Prevents layout regeneration for a project.
- **Branding Tokens:** `genome.branding.logoColor/logoFont/logoWeight` for consistent branding across UI elements.
- **Design Source Priority:** User-uploaded assets (logo, font, color) always override generated design.
- **Icon Generator:** `shared/iconGenerator.ts` procedurally generates SVG icons based on genome `iconStyle`.
- **Morse Black Subscription:** Integrates Razorpay for subscription management, enabling features like increased credits, project export, and real-time collaboration. Includes a global credit system.
- **Real-time Collaboration:** Allows multiple users to work on a project with role-based access, real-time UI updates via WebSockets, collaborator cursors, and email invitations.
- **Multi-page Navigation:** GenomePreview manages `activePage` state, supporting various page types (home, features, pricing, about, blog, contact).
- **Strict Image Policy:** Images only appear when explicitly requested in prompts.
- **Regenerate Style = Full Regeneration:** Regenerating style now triggers a full regeneration of layout DNA, structure, and component architecture.
- **Semantic Content Generation Pipeline:** Uses `shared/domainVocabulary.ts`, `shared/genericPhraseFilter.ts`, and `shared/relevanceScoring.ts` for context-aware content generation.

## External Dependencies

### Authentication
- **Clerk:** For user authentication and management.
  - `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

### Database
- **PostgreSQL:** Primary data store.
  - `DATABASE_URL`
- **Neon:** Managed PostgreSQL service.

### AI / LLM
- **Groq:** Used for generating full HTML applications and targeted HTML edits.
  - `GROQ_API_KEY` (implicitly, as it's the primary LLM)

### Cloud Storage
- **Cloudinary:** For storing uploaded user logos and custom fonts.
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### Payment Gateway
- **Razorpay:** For processing Morse Black subscriptions.
  - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

### Email Service
- **Resend:** For sending collaboration invite emails.
  - `RESEND_API_KEY`

### Other Libraries
- **@tanstack/react-query:** Server state management.
- **wouter:** Client-side routing.
- **react-hook-form + zod:** Form handling and validation.
- **date-fns:** Date utility library.
- **lucide-react:** Icon library.
- **drizzle-orm + drizzle-kit + drizzle-zod:** ORM for PostgreSQL and schema management.
- **pg:** PostgreSQL client for Node.js.