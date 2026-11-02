"""Original AI-assisted teaching artwork; arbitrary scene units, not vendor CAD.

Mesh creation uses only the data API/bmesh. Export changes the window scene
temporarily, without changing the foreign scene's mode, active object or selection.
No .blend file is saved. Only scenes carrying our ownership marker are rebuilt.
"""
import bpy
import bmesh
import math
from mathutils import Matrix

OWNER = 'bioprinting-workbench'


def create_owned_scene(name):
    if bpy.context.mode != 'OBJECT':
        raise RuntimeError('Safe export requires Object mode; no user mode was changed')
    old = bpy.data.scenes.get(name)
    if old:
        # The pre-marker v0.3 scene needs explicit adoption, never automatic deletion.
        if old.get('asset_owner') != OWNER:
            raise RuntimeError(f'{name} is not marked as owned; rename it before generation')
        for obj in old.objects:
            if any(obj.name in s.objects for s in bpy.data.scenes if s != old):
                raise RuntimeError(f'Refusing to remove shared object {obj.name}')
        meshes = [o.data for o in old.objects if o.type == 'MESH']
        materials = {m for mesh in meshes for m in mesh.materials if m}
        for obj in list(old.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.scenes.remove(old)
        for mesh in meshes:
            if mesh.users == 0:
                bpy.data.meshes.remove(mesh)
        for mat in materials:
            if mat.users == 0 and mat.get('asset_owner') == OWNER:
                bpy.data.materials.remove(mat)
    scene = bpy.data.scenes.new(name)
    scene['asset_owner'] = OWNER
    scene['units_notice'] = 'Arbitrary illustrative scene units, not measured equipment'
    return scene


def material(scene, name, color, metallic=0, roughness=.45, transmission=0,
             coat=0, emission=None, emission_strength=0):
    mat = bpy.data.materials.new(scene.name + '_' + name)
    mat['asset_owner'] = OWNER
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    for key, value in [('Base Color', (*color, 1)), ('Metallic', metallic),
                       ('Roughness', roughness), ('Transmission Weight', transmission),
                       ('IOR', 1.45), ('Coat Weight', coat)]:
        bsdf.inputs[key].default_value = value
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    return mat


def _object(scene, name, bm, loc, mat):
    if bpy.data.objects.get(name):
        bm.free()
        raise RuntimeError(f'Foreign object name collision: {name}; use a fresh Blender session')
    data = bpy.data.meshes.new(scene.name + '_' + name)
    bm.to_mesh(data)
    bm.free()
    data.update()
    obj = bpy.data.objects.new(name, data)
    obj.location = loc
    data.materials.append(mat)
    scene.collection.objects.link(obj)
    return obj


def box(scene, name, dims, loc, material, bevel=.02):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co.x *= dims[0]
        v.co.y *= dims[1]
        v.co.z *= dims[2]
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(bevel, min(dims) / 3), segments=3, affect='EDGES')
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    return _object(scene, name, bm, loc, material)


def cylinder(scene, name, radius, depth, loc, material, axis='Z', vertices=32):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=vertices,
                          radius1=radius, radius2=radius, depth=depth)
    if axis != 'Z':
        rotation = Matrix.Rotation(math.pi / 2, 4, 'Y' if axis == 'X' else 'X')
        bmesh.ops.transform(bm, matrix=rotation, verts=list(bm.verts))
    obj = _object(scene, name, bm, loc, material)
    for face in obj.data.polygons:
        face.use_smooth = len(face.vertices) == 4
    return obj


def export_owned_scene(scene, path, exporter=None):
    if scene.get('asset_owner') != OWNER or bpy.context.mode != 'OBJECT':
        raise RuntimeError('Unsafe export context')
    window = bpy.context.window
    if window is None:
        raise RuntimeError('No export window context; use Blender background default context')
    previous = window.scene
    try:
        window.scene = scene
        operation = exporter or bpy.ops.export_scene.gltf
        result = operation(filepath=str(path), export_format='GLB', use_active_scene=True,
                           export_apply=True, export_yup=True, export_materials='EXPORT')
        if result != {'FINISHED'}:
            raise RuntimeError(f'GLB export did not finish: {result}')
    finally:
        window.scene = previous
    print(f'EXPORTED {path}: {len(scene.objects)} owned objects; active scene restored')