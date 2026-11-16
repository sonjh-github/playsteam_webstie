import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { installSnapshot, settingNames, snapshotFiles } from '../scripts/sync-homepage.mjs';

function fixture() {
  const bytes = Buffer.from('original-image-bytes');
  return { version: 1, settings: Object.fromEntries(settingNames.map(name => [name, { text: '한글', empty: '', items: [2, 1] }])),
    articles: [{ slug: 'article', frontmatter: { title: '제목', published: true, block: { photos: [] } }, body_markdown: '\n\n본문\n' }],
    media: [{ path: '/assets/uploads/test.png', byte_size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), base64: bytes.toString('base64') }] };
}

test('rejects draft articles, traversal paths, template overrides and corrupted media', () => {
  for (const change of [
    s => { s.articles[0].frontmatter.published = false; },
    s => { s.articles[0].slug = '../../outside'; },
    s => { s.articles[0].frontmatter.permalink = '../outside'; },
    s => { s.media[0].path = '/assets/uploads/../../outside'; },
    s => { s.media[0].sha256 = 'wrong'; },
  ]) {
    const snapshot = fixture(); change(snapshot);
    assert.throws(() => snapshotFiles(snapshot));
  }
});

test('refresh removes unpublished/deleted articles and stale images, preserving templates and JSON values', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'homepage-sync-'));
  try {
    const articleDir = path.join(root, 'src/playsteam/articles');
    await mkdir(articleDir, { recursive: true });
    await writeFile(path.join(articleDir, 'old-draft.md'), 'draft');
    await writeFile(path.join(articleDir, 'articles.11tydata.js'), 'template');
    await mkdir(path.join(root, '_site', 'old-draft'), { recursive: true });
    await writeFile(path.join(root, '_site', 'old-draft', 'index.html'), 'previously published draft');
    await installSnapshot(fixture(), root);
    await assert.rejects(readFile(path.join(root, '_site', 'old-draft', 'index.html')), { code: 'ENOENT' });
    assert.deepEqual((await readdir(articleDir)).sort(), ['article.md', 'articles.11tydata.js']);
    assert.deepEqual(JSON.parse(await readFile(path.join(root, 'src/_data/site.json'))), fixture().settings.site);
    const next = fixture(); next.articles = []; next.media = [];
    await installSnapshot(next, root);
    assert.deepEqual(await readdir(articleDir), ['articles.11tydata.js']);
    await assert.rejects(readFile(path.join(root, 'src/assets/uploads/test.png')), { code: 'ENOENT' });
  } finally { await rm(root, { recursive: true, force: true }); }
});
