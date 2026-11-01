# Source ledger

Checked on 2026-11-01. Primary publications and official vendor/software documentation
are context, not calibration data. Bibliographic resolution is separate from claim support.
No source supports the synthetic numeric inputs or a complete scaffold-to-transplant workflow.

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