import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { extractRoundtripArchive, verifyRoundtripArtifacts, ROUNDTRIP_ARCHIVE_LIMITS } from '../scripts/browser-roundtrip-archive.js';

const LIM = ROUNDTRIP_ARCHIVE_LIMITS;

function cat(...chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) { out.set(chunk, at); at += chunk.length; }
  return out;
}

function u16(value) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, value, true); return b; }
function u32(value) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, value, true); return b; }
const ascii = text => new TextEncoder().encode(text);

/** Minimal strict ZIP writer for fixtures. Deliberately records local and central extras
 * separately so tests catch parsers that mix the two header layouts. */
function zip(entrySpecs, { comment = '', eocdOverride = null } = {}) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  for (const spec of entrySpecs) {
    const name = encoder.encode(spec.name);
    const data = typeof spec.data === 'string' ? encoder.encode(spec.data) : spec.data;
    const method = spec.method ?? (spec.deflate ? 8 : 0);
    const compressed = method === 8 ? deflateRawSync(data) : data;
    const flags = spec.flags ?? 0;
    const localExtra = spec.localExtra ? encoder.encode(spec.localExtra) : new Uint8Array();
    const centralExtra = spec.centralExtra ? encoder.encode(spec.centralExtra) : new Uint8Array();
    const centralComment = spec.centralComment ? encoder.encode(spec.centralComment) : new Uint8Array();
    const compSize = spec.forceCompSize ?? compressed.length;
    const uncompSize = spec.forceUncompSize ?? data.length;
    const local = cat(
      u32(0x04034b50), u16(20), u16(flags), u16(method), u16(0), u16(0), u32(0),
      u32(compSize), u32(uncompSize), u16(name.length), u16(localExtra.length),
      name, localExtra, compressed,
    );
    const central = cat(
      u32(0x02014b50), u16(20), u16(20), u16(flags), u16(method), u16(0), u16(0), u32(0),
      u32(compSize), u32(uncompSize), u16(name.length), u16(centralExtra.length),
      u16(centralComment.length), u16(0), u16(0), u32(0),
      u32(spec.localOffsetOverride ?? localOffset),
      name, centralExtra, centralComment,
    );
    localParts.push(local);
    centralParts.push(central);
    localOffset += local.length;
  }
  const locals = cat(...localParts);
  const centralDirectory = cat(...centralParts);
  const commentBytes = encoder.encode(comment);
  const eocd = eocdOverride ?? cat(
    u32(0x06054b50), u16(0), u16(0), u16(entrySpecs.length), u16(entrySpecs.length),
    u32(centralDirectory.length), u32(locals.length), u16(commentBytes.length), commentBytes,
  );
  return cat(locals, centralDirectory, eocd);
}

async function rejected(buffer, limits, pattern) {
  await assert.rejects(async () => { await extractRoundtripArchive(buffer, limits ?? LIM); }, pattern);
}

test('extracts stored and deflated entries through local headers with central comments', async () => {
  const manifest = '{"ok":true}';
  const artifact = 'x'.repeat(500);
  const buffer = zip([
    { name: 'bioprint-results.json', data: manifest, method: 0, localExtra: 'local-only-extra', centralExtra: 'central-extra' },
    { name: 'run-1.json', data: artifact, deflate: true, centralComment: 'central comment bytes' },
    { name: 'run-2.json', data: 'plain', method: 0 },
  ], { comment: 'archive comment' });
  const entries = await extractRoundtripArchive(buffer, LIM);
  assert.deepEqual([...entries.keys()], ['bioprint-results.json', 'run-1.json', 'run-2.json']);
  assert.equal(new TextDecoder().decode(entries.get('bioprint-results.json')), manifest);
  assert.equal(new TextDecoder().decode(entries.get('run-1.json')), artifact);
  assert.equal(new TextDecoder().decode(entries.get('run-2.json')), 'plain');
});

test('rejects traversal, absolute, directory, duplicate and encrypted entries', async () => {
  await rejected(zip([{ name: '../escape.json', data: 'x' }]), null, /Unsafe ZIP entry name/);
  await rejected(zip([{ name: '/etc/passwd', data: 'x' }]), null, /Unsafe ZIP entry name/);
  await rejected(zip([{ name: 'dir/', data: '' }]), null, /directory entries are not supported/);
  await rejected(zip([{ name: 'a.json', data: '1' }, { name: 'a.json', data: '2' }]), null, /Duplicate ZIP entry/);
  await rejected(zip([{ name: 'secret.json', data: 'x', flags: 0x0001 }]), null, /Encrypted/);
});

test('rejects unsupported methods, ZIP64 markers and stored-size mismatches', async () => {
  await rejected(zip([{ name: 'a.json', data: 'x', method: 12 }]), null, /Unsupported ZIP compression method/);
  const zip64 = zip([{ name: 'a.json', data: 'x' }]);
  new DataView(zip64.buffer, zip64.byteOffset).setUint16(zip64.length - 12, 0xffff, true);
  await rejected(zip64, null, /ZIP64/);
  await rejected(zip([{ name: 'a.json', data: 'x', method: 0, forceUncompSize: 99 }]), null, /stored entry size mismatch/);
});

test('rejects corrupt, truncated and mis-sized deflated payloads', async () => {
  const good = zip([{ name: 'a.json', data: 'compress me please', deflate: true }]);
  const corrupt = Uint8Array.from(good);
  corrupt[30 + 'a.json'.length] = 0x07; // BTYPE=11 is invalid in the deflate payload right after the local name
  await rejected(corrupt, null, /corrupt|inflation|mismatch/);
  await rejected(good.subarray(0, good.length - 3), null, /truncated|not found|corrupt|mismatch/);
  await rejected(zip([{ name: 'a.json', data: 'short', deflate: true, forceUncompSize: 3 }]), null, /beyond its manifest size|inflation size mismatch/);
});

test('enforces bounded entry, total, count and archive limits', async () => {
  const small = { maxEntries: 2, maxArchiveBytes: 1024, maxEntryBytes: 16, maxTotalBytes: 24 };
  await rejected(zip([{ name: 'a.json', data: 'x'.repeat(40) }, { name: 'b.json', data: 'y' }]), small, /per-entry limits/);
  await rejected(zip([{ name: 'a.json', data: 'x'.repeat(12) }, { name: 'b.json', data: 'y'.repeat(12) }, { name: 'c.json', data: 'z'.repeat(12) }]), small, /too many entries/);
  await rejected(zip([{ name: 'a.json', data: 'x'.repeat(12) }, { name: 'b.json', data: 'y'.repeat(13) }]), small, /bounded expanded size/);
  await rejected(zip([{ name: 'a.json', data: 'x'.repeat(2000) }]), { ...small, maxEntryBytes: 4096, maxTotalBytes: 4096 }, /bounded archive size/);
});

test('rejects invalid central directory structure', async () => {
  const good = zip([{ name: 'a.json', data: 'x' }]);
  const wrongSignature = Uint8Array.from(good);
  wrongSignature[0] = 0x00; // local signature damage is caught via the central local-offset check
  await rejected(wrongSignature, null, /local header signature|out of bounds/);
  await rejected(good.subarray(0, 21), null, /truncated/);
  await rejected(new Uint8Array(30), null, /end-of-central-directory/);
});

test('verifies manifest artifact bytes and hashes, rejecting extras and mismatches', async () => {
  const artifact = new TextEncoder().encode('artifact bytes');
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', artifact))].map(b => b.toString(16).padStart(2, '0')).join('');
  const bundle = { artifacts: [{ filename: 'run-1.json', bytes: artifact.length, sha256: digest }] };
  const entries = await extractRoundtripArchive(zip([
    { name: 'bioprint-results.json', data: '{}', method: 0 },
    { name: 'run-1.json', data: artifact, deflate: true },
  ]), LIM);
  assert.deepEqual(await verifyRoundtripArtifacts(bundle, entries), [{ filename: 'run-1.json', bytes: artifact.length, sha256: digest }]);

  const missing = new Map(entries);
  missing.delete('run-1.json');
  await assert.rejects(async () => { await verifyRoundtripArtifacts(bundle, missing); }, /Missing artifact bytes/);
  await assert.rejects(async () => {
    await verifyRoundtripArtifacts({ artifacts: [{ filename: 'run-1.json', bytes: artifact.length + 1, sha256: digest }] }, entries);
  }, /byte length mismatch/);
  await assert.rejects(async () => {
    await verifyRoundtripArtifacts({ artifacts: [{ filename: 'run-1.json', bytes: artifact.length, sha256: 'f'.repeat(64) }] }, entries);
  }, /hash mismatch/);
  const extra = new Map(entries);
  extra.set('smuggled.json', new Uint8Array(1));
  await assert.rejects(async () => { await verifyRoundtripArtifacts(bundle, extra); }, /Unexpected archive entry/);
  await assert.rejects(async () => {
    await verifyRoundtripArtifacts({ artifacts: [{ filename: 'bioprint-results.json', bytes: 2, sha256: 'f'.repeat(64) }] }, entries);
  }, /Invalid or duplicate/);
});
