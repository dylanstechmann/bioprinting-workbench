"""Original generic chamber artwork; no fluid or biological validation."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from authoring_common import create_owned_scene, material, box, cylinder, export_owned_scene


def build_asset(output_path=None):
    scene = create_owned_scene('BioWorkbench_PerfusionChamber')
    white = material(scene, 'Coat', (.88, .90, .87), coat=.3)
    metal = material(scene, 'Metal', (.62, .67, .66), metallic=.8)
    dark = material(scene, 'Gasket', (.1, .2, .17))
    glass = material(scene, 'Glass', (.85, .94, .92), roughness=.05, transmission=.95)
    box(scene, 'Chamber_Base', (2.3, 2.3, .18), (0, 0, .09), white, .04)
    for x in [-.98, .98]:
        box(scene, f'Chamber_Glass_Side_{x}', (.035, 2, .65), (x, 0, .5), glass, 0)
    for y in [-.98, .98]:
        box(scene, f'Chamber_Glass_End_{y}', (2, .035, .65), (0, y, .5), glass, 0)
    box(scene, 'Chamber_Glass_Lid', (2.08, 2.08, .06), (0, 0, .86), glass, .005)
    for x in [-1.02, 1.02]:
        box(scene, f'Chamber_Gasket_{x}', (.06, 2.12, .04), (x, 0, .81), dark, .005)
        cylinder(scene, f'Chamber_Port_{x}', .1, .3, (x * 1.1, 0, .45), metal, axis='X')
        for y in [-1.02, 1.02]:
            cylinder(scene, f'Chamber_Fastener_{x}_{y}', .055, .12, (x, y, .88), metal)
    export_owned_scene(scene, output_path or Path(__file__).with_name('perfusion_chamber.glb'))
    return scene


if __name__ == '__main__':
    build_asset()