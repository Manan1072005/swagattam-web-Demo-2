# Swagattam Event Estimate Studio

A static React/Vite event quotation builder that uses Supabase for catalog data, saved estimates, and protected operations access. The production export is designed for GitHub Pages.

## Run & Operate

- `pnpm install` — install dependencies
- `pnpm --filter @workspace/banquet-estimator run dev` — run the frontend locally
- `pnpm --filter @workspace/banquet-estimator run typecheck` — typecheck the frontend
- `pnpm --filter @workspace/banquet-estimator run build` — create the static production build

## Stack

- pnpm workspace, Node.js, TypeScript
- React + Vite + Tailwind CSS
- Supabase Auth and Postgres REST API
- GitHub Pages deployment through `.github/workflows/deploy-pages.yml`

## Where things live

- `artifacts/banquet-estimator/src` — active frontend
- `artifacts/banquet-estimator/src/lib/supabase-data.ts` — Supabase connection and data access
- `supabase/` — schema, RLS, and seed SQL
- `README_FOR_CHATGPT.md` — deployment handover
- `migration-backup/` — archive of the original server-backed implementation; never import from it

## Architecture decisions

- Hash routing is used so GitHub Pages refreshes do not require server rewrites.
- Browser code uses only the public Supabase anon key.
- Catalog writes and saved-estimate reads are protected by Supabase Auth plus database RLS.
- The built-in catalog is a fallback for an unconfigured local preview; Supabase is the production source of truth.
