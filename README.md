# CachyList

A personal media tracker for **anime, series, movies, books and games** — organize your
backlog, track progress per media type, and move items across a Kanban board. Dark,
brutalist UI. Self-hostable: clone the repo and run your own private instance.

Built with **Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Prisma · Auth.js · PostgreSQL**.

---

## Features

- **Library + Kanban** — drag and drop items between `Backlog → Para Depois → Em Andamento → Concluído → Pausado`.
- **Per-type progress** — episodes/seasons (anime & series), pages (books), hours (games), runtime (movies).
- **Smart add** — title autofill from **TMDB** (movies/series), **AniList** (anime) and **Steam** (games).
- **Bulk import** — upload a `.txt` (one title per line) or `.csv` (with a `title` column); titles are
  matched against AniList and you review/edit before importing.
- **Dashboard** with stats, "continue where you left off" and latest additions.
- **Filtering & search** by title, platform, category and status.
- **Accounts** — sign up / log in / password reset, profile with avatar, account editing.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions, Route Handlers) |
| UI | React 19, Tailwind CSS v4, lucide-react, GSAP |
| Database | PostgreSQL via Prisma 6 |
| Auth | Auth.js v5 (NextAuth), credentials + bcrypt, JWT sessions |

Passwords are hashed with **bcrypt (cost 12)**, which is compatible with the original Rails/Devise
app — so an existing CachyList database works as-is.

---

## Quick start (self-hosting)

### 1. Prerequisites

- **Node.js 20+** and npm
- A **PostgreSQL** database. Any of these work:
  - A free [Supabase](https://supabase.com) / [Neon](https://neon.tech) project
  - A local Postgres (`postgresql://postgres:postgres@localhost:5432/cachylist`)

### 2. Clone & install

```bash
git clone <your-fork-url> cachylist
cd cachylist        # the Next.js app
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

- `DATABASE_URL` — your Postgres connection string.
  For Supabase, use the **Connection Pooling** URL and append `?pgbouncer=true&connection_limit=1`.
- `AUTH_SECRET` — generate one:

  ```bash
  openssl rand -base64 32
  ```

- API keys (`TMDB_API_TOKEN`, `STEAM_API_KEY`, `ANILIST_CLIENT_ID`) are **optional** — the app runs
  without them; only the corresponding autofill/import source is disabled when a key is missing.

See the [Environment variables](#environment-variables) table for the full list.

### 4. Create the database schema

```bash
npx prisma generate
npx prisma db push     # creates the `users` and `media_items` tables
```

> If you're pointing at an **existing CachyList database** (e.g. from the Rails app), the tables
> already exist — run only `npx prisma generate` and **skip** `db push`.
>
> Note: some pooled connections (Supabase pgbouncer) reject schema changes. If `db push` fails,
> run it against a **direct** (non-pooled, port 5432) connection string, then switch `DATABASE_URL`
> back to the pooled one for runtime.

### 5. Run

```bash
npm run dev          # http://localhost:3000
```

Open the app, click **Criar conta**, and you're in.

### 6. Production build

```bash
npm run build
npm start
```

---

## Locking it down to a single user

For a personal instance, create your account first, then disable further sign-ups:

```bash
ALLOW_REGISTRATION="false"
```

The register page is hidden and the sign-up action is rejected server-side. Existing accounts keep
working.

---

## Deployment

The app deploys cleanly to any Node host (Vercel, Render, Railway, Fly, a VPS, Docker, …):

1. Set the environment variables from `.env.example` in your platform.
2. Build command: `npm run build` · start command: `npm start`.
3. Keep `AUTH_TRUST_HOST="true"` when the platform terminates TLS in front of the app.
4. Make sure `DATABASE_URL` uses a pooled connection on serverless platforms.

### Deploy to Vercel (and fixing 404s)

If routes return **404** on Vercel, it's almost always one of these — check in order:

1. **Root Directory** — this Next app lives in the `cachylist-webapp/` subfolder. In
   Vercel → *Project → Settings → General → Root Directory*, set it to `cachylist-webapp`
   (otherwise Vercel builds the repo root, finds no Next app, and every route 404s).
2. **Environment variables** — add **all** of them in *Settings → Environment Variables*
   (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, and any API keys). A missing
   `AUTH_SECRET`/`DATABASE_URL` makes auth-protected routes fail. Redeploy after adding them.
3. **Prisma client** — generation runs automatically (`postinstall` + `build` both run
   `prisma generate`), so no manual step is needed. Run `npx prisma db push` once against your
   database (from your machine, with a direct connection) to create the tables before first use.
4. **Framework preset** — should be detected as **Next.js**; Build Command `npm run build`,
   Install Command `npm install`, Output handled by Next automatically. Don't set a custom
   Output Directory.

> Route protection uses `src/proxy.ts` (the Next.js 16 replacement for the deprecated
> `middleware` convention) — no extra Vercel config is required for it.

---

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string. |
| `AUTH_SECRET` | ✅ | Secret that signs session JWTs (`openssl rand -base64 32`). |
| `AUTH_TRUST_HOST` | recommended | `"true"` behind a proxy / on PaaS. |
| `ALLOW_REGISTRATION` | optional | `"false"` disables public sign-up. Default: enabled. |
| `TMDB_API_TOKEN` | optional | TMDB API Read Access Token (movies & series autofill). |
| `STEAM_API_KEY` | optional | Steam Web API key (games autofill). |
| `ANILIST_CLIENT_ID` | optional | AniList client id (anime autofill/import). |

**Never commit `.env`** — it's git-ignored. Only `.env.example` (placeholders) belongs in the repo.

---

## Project structure

```
src/
  app/
    (public)/        # landing, login, register, password reset
    app/             # private area: dashboard, library, media CRUD, import, profile
      */route.ts     # auth-gated API handlers (tmdb/anilist/steam search, reorder)
    edit/            # account settings
    api/auth/        # Auth.js handler
  components/app/    # app shell, sidebar, kanban, media form/modal, cards, import tool
  lib/
    media.ts         # enums, labels, progress helpers
    services/        # tmdb / anilist / steam / import
    actions/         # server actions (media, account, import)
    auth.ts, session.ts, prisma.ts
  proxy.ts           # route protection (Next.js 16 "proxy" convention)
prisma/schema.prisma # mapped to users + media_items
```

---

## Security notes

- All data mutations are authenticated and **scoped to the signed-in user**.
- Passwords: bcrypt (cost 12); no plaintext is ever stored or logged.
- Sessions: signed JWT cookies (Auth.js). Use a strong, unique `AUTH_SECRET`.
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`) are set in `next.config.ts`; `X-Powered-By` is disabled.
- Output is rendered through React (auto-escaped) — no `dangerouslySetInnerHTML`.
- Heads-up for **multi-user** instances: any logged-in user can view another user's profile
  page (`/app/users/:id`) and its public library, mirroring the original app. For a private
  single-user instance, set `ALLOW_REGISTRATION="false"`. The external-API proxy routes are not
  rate-limited; add a limiter (or a WAF) if you expose them widely.
- Password-reset email delivery is **not** wired up; the reset link is logged to the server
  console (`requestPasswordReset` in `src/app/(public)/actions.ts`). Plug in your mail provider
  there before relying on it in production.

---

## Navigation & motion

Navigations give immediate feedback (no "frozen page then sudden swap"):

- **Top progress bar** (`nextjs-toploader`) starts on every navigation/click.
- **Instant loading shell** — `src/app/app/loading.tsx` renders a skeleton immediately
  while the next route streams in (Next.js Suspense, stable — no preview flags).
- **Spatial page transitions** — `src/components/app/SpatialTransition.tsx` maps the route
  hierarchy to a 2D space and animates the incoming page in from the matching direction
  (deeper routes rise from below, sibling categories slide sideways). Respects
  `prefers-reduced-motion`. Inspired by spatial transitions in SvelteKit, implemented with
  `motion` (framer-motion).

> In `npm run dev`, the *first* visit to a route is slower because Next.js compiles it on
> demand. Production (`npm run build && npm start`) navigations are much snappier — routes are
> precompiled and prefetched. The newer Next.js 16.3 "Instant Navigations" (Cache Components /
> Partial Prefetching) is still a **preview**; this app intentionally sticks to stable APIs and
> can adopt it later once it ships stable.

## License

No license file is included yet. If you intend to open-source this, add one (e.g. `MIT`).
