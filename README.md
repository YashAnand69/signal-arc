# Signal Arc

Signal Arc is a career intelligence studio that turns a resume into a traceable job search system. It combines the strongest ideas from the project briefs into one portfolio-ready product: structured resume signal, explainable role matching, editable application drafts, and a small API surface for future enrichment workflows.

## What is shipped

- Premium responsive interface with a scroll-reactive, draggable Three.js orbit, accessible motion fallback, role cards, evidence drawer, application desk, and API studio.
- Full-stack Vercel API for profile parsing, role analysis, draft creation and review, custom job ingestion, and health checks.
- Persistent Supabase PostgreSQL storage for profiles, analyses, drafts, usage events, and roles. The API key stays on the server.
- Deterministic scoring and reason generation so every recommendation is inspectable instead of a black box.

The four starting roles are illustrative examples for exploring the product; they are not live job listings.

## Run locally

```bash
npm install
npm run dev
```

The Vite preview includes demo roles when the local API runtime is not running.

## Deploy

```bash
npm run build
npx vercel deploy --prod
```

Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as server environment variables. The production site is [signal-arc-yash.vercel.app](https://signal-arc-yash.vercel.app).
