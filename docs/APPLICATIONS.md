# What could people actually use? (measured, preclinical, theory)

Owner-authorized speculative teaching content for an AI-assisted personal learning project
(2026-11-02: "bioprinting for boob jobs versus silicone bags ... not censoring and
implement/act after planning and get this sophisticated/advanced/research/cuttingEdge").
Every measured statement below is anchored to a source the development agent fetched from
the Europe PMC REST API on 2026-11-02; verbatim quotes and locators for every claim are in
`docs/applications-evidence-audit.json`. Statuses are **measured** (human data),
**preclinical** (animal or construct evidence), **research-stage** (field review), and
**theory** (reasoning). Nothing here is medical advice, a treatment recommendation, or an
instruction directed at any person or animal; augmentation in healthy tissue and
reconstruction after cancer are different risk contexts and this module computes neither.
The interactive version is the workbench's *Hypothetical applications ledger* and
*Hypothetical breast soft-tissue comparison* panels (`src/applications.js`).

## The applications ledger

**Ear reconstruction — preclinical.** Full-scale ears were DLP-printed from
organoid-laden bioinks and showed more cartilage-like matrix after implantation in nude
mice. No human bioprinted-ear result is reviewed here.

**Skin and wound printing — research-stage.** The reviewed survey covers extrusion-,
droplet-, laser- and light-based printing, bioinks, hair follicles, sweat glands and
pigmentation; vascularization, safety and process automation remain barriers to clinical
translation.

**Hair-follicle regeneration — preclinical.** Printed artificial skin transplanted into
nude-mouse wounds regenerated epidermis, dermis, follicles, vessels and sebaceous glands
resembling native skin.

**Human-scale printed constructs — preclinical.** The ITOP system printed stable
human-scale bone, cartilage and muscle constructs of clinically relevant shape from
clinical imaging data, with microchannels that overcome the 100–200 μm diffusion limit.
Human application was not established.

**Drug-testing tissues — preclinical.** Printed mature-adipocyte models are positioned
for early biological assessment and preliminary drug testing, and fluidically linked
organ chips target disease mechanisms, therapeutic testing and personalized medicine —
likely the first economically real application of bioprinting, because it needs control
and reproducibility rather than lifelong function in a body.

**Breast soft tissue — research-stage.** Printed adipose grafts carrying stem-cell
spheroids formed 8-fold more neovessels and 70% less fibrous tissue over eight weeks in
animals; mature human adipocytes were printed as in-vitro models. No human printed breast
result exists in the reviewed sources.

## Printed breast tissue versus silicone implants — the honest ledger

The wish is obvious: shape and volume made of *your own living cells*, growing with you,
no foreign shell. The evidence, uncensored, is less symmetrical.

**Silicone implants are the measured baseline, adverse record included.** A
74,756-discharge US study (2019–2022) quantifies what implant use really generates:
secondary procedures are common; cosmetic revisions more often involve capsulectomy or
removal without replacement; removal-without-replacement tracks with multiple
complications (adjusted odds ratio 2.17). Breast implant-associated anaplastic large cell
lymphoma (BIA-ALCL) is a rare T-cell lymphoma described as primarily associated with
**textured** implants, treated by complete surgical excision, with a favorable prognosis
when diagnosed early — one reviewed patient presented with swelling 20 years after
implantation.

**Autologous fat grafting is measured but partial.** In a six-patient cell-enriched
(CAL/SVF) feasibility series, 12-month MRI retention was 76.4–84.0%, one minor fat necrosis
occurred, and retention was lower in previously irradiated breasts. Retention is why fat
grafting means regrafting for many patients — the module turns *your* resorption
hypothesis into one-pass retention and session-count arithmetic.

**Autologous flaps are the gold standard — and major surgery.** The DIEP flap is described
as the gold standard for autologous reconstruction after mastectomy; across 2,964 flaps,
reported complications include fat necrosis up to 48.2% and venous congestion up to 55.1%
in single-vein cohorts. Flaps are what printed tissue aspires to match without
microsurgery; they are also why "just print it" is a research program, not a product.

**Printed adipose is the wish — with the right anchors.** In animals, printed grafts
with spheroid-enhanced vascularization outperformed conventional grafts; in vitro, printed
mature adipocytes stay viable for drug-testing models. No human result exists. The honest
statement is: the enabling problem (vascularizing soft-tissue volume) has a promising
preclinical answer and no clinical one.

**The excluded lever — unregulated injectable fillers.** A 10-patient complication series
documents what shortcut volumization without evidence actually produces: mastalgia 90%,
palpable masses 80%, cysts 80%, migration 30%, infection 20%; 40% required surgery including
mastectomy, and several findings forced BI-RADS 4 biopsies. Two of the ten cases were
autologous-fat complications, so the honesty cuts every way. The module shows this lever
and refuses to select it.

## What the arithmetic computes (and what it refuses to compute)

The panel computes one-pass retention (`planned × (1 − your resorption)`), regraft session
counts, and implant intervention counts — logistics only. It refuses to compute a safety
comparison, a benefit equivalence, or a recommendation, because the reviewed evidence does
not support one: implants carry a measured adverse record, fat retention is partial and
study-specific, flaps carry operative risk, and printed breast tissue has no human
evidence at all. That is the sophisticated answer: the dream is real enough to study, and
far from ready to sell.

## Sources reviewed for this module

Twelve abstracts fetched from the Europe PMC REST API on 2026-11-02 (PMIDs 42625740,
42295736, 42848728, 42420658, 42903308, 40509638, 42780948, 26878319, 39569402, 40083946,
35987699, 42399996); verbatim quotes and locators live in
`docs/applications-evidence-audit.json`. Mouse and animal findings are never transferred to
human outcomes anywhere in this workbench.
