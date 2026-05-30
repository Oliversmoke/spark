# ComeBack.ai

**An AI recovery coach for skills, habits, and goals.**

ComeBack.ai helps you learn skills and build habits through checkpoints, streaks, and personalized recovery when life gets in the way. Instead of punishing missed days, it helps you get back on track.

---

## The Problem

Most habit and learning apps assume perfect consistency. When you miss a checkpoint, they show a broken streak and leave you to figure out what to do next. That guilt spiral is why people quit.

ComeBack.ai is built around a different assumption: **missed checkpoints are normal**. The product's core job is to keep momentum—not perfection.

---

## Product Vision

ComeBack.ai is a **gamified, chat-first coach** that:

1. Turns vague goals ("learn software engineering", "bulk at the gym") into structured paths with tasks and checkpoints
2. Prompts you to log progress on a schedule you choose (daily, weekly, custom intervals)
3. Celebrates consistency with XP, levels, streaks, and milestones
4. **Recovers with you** when you slip—generating a personalized catch-up plan instead of resetting your progress

---

## Target Users

| Persona | Goal example | Pain today |
|---------|--------------|------------|
| Skill learner | Become a software engineer | Overwhelmed by unstructured tutorials; quits after missing a week |
| Fitness builder | Bulk / cut / strength program | Gym apps don't adapt when travel or injury breaks the plan |
| Habit builder | Read daily, meditate, journal | Streak apps feel punitive after one miss |
| Career switcher | Pass certification, build portfolio | No system connecting daily work to long-term outcome |

---

## Core Concepts

### Goal
A long-term outcome the user wants (e.g. "Ship my first full-stack app in 6 months").

### Path
An AI-generated roadmap broken into **phases** → **checkpoints** → **tasks**.

### Checkpoint
A measurable milestone (e.g. "Complete 10 LeetCode mediums", "Hit 185 lb bench"). Checkpoints unlock the next phase.

### Task
A concrete action to log (daily workout, 1 hour of coding, protein target). Tasks roll up into checkpoint progress.

### Log
A user submission: completed, partial, skipped, or failed—with optional notes, photos, or metrics.

### Streak
Consecutive periods where the user met their minimum commitment. ComeBack.ai distinguishes **hard streaks** (no misses) from **active streaks** (missed but recovered within the grace window).

### Recovery Plan
When the user misses tasks or a checkpoint deadline, the AI coach generates a adjusted plan: scope reduction, rescheduling, alternative tasks, and a "minimum viable day" to restart momentum.

---

## Key Features

### MVP (Phase 1–2)
- Chat-based onboarding: describe your goal, AI proposes a path
- Daily/weekly task list with one-tap logging
- Checkpoint progress dashboard
- Basic gamification: XP, level, streak counter
- Miss detection + AI recovery message in chat
- Email reminders

### Growth (Phase 3–4)
- Push notifications (PWA)
- Recovery plans with rescheduled checkpoints
- Habit templates (SWE, gym, language learning, etc.)
- Weekly AI review: what worked, what to adjust
- Offline task viewing (PWA cache)

### Scale (Phase 5+)
- Social accountability (optional partners)
- Integrations (Google Calendar, Apple Health, GitHub commits)
- Multi-goal management with priority balancing
- Analytics: completion rate, recovery success, time-to-checkpoint
- Paid tier: advanced coaching, unlimited goals, export

---

## Recommended UX: Chat + Dashboard Hybrid

**Primary surface: Chat**

The chat is the coach. Users:
- Set and refine goals in natural language
- Log tasks conversationally ("did legs today, 4x8 squat at 225")
- Receive recovery guidance when they report a miss or go silent

**Secondary surface: Dashboard**

A focused view for:
- Today's tasks (quick complete buttons)
- Active checkpoint progress bar
- Streak, XP, and next milestone
- Recovery plan steps (when active)

This beats chat-only because habit apps need **glanceable, low-friction logging**. Chat handles nuance; the dashboard handles speed.

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | **Next.js 15** (App Router) | SSR, API routes, great PWA support |
| PWA | `next-pwa` or Serwist | Installable app, push notifications, offline shell |
| UI | Tailwind + shadcn/ui | Fast, accessible components |
| Backend | **Next.js Route Handlers** (MVP) | Single deploy; add Express later if needed |
| Database | **MongoDB** (+ Mongoose) | Flexible schemas for goals, paths, logs |
| Auth | **NextAuth.js** (Google + email) | Low friction signup |
| AI | **Google Gemini API** | Goal planning, recovery plans, weekly reviews |
| Notifications | Resend (email) + Web Push (PWA) | Reminders + recovery nudges |
| Hosting | Vercel + MongoDB Atlas | Simple CI/CD |

> **Note on MERN:** Next.js replaces the separate Express + React split for MVP. You still get MongoDB + Node. Add a standalone Express service only if you need background workers at scale (Phase 5+).

---

## AI Responsibilities (Gemini)

| Flow | Input | Output |
|------|-------|--------|
| Goal intake | User describes goal + constraints | Structured path JSON (phases, checkpoints, tasks) |
| Daily coach | Today's tasks + recent logs | Encouragement, tips, micro-adjustments |
| Miss recovery | Missed tasks, streak state, user context | Recovery plan: what to do today, revised timeline |
| Weekly review | 7 days of logs | Summary, pattern insights, path tweaks |
| Checkpoint eval | Logs + checkpoint criteria | Pass / partial / extend deadline recommendation |

All AI outputs that mutate user data should be **validated against a schema** before saving (Zod).

---

## Data Model (High Level)

```
User
  ├── goals[]
  │     ├── path (phases → checkpoints → tasks)
  │     ├── schedule (frequency, reminder times)
  │     ├── streak { current, longest, graceDays }
  │     └── recoveryPlan? (active when in recovery mode)
  ├── logs[] (taskId, status, value, note, timestamp)
  ├── gamification { xp, level, badges[] }
  └── chatMessages[] (or separate ChatSession collection)
```

---

## Success Metrics

- **7-day retention** after creating first goal
- **Recovery rate**: % of users who miss ≥1 task and log again within 3 days
- **Checkpoint completion rate** within original or recovered deadline
- **DAU/MAU** for logging (not just opening the app)

---

## Naming & Brand

**ComeBack.ai** — you missed a checkpoint; your coach calls you back. Short, memorable, matches the workspace.

Tagline options:
- *"Miss a day. Don't miss the goal."*
- *"Your AI coach for getting back on track."*

---

## Next Steps

See [BUILD_PHASES.md](./BUILD_PHASES.md) for the full phased implementation plan.
