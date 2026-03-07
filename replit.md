# Genome Studio — replit.md

## Overview

Genome Studio is a web application for creating and managing generative AI projects with **deterministic seeds** and reproducible genome structures. Users can sign up, create named projects with text prompts, and view their project details including a seed hash derived from project data. The app is positioned as a developer tool for reproducible generative outputs.

Key features:
- User authentication via Clerk
- Project creation with name + prompt inputs
- Deterministic seed generation (SHA hash) per project
- Dashboard for listing user projects
- Project detail view with seed visualization

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack TypeScript Monorepo

The project uses a single repo with three main areas:
- `client/` — React frontend (Vite)
- `server/` — Express backend (Node.js)
- `shared/` — Shared types and DB schema (used by both client and server)

This monorepo approach avoids duplicating type definitions and keeps the schema as the single source of truth.

### Frontend Architecture

- **Framework:** React 18 with TypeScript, bundled by Vite
- **Routing:** `wouter` (lightweight client-side routing)
- **State / Data fetching:** TanStack Query (React Query v5) for server state
- **Forms:** React Hook Form + Zod validation via `@hookform/resolvers`
- **UI Components:** shadcn/ui (New York style) built on Radix UI primitives + Tailwind CSS
- **Design tokens:** CSS variables defined in `index.css` for light/dark mode theming
- **Authentication UI:** Clerk React (`@clerk/clerk-react`) — hosted sign-in/sign-up pages

The app bootstraps by fetching `/api/config` to get the Clerk publishable key before rendering, so the key doesn't need to be hardcoded in the frontend bundle.

Protected routes check `useAuth()` from Clerk and redirect to `/sign-in` if the user is not authenticated. Public routes (sign-in/sign-up) redirect authenticated users to `/dashboard`.

### Backend Architecture

- **Framework:** Express.js (ESM, TypeScript via `tsx`)
- **Authentication middleware:** `@clerk/express` — `clerkMiddleware()` applied globally; `requireAuth` helper extracts `userId` from Clerk's `getAuth(req)`
- **User sync:** On first authenticated request a `POST /api/user/sync` call upserts the Clerk user into the local Postgres `users` table
- **Storage layer:** `DatabaseStorage` class in `server/storage.ts` wraps all DB operations; interface `IStorage` is defined so it could be swapped
- **Config endpoint:** `GET /api/config` returns the Clerk publishable key to the frontend at runtime

**Dev vs. Production serving:**
- Development: Vite dev server runs in middleware mode inside Express (hot reload via HMR)
- Production: Vite builds to `dist/public/`; Express serves static files with SPA fallback

### Database

- **Database:** PostgreSQL
- **ORM:** Drizzle ORM (`drizzle-orm/node-postgres`) with `pg` pool
- **Schema location:** `shared/schema.ts` — single source of truth for both backend queries and frontend types
- **Migrations:** `drizzle-kit push` (schema push, not migration files in practice)

**Tables:**
| Table | Key columns |
|---|---|
| `users` | `id` (Clerk user ID, PK), `email`, `created_at` |
| `projects` | `id` (UUID, PK), `user_id` (FK → users), `name`, `prompt`, `seed`, `genome_json`, `layout_json`, `created_at` |

The `seed` column stores a deterministic hash generated server-side from project data. `genome_json` and `layout_json` are optional text columns for storing generated structured data.

### Build System

Custom build script (`script/build.ts`) runs Vite for the client and esbuild for the server, bundling a curated allowlist of server dependencies to reduce cold-start syscalls. Everything outputs to `dist/`.

## External Dependencies

### Authentication — Clerk
- **Packages:** `@clerk/clerk-react`, `@clerk/express`, `@clerk/backend`
- **Purpose:** Full authentication flow (sign-up, sign-in, session management)
- **Required env vars:** `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- Clerk user IDs are used as primary keys in the local `users` table, so no password storage is needed locally

### Database — PostgreSQL
- **Required env var:** `DATABASE_URL`
- Connected via `pg` Pool with SSL (`rejectUnauthorized: false` for hosted DBs)
- Drizzle ORM handles all queries; schema defined in `shared/schema.ts`

### UI — Radix UI + shadcn/ui
- Full suite of Radix UI primitives (accordion, dialog, dropdown, sidebar, etc.)
- shadcn/ui components in `client/src/components/ui/` are locally copied and customizable
- Tailwind CSS with CSS variable theming for light/dark mode

### Other Notable Packages
| Package | Purpose |
|---|---|
| `@tanstack/react-query` | Server state / data fetching on the frontend |
| `wouter` | Lightweight client-side routing |
| `react-hook-form` + `zod` | Form validation |
| `date-fns` | Date formatting |
| `nanoid` | Short unique ID generation |
| `lucide-react` | Icon library |
| `tailwind-merge` + `clsx` | Conditional class merging |
| `drizzle-zod` | Auto-generates Zod schemas from Drizzle table definitions |

### Replit-specific Plugins (dev only)
- `@replit/vite-plugin-runtime-error-modal` — shows runtime errors as overlays
- `@replit/vite-plugin-cartographer` — Replit internal tooling
- `@replit/vite-plugin-dev-banner` — Replit dev banner