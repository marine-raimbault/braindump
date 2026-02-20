# Braindump Architecture

Zero-friction personal knowledge tool. Type random thoughts, AI classifies them, stores as markdown in GitHub, quizzes you with spaced repetition.

## Stack

- **Frontend:** SvelteKit 5 + Vite 6
- **Storage:** GitHub Contents API → `marine-raimbault/braindump-data` (private)
- **AI:** Anthropic API (Claude) for classification + hints
- **Hosting:** Cloudflare Pages
- **Auth:** Cloudflare Access (email-only access)

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
id: abc123
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

## Views

1. **dump** — minimal input, auto-classified on enter
2. **recall** — search/filter entries by text, tags, category
3. **train** — flashcard review with hints, forgot/hard/easy rating

## Key Files

- `src/lib/github.js` — GitHub Contents API client
- `src/lib/classifier.js` — Anthropic API for classification + hints
- `src/lib/markdown.js` — frontmatter parser/serializer
- `src/lib/stores/entries.js` — Svelte store with optimistic updates
- `src/lib/components/` — DumpView, RecallView, TrainView, SettingsView, Nav

## Deployment

```bash
npm run build
npx wrangler pages deploy build --project-name braindump
```

## Setup Required

1. GitHub PAT with `repo` scope
2. Anthropic API key (optional, for AI features)
3. Both stored in browser localStorage
