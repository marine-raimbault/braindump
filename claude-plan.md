Here's a handoff summary:

---

**Project: braindump**

A zero-friction personal knowledge tool. You type random thoughts, commands, concepts during work — AI classifies them automatically, stores them as markdown files in a private GitHub repo, and later quizzes you on them with spaced repetition.

**Stack chosen:**
- SvelteKit 5 + Vite 6 (user knows Vue from work, chose Svelte for this project — lighter, faster bundle for mobile)
- GitHub Contents API for storage/sync (no backend, no database)
- Markdown files with YAML frontmatter as data format (future-proof, Obsidian-compatible, human-readable on GitHub)
- Anthropic API called directly from browser (key in localStorage)
- GitHub Pages for free deployment (static adapter, SPA mode)

**Architecture:**
- Two repos: `braindump` (app code, deployed to GitHub Pages) and `braindump-data` (private, stores markdown entries via GitHub API)
- Each brain dump = one `.md` file with frontmatter (id, category, tags, trainable, training_q, reviews, lastReview, created)
- Classification via Claude Sonnet: categorizes into command/concept/insight/task/question/reference/raw, generates tags and training questions
- Spaced repetition training view with mastery levels (New → Seen → Learning → Familiar → Known → Mastered)

**Three views:**
1. **dump** — minimal input, type anything, auto-classified on enter
2. **recall** — search/filter your entries by text, tags, category
3. **train** — flashcard-style review with hints, forgot/hard/easy rating

**Current state:**
- Full SvelteKit project scaffolded and zipped, ready to `npm install && npm run dev`
- Had a dependency conflict (`@sveltejs/vite-plugin-svelte` v4 vs Vite 6) — fixed by bumping to v5
- Not yet deployed or tested end-to-end
- User needs to: create the data repo, generate GitHub PAT, optionally get Anthropic key, deploy via `npm run deploy` + enable GitHub Pages

**Key files:**
- `src/lib/github.js` — GitHub Contents API client (CRUD for markdown files)
- `src/lib/classifier.js` — Anthropic API for classification + hints
- `src/lib/markdown.js` — frontmatter parser/serializer (no dependencies)
- `src/lib/stores/entries.js` — Svelte store with optimistic updates + background sync
- `src/lib/components/` — DumpView, RecallView, TrainView, SettingsView, Nav
- `svelte.config.js` — static adapter, `paths.base` must match repo name

**Future ideas discussed:** offline IndexedDB + sync, Kindle/Readwise import, URL ingestion, PWA notifications, knowledge graph visualization.
