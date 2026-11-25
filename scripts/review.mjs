// Interactive reviewer: node scripts/review.mjs [--min-stars=100]
import { readFile, writeFile } from 'node:fs/promises';
import readline from 'node:readline';

const min = Number(process.argv.find((a) => a.startsWith('--min-stars='))?.split('=')[1] ?? 100);
const SINCE = '2024-11-25';
const NAME_JUNK = /awesome|[-_]list|list[-_]|resources|tools?|toolkit|tooling|template|starter|example|dotfiles|badge|collection|curated|index|meta$/i;
const DESC_JUNK = /\b(emulator|emulation|launcher|frontend|library|framework|sdk|plugin|installer|patcher|script|scripts|docker|website|tutorial|course|benchmark|loader|wrapper|tool|tools|engine|decompiler|api)\b/i;
const highConfidence = (g) => (g.sources ?? []).some((s) => s === 'native-ports' || s.startsWith('topic:'));
const reviewable = (g) =>
  g.stars >= min && !g.approved && !g.rejected && !g.gone &&
  !g.fork && !g.archived && g.description &&
  g.pushedAt?.slice(0, 10) >= SINCE &&
  !NAME_JUNK.test(g.repo) && !DESC_JUNK.test(g.description);
const games = JSON.parse(await readFile('data/games.json', 'utf8'));
const pending = Object.entries(games)
  .filter(([, g]) => reviewable(g))
  .sort(([, a], [, b]) => Number(highConfidence(b)) - Number(highConfidence(a)) ||
    (b.sources?.length || 0) - (a.sources?.length || 0) || b.stars - a.stars);

const save = () => writeFile('data/games.json', JSON.stringify(games, null, 1) + '\n');
// Queue-based input: works when typing, pasting several answers, or piping stdin.
const rl = readline.createInterface({ input: process.stdin });
const queue = [];
let waiting = null, closed = false;
rl.on('line', (l) => (waiting ? ((w) => { waiting = null; w(l); })(waiting) : queue.push(l)));
rl.on('close', () => { closed = true; if (waiting) waiting(null); });
const EOF = Symbol('eof');
const ask = async (q) => {
  process.stdout.write(q);
  const v = queue.length ? queue.shift() : closed ? null : await new Promise((r) => (waiting = r));
  if (v === null) throw EOF;
  return v.trim();
};
const TYPES = { r: 'recomp', p: 'port', d: 'decomp', e: 'remake' };
const STAGES = { p: 'playable', b: 'builds-rom' };

const hidden = Object.values(games).filter((g) => g.stars >= min && !g.approved && !g.rejected && !g.gone && !reviewable(g)).length;
console.log(`${pending.length} pending (min stars ${min}); ${hidden} hidden by filters. Decisions are saved as you go.`);
let i = 0, approved = 0;
try {
  for (const [key, g] of pending) {
    i++;
    console.log(`\n[${i}/${pending.length}] ${g.repo}  ★${g.stars}  (${g.sources?.length || 0} sources)${g.archived ? '  ARCHIVED' : ''}${g.fork ? '  FORK' : ''}`);
    console.log(`  ${g.description ?? '(no description)'}`);
    console.log(`  last push ${g.pushedAt?.slice(0, 10)}  release ${g.release?.tag ?? 'none'}  license ${g.license ?? 'none'}`);
    console.log(`  ${g.url}`);
    const a = (await ask('  (a)pprove  (r)eject  (s)kip  (q)uit > ')).toLowerCase();
    if (a === 'q') break;
    if (a === 'r') { games[key].rejected = true; await save(); continue; }
    if (a !== 'a') continue;
    const t = TYPES[(await ask('  type: (r)ecomp (p)ort (d)ecomp r(e)make, enter=none > ')).toLowerCase()];
    const s = STAGES[(await ask('  status: (p)layable (b)uilds-rom, enter=none > ')).toLowerCase()];
    const platform = await ask('  platform, e.g. Nintendo 64 (enter=none) > ');
    const title = await ask('  title (enter=auto from repo name) > ');
    Object.assign(games[key], { approved: true });
    for (const [k, v] of Object.entries({ type: t, stage: s, platform, title })) if (v) games[key][k] = v;
    approved++;
    await save();
  }
} catch (e) {
  if (e !== EOF) throw e;
}
rl.close();
console.log(`\n\nDone. Approved ${approved} this session.`);
