# The parts list, priced honestly: what a physical benchtop rig would cost

Owner-authorized speculative teaching content for an AI-assisted personal learning
project (2026-11-02: "Go through the parts list for the bioprinting and the cost for each
and make visualizations that will display in a browser? The parts list and prices are for
reference … figuring stuff out on the computer prior to in the physical in which more is
at stake"). **Every price below is an authored indicative estimate** — not a quote, not
current, and subject to change without notice. Public vendor pages (Adafruit, Creality,
Fisher, Sigma-Aldrich) were attempted for price anchoring on 2026-11-02 and could not be
fetched from this environment, so no price here claims to be what any page shows today;
the validator keeps a `fetched-list-price` path for future anchored numbers, and none are
present. No purchase is recommended. The interactive version is the workbench's
*Reference hardware costs* panel (`src/hardware-costs.js` + the SVG chart in
`src/hardware-costs-ui.js`); the printed syringe carriage is the companion project
[open-perfusion-rig](https://github.com/dylanstechmann/open-perfusion-rig), whose own
documentation supplies the honesty this list inherits (PLA is not a sterile fluid path;
a 0.22 µm filter belongs in the line if fluid meets a culture; commercial enclosed
supplies only).

## The rule the chart enforces

One-time and recurring costs are **never summed**. A bench you buy once and a habit you
fund every month are different facts; hiding the difference is how hobby budgets go
wrong. The panel's two bars keep them apart, and so does every number below.

## The parts (reference estimates, USD)

**Motion platform — $325 one-time.** Used or kit FDM printer as the motion stage $180;
spare NEMA17 steppers ×3 $60; GRBL/RAMPS-class controller $50; enclosed 12 V supply $35.
The honest starting point is an off-the-shelf motion stage, not a custom gantry.

**Extrusion toolhead — $115 one-time.** DIY syringe-pump extruder hardware (leadscrew,
linear rail, coupling, mounts) $90; filament to print the open-perfusion-rig carriage and
mounts $25. This is the part the free in-silico workbench lets you design and iterate
before any metal or plastic is bought.

**Bioink materials — $80 one-time + $340/month.** Sodium alginate 100 g $45; gelatin 500 g
$20; calcium chloride 100 g $15. Once cells enter the picture: basal medium 500 mL $90
and FBS 100 mL $250 recur — the heaviest recurring line in the hobby band, and an ethical
and supply-chain question in its own right.

**Sterile-culture infrastructure — $4,890 one-time, all optional for the acellular path.**
Stovetop pressure sterilizer $90 (not a certified autoclave); hobby laminar-flow hood
$1,900; used CO2 incubator $2,500; basic microscope $400. This category is why the
cell-capable bench costs what it costs: clean airflow and CO2 control are infrastructure,
not gadgets, and they dwarf the printer five times over.

**Measurement/QC — $205 one-time.** 0.001 g scale $70; bench pH meter $90; USB temperature
logger $45. The cheapest honest QC step is gravimetric — measure before believing, the
same philosophy as the perfusion-calibration-lab approach.

**Recurring consumables — $185/month.** Sterile syringes/needles $40; dishes and flasks
$55; 0.22 µm filters $60; gloves and disinfectant $30. Single-use items are the rule;
reuse is a contamination decision, not a saving.

## Two honest ways into the hobby

- **Acellular practice path (no cells): about $725 once + $185/month.** Printing practice
  hydrogels, learning extrusion, checking mass and pH. This is the path the workbench
  itself prepares you for, and it needs none of the sterile-culture category, medium or
  serum.
- **Cell-culture-capable path: about $5,615 once + $525/month.** Everything above, plus
  the infrastructure cells require. Roughly 87% of the one-time money is sterile-culture
  infrastructure alone — not the printer, not the toolhead.

## Why figure it out on the computer first

The aspiration framing — "getting eternal youth / lack of any bodily damage" — is exactly
why the in-silico workbench exists: the physical bench is where cells die, money burns,
sterility fails and safety becomes real. Nothing on this parts list buys any biological
outcome; the research-program module's evidence floor still applies, a thousand dollars
of stepper motors adds zero to it, and the free simulation is the honest place to make
the beginner's mistakes. No amount of parts makes any of this medicine, and nothing here
directs anything at any person or animal.
