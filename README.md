# Callback

Full-stack AI recovery coach for habits and skills. Built with Next.js 15, MongoDB, NextAuth, and Google Gemini.

## Quick start

```bash
cp .env.example .env.local
# Set MONGODB_URI and AUTH_SECRET (required)
# Optional: GEMINI_API_KEY, Google OAuth, Stripe, VAPID keys

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Dev Login** on `/login` with any email (no Google/Gemini required for basic flow — templates and fallback AI work offline).

## Features (all phases)

| Phase | Feature |
|-------|---------|
| 0 | Next.js 15, Tailwind, MongoDB, health check |
| 1 | NextAuth (Google + dev login), app shell, settings |
| 2 | Chat UI, Gemini path generation, goal templates |
| 3 | Today view, task logging, 14-day history |
| 4 | XP, levels, streaks, badges, grace period |
| 5 | Recovery coach, miss detection cron, accept plan |
| 6 | PWA manifest, Serwist SW, web push subscribe |
| 7 | Weekly AI review with apply/dismiss adjustments |
| 8 | 4 goal templates, onboarding tour, export |
| 9 | Stripe checkout, admin stats, Pro tier limits |

## Routes

- `/` — Landing
- `/login` — Auth
- `/chat` — AI coach
- `/today` — Daily tasks
- `/progress` — XP, badges, weekly review
- `/goals/new` — Template gallery
- `/goals/[id]` — Plan view
- `/settings` — Prefs, push, export
- `/pricing` — Free vs Pro
- `/admin` — Stats (ADMIN_EMAILS)

## API

See `docs/BUILD_PHASES.md` for the full API map.

## Deploy

Deploy to Vercel with MongoDB Atlas. Set env vars from `.env.example`. Cron jobs run via `vercel.json`.
