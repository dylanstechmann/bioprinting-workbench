import { assertAllowedKeys, text } from './validation.js';
import { getEvidenceCatalog } from './cell-evidence.js';
import { getRepairResearchCatalog } from './repair-research.js';

export const RECIPE_SCHEMA = 'bioprinting-workbench/method-recipes/1';
const NUMERIC = /^\s*[-+]?[\d]/;
const IMPERATIVE = /^(add|seed|incubate|maintain|wash|harvest|passage|coat|supplement|thaw|centrifuge|dissociate|plate|culture|transfer|resuspend|trypsinize|rinse|split|expand|grow|keep|place|put|use)\b/i;
const UNSAFE = /\b(you|your|yours|safe|safely|guarantee|guaranteed|validated|validate|recommend|recommended|recommends|transplant-ready|clinically|cure|cures|dosage)\b/i;

function strings(value, label, max = 32) {
  if (!Array.isArray(value) || value.length > max) throw new TypeError(`Invalid ${label}`);
  return value.map(v => text(v, 2000, label));
}
function validateParameter(p, allowedSources, path) {
  assertAllowedKeys(p, ['name', 'value', 'unit', 'sourceId', 'locator', 'note'], `${path}.parameter`);
  text(p.name, 200, `${path}.parameter.name`);
  const value = text(p.value, 200, `${path}.parameter.value`);
  if (NUMERIC.test(value) && (p.unit === null || typeof p.unit !== 'string' || !p.unit.trim())) throw new RangeError(`${path}: numeric parameter needs a unit`);
  if (p.unit !== null) text(p.unit, 128, `${path}.parameter.unit`);
  if (!allowedSources.has(p.sourceId)) throw new RangeError(`${path}: parameter source outside the reviewed method/adverse sources`);
  text(p.locator, 2000, `${path}.parameter.locator`);
  if (p.note !== null) text(p.note, 2000, `${path}.parameter.note`);
}

/** Owner-authorized (2026-11-01 revision): published open-access method parameters restated as cited third-person research reference. */
export function validateRecipeCatalog(raw, evidence = getEvidenceCatalog(), research = getRepairResearchCatalog()) {
  assertAllowedKeys(raw, ['schema', 'recipes', 'notice'], 'recipeCatalog');
  if (raw.schema !== RECIPE_SCHEMA) throw new RangeError('Unsupported recipe schema');
  text(raw.notice, 2000, 'recipeCatalog.notice');
  if (!Array.isArray(raw.recipes) || !raw.recipes.length || raw.recipes.length > 128) throw new RangeError('Invalid recipes');
  const claims = new Map(evidence.claims.map(c => [c.id, c]));
  const methods = new Map(research.methods.map(m => [m.id, m]));
  const systems = new Map(research.systems.map(s => [s.id, s]));
  const ids = new Set();
  for (const r of raw.recipes) {
    assertAllowedKeys(r, ['id', 'methodEvidenceId', 'cellSystemIds', 'title', 'summary', 'steps', 'observedEndpoints', 'adverseEvidenceIds', 'timelineEvidence', 'limitations', 'framing'], 'recipe');
    const id = text(r.id, 128, 'recipe.id');
    if (ids.has(id)) throw new RangeError('Duplicate recipe ID');
    ids.add(id);
    if (r.framing !== 'published-research-description') throw new RangeError('Recipes must be published-research descriptions');
    if (!['not-established', 'reported-study-endpoint'].includes(r.timelineEvidence)) throw new RangeError('Invalid recipe timeline evidence');
    const method = methods.get(r.methodEvidenceId);
    if (!method) throw new RangeError('Recipe method evidence missing');
    const cellSystemIds = strings(r.cellSystemIds, 'recipe.cellSystemIds');
    if (!cellSystemIds.length || cellSystemIds.some(s => !systems.has(s))) throw new RangeError('Dangling recipe system');
    if (cellSystemIds.some(s => !method.cellSystemIds.includes(s))) throw new RangeError('Recipe system outside its method evidence systems');
    text(r.title, 2000, 'recipe.title'); text(r.summary, 2000, 'recipe.summary');
    if (UNSAFE.test(r.title) || UNSAFE.test(r.summary)) throw new RangeError('Unsafe recipe phrasing');
    const adverse = strings(r.adverseEvidenceIds, 'recipe.adverseEvidenceIds');
    for (const cid of adverse) { if (!claims.has(cid)) throw new RangeError('Dangling adverse evidence'); }
    if (method.category === 'replication-support') {
      const adverseMethodClaims = new Set(research.methods.filter(m => m.observedOutcome === 'adverse-endpoint').flatMap(m => m.claimIds));
      if (!adverse.length || !adverse.some(cid => adverseMethodClaims.has(cid))) throw new RangeError('Fork-affecting recipe needs adverse-evidence links');
    }
    const allowedSources = new Set(method.sourceIds);
    for (const cid of adverse) allowedSources.add(claims.get(cid).sourceId);
    if (!Array.isArray(r.steps) || !r.steps.length || r.steps.length > 32) throw new RangeError('Invalid recipe steps');
    const stepIds = new Set();
    for (const step of r.steps) {
      assertAllowedKeys(step, ['id', 'title', 'body', 'parameters', 'sourceIds'], 'step');
      const sid = text(step.id, 128, 'step.id');
      if (stepIds.has(sid)) throw new RangeError('Duplicate step ID');
      stepIds.add(sid);
      text(step.title, 2000, 'step.title'); text(step.body, 2000, 'step.body');
      if (UNSAFE.test(step.title) || UNSAFE.test(step.body) || IMPERATIVE.test(step.body)) throw new RangeError('Unsafe or second-person step phrasing');
      const stepSources = strings(step.sourceIds, 'step.sourceIds');
      if (!stepSources.length || stepSources.some(s => !allowedSources.has(s))) throw new RangeError('Step source outside the reviewed method/adverse sources');
      if (!Array.isArray(step.parameters) || step.parameters.length > 32) throw new RangeError('Invalid step parameters');
      for (const p of step.parameters) validateParameter(p, allowedSources, `step ${sid}`);
    }
    const endpoints = strings(r.observedEndpoints, 'recipe.observedEndpoints');
    if (!endpoints.length || endpoints.some(e => UNSAFE.test(e))) throw new RangeError('Observed endpoints required and must stay neutral');
    const limitations = strings(r.limitations, 'recipe.limitations');
    if (!limitations.length || limitations.some(l => UNSAFE.test(l))) throw new RangeError('Recipe limitations required and must stay neutral');
  }
  return structuredClone(raw);
}

const recipes = [
  {
    id: 'halliwell-nucleoside-supplementation',
    methodEvidenceId: 'halliwell-nucleosides',
    cellSystemIds: ['human-ipsc', 'human-esc'],
    title: 'Nucleoside supplementation in human PSC culture — published method reference (Halliwell et al. 2020)',
    summary: 'What the reviewed study reported: human PSC culture media were supplemented with a defined nucleoside formulation, with assays after 72 h. Parameters are transcribed from the open-access Experimental Procedures with locators; this is a cited description of published research, not a recommendation or treatment instruction.',
    steps: [
      {
        id: 'halliwell-coat-substrate',
        title: 'Vitronectin substrate coating (as reported)',
        body: 'Halliwell et al. reported coating culture vessels with recombinant human vitronectin (VTN-N) diluted in PBS, incubated at 37 °C for at least 1 h before cells were seeded.',
        parameters: [
          { name: 'Vitronectin dilution', value: '6', unit: 'µg/mL in PBS', sourceId: 'halliwell', locator: 'Experimental Procedures: Human Pluripotent Stem Cell Culture', note: null },
          { name: 'Coating volume', value: '200', unit: 'µL/cm²', sourceId: 'halliwell', locator: 'Experimental Procedures: Human Pluripotent Stem Cell Culture', note: null },
          { name: 'Coating incubation time', value: '1', unit: 'h', sourceId: 'halliwell', locator: 'Experimental Procedures: Human Pluripotent Stem Cell Culture', note: 'Reported as at least 1 h' },
          { name: 'Coating incubation temperature', value: '37', unit: '°C', sourceId: 'halliwell', locator: 'Experimental Procedures: Human Pluripotent Stem Cell Culture', note: null },
        ],
        sourceIds: ['halliwell'],
      },
      {
        id: 'halliwell-maintain-culture',
        title: 'Feeder-free maintenance (as reported)',
        body: 'The reported cultures were maintained feeder-free and batch fed daily with Essential 8, mTeSR1, NutriStem XF, or Essential 8 without FGF2 but supplemented with StemBeads FGF2, in a humidified incubator.',
        parameters: [
          { name: 'Feeding interval', value: '1', unit: 'day', sourceId: 'halliwell', locator: 'Experimental Procedures: Human Pluripotent Stem Cell Culture', note: 'Reported as batch fed daily' },
          { name: 'StemBeads FGF2 supplement', value: '800', unit: 'µL per 100 mL', sourceId: 'halliwell', locator: 'Experimental Procedures: Human Pluripotent Stem Cell Culture', note: 'Used in the Essential 8 without FGF2 arm' },
          { name: 'Incubation temperature', value: '37', unit: '°C', sourceId: 'halliwell', locator: 'Experimental Procedures: Human Pluripotent Stem Cell Culture', note: null },
          { name: 'CO₂ concentration', value: '5', unit: '% CO₂', sourceId: 'halliwell', locator: 'Experimental Procedures: Human Pluripotent Stem Cell Culture', note: 'Humidified incubator' },
        ],
        sourceIds: ['halliwell'],
      },
      {
        id: 'halliwell-passage',
        title: 'Clump passaging (as reported)',
        body: 'Passaging was reported as clump dissociation using ReLeSR, following the manufacturer’s guidelines.',
        parameters: [
          { name: 'Dissociation product', value: 'ReLeSR', unit: null, sourceId: 'halliwell', locator: 'Experimental Procedures: Human Pluripotent Stem Cell Culture', note: 'Applied per the manufacturer’s guidelines as reported' },
        ],
        sourceIds: ['halliwell'],
      },
      {
        id: 'halliwell-supplement-nucleosides',
        title: 'Nucleoside supplementation (as reported)',
        body: 'Halliwell et al. reported adding EmbryoMax Nucleosides 100× to the culture media at a final 0.5× dilution — 15 µM cytidine, 15 µM guanosine, 15 µM uridine, 15 µM adenosine and 6 µM thymidine — with all reported experiments performed after 72 h in culture with the supplementation.',
        parameters: [
          { name: 'Cytidine', value: '15', unit: 'µM', sourceId: 'halliwell', locator: 'Experimental Procedures: Nucleoside Supplementation', note: 'Final concentration' },
          { name: 'Guanosine', value: '15', unit: 'µM', sourceId: 'halliwell', locator: 'Experimental Procedures: Nucleoside Supplementation', note: 'Final concentration' },
          { name: 'Uridine', value: '15', unit: 'µM', sourceId: 'halliwell', locator: 'Experimental Procedures: Nucleoside Supplementation', note: 'Final concentration' },
          { name: 'Adenosine', value: '15', unit: 'µM', sourceId: 'halliwell', locator: 'Experimental Procedures: Nucleoside Supplementation', note: 'Final concentration' },
          { name: 'Thymidine', value: '6', unit: 'µM', sourceId: 'halliwell', locator: 'Experimental Procedures: Nucleoside Supplementation', note: 'Final concentration' },
          { name: 'Stock dilution', value: '0.5', unit: '× of the 100× stock', sourceId: 'halliwell', locator: 'Experimental Procedures: Nucleoside Supplementation', note: null },
          { name: 'Time in culture before reported assays', value: '72', unit: 'h', sourceId: 'halliwell', locator: 'Experimental Procedures: Nucleoside Supplementation', note: null },
        ],
        sourceIds: ['halliwell'],
      },
    ],
    observedEndpoints: ['Increased replication-fork speed and longer newly synthesized DNA fibers', 'Reduced replication origin density', 'Reduced γH2AX damage markers and mitotic aberrations', 'Improved survival, clonogenicity and population growth in the studied lines (68% to 79% of tracked cells entered mitosis; 59% to 91% formed colonies)'],
    adverseEvidenceIds: ['kurashima-miscoordination', 'kurashima-fork-acceleration'],
    timelineEvidence: 'reported-study-endpoint',
    limitations: ['Describes the studied lines (MIFF1, TC113, MShef11) under the reported media conditions; outcomes are study-specific.', 'Reduced damage markers and improved growth in these cultures do not remove existing mutations or mutant clones and establish no transplant readiness.', 'The same intervention class produced adverse genome-instability findings in mouse ES cells (linked adverse evidence); species, cell state and concentration differ.', 'One tested human iPS line (PChiPS771) showed no fork-asymmetry reduction under its tested medium condition (Kurashima et al., Figure EV3G).', 'Expansion endpoints in the source do not establish a whole-organ production timeline.'],
    framing: 'published-research-description',
  },
  {
    id: 'bhat-msc-serum-free-expansion',
    methodEvidenceId: 'bhat-media-expansion',
    cellSystemIds: ['human-msc'],
    title: 'Serum-free/xeno-free expansion of human BM-MSCs — published method reference (Bhat et al. 2021)',
    summary: 'What the reviewed study reported: human bone-marrow MSCs were expanded from a multi-donor pool across compared low-serum, serum-free and xeno-free media at two seeding densities, with doubling kinetics estimated from P3 to P5. Parameters are transcribed from the open-access Materials and methods with locators; this is a cited description of published research, not a recommendation or treatment instruction.',
    steps: [
      {
        id: 'bhat-isolate',
        title: 'Initial serum-containing expansion (as reported)',
        body: 'Bhat et al. reported isolating human BM-MSCs from aspirated bone marrow of healthy donors by density gradient centrifugation, plating them in T-75 flasks with DMEM-KO containing FBS and L-Glutamax in a humidified incubator, and growing them in serum-containing medium to passage 3 as a pool from three donors.',
        parameters: [
          { name: 'Donor age range', value: '18–40', unit: 'years', sourceId: 'bhat', locator: 'Materials and methods: Isolation and culturing of BM-MSCs', note: 'Healthy donors, written informed consent reported' },
          { name: 'FBS in initial medium', value: '10', unit: '%', sourceId: 'bhat', locator: 'Materials and methods: Isolation and culturing of BM-MSCs', note: null },
          { name: 'L-Glutamax', value: '2', unit: 'mM', sourceId: 'bhat', locator: 'Materials and methods: Isolation and culturing of BM-MSCs', note: null },
          { name: 'Incubation temperature', value: '37', unit: '°C', sourceId: 'bhat', locator: 'Materials and methods: Isolation and culturing of BM-MSCs', note: null },
          { name: 'CO₂ concentration', value: '5', unit: '% CO₂', sourceId: 'bhat', locator: 'Materials and methods: Isolation and culturing of BM-MSCs', note: 'Humidified' },
        ],
        sourceIds: ['bhat'],
      },
      {
        id: 'bhat-seed-p4',
        title: 'P4 seeding at two densities (as reported)',
        body: 'Cryopreserved P3 cells were reported thawed in a 37 °C water bath, revived with pre-warmed culture medium and centrifuged, then seeded (P4) at a low and a high density in T-75 flasks in the compared low-serum/SFM/XFM media; NutriStem XF cultures used an MSC attachment solution coating and StemXVivo cultures human fibronectin coating, while the other tested media were coating-free.',
        parameters: [
          { name: 'Seeding density (low)', value: '1000', unit: 'cells/cm²', sourceId: 'bhat', locator: 'Materials and methods: Sub culturing and expansion of BM-MSCs in different serum-free media', note: null },
          { name: 'Seeding density (high)', value: '5000', unit: 'cells/cm²', sourceId: 'bhat', locator: 'Materials and methods: Sub culturing and expansion of BM-MSCs in different serum-free media', note: null },
          { name: 'Thaw bath temperature', value: '37', unit: '°C', sourceId: 'bhat', locator: 'Materials and methods: Sub culturing and expansion of BM-MSCs in different serum-free media', note: null },
          { name: 'Centrifugation speed', value: '1200', unit: 'rpm', sourceId: 'bhat', locator: 'Materials and methods: Sub culturing and expansion of BM-MSCs in different serum-free media', note: null },
          { name: 'Centrifugation time', value: '10', unit: 'min', sourceId: 'bhat', locator: 'Materials and methods: Sub culturing and expansion of BM-MSCs in different serum-free media', note: null },
        ],
        sourceIds: ['bhat'],
      },
      {
        id: 'bhat-control-medium',
        title: 'Serum-containing control medium (as reported)',
        body: 'The control medium was reported as DMEM-KO supplemented with FBS, L-Glutamax, penicillin-streptomycin and bFGF.',
        parameters: [
          { name: 'FBS in control medium', value: '10', unit: '%', sourceId: 'bhat', locator: 'Materials and methods: Sub culturing and expansion of BM-MSCs in different serum-free media', note: null },
          { name: 'L-Glutamax', value: '2', unit: 'mM', sourceId: 'bhat', locator: 'Materials and methods: Sub culturing and expansion of BM-MSCs in different serum-free media', note: null },
          { name: 'Penicillin-streptomycin', value: '1', unit: '×', sourceId: 'bhat', locator: 'Materials and methods: Sub culturing and expansion of BM-MSCs in different serum-free media', note: null },
          { name: 'bFGF', value: '2', unit: 'ng/mL', sourceId: 'bhat', locator: 'Materials and methods: Sub culturing and expansion of BM-MSCs in different serum-free media', note: null },
        ],
        sourceIds: ['bhat'],
      },
      {
        id: 'bhat-harvest-p5',
        title: 'Harvest and P5 expansion (as reported)',
        body: 'Cultures were reported harvested at 80–90% confluency by enzymatic digestion with trypsin-EDTA at 37 °C for 2–3 min followed by neutralization, then expanded (P5) in CellSTACK-1 chambers at the same seeding densities; media changes were performed at 55–60% confluency, with DPBS washes before trypsinization and centrifugation.',
        parameters: [
          { name: 'Harvest confluence', value: '80–90', unit: '%', sourceId: 'bhat', locator: 'Materials and methods: Sub culturing and expansion of BM-MSCs in different serum-free media', note: null },
          { name: 'Trypsin-EDTA concentration', value: '0.25', unit: '%', sourceId: 'bhat', locator: 'Materials and methods: Sub culturing and expansion of BM-MSCs in different serum-free media', note: null },
          { name: 'Digestion time', value: '2–3', unit: 'min', sourceId: 'bhat', locator: 'Materials and methods: Sub culturing and expansion of BM-MSCs in different serum-free media', note: 'At 37 °C, followed by neutralization' },
          { name: 'Media-change confluence', value: '55–60', unit: '%', sourceId: 'bhat', locator: 'Materials and methods: Sub culturing and expansion of BM-MSCs in different serum-free media', note: null },
        ],
        sourceIds: ['bhat'],
      },
      {
        id: 'bhat-kinetics-window',
        title: 'Doubling-kinetics window (as reported)',
        body: 'Population doublings and doubling time were reported as estimated from P3 to P5, with harvesting at 80–90% confluency in each passage; the compared formulations and seeding densities produced medium-specific kinetics.',
        parameters: [
          { name: 'Kinetics passage window', value: 'P3–P5', unit: null, sourceId: 'bhat', locator: 'Materials and methods: Population doublings; Results: growth kinetics', note: 'PD and PDT estimated across this window' },
        ],
        sourceIds: ['bhat'],
      },
    ],
    observedEndpoints: ['Population doubling times (P4–P5) at 1000 cells/cm² of about 46.3–59.8 h across evaluated formulations, about 123.4 h for the formulation that failed P5 growth, versus about 55.1 h in the control medium', 'Cumulative population doublings (P4–P5) of about 12.1–13.4 at 1000 cells/cm²', 'The lower seeding density showed higher proliferation capacity than the higher density'],
    adverseEvidenceIds: [],
    timelineEvidence: 'reported-study-endpoint',
    limitations: ['Study-specific donor pool (three donors) and proprietary media compositions; reagent names appear only as the source names them for study identification.', 'Distinct media-specific P4–P5 endpoints are reported separately and are not pooled into one universal interval.', 'Expansion-kinetics observations; no genome-stability, transplant or organ-production endpoint.'],
    framing: 'published-research-description',
  },
  {
    id: 'kurashima-es-nucleoside-treatment',
    methodEvidenceId: 'kurashima-fork-acceleration',
    cellSystemIds: ['mouse-esc'],
    title: 'Nucleoside treatment of mouse ES cells — adverse-evidence method reference (Kurashima et al. 2024)',
    summary: 'What the reviewed study reported: mouse ES cultures were treated with a ribonucleoside supplement to force replication-fork acceleration, and the paper reports the adverse genome-instability findings of that intervention. Parameters are transcribed from the open-access Methods and Results with locators; this card documents adverse evidence, not a method to adopt.',
    steps: [
      {
        id: 'kurashima-es-culture',
        title: 'Mouse ES maintenance (as reported)',
        body: 'Kurashima et al. reported maintaining E14Tg2A mouse ES cells in G-MEM with FBS, MEM non-essential amino acids, sodium pyruvate, β-mercaptoethanol, penicillin-streptomycin and leukemia inhibitory factor, at 37 °C under 5% CO₂.',
        parameters: [
          { name: 'FBS', value: '10', unit: '%', sourceId: 'kurashima', locator: 'Methods: Cell culture', note: null },
          { name: 'β-mercaptoethanol', value: '0.1', unit: 'mM', sourceId: 'kurashima', locator: 'Methods: Cell culture', note: null },
          { name: 'Sodium pyruvate', value: '1', unit: '×', sourceId: 'kurashima', locator: 'Methods: Cell culture', note: null },
          { name: 'Incubation temperature', value: '37', unit: '°C', sourceId: 'kurashima', locator: 'Methods: Cell culture', note: null },
          { name: 'CO₂ concentration', value: '5', unit: '% CO₂', sourceId: 'kurashima', locator: 'Methods: Cell culture', note: null },
        ],
        sourceIds: ['kurashima'],
      },
      {
        id: 'kurashima-nucleoside-treatment',
        title: 'Fork-acceleration treatment (as reported)',
        body: 'For nucleoside supplementation, EmbryoMax Nucleosides 100× were reported used at 50-fold dilution (2× the suggested concentration); fiber-assay treatments were 48 h, and pluripotency assessment continued for up to 12 days with daily media changes.',
        parameters: [
          { name: 'Stock dilution', value: '50', unit: 'fold', sourceId: 'kurashima', locator: 'Methods: Cell culture; Results and discussion: Exogenous ribonucleoside supplementation section', note: 'Equals 2× the suggested concentration of the 100× stock' },
          { name: 'Fiber-assay treatment duration', value: '48', unit: 'h', sourceId: 'kurashima', locator: 'Results and discussion: Exogenous ribonucleoside supplementation section; Figure EV3 caption', note: null },
          { name: 'Long-term assessment duration', value: '12', unit: 'days', sourceId: 'kurashima', locator: 'Results and discussion: Exogenous ribonucleoside supplementation section; Figure EV3 caption', note: 'With daily media changes' },
        ],
        sourceIds: ['kurashima'],
      },
    ],
    observedEndpoints: ['Fork speed increased throughout S phase', 'Active origin density reduced (inter-origin distances increased)', 'S-phase duration similar; G2 duration shortened', 'The overall growth rate was reported as not affected'],
    adverseEvidenceIds: ['kurashima-miscoordination'],
    timelineEvidence: 'not-established',
    limitations: ['This card documents the intervention that produced adverse findings in the reviewed study; it is presented as adverse evidence, not as a method to adopt.', 'Mouse ES in-vitro conditions; no human, transplant or organ-production inference.', 'The same commercial nucleoside stock family is referenced by the human recipe, used here at a different dilution; species, cell state and conditions differ.'],
    framing: 'published-research-description',
  },
];

const catalog = validateRecipeCatalog({
  schema: RECIPE_SCHEMA,
  recipes,
  notice: 'Cited published-method reference cards. Every parameter is transcribed from an open-access primary source with its locator; phrasing describes what the researchers did, addresses no reader, and directs nothing at any person or animal. No safety, efficacy, transplant-readiness or timeline-acceleration claim is made by any card.',
});
export function getRecipeCatalog() { return structuredClone(catalog); }
export function getRecipesForMethod(methodEvidenceId) { return structuredClone(catalog.recipes.filter(r => r.methodEvidenceId === methodEvidenceId)); }
export function getRecipesForCellSystem(systemId) { return structuredClone(catalog.recipes.filter(r => r.cellSystemIds.includes(systemId))); }
export function getAdverseEvidenceForRecipe(recipeId) {
  const recipe = catalog.recipes.find(r => r.id === recipeId);
  if (!recipe) throw new RangeError('Unknown recipe');
  const evidence = getEvidenceCatalog();
  return structuredClone(recipe.adverseEvidenceIds.map(id => evidence.claims.find(c => c.id === id)));
}