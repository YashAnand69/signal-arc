# Signal Arc

A complete career workspace: import a resume, compare opportunities against actual skill evidence, review application drafts, and track the search. The restrained Three.js background follows scroll and the active workspace without competing with the content.

Live: https://signal-arc-yash.vercel.app/

## Features

- Google sign-in with Supabase Auth, plus email sign-in links. Guest work transfers to the account on sign-in; signed-in work is available across devices.
- Browser-side PDF, DOCX, TXT and Markdown resume import, or direct text entry. Files are not uploaded: the user reviews extracted text before saving it.
- Private custom roles with original listing links, searchable alongside four explicitly labeled sample roles.
- Explainable skill-coverage matching with matched and missing evidence. Scores are deterministic comparisons, not hiring predictions or live-market recommendations.
- Editable application drafts grounded in listed skills. Achievement placeholders must be replaced before marking a draft reviewed. Drafts can be copied or downloaded; nothing is sent automatically.
- Application tracker with saved, applied, interview, offer and closed stages, private notes, deadlines, and CSV export.
- JSON workspace export, clear-workspace controls, private role removal, connection/error states, and server-side input validation.
- Persistent Supabase PostgreSQL storage behind a Vercel API. Google access tokens are verified server-side. Guest cookies are opaque, HttpOnly, Secure UUIDs. Account workspace IDs cannot be accessed using a guest cookie.

## Verification

```sh
npm install
npm run build
npm test
node scripts/verify-live.mjs
```

The last command creates isolated verification workspaces against the deployed API, exercises the complete guest flow and cross-session access controls, then clears its test data. Set `SIGNAL_ARC_URL` to verify a different deployment.

`npm run dev` previews the interface. To test guest features locally against the deployed API, use `SIGNAL_ARC_API_PROXY=https://signal-arc-yash.vercel.app npm run dev`. This opt-in proxy uses the live database; use disposable test data. Full-stack API testing requires the Vercel runtime and configured server environments; a failed API is displayed explicitly rather than silently substituting a demo.

## Deployment and operations

GitHub main automatically deploys to the linked Vercel project. Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as server-only environment variables. The publishable key is intentionally public and has no table privileges. SQL schema changes are committed under `supabase/migrations`.

The database is shared with Flowline; Signal Arc uses its own `signal_*` tables. RLS is enabled and direct anon/authenticated table access is revoked. API ownership filters are enforced for guest and account workspaces. The claim function is invoker-security and executable only by the service role.

Google is configured with the exact allowed return URL `https://signal-arc-yash.vercel.app/`. Email links rely on the Supabase email provider; its default service has delivery restrictions, so Google is the primary public sign-in method. Production email delivery at scale needs a custom SMTP service. Free Supabase projects can pause after inactivity; `/api/health` verifies the database rather than returning an unconditional success.

No paid AI model, scraped job feed, automated applications, billing, or promised employment outcomes are implied. Matching and drafting are deterministic, transparent tools for the user's review.
