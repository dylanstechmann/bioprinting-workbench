/** Encode finite scalar samples as portable unsigned-byte RGBA pixels.
 * The range is explicit and dimensionless by default; colors are presentation,
 * never a biological threshold. Constant fields use the midpoint color. */
export function makeFieldRGBA(values, { min = 0, max = 1 } = {}) {
  if (!values || !Number.isInteger(values.length) || values.length < 1 || values.length > 256 * 256) {
    throw new RangeError('Overlay values must contain 1–65536 samples');
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) throw new RangeError('Invalid overlay color range');
  const pixels = new Uint8Array(values.length * 4);
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError('Overlay values must be finite numbers');
    const t = max === min ? 0.5 : Math.max(0, Math.min(1, (value - min) / (max - min)));
    pixels.set([Math.round(255 * t), Math.round(180 * (1 - Math.abs(2 * t - 1))), Math.round(255 * (1 - t)), 255], i * 4);
  }
  return pixels;
}