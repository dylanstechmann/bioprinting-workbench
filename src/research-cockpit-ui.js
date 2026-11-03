// Phase E research cockpit: safe, inert rendering of hypothesis records and file-based bundle
// import/export. All dynamic text is assigned via textContent (never innerHTML or Markdown
// execution); links are only rendered through validateHypothesisCard-checked content; preview
// performs no writes; apply constructs new state; exported bundles are explicit files the user
// saves — nothing is uploaded anywhere.
import { parseResearchBundle, previewResearchImport, applyResearchImport, exportResearchBundle, emptyExchangeState } from './research-exchange.js';

function line(text) {
  const p = document.createElement('p');
  p.className = 'micro';
  p.textContent = String(text);
  return p;
}

export function createResearchCockpitUI({ elements: $, workspace = null, onChange = () => {} }) {
  let state = emptyExchangeState();
  if (workspace?.list) state = { ...state, hypotheses: workspace.list() };
  let pending = null;
  const listeners = [];
  const on = (target, name, fn) => { target.addEventListener(name, fn); listeners.push([target, name, fn]); };

  function renderCards() {
    const container = $('cockpit-cards');
    container.replaceChildren();
    if (!state.hypotheses.length) {
      container.append(line('No hypothesis records yet. Drafts stay unreviewed; import never marks anything owner-reviewed.'));
      return;
    }
    for (const card of state.hypotheses) {
      container.append(line(`${card.id} rev ${card.revision} · ${card.status} · ${card.reviewStatus} · ${card.title} · ${card.alternatives.length} competing alternatives · claim boundary: ${card.claimBoundary}`));
    }
    container.append(line(`Records: ${state.hypotheses.length} hypotheses, ${state.queries.length} query plans, ${state.modelRuns.length} model runs (foreign runs are metadata only), ${state.evidence.length} evidence, ${state.artifacts.length} artifacts. Publication status: not-approved.`));
    for (const run of state.modelRuns) container.append(line(`Run ${run.id ?? 'anonymous'} (${run.modelId}) status ${run.status} - ${run.note}${run.queryPlanId ? ` query ${run.queryPlanId}` : ''}${run.deskRunId ? ` desk ${run.deskRunId}` : ''}. Status is preserved as reported; interrupted is not failed and submission-unknown is never auto-retried.`));
  }
  function renderPreview() {
    const container = $('cockpit-preview');
    container.replaceChildren();
    if (!pending) {
      container.append(line('No bundle loaded. Import is previewed first and never applied automatically.'));
      return;
    }
    const { preview } = pending;
    container.append(line(`Bundle ${pending.bundle.bundleId}: ${preview.creates.length} new, ${preview.duplicates.length} identical duplicates (idempotent), ${preview.conflicts.length} conflicts.`));
    for (const warning of preview.warnings) container.append(line(`Warning: ${warning}`));
    for (const reason of preview.blockedReasons) container.append(line(`Blocked: ${reason}`));
    $('cockpit-apply').disabled = Boolean(preview.blockedReasons.length);
  }

  on($('cockpit-import'), 'change', async event => {
    const file = event.target.files?.[0];
    pending = null;
    $('cockpit-apply').disabled = true;
    try {
      if (!file) { renderPreview(); return; }
      const bundle = parseResearchBundle(await file.text());
      const preview = await previewResearchImport(bundle, state);
      pending = { bundle, preview };
      $('cockpit-status').textContent = `Preview ready for ${bundle.bundleId}. Nothing has been applied.`;
    } catch (error) {
      $('cockpit-status').textContent = error.message;
    } finally {
      event.target.value = '';
      renderPreview();
    }
  });
  on($('cockpit-apply'), 'click', async () => {
    if (!pending) return;
    try {
      state = await applyResearchImport(pending.preview, state, pending.bundle);
      pending = null;
      $('cockpit-apply').disabled = true;
      $('cockpit-status').textContent = 'Bundle applied to a new local workspace state. Nothing was submitted anywhere.';
      renderCards();
      renderPreview();
      onChange(structuredClone(state));
    } catch (error) {
      $('cockpit-status').textContent = error.message;
    }
  });
  on($('cockpit-export'), 'click', () => {
    try {
      const bundle = exportResearchBundle({ hypotheses: state.hypotheses }, {
        bundleId: `bundle-export-${Math.abs([...state.hypotheses.map(h => h.id).join()].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)).toString(36)}`,
        createdAt: new Date().toISOString(),
        privacyClassification: 'selected-for-exchange',
      });
      $('cockpit-export-output').value = JSON.stringify(bundle, null, 2);
      $('cockpit-status').textContent = 'Bundle rendered below as text. Save it explicitly as a file; it is not uploaded.';
    } catch (error) {
      $('cockpit-status').textContent = error.message;
    }
  });
  renderCards();
  renderPreview();
  return {
    getState: () => structuredClone(state),
    setState(next) {
      state = structuredClone(next);
      renderCards();
      renderPreview();
    },
    dispose() {
      for (const [target, name, fn] of listeners) target.removeEventListener(name, fn);
      listeners.length = 0;
    },
  };
}
