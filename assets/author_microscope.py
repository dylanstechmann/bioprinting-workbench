"""Original generic inverted-microscope artwork, not an optical instrument model."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from authoring_common import create_owned_scene, material, box, cylinder, export_owned_scene


def build_asset(output_path=None):
    scene = create_owned_scene('BioWorkbench_Microscope')
    white = material(scene, 'Coat', (.88, .90, .87), coat=.4)
    dark = material(scene, 'Polymer', (.09, .14, .13))
    metal = material(scene, 'Metal', (.6, .65, .64), metallic=.8)
    glass = material(scene, 'Glass', (.75, .9, .87), roughness=.05, transmission=.8)
    box(scene, 'Microscope_Base', (1.7, 1.75, .22), (0, 0, .11), white, .06)
    box(scene, 'Microscope_RearColumn', (.33, .4, 2.15), (0, .58, 1.22), white, .06)
    box(scene, 'Microscope_Stage', (1.45, 1.25, .09), (0, -.13, 1.12), dark)
    cylinder(scene, 'Microscope_StageWindow', .31, .012, (0, -.3, 1.175), glass)
    cylinder(scene, 'Microscope_ObjectiveTurret', .3, .1, (0, -.3, .72), metal)
    for i, x in enumerate([-.2, 0, .2]):
        cylinder(scene, f'Microscope_Objective_{i}', .065, .25, (x, -.3, .88), dark)
    box(scene, 'Microscope_IlluminationArm', (.22, 1.1, .18), (0, .15, 2.22), white)
    cylinder(scene, 'Microscope_Condenser', .18, .36, (0, -.3, 1.96), metal)
    cylinder(scene, 'Microscope_Lamp', .22, .1, (0, -.3, 2.23), dark)
    box(scene, 'Microscope_ObservationBridge', (.7, .8, .24), (0, -.65, .48), white)
    for x in [-.2, .2]:
        cylinder(scene, f'Microscope_Eyepiece_{x}', .095, .38, (x, -1, .57), dark, axis='Y')
        cylinder(scene, f'Microscope_Focus_{x}', .16, .16, (x * 3, .35, .7), dark, axis='X')
    for x in [-.6, .6]:
        cylinder(scene, f'Microscope_Foot_{x}', .09, .06, (x, .45, -.03), dark)
    cylinder(scene, 'Microscope_Dish', .16, .035, (0, -.3, 1.19), glass)
    box(scene, 'Microscope_SlideBox', (.22, .16, .05), (.45, .15, 1.175), dark, .005)
    export_owned_scene(scene, output_path or Path(__file__).with_name('microscope.glb'))
    return scene


if __name__ == '__main__':
    build_asset()