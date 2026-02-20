# ◈ braindump

A zero-friction second brain. Dump anything — commands, concepts, ideas — and it organizes, stores, and trains you on your own knowledge.

**Stack:** SvelteKit · GitHub API · Anthropic Claude · GitHub Pages  
**Cost:** $0 (plus ~$0.01/day Anthropic API usage)  
**Data:** Markdown files in your private GitHub repo. You own everything.

## Quick Start

### 1. Create your data repo

Go to [github.com/new](https://github.com/new) and create a **private** repo called `braindump-data` (or whatever you want). Leave it empty.

### 2. Generate a GitHub Personal Access Token

Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new?scopes=repo&description=braindump)

- **Note:** `braindump`
- **Scopes:** check `repo` (full control of private repos)
- **Expiration:** pick something reasonable (90 days, or no expiration for personal use)
- Copy the token — you'll need it in step 5

### 3. Get an Anthropic API Key

Go to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) and create a key. This is optional — without it, entries save as raw notes without classification or training.

### 4. Clone and run

```bash
git clone <this-repo-url> braindump
cd braindump
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173)

### 5. Configure

The app opens to Settings on first launch. Paste your:
- GitHub repo: `yourname/braindump-data`
- GitHub token: `ghp_...`
- Anthropic key: `sk-ant-...` (optional)

These are stored in your browser's localStorage. Never committed, never sent anywhere except their respective APIs.

## Deploy to GitHub Pages (free)

This gives you a URL you can access from your phone while walking, on any device.

### Option A: Quick deploy

```bash
npm run deploy
```

This builds and pushes to the `gh-pages` branch. Then:
1. Go to your **app repo** → Settings → Pages
2. Set Source to "Deploy from a branch"
3. Branch: `gh-pages`, folder: `/ (root)`
4. Your app is live at `https://yourname.github.io/braindump`

### Option B: GitHub Actions (auto-deploy on push)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: build
      - id: deployment
        uses: actions/deploy-pages@v4
```

Push to `main` → auto-deploys.

## How It Works

### Data Flow
```
You type → Claude classifies → Markdown file → GitHub API → Your private repo
                                                    ↑
                                             Any device reads from here
```

### Each entry becomes a file like this:

```markdown
---
id: m1abc2d
category: command
title: "Postgres active users query"
tags: [sql, postgres, users]
trainable: true
training_q: "How do you select active users ordered by creation date?"
reviews: 3
lastReview: 2026-02-20T15:30:00Z
created: 2026-02-20T09:00:00Z
---

SELECT * FROM users WHERE active = true ORDER BY created_at DESC
```

Readable. Browsable on GitHub. Obsidian-compatible. Yours forever.

### Three modes

- **dump** — Type anything, hit enter. AI classifies it silently.
- **recall** — Search and filter your brain. Find that SQL query from 3 weeks ago.
- **train** — Spaced repetition from your own notes. Tracks mastery over time.

## Important Note on `svelte.config.js`

The `paths.base` setting must match your GitHub repo name:

```js
paths: {
    base: process.env.NODE_ENV === 'production' ? '/braindump' : ''
}
```

If your repo is called `my-brain`, change `/braindump` to `/my-brain`.

## Future Ideas

- [ ] Offline mode with IndexedDB + background sync
- [ ] Import highlights from Kindle/Readwise
- [ ] URL ingestion (paste a link, it extracts key concepts)
- [ ] Daily review reminder (PWA notifications)
- [ ] Export to Obsidian vault format
- [ ] Tag-based knowledge graph visualization
