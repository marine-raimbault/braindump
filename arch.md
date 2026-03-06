# Braindump Architecture

Zero-friction personal knowledge tool. Type random thoughts, AI classifies them, stores as markdown in GitHub, quizzes you with spaced repetition, sends daily coaching via Telegram.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | SvelteKit 5 + Vite 6 |
| Storage | GitHub Contents API → private repo |
| AI | Cloudflare Workers AI (Llama 3.1, free) or Anthropic (optional) |
| Hosting | Cloudflare Pages |
| Notifications | Telegram Bot API |
| User Store | Cloudflare KV |
| Cron | External (cron-job.org) |

## URLs

| What | Where |
|------|-------|
| App | https://braindump-cxq.pages.dev/ |
| Data repo | https://github.com/marine-raimbault/braindump-data |
| Code repo | https://github.com/marine-raimbault/braindump |

## Data Format

Each entry = one `.md` file with YAML frontmatter:

```yaml
---
id: 2026-02-20-143052
category: command|concept|insight|task|question|reference|raw
title: "Short title"
tags: [tag1, tag2]
trainable: true
training_q: "Question for spaced repetition"
reviews: 3
lastReview: 2026-02-20T10:00:00Z
created: 2026-02-20T09:00:00Z
---

The actual content/note here
```

## Folder Structure (Domain-based)

```
braindump-data/
  daily/      # quick dumps, random thoughts
  skills/     # learning, technical knowledge
  goals/      # objectives, milestones, OKRs
  health/     # fitness, nutrition, sleep
  library/    # book notes, articles, quotes
  vision.json # North Star vision config
```

AI auto-routes entries to the right domain folder based on content.

## Views

1. **dump** — minimal input, auto-classified on enter
2. **recall** — search/filter entries by text, tags, category
3. **train** — flashcard review with hints, forgot/hard/easy rating
4. **vision** — North Star vision, role models, growth areas
5. **settings** — connect GitHub, AI, Telegram, daily coaching

## Key Files

### Frontend
- `src/lib/github.js` — GitHub Contents API client (domain-aware)
- `src/lib/classifier.js` — AI classification (Cloudflare or Anthropic)
- `src/lib/markdown.js` — frontmatter parser/serializer
- `src/lib/stores/entries.js` — Svelte store with domain support
- `src/lib/components/` — DumpView, RecallView, TrainView, VisionView, SettingsView, Nav

### Backend (Cloudflare Pages Functions)
- `functions/api/classify.js` — AI classification endpoint
- `functions/api/hint.js` — AI hint generation for training
- `functions/api/vision.js` — Vision/North Star CRUD
- `functions/api/digest.js` — Generate and send Telegram digest
- `functions/api/coaching/register.js` — Register/unregister for daily coaching
- `functions/api/coaching/send.js` — Cron endpoint to send coaching to all users
- `functions/api/telegram/webhook.js` — Interactive Telegram bot
- `functions/api/telegram/callback.js` — Handle inline button presses
- `functions/api/telegram/setup.js` — Set webhook URL

### Config
- `wrangler.toml` — Cloudflare bindings (AI, KV)
- `.env.local` — Local dev credentials (gitignored)

## Features

### AI Classification
- User types anything → AI classifies into category
- Generates title, tags, summary
- Marks trainable entries with training questions
- **Free** via Cloudflare Workers AI (Llama 3.1)
- Optional upgrade to Anthropic Claude

### Spaced Repetition Training
- Trainable entries become flashcards
- Hint generation via AI
- Rating: forgot / hard / easy
- Mastery levels: New → Seen → Learning → Familiar → Known → Mastered

### Telegram Integration
- Connect via bot token + chat ID
- **Send digest now** — on-demand learning summary
- **Daily coaching** — automated morning motivation
- **Interactive bot** — full braindump via chat:
  - Send any message → auto-classified and saved
  - `/train` — random flashcard quiz with inline buttons
  - `/stats` — brain stats by domain
  - `/domains` — domain guide
  - `/help` — all commands

### Vision / North Star
- Define who you're becoming
- Add role models with traits to adopt
- Track growth areas with progress (1-5)
- Daily reflection question
- Guides AI coaching context

### Daily Coaching System
1. User enables coaching in settings
2. Credentials stored in Cloudflare KV
3. External cron hits `/api/coaching/send` at 7 AM
4. For each registered user:
   - Fetch their entries from GitHub
   - Generate personalized coaching via AI
   - Send via Telegram

## Deployment

### Manual
```bash
npm run build
npx wrangler pages deploy build --project-name braindump
```

### CI/CD (automatic)
Push to `main` → GitHub Actions → Cloudflare Pages

Workflow: `.github/workflows/deploy.yml`

## Setup Required

1. **GitHub PAT** with `repo` scope (required)
2. **Anthropic API key** (optional - Cloudflare AI is free default)
3. **Telegram bot** (optional - for digests and coaching)
4. **Cron service** (optional - for daily coaching)

---

# Development Log

## Session: Vision & Interactive Telegram

### What was built
1. **Vision / North Star feature**
   - `VisionView.svelte` — UI for defining personal vision
   - `functions/api/vision.js` — API to store/retrieve vision in GitHub
   - Role models with traits to adopt
   - Growth areas with progress tracking (1-5)
   - Daily reflection question

2. **Interactive Telegram Bot**
   - `functions/api/telegram/webhook.js` — Full webhook handler
   - `functions/api/telegram/callback.js` — Inline button callbacks
   - Commands: `/train`, `/stats`, `/domains`, `/help`
   - Send any message → auto-classified → saved to GitHub
   - Flashcard quiz with reveal answer + rating buttons
   - Stats by domain

3. **Domain-based folder structure**
   - Changed from flat `entries/` to domain folders
   - AI auto-routes content to: `daily/`, `skills/`, `goals/`, `health/`, `library/`
   - Updated `github.js` and `classifier.js` for domain support

4. **Environment fixes**
   - Set `BOT_TOKEN` as Cloudflare Pages secret
   - Fixed webhook to handle unregistered users

---

## Session: Initial Build

### What was built
1. Fixed npm dev server (added `"type": "module"`)
2. Created GitHub repos (app + data)
3. Deployed to Cloudflare Pages
4. Added Cloudflare Access (later removed for public access)
5. Set up CI/CD via GitHub Actions
6. Added `.env.local` support for local dev
7. Changed filenames from random IDs to date-based (`2026-02-20-143052.md`)

### AI Integration
1. Added Cloudflare Workers AI as free default
2. Anthropic as optional upgrade
3. Updated Settings UI to show which AI is active

### Telegram Features
1. Added bot token + chat ID config
2. "Send digest now" button
3. Daily coaching registration
4. KV store for user preferences
5. Cron endpoint for automated coaching

## PM Approach

### Principles
- **Ship fast** — deploy after each feature
- **Start simple** — flat folder, tags over structure
- **User owns data** — markdown files in their GitHub
- **Free by default** — Cloudflare AI, no paid APIs required
- **Progressive enhancement** — basic works, AI adds magic

### Decision: Domain-based Folder Structure

**Implemented: Domain folders**
```
braindump-data/
  daily/      # quick dumps, random thoughts
  skills/     # learning paths, technical knowledge
  goals/      # OKRs, milestones, progress tracking
  health/     # workouts, meals, sleep, fitness
  library/    # book notes, articles, quotes
```

**Why domain folders:**
- AI auto-classifies content into appropriate domain
- Better context management for coaching
- Smaller, focused context per domain
- Can have specialized coaches per domain
- Tags still available within domains for filtering

### Decision: Multiple Coaches

**Current: One general coach**
- Sees all entries
- Generic motivation + tips

**Future: Specialized coaches**
```
/api/coaching/health    → only health entries
/api/coaching/learning  → only skill entries
/api/coaching/goals     → only goal entries
```

**Benefits:**
- Smaller, focused context
- More relevant advice
- Different schedules (health: morning, goals: weekly)

**Implementation:**
- Filter entries by tag prefix (`health:*`, `skill:*`, `goal:*`)
- Separate cron jobs per coach
- User enables/disables each coach

---

# Future Ideas

### Input Sources
- [ ] URL ingestion (paste article → AI extracts insights)
- [ ] Voice notes (Whisper transcription)
- [ ] Kindle/Readwise import
- [ ] Screenshot OCR

### Output/Coaching
- [ ] Multiple specialized coaches
- [ ] Weekly review digest
- [ ] Progress visualization
- [ ] Knowledge graph

### Social
- [ ] Public shared dumps
- [ ] Follow experts
- [ ] Community challenges

### Integrations
- [ ] Apple Health / Strava sync
- [ ] Calendar integration
- [ ] Obsidian sync
