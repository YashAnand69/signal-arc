# Signal Arc

Signal Arc is a career intelligence studio that turns a resume into a traceable job search system. It combines the strongest ideas from the project briefs into one portfolio-ready product: structured resume signal, explainable role matching, editable application drafts, and a small API surface for future enrichment workflows.

## What is shipped

- Premium dark interface with a responsive layout, animated Three.js orbit, scroll-reactive motion, role cards, evidence drawer, application desk, and API studio.
- Full-stack Netlify Functions for profile parsing, role analysis, draft generation, custom job ingestion, and health checks.
- Persistent site-scoped storage in Netlify Blobs for profiles, analyses, drafts, usage events, and ingested roles.
- Deterministic scoring and reason generation so every recommendation is inspectable instead of a black box.

## Run locally

```bash
npm install
npm run dev
```

The Vite preview includes demo roles when the local function runtime is not running. To exercise the full API locally, use `netlify dev` after linking the site with the Netlify CLI.

## Deploy

```bash
npm run build
netlify deploy --prod --build
```

The production site is deployed at [signal-arc-yash.netlify.app](https://signal-arc-yash.netlify.app).

