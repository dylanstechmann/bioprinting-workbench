"""Original generic peristaltic perfusion-pump circuit artwork; no real operating
settings or measured scale. The circuit is illustrative: a pump head with three
rollers, a race loop of tubing, a media reservoir and inlet/outlet stubs toward the
perfusion chamber. Not vendor CAD, not a flow-rate model."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from authoring_common import create_owned_scene, material, box, cylinder, export_owned_scene
import math


def build_asset(output_path=None):
    scene = create_owned_scene('BioWorkbench_Pump')
    white = material(scene, 'Coat', (.86, .89, .87), coat=.3)
    metal = material(scene, 'Metal', (.58, .63, .63), metallic=.8)
    dark = material(scene, 'Polymer', (.1, .14, .14))
    glass = material(scene, 'Glass', (.80, .93, .88), roughness=.06, transmission=.85)
    tube = material(scene, 'Tubing', (.78, .86, .84), roughness=.35, transmission=.25)
    screen = material(scene, 'Display', (.03, .25, .21), emission=(.08, .4, .33), emission_strength=.5)
    # Bench base and the pump body with the circular rotor housing on its front face.
    box(scene, 'Pump_Base', (1.7, 1.15, .14), (0, 0, .07), white)
    box(scene, 'Pump_Body', (.78, .62, .86), (-.25, 0, .57), white)
    cylinder(scene, 'Pump_Head', .40, .16, (-.25, -.40, .62), metal, axis='Y')
    cylinder(scene, 'Pump_HeadHub', .07, .20, (-.25, -.42, .62), dark, axis='Y')
    # Three rollers at 120 degrees around the hub, squeezing the race tubing.
    for i in range(3):
        a = math.radians(90 + i * 120)
        x = -.25 + .22 * math.cos(a)
        z = .62 + .22 * math.sin(a)
        cylinder(scene, f'Pump_Roller_{i+1}', .085, .10, (x, -.50, z), dark, axis='Y')
    # The race: eight tubing segments forming the loop the rollers occlude.
    for i in range(8):
        a = math.radians(i * 45)
        x = -.25 + .315 * math.cos(a)
        z = .62 + .315 * math.sin(a)
        cylinder(scene, f'Pump_RaceSegment_{i+1}', .030, .06, (x, -.50, z), tube, axis='Y')
    # Inlet and outlet stubs: reservoir side in, chamber side out.
    cylinder(scene, 'Pump_Tube_Inlet', .032, .55, (.35, -.50, .62), tube, axis='X')
    cylinder(scene, 'Pump_Tube_Outlet', .032, .45, (-.85, -.50, .62), tube, axis='X')
    # Media reservoir with a cap, a level window and a base collar.
    cylinder(scene, 'Pump_Reservoir', .27, .62, (.95, .05, .45), glass)
    cylinder(scene, 'Pump_ReservoirCap', .29, .07, (.95, .05, .80), dark)
    cylinder(scene, 'Pump_ReservoirCollar', .29, .06, (.95, .05, .17), metal)
    box(scene, 'Pump_ReservoirLabel', (.20, .02, .12), (.95, -.23, .45), white, .004)
    # Front control panel with a small status display and two keys.
    box(scene, 'Pump_Control', (.30, .03, .16), (-.25, -.325, 1.06), dark, .006)
    box(scene, 'Pump_Display', (.16, .02, .07), (-.25, -.35, 1.07), screen, .004)
    for i, x in enumerate((-.36, -.14)):
        box(scene, f'Pump_Key_{i+1}', (.05, .025, .05), (x, -.35, .99), metal, .004)
    export_owned_scene(scene, output_path or Path(__file__).with_name('perfusion_pump.glb'))
    return scene


if __name__ == '__main__':
    build_asset()
