# Swagattam Event Estimate Studio

Swagattam is a responsive event quotation builder. Customers enter an event brief, choose food and event services, see live INR pricing, print or share the estimate, and optionally save it for the operations team. The static frontend runs on GitHub Pages and uses Supabase for the catalog, saved estimates, and admin authentication.

## Local development

```bash
pnpm install
cp .env.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
pnpm --filter @workspace/banquet-estimator run dev
```

The app uses hash routing, so the estimator is at `#/estimator` and the protected operations desk is at `#/admin`. This avoids refresh-time 404s on GitHub Pages.

## Supabase setup

Run these files in the Supabase SQL editor, in order:

1. `supabase/schema.sql`
2. `supabase/rls.sql`
3. `supabase/seed.sql`

Use only the Supabase project URL and public anon key in the frontend. Never expose a service-role key. Create an Auth user for the operations desk and add `{"role":"admin"}` to that user's `app_metadata`; RLS uses this claim to protect catalog writes and saved estimates.

See `README_FOR_CHATGPT.md` for the complete handover and `SUPABASE_SETUP_CHECKLIST.md` for the setup sequence.

## GitHub Pages

The included `.github/workflows/deploy-pages.yml` builds and deploys `artifacts/banquet-estimator/dist/public`. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as GitHub Actions repository variables, enable GitHub Pages with **GitHub Actions** as the source, and push to `main`.

The workflow sets the project-site base path from the repository name. For a custom domain, change `VITE_BASE_PATH` to `/` in the workflow.

## Backup

`migration-backup/` contains the original server, generated API packages, Replit project configuration, and server-backed frontend implementation. It is an archive only; the active frontend does not import or execute anything from it.