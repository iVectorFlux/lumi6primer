# Vercel and Lumi6

## Short answer

**For Lumi6 Primer demo, do not use Vercel for the app.** Deploy the whole repo on **ECS** (Express mode is enough).

The product is one Node server: `public/` (board, chat, voice) plus `/api/primer`, `/api/atlas`, `/api/config.js`, TTS, and generated pictures. Vercel is built for static sites and short serverless functions, not a long-running teaching server with streaming and in-memory graphics.

---

## If you still want Vercel later

Use it only for a **marketing landing page** (static HTML), not the whiteboard.

### Vercel environment variables

For a **static landing only**, you usually need **none** — no API keys in Vercel.

If the landing page talks to Supabase directly (not recommended for this repo today), you would add:

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Not used by current `public/landing.html` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Not used — sign-in uses `/api/config.js` from ECS |

Current `landing.html` loads Supabase config from **`/api/config.js` on the same origin**. So the landing must be served by ECS, or you must proxy `/api/*` to ECS.

### Proxy pattern (advanced split)

If you host static files on Vercel and APIs on ECS, add in Vercel project settings:

| Variable | Purpose |
| --- | --- |
| `LUMI6_BACKEND_URL` | e.g. `https://your-ecs-alb.example.com` |

And use `vercel.json` rewrites (see `vercel.json.example` in repo root) so `/api/*` forwards to ECS.

You would also need code changes so `ATLAS_API_BASE` / `PRIMER_API_BASE` can point at the backend when not same-origin. **Not wired today.**

---

## What to use instead

| Goal | Use |
| --- | --- |
| Demo / test | ECS Express + GitHub Action (`.github/workflows/deploy-ecs.yml`) |
| HTTPS + CDN later | CloudFront in front of ECS |
| Marketing site only on Vercel | Separate small static repo, link “Open app” → ECS URL |

See [DEPLOY.md](./DEPLOY.md) for ECS env vars.
