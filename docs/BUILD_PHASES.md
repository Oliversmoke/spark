# ComeBack.ai — Build Phases

Phased plan to go from zero to a production-ready PWA. Each phase has clear deliverables, acceptance criteria, and estimated scope.

**Estimated total:** 8–12 weeks solo, or 4–6 weeks with a small team.

---

## Phase 0 — Foundation (Week 1)

**Goal:** Repo, tooling, and deploy pipeline ready before feature work.

### Tasks

- [ ] Initialize Next.js 15 app (TypeScript, App Router, Tailwind)
- [ ] Add ESLint, Prettier, path aliases
- [ ] Set up MongoDB Atlas + local connection
- [ ] Configure environment variables (`.env.example`)
- [ ] Deploy skeleton to Vercel (hello world)
- [ ] Add shadcn/ui base components (Button, Card, Input, Dialog)

### Deliverables

- Runnable `npm run dev`
- Staging URL on Vercel
- MongoDB connection test route (`/api/health`)

### Acceptance Criteria

- CI passes on push
- Health check returns `{ db: "ok" }`

---

## Phase 1 — Auth & User Shell (Week 1–2)

**Goal:** Users can sign up, land in an empty app shell.

### Tasks

- [ ] User model in MongoDB (id, email, name, preferences, createdAt)
- [ ] Protected routes middleware
- [ ] App layout: sidebar or bottom nav (Chat | Today | Progress | Settings)
- [ ] Settings page: timezone, reminder preferences, logout

### Deliverables

- Sign-in flow
- Authenticated home with placeholder sections

### Acceptance Criteria

- New user can sign up and see empty dashboard
- Unauthenticated users redirect to `/login`

---

## Phase 2 — Goal Creation & AI Path Generation (Week 2–3)

**Goal:** User describes a goal in chat; AI generates a structured learning/habit path.

### Tasks

- [ ] Chat UI (message list, input, streaming optional for v1)
- [ ] Gemini integration via server route (`/api/ai/plan`)
- [ ] Prompt engineering: goal intake → structured JSON path
- [ ] for `Goal`, `Phase`, `Checkpoint`, `Task`
- [ ] Save generated path to MongoDB
- [ ] Goal creation wizard fallback (form if user prefers non-chat)

### Path JSON Schema (example)

```json
{
  "title": "Learn Software Engineering",
  "durationWeeks": 24,
  "phases": [
    {
      "name": "Foundations",
      "checkpoints": [
        {
          "title": "Complete HTML/CSS portfolio page",
          "criteria": "Deployed static site with 3 sections",
          "dueInDays": 14,
          "tasks": [
            {
              "title": "Study HTML semantics",
              "frequency": "daily",
              "durationMin": 30
            },
            {
              "title": "Build landing page section",
              "frequency": "daily",
              "durationMin": 45
            }
          ]
        }
      ]
    }
  ]
}
```

### Deliverables

- Chat-based goal creation
- At least 2 tested prompt templates (skill learning + fitness)

### Acceptance Criteria

- User says "I want to learn React in 3 months" → valid path saved
- Invalid AI output is rejected; user sees retry message
- Path visible in read-only "Plan" view

---

## Phase 3 — Task Logging & Today View (Week 3–4)

**Goal:** Daily use loop—see tasks, log completion, track checkpoint progress.

### Tasks

- [ ] "Today" dashboard: tasks due today grouped by goal
- [ ] Quick-log buttons: Done | Partial | Skip
- [ ] Log model + API (`POST /api/logs`)
- [ ] Checkpoint progress calculation (% tasks complete, criteria met)
- [ ] Chat logging: "I finished today's coding task" → parsed and saved
- [ ] History view: last 14 days of logs

### Deliverables

- Functional daily logging from dashboard and chat
- Progress bars per active checkpoint

### Acceptance Criteria

- Completing all daily tasks updates checkpoint progress
- Skip/partial states stored correctly with timestamps
- Today view refreshes after log without full page reload

---

## Phase 4 — Gamification (Week 4–5)

**Goal:** Streaks, XP, and levels make progress feel rewarding.

### Tasks

- [x] XP rules: task complete (+10), partial (+5), checkpoint (+100), recovery restart (+25)
- [x] Level curve (e.g. level N requires N² × 50 XP)
- [x] Streak logic with **grace period** (configurable, default 1 day)
- [x] Streak states: active | at-risk | broken | recovering
- [x] Badge system (v1: 5 badges — First Log, 7-Day Streak, First Checkpoint, Recovery Hero, Level 5)
- [x] Progress page: XP bar, streak flame, badge grid, level title

### Deliverables

- Gamification engine as a service module (`lib/gamification.ts`)
- Visual streak + XP on dashboard

### Acceptance Criteria

- Missing one day triggers "at-risk" not immediate streak break (within grace)
- Second consecutive miss breaks streak and flags user for recovery (Phase 5)
- XP and level persist correctly across sessions

---

## Phase 5 — Recovery Coach (Week 5–6) ★ Core differentiator

**Goal:** When users miss tasks or go silent, AI generates a personalized recovery plan.

### Tasks

- [x] Miss detection job (cron or Vercel cron): no log in 24h → at-risk; 48h → recovery mode
- [x] Recovery prompt template (Gemini): context = missed tasks, streak, goal, user note
- [x] Recovery plan model: `{ reason, adjustedTasks[], newDeadline?, minimumViableDay, message }`
- [x] Recovery UI in chat: empathetic message + actionable steps
- [x] "Accept recovery plan" / "Adjust" flow in chat
- [x] Recovery streak badge when user logs within 72h of miss

### Recovery Prompt Principles

- Never shame; acknowledge context
- Offer **minimum viable day** (smallest action to restart)
- Optionally compress timeline or drop non-essential tasks
- Ask one clarifying question if miss reason unknown

### Deliverables

- End-to-end miss → notification → recovery plan → re-engagement flow

### Acceptance Criteria

- Simulated 2-day silence triggers recovery plan
- User accepting plan updates task list and checkpoint deadlines
- Recovery rate trackable in admin/analytics stub

---

## Phase 6 — Notifications & PWA (Week 6–7)

**Goal:** Installable app with reminders that bring users back.

### Tasks

- [x] PWA manifest, icons, service worker (Serwist or `@serwist/next`)
- [x] Web Push subscription flow (VAPID keys)
- [x] Push triggers: morning task reminder, at-risk streak, recovery nudge
- [ ] Email reminders via Resend (backup channel) — deferred
- [x] User notification preferences (time, channels, quiet hours)
- [x] Offline: cache Today view + last synced tasks

### Deliverables

- Install prompt on supported browsers
- Push notification on scheduled reminder time

### Acceptance Criteria

- App installable on iOS (Add to Home Screen) and Android
- User receives push at configured reminder time
- Today view loads offline with cached data

---

## Phase 7 — Weekly Review & Path Adjustments (Week 7–8)

**Goal:** AI proactively reviews progress and suggests path tweaks.

### Tasks

- [x] Weekly cron: aggregate logs → Gemini weekly review
- [x] Review card in chat + Progress page summary
- [x] Suggest path adjustments (add/remove tasks, extend checkpoint)
- [x] User approve/reject adjustments
- [x] Version path changes (`pathVersion` on goal)

### Deliverables

- Automated Sunday (or user-chosen day) review message

### Acceptance Criteria

- Review references actual log data from the week
- Approved adjustments update active path without losing history

---

## Phase 8 — Templates, Polish & Beta (Week 8–9)

**Goal:** Pre-built paths, UX polish, ready for real users.

### Tasks

- [x] Goal templates: Software Engineering, Gym Bulk, Language Learning, Reading Habit
- [x] Onboarding tour (3 steps: set goal → log task → understand recovery)
- [x] Empty states, loading skeletons, error boundaries
- [x] Mobile-first responsive pass
- [x] Accessibility audit (keyboard nav, ARIA on chat)
- [x] Rate limiting on AI routes
- [x] Basic analytics (PostHog or Plausible): signups, logs, recoveries

### Deliverables

- Template gallery on goal creation
- Beta-ready app

### Acceptance Criteria

- Lighthouse PWA score ≥ 90
- No critical a11y issues
- 5 beta users complete full loop (goal → log → miss → recover)

---

## Phase 9 — Scale & Monetization (Week 10+)

**Goal:** Optional paid tier and infrastructure for growth.

### Tasks

- [ ] Stripe: Free (1 active goal) vs Pro (unlimited goals, advanced reviews)
- [ ] Background worker (Inngest or BullMQ + Redis) for crons at scale
- [ ] Optional integrations: Google Calendar sync, GitHub activity
- [ ] Export data (JSON/CSV)
- [ ] Admin dashboard: user counts, recovery rate, AI cost

### Deliverables

- Pricing page + subscription flow
- Cost monitoring for Gemini API usage

---

## API Route Map (MVP)

| Method   | Route                          | Purpose                 |
| -------- | ------------------------------ | ----------------------- |
| GET      | `/api/health`                  | DB + service health     |
| GET/POST | `/api/auth/[...nextauth]`      | Auth                    |
| GET      | `/api/goals`                   | List user goals         |
| POST     | `/api/goals`                   | Create goal (manual)    |
| GET      | `/api/goals/[id]`              | Goal + path detail      |
| POST     | `/api/ai/plan`                 | Generate path from chat |
| POST     | `/api/ai/recovery`             | Generate recovery plan  |
| POST     | `/api/ai/review`               | Weekly review           |
| GET      | `/api/tasks/today`             | Today's tasks           |
| POST     | `/api/logs`                    | Create log entry        |
| GET      | `/api/progress`                | XP, streak, badges      |
| POST     | `/api/notifications/subscribe` | Web push subscription   |

---

## Folder Structure (Recommended)

```
comeback-ai/
├── app/
│   ├── (auth)/login/
│   ├── (app)/
│   │   ├── chat/
│   │   ├── today/
│   │   ├── progress/
│   │   └── settings/
│   └── api/
│       ├── ai/
│       ├── goals/
│       ├── logs/
│       └── notifications/
├── components/
│   ├── chat/
│   ├── dashboard/
│   └── ui/
├── lib/
│   ├── ai/          # Gemini clients + prompts
│   ├── db/          # Mongoose models
│   ├── gamification/
│   └── recovery/
├── types/
└── docs/
```

---

## Risk & Mitigation

| Risk                              | Mitigation                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------- |
| AI generates bad paths            | Strict Zod validation + retry + human-readable preview before save                |
| Users ignore notifications        | Grace periods + recovery coach; A/B test copy                                     |
| Gemini cost at scale              | Cache similar goal templates; rate limit; use Flash for routine, Pro for planning |
| Chat-only UX too slow for logging | Dashboard quick-actions always available                                          |
| Streak anxiety                    | Reframe as "active streak" with recovery; celebrate comebacks                     |

---

## Phase Priority Summary

| Phase | Name                 | Must-have for launch?         |
| ----- | -------------------- | ----------------------------- |
| 0     | Foundation           | Yes                           |
| 1     | Auth                 | Yes                           |
| 2     | AI Path Generation   | Yes                           |
| 3     | Task Logging         | Yes                           |
| 4     | Gamification         | Yes                           |
| 5     | Recovery Coach       | Yes — **this is the product** |
| 6     | PWA + Notifications  | Yes                           |
| 7     | Weekly Review        | Nice-to-have v1.1             |
| 8     | Templates + Polish   | Yes                           |
| 9     | Scale + Monetization | Post-launch                   |

**Minimum launch:** Phases 0–6 + 8 (skip weekly review for v1 if time-constrained).

---

## Suggested First Sprint (This Week)

If starting now, do Phase 0 + begin Phase 1:

1. `npx create-next-app@latest comeback-ai --typescript --tailwind --app`
2. MongoDB Atlas free tier + Mongoose User model
3. NextAuth Google provider
4. Empty shell with Chat | Today | Progress nav
5. Static chat UI with hardcoded coach greeting

That gives you a deployable base to iterate on AI path generation in Phase 2.
