# Go live

Use this list before a public domain hits ECS. Check items in order. Do not skip secrets or Supabase.

## 1. Repo hygiene

- [ ] `.env` is gitignored and not in the image
- [ ] No keys in README, tickets, or screenshots
- [ ] Rotate any key that ever sat in a shared `.env` or chat
- [ ] `npm start` still boots locally against the production Supabase project (or a staging clone)

## 2. Supabase

- [ ] Auth: email + password sign-in works
- [ ] SQL in `supabase/sql/lumi6_auth_schema.sql` is applied
- [ ] `public.users` is the learner table (not `children`)
- [ ] RLS: a signed-in user can only read/write their own `users` row
- [ ] ECS uses `SUPABASE_SERVICE_ROLE_KEY` for server writes; the browser uses the publishable key only
- [ ] Confirm a lesson turn persists after refresh (not “persistence: memory”)
- [ ] Point-in-time recovery / backups are on

## 3. ECS

- [ ] Node 20+ image, `npm start`, `HOST=0.0.0.0`, `PORT` matching the container
- [ ] Health check: HTTP 200 on `/health` through the task port
- [ ] Desired count ≥ 2
- [ ] CPU/memory enough for one image generate + TTS at once (start 1 vCPU / 2 GB, then watch)
- [ ] Task role can write the graphics S3 bucket (when S3 is wired)
- [ ] Secrets from AWS Secrets Manager / SSM, not baked into the image
- [ ] CloudWatch logs on
- [ ] No `127.0.0.1` bind in production

## 4. CloudFront + HTTPS

- [ ] ACM certificate on the public domain
- [ ] CloudFront distribution in front of the ALB
- [ ] HTTPS redirect
- [ ] Cache `/` and `/api/*` as **uncacheable** (or cache HTML/API for 0 seconds)
- [ ] Cache hashed static assets (`*.css`, `*.js` with `?v=`, images, fonts) with a long max-age
- [ ] WebSockets not required; mic uses the browser, TTS is HTTP
- [ ] Security headers: HSTS, do not index staging

## 5. S3 (graphics)

- [ ] Private bucket in the same region as ECS
- [ ] Block public access
- [ ] ECS task role: `s3:PutObject` + `s3:GetObject` on `lessons/*` (or similar prefix)
- [ ] Serve objects via CloudFront signed URLs **or** the Node `/api/primer/graphic/` proxy
- [ ] Never put AWS keys in the browser

Wire S3 into generate-graphic only after the bucket and IAM role exist. Until then, pictures die when a task restarts.

## 6. Models and voice

- [ ] Groq key live; talk replies in a second or two
- [ ] OpenAI key live as fallback for talk and images
- [ ] Deepgram TTS: first sentence of a reply is audible
- [ ] Lesson picture: one picture on a new topic (including switching topics); leftover doodles must not block the image call; none on “yes / looks good”
- [ ] Quota alerts on Groq, OpenAI, Deepgram

## 7. Product checks on the live URL

- [ ] Landing sign-in → board
- [ ] Refresh stays signed in until Logout
- [ ] Onboarding completes; Edit profile returns to the profile card
- [ ] Ask a real topic (for example water cycle): spoken lesson + **one** overview picture
- [ ] Follow-up answers do not spam new pictures
- [ ] Chat and collapsed sidebar look like the onboard cards
- [ ] Download lesson PDF has a real title, You asked / Lumi6 answered, Made with love by Lumi6
- [ ] Mic, pause, and mute behave; pause stops speech immediately

## 8. Speed (feel fast, not “zero latency”)

Talk + TTS + a picture cannot be zero milliseconds. Launch bar:

- [ ] Same AWS region as the kids
- [ ] Voice starts before the picture finishes
- [ ] CloudFront caches JS/CSS/fonts
- [ ] One picture per new topic
- [ ] Two ECS tasks so deploys do not stall the orb

## 9. After DNS cutover

- [ ] Watch CloudWatch for 5xx and task restarts
- [ ] Watch Supabase Auth errors
- [ ] One real child session end-to-end
- [ ] Shareable lesson links are **out of scope** for this cutover
