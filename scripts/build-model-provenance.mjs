// Deterministic implementation-dependency manifest: walks the static relative-import closure
// of each registered model's adapter + evaluator roots, hashes exact file bytes, and checks or
// writes assets/model-provenance.json. Unsupported import forms fail closed: a digest that
// silently omits a dependency would be worse than no digest at all.
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJsonBytes } from '../src/model-provenance.js';

export const MANIFEST_SCHEMA = 'bioprinting-workbench/model-provenance/1';
export const CANONICALIZATION = 'sorted-json-lf/1';
export const MODEL_ROOTS = Object.freeze({
  storyboard: 'src/model.js',
  'slab-oxygen': 'src/oxygen.js',
  'box-oxygen': 'src/oxygen3d.js',
  'flow-resistance': 'src/flow.js',
  'nozzle-shear': 'src/nozzle-shear.js',
  'vascular-supply': 'src/vascular-supply.js',
  'relative-division': 'src/cell-division.js',
});
const ADAPTER_ROOT = 'src/model-adapters.js';

function hashBytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function parseImports(source, path) {
  if (/(^|[^.\w])import\s*\(/.test(source)) throw new Error(`${path}: dynamic import() is unsupported`);
  if (/from\s*`/.test(source) || /import\s*`/.test(source)) throw new Error(`${path}: template import specifiers are unsupported`);
  const specs = [];
  const patterns = [
    /import\s+(?:[\w*\s{},]+\s+from\s+)?['"]([^'"]+)['"]/gs,
    /export\s+[^'"]*?from\s+['"]([^'"]+)['"]/gs,
  ];
  for (const re of patterns) {
    for (const match of source.matchAll(re)) specs.push(match[1]);
  }
  return specs;
}

function collectFrom(root, entry, visited) {
  const stack = [entry];
  while (stack.length) {
    const relPath = stack.pop();
    if (visited.has(relPath)) continue;
    visited.add(relPath);
    const abs = resolve(root, relPath);
    const relCheck = relative(root, abs).split(sep).join('/');
    if (relCheck.startsWith('..') || resolve(root, relCheck) !== abs) throw new Error(`${relPath}: escapes the project root`);
    if (!existsSync(abs)) throw new Error(`${relPath}: missing file`);
    const source = readFileSync(abs, 'utf8');
    for (const spec of parseImports(source, relPath)) {
      if (!spec.startsWith('./') && !spec.startsWith('../')) throw new Error(`${relPath}: import '${spec}' is not project-relative`);
      if (spec.includes('?') || spec.includes('#')) throw new Error(`${relPath}: import '${spec}' carries unsupported decorations`);
      const target = relative(root, resolve(dirname(abs), spec)).split(sep).join('/');
      if (target.startsWith('..')) throw new Error(`${relPath}: import '${spec}' escapes the project root`);
      stack.push(target);
    }
  }
}

/** Exact static-import closure of entry paths: sorted paths with per-file byte hashes. */
export function collectImplementationFiles(root, entryPaths) {
  const visited = new Set();
  for (const entry of entryPaths) collectFrom(root, entry, visited);
  return [...visited].sort().map(path => {
    const bytes = readFileSync(resolve(root, path));
    return { path, sha256: hashBytes(bytes), bytes: bytes.length };
  });
}

export function buildImplementationManifest(root) {
  const models = Object.entries(MODEL_ROOTS).sort(([a], [b]) => (a < b ? -1 : 1)).map(([id, evaluatorEntry]) => {
    const roots = [ADAPTER_ROOT, evaluatorEntry].sort();
    const files = collectImplementationFiles(root, roots);
    const implementationSha256 = hashBytes(canonicalJsonBytes({ id, version: 1, roots, files }));
    return { id, version: 1, roots, files, implementationSha256 };
  });
  return { schema: MANIFEST_SCHEMA, canonicalization: CANONICALIZATION, models };
}

export function manifestText(manifest) {
  return JSON.stringify(manifest, null, 2) + '\n';
}

export function checkImplementationManifest(root, supplied) {
  const fresh = buildImplementationManifest(root);
  const expected = manifestText(fresh);
  const actual = manifestText(supplied); // normalizes key order only for error clarity; compare parsed too
  if (actual !== expected || JSON.stringify(supplied) !== JSON.stringify(fresh)) {
    const freshIds = fresh.models.map(m => `${m.id}:${m.implementationSha256.slice(0, 12)}`).join(' ');
    const suppliedIds = Array.isArray(supplied?.models) ? supplied.models.map(m => `${m?.id}:${String(m?.implementationSha256).slice(0, 12)}`).join(' ') : '(none)';
    throw new Error(`model-provenance.json is stale.\n  expected: ${freshIds}\n  supplied: ${suppliedIds}`);
  }
  return fresh;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    console.error('Usage: node scripts/build-model-provenance.mjs [--check]');
    process.exit(2);
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const target = resolve(root, 'assets/model-provenance.json');
  try {
    if (args[0] === '--check') {
      if (!existsSync(target)) throw new Error('assets/model-provenance.json is missing');
      checkImplementationManifest(root, JSON.parse(readFileSync(target, 'utf8')));
      console.log('model-provenance.json matches the implementation closure.');
    } else {
      const manifest = buildImplementationManifest(root);
      const tmp = `${target}.tmp`;
      writeFileSync(tmp, manifestText(manifest));
      renameSync(tmp, target);
      console.log(`Wrote ${manifest.models.length} model entries to assets/model-provenance.json.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
