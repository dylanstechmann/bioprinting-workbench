import { assertAllowedKeys, finite, text } from './validation.js';
import { getApplicationsEvidenceCatalog } from './applications-evidence.js';

/** Simulation theory only: an applications ledger plus a breast soft-tissue comparison anchored to reviewed claims with transparent intervention-count arithmetic on user-hypothetical inputs. Never a safety comparison, treatment recommendation or surgical instruction. */
const LEDGER_CATEGORIES = ['cosmetic', 'functional', 'research'];
const LEDGER_STATUSES = ['measured-in-humans', 'preclinical', 'research-stage', 'theory'];
const APPROACH_CATEGORIES = ['implant', 'graft', 'flap', 'printed', 'excluded'];
const LEDGER = [
  { id: 'auricular-reconstruction', label: 'Ear (auricular) reconstruction', category: 'cosmetic', status: 'preclinical', anchorClaimIds: ['auricular-ear-printing'], adverseClaimIds: [], summary: 'Full-scale ears were DLP-printed from cartilage-organoid-laden bioinks and showed more cartilage-like matrix after implantation in nude mice in the reviewed study; no human bioprinted-ear result is reviewed.', caveat: 'Animal preclinical; the reviewed result is in nude mice with rat-derived cells.' },
  { id: 'skin-wound-printing', label: 'Skin and wound printing', category: 'cosmetic', status: 'research-stage', anchorClaimIds: ['skin-bioprinting-status'], adverseClaimIds: ['skin-bioprinting-status'], summary: 'The reviewed survey covers extrusion-, droplet-, laser- and light-based skin printing with work on hair follicles, sweat glands and pigmentation; vascularization, safety and automation remain barriers to clinical translation.', caveat: 'Review-level status; no clinical skin-printing result is reviewed.' },
  { id: 'breast-soft-tissue', label: 'Breast soft-tissue printing (the augmentation/reconstruction wish)', category: 'cosmetic', status: 'research-stage', anchorClaimIds: ['printed-adipose-neovessels', 'printed-mature-adipocytes'], adverseClaimIds: ['printed-adipose-neovessels'], summary: 'Printed adipose grafts carrying stem-cell spheroids formed 8-fold more neovessels and less fibrosis in animals over eight weeks; mature adipocytes were support-bath printed as in-vitro models; no human printed breast soft-tissue result is reviewed.', caveat: 'Animal and in-vitro evidence only; slow vascularization of conventional grafts is the measured obstacle the study targets.' },
  { id: 'hair-follicle-regeneration', label: 'Hair-follicle regeneration from printed skin', category: 'cosmetic', status: 'preclinical', anchorClaimIds: ['hair-follicle-printing-mice'], adverseClaimIds: [], summary: 'Printed artificial skin transplanted into nude-mouse wounds regenerated epidermis, dermis, hair follicles, vessels and sebaceous glands resembling native skin.', caveat: 'Mouse preclinical model; no human result is reviewed.' },
  { id: 'human-scale-constructs', label: 'Human-scale printed constructs (from scan to shape)', category: 'functional', status: 'preclinical', anchorClaimIds: ['itop-human-scale-constructs'], adverseClaimIds: [], summary: 'The reviewed ITOP system printed stable human-scale bone, cartilage and muscle constructs of clinically relevant shape with microchannels that overcome the 100–200 μm diffusion limit; human application was not established.', caveat: 'Preclinical demonstration; no printed solid organ in a living human is reviewed anywhere in this workbench.' },
  { id: 'drug-testing-tissues', label: 'Drug-testing tissues and body-on-a-chip', category: 'research', status: 'preclinical', anchorClaimIds: ['printed-mature-adipocytes', 'body-on-chip-drug-testing'], adverseClaimIds: [], summary: 'Printed physiologically relevant adipose cell models are positioned for early-stage biological assessment and preliminary drug testing, and fluidically linked organ chips target disease mechanisms, therapeutic testing and personalized medicine.', caveat: 'Early platform research, not a validated replacement for clinical trials or animal studies.' },
];
const APPROACHES = [
  { id: 'silicone-implant', label: 'Silicone implants (measured use, measured adverse record)', category: 'implant', selectable: true, anchorClaimIds: ['implant-secondary-procedures'], adverseClaimIds: ['bia-alcl-textured-implants', 'implant-secondary-procedures'], measuredSummary: 'A 74,756-discharge US study of secondary procedures for implant complications: complications are managed commonly, cosmetic revisions more often involve capsulectomy or removal without replacement, and removal without replacement tracks with multiple complications (adjusted odds ratio 2.17); BIA-ALCL is a rare lymphoma primarily associated with textured implants with surgical excision as primary treatment.', theoryNote: 'Theory: your replacement cadence is a hypothesis — no reviewed source establishes a universal implant-replacement schedule.' },
  { id: 'autologous-fat-graft', label: 'Autologous fat grafting (your own fat, partial retention)', category: 'graft', selectable: true, anchorClaimIds: ['cal-fat-retention'], adverseClaimIds: ['cal-fat-retention'], measuredSummary: 'In a six-patient cell-enriched (CAL/SVF) feasibility series, 12-month MRI retention ranged 76.4–84.0%, with one minor fat necrosis and descriptively lower retention in previously irradiated breasts; the authors call the findings preliminary.', theoryNote: 'Theory: your resorption fraction is a hypothesis; the reviewed retention comes from one small enriched cohort and is not a universal number, and sustaining volume can require regrafting.' },
  { id: 'autologous-flap', label: 'Autologous flap reconstruction (vascularized, major surgery)', category: 'flap', selectable: true, anchorClaimIds: ['diep-flap-profile'], adverseClaimIds: ['diep-flap-profile'], measuredSummary: 'The systematic review describes the DIEP flap as the gold standard for autologous reconstruction after total mastectomy; across 2,964 flaps, reported complications include fat necrosis up to 48.2% and venous congestion up to 55.1% in single-vein cohorts.', theoryNote: 'Theory: vascularized autologous tissue is the standard printed tissue aspires to match without microsurgery; this module computes no flap arithmetic.' },
  { id: 'bioprinted-adipose', label: 'Bioprinted adipose tissue (no human result reviewed)', category: 'printed', selectable: true, anchorClaimIds: ['printed-adipose-neovessels', 'printed-mature-adipocytes'], adverseClaimIds: ['printed-adipose-neovessels'], measuredSummary: 'Animal: printed frameworks with stem-cell spheroids gave 8-fold more neovessels and 70% less fibrous tissue over eight weeks, targeting the slow vascularization of conventional grafts. In vitro: mature adipocytes were printed into defined models for early biological assessment and preliminary drug testing.', theoryNote: 'Theory: no human printed breast graft is reviewed; selecting this approach is hypothetical exploration only, and any number you compute here is not evidence.' },
  { id: 'unregulated-injectables', label: 'Unregulated injectable fillers (the shortcut)', category: 'excluded', selectable: false, anchorClaimIds: ['unregulated-filler-complications'], adverseClaimIds: ['unregulated-filler-complications'], measuredSummary: 'In a 10-patient complication series after filler or fat augmentation, mastalgia 90%, palpable masses 80%, cysts 80%, migration 30% and infection 20% were observed; 40% needed surgery including mastectomy, and the authors call for reliance on established methods.', theoryNote: 'The excluded lever of this module: volumization without evidence. Shown, never selectable — the series includes two autologous-fat complications, so honesty applies to every shortcut.' },
];
const NOTICES = [
  'Simulation theory only: every computed number is user-hypothetical arithmetic, not a measurement, safety comparison or treatment recommendation.',
  'No reviewed source demonstrates a bioprinted breast graft in a living human; selecting the printed approach is hypothetical exploration only.',
  'Augmentation in healthy tissue and reconstruction after cancer are different risk contexts; this module computes neither and recommends nothing.',
  'Adverse evidence ships beside every benefit: implant complications and BIA-ALCL, partial fat retention and fat necrosis, flap complications, and the unregulated-filler series.',
  'Nothing here is medical advice or an instruction directed at any person or animal.',
];
export function defaultApplicationsPerspective() {
  return { plannedFatVolumeML: null, resorptionFraction: null, fatRetouchYears: null, implantReplacementYears: null, planningHorizonYears: null, selectedApproachIds: [] };
}
export function validateApplicationsPerspective(raw) {
  assertAllowedKeys(raw, ['plannedFatVolumeML', 'resorptionFraction', 'fatRetouchYears', 'implantReplacementYears', 'planningHorizonYears', 'selectedApproachIds'], 'applicationsPerspective');
  const integer = (value, min, max, path) => { if (!Number.isInteger(finite(value, min, max, path))) throw new RangeError(`${path} must be an integer`); return value; };
  const ids = raw.selectedApproachIds;
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw new TypeError('Invalid approach selection');
  if (new Set(ids).size !== ids.length) throw new RangeError('Duplicate approach selection');
  const selectable = new Set(APPROACHES.filter(a => a.selectable).map(a => a.id));
  if (ids.some(id => !selectable.has(id))) throw new RangeError('Unknown or excluded approach selection');
  return {
    plannedFatVolumeML: raw.plannedFatVolumeML === null ? null : integer(raw.plannedFatVolumeML, 10, 2000, 'plannedFatVolumeML'),
    resorptionFraction: raw.resorptionFraction === null ? null : finite(raw.resorptionFraction, 0, 0.99, 'resorptionFraction'),
    fatRetouchYears: raw.fatRetouchYears === null ? null : finite(raw.fatRetouchYears, 0.5, 10, 'fatRetouchYears'),
    implantReplacementYears: raw.implantReplacementYears === null ? null : finite(raw.implantReplacementYears, 1, 40, 'implantReplacementYears'),
    planningHorizonYears: raw.planningHorizonYears === null ? null : finite(raw.planningHorizonYears, 1, 80, 'planningHorizonYears'),
    selectedApproachIds: [...ids],
  };
}
export function getApplicationsLedger() { return structuredClone(LEDGER); }
export function getApproachCatalog() { return structuredClone(APPROACHES); }
export function validateApplicationsCatalog(ledger, approaches, evidence) {
  if (!Array.isArray(ledger) || !ledger.length || ledger.length > 32) throw new RangeError('Invalid applications ledger');
  if (!Array.isArray(approaches) || !approaches.length || approaches.length > 32) throw new RangeError('Invalid approach catalog');
  const claimIds = new Set(evidence.claims.map(c => c.id));
  const ledgerIds = new Set();
  for (const e of ledger) {
    assertAllowedKeys(e, ['id','label','category','status','anchorClaimIds','adverseClaimIds','summary','caveat']);
    const id = text(e.id, 128, 'id'); if (ledgerIds.has(id)) throw new RangeError('Duplicate ledger ID'); ledgerIds.add(id);
    text(e.label, 2000, 'label'); text(e.summary, 2000, 'summary'); text(e.caveat, 2000, 'caveat');
    if (!LEDGER_CATEGORIES.includes(e.category)) throw new RangeError('Unknown ledger category');
    if (!LEDGER_STATUSES.includes(e.status)) throw new RangeError('Unknown ledger status');
    for (const key of ['anchorClaimIds', 'adverseClaimIds']) {
      if (!Array.isArray(e[key]) || e[key].some(claimId => !claimIds.has(claimId))) throw new RangeError(`Dangling ledger ${key}`);
    }
    if (e.status === 'measured-in-humans' && (!e.anchorClaimIds.length || !e.adverseClaimIds.length)) throw new RangeError('Human-measured ledger entries carry adverse evidence');
    if (e.status !== 'theory' && !e.anchorClaimIds.length) throw new RangeError('Non-theory ledger entries need measured anchors');
  }
  for (const category of LEDGER_CATEGORIES) if (!ledger.some(e => e.category === category)) throw new RangeError(`Missing ${category} ledger category`);
  const approachIds = new Set();
  for (const a of approaches) {
    assertAllowedKeys(a, ['id','label','category','selectable','anchorClaimIds','adverseClaimIds','measuredSummary','theoryNote']);
    const id = text(a.id, 128, 'id'); if (approachIds.has(id)) throw new RangeError('Duplicate approach ID'); approachIds.add(id);
    text(a.label, 2000, 'label'); text(a.measuredSummary, 2000, 'measuredSummary'); text(a.theoryNote, 2000, 'theoryNote');
    if (!APPROACH_CATEGORIES.includes(a.category)) throw new RangeError('Unknown approach category');
    for (const key of ['anchorClaimIds', 'adverseClaimIds']) {
      if (!Array.isArray(a[key]) || a[key].some(claimId => !claimIds.has(claimId))) throw new RangeError(`Dangling approach ${key}`);
    }
    if (a.category === 'excluded' ? a.selectable !== false : a.selectable !== true) throw new RangeError('Excluded approaches are never selectable; all others must be');
    if (!a.anchorClaimIds.length) throw new RangeError('Approaches need measured anchors');
    if (a.category !== 'flap' && !a.adverseClaimIds.length) throw new RangeError('Non-flap approaches carry adverse evidence');
  }
  if (approaches.filter(a => a.category === 'excluded').length !== 1) throw new RangeError('Exactly one excluded approach is expected');
  for (const category of APPROACH_CATEGORIES) if (!approaches.some(a => a.category === category)) throw new RangeError(`Missing ${category} approach category`);
  return { ledger: structuredClone(ledger), approaches: structuredClone(approaches) };
}
export function evaluateApplicationsTheory(settings) {
  const parsed = validateApplicationsPerspective(settings);
  const result = { status: 'unconfigured', assumptionOrigin: 'user-hypothetical-simulation', retainedVolumeML: null, fatSessions: null, implantInterventions: null, approachEffects: [], anchorSummaries: [], adverseSummaries: [], notices: NOTICES };
  if (parsed.plannedFatVolumeML !== null && parsed.resorptionFraction !== null) {
    result.status = 'calculated';
    result.retainedVolumeML = parsed.plannedFatVolumeML * (1 - parsed.resorptionFraction);
  }
  if (parsed.fatRetouchYears !== null && parsed.planningHorizonYears !== null) result.fatSessions = Math.ceil(parsed.planningHorizonYears / parsed.fatRetouchYears);
  if (parsed.implantReplacementYears !== null && parsed.planningHorizonYears !== null) result.implantInterventions = Math.ceil(parsed.planningHorizonYears / parsed.implantReplacementYears);
  for (const id of parsed.selectedApproachIds) {
    const approach = APPROACHES.find(a => a.id === id);
    let note = approach.theoryNote;
    if (id === 'autologous-fat-graft' && result.retainedVolumeML !== null) note = `At your hypothetical resorption ${parsed.resorptionFraction}, one session of ${parsed.plannedFatVolumeML} mL retains ${result.retainedVolumeML} mL (one-pass arithmetic; retention is multifactorial and the reviewed cohort is small).`;
    if (id === 'silicone-implant' && result.implantInterventions !== null) note = `At your hypothetical cadence, ${result.implantInterventions} implant-related interventions fall inside ${parsed.planningHorizonYears} years — intervention-count arithmetic only, never a safety comparison.`;
    if (id === 'bioprinted-adipose') note = 'No human printed breast graft is reviewed; the animal anchor (8-fold neovessels over eight weeks) does not establish human volume retention. Treat every number as theory.';
    if (id === 'autologous-flap') note = 'Vascularized autologous tissue with a measured complication profile (fat necrosis up to 48.2% in single-vein cohorts); this module computes no flap arithmetic — flaps are surgery, not arithmetic.';
    result.approachEffects.push({ id, label: approach.label, note });
  }
  const evidence = getApplicationsEvidenceCatalog();
  for (const id of parsed.selectedApproachIds) {
    const approach = APPROACHES.find(a => a.id === id);
    for (const claimId of approach.anchorClaimIds) if (!result.anchorSummaries.some(c => c.id === claimId)) result.anchorSummaries.push(evidence.claims.find(c => c.id === claimId));
    for (const claimId of approach.adverseClaimIds) if (!result.adverseSummaries.some(c => c.id === claimId)) result.adverseSummaries.push(evidence.claims.find(c => c.id === claimId));
  }
  return result;
}
const validated = validateApplicationsCatalog(LEDGER, APPROACHES, getApplicationsEvidenceCatalog());
