import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStaticServer, resolveStaticPath } from '../scripts/serve.mjs';

function withRoot(fn) {
  const root = mkdtempSync(join(tmpdir(), 'bioprint-static-'));
  try {
    writeFileSync(join(root, 'index.html'), '<h1>Local preview</h1>');
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'src', 'model.js'), 'export const value = 1;\n');
    return fn(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test('static paths reject traversal, encoded traversal, backslashes and malformed input', () => withRoot(root => {
  assert.equal(resolveStaticPath(root, '/'), join(root, 'index.html'));
  assert.equal(resolveStaticPath(root, '/src/model.js?x=1'), join(root, 'src', 'model.js'));
  for (const path of ['/../secret', '/%2e%2e/secret', '/%2E%2E%2fsecret', '/src/..%2fsecret', '/src\\model.js', '/%00', '/%', 'relative']) {
    assert.throws(() => resolveStaticPath(root, path), `${path} must be rejected`);
  }
  assert.throws(() => resolveStaticPath(root, `/${'a'.repeat(5000)}`));
}));

test('static server supports GET and HEAD without writes or directory listings', async () => {
  const root = mkdtempSync(join(tmpdir(), 'bioprint-static-'));
  writeFileSync(join(root, 'index.html'), '<h1>Local preview</h1>');
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'src', 'model.js'), 'export const value = 1;\n');
  const server = createStaticServer({ root });
  await new Promise((resolveListen, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolveListen); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(`${origin}/`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /^text\/html/);
    assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(await page.text(), '<h1>Local preview</h1>');
    const module = await fetch(`${origin}/src/model.js`);
    assert.match(module.headers.get('content-type'), /^text\/javascript/);
    const head = await fetch(`${origin}/src/model.js`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    assert.equal(Number(head.headers.get('content-length')), 24);
    assert.equal((await fetch(`${origin}/src/`)).status, 404);
    assert.equal((await fetch(`${origin}/missing`)).status, 404);
    const post = await fetch(`${origin}/`, { method: 'POST', body: 'no writes' });
    assert.equal(post.status, 405);
    assert.equal(post.headers.get('allow'), 'GET, HEAD');
  } finally {
    await new Promise(resolveClose => server.close(resolveClose));
    rmSync(root, { recursive: true, force: true });
  }
});
