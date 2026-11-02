"""Author static printer artwork.

Original procedural asset for a personal hobby/learning project (AI-assisted).
Static printer artwork in arbitrary illustrative scene units.
Blender Z-up (x,y,z) exports to Three.js (x,z,-y); front is Blender -Y.
Animated printhead deliberately remains procedural in the browser.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from authoring_common import create_owned_scene, material as make_material, box as make_box, cylinder, export_owned_scene


def build_asset(output_path=None):
    scene = create_owned_scene('BioWorkbench_Bioprinter')
    material = lambda *args, **kw: make_material(scene, *args, **kw)
    box = lambda *args, **kw: make_box(scene, *args, **kw)
    cyl = lambda *args, **kw: cylinder(scene, *args, **kw)
    WHITE = material('PowderCoat_White', (0.88, 0.90, 0.87), metallic=0.08, roughness=0.42, coat=0.35)
    ALU = material('Brushed_Aluminum', (0.62, 0.66, 0.65), metallic=0.85, roughness=0.3)
    DARK = material('Dark_Polymer', (0.10, 0.14, 0.13), metallic=0.2, roughness=0.5)
    GLASS = material('Enclosure_Glass', (0.86, 0.94, 0.91), roughness=0.05, transmission=1.0)
    PLATE = material('Anodized_BuildPlate', (0.16, 0.19, 0.18), metallic=0.75, roughness=0.35)
    SCREEN = material('Status_Screen', (0.05, 0.30, 0.27), roughness=0.3,
                      emission=(0.12, 0.55, 0.48), emission_strength=1.2)

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


    # Syringe-extruder toolhead (docked at the left gantry; matches the 0.13 reference parts list).
    BIOINK = material('Bioink_Glass', (0.85, 0.72, 0.42), roughness=0.12, transmission=0.85)
    box('Printer_ToolheadCrossBeam', (0.26, 2.0, 0.16), (-1.2, -0.05, 2.55), ALU, 0.015)
    box('Printer_ToolheadCarriage', (0.36, 0.32, 0.52), (-1.2, -0.05, 2.28), DARK, 0.02)
    box('Printer_SyringeMount', (0.2, 0.2, 0.26), (-1.2, -0.05, 1.98), ALU, 0.01)
    cyl('Printer_SyringeBarrel', 0.13, 1.1, (-1.2, -0.05, 1.35), BIOINK)
    cyl('Printer_SyringePlunger', 0.055, 0.92, (-1.2, -0.05, 1.86), WHITE)
    cyl('Printer_SyringePlungerCap', 0.14, 0.1, (-1.2, -0.05, 2.3), DARK)
    cyl('Printer_SyringeNeedleCollar', 0.05, 0.1, (-1.2, -0.05, 0.75), ALU)
    cyl('Printer_SyringeNeedleTip', 0.022, 0.2, (-1.2, -0.05, 0.62), ALU)

    export_owned_scene(scene, output_path or Path(__file__).with_name('bioprinter.glb'))
    return scene


if __name__ == '__main__':
    build_asset()
