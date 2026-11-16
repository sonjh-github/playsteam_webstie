import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '_site');
const prefix = (process.env.SITE_PATH_PREFIX || '/').replace(/\/$/, '');
const manifest = JSON.parse(await readFile(path.join(root, '.cache/homepage-manifest.json'), 'utf8'));
async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    files.push(...(entry.isDirectory() ? await walk(filename) : [filename]));
  }
  return files;
}

const files = await walk(output);
const htmlFiles = files.filter(file => file.endsWith('.html'));
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  assert(!html.includes('seoosea/nacompany-site'), `Old repository reference: ${file}`);
  for (const match of html.matchAll(/(?:href|src)="(\/[^"\s]*)"/g)) {
    const url = match[1];
    if (url.startsWith('//')) continue;
    assert(!prefix || url === prefix || url.startsWith(prefix + '/'), `Missing path prefix: ${url}`);
    const relative = decodeURIComponent(url.slice(prefix.length).split(/[?#]/)[0]).replace(/^\//, '');
    let target = path.join(output, relative);
    if ((await stat(target).catch(() => null))?.isDirectory()) target = path.join(target, 'index.html');
    assert((await stat(target).catch(() => null))?.isFile(), `Broken local link in ${path.relative(output, file)}: ${url}`);
  }
}
for (const source of manifest.files.filter(file => file.path.startsWith('assets/'))) {
  const bytes = await readFile(path.join(output, source.path));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256, source.path);
}
for (const name of ['index.html', 'about/index.html', 'programs/index.html', 'archive/index.html', 'playsteam/index.html']) {
  assert(files.includes(path.join(output, name)), `Missing page: ${name}`);
}
for (const route of manifest.article_routes) {
  assert(files.includes(path.join(output, route, 'index.html')), `Missing published article: ${route}`);
}
console.log(`Verified ${htmlFiles.length} HTML pages and ${manifest.media} original images; all local links resolve`);
