# Morse — replit.md

## Overview

Morse is a web application for creating and managing generative AI projects with **deterministic seeds** and reproducible genome structures. Users can sign up, create named projects with text prompts, and view their project details including a seed hash derived from project data.

Key features:
- User authentication via Clerk
- Project creation with name + prompt inputs
- Brand setup: logo upload, font selection (preset or custom upload), theme color (custom picker + presets)
- Deterministic seed generation (SHA-256 hash) per project
- Dashboard for listing user projects
- Project detail view with seed visualization
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
- `logo_url`: base64 data URL (resized to 256px max)
- `font_url`: base64 data URL of uploaded custom font file (.ttf/.otf/.woff/.woff2)
- `font`: font name (preset name or custom font filename without extension)

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
