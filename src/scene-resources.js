/** Dispose a scene-owned subtree once, including shared materials and textures. */
export function disposeObjectResources(root) {
  if (!root || typeof root.traverse !== 'function') throw new TypeError('A traversable resource root is required');
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(object => {
    if (object.geometry?.dispose) geometries.add(object.geometry);
    for (const material of [].concat(object.material || [])) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture && typeof value.dispose === 'function') textures.add(value);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose?.();
  for (const texture of textures) texture.dispose();
  return { geometries: geometries.size, materials: materials.size, textures: textures.size };
}
