export const MEASUREMENT_BYTES = 256 * 1024;
export const SCENARIO_BYTES = 1024 * 1024;
export function assertPlainRecord(value, path = 'input') {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError(`${path} must be a plain object`);
  return value;
}
export function assertAllowedKeys(value, keys, path = 'input') {
  assertPlainRecord(value, path);
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw new TypeError(`${path}.${key} is unsupported`);
}
export function parseBoundedJson(value, maxBytes) {
  if (typeof value !== 'string') throw new TypeError('JSON input must be text');
  if (new TextEncoder().encode(value).length > maxBytes) throw new RangeError(`JSON exceeds ${maxBytes} bytes`);
  return assertPlainRecord(JSON.parse(value));
}
export function finite(value, min, max, path) {
  if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`${path} must be finite in [${min}, ${max}]`);
  return value;
}
export function text(value, max, path) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new TypeError(`${path} must be a nonempty string (max ${max})`);
  return value.trim();
}
export function validateDataKind(value = 'unspecified') {
  if (!['synthetic', 'user-declared-measured', 'unspecified'].includes(value)) throw new RangeError('Unsupported dataKind');
  return value;
}
export function validateSource(raw) {
  assertAllowedKeys(raw, ['citation', 'url', 'accessedDate'], 'source');
  const citation = text(raw.citation, 2000, 'source.citation'), date = raw.accessedDate;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new RangeError('source.accessedDate must be YYYY-MM-DD');
  const d = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== date) throw new RangeError('source.accessedDate is not a calendar date');
  const source = { citation, accessedDate: date };
  if (raw.url !== undefined) {
    const url = text(raw.url, 2048, 'source.url');
    let parsed;
    try { parsed = new URL(url); } catch { throw new TypeError('source.url must be an absolute HTTP(S) URL'); }
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new TypeError('source.url must be HTTP(S), without credentials');
    source.url = url;
  }
  return source;
}