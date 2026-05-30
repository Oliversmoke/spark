# ComeBack AI

> **The AI Recovery Coach That Helps You Restart**  
> Because most people don't fail — they just stop trying.

[![Build With AI Hackathon](https://img.shields.io/badge/GDG%20Lagos-2025-4285F4?style=flat-square&logo=google)](https://gdg.community.dev/gdg-lagos/)
[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Powered-4285F4?style=flat-square&logo=google-cloud)](https://cloud.google.com/)
[![Gemini 2.5](https://img.shields.io/badge/Gemini-2.5-8E75B2?style=flat-square)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Latest-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

---

## 🎯 The Problem We Solve

Every year, millions of people start goals with genuine intent. They create plans, set deadlines, and begin with enthusiasm. Then life happens. They miss a few days. Feel like failures. And quietly abandon their goals.

**This is Silent Abandonment** — the universal pattern where people don't fail because they lack knowledge or planning, but because they have no system to help them recover when they inevitably fall off track.

### The Gap in Existing Solutions

| App | What It Does Well | The Fatal Flaw |
|-----|------------------|----------------|
| Notion AI | Organization and planning | No accountability or recovery system |
| Todoist | Simple task management | Tasks pile up, guilt builds, users quit |
| Motion | AI scheduling | Expensive and punishes failure |
| ChatGPT | Great advice | No long-term memory or follow-up |
| Habitica | Gamification | Punishes missed days, increases guilt |
| Duolingo | Streak motivation | Only works for language learning |

**The Pattern:** All these apps reward success. None are built for failure. But failure is where users spend most of their time.

---

## 💡 Our Solution

**ComeBack AI** is an AI-powered recovery coach that helps students, professionals, and learners restart abandoned goals through intelligent recovery plans, compassionate accountability, and personalized coaching that understands failure is part of the journey.

### How It Works

1. **Tell ComeBack AI your goal** — "I want to become a frontend developer by December 2026"
2. **AI creates a realistic plan** — Monthly milestones, weekly targets, daily tasks
3. **Daily check-ins** — "Did you complete today's task?"
4. **When you miss days** — AI creates a Recovery Plan (not punishment)
5. **Gradual momentum rebuild** — Start with 15 minutes, gradually return to normal
6. **Continuous adaptation** — AI learns your patterns and adjusts accordingly

### The Magic Moment

When you return after 12 days of silence:
- **Other apps say:** "You failed. Start over."
- **ComeBack AI says:** "Welcome back. Let's rebuild your momentum together."

This changes everything.

---

## ✨ What Makes Us Unique

### 1. Recovery-First Design
Built specifically for people who have abandoned goals. The entire product is designed around the restart moment, not the start moment.

### 2. Compassionate AI
AI that understands failure is normal. No guilt trips. No punishment. Just intelligent support that meets you where you are.

### 3. Behavioral Intelligence
AI learns your patterns — when you struggle, what causes burnout, what helps you recover — and adapts your plan in real-time.

### 4. Voice-First Interaction
Talk to ComeBack AI like a real coach. No typing. No forms. Just conversation powered by Gemini 2.5.

---

## 🎯 Target Users

| User Group | Who They Are | Their Pain Point | How We Help |
|------------|--------------|------------------|-------------|
| **Tech Learners** | 18-30 year olds learning frontend, backend, DevOps, data analytics | Abandon learning roadmaps after 2-3 weeks | AI creates recovery plans that rebuild momentum gradually |
| **University Students** | Undergrads and postgrads balancing academics, skills, internships | Get overwhelmed by multiple goals | AI prioritizes goals and detects burnout early |
| **Young Professionals** | 22-35 year olds pursuing certifications, career growth, side hustles | Buy courses but never finish them | AI tracks real behavior and adjusts timelines |

**Market Size:** 5-10 million users in Nigeria alone. Global potential is massive.

---

## 🚀 Core Features

### Goal Creation & AI Planning
- Natural language goal input
- AI-generated monthly milestones
- Weekly targets and daily tasks
- Realistic timelines based on your capacity

### Daily Check-Ins
- Simple Yes/No/Partial responses
- Voice message support (Gemini-powered)
- Quick tap buttons for mobile
- Contextual follow-up questions

### The Recovery Engine ⭐ *Core Feature*
When you miss days, AI creates an intelligent Recovery Plan:
- **Day 1:** 15 minutes (just show up)
- **Day 2:** 30 minutes (build momentum)
- **Day 3:** 45 minutes (getting back to normal)
- **Day 4:** Back to your regular schedule

### Burnout Detection
AI monitors your behavior patterns and proactively suggests:
- Lighter targets when you're struggling
- Rest days when needed
- Breaking big tasks into smaller ones

### Progress Journal
- Weekly AI-generated summaries
- Trend analysis over time
- Pattern identification
- Small win celebrations

### Voice Coaching
Talk to AI like a real coach:
- **You:** "I've been really tired this week"
- **AI:** "I hear you. Let's reduce today's target to just 15 minutes. Sometimes showing up is enough."

---

## 🛠️ Technology Stack

We're using the latest versions of modern, production-ready technologies:

### Frontend
- **React 18.3** with TypeScript 5.6
- **Material-UI (MUI) v6** for beautiful, accessible components
- **Vite 6** for lightning-fast development
- **React Router v7** for navigation

### AI & Backend
- **Google Gemini 2.5** via AI Studio (function calling, embeddings, multimodal)
- **Firebase Firestore** for real-time database
- **Cloud Functions** (Node.js 20) for serverless backend
- **Firebase Authentication** (Google Sign-In, Phone OTP)

### Infrastructure
- **Firebase Hosting** with CDN
- **Google Cloud Platform** for all services
- **GitHub Actions** for CI/CD

### Development Tools
- **ESLint 9** with TypeScript support
- **Prettier 3** for code formatting
- **Vitest** for unit testing
- **Playwright** for E2E testing

---

## 🤖 The Three AI Agents

### 1. Goal Planner Agent
Converts user goals into actionable plans using Gemini function calling.
- **Input:** "I want to become a frontend developer by December 2026"
- **Output:** Structured monthly milestones, weekly targets, daily tasks

### 2. Recovery Agent ⭐ *Core Innovation*
Creates intelligent recovery plans when users miss days.
- Monitors days missed and completion patterns
- Generates gradual recovery plans
- Adjusts based on user response

### 3. Motivation Agent
Provides empathetic coaching and detects burnout.
- Analyzes user language and completion patterns
- Detects burnout signals early
- Responds with compassionate messages

---

## 📦 Getting Started

### Prerequisites
- Node.js 20+ and npm 10+
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud account with Gemini API access

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/comeback-ai.git
cd comeback-ai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your Firebase and Gemini API credentials

# Start development server
npm run dev
```

### Environment Variables

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests
```

---

## 🏗️ Project Structure

```
comeback-ai/
├── src/
│   ├── components/        # React components
│   │   ├── goals/        # Goal-related components
│   │   ├── checkins/     # Check-in components
│   │   ├── recovery/     # Recovery plan components
│   │   └── shared/       # Shared UI components
│   ├── services/         # Business logic
│   │   ├── ai/          # AI agent implementations
│   │   ├── firebase/    # Firebase services
│   │   └── api/         # API integrations
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── App.tsx          # Main application component
├── functions/           # Cloud Functions
│   ├── src/
│   │   ├── agents/     # AI agent logic
│   │   ├── triggers/   # Firestore triggers
│   │   └── api/        # HTTP endpoints
├── firestore.rules     # Firestore security rules
├── firebase.json       # Firebase configuration
└── package.json        # Dependencies
```

---

## 🎨 Design Philosophy

### Compassion Over Punishment
Every interaction is designed to be supportive, not judgmental. We meet users where they are.

### Simplicity Over Complexity
Clean interfaces. Clear language. No overwhelming dashboards or confusing metrics.

### Progress Over Perfection
We celebrate small wins and gradual improvement. Consistency beats intensity.

### Intelligence Over Automation
AI adapts to user behavior rather than forcing users to adapt to rigid systems.

---

## 🌍 Impact & Vision

### The Human Impact

**Reframes Failure:** People stop seeing themselves as failures and start seeing themselves as humans who are learning and growing.

**Builds Self-Compassion:** Users internalize the AI's compassion and become kinder to themselves.

**Creates Sustainable Habits:** Habits built on real capacity, not idealized versions of ourselves.

**Reduces Shame:** Normalizes failure and shows users they're not alone.

**Increases Completion Rates:** People with recovery systems are 3-5x more likely to complete goals.

### Long-Term Vision

In 5 years, we want people to say:

> "I used to abandon goals all the time. Then I found ComeBack AI. Now I finish what I start — not because I'm perfect, but because I have a system that helps me restart when I fall."

---

## 📊 Market Opportunity

- **92%** of people abandon New Year resolutions by February
- **70%** of online course buyers never finish the course
- **$96.36B** global productivity app market by 2030
- **2M+** university students in Nigeria
- **500K+** Nigerians actively learning tech skills

**The Gap:** Huge market, but nobody is solving the recovery problem. This is a blue ocean opportunity.

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

Built with ❤️ by the ComeBack AI team for the Build With AI Hackathon, GDG Lagos 2025.

---

## 🙏 Acknowledgments

- **GDG Lagos** for organizing the Build With AI Hackathon
- **Google Cloud** for providing the infrastructure
- **Gemini Team** for the powerful AI capabilities
- **Everyone who has ever abandoned a goal** — this is for you

---

## 📞 Contact & Support

- **Website:** [comeback-ai.com](https://comeback-ai.com) *(coming soon)*
- **Email:** hello@comeback-ai.com
- **Twitter:** [@ComeBackAI](https://twitter.com/ComeBackAI)
- **Discord:** [Join our community](https://discord.gg/comeback-ai)

---

<div align="center">

**ComeBack AI — Helping people restart what they never should have stopped.**

[Get Started](#-getting-started) • [View Demo](https://demo.comeback-ai.com) • [Read Docs](https://docs.comeback-ai.com)

</div>