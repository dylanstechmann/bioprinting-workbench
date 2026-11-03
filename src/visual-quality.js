// Presentation only. Presets never change model inputs or scientific results.
const PRESETS = Object.freeze({
  low: Object.freeze({ id: 'low', pixelRatioCap: 1, shadowMapSize: 512, shadows: false }),
  balanced: Object.freeze({ id: 'balanced', pixelRatioCap: 1.5, shadowMapSize: 1024, shadows: true }),
  high: Object.freeze({ id: 'high', pixelRatioCap: 2, shadowMapSize: 2048, shadows: true }),
});

export function getQualityPreset(id) {
  if (typeof id !== 'string' || !Object.hasOwn(PRESETS, id)) throw new RangeError('Unknown visual quality');
  return { ...PRESETS[id] };
}