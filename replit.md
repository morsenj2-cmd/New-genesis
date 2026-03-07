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
- Project detail view with full genome visualization panel
- Dark theme (pure black background)

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
| `projects` | `id` (UUID, PK), `user_id` (FK), `name`, `prompt`, `seed`, `font`, `font_url`, `theme_color`, `logo_url`, `genome_json`, `layout_json`, `created_at` |

- `seed`: SHA-256 hash generated server-side
- `logo_url`: Cloudinary HTTPS URL (uploaded from base64; resized to 256×256 server-side)
- `font_url`: Cloudinary HTTPS URL of uploaded custom font file (.ttf/.otf/.woff/.woff2)
- `font`: font name (preset name or custom font filename without extension)

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
