# Source ledger

Checked on 2026-11-01. Primary publications and official vendor/software documentation
are context, not calibration data. Bibliographic resolution is separate from claim support.
No source supports the synthetic numeric inputs or a complete scaffold-to-transplant workflow.
New observational timing rows are read-only literature context, separate from synthetic
inputs and never operating schedules; see the 0.7.0-dev ledger below.

| Source | Identifier / official URL | Supported context | Not inferred |
| --- | --- | --- | --- |
| Kolesky, Homan, Skylar-Scott & Lewis (2016), Three-dimensional bioprinting of thick vascularized tissues | https://doi.org/10.1073/pnas.1521342113 ; PMID 26951646 ; https://pmc.ncbi.nlm.nih.gov/articles/PMC4812707/ | Multimaterial cell-containing matrices and perfusable engineered vasculature | Our scaffold-first animation reproduces their printing or establishes a transplant-ready graft |
| Grigoryan et al. (2019), Multivascular networks and functional intravascular topologies within biocompatible hydrogels | https://doi.org/10.1126/science.aav9750 ; PMID 31048486 ; https://pmc.ncbi.nlm.nih.gov/articles/PMC7769170/ | Complex multivascular hydrogel architecture with projection stereolithography, a different fabrication modality | Our extrusion geometry reproduces this work or our tracer proves endothelial or organ function |
| CELLINK, official BIO X product material | https://www.cellink.com/bioprinting/bio-x-3d-bioprinter/ | Enclosed printer, cartridges/printheads and culture-vessel-compatible build surface as equipment vocabulary | Exact dimensions, hardware selection, commercial endorsement or operating parameters |
| Three.js official documentation | https://threejs.org/docs/ | WebGL scene construction and OrbitControls | Scientific validity of any rendered biology |

The publication metadata and primary-source full texts on PMC were accessed and examined
during development. Both DOIs resolved successfully through the citation-check tool on
2026-11-01; titles match the entries above. No images, protocols or datasets were copied.
Identifier-check results, including any unreachable services, are reported separately in
`VERIFICATION.md`. Source review was agent-run, not independent expert review.

Local read-only references: `regen-workbench/RESEARCH_DESK.md` and
`RESEARCH_PHILOSOPHY.md`; `uniStemCourseSimulators/frontend/src/components/PipetteBench3D.tsx`;
`ieee/ieee/mule-dynamics-studio/{README.md,app.js,core.js}`; `machine-cad-agent/web/index.html`.
These informed separation of evidence, model and renderer. No sibling code or data copied.

The procedure walkthrough added on 2026-11-01 (`docs/PROCEDURE.md` and the in-app panel)
cites only the three sources above; no new source was introduced. The Kolesky and
Grigoryan attributions were checked against the open-access full text and abstract
respectively during development, including the Grigoryan rodent-model deployment stated
in the paper's abstract. Registry title matches alone do not establish claim support.

## 0.7.0-dev cell-learning ledger (agent-run, November 1, 2026)

Six new research DOIs resolved with no registry flags; no expected-title comparison was
supplied, so these are resolutions, not automated title MATCH results. Official NHGRI
definitions and ATCC's primary-cell guide were read directly, not DOI-verified. Full-text
claim locators and review limitations are in `cell-evidence-audit.json`; registry resolution
alone never upgrades a claim. No paper figure, culture recipe or dataset was copied.

| Source | Identifier | Supported scope | Not inferred |
| --- | --- | --- | --- |
| Bhat et al. (2021), Expansion and characterization of bone marrow derived human mesenchymal stromal cells in serum-free conditions | 10.1038/s41598-021-83088-1; PMC7873235 | Figure 4 caption's condition-dependent population doubling observations | Universal MSC interval, schedule, transfer of distinct P4–P5 endpoints |
| Ghule et al. (2011), Reprogramming the pluripotent cell cycle: Restoration of an abbreviated G1 phase in human induced pluripotent stem (iPS) cells | 10.1002/jcp.22440; PMC3045197 | Results/Figure 6 cell-cycle observation | Population doubling time or rate for differentiated derivatives |
| Halliwell et al. (2020), Nucleosides Rescue Replication-Mediated Genome Instability of Human Pluripotent Stem Cells | 10.1016/j.stemcr.2020.04.004; PMC7355123 | Replication stress/damage/mitotic endpoints in studied PSC cultures | Repair recipe, cancer prevention, correction of existing mutations or graft safety |
| Merkle et al. (2017), Human pluripotent stem cells recurrently acquire and expand dominant negative P53 mutations | 10.1038/nature22312; PMC5427175 | Selection/expansion of mutant subpopulations, Results/Figure 3d | Every culture becomes malignant, individual cancer probability |
| Sturm et al. (2019), Human aging DNA methylation signatures are conserved but accelerated in cultured fibroblasts | 10.1080/15592294.2019.1626651; PMC6691995 | Specified donor-culture senescence observation, Results/Figure 1b | Universal fibroblast rate/lifespan or indefinite expansion |
| Yuan et al., Human assembloids recapitulate periportal liver tissue in vitro | 10.1038/s41586-025-09884-1; PMC12893922 | Periportal assembloid and Discussion limitations | Complete manufactured liver or seven-year manufacturing duration |

Yuan online date is December 17, 2025; journal issue February 2026, not contradictory
publication years. Official glossary/guide years in runtime metadata are access-year labels,
not independently established original publication dates. Consult the primary links through
`src/cell-evidence.js`. Culture equipment context uses ATCC only conceptually, without
recommended settings, products or handling instructions. Generic cell categories and
liver-specific identities are deliberately not treated as interchangeable.
## 0.8.0-dev recipe and method-evidence ledger (agent-run, November 1, 2026)

The owner explicitly authorized actionable laboratory recipes (2026-11-01, second
instruction), revising the earlier procedure boundary. Recipe cards restate published
open-access method parameters as cited third-person research descriptions with
per-parameter locators; nothing is directed at any person or animal and no safety,
efficacy, transplant-readiness or timeline-acceleration claim is made. Full provenance —
verbatim step quotes, fetched-section records, identifier checks and explicit
not-restated gaps — is in `method-recipes-audit.json`; the cards live in
`src/method-recipes.js` and `docs/METHOD_RECIPES.md`.

| Source | Identifier | Supported scope | Not inferred |
| --- | --- | --- | --- |
| Kurashima et al. (2024), Embryonic stem cells maintain high origin activity and slow forks to coordinate replication with cell cycle progression | 10.1038/s44319-024-00207-5; PMC11387781 | Mouse ES fork-dynamics findings, adverse miscoordination evidence, Methods culture conditions | Human outcomes, treatment safety, timeline acceleration or organ production |
| Halliwell et al. (2020), Nucleosides Rescue Replication-Mediated Genome Instability (recipe parameters) | 10.1016/j.stemcr.2020.04.004; PMC7355123 | Experimental Procedures parameters (vitronectin coating, media, passaging, nucleoside formulation) as cited research description | Universal use instructions, safety, validation, transplant readiness |
| Bhat et al. (2021), Expansion and characterization of BM-MSCs (recipe parameters) | 10.1038/s41598-021-83088-1; PMC7873235 | Materials and methods parameters (seeding densities, control medium, harvest/P5 conditions, P3-P5 kinetics window) as cited research description | Universal MSC protocol, proprietary media compositions, pooled interval |

Registry resolution alone never upgrades a claim; recipe provenance is recorded from
the fetched full texts, not from citation metadata. Source review remains agent-run.
