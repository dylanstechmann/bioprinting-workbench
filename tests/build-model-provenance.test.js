import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  collectImplementationFiles, buildImplementationManifest, checkImplementationManifest,
  manifestText, MODEL_ROOTS, MANIFEST_SCHEMA,
} from '../scripts/build-model-provenance.mjs';
import { getDomainModels } from '../src/domain-models.js';

const root = resolve(new URL('..', import.meta.url).pathname);

function tempProject(files) {
  const dir = mkdtempSync(join(tmpdir(), 'prov-'));
  for (const [path, content] of Object.entries(files)) {
    const abs = join(dir, path);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, content);
  }
  return dir;
}

test('model roots cover exactly the seven registry ids', () => {
  assert.deepEqual(Object.keys(MODEL_ROOTS).sort(), getDomainModels().map(m => m.id).sort());
});

test('the real manifest is deterministic and passes its own check', () => {
  const a = buildImplementationManifest(root);
  const b = buildImplementationManifest(root);
  assert.equal(manifestText(a), manifestText(b));
  assert.equal(a.schema, MANIFEST_SCHEMA);
  assert.equal(a.models.length, 7);
  const supplied = JSON.parse(readFileSync(join(root, 'assets/model-provenance.json'), 'utf8'));
  checkImplementationManifest(root, supplied);
  const paths = a.models[0].files.map(f => f.path);
  assert.ok(paths.includes('src/domain-models.js'));
  assert.ok(paths.includes('src/validation.js'));
  assert.deepEqual([...paths].sort(), paths);
  for (const f of a.models[0].files) assert.match(f.sha256, /^[a-f0-9]{64}$/);
});

test('a tampered or stale manifest is detected and never auto-repaired', () => {
  const fresh = buildImplementationManifest(root);
  const tampered = structuredClone(fresh);
  tampered.models[0].implementationSha256 = 'a'.repeat(64);
  assert.throws(() => checkImplementationManifest(root, tampered), /stale/);
  const missingEntry = structuredClone(fresh);
  missingEntry.models = missingEntry.models.slice(1);
  assert.throws(() => checkImplementationManifest(root, missingEntry), /stale/);
  assert.throws(() => checkImplementationManifest(root, { schema: 'other/1', models: [] }), /stale/);
});

test('closure walking is transitive, sorted and byte-sensitive in temporary trees', () => {
  const dir = tempProject({
    'src/a.js': "import { b } from './b.js';\nexport const a = b;\n",
    'src/b.js': "import './c.js';\nexport const b = 1;\n",
    'src/c.js': 'export const c = 2;\n',
    'src/unused.js': 'export const u = 3;\n',
  });
  try {
    const files = collectImplementationFiles(dir, ['src/a.js']);
    assert.deepEqual(files.map(f => f.path), ['src/a.js', 'src/b.js', 'src/c.js']);
    const before = files.find(f => f.path === 'src/c.js').sha256;
    writeFileSync(join(dir, 'src/c.js'), 'export const c = 3;\n');
    const after = collectImplementationFiles(dir, ['src/a.js']).find(f => f.path === 'src/c.js').sha256;
    assert.notEqual(before, after);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('re-exports are followed while unsupported imports fail closed', () => {
  const ok = tempProject({
    'src/a.js': "export { c } from './c.js';\n",
    'src/c.js': 'export const c = 1;\n',
  });
  try {
    assert.deepEqual(collectImplementationFiles(ok, ['src/a.js']).map(f => f.path), ['src/a.js', 'src/c.js']);
  } finally { rmSync(ok, { recursive: true, force: true }); }
  const dynamic = tempProject({ 'src/a.js': 'const x = await import("./c.js");\n' });
  assert.throws(() => collectImplementationFiles(dynamic, ['src/a.js']), /dynamic import/);
  rmSync(dynamic, { recursive: true, force: true });
  const bare = tempProject({ 'src/a.js': "import fs from 'node:fs';\n" });
  assert.throws(() => collectImplementationFiles(bare, ['src/a.js']), /not project-relative/);
  rmSync(bare, { recursive: true, force: true });
  const missing = tempProject({ 'src/a.js': "import './ghost.js';\n" });
  assert.throws(() => collectImplementationFiles(missing, ['src/a.js']), /missing file/);
  rmSync(missing, { recursive: true, force: true });
  const escape = tempProject({ 'src/a.js': "import '../../outside.js';\n" });
  assert.throws(() => collectImplementationFiles(escape, ['src/a.js']), /escapes the project root/);
  rmSync(escape, { recursive: true, force: true });
});

test('CLI --check is read-only on fresh state and rejects other arguments', () => {
  const target = join(root, 'assets/model-provenance.json');
  const before = readFileSync(target);
  execFileSync(process.execPath, ['scripts/build-model-provenance.mjs', '--check'], { cwd: root, stdio: 'pipe' });
  assert.deepEqual(readFileSync(target), before);
  assert.throws(() => execFileSync(process.execPath, ['scripts/build-model-provenance.mjs', '--bogus'], { cwd: root, stdio: 'pipe' }), err => err.status === 2);
});
