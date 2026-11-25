# Trinity Games

A hand-reviewed index of decompilations, recompilations and PC ports of classic games.
Static Astro site on GitHub Pages. A daily GitHub Action refreshes project data and redeploys.

## Setup

Needs Node >= 22.23.4, git, and the GitHub CLI logged in (`gh auth status`).

```bash
npm ci
git init -b main
git add -A && git commit -m "init"
gh repo create trinity-games --public --source=. --remote=origin --push
gh api -X POST 'repos/{owner}/{repo}/pages' -f build_type=workflow || gh api -X PUT 'repos/{owner}/{repo}/pages' -f build_type=workflow
gh workflow run site
gh run watch
```

The run triggered by the first push may fail at the deploy step because Pages was not enabled yet. That is expected. The manual `gh workflow run site` is the one that counts.

Your site: `https://<your-username>.github.io/trinity-games/`

## First sync, then review

```bash
git pull --rebase
jq 'length' data/games.json
npm run review
git add -A && git commit -m "review: first batch" && git push
```

`npm run review` shows unreviewed repos (best candidates first) and asks approve / reject / skip. It saves after every answer, so you can quit any time. Only approved entries appear on the site. Use `npm run review -- --min-stars=0` to see low-star repos too.

## Weekly routine

```bash
git pull --rebase
npm run review
npm run digest        # new releases this week, for your post or newsletter
git add -A && git commit -m "review" && git push
```

## Editing an entry

Edit `data/games.json` by hand. These fields survive every sync:
`title`, `type` (recomp | port | decomp | remake), `stage` (playable | builds-rom), `platform`, `original`, `summary` (your own words), `buy` (affiliate link), `featured` (true on one entry), `approved`, `rejected`.

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

## Local preview

```bash
npm run dev          # http://localhost:4321/trinity-games/
npm run build && npm run preview
GITHUB_TOKEN=$(gh auth token) npm run sync    # run the data sync locally
```

## Troubleshooting

- **Deploy fails / Pages not found:** run the `gh api ... pages` command above, then `gh workflow run site`.
- **`git push` rejected:** the bot committed data in the meantime. Run `git pull --rebase`, then push.
- **"Commit refreshed data" fails with a permission error:** `gh api -X PUT 'repos/{owner}/{repo}/actions/permissions/workflow' -f default_workflow_permissions=write`
- **Sync says "refusing to continue" or "reported missing at once":** a safety check tripped, usually a source outage or a GitHub hiccup. Nothing was overwritten. Re-run later with `gh workflow run site`.
- **Rename the repo?** Do it before you share the link. The base path comes from the repo name.
- **Custom domain later:** set the domain in the repo's Pages settings, then `gh variable set CUSTOM_DOMAIN --body "yourdomain.com"`.

## Before you promote it

Check the name against trademark databases, read the About, Takedown and Privacy pages and adjust the wording to what you actually do, and keep the no-hosting rule strict.
