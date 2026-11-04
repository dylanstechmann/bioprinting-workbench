/** Bounded ZIP extraction and artifact verification for the two-application roundtrip adapter.
 *
 * Both exported functions are intentionally self-contained (no module-scope references) so the
 * adapter can inject their exact source into a page via `fn.toString()` and run the *same*
 * implementation in Node unit tests and in the browser page. Nothing here is an application
 * dependency and nothing is uploaded anywhere.
 *
 * Archive format handling is strict:
 *  - the central directory is located through the EOCD record and walked by
 *    46 + name + extra + comment lengths (never by compressed payload size);
 *  - entry payloads are located through each entry's *local* header offset and the local
 *    header's own name/extra lengths;
 *  - compression methods 0 (stored) and 8 (deflate) only; encryption, ZIP64 markers,
 *    duplicate/traversal names, directory entries and unsupported methods are rejected;
 *  - archive, entry and expanded byte limits come from the exchange validators
 *    (500 files, 10 MB per file, 25 MB total artifacts) plus bounded manifest overhead.
 */

export const ROUNDTRIP_ARCHIVE_LIMITS = Object.freeze({
  maxEntries: 500,
  maxArchiveBytes: 30 * 1024 * 1024,
  maxEntryBytes: 10 * 1024 * 1024,
  maxTotalBytes: 25 * 1024 * 1024,
});

export function extractRoundtripArchive(buffer, limits) {
  const { maxEntries, maxArchiveBytes, maxEntryBytes, maxTotalBytes } = limits ?? {};
  for (const [name, value] of [['maxEntries', maxEntries], ['maxArchiveBytes', maxArchiveBytes], ['maxEntryBytes', maxEntryBytes], ['maxTotalBytes', maxTotalBytes]]) {
    if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${name} must be a positive integer`);
  }
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer ?? 0);
  if (bytes.byteLength > maxArchiveBytes) throw new RangeError('ZIP archive exceeds the bounded archive size');
  if (bytes.byteLength < 22) throw new RangeError('ZIP archive is truncated');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.byteLength - 22; i >= 0 && i >= bytes.byteLength - 22 - 65535; i--) {
    if (view.getUint32(i, true) !== 0x06054b50) continue;
    if (i + 22 + view.getUint16(i + 20, true) !== bytes.byteLength) continue;
    end = i;
    break;
  }
  if (end < 0) throw new RangeError('ZIP end-of-central-directory record not found');
  const entryCount = view.getUint16(end + 10, true);
  const centralSize = view.getUint32(end + 12, true);
  const centralOffset = view.getUint32(end + 16, true);
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) throw new RangeError('ZIP64 archives are not supported');
  if (entryCount > maxEntries) throw new RangeError('ZIP archive has too many entries');
  if (centralOffset + centralSize > end) throw new RangeError('ZIP central directory is out of bounds');
  const entries = new Map();
  const decoder = new TextDecoder();
  let offset = centralOffset;
  let totalBytes = 0;
  for (let index = 0; index < entryCount; index++) {
    if (offset + 46 > end) throw new RangeError('ZIP central directory entry is truncated');
    if (view.getUint32(offset, true) !== 0x02014b50) throw new RangeError('ZIP central directory signature is invalid');
    const flags = view.getUint16(offset + 8, true);
    if (flags & 0x0001) throw new RangeError('Encrypted ZIP entries are not supported');
    const method = view.getUint16(offset + 10, true);
    if (method !== 0 && method !== 8) throw new RangeError(`Unsupported ZIP compression method ${method}`);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    if (offset + 46 + nameLength + extraLength + commentLength > end) throw new RangeError('ZIP central directory entry fields are truncated');
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (!name || name.includes('\0') || name.includes('\\') || name.startsWith('/') || /^[A-Za-z]:/.test(name)) throw new RangeError(`Unsafe ZIP entry name: ${name}`);
    if (name.endsWith('/')) throw new RangeError('ZIP directory entries are not supported');
    for (const segment of name.split('/')) if (segment === '..' || segment === '.' || !segment) throw new RangeError(`Unsafe ZIP entry name: ${name}`);
    if (entries.has(name)) throw new RangeError(`Duplicate ZIP entry: ${name}`);
    if (uncompressedSize > maxEntryBytes || compressedSize > maxEntryBytes) throw new RangeError(`ZIP entry exceeds per-entry limits: ${name}`);
    totalBytes += uncompressedSize;
    if (totalBytes > maxTotalBytes) throw new RangeError('ZIP entries exceed the bounded expanded size');
    if (localOffset + 30 > bytes.byteLength) throw new RangeError(`ZIP local header is out of bounds: ${name}`);
    if (view.getUint32(localOffset, true) !== 0x04034b50) throw new RangeError(`ZIP local header signature is invalid: ${name}`);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    if (dataStart + compressedSize > bytes.byteLength) throw new RangeError(`ZIP entry payload is truncated: ${name}`);
    entries.set(name, { method, compressedSize, uncompressedSize, dataStart });
    // Central-directory entries advance strictly by their own structural lengths.
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (offset !== centralOffset + centralSize) throw new RangeError('ZIP central directory size does not match its entries');
  return (async () => {
    const result = new Map();
    for (const [name, entry] of entries) {
      const compressed = bytes.subarray(entry.dataStart, entry.dataStart + entry.compressedSize);
      let payload;
      if (entry.method === 0) {
        if (entry.compressedSize !== entry.uncompressedSize) throw new RangeError(`ZIP stored entry size mismatch: ${name}`);
        payload = compressed;
      } else {
        try {
          const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
          const reader = stream.getReader();
          const chunks = [];
          let produced = 0;
          for (;;) {
            const step = await reader.read();
            if (step.done) break;
            produced += step.value.byteLength;
            if (produced > entry.uncompressedSize) throw new RangeError(`ZIP entry inflates beyond its manifest size: ${name}`);
            chunks.push(step.value);
          }
          if (produced !== entry.uncompressedSize) throw new RangeError(`ZIP entry inflation size mismatch: ${name}`);
          payload = new Uint8Array(produced);
          let at = 0;
          for (const chunk of chunks) { payload.set(chunk, at); at += chunk.byteLength; }
        } catch (error) {
          if (error instanceof RangeError) throw error;
          throw new RangeError(`ZIP entry is corrupt or unsupported: ${name}`);
        }
      }
      result.set(name, payload);
    }
    return result;
  })();
}

export async function verifyRoundtripArtifacts(bundle, entries) {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) throw new TypeError('Roundtrip bundle must be a record');
  const artifacts = bundle.artifacts;
  if (!Array.isArray(artifacts)) throw new TypeError('Roundtrip bundle artifacts must be an array');
  const allowed = new Set(['bioprint-results.json']);
  const verified = [];
  for (const descriptor of artifacts) {
    if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) throw new TypeError('Artifact descriptor must be a record');
    const { filename, bytes, sha256 } = descriptor;
    if (typeof filename !== 'string' || !filename || allowed.has(filename)) throw new TypeError(`Invalid or duplicate artifact filename: ${filename}`);
    if (!Number.isInteger(bytes) || bytes < 0) throw new TypeError(`Invalid artifact byte count: ${filename}`);
    if (typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(sha256)) throw new TypeError(`Invalid artifact hash: ${filename}`);
    allowed.add(filename);
    const entry = entries.get(filename);
    if (!entry) throw new RangeError(`Missing artifact bytes: ${filename}`);
    if (entry.byteLength !== bytes) throw new RangeError(`Artifact byte length mismatch: ${filename}`);
    const digest = await crypto.subtle.digest('SHA-256', entry);
    const hex = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (hex !== sha256) throw new RangeError(`Artifact hash mismatch: ${filename}`);
    verified.push({ filename, bytes, sha256: hex });
  }
  for (const name of entries.keys()) if (!allowed.has(name)) throw new RangeError(`Unexpected archive entry: ${name}`);
  return verified;
}
