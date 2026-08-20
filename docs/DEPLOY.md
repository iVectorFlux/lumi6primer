# Deploy Lumi6 Primer

## Recommended for demo + production

**One URL on ECS** (Express mode is fine). The browser, APIs, voice, and pictures all stay on the same Node process.

Do **not** split the board onto Vercel unless you are ready to add CORS, API base URLs, and proxy rules. See [VERCEL.md](./VERCEL.md).

---

## Local vs production (same code)

| | Local | ECS |
| --- | --- | --- |
| Config | `.env` in project root (gitignored) | Task env / AWS Secrets Manager |
| Bind | `HOST=127.0.0.1` | `HOST=0.0.0.0` |
| Port | `PORT=3888` | match container + load balancer |
| Keys | your dev keys | production keys (can be same Supabase project for demo) |

Copy names from `.env.example`. Never commit `.env`.

---

## ECS environment variables

Set these on the **ECS task** (or inject from Secrets Manager). Same names as local.

### Required

```bash
HOST=0.0.0.0
PORT=3888
NODE_ENV=production

# Talk
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
AI_PROVIDER=api
AI_API_FORMAT=openai
AI_API_URL=https://api.openai.com/v1
AI_API_KEY=              # or use OPENAI_API_KEY
AI_API_MODEL=            # or OPENAI_MODEL

# Voice
TTS_PROVIDER=deepgram
DEEPGRAM_API_KEY=
DEEPGRAM_TTS_MODEL=aura-2-thalia-en

# Pictures (at least one)
GEMINI_API_KEY=
OPENAI_API_KEY=

# Supabase — server
SUPABASE_URL=
SUPABASE_ANON_KEY=       # also served to browser via /api/config.js
SUPABASE_SERVICE_ROLE_KEY= # required so lessons persist across task restarts
```

### Optional

```bash
DEEPGRAM_TTS_SPEED=1
DEEPGRAM_TTS_PAUSE_MS=500
GEMINI_IMAGE_MODEL=
AI_EFFORT=medium
```

### Never put on the browser / Vercel

- `GROQ_API_KEY`, `OPENAI_API_KEY`, `DEEPGRAM_API_KEY`, `GEMINI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Docker

```bash
docker build -t lumi6primer .
docker run --rm -p 3888:3888 --env-file .env lumi6primer
```

Open http://127.0.0.1:3888

---

## GitHub Actions

| Workflow | Purpose |
| --- | --- |
| `.github/workflows/ci.yml` | `npm ci` + `npm run check` on push/PR |
| `.github/workflows/deploy-ecs.yml` | Manual: Actions → Deploy ECS → Run workflow |

### GitHub secrets for deploy

| Secret | Example |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | IAM user or OIDC role |
| `AWS_SECRET_ACCESS_KEY` | |
| `AWS_REGION` | `ap-south-1` |
| `ECR_REPOSITORY` | `lumi6primer` |
| `ECS_CLUSTER` | your Express cluster name |
| `ECS_SERVICE` | your service name |

Point the ECS task definition at `:latest` (or tag with the git SHA). Map container port **3888** to the load balancer. Health check: `GET /landing.html` → 200.

### Supabase after deploy

In Supabase → Authentication → URL configuration, add your ECS public URL to **Site URL** and **Redirect URLs**.

---

## Files in repo

| File | Role |
| --- | --- |
| `Dockerfile` | Production container |
| `.dockerignore` | Keeps secrets and junk out of the image |
| `.env.example` | Local + ECS variable names |
| `docs/GO-LIVE.md` | Full launch checklist |
