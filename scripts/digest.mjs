import { readFile } from 'node:fs/promises';
const changes = JSON.parse(await readFile('data/changes.json', 'utf8'));
const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
const lines = changes.filter((c) => c.at >= since).map((c) => `- ${c.repo} ${c.tag}`);
console.log(lines.length ? `New releases this week:\n${lines.join('\n')}` : 'No new releases this week.');
