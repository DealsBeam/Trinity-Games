import data from '../../data/games.json';
import changeLog from '../../data/changes.json';

export type Game = {
  repo: string; url: string; description: string | null; stars: number; archived: boolean;
  pushedAt: string; license: string | null; release: { tag: string; date: string } | null;
  title: string; slug: string; type?: string; stage?: string; platform?: string;
  original?: string; summary?: string; buy?: string; featured?: boolean;
};

const TYPES: Record<string, string> = { recomp: 'Recomp', port: 'Source port', decomp: 'Decomp', remake: 'Engine remake' };
const STAGES: Record<string, string> = { playable: 'Playable', 'builds-rom': 'Builds a ROM' };
export const typeLabel = (t?: string) => (t && TYPES[t]) || null;
export const stageLabel = (s?: string) => (s && STAGES[s]) || null;

const PALETTE = ['#A7F3D0', '#7DD3FC', '#FDA4AF', '#FDE68A', '#93C5FD', '#C4B5FD', '#F9A8D4', '#FFB547'];
export const color = (s: string) => PALETTE[[...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE.length];
export const initials = (t: string) => t.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
export const fmt = (s?: string) => (s ? new Date(s).toISOString().slice(0, 10) : '');
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// slugify never produces "--", so owner--name cannot collide (a-b/c vs a/b-c).
const pageSlug = (repo: string) => repo.split('/').map(slugify).join('--');
const prettify = (name: string) => name.replace(/[-_.]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();

export const games: Game[] = Object.values(data as Record<string, any>)
  .filter((g) => g.approved && !g.gone)
  .map((g) => ({ ...g, title: g.title || prettify(g.repo.split('/')[1]), slug: pageSlug(g.repo) }))
  .sort((a, b) => b.stars - a.stars);

// Fail the build loudly if two repos would share a page URL.
const seen = new Set<string>();
for (const g of games) {
  if (seen.has(g.slug)) throw new Error(`Duplicate page slug: ${g.slug}`);
  seen.add(g.slug);
}

export const platforms = [...new Set(games.map((g) => g.platform).filter(Boolean) as string[])]
  .sort()
  .map((name) => ({ name, slug: slugify(name) }));

export const recentChanges = (n: number) => {
  const known = new Map(games.map((g) => [g.repo, g]));
  return (changeLog as any[])
    .filter((c) => known.has(c.repo))
    .slice(0, n)
    .map((c) => ({ ...c, game: known.get(c.repo)! }));
};
