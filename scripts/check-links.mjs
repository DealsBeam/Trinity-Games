// Verify that every internal href/src/action in dist/ stays under the base path
// and points at a file that was actually generated. No external dependencies.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`No dist/ directory at ${root}. Run npm run build first.`);
  process.exit(1);
}

const [owner, repo] = (process.env.GITHUB_REPOSITORY || 'OWNER/Trinity-Games').split('/');
const base = process.env.CUSTOM_DOMAIN ? '' : `/${repo}`;

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.isFile() && extname(entry.name) === '.html') out.push(full);
  }
  return out.sort();
}

const inBase = (p) => p === base || p.startsWith(`${base}/`);
const unbase = (p) => (base ? (p !== base ? p.slice(base.length) : '/') : p);

function target(value, pagePath) {
  const raw = value.trim();
  // External, protocol-relative, mailto/data/etc., fragments and empty values
  // are not files in dist/.
  if (!raw || raw.startsWith('#') || /^(?:https?:)?\/\//i.test(raw) || /^[a-z][a-z\d+.-]*:/i.test(raw)) return null;

  let pathname;
  if (raw.startsWith('/')) {
    pathname = posix.normalize(raw.split(/[?#]/)[0]);
  } else {
    pathname = new URL(raw, `https://link-check.invalid${pagePath}`).pathname;
  }
  if (!inBase(pathname)) return { error: `outside base ${base || '/'}` };
  return { path: decodeURIComponent(unbase(pathname)) };
}

function candidates(pathname) {
  const rel = pathname.replace(/^\/+/, '');
  if (pathname === '/' || pathname.endsWith('/')) return [join(root, rel, 'index.html')];
  return extname(pathname) ? [join(root, rel)] : [join(root, `${rel}.html`), join(root, rel, 'index.html')];
}

const files = htmlFiles(root);
const problems = [];
let checked = 0;

for (const file of files) {
  const pagePath = `${base}/${relative(root, file).split(sep).join('/')}`;
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(/\b(href|src|action)\s*=\s*(["'])(.*?)\2/gis)) {
    const [, attr, , value] = match;
    let resolved;
    try {
      resolved = target(value, pagePath);
    } catch {
      problems.push(`${relative(root, file)}: invalid ${attr}="${value}"`);
      continue;
    }
    if (!resolved) continue;
    checked++;
    if (resolved.error) {
      problems.push(`${relative(root, file)}: ${attr}="${value}" -> ${resolved.error}`);
      continue;
    }
    if (!candidates(resolved.path).some((p) => existsSync(p) && statSync(p).isFile())) {
      problems.push(`${relative(root, file)}: ${attr}="${value}" -> missing ${resolved.path}`);
    }
  }
}

for (const p of problems) console.error(p);
console.log(`Checked ${checked} internal links in ${files.length} pages: ${problems.length} problem(s).`);
process.exit(problems.length ? 1 : 0);
