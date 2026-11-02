# Virtual procedure walkthrough (educational)

This guide accompanies the in-app **Virtual procedure walkthrough**. It summarizes how
published, open-access tissue-engineering workflows describe scaffold-based construct
development, stage by stage, mapped onto the simulator's five stages.

**What this is not:** a laboratory protocol. Actionable parameters (concentrations,
incubation times, volumes, device settings) are deliberately not restated here; they remain
in the cited sources. Nothing in this walkthrough directs any activity toward a person or
an animal, and the final stage describes published in-vivo research rather than surgical
guidance. This is an AI-assisted, agent-run educational summary, not independent expert
review, and not a reproduction of any published experiment.

**Gating:** by default each stage's virtual QC checkpoints must be completed before the
next stage unlocks. The checkpoints are in-simulation actions (setting controls, observing
the scene, exporting the scenario), not real-world lab actions. A "Free exploration" toggle
unlocks all stages without removing the checkpoints.

## Stage 1 · Cell expansion

**Isolate and expand cells in culture.** Published vascularized-tissue work begins from
cultured human cell stocks before any construct is assembled. Kolesky et al. (2016) printed
thick human tissues that integrated multiple cell types, including human mesenchymal stem
cells, expanded in culture before printing.
*Checkpoints:* set the relative cell population control and watch the dish population rise;
identify the incubator, culture dishes and inverted microscope on the bench.
*Not established here:* cell identity, sterility and contamination testing are not
simulated; passage limits, donor variability, genome stability, residual pluripotent cells
and phenotype stability remain unmeasured. Division speed is not a cancer-risk assessment.
The independent cell-learning panels add cited context without changing the 16 gate IDs
or turning virtual checks into laboratory certification; see CELL_DIVISION.md.

## Stage 2 · Scaffold deposition

**Prepare matrix material and printhead.** A biocompatible matrix is selected and loaded
into a cartridge so printed filaments hold their shape. Kolesky et al. (2016) combined an
engineered extracellular matrix with embedded vasculature in one multimaterial bioprinting
process; CELLINK's public BIO X page supplies the generic equipment vocabulary
(enclosed printer, interchangeable cartridges and printheads) illustrated here.
*Checkpoints:* choose filament spacing and layer count; find the cartridge and nozzle on
the printhead.

**Deposit scaffold filaments layer by layer.** Alternating filaments build a porous
lattice. Kolesky et al. (2016) used multimaterial 3D bioprinting to produce thick (>1 cm)
human tissues with programmed architecture.
*Checkpoints:* play or scrub the deposition stage and watch the head trace the toolpath;
change spacing or layer count and confirm the lattice rebuilds.
*Not established here:* material rheology, crosslinking behavior, sterility, printability
windows, nozzle clogging, filament collapse, resolution limits and crosslink timing.

## Stage 3 · Cell organization

**Seed cells onto the scaffold.** Cells take up positions around the filaments while an
illustrative matrix appears — a scripted visualization, not a growth model. The printed
tissues of Kolesky et al. (2016) integrated parenchyma, stroma and endothelium, with
multiple cell types organized within the matrix.
*Checkpoints:* watch the scripted occupancy readout rise; toggle "Reveal scaffold" to
compare cell positions against the translucent matrix.
*Not established here:* adhesion, proliferation, migration and differentiation are not
predicted.

## Stage 4 · Vascular & perfusion concept

**Form designed perfusable channels.** Engineered channels provide a perfusion path;
making them is separate from showing they behave like vessels. Kolesky et al. (2016)
printed embedded vasculature within thick tissues and made it perfusable. Grigoryan et al.
(2019), using a different modality — projection stereolithography with biocompatible
photoabsorber additives — produced entangled multivascular networks from space-filling
mathematical topologies.
*Checkpoints:* toggle "Include designed channels" and watch the tracer stop and resume;
inspect the channel entry manifolds in the perfusion chamber view.

**Begin illustrative perfusion.** A closed virtual circuit moves tracer through the
channels at a chosen illustrative rate. Kolesky et al. (2016) actively perfused printed
tissues with growth factors for over six weeks, supporting in-situ differentiation of
human mesenchymal stem cells; Grigoryan et al. (2019) flowed and oxygenated human red
blood cells through printed vascular topologies in vitro.
*Checkpoints:* adjust the illustrative flow control; trace the reservoir, pump and
perfusion chamber circuit.
*Not established here:* endothelial lining, barrier function, leak tightness, pressure,
shear stress, mass transport and oxygenation.

## Stage 5 · Hypothetical graft integration

**Characterize the construct first.** Before any translational question, a lab measures
identity, mechanics and function; the virtual review panel lists these as open. The
long-duration perfusion and lineage differentiation reported by Kolesky et al. (2016)
illustrate the kind of functional evidence published work reports.
*Checkpoints:* export the scenario JSON and review its recorded parameters and
limitations; read the research review panel.

**Treat host integration as an open question.** Whether a construct connects to a
recipient's circulation and survives is unresolved; the walkthrough stops at the question.
Grigoryan et al. (2019) deployed structured biodegradable hydrogel carriers in a rodent
model of chronic liver injury — an example of early in-vivo research in this field,
described here as a published finding only.
*Checkpoints:* switch the recipient context label and confirm the model state values do
not change; read the on-screen notice that integration is not simulated or established.
*Not established here:* anastomosis, immune response, adverse effects and long-term
outcomes are not simulated; no transplant readiness is assessed.

## Sources

- Kolesky DB, Homan KA, Skylar-Scott MA, Lewis JA. Three-dimensional bioprinting of thick
  vascularized tissues. *Proc Natl Acad Sci USA* 2016. https://doi.org/10.1073/pnas.1521342113
  (open access; DOI and title re-verified 2026-11-01)
- Grigoryan B, Paulsen SJ, Corbett DC, et al. Multivascular networks and functional
  intravascular topologies within biocompatible hydrogels. *Science* 2019.
  https://doi.org/10.1126/science.aav9750 (open access; DOI and title re-verified
  2026-11-01; the in-vivo deployment described above is stated in the paper's abstract)
- CELLINK, BIO X product page (equipment vocabulary only):
  https://www.cellink.com/bioprinting/bio-x-3d-bioprinter/

Registry title matches do not, by themselves, establish that these sources support each
sentence above; the attributions were checked against the open-access texts during
development. No figures, tables or datasets were copied.
