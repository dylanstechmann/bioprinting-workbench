// Phase E hypothesis workspace: deterministic draft scaffolding with competing explanations
// and falsifiers. A card is a software record about a question — never a scientific discovery,
// never a validated claim. Missing predictions/falsifiers block ready-for-review but preserve
// drafts un-fabricated, and contradicting evidence is retained alongside supporting evidence.
function bounded(value, max, path, { allowEmpty = false } = {}) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim()) || value.length > max) throw new TypeError(`${path} must be ${allowEmpty ? '' : 'nonempty '}text (max ${max})`);
  return value;
}
function boundedList(value, maxItems, maxItem, path, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || value.length > maxItems) throw new TypeError(`${path} must be an array (max ${maxItems})`);
  if (!allowEmpty && !value.length) throw new TypeError(`${path} must not be empty`);
  return value.map((item, i) => bounded(item, maxItem, `${path}[${i}]`));
}
function id(value, path) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9_-]{1,63}$/.test(value)) throw new TypeError(`${path} must be a lower-case id`);
  return value;
}

export const HYPOTHESIS_STATUSES = Object.freeze(['draft', 'ready-for-review', 'archived']);
export const REVIEW_STATUSES = Object.freeze(['unreviewed', 'owner-reviewed']);

export function validateHypothesisCard(raw, { allowDraft = false } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.getPrototypeOf(raw) !== Object.prototype) throw new TypeError('hypothesisCard must be a plain object');
  for (const key of Object.keys(raw)) if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new TypeError(`hypothesisCard.${key} is forbidden`);
  const allowed = ['id', 'revision', 'title', 'question', 'scope', 'claimBoundary', 'status', 'system', 'mechanism', 'alternatives', 'predictions', 'falsifiers', 'confounders', 'missingMeasurements', 'modelIds', 'supportingEvidenceIds', 'contradictingEvidenceIds', 'queryPlanIds', 'parentHypothesisIds', 'authorship', 'reviewStatus'];
  for (const key of Object.keys(raw)) if (!allowed.includes(key)) throw new TypeError(`hypothesisCard.${key} is unsupported`);
  const card = {
    id: id(raw.id, 'hypothesisCard.id'),
    revision: Number.isInteger(raw.revision) && raw.revision > 0 ? raw.revision : (() => { throw new RangeError('revision must be a positive integer'); })(),
    title: bounded(raw.title, 300, 'hypothesisCard.title'),
    question: bounded(raw.question, 3000, 'hypothesisCard.question'),
    scope: bounded(raw.scope, 3000, 'hypothesisCard.scope'),
    claimBoundary: bounded(raw.claimBoundary, 3000, 'hypothesisCard.claimBoundary'),
    status: HYPOTHESIS_STATUSES.includes(raw.status) ? raw.status : (() => { throw new RangeError('hypothesisCard.status unsupported'); })(),
    system: bounded(raw.system, 500, 'hypothesisCard.system'),
    mechanism: bounded(raw.mechanism, 3000, 'hypothesisCard.mechanism'),
    alternatives: Array.isArray(raw.alternatives) && raw.alternatives.length >= 2 && raw.alternatives.length <= 8
      ? raw.alternatives.map((alt, i) => {
        if (!alt || typeof alt !== 'object' || Array.isArray(alt)) throw new TypeError(`alternatives[${i}] must be a record`);
        for (const key of Object.keys(alt)) if (!['id', 'prediction', 'falsifier'].includes(key)) throw new TypeError(`alternatives[${i}].${key} is unsupported`);
        return { id: bounded(alt.id, 64, `alternatives[${i}].id`), prediction: bounded(alt.prediction, 500, `alternatives[${i}].prediction`), falsifier: bounded(alt.falsifier, 500, `alternatives[${i}].falsifier`) };
      })
      : (() => { throw new RangeError('2-8 competing alternatives are required'); })(),
    predictions: boundedList(raw.predictions, 30, 500, 'predictions', { allowEmpty: allowDraft }),
    falsifiers: boundedList(raw.falsifiers, 30, 500, 'falsifiers', { allowEmpty: allowDraft }),
    confounders: boundedList(raw.confounders, 30, 500, 'confounders', { allowEmpty: true }),
    missingMeasurements: boundedList(raw.missingMeasurements, 30, 500, 'missingMeasurements', { allowEmpty: true }),
    modelIds: boundedList(raw.modelIds, 30, 64, 'modelIds', { allowEmpty: true }),
    supportingEvidenceIds: boundedList(raw.supportingEvidenceIds, 30, 64, 'supportingEvidenceIds', { allowEmpty: true }),
    contradictingEvidenceIds: boundedList(raw.contradictingEvidenceIds, 30, 64, 'contradictingEvidenceIds', { allowEmpty: true }),
    queryPlanIds: boundedList(raw.queryPlanIds, 30, 64, 'queryPlanIds', { allowEmpty: true }),
    parentHypothesisIds: boundedList(raw.parentHypothesisIds, 30, 64, 'parentHypothesisIds', { allowEmpty: true }),
    reviewStatus: REVIEW_STATUSES.includes(raw.reviewStatus) ? raw.reviewStatus : (() => { throw new RangeError('reviewStatus unsupported'); })(),
    authorship: (() => {
      const a = raw.authorship;
      if (!a || typeof a !== 'object' || Array.isArray(a)) throw new TypeError('authorship must be a record');
      for (const key of Object.keys(a)) if (!['createdBy', 'method', 'reviewedBy'].includes(key)) throw new TypeError(`authorship.${key} is unsupported`);
      return {
        createdBy: ['owner', 'agent', 'import'].includes(a.createdBy) ? a.createdBy : (() => { throw new RangeError('authorship.createdBy unsupported'); })(),
        method: bounded(a.method, 500, 'authorship.method'),
        reviewedBy: a.reviewedBy === null ? null : bounded(a.reviewedBy, 200, 'authorship.reviewedBy'),
      };
    })(),
  };
  if (card.status === 'ready-for-review' && (!card.predictions.length || !card.falsifiers.length)) throw new RangeError('ready-for-review cards need predictions and falsifiers; keep the draft instead');
  return card;
}
/** Deterministic candidate scaffolding from explicit rules. Templates are prompts, never
 * autonomous scientific discoveries. */
export function generateHypothesisCandidates(context, rules = {}) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) throw new TypeError('context must be a record');
  const question = bounded(context.question ?? '', 3000, 'context.question');
  const system = bounded(context.system ?? 'unspecified system', 500, 'context.system');
  const count = Number.isInteger(rules.count) && rules.count >= 2 && rules.count <= 8 ? rules.count : 4;
  const templates = [
    ['artifact-of-geometry', `The observed pattern in ${system} is an artifact of the illustrated geometry rather than a biological mechanism.`],
    ['transport-limited', `The pattern in ${system} is transport-limited under the stated idealizations.`],
    ['assumption-driven', `The pattern in ${system} follows from the hypothetical parameter choices, not from the system.`],
    ['unmodeled-process', `An unmodeled process dominates the behavior of ${system}.`],
    ['measurement-gap', `The apparent disagreement about ${system} is a missing-measurement problem.`],
    ['boundary-condition', `Boundary conditions, not the mechanism, explain the ${system} pattern.`],
    ['scale-mismatch', `The compared scales for ${system} are mismatched and the juxtaposition is misleading.`],
    ['noise-fixture', `The ${system} pattern is fixture/synthetic-data noise, not signal.`],
  ];
  return templates.slice(0, count).map(([key, statement]) => ({
    id: key,
    question,
    statement,
    prediction: `If ${key} holds for ${system}, the effect weakens when the corresponding assumption is relaxed in the model.`,
    falsifier: `If ${key} holds for ${system}, a direct measurement outside the idealization should not reproduce the pattern.`,
  }));
}

export function buildQueryPlans(card, providerIds) {
  const validated = validateHypothesisCard(card, { allowDraft: true });
  if (!Array.isArray(providerIds) || providerIds.length < 1 || providerIds.length > 8) throw new RangeError('1-8 provider ids are required');
  for (const provider of providerIds) id(provider, 'providerIds[]');
  return validated.alternatives.slice(0, 3).map((alternative, i) => ({
    id: `${validated.id}-q${i + 1}`,
    hypothesisId: validated.id,
    query: `${validated.question.slice(0, 300)} [alternative ${alternative.id}]`.slice(0, 500),
    providerIds: [...providerIds],
    limit: 5,
    purpose: `Find published context that could support or contradict the ${alternative.id} alternative.`,
    disclosure: 'Query text is local until explicitly selected for exchange. Bibliography leads are unreviewed.',
    executionStatus: 'planned',
  }));
}

/** In-memory workspace with explicit save/load elsewhere; no localStorage, no repo writes. */
export function createHypothesisWorkspace(initial = { cards: [] }) {
  if (!initial || typeof initial !== 'object' || !Array.isArray(initial.cards)) throw new TypeError('workspace needs a cards array');
  const cards = initial.cards.map(card => validateHypothesisCard(card, { allowDraft: true }));
  return {
    list: () => cards.map(card => structuredClone(card)),
    get(cardId) {
      const found = cards.find(card => card.id === cardId);
      return found ? structuredClone(found) : null;
    },
    add(card) {
      const validated = validateHypothesisCard(card, { allowDraft: true });
      if (cards.some(existing => existing.id === validated.id)) throw new RangeError(`Duplicate hypothesis id ${validated.id}`);
      cards.push(validated);
      return structuredClone(validated);
    },
    update(cardId, next) {
      const index = cards.findIndex(card => card.id === cardId);
      if (index < 0) throw new RangeError(`Unknown hypothesis ${cardId}`);
      const validated = validateHypothesisCard({ ...next, id: cardId }, { allowDraft: true });
      cards[index] = validated;
      return structuredClone(validated);
    },
    archive(cardId) {
      const found = cards.find(card => card.id === cardId);
      if (!found) throw new RangeError(`Unknown hypothesis ${cardId}`);
      return this.update(cardId, { ...found, status: 'archived' });
    },
  };
}
