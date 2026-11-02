// Idealized steady laminar capillary wall-shear reference for an extrusion toolhead,
// beside verbatim-quoted open-access nozzle-shear evidence (Gomez-Blanco et al. 2023,
// Int J Bioprint, DOI 10.18063/ijb.730, CC-BY). The formulas are textbook idealizations;
// they are not CFD, not a print protocol, and direct nothing at any person or animal.
import { assertAllowedKeys, finite, text } from './validation.js';

export const NOZZLE_SHEAR_MODEL = 'idealized-steady-laminar-capillary-shear-reference';
export const NOZZLE_SHEAR_EVIDENCE_SCHEMA = 'bioprinting-workbench/nozzle-shear-evidence/1';
export const NOZZLE_SHEAR_DEFAULTS = Object.freeze({ diameterUm: 400, flowMm3PerS: 10, viscosityMode: 'cited-cellink-fit', viscosityPas: 1 });
// Cited power-law fit for Cellink bioink at 37 C (the paper's Equation (I)):
// mu = 87.906 * shearRate^-0.792, i.e. consistency index K = 87.906 Pa*s^n with n = 0.208.
export const CELLINK_FIT = Object.freeze({ K: 87.906, n: 0.208 });
export const HYPOTHETICAL_DENSITY_KG_PER_M3 = 1000;
export const CITED_CFD_MAX_PA = 455.43;
export const LOW_BAND_PA = 5000;
export const HIGH_BAND_PA = 10000;
export const NOZZLE_SHEAR_NOTICES = Object.freeze([
  'Idealized fully-developed laminar capillary: contraction, entrance effects, drop formation, shear history and transient flow are not modeled, so values are a reference calculation, not CFD.',
  'Band labels restate in-vitro viability context reported secondhand by the cited paper. They are not a safety verdict, not a prediction of printed viability, and carry no cell-type, species or exposure-time specificity.',
  'The fluid density is a fixed hypothetical 1000 kg/m3 teaching value; the cited paper reports its own density assumptions separately.',
  'For context only, the cited CFD study reports 242.16-455.43 Pa wall shear under its 15 kPa pneumatic and 10 mm3/s piston inlets with a Cellink bioink.',
  'Nothing here is a print setting, a laboratory protocol or advice for any person or animal.',
]);

export function validateNozzleShearSettings(raw) {
  assertAllowedKeys(raw, ['diameterUm', 'flowMm3PerS', 'viscosityMode', 'viscosityPas'], 'nozzleShear');
  const diameterUm = finite(raw.diameterUm, 60, 600, 'diameterUm');
  const flowMm3PerS = finite(raw.flowMm3PerS, 0.001, 100, 'flowMm3PerS');
  if (!['hypothetical-constant', 'cited-cellink-fit'].includes(raw.viscosityMode)) throw new RangeError('Unknown viscosity mode');
  const viscosityPas = finite(raw.viscosityPas, 0.01, 200, 'viscosityPas');
  return { diameterUm, flowMm3PerS, viscosityMode: raw.viscosityMode, viscosityPas };
}

/** Steady laminar Newtonian-capillary reference. Wall shear tau_w = 4*mu*Q/(pi*r^3) = 8*mu*U/d;
 * the power-law branch applies the standard Rabinowitsch correction for pipe flow of a
 * power-law fluid. Assumptions are stated, not hidden, and no biological claim is made. */
export function evaluateNozzleShear(raw, densityKgPerM3 = HYPOTHETICAL_DENSITY_KG_PER_M3) {
  const settings = validateNozzleShearSettings(raw);
  if (!Number.isFinite(densityKgPerM3) || densityKgPerM3 <= 0) throw new RangeError('Density must be positive');
  const d = settings.diameterUm * 1e-6, r = d / 2;
  const Q = settings.flowMm3PerS * 1e-9;
  const meanVelocity = Q / (Math.PI * r * r);
  const newtonianWallRate = 4 * Q / (Math.PI * r * r * r);
  let wallShearRate, apparentViscosity, viscositySource;
  if (settings.viscosityMode === 'cited-cellink-fit') {
    const correction = (3 * CELLINK_FIT.n + 1) / (4 * CELLINK_FIT.n);
    wallShearRate = correction * newtonianWallRate;
    apparentViscosity = CELLINK_FIT.K * Math.pow(wallShearRate, CELLINK_FIT.n - 1);
    viscositySource = 'cited-cellink-fit (Gomez-Blanco et al. 2023, Equation (I))';
  } else {
    wallShearRate = newtonianWallRate;
    apparentViscosity = settings.viscosityPas;
    viscositySource = 'hypothetical-constant';
  }
  const wallShearStressPa = apparentViscosity * wallShearRate;
  const reynoldsNumber = densityKgPerM3 * meanVelocity * d / apparentViscosity;
  const laminarAssumptionHolds = reynoldsNumber <= 2300;
  const band = wallShearStressPa <= CITED_CFD_MAX_PA ? 'below-cited-cfd-maximum'
    : wallShearStressPa <= LOW_BAND_PA ? 'low-per-restated-bands'
    : wallShearStressPa <= HIGH_BAND_PA ? 'medium-per-restated-bands' : 'high-per-restated-bands';
  return {
    model: NOZZLE_SHEAR_MODEL, status: 'evaluated',
    settings, viscositySource,
    meanVelocityMmPerS: meanVelocity * 1000,
    wallShearRatePerS: wallShearRate,
    apparentViscosityPas: apparentViscosity,
    wallShearStressPa,
    ratioToLowBandPa: wallShearStressPa / LOW_BAND_PA,
    band, reynoldsNumber, laminarAssumptionHolds,
    densityKgPerM3,
    assumptions: [
      'Steady, fully-developed laminar flow of a generalized Newtonian fluid in a straight cylindrical capillary.',
      'Nozzle inner diameter is uniform along the flow path; the cited conical-tip contraction is not modeled.',
      'Wall shear is reported as a single idealized value; real nozzles expose cells to a spatially varying stress history.',
    ],
    notices: [...NOZZLE_SHEAR_NOTICES],
  };
}

const SOURCES = [{
  id: 'gomez-blanco-2023',
  doi: '10.18063/ijb.730',
  journalYear: 'Int J Bioprint 2023',
  fullTextUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10261129/',
  license: 'CC-BY 4.0',
  citation: 'Gomez-Blanco JC, Pagador JB, Galvan-Chacon VP, Sanchez-Peralta LF, Matamoros M, Marcos A, Sanchez-Margallo FM. Computational simulation-based comparative analysis of standard 3D printing and conical nozzles for pneumatic and piston-driven bioprinting. Int J Bioprint. 2023;9(4):730. doi:10.18063/ijb.730',
}];
const notFetched = 'The underlying study is not open-access and was not fetched; the quote is the citing paper restatement only.';
const CLAIMS = [
  { id: 'nozzle-shear-cfd-values', statement: 'A CFD comparison of a 0.4 mm standard printing nozzle and a 22G conical tip reports wall shear values of 455.43 and 242.16 Pa for pneumatic dispensing and 362.85 and 383.24 Pa for piston-driven extrusion, as a research-simulation result for one commercial bioink.', verbatimQuote: "Bearing this in mind, the values of shear stress are 455.43 and 242.16 Pa for Nozzle and Cone pneumatic simulations, respectively, and 362.85 and 383.24 Pa for Nozzle and Cone piston-driven simulations, respectively.", locator: 'Results, shear stress comparison', supportStatus: 'reviewed', basis: 'primary-text', context: 'cfd-simulation', limitations: ['Simulation of one commercial bioink and two specific tip geometries; the values are not universal print settings and not measured on this workbench.'] },
  { id: 'nozzle-shear-max-vs-threshold', statement: 'The same CFD study reports its maximum simulated shear stress as 455.43 Pa and describes that as more than ten times lower than the threshold proposed by Blaeser et al.', verbatimQuote: "Nevertheless, the maximum difference is approximately 213 Pa and the maximum value of shear stress for all simulations is 455.43 Pa, which are in both cases more than ten times lower than the threshold proposed by Blaeser et al. [38].", locator: 'Results, shear stress comparison', supportStatus: 'reviewed', basis: 'primary-text', context: 'cfd-simulation', limitations: ['A secondhand characterization of another group\u2019s threshold; the Blaeser study itself was not fetched here.'] },
  { id: 'nozzle-shear-viability-bands-restated', statement: 'The paper restates reported in-vitro viability context in shear bands: below 5 kPa described with viability up to 96%, 5-10 kPa with 91%, and above 10 kPa with 76%.', verbatimQuote: "Blaeser et al. [38] classified the shear stress ranges that affect cellular viability into low shear stress (<5 kPa), that has high cellular viability up to 96%; medium shear stress (5–10 kPa), with a cellular viability of 91%; and high shear stress (>10 kPa), with a cell viability of 76%.", locator: 'Introduction, viability thresholds paragraph', supportStatus: 'reviewed', basis: 'secondhand-restatement', context: 'viability-context-restated', limitations: [notFetched, 'In-vitro viability context for specific tested cell populations; not a safety threshold for any other cell type, species or exposure duration.'] },
  { id: 'nozzle-shear-below-threshold-survival', statement: 'The paper restates that shear stress lower than 5 kPa was described as not having an important influence on cell survival.', verbatimQuote: "Additionally, Blaeser et al. [38] also determined that shear stress lower than 5 kPa might not have an important influence on cell survival.", locator: 'Introduction, viability thresholds paragraph', supportStatus: 'reviewed', basis: 'secondhand-restatement', context: 'viability-context-restated', limitations: [notFetched, 'A restated research observation, not a guaranteed survival band for any cell type used on this workbench.'] },
  { id: 'nozzle-shear-rheology-fit', statement: 'The study fitted a power-law rheology to Cellink bioink at 37 C for its simulations (consistency index 87.906, flow index 0.208, in the paper\u2019s Equation (I) notation).', verbatimQuote: "In this work, Cellink bioink (Cellink USA) was simulated at 37°C with the following fitted potential law:", locator: 'Materials and Methods, bioink model (Equation (I))', supportStatus: 'reviewed', basis: 'primary-text', context: 'rheology-fit', limitations: ['A fitted model for one commercial bioink used in simulation; not a general bioink property or a material recommendation.'] },
  { id: 'nozzle-shear-rheology-variables', statement: 'The paper defines the fitted variables as dynamic viscosity in Pa\u00b7s and shear rate in s\u22121.', verbatimQuote: "where μ is the dynamic viscosity (Pa·s) and γ˙ is the shear rate (s−1).", locator: 'Materials and Methods, bioink model (Equation (I))', supportStatus: 'reviewed', basis: 'primary-text', context: 'rheology-fit', limitations: ['Definition of the simulation inputs only; it establishes nothing about cell response.'] },
  { id: 'nozzle-shear-inlet-conditions', statement: 'The CFD inlets were configured as 15 kPa pneumatic pressure (as the manufacturer recommended for that bioink) and a 10 mm3/s piston-driven volumetric flow.', verbatimQuote: "Model inlets were configured to two approaches: a pneumatic process with 15 kPa inlet pressure, as recommended by Cellink [54], and a piston-driven process with 10 mm3/s volumetric inlet flow.", locator: 'Materials and Methods, inlet conditions', supportStatus: 'reviewed', basis: 'primary-text', context: 'inlet-conditions', limitations: ['Simulation inputs for the cited study\u2019s geometry and bioink; not settings for any physical printer.'] },
  { id: 'nozzle-shear-shear-dominates-pressure', statement: 'The paper restates prior findings that cell viability was highly impacted by nozzle inner pressure, and even more by shear stress.', verbatimQuote: "Previous studies showed that cell viability was highly impacted by the nozzle inner pressure, and even more by the shear stress [24].", locator: 'Introduction', supportStatus: 'reviewed', basis: 'secondhand-restatement', context: 'shear-stress-research-context', limitations: [notFetched, 'A restatement of prior literature; the cited study was not independently fetched here.'] },
  { id: 'nozzle-shear-liu-context', statement: 'The paper restates that Liu et al. reported low shear stress of 30, 180 and 300 Pa for lower-viscosity bioink concentrations with needle and conical tips.', verbatimQuote: "Liu et al. [39] obtained low shear stress (30, 180, and 300 Pa) using different concentrations of a bioink with lower viscosity and using both needle and conical tips.", locator: 'Results, comparison with previous studies', supportStatus: 'reviewed', basis: 'secondhand-restatement', context: 'shear-stress-research-context', limitations: [notFetched, 'Secondhand values for different bioinks and setups; quoted as context only.'] },
  { id: 'nozzle-shear-gauge-context', statement: 'The paper restates that Mueller et al. measured shear stress around 160 Pa across 22-30G needle and conical tips with an alginate-nanocellulose bioink.', verbatimQuote: "Müller et al. [55] also studied the shear stress using several needle and conical tips (namely 22, 23, 25, 27, and 30G) with a very similar alginate with nanocellulose bioink, obtaining results around 160 Pa.", locator: 'Results, comparison with previous studies', supportStatus: 'reviewed', basis: 'secondhand-restatement', context: 'shear-stress-research-context', limitations: [notFetched, 'Secondhand values for one bioink family; quoted as context only.'] },
  { id: 'nozzle-shear-tip-geometry', statement: 'The compared geometries were a bioprinting 22G conical tip and a 3D printing E3D V6.4 nozzle, named Cone and Nozzle in the study.', verbatimQuote: "These two geometrical models were a bioprinting 22G conical tip (Cellink, BICO Company, Gothenburg, Sweden) and a 3D printing E3D V6.4 nozzle (E3D Online, Chalgrove, Oxfordshire, UK), named hereinafter as Cone and Nozzle, respectively.", locator: 'Materials and Methods, nozzle geometries', supportStatus: 'reviewed', basis: 'primary-text', context: 'nozzle-geometry', limitations: ['Descriptions of study hardware for context; not a purchase recommendation or a validated instrument claim.'] },
];

export function validateNozzleShearCatalog(raw) {
  assertAllowedKeys(raw, ['schema', 'sources', 'claims'], 'nozzleShearCatalog');
  if (raw.schema !== NOZZLE_SHEAR_EVIDENCE_SCHEMA) throw new RangeError('Unknown nozzle-shear evidence schema');
  if (!Array.isArray(raw.sources) || !raw.sources.length) throw new RangeError('Nozzle-shear sources missing');
  const seen = new Set();
  for (const s of raw.sources) {
    assertAllowedKeys(s, ['id', 'doi', 'journalYear', 'fullTextUrl', 'license', 'citation'], 'source');
    text(s.id, 64, 'source.id');
    if (seen.has(s.id)) throw new RangeError('Duplicate source'); seen.add(s.id);
    if (!/^10\.[0-9]{4,}[^ ]+$/.test(s.doi)) throw new RangeError('Malformed DOI');
    if (!/^https:\/\/[^ ]+$/.test(s.fullTextUrl)) throw new TypeError('fullTextUrl must be https');
    text(s.license, 32, 'source.license'); text(s.citation, 2000, 'source.citation'); text(s.journalYear, 64, 'source.journalYear');
  }
  if (!Array.isArray(raw.claims) || raw.claims.length < 8) throw new RangeError('Nozzle-shear claims missing');
  const claimIds = new Set();
  for (const c of raw.claims) {
    assertAllowedKeys(c, ['id', 'statement', 'verbatimQuote', 'locator', 'supportStatus', 'basis', 'context', 'limitations'], 'claim');
    if (!c.id.startsWith('nozzle-shear-')) throw new RangeError('Nozzle-shear claim ids must carry the module prefix');
    text(c.id, 64, 'claim.id');
    if (claimIds.has(c.id)) throw new RangeError('Duplicate claim'); claimIds.add(c.id);
    text(c.statement, 2000, 'claim.statement');
    text(c.verbatimQuote, 2000, 'claim.verbatimQuote');
    if (c.verbatimQuote.length < 60) throw new RangeError('Verbatim quote too short to be verifiable');
    text(c.locator, 80, 'claim.locator');
    if (c.supportStatus !== 'reviewed') throw new RangeError('Unsupported support status');
    if (!['primary-text', 'secondhand-restatement'].includes(c.basis)) throw new RangeError('Unsupported basis');
    if (!['cfd-simulation', 'rheology-fit', 'inlet-conditions', 'nozzle-geometry', 'viability-context-restated', 'shear-stress-research-context'].includes(c.context)) throw new RangeError('Unsupported context');
    if (!Array.isArray(c.limitations) || c.limitations.length < 1 || c.limitations.some(l => typeof l !== 'string' || !l.trim())) throw new RangeError('Claims need honest limitations');
    if (c.basis === 'secondhand-restatement' && !c.limitations.some(l => /restatement|not fetched/i.test(l))) throw new RangeError('Secondhand claims must say what was not fetched');
    if (!raw.sources.some(s => s.id === 'gomez-blanco-2023')) throw new RangeError('Nozzle-shear claims must trace to the fetched source');
  }
  return structuredClone(raw);
}
const catalog = validateNozzleShearCatalog({ schema: NOZZLE_SHEAR_EVIDENCE_SCHEMA, sources: SOURCES, claims: CLAIMS });
export function getNozzleShearCatalog() { return structuredClone(catalog); }
