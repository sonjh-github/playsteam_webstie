import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const settingNames = ['audiences', 'boxes', 'home', 'programs', 'site', 'trends'];
const reserved = ['layout', 'permalink', 'pagination', 'eleventyComputed', 'templateEngineOverride'];

export function snapshotFiles(snapshot) {
  if (snapshot?.version !== 1 || !snapshot.settings || !Array.isArray(snapshot.articles) || !Array.isArray(snapshot.media)) {
    throw new Error('Invalid homepage snapshot');
  }
  const files = new Map();
  for (const name of settingNames) {
    const data = snapshot.settings[name];
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`Missing setting: ${name}`);
    files.set(`_data/${name}.json`, Buffer.from(JSON.stringify(data, null, 2) + '\n'));
  }
  for (const article of snapshot.articles) {
    const { slug, frontmatter, body_markdown } = article;
    if (typeof slug !== 'string' || !/^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u.test(slug)) throw new Error('Invalid article slug');
    if (!frontmatter || frontmatter.published !== true || typeof body_markdown !== 'string') throw new Error(`Non-public or invalid article: ${slug}`);
    if (reserved.some(key => Object.hasOwn(frontmatter, key))) throw new Error(`Reserved template metadata: ${slug}`);
    const filename = `playsteam/articles/${slug}.md`;
    if (files.has(filename)) throw new Error(`Duplicate article: ${slug}`);
    // JSON is a YAML subset. Keep nested metadata and Markdown without lossy reformatting.
    files.set(filename, Buffer.from(`---\n${JSON.stringify(frontmatter)}\n---${body_markdown.startsWith('\n') ? '' : '\n'}${body_markdown}`));
  }
  for (const media of snapshot.media) {
    const filename = media.path;
    if (typeof filename !== 'string' || !/^\/assets\/(img|uploads)\/.+/.test(filename) ||
        filename.includes('\\') || path.posix.normalize(filename) !== filename || filename.split('/').includes('..')) {
      throw new Error('Invalid media path');
    }
    if (typeof media.base64 !== 'string') throw new Error(`Missing media content: ${filename}`);
    const bytes = Buffer.from(media.base64, 'base64');
    if (bytes.length !== media.byte_size || createHash('sha256').update(bytes).digest('hex') !== media.sha256) {
      throw new Error(`Media integrity mismatch: ${filename}`);
    }
    if (files.has(filename.slice(1))) throw new Error(`Duplicate media: ${filename}`);
    files.set(filename.slice(1), bytes);
  }
  return files;
}

export async function installSnapshot(snapshot, projectRoot = root) {
  const files = snapshotFiles(snapshot);
  const stage = path.join(projectRoot, '.cache', 'homepage-stage');
  await rm(stage, { recursive: true, force: true });
  for (const [relative, bytes] of files) {
    const destination = path.join(stage, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
  }
  const source = path.join(projectRoot, 'src');
  // A newly unpublished article must not survive as HTML from a previous build.
  await rm(path.join(projectRoot, '_site'), { recursive: true, force: true });
  // Only replace generated data. Template code such as articles.11tydata.js stays intact.
  for (const [folder, extension] of [['_data', '.json'], ['playsteam/articles', '.md']]) {
    const directory = path.join(source, folder);
    await mkdir(directory, { recursive: true });
    for (const entry of await readdir(directory)) {
      if (entry.endsWith(extension)) await rm(path.join(directory, entry));
    }
  }
  for (const folder of ['assets/img', 'assets/uploads']) {
    await rm(path.join(source, folder), { recursive: true, force: true });
  }
  for (const relative of files.keys()) {
    const destination = path.join(source, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await rename(path.join(stage, relative), destination);
  }
  const manifest = {
    source: 'Supabase homepage', synced_at: new Date().toISOString(),
    settings: settingNames.length, articles: snapshot.articles.length,
    media: snapshot.media.length,
    media_bytes: snapshot.media.reduce((sum, media) => sum + media.byte_size, 0),
    slugs: snapshot.articles.map(a => a.slug),
    article_routes: snapshot.articles.map(a => a.frontmatter.kind === 'about' ? '/about/philosophy/' : `/playsteam/${a.slug}/`),
    files: [...files].map(([name, bytes]) => ({ path: name, sha256: createHash('sha256').update(bytes).digest('hex') })),
  };
  await writeFile(path.join(projectRoot, '.cache', 'homepage-manifest.json'), JSON.stringify(manifest, null, 2));
  await rm(stage, { recursive: true, force: true });
  return manifest;
}

async function main() {
  const config = JSON.parse(await readFile(path.join(root, 'supabase.public.json'), 'utf8'));
  const url = process.env.SUPABASE_URL || config.url;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || config.publishableKey;
  if (!key?.startsWith('sb_publishable_')) throw new Error('A publishable Supabase key is required; never use a service-role key here');
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/homepage_snapshot`, {
    method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
    body: '{}', signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Supabase homepage_snapshot failed (HTTP ${response.status}); build stopped`);
  const manifest = await installSnapshot(await response.json());
  console.log(`Supabase: ${manifest.settings} settings, ${manifest.articles} published articles, ${manifest.media} verified images (${manifest.media_bytes} bytes)`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
