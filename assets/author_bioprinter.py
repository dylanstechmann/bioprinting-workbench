"""Author the Bioprinting Workbench bioprinter body in Blender and export GLB.

Original procedural asset for a personal hobby/learning project (AI-assisted).
Run inside Blender (Text Editor > Run Script, or `blender --background --python
assets/author_bioprinter.py`). Creates a SEPARATE scene named
'BioWorkbench_Bioprinter' and never modifies or saves the user's existing scene
or .blend file. The GLB is written next to this script as bioprinter.glb.

Coordinates are meters in Blender Z-up; the glTF exporter converts to Y-up, so
Blender (x, y, z) becomes three.js (x, z, -y). Front of the printer is -Y in
Blender (+Z in three.js), matching the procedural printer it replaces. The
animated printhead is intentionally NOT part of this asset: it stays procedural
in the browser so deposition can move it.
"""
import bpy
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bioprinter.glb')
SCENE_NAME = 'BioWorkbench_Bioprinter'

# Idempotent: rebuild only our own scene, never the user's scene.
old = bpy.data.scenes.get(SCENE_NAME)
if old:
    for obj in list(old.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.scenes.remove(old)
scene = bpy.data.scenes.new(SCENE_NAME)


def material(name, color, metallic=0.0, roughness=0.45, transmission=0.0,
             coat=0.0, emission=None, emission_strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if transmission:
        bsdf.inputs['Transmission Weight'].default_value = transmission
        bsdf.inputs['IOR'].default_value = 1.45
    if coat:
        bsdf.inputs['Coat Weight'].default_value = coat
        bsdf.inputs['Coat Roughness'].default_value = 0.3
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    return m


WHITE = material('PowderCoat_White', (0.88, 0.90, 0.87), metallic=0.08, roughness=0.42, coat=0.35)
ALU = material('Brushed_Aluminum', (0.62, 0.66, 0.65), metallic=0.85, roughness=0.3)
DARK = material('Dark_Polymer', (0.10, 0.14, 0.13), metallic=0.2, roughness=0.5)
GLASS = material('Enclosure_Glass', (0.86, 0.94, 0.91), roughness=0.05, transmission=1.0)
PLATE = material('Anodized_BuildPlate', (0.16, 0.19, 0.18), metallic=0.75, roughness=0.35)
SCREEN = material('Status_Screen', (0.05, 0.30, 0.27), roughness=0.3,
                  emission=(0.12, 0.55, 0.48), emission_strength=1.2)


def box(name, dims, loc, mat, bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for coll in list(obj.users_collection):
        coll.objects.unlink(obj)
    scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('EdgeBevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        obj.modifiers.new('WeightedNormals', 'WEIGHTED_NORMAL')
    return obj


def cyl(name, radius, depth, loc, mat, axis='Z', vertices=32):
    rotation = (0, 1.5707963, 0) if axis == 'X' else (0, 0, 0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius,
                                        depth=depth, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    for coll in list(obj.users_collection):
        coll.objects.unlink(obj)
    scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


# Housing and frame (front = -Y).
box('Printer_Base', (3.7, 3.4, 0.27), (0, 0, 0.07), WHITE, 0.05)
box('Printer_TopCap', (3.7, 3.4, 0.38), (0, 0, 3.25), WHITE, 0.05)
box('Printer_BackPanel', (3.6, 0.14, 2.9), (0, 1.65, 1.7), WHITE, 0.02)
for sx in (-1, 1):
    for sy in (-1, 1):
        box(f'Printer_Post_{sx}_{sy}', (0.13, 0.13, 3.0), (sx * 1.72, sy * 1.55, 1.65), ALU, 0.015)
        cyl(f'Printer_Foot_{sx}_{sy}', 0.09, 0.07, (sx * 1.5, sy * 1.35, -0.10), DARK)

# Glass enclosure with framed front door (glass casts no shadow in browser).
for sx in (-1, 1):
    box(f'Printer_Glass_Side_{sx}', (0.02, 3.0, 2.85), (sx * 1.78, 0, 1.7), GLASS, 0.0)
box('Printer_Glass_Door', (3.28, 0.02, 2.79), (0, -1.57, 1.7), GLASS, 0.0)
for sx in (-1, 1):
    box(f'Printer_DoorStile_{sx}', (0.06, 0.06, 2.85), (sx * 1.67, -1.57, 1.7), ALU, 0.01)
for z, tag in ((0.275, 'Bottom'), (3.125, 'Top')):
    box(f'Printer_DoorRail_{tag}', (3.34, 0.06, 0.06), (0, -1.57, z), ALU, 0.01)
box('Printer_DoorHandle', (0.06, 0.08, 0.5), (1.5, -1.66, 1.6), DARK, 0.02)

# Build plate, guide rails, fasteners.
box('Printer_BuildPlate', (2.9, 2.9, 0.12), (0, 0, 0.25), PLATE, 0.02)
for y in (0.8, -0.9):
    cyl(f'Printer_GuideRail_{y}', 0.045, 3.0, (0, y, 2.7), ALU, axis='X')
for sx in (-1, 1):
    for sy in (-1, 1):
        cyl(f'Printer_Fastener_{sx}_{sy}', 0.055, 0.025, (sx * 1.35, sy * 1.35, 0.325), DARK)

# Front accents: vent slats, dark strip, status display.
for i in range(10):
    box(f'Printer_Vent_{i}', (0.12, 0.02, 0.02), (-1.1 + i * 0.22, -1.68, 3.03), ALU, 0.0)
box('Printer_AccentStrip', (3.3, 0.06, 0.09), (0, -1.64, 2.95), DARK, 0.01)
box('Printer_DisplayBezel', (0.8, 0.03, 0.25), (0, -1.73, 0.08), DARK, 0.01)
box('Printer_DisplayScreen', (0.55, 0.035, 0.12), (0, -1.75, 0.09), SCREEN, 0.005)

# Export ONLY our scene: the exporter's use_active_scene refers to the active
# window scene, so make ours active for the export and restore the user's
# scene immediately afterwards.
window = bpy.context.window
previous_scene = window.scene if window else None
if window:
    window.scene = scene
try:
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format='GLB',
        use_active_scene=True,
        export_apply=True,
        export_yup=True,
        export_materials='EXPORT',
    )
finally:
    if window and previous_scene:
        window.scene = previous_scene
print(f'EXPORTED {OUT} with {len(scene.objects)} objects; existing scenes untouched: '
      f'{[s.name for s in bpy.data.scenes]}; active scene restored to '
      f'{bpy.context.window.scene.name if bpy.context.window else None}')
