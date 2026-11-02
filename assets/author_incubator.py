"""Original generic incubator artwork; no real operating settings or measured scale."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from authoring_common import create_owned_scene, material, box, cylinder, export_owned_scene


def build_asset(output_path=None):
    scene = create_owned_scene('BioWorkbench_Incubator')
    white = material(scene, 'Coat', (.88, .90, .87), coat=.3)
    metal = material(scene, 'Metal', (.6, .65, .64), metallic=.8)
    dark = material(scene, 'Polymer', (.1, .15, .14))
    glass = material(scene, 'Glass', (.83, .94, .9), roughness=.06, transmission=.9)
    screen = material(scene, 'Display', (.03, .25, .21), emission=(.08, .4, .33), emission_strength=.5)
    for x in [-1.04, 1.04]:
        box(scene, f'Incubator_Side_{x}', (.13, 1.8, 2.7), (x, 0, 1.4), white)
    box(scene, 'Incubator_Back', (2.2, .12, 2.7), (0, .86, 1.4), white)
    box(scene, 'Incubator_Base', (2.2, 1.8, .16), (0, 0, .08), white)
    box(scene, 'Incubator_Top', (2.2, 1.8, .24), (0, 0, 2.68), white)
    box(scene, 'Incubator_Glass_Door', (1.87, .035, 2.2), (0, -.91, 1.35), glass, 0)
    for x in [-.98, .98]:
        box(scene, f'Incubator_DoorFrame_{x}', (.1, .1, 2.35), (x, -.94, 1.36), metal)
    for z in [.2, 2.5]:
        box(scene, f'Incubator_DoorRail_{z}', (2.04, .1, .1), (0, -.94, z), metal)
    box(scene, 'Incubator_Handle', (.09, .12, .6), (.83, -1.03, 1.4), dark)
    for z in [.5, 1.15, 1.8]:
        box(scene, f'Incubator_Shelf_{z}', (1.9, 1.5, .045), (0, 0, z), metal, .005)
    box(scene, 'Incubator_Display', (.48, .03, .12), (0, -.92, 2.68), screen, .005)
    for x in [-.85, .85]:
        for y in [-.65, .65]:
            cylinder(scene, f'Incubator_Foot_{x}_{y}', .09, .08, (x, y, -.04), dark)
    export_owned_scene(scene, output_path or Path(__file__).with_name('incubator.glb'))
    return scene


if __name__ == '__main__':
    build_asset()