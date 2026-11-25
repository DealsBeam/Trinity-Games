## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Project conventions (Trinity Games)

- Static Astro site on GitHub Pages. Build links with `u()` from `src/site.ts`, never hard-coded `/paths`, because the site lives under `/<repo>/`.
- Data flow: `scripts/sync.mjs` refreshes `data/games.json` and `data/changes.json` daily. Pages read them through `src/lib/games.ts`. Only entries with `approved: true` and `gone: false` are shown.
- Manual fields in `data/games.json` survive syncs: `title`, `type` (recomp|port|decomp|remake), `stage` (playable|builds-rom), `platform`, `original`, `summary`, `buy`, `featured`, `approved`, `rejected`.
- Keep it small: no new dependencies unless something cannot be done with the platform or what is already here.
- Never host or link to game files or downloads. The design brief is the launcher layout in `src/styles/global.css` and `src/layouts/Base.astro`.
