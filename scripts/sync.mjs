import { readFile, writeFile } from 'node:fs/promises';

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) throw new Error('GITHUB_TOKEN missing');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function http(url, opts = {}, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { ...opts, headers: { 'User-Agent': 'games-sync', ...(opts.headers || {}) } });
      if (!res.ok) { const e = new Error(`HTTP ${res.status} ${url}`); e.status = res.status; throw e; }
      return res;
    } catch (e) {
      const permanent = e.status && e.status !== 429 && e.status < 500;
      if (i >= tries - 1 || permanent) throw e;
      await sleep(1000 * 2 ** i + Math.random() * 500);
    }
  }
}

const readJSON = async (p, fallback) => { try { return JSON.parse(await readFile(p, 'utf8')); } catch { return fallback; } };

const sources = await readJSON('data/sources.json', []);
const prev = await readJSON('data/games.json', {});
const prevKeys = Object.keys(prev);

const SKIP = new Set(['topics','features','orgs','sponsors','settings','login','marketplace','apps','about','pricing','enterprise','collections','trending','security','resources','contact','site','signup','readme','user-attachments']);
const found = new Map();

function add(owner, name, src) {
  name = name.replace(/\.git$/i, '').replace(/\.+$/, '');
  if (!owner || !name || SKIP.has(owner.toLowerCase())) return;
  const key = `${owner}/${name}`.toLowerCase();
  if (!found.has(key)) found.set(key, { owner, name, sources: new Set() });
  found.get(key).sources.add(src);
}

for (const s of sources) {
  try {
    const text = await (await http(s.url)).text();
    for (const m of text.matchAll(/github\.com\/([\w.-]+)\/([\w.-]+)/g)) add(m[1], m[2], s.name);
    for (const m of text.matchAll(/"repo"\s*:\s*"([\w.-]+)\/([\w.-]+)"/g)) add(m[1], m[2], s.name);
    console.log(`${s.name}: ok`);
  } catch (e) {
    console.warn(`${s.name}: FAILED (${e.message})`);
  }
}

for (const t of ['recompilation','static-recompilation','decompilation','pc-port','n64recomp','source-port']) {
  try {
    const res = await http(`https://api.github.com/search/repositories?q=topic:${t}&sort=updated&per_page=100`, { headers: { Authorization: `bearer ${TOKEN}` } });
    for (const r of (await res.json()).items ?? []) add(r.owner.login, r.name, `topic:${t}`);
  } catch (e) {
    console.warn(`topic ${t}: FAILED (${e.message})`);
  }
}

// Guard: a source outage must not look like "everything vanished".
if (prevKeys.length && found.size < prevKeys.length * 0.5) {
  throw new Error(`Only ${found.size} repos found vs ${prevKeys.length} known; refusing to continue`);
}
console.log(`found ${found.size} candidate repos`);

const keys = [...new Set([...found.keys(), ...prevKeys])];
const meta = new Map();
const missing = new Set();
const FIELDS = 'nameWithOwner url description stargazerCount isArchived isFork pushedAt licenseInfo{spdxId} latestRelease{tagName publishedAt}';

for (let i = 0; i < keys.length; i += 50) {
  const kb = keys.slice(i, i + 50);
  const query = 'query{' + kb.map((k, j) => {
    const f = found.get(k);
    const [o, n] = f ? [f.owner, f.name] : prev[k].repo.split('/');
    return `r${j}:repository(owner:${JSON.stringify(o)},name:${JSON.stringify(n)}){${FIELDS}}`;
  }).join(' ') + '}';
  const res = await http('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.json();
  if (!body.data) throw new Error('GraphQL returned no data');
  const errType = new Map();
  for (const e of body.errors ?? []) if (e.path?.[0]) errType.set(e.path[0], e.type);
  kb.forEach((k, j) => {
    const alias = `r${j}`;
    const r = body.data[alias];
    if (r) meta.set(k, r);
    else if (errType.get(alias) === 'NOT_FOUND') missing.add(k);
    // null for any other reason: unknown, keep the previous entry untouched
  });
}

// Guard: only entries we already published can trip this; junk candidates are expected to 404.
const newlyGone = [...missing].filter(k => prev[k]?.repo);
if (newlyGone.length > Math.max(5, prevKeys.length * 0.1)) {
  throw new Error(`${newlyGone.length} known repos reported missing at once; refusing to write`);
}

const today = new Date().toISOString().slice(0, 10);
const out = {};
for (const k of keys) {
  const r = meta.get(k);
  const old = prev[k] || {};
  const f = found.get(k);
  if (!r) {
    if (old.repo) out[k] = missing.has(k) ? { ...old, gone: true } : old;
    continue;
  }
  out[k] = {
    ...old, // keeps manual fields: type, stage, notes, approved
    repo: r.nameWithOwner,
    url: r.url,
    description: r.description,
    stars: r.stargazerCount,
    archived: r.isArchived,
    fork: r.isFork,
    pushedAt: r.pushedAt,
    license: r.licenseInfo?.spdxId ?? null,
    release: r.latestRelease ? { tag: r.latestRelease.tagName, date: r.latestRelease.publishedAt } : null,
    sources: [...(f ? f.sources : old.sources || [])].sort(),
    firstSeen: old.firstSeen || today,
    approved: old.approved ?? false,
    gone: false,
  };
}
const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));

// Validate before writing, so a bad run fails the workflow instead of publishing junk.
for (const [k, v] of Object.entries(sorted)) {
  if (v.gone) continue;
  if (!v.repo || !String(v.url).startsWith('https://github.com/') || typeof v.stars !== 'number') {
    throw new Error(`Invalid entry: ${k}`);
  }
}

const changes = await readJSON('data/changes.json', []);
for (const [k, v] of Object.entries(sorted)) {
  if (v.gone || !v.approved) continue;
  if (v.release && v.release.tag !== prev[k]?.release?.tag) {
    changes.unshift({ at: today, type: 'release', repo: v.repo, tag: v.release.tag });
  }
}
await writeFile('data/changes.json', JSON.stringify(changes.slice(0, 200), null, 1) + '\n');
await writeFile('data/games.json', JSON.stringify(sorted, null, 1) + '\n');
console.log(`wrote ${Object.keys(sorted).length} entries (${missing.size} missing)`);
