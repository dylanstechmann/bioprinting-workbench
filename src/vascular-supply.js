// Idealized Krogh-cylinder oxygen-supply reference: how far can tissue live from a perfused
// channel in this idealization? Steady state, zero-order consumption, uniform diffusivity,
// one channel, no flow resistance, no cell type. Teaching physics with hypothetical inputs,
// never a viability prediction, and deliberately uncoupled from the storyboard, oxygen,
// flow and nozzle-shear models.
import { assertAllowedKeys, finite } from './validation.js';

export const VASCULAR_SUPPLY_SCHEMA = 'bioprinting-workbench/vascular-supply-evidence/1';
export const VASCULAR_SUPPLY_NOTICES = Object.freeze([
  'Idealized steady Krogh cylinder: uniform diffusivity, zero-order consumption, one channel, no flow resistance, no cell type, no species and no measured tissue. Computed distances are model outputs, not viability thresholds.',
  'The 100-200 micrometer band shown beside results is a cited teaching restatement from the fetched reviews, not a prediction about any cell or construct.',
  'Printed-channel reality cuts the other way in the fetched sources: extrusion prints 100-300 micrometer channels well and capillaries 10-50 poorly, and hierarchical, endothelialized, host-anastomosing networks remain unsolved. This module computes none of that.',
  'The model is not coupled to the storyboard, oxygen, flow or nozzle-shear models, and it changes no other value in this workbench.',
]);
const TOPICS = Object.freeze(['model-family', 'diffusion-band', 'printed-resolution', 'host-connection', 'study-demo']);

function kroghConcentration(r, r0, R, C0, M, D) {
  return C0 + (M / (4 * D)) * (r * r - r0 * r0) - ((M * R * R) / (2 * D)) * Math.log(r / r0);
}
function planarLimitUm(settings) {
  return Math.sqrt((2 * settings.diffusivityD_m2PerS * settings.inletC0_molPerM3) / settings.consumptionM_molPerM3S) * 1e6;
}
export function validateVascularSupplySettings(raw) {
  assertAllowedKeys(raw, ['diffusivityD_m2PerS', 'consumptionM_molPerM3S', 'inletC0_molPerM3', 'channelRadiusUm'], 'vascularSupply.settings');
  return {
    diffusivityD_m2PerS: finite(raw.diffusivityD_m2PerS, 1e-10, 1e-8, 'diffusivityD_m2PerS'),
    consumptionM_molPerM3S: finite(raw.consumptionM_molPerM3S, 1e-6, 1e-1, 'consumptionM_molPerM3S'),
    inletC0_molPerM3: finite(raw.inletC0_molPerM3, 0.001, 0.5, 'inletC0_molPerM3'),
    channelRadiusUm: finite(raw.channelRadiusUm, 10, 500, 'channelRadiusUm'),
  };
}
export function defaultVascularSupply() {
  return { settings: { diffusivityD_m2PerS: 2e-9, consumptionM_molPerM3S: 1e-2, inletC0_molPerM3: 0.13, channelRadiusUm: 100 }, parameterOrigin: 'hypothetical-controls' };
}
export function validateVascularSupplyRecord(raw) {
  assertAllowedKeys(raw, ['settings', 'parameterOrigin'], 'vascularSupply');
  if (raw.parameterOrigin !== 'hypothetical-controls') throw new RangeError('Unknown vascular-supply parameter origin');
  return { settings: validateVascularSupplySettings(raw.settings), parameterOrigin: raw.parameterOrigin };
}
export function evaluateVascularSupply(raw) {
  const record = validateVascularSupplyRecord(raw);
  const { diffusivityD_m2PerS: D, consumptionM_molPerM3S: M, inletC0_molPerM3: C0 } = record.settings;
  const r0 = record.settings.channelRadiusUm * 1e-6, maxR = 0.01;
  // g(R) = R^2 (2 ln(R/r0) - 1) + r0^2 is increasing for R > r0; a supply-limiting radius exists
  // while g(maxR) > 4 D C0 / M (concentration would reach zero before the cap).
  const g = R => R * R * (2 * Math.log(R / r0) - 1) + r0 * r0;
  const target = (4 * D * C0) / M;
  let kroghCriticalRadiusUm;
  if (g(maxR) <= target) {
    kroghCriticalRadiusUm = null;
  } else {
    let lo = r0, hi = maxR;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (g(mid) < target) lo = mid; else hi = mid;
    }
    kroghCriticalRadiusUm = hi * 1e6;
  }
  const planar = planarLimitUm(record.settings);
  const bandClaims = CATALOG.claims.filter(c => c.topic === 'diffusion-band');
  const band = bandClaims[0].bandUm;
  const profile = [];
  const Rcrit = kroghCriticalRadiusUm === null ? maxR : kroghCriticalRadiusUm * 1e-6;
  const points = 41;
  for (let i = 0; i < points; i++) {
    const r = r0 + (Rcrit - r0) * i / (points - 1);
    profile.push({ rUm: r * 1e6, cOverC0: Math.max(0, kroghConcentration(r, r0, Rcrit, C0, M, D)) / C0 });
  }
  const computed = {
    kroghCriticalRadiusUm,
    planarLimitUm: planar,
    channelSpacingUm: kroghCriticalRadiusUm === null ? null : 2 * kroghCriticalRadiusUm,
    channelDensityPerMm2: kroghCriticalRadiusUm === null ? null : 1e6 / (Math.PI * kroghCriticalRadiusUm * kroghCriticalRadiusUm),
    profile,
  };
  const status = kroghCriticalRadiusUm === null ? 'not-limiting-at-scale' : 'explored';
  return {
    status,
    settings: record.settings,
    parameterOrigin: record.parameterOrigin,
    computed,
    bandContext: { bandUm: band, anchorClaimIds: bandClaims.map(c => c.id), label: 'cited teaching band from the fetched reviews, shown as context, not a prediction' },
    notices: [...VASCULAR_SUPPLY_NOTICES],
  };
}

const SOURCES = Object.freeze([
  { id: 'mansouri-2021', doi: '10.1063/5.0048837', journalYear: 'Biophys Rev (Melville) 2021', fullTextUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10903443/', license: 'CC-BY 4.0', citation: 'Mansouri M, Leipzig ND. Advances in removing mass transport limitations for more physiologically relevant in vitro 3D cell constructs. Biophys Rev (Melville). 2021;2(2):021305. doi:10.1063/5.0048837' },
  { id: 'seymour-2022', doi: '10.1088/1758-5090/ac4fb5', journalYear: 'Biofabrication 2022', fullTextUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8988885/', license: 'author manuscript (PMC open access)', citation: 'Seymour AJ, Westerfield AD, Cornelius VC, Skylar-Scott MA, Heilshorn SC. Bioprinted microvasculature: progressing from structure to function. Biofabrication. 2022;14(2):022001. doi:10.1088/1758-5090/ac4fb5' },
  { id: 'yeo-2023', doi: '10.1088/1758-5090/ad0b3f', journalYear: 'Biofabrication 2023', fullTextUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10658349/', license: 'CC-BY 4.0', citation: 'Yeo M, Sarkar A, Singh YP, Derman ID, Datta P, Ozbolat IT. Synergistic coupling between 3D bioprinting and vascularization strategies. Biofabrication. 2023;16(1):012003. doi:10.1088/1758-5090/ad0b3f' },
  { id: 'zhang-2025', doi: '10.1016/j.actbio.2025.06.006', journalYear: 'Acta Biomater 2025', fullTextUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12277018/', license: 'author manuscript (PMC open access)', citation: 'Zhang IW, Choi LS, Friend NE, McCoy AJ, Midekssa FS, Hu MM, Alsberg E, Lesher-Perez SC, Stegemann JP, Baker BM, Putnam AJ. Clickable PEG-norbornene microgels support suspension bioprinting and microvascular assembly. Acta Biomater. 2025;201:283-296. doi:10.1016/j.actbio.2025.06.006' },
]);
const CLAIMS = Object.freeze([
  { id: 'vascular-supply-fick-constitutive', sourceId: 'mansouri-2021', topic: 'model-family', statement: 'Diffusion-limit teaching rests on Fickian transport, the same constitutive family this module idealizes.', verbatimQuote: "Oxygen diffusion limitations can be further explained by a constitutive relationship, Fick's first law of diffusion, J = D × ΔC/Δx.", locator: 'Section II, oxygen transport', supportStatus: 'reviewed', basis: 'primary-text', limitations: ['Fickian transport is one idealization among several the review names for 3D constructs; this module adds no biological parameter values.'] },
  { id: 'vascular-supply-necrotic-core', sourceId: 'mansouri-2021', topic: 'model-family', statement: 'Transport modeling concludes that avascular constructs beyond the diffusion-and-consumption limit form a central necrotic core.', verbatimQuote: "An important finding from the modeling of oxygen and glucose transport concludes that if avascular constructs grow beyond the limits of both oxygen diffusion and metabolic consumption, a central necrotic core will be formed within the cultured spheroids.76", locator: 'Section II, modeling of transport', supportStatus: 'reviewed', basis: 'primary-text', limitations: ['A spheroid-modeling conclusion restated by the review; it is context for why a supply distance matters, not a prediction for printed constructs.'] },
  { id: 'vascular-supply-ec-functionality-gap', sourceId: 'mansouri-2021', topic: 'host-connection', statement: 'Endothelial-cell vascularization strategies have made considerable progress but still need to demonstrate flowing media or blood and in-vivo function.', verbatimQuote: "Taken together, considerable progress has been made to remove mass transport limitations by using ECs as a common strategy for promoting vascularization; however, significant progress is still required to demonstrate functionality, including the ability to flow media (or blood) and recapitulate in vivo functions.3.", locator: 'Section on vascularization strategies', supportStatus: 'reviewed', basis: 'primary-text', limitations: ['Review-level progress assessment; no construct here is claimed functional.'] },
  { id: 'vascular-supply-printed-resolution-gap', sourceId: 'seymour-2022', topic: 'printed-resolution', statement: 'Extrusion bioprinting reaches 100-300 micrometer channels well and capillaries 10-50 micrometers poorly - printed channels sit near the same scale as the tissue distances they must supply.', verbatimQuote: "Because of this, extrusion-based bioprinting is well-equipped to rapidly generate vessel-like structures with diameters similar to arterioles and post-capillary venules (fabricated diameters of 100–300 μm), but struggles to create capillary-like structures (10–50 μm in diameter) [15,16].", locator: 'Section 3, printed channel scales', supportStatus: 'reviewed', basis: 'primary-text', limitations: ['A capability-scale statement, not a barrier-to-entry claim about any specific printer or bioink.'] },
  { id: 'vascular-supply-hierarchy-hard', sourceId: 'seymour-2022', topic: 'printed-resolution', statement: 'Even within 10-300 micrometer microvasculature, one fabrication technique rarely creates a hierarchical network.', verbatimQuote: "Even within the narrower scope of microvasculature (10–300 μm in diameter), creating a similarly hierarchical network is rarely possible using a single biofabrication technique.", locator: 'Section 3, hierarchy discussion', supportStatus: 'reviewed', basis: 'primary-text', limitations: ['Review conclusion about fabrication limits; this module computes single-channel supply only.'] },
  { id: 'vascular-supply-function-requirements', sourceId: 'seymour-2022', topic: 'host-connection', statement: 'In-vivo vascular function needs a hollow endothelialized lumen, a hierarchical structure and a dynamic signaling environment - three things a supply-distance model does not touch.', verbatimQuote: "Specifically, three characteristics that allow vascular networks to function in vivo include (1) a hollow, endothelialized lumen; (2) a highly organized and hierarchical network structure; and (3) a complex signaling environment that dynamically regulates and drives vascular function (figure 1(A–C)).", locator: 'Section 2, functional requirements', supportStatus: 'reviewed', basis: 'primary-text', limitations: ['Framework statement of in-vivo requirements; no construct in this workbench is claimed to meet them.'] },
  { id: 'vascular-supply-diffusion-band-y', sourceId: 'yeo-2023', topic: 'diffusion-band', bandUm: [100, 200], statement: 'The review restates the classic teaching band: cells die for lack of oxygen and nutrients beyond roughly 100-200 micrometers from the nearest vessel.', verbatimQuote: "Cells die for lack of oxygen and nutrients if they are more than 100–200 µm from the closest blood vessel [93].", locator: 'Introduction, diffusion limit', supportStatus: 'reviewed', basis: 'primary-text', limitations: ['A review restating earlier work ([93] within the quote); the band is teaching context and not a prediction for any cell type or construct.'] },
  { id: 'vascular-supply-anastomosis-uncertain', sourceId: 'yeo-2023', topic: 'host-connection', statement: 'Host-connection mechanisms remain uncertain: it is not established how implanted networks connect to host vasculature.', verbatimQuote: "Further, a clear understanding of anastomoses mechanism is absent, so it remains uncertain whether host vasculature remodeled vascular network or the implanted HUVECs get involved to the angiogenic development and connected with the host vasculature.", locator: 'Discussion, anastomosis', supportStatus: 'reviewed', basis: 'primary-text', limitations: ['An open-question statement; no anastomosis is claimed or modeled here.'] },
  { id: 'vascular-supply-diffusion-band-z', sourceId: 'zhang-2025', topic: 'diffusion-band', bandUm: [100, 200], statement: 'A 2025 study restates the same limit: without functional vasculature, metabolically active constructs are limited by oxygen diffusion to roughly 100-200 micrometer thicknesses.', verbatimQuote: "In the absence of functional vasculature, tissue constructs containing metabolically-active cells are limited by the diffusion limits of oxygen to thicknesses of ~100–200 μm [2]; as a consequence, successful clinical translation of engineered tissues over the past 25 years has largely been restricted to either avascular (e.g., cartilage) or relatively thin tissues (e.g., skin grafts, bladder).", locator: 'Introduction, diffusion limit', supportStatus: 'reviewed', basis: 'primary-text', limitations: ['A study-level restatement of earlier work ([2] within the quote); shown as context beside the model output, never as a threshold this module enforces.'] },
  { id: 'vascular-supply-mesoscale-demo', sourceId: 'zhang-2025', topic: 'study-demo', statement: 'The study printed and evacuated mesoscale voids of about 600 micrometers to 1 millimeter, within the mesoscale vascular range, and perfused them with dye.', verbatimQuote: "Printed structures and subsequent patterned evacuated void spaces measured at diameters ranging between 600 μm to 1 mm, which is within the range of mesoscale vascular formations (50 – 1000 μm) [3].", locator: 'Results, printed channels', supportStatus: 'reviewed', basis: 'primary-text', limitations: ['In-vitro demonstration at mesoscale; not a vascularized tissue result and not a human or animal outcome.'] },
]);
export function validateVascularSupplyCatalog(raw) {
  assertAllowedKeys(raw, ['schema', 'sources', 'claims'], 'vascularSupplyCatalog');
  if (raw.schema !== VASCULAR_SUPPLY_SCHEMA) throw new RangeError('Unknown vascular-supply evidence schema');
  if (!Array.isArray(raw.sources) || !Array.isArray(raw.claims)) throw new TypeError('Catalog needs sources and claims');
  const sourceIds = new Set();
  for (const s of raw.sources) {
    assertAllowedKeys(s, ['id', 'doi', 'journalYear', 'fullTextUrl', 'license', 'citation'], 'vascularSupplySource');
    {
      if (!/^10\.[0-9]{4,}[^ ]+$/.test(s.doi)) throw new RangeError('Malformed DOI');
      if (!/^https:\/\/[^ ]+$/.test(s.fullTextUrl)) throw new TypeError('fullTextUrl must be https');
      if (sourceIds.has(s.id)) throw new RangeError('Duplicate source'); sourceIds.add(s.id);
    }
  }
  const claimIds = new Set();
  const bands = [];
  for (const c of raw.claims) {
    assertAllowedKeys(c, ['id', 'sourceId', 'topic', 'statement', 'verbatimQuote', 'locator', 'supportStatus', 'basis', 'limitations', 'bandUm'], 'vascularSupplyClaim');
    if (!c.id.startsWith('vascular-supply-')) throw new RangeError('Claim ids must carry the module prefix');
    if (claimIds.has(c.id)) throw new RangeError('Duplicate claim'); claimIds.add(c.id);
    if (!sourceIds.has(c.sourceId)) throw new RangeError('Claim references an unknown source');
    if (!TOPICS.includes(c.topic)) throw new RangeError('Unknown claim topic');
    if (c.supportStatus !== 'reviewed' || c.basis !== 'primary-text') throw new RangeError('Unsupported support status or basis');
    if (typeof c.statement !== 'string' || c.statement.length < 40 || c.statement.length > 2000) throw new RangeError('Bad statement');
    if (typeof c.verbatimQuote !== 'string' || c.verbatimQuote.length < 60) throw new RangeError('Verbatim quote too short to be verifiable');
    if (typeof c.locator !== 'string' || !c.locator.trim()) throw new RangeError('Bad locator');
    if (!Array.isArray(c.limitations) || c.limitations.length < 1) throw new RangeError('Claims need honest limitations');
    if (c.topic === 'diffusion-band') {
      if (!Array.isArray(c.bandUm) || c.bandUm.length !== 2 || c.bandUm.some(x => typeof x !== 'number' || !Number.isFinite(x))) throw new RangeError('Band claims need a numeric band');
      if (c.bandUm[0] >= c.bandUm[1]) throw new RangeError('Band must be ascending');
      bands.push(c.bandUm.join('-'));
    } else if (c.bandUm !== undefined) {
      throw new RangeError('Only diffusion-band claims carry a band');
    }
  }
  const bandSet = new Set(bands);
  if (bands.length < 2) throw new RangeError('The teaching band needs at least two independent anchors');
  if (bandSet.size !== 1) throw new RangeError('Band anchors disagree; refusing to show an unstable band');
  for (const topic of ['model-family', 'printed-resolution', 'host-connection']) if (!raw.claims.some(c => c.topic === topic)) throw new RangeError('Missing ' + topic + ' coverage');
  return structuredClone(raw);
}
const CATALOG = validateVascularSupplyCatalog({ schema: VASCULAR_SUPPLY_SCHEMA, sources: SOURCES, claims: CLAIMS });
export function getVascularSupplyCatalog() { return structuredClone(CATALOG); }
