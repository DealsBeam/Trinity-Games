# Trinity Games

A hand-reviewed index of decompilations, recompilations, ports and remakes of games. Static Astro site on GitHub Pages; a daily Action refreshes project data and redeploys.

- Live site: https://dealsbeam.github.io/Trinity-Games/
- Public repo: https://github.com/DealsBeam/Trinity-Games

No game files, ROMs, downloads or game assets are hosted or linked. Project links point to public repos. Buy links are Amazon affiliate links (tag `indkin-20`), marked `sponsored` with an on-page disclosure.

## Requirements

- Node >= 22.23.4 and npm
- Optional: GitHub CLI (`gh`), logged in, for local sync or manual Actions runs

## Local preview

```bash
git clone https://github.com/DealsBeam/Trinity-Games.git
cd Trinity-Games
npm ci
npm run dev          # http://localhost:4321/Trinity-Games/
npm run build
npm run check        # internal link check
npm run preview
```

The repo and Pages are already configured. No `git init`, `gh repo create` or Pages setup is needed.

To run the data sync locally (owner token required):

```bash
GITHUB_TOKEN=$(gh auth token) npm run sync
```

## How data works

- `data/sources.json` lists the 13 discovery sources.
- `data/games.json` is the catalog. Only entries with `"approved": true` appear on the site.
- The `site` workflow runs at 04:17 UTC daily and on push to `main`. It syncs data, commits changes as `sync-bot`, builds, and deploys to Pages. Manual run: `gh workflow run site`.
- The sync preserves owner-maintained fields: `title`, `type`, `stage`, `platform`, `original`, `summary`, `buy`, `buyConsole`, `featured`, `approved`, `rejected`, `notes`.

## Review entries (owner only)

```bash
git pull --rebase
npm run review
npm run check
git add data/games.json && git commit -m "review: batch" && git push
```

`npm run review` shows unreviewed repos (best candidates first) and asks approve / reject / skip. It saves after every answer, so you can quit any time. Use `npm run review -- --min-stars=0` to see low-star repos too. Every entry is hand-approved by the owner.

## Weekly routine (owner)

```bash
git pull --rebase
npm run review
npm run digest        # prints new releases for a post or newsletter
npm run check
git add data/games.json && git commit -m "review" && git push
```

## Editing an entry

Edit `data/games.json` by hand. Fields that survive sync:
`title`, `type` (`recomp` | `port` | `decomp` | `remake`), `stage` (`playable` | `builds-rom`), `platform`, `original`, `summary` (our own words), `buy` (game affiliate link), `buyConsole` (console affiliate link), `featured` (true on one entry), `approved`, `rejected`, `notes`.

## News

Add `src/content/news/my-post.md`:

```md
---
title: Post title
date: 2026-11-30
summary: One line.
---
Body in Markdown.
```

## Contributing

Open an issue or PR with a public project repo. Please do not add game files, downloads or copyrighted assets. The owner reviews and approves all entries.

## Troubleshooting

- **`git push` rejected:** the bot committed data in the meantime. Run `git pull --rebase`, then push.
- **Sync says "refusing to continue":** a safety check tripped; nothing was overwritten. Re-run with `gh workflow run site`.
- **Build fails on internal links:** run `npm run check`.
- **Local sync returns 401/403:** check `gh auth status` and `GITHUB_TOKEN`.
- **Custom domain later:** configure it in Pages settings, then `gh variable set CUSTOM_DOMAIN --body "example.com"`.

## Before you promote

Check the name against trademark databases, review the About, Takedown and Privacy wording, and keep the no-hosting rule strict.
