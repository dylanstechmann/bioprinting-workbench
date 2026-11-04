// Phase E hypothesis/query draft editor: plain-object cards validated by the same
// validateHypothesisCard({ allowDraft: true }) contract as every other consumer. Rendering is
// textContent-only (dynamic text is never markup); editing never upgrades reviewStatus, never
// marks anything owner-reviewed, never runs a provider and never writes scenario state.
// Missing predictions/falsifiers keep a record in draft status instead of being fabricated.
import { validateHypothesisCard, buildQueryPlans, HYPOTHESIS_STATUSES } from './hypothesis-workspace.js';

function lines(text) { return String(text).split('\n').map(item => item.trim()).filter(Boolean); }
function csv(text) { return String(text).split(',').map(item => item.trim()).filter(Boolean); }

export function createResearchDraftUI({ elements: $, workspace, onChange = () => {} }) {
  const container = $('draft-editor'), status = $('draft-status'), cards = $('draft-cards');
  if (!container || typeof container.append !== 'function') throw new TypeError('draft editor container missing');
  const fields = {};
  const alternativeRows = [];
  const listeners = [];
  let disposed = false;
  const on = (target, name, fn) => { target.addEventListener(name, fn); listeners.push([target, name, fn]); };

  function addInput(name, label, initial = '') {
    const input = document.createElement('input');
    input.value = initial;
    const wrap = document.createElement('label');
    wrap.textContent = label;
    wrap.append(input);
    container.append(wrap);
    fields[name] = input;
  }
  function addArea(name, label) {
    const area = document.createElement('textarea');
    area.value = '';
    const wrap = document.createElement('label');
    wrap.textContent = label;
    wrap.append(area);
    container.append(wrap);
    fields[name] = area;
  }
  function addSelect(name, label, options, initial) {
    const select = document.createElement('select');
    for (const value of options) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.append(option);
    }
    select.value = initial;
    const wrap = document.createElement('label');
    wrap.textContent = label;
    wrap.append(select);
    container.append(wrap);
    fields[name] = select;
  }

  addInput('id', 'Draft id (lower-case)');
  addInput('revision', 'Revision (positive integer)', '1');
  addInput('title', 'Title');
  addInput('question', 'Question');
  addInput('scope', 'Scope');
  addInput('claimBoundary', 'Claim boundary (what this record may never claim)');
  addInput('system', 'System');
  addInput('mechanism', 'Mechanism');
  addSelect('status', 'Status', HYPOTHESIS_STATUSES, 'draft');
  addSelect('authorshipCreatedBy', 'Authorship (created by)', ['owner', 'agent'], 'agent');
  addInput('authorshipMethod', 'Authorship method note', 'agent-drafted');
  addArea('predictions', 'Predictions (one per line; required for ready-for-review)');
  addArea('falsifiers', 'Falsifiers (one per line; required for ready-for-review)');
  addArea('confounders', 'Confounders (one per line)');
  addArea('missingMeasurements', 'Missing measurements (one per line)');
  addInput('modelIds', 'Model ids (comma separated)');
  addInput('supportingEvidenceIds', 'Supporting evidence ids (comma separated)');
  addInput('contradictingEvidenceIds', 'Contradicting evidence ids (comma separated; retained beside support)');
  addInput('queryPlanIds', 'Query plan ids (comma separated)');
  addInput('parentHypothesisIds', 'Parent hypothesis ids (comma separated)');
  addInput('providerIds', 'Provider ids for query plans (comma separated)', 'pubmed');

  const altContainer = document.createElement('div');
  container.append(altContainer);
  function addAlternative() {
    if (disposed || alternativeRows.length >= 8) return false;
    const row = { id: document.createElement('input'), prediction: document.createElement('input'), falsifier: document.createElement('input') };
    row.wrap = document.createElement('div');
    row.wrap.textContent = `Alternative ${alternativeRows.length + 1}`;
    row.wrap.append(row.id, row.prediction, row.falsifier);
    altContainer.append(row.wrap);
    alternativeRows.push(row);
    return true;
  }
  function removeAlternative() {
    if (disposed || alternativeRows.length <= 2) return false;
    const row = alternativeRows.pop();
    row.wrap.remove?.();
    return true;
  }
  addAlternative();
  addAlternative();

  function collectCard() {
    return {
      id: fields.id.value.trim(),
      revision: Number(fields.revision.value),
      title: fields.title.value, question: fields.question.value, scope: fields.scope.value,
      claimBoundary: fields.claimBoundary.value,
      status: fields.status.value, system: fields.system.value, mechanism: fields.mechanism.value,
      alternatives: alternativeRows.map(row => ({ id: row.id.value.trim(), prediction: row.prediction.value, falsifier: row.falsifier.value })),
      predictions: lines(fields.predictions.value), falsifiers: lines(fields.falsifiers.value),
      confounders: lines(fields.confounders.value), missingMeasurements: lines(fields.missingMeasurements.value),
      modelIds: csv(fields.modelIds.value), supportingEvidenceIds: csv(fields.supportingEvidenceIds.value),
      contradictingEvidenceIds: csv(fields.contradictingEvidenceIds.value), queryPlanIds: csv(fields.queryPlanIds.value),
      parentHypothesisIds: csv(fields.parentHypothesisIds.value),
      authorship: { createdBy: fields.authorshipCreatedBy.value, method: fields.authorshipMethod.value, reviewedBy: null },
      reviewStatus: 'unreviewed',
    };
  }
  function renderCards() {
    cards.replaceChildren();
    for (const card of workspace.list()) {
      const line = document.createElement('p');
      line.textContent = `${card.id} rev ${card.revision} · ${card.status} · ${card.reviewStatus} · ${card.title} · ${card.alternatives.length} competing alternatives · claim boundary: ${card.claimBoundary}`;
      cards.append(line);
    }
  }
  function save() {
    if (disposed) return;
    try {
      const card = collectCard();
      if (workspace.get(card.id)) workspace.update(card.id, card);
      else workspace.add(card);
      status.textContent = `Draft ${card.id} saved as ${card.status}; review status stays unreviewed and nothing is uploaded, submitted or validated.`;
      renderCards();
      onChange({ hypotheses: workspace.list(), queries: [] });
    } catch (error) {
      status.textContent = `Draft not saved: ${error.message}`;
    }
  }
  function generateQueries() {
    if (disposed) return;
    try {
      const card = validateHypothesisCard(collectCard(), { allowDraft: true });
      const queries = buildQueryPlans(card, csv(fields.providerIds.value));
      status.textContent = `Generated ${queries.length} local query plans for ${card.id}; they stay unexecuted until explicitly selected for exchange.`;
      onChange({ hypotheses: workspace.list(), queries });
    } catch (error) {
      status.textContent = `No query plans generated: ${error.message}`;
    }
  }

  const addAlternativeButton = document.createElement('button');
  addAlternativeButton.textContent = 'Add competing alternative';
  on(addAlternativeButton, 'click', () => { if (!addAlternative()) status.textContent = 'Alternatives are bounded at 8.'; });
  const removeAlternativeButton = document.createElement('button');
  removeAlternativeButton.textContent = 'Remove last alternative';
  on(removeAlternativeButton, 'click', () => { if (!removeAlternative()) status.textContent = 'At least 2 competing alternatives are required.'; });
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save draft';
  on(saveButton, 'click', save);
  const queryButton = document.createElement('button');
  queryButton.textContent = 'Generate local query plans';
  on(queryButton, 'click', generateQueries);
  container.append(addAlternativeButton, removeAlternativeButton, saveButton, queryButton);
  renderCards();

  return {
    setField(name, value) {
      const target = fields[name];
      if (!target) throw new RangeError(`Unknown draft field ${name}`);
      target.value = String(value);
    },
    setAlternative(index, values) {
      const row = alternativeRows[index];
      if (!row) throw new RangeError(`No alternative row ${index}`);
      row.id.value = String(values.id ?? '');
      row.prediction.value = String(values.prediction ?? '');
      row.falsifier.value = String(values.falsifier ?? '');
    },
    getAlternativeRows: () => alternativeRows.map(row => ({ id: row.id.value, prediction: row.prediction.value, falsifier: row.falsifier.value })),
    addAlternative, removeAlternative, save, generateQueries, renderCards,
    dispose() {
      disposed = true;
      for (const [target, name, fn] of listeners) target.removeEventListener(name, fn);
      listeners.length = 0;
    },
  };
}