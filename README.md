# Lumi6

Lumi6 is a voice-and-whiteboard companion for kids. A child signs in, tells Lumi6 what they want to understand, and Lumi6 talks, asks thinking questions, and draws on a shared board.

This README is for running and shipping the product. Internal product notes live under `docs/` and are not required to operate the service.

## What it does

- Clean routes: `/login` (auth & sign-in), `/dashboard` (whiteboard & tutor)
- Short onboarding: name, class, interests
- **Draw Mode**: Infinite white canvas for interactive notes and diagrams
- **Talk Mode**: Structured Socratic story view with visual lesson cards, key discovery highlights, and kid-friendly thinking prompts
- Voice orb plus chat with speech recognition
- Real-time lesson pictures and visual models when topics evolve
- Download a kid-readable lesson PDF from the session

## Stack

| Piece | Role |
| --- | --- |
| Browser app in `public/` & `src/client/` | Clean login, Draw/Talk modes, chat, voice, profile |
| Node server (`src/server/`) | Serves clean routes `/login`, `/dashboard`, and `/api/*` |
| Primer AI Tutor (`src/primer/`) | Socratic pedagogical engine, first-principles level-up loop |
| Groq | Fast spoken replies |
| OpenAI | Fallback talk, fallback images |
| Deepgram / Cartesia | Text-to-speech voice synthesis |
| Gemini / OpenAI | Lesson pictures and visual diagrams |
| Supabase | Auth and learner data |
| AWS ECS | Production Node tasks |
| CloudFront + ALB | HTTPS in front of ECS |
| S3 | Generated graphics (production) |

The live app is one Node process. CloudFront should sit in front of ECS. Do not put API keys in the browser except the Supabase publishable key.

## Requirements

- Node.js 20.3 or newer
- Keys for Groq, OpenAI, Deepgram, and at least one image provider
- A Supabase project with Auth and the SQL in `supabase/sql/`

## Local run

```bash
npm install
cp .env.example .env   # then fill in keys locally; never commit .env
npm start
```

Open [http://127.0.0.1:3888](http://127.0.0.1:3888).

Production and Docker-style hosts must bind all interfaces:

```bash
HOST=0.0.0.0 PORT=3888 npm start
```

Useful scripts:

| Command | Purpose |
| --- | --- |
| `npm start` | Run the app |
| `npm run build:client` | Rebuild `public/app.js` from `src/client` (only if you change client source) |
| `npm run check` | Syntax check |

Live UI work in `public/*.js` and `public/*.css` is served as-is. After changing those files, hard-refresh the browser. After changing `src/` server code, restart Node.

## Environment

Copy `.env.example`. Names only — never paste real keys into git, chat, or screenshots.

**App**

- `HOST` — `127.0.0.1` locally, `0.0.0.0` on ECS
- `PORT` — default `3888`

**Talk**

- `GROQ_API_KEY`, `GROQ_MODEL` — first-choice spoken replies
- `AI_PROVIDER=api`, `AI_API_FORMAT=openai`, `AI_API_URL`, `AI_API_KEY`, `AI_API_MODEL` — OpenAI-compatible fallback
- `OPENAI_API_KEY`, `OPENAI_MODEL` — same fallback plus image fallback

**Voice**

- `TTS_PROVIDER=deepgram`
- `DEEPGRAM_API_KEY`, `DEEPGRAM_TTS_MODEL`, `DEEPGRAM_TTS_SPEED`, `DEEPGRAM_TTS_PAUSE_MS`

**Pictures**

- `GEMINI_API_KEY`, `GEMINI_IMAGE_MODEL`
- OpenAI image models use `OPENAI_API_KEY`

**Supabase**

- `SUPABASE_URL` — project URL
- `SUPABASE_ANON_KEY` — publishable key for the browser (also sent via `/api/config.js`)
- `SUPABASE_SERVICE_ROLE_KEY` — **ECS only**, never in the frontend, for trusted server writes

## Data

Learner profiles live in `public.users` (owned by `auth.uid()`). Session and turn tables are in `supabase/sql/lumi6_auth_schema.sql`. Apply those scripts (and `supabase/migrations/`) in the Supabase SQL editor before launch.

If the server cannot write to Supabase, it falls back to in-memory storage. That is fine for a laptop. It is not fine in production: a new ECS task forgets the child.

## Production shape

```
Child browser
    → CloudFront (HTTPS, cache static files)
    → ALB
    → ECS tasks (Node, HOST=0.0.0.0)
         → Groq / OpenAI / Deepgram / Gemini
         → Supabase Auth + Postgres
         → S3 (lesson pictures)
```

Keep ECS, S3, and CloudFront in the same region as the children (for India: ap-south-1). Run at least two ECS tasks so a deploy does not drop the orb.

Pictures generated today are held in process memory. For launch, write them to S3 as they are created so they survive deploys and can be shared later.

## What not to publish

Do not put these in a public README, ticket, or screenshot:

- API keys, service-role keys, JWTs
- Internal teaching-loop / orchestration notes (`docs/PRIMER-*.md`)
- Child names, chat transcripts, or board images from real sessions

## Go live

- [docs/DEPLOY.md](docs/DEPLOY.md) — Docker, ECS env vars, GitHub Actions  
- [docs/VERCEL.md](docs/VERCEL.md) — Vercel is not for the full app (ECS instead)  
- [docs/GO-LIVE.md](docs/GO-LIVE.md) — launch checklist  

## License

Proprietary. See [LICENSE](LICENSE).
