import { assertAllowedKeys, text } from './validation.js';

/** Reference-only indicative hardware costs for a hobby benchtop bioprinting setup. Prices are authored estimates, not quotes, not current, and no purchase is recommended. In-silico work precedes the physical rig, where more is at stake. */
export const HARDWARE_COST_SCHEMA = 'bioprinting-workbench/hardware-cost/1';
export const HARDWARE_CATEGORIES = ['motion-platform', 'extrusion-toolhead', 'bioink-materials', 'sterile-culture', 'measurement-qc', 'consumables-recurring'];
const CATEGORY_LABELS = { 'motion-platform': 'Motion platform (the printer that moves)', 'extrusion-toolhead': 'Extrusion toolhead (sringe pump and mounts)', 'bioink-materials': 'Bioink materials (practice hydrogels, culture reagents)', 'sterile-culture': 'Sterile-culture infrastructure (hood, incubator, microscope)', 'measurement-qc': 'Measurement and QC (scale, pH, temperature)', 'consumables-recurring': 'Recurring consumables (syringes, dishes, filters, gloves)' };
function part(id, label, category, referencePriceUSD, sourceUrl, note, recurring = false, optional = false) {
  return { id, label, category, referencePriceUSD, priceBasis: 'authored-estimate', sourceUrl, note, recurring, optional, fetchDate: null };
}
const PARTS = [
  part('used-fdm-printer-base', 'Used or kit FDM 3D printer as motion platform (Ender-3 class)', 'motion-platform', 180, 'https://www.creality.com/', 'An off-the-shelf motion stage is the honest starting point; the workbench models the rig, not a purchase, and the printer is a tool, not a validated instrument.'),
  part('nema17-stepper-x3', 'Spare NEMA17 stepper motors, pack of three', 'motion-platform', 60, 'https://www.adafruit.com/category/75', 'Spares for axis and extruder work; reference price is a widely-seen hobby-retail band, not a quote.'),
  part('stepper-controller', 'GRBL or RAMPS-class stepper controller board', 'motion-platform', 50, 'https://www.adafruit.com/category/234', 'Open-source controller firmware routes motion commands; no controller purchase is recommended and none is validated here.'),
  part('psu-12v', 'Enclosed 12 V power supply, hobby grade', 'motion-platform', 35, 'https://www.adafruit.com/category/15', 'Power belongs in a commercial enclosed unit; open-perfusion-rig documentation carries the same warning about supplies and safety.'),
  part('syringe-extruder-parts', 'DIY syringe-pump extruder hardware (leadscrew, linear rail, coupling, mounts)', 'extrusion-toolhead', 90, 'https://github.com/dylanstechmann/open-perfusion-rig', 'The printed plunger carriage is the companion project open-perfusion-rig; this line is its non-printed hardware at an estimate band.'),
  part('carriage-print-filament', 'Filament to print the syringe carriage and mounts', 'extrusion-toolhead', 25, 'https://github.com/dylanstechmann/open-perfusion-rig', 'Printing the open-perfusion-rig carriage consumes a spool fraction; PLA parts are never a sterile fluid path, as that project documents.'),
  part('sodium-alginate-100g', 'Sodium alginate, 100 g practice bioink', 'bioink-materials', 45, 'https://www.sigmaaldrich.com/', 'Acellular practice hydrogel used in the teaching literature; price is an estimate band for laboratory-grade material.'),
  part('gelatin-500g', 'Gelatin, 500 g bath and blend practice material', 'bioink-materials', 20, 'https://www.sigmaaldrich.com/', 'Cheap kitchen-to-bench practice material for extrusion feel; not a bioink recipe or a culture instruction.'),
  part('calcium-chloride-100g', 'Calcium chloride crosslinker, 100 g', 'bioink-materials', 15, 'https://www.sigmaaldrich.com/', 'Standard alginate crosslinker for practice prints; handling and disposal stay the reader\u2019s responsibility.'),
  part('pressure-sterilizer', 'Stovetop pressure sterilizer for practice runs', 'sterile-culture', 90, 'https://www.fishersci.com/', 'Steam pressure can kill practice-run contaminants; it is not a certified autoclave and validates nothing for cell work.', false, true),
  part('bench-laminar-hood', 'Small benchtop laminar-flow hood, hobby grade', 'sterile-culture', 1900, 'https://www.fishersci.com/', 'The largest honest line item for cell-capable work: clean airflow is infrastructure. Optional here because acellular practice does not need it.', false, true),
  part('co2-incubator-used', 'Used CO2 incubator', 'sterile-culture', 2500, 'https://www.fishersci.com/', 'Cells need temperature and CO2 control; optional for the acellular path, dominant for the cell-culture path, and priced as used equipment.', false, true),
  part('microscope-basic', 'Basic stereo or compound microscope', 'sterile-culture', 400, 'https://www.fishersci.com/', 'You cannot verify what you cannot see; a basic scope is the entry point, not a research imaging system.', false, true),
  part('milligram-scale', 'Bench scale, 0.001 g resolution', 'measurement-qc', 70, 'https://www.fishersci.com/', 'Gravimetric checking is the cheapest honest QC step and mirrors the perfusion-calibration-lab approach of measuring before believing.'),
  part('ph-meter', 'Bench pH meter', 'measurement-qc', 90, 'https://www.fishersci.com/', 'Hydrogel crosslinking and culture media are pH-sensitive; a meter reads, it does not certify sterility or viability.'),
  part('usb-temp-logger', 'USB temperature data logger', 'measurement-qc', 45, 'https://www.fishersci.com/', 'Recording what actually happened is the difference between a run and a rumor; this is a logging tool only.'),
  part('culture-medium-500ml', 'Basal cell-culture medium, 500 mL (recurring)', 'bioink-materials', 90, 'https://www.thermofisher.com/', 'Recurring cost of keeping cells alive; optional because the acellular path skips it, unavoidable once cells enter the picture.', true, true),
  part('fbs-serum-100ml', 'Fetal bovine serum, 100 mL (recurring)', 'bioink-materials', 250, 'https://www.thermofisher.com/', 'The heaviest recurring line in the hobby cell-culture band and an ethical and supply-chain question in its own right.', true, true),
  part('syringes-needles-pack', 'Sterile syringes and needles, packs (recurring)', 'consumables-recurring', 40, 'https://www.fishersci.com/', 'Recurring sterile consumables; single-use items are the rule and reuse is a contamination decision, not a saving.', true),
  part('culture-dishes-pack', 'Sterile culture dishes and flasks, packs (recurring)', 'consumables-recurring', 55, 'https://www.fishersci.com/', 'Plasticware recurs monthly in any bench that runs; here it is a reference band, not a subscription quote.', true),
  part('sterile-filters-pack', '0.22 \u00b5m sterile filters, packs (recurring)', 'consumables-recurring', 60, 'https://www.fishersci.com/', 'As the open-perfusion-rig documentation states: a 0.22 \u00b5m filter belongs in the line if fluid meets a culture; it is not a sterilization fix for the print.', true),
  part('gloves-disinfectant-pack', 'Nitrile gloves and disinfectant (recurring)', 'consumables-recurring', 30, 'https://www.fishersci.com/', 'Recurring bench hygiene; the cheapest line on the list and the one that guards every other line.', true),
];
const NOTICES = [
  'Reference costs only: every price is an authored indicative estimate (2026-11-02), not a quote, not current, and subject to change without notice; public vendor pages could not be fetched from this environment for anchoring.',
  'No purchase is recommended or directed here; this is a teaching visualization of where money goes when a physical benchtop bioprinting practice begins, and no parts total buys any biological outcome, youth, repair or safety.',
  'One-time and recurring costs are never summed into a single number: a $5,615 bench and a $525-per-month habit are different facts, and hiding the difference is how hobby budgets go wrong.',
  'In-silico first is the point of this workbench: the physical rig is where cells, money, sterility and safety are at stake, and the free simulation is the honest place to make the beginner\u2019s mistakes.',
];
export function defaultHardwareBudget() { return { includedPartIds: PARTS.map(p => p.id) }; }
export function getHardwareCategories() { return structuredClone(HARDWARE_CATEGORIES.map(id => ({ id, label: CATEGORY_LABELS[id] }))); }
/** Validates the authored hardware catalog as strictly as imported state; never upgrades a price to a quote. */
export function validateHardwareCatalog(raw) {
  assertAllowedKeys(raw, ['schema', 'parts'], 'hardware-catalog');
  if (raw.schema !== HARDWARE_COST_SCHEMA) throw new RangeError('Unsupported hardware cost schema');
  if (!Array.isArray(raw.parts) || !raw.parts.length || raw.parts.length > 64) throw new RangeError('Invalid hardware parts list');
  const ids = new Set();
  for (const p of raw.parts) {
    assertAllowedKeys(p, ['id','label','category','referencePriceUSD','priceBasis','sourceUrl','note','recurring','optional','fetchDate']);
    const id = text(p.id, 128, 'id'); if (ids.has(id)) throw new RangeError('Duplicate hardware part ID'); ids.add(id);
    text(p.label, 2000, 'label');
    if (!HARDWARE_CATEGORIES.includes(p.category)) throw new RangeError('Unknown hardware category');
    if (!Number.isInteger(p.referencePriceUSD) || p.referencePriceUSD < 1 || p.referencePriceUSD > 50000) throw new RangeError('Reference price out of bounds');
    if (!['fetched-list-price', 'authored-estimate'].includes(p.priceBasis)) throw new RangeError('Unknown price basis');
    if (!/^https:\/\/[^ ]+$/.test(text(p.sourceUrl, 256, 'sourceUrl'))) throw new TypeError('Hardware source URL must be https');
    const note = text(p.note, 2000, 'note');
    if (note.length < 40) throw new RangeError('Hardware note must explain purpose and honesty');
    if (p.priceBasis === 'fetched-list-price' && !/^\d{4}-\d{2}-\d{2}$/.test(String(p.fetchDate || ''))) throw new RangeError('Fetched prices need a fetch date');
    if (p.priceBasis === 'authored-estimate' && p.fetchDate !== null && p.fetchDate !== undefined) throw new RangeError('Estimates carry no fetch date');
    if (typeof p.recurring !== 'boolean' || typeof p.optional !== 'boolean') throw new TypeError('Hardware flags must be boolean');
  }
  for (const category of HARDWARE_CATEGORIES) if (!raw.parts.some(p => p.category === category)) throw new RangeError(`Missing ${category} parts`);
  if (!raw.parts.some(p => p.recurring) || !raw.parts.some(p => !p.recurring)) throw new RangeError('Catalog needs both one-time and recurring parts');
  if (!raw.parts.some(p => p.optional) || !raw.parts.some(p => !p.optional)) throw new RangeError('Catalog needs both core and optional parts');
  return structuredClone(raw);
}
const catalog = validateHardwareCatalog({ schema: HARDWARE_COST_SCHEMA, parts: PARTS });
export function getHardwareCatalog() { return structuredClone(catalog); }
export function validateHardwareBudget(raw) {
  assertAllowedKeys(raw, ['includedPartIds'], 'hardwareBudget');
  const ids = raw.includedPartIds;
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw new TypeError('Invalid hardware budget selection');
  if (new Set(ids).size !== ids.length) throw new RangeError('Duplicate hardware budget selection');
  const known = new Set(PARTS.map(p => p.id));
  if (ids.some(id => !known.has(id))) throw new RangeError('Unknown hardware budget part');
  return { includedPartIds: [...ids] };
}
export function evaluateHardwareBudget(settings) {
  const parsed = validateHardwareBudget(settings);
  const result = { status: 'unconfigured', assumptionOrigin: 'reference-hypothetical', parts: [], categories: [], oneTimeTotalUSD: null, recurringMonthlyUSD: null, notices: NOTICES };
  if (!parsed.includedPartIds.length) return result;
  result.status = 'costed';
  const byId = new Map(PARTS.map(p => [p.id, p]));
  const included = parsed.includedPartIds.map(id => byId.get(id));
  result.parts = included.map(p => ({ id: p.id, label: p.label, category: p.category, referencePriceUSD: p.referencePriceUSD, priceBasis: p.priceBasis, recurring: p.recurring, optional: p.optional }));
  for (const category of HARDWARE_CATEGORIES) {
    const inCategory = included.filter(p => p.category === category);
    if (!inCategory.length) continue;
    result.categories.push({ id: category, label: CATEGORY_LABELS[category], oneTimeUSD: inCategory.filter(p => !p.recurring).reduce((sum, p) => sum + p.referencePriceUSD, 0), recurringMonthlyUSD: inCategory.filter(p => p.recurring).reduce((sum, p) => sum + p.referencePriceUSD, 0) });
  }
  result.oneTimeTotalUSD = included.filter(p => !p.recurring).reduce((sum, p) => sum + p.referencePriceUSD, 0);
  result.recurringMonthlyUSD = included.filter(p => p.recurring).reduce((sum, p) => sum + p.referencePriceUSD, 0);
  return result;
}
