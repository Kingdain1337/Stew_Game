import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(path));
    else result.push(path);
  }
  return result;
}
test('Pages artifact includes only runtime content and all relative module imports resolve', async () => {
  const files = await walk(root);
  assert.ok(files.length > 60);
  for (const file of files) {
    const path = relative(root, file).split(sep).join('/');
    assert.ok(!/^(?:\.git\/|docs\/|tests\/|tools\/|data\/|node_modules\/)|\.(?:md|docx|env)$/.test(path), `Private/development artifact published: ${path}`);
    if (!file.endsWith('.js')) continue;
    const source = await readFile(file, 'utf8');
    const imports = [...source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)].map((match) => match[1]);
    for (const imported of imports) {
      assert.ok(imported.startsWith('.'), `Non-relative browser import in ${path}: ${imported}`);
      const target = fileURLToPath(new URL(imported, new URL(path, new URL('../dist/', import.meta.url))));
      assert.ok(resolve(target).startsWith(resolve(root) + sep), 'Import escapes published directory');
      assert.ok((await stat(target)).isFile(), `Missing import ${imported}`);
    }
  }
  const html = await readFile(join(root, 'index.html'), 'utf8');
  assert.ok(html.includes('name="viewport"'));
  assert.ok(!/(?:src|href)="\/(?!\/)/.test(html), 'Root-absolute URL breaks project Pages sites');
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (/^https?:/.test(match[1])) continue;
    assert.ok((await stat(join(root, match[1]))).isFile(), `Missing HTML dependency ${match[1]}`);
  }
  await stat(join(root, '.nojekyll'));
});
