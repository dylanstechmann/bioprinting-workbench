"""Execute inside Blender; validates owned generation without saving a .blend."""
import bpy
import importlib
import json
import hashlib
import struct
from pathlib import Path
import sys


def run_checks(root):
    root = Path(root)
    sys.path.insert(0, str(root / 'assets'))
    common = importlib.import_module('authoring_common')
    original_scene = bpy.context.window.scene
    foreign = [s for s in bpy.data.scenes if not s.name.startswith('BioWorkbench_')]

    def fingerprint():
        return [(s.name, [(o.name, o.type, tuple(o.matrix_world),
                           tuple(m.name if m else '' for m in o.data.materials) if o.type == 'MESH' else (),
                           o.select_get(), o.data.as_pointer() if o.data else None)
                          for o in s.objects],
                 s.view_layers[0].objects.active.name if s.view_layers[0].objects.active else None)
                for s in foreign]

    before = fingerprint()
    # v0.3 is deliberately retained, not automatically adopted/deleted.
    old = bpy.data.scenes.get('BioWorkbench_Bioprinter')
    if old and old.get('asset_owner') != common.OWNER:
        old.name = 'BioWorkbench_Legacy_v03'
    entries = []
    specs = [('bioprinter', 'author_bioprinter', 'Printer_', ['Printer_Base', 'Printer_TopCap', 'Printer_BuildPlate', 'Printer_Glass_Door']),
             ('incubator', 'author_incubator', 'Incubator_', ['Incubator_Base', 'Incubator_Glass_Door']),
             ('microscope', 'author_microscope', 'Microscope_', ['Microscope_Base', 'Microscope_Stage', 'Microscope_Objective_1']),
             ('perfusion-chamber', 'author_perfusion_chamber', 'Chamber_', ['Chamber_Base', 'Chamber_Glass_Lid'])]
    for ident, module_name, prefix, required in specs:
        module = importlib.import_module(module_name)
        path = root / 'assets' / (module_name.replace('author_', '') + '.glb')
        scene = module.build_asset(path)
        counts = (len(scene.objects), len(bpy.data.meshes), len(bpy.data.materials))
        scene = module.build_asset(path)
        assert counts == (len(scene.objects), len(bpy.data.meshes), len(bpy.data.materials)), 'rerun leaked data'
        assert bpy.context.window.scene == original_scene
        assert fingerprint() == before, 'foreign scene changed'
        def failure(**kwargs):
            raise RuntimeError('intentional export failure')
        try:
            common.export_owned_scene(scene, path, exporter=failure)
        except RuntimeError as error:
            assert str(error) == 'intentional export failure'
        assert bpy.context.window.scene == original_scene and fingerprint() == before
        try:
            common.export_owned_scene(scene, path, exporter=lambda **kwargs: {'CANCELLED'})
            raise AssertionError('Cancelled export reported as success')
        except RuntimeError as error:
            assert 'did not finish' in str(error)
        assert bpy.context.window.scene == original_scene and fingerprint() == before
        data = path.read_bytes()
        size = struct.unpack_from('<I', data, 12)[0]
        gltf = json.loads(data[20:20 + size])
        assert all(n.get('name', '').startswith(prefix) for n in gltf['nodes'])
        coords = [o.matrix_world @ v.co for o in scene.objects for v in o.data.vertices]
        bounds = [[min(v[i] for v in coords) for i in range(3)], [max(v[i] for v in coords) for i in range(3)]]
        triangles = sum(gltf['accessors'][p['indices']]['count'] // 3 for m in gltf['meshes'] for p in m['primitives'])
        entries.append(dict(id=ident, file='assets/' + path.name, nodePrefix=prefix, requiredNodes=required,
                            bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), meshes=len(gltf['meshes']),
                            materials=len(gltf['materials']), triangles=triangles, blenderBounds=bounds, maxBytes=350*1024))
    assert sum(e['bytes'] for e in entries) <= 1536*1024
    assert all(e['bytes'] <= e['maxBytes'] for e in entries)
    manifest = dict(generator='Blender ' + bpy.app.version_string, provenance='Original agent-authored artwork; AI-assisted personal learning project',
                    units='Arbitrary illustrative scene units; Blender Z-up exports to glTF Y-up', assets=entries,
                    verification='Foreign scene object/material/selection/active-object fingerprints unchanged; two generations and forced export failure per asset')
    (root / 'assets' / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print('AUTHORING_CHECKS_PASSED', json.dumps(entries))


if __name__ == '__main__':
    run_checks(Path(__file__).resolve().parents[1])