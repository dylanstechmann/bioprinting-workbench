// Phase E research cockpit: safe, inert rendering of hypothesis records and file-based bundle
// import/export. All dynamic text is assigned via textContent (never innerHTML or Markdown
// execution); links are only rendered through validateHypothesisCard-checked content; preview
// performs no writes; apply constructs new state; exported bundles are explicit files the user
// saves — nothing is uploaded anywhere.
import { parseResearchBundle, previewResearchImport, applyResearchImport, emptyExchangeState, MAX_BUNDLE_BYTES } from './research-exchange.js';
import { prepareSelectedResearchExport } from './research-selection.js';
import { toForeignRun } from './run-records.js';

function line(text) {
  const p = document.createElement('p');
  p.className = 'micro';
  p.textContent = String(text);
  return p;
}

export function createResearchCockpitUI({ elements: $, workspace = null, onChange = () => {}, runRegistry = null }) {
  let state = emptyExchangeState();
  if (workspace?.list) state = { ...state, hypotheses: workspace.list() };
  // Native captured runs are selectable exchange metadata; their payload artifacts ride along
  // as verified dependencies. Imported records never merge into the local registry.
  function listed(group) {
    const records = [...(state[group] ?? [])];
    if (group === 'modelRuns' && runRegistry) records.push(...runRegistry.list().map(toForeignRun));
    return records;
  }
  let pending = null;
  let generation = 0, disposed = false, applying = false;
  let artifactFiles = [], downloadUrls = [];
  const selection = {};
  const selectionGroups = { hypothesisIds: 'hypotheses', queryIds: 'queries', modelRunIds: 'modelRuns', evidenceIds: 'evidence', artifactIds: 'artifacts' };
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
    for (const run of listed('modelRuns')) container.append(line(`Run ${run.id ?? 'anonymous'} (${run.modelId}) status ${run.status} - ${run.note}${run.queryPlanId ? ` query ${run.queryPlanId}` : ''}${run.deskRunId ? ` desk ${run.deskRunId}` : ''}. Status is preserved as reported; interrupted is not failed and submission-unknown is never auto-retried.`));
  }
  function renderSelection() {
    const container = $('cockpit-selection');
    container.replaceChildren();
    for (const [key, group] of Object.entries(selectionGroups)) {
      const previous = selection[key];
      const records = listed(group);
      selection[key] = new Set(records.filter(record => !previous || previous.has(record.id)).map(record => record.id));
      for (const record of records) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = selection[key].has(record.id);
        input.addEventListener('change', () => {
          generation++;
          pending = null;
          clearDownloads();
          renderPreview();
          if (input.checked) selection[key].add(record.id); else selection[key].delete(record.id);
        });
        label.append(input, line(`${group}: ${record.id}`));
        container.append(label);
      }
    }
  }
  function clearDownloads() {
    for (const url of downloadUrls) URL.revokeObjectURL(url);
    downloadUrls = [];
    $('cockpit-downloads').replaceChildren();
  }
  function renderPreview() {
    const container = $('cockpit-preview');
    container.replaceChildren();
    if (!pending) {
      $('cockpit-apply').disabled = true;
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
    if (disposed || applying) return;
    const operation = ++generation;
    const file = event.target.files?.[0];
    pending = null;
    $('cockpit-apply').disabled = true;
    try {
      if (!file) { renderPreview(); return; }
      if (file.size > MAX_BUNDLE_BYTES) throw new RangeError('Bundle file exceeds size limit');
      const text = await file.text();
      if (disposed || operation !== generation) return;
      const bundle = parseResearchBundle(text);
      const preview = await previewResearchImport(bundle, state);
      if (disposed || operation !== generation) return;
      pending = { bundle, preview };
      $('cockpit-status').textContent = `Preview ready for ${bundle.bundleId}. Nothing has been applied.`;
    } catch (error) {
      if (disposed || operation !== generation) return;
      $('cockpit-status').textContent = error.message;
    } finally {
      if (!disposed && operation === generation) {
        event.target.value = '';
        renderPreview();
      }
    }
  });
  on($('cockpit-apply'), 'click', async () => {
    if (!pending || disposed || applying) return;
    applying = true;
    const operation = ++generation;
    $('cockpit-apply').disabled = true;
    try {
      const next = await applyResearchImport(pending.preview, state, pending.bundle);
      if (disposed || operation !== generation) return;
      state = next;
      clearDownloads();
      for (const key of Object.keys(selection)) delete selection[key];
      pending = null;
      $('cockpit-apply').disabled = true;
      $('cockpit-status').textContent = 'Bundle applied to a new local workspace state. Nothing was submitted anywhere.';
      renderCards();
      renderSelection();
      renderPreview();
      onChange(structuredClone(state));
    } catch (error) {
      if (disposed || operation !== generation) return;
      $('cockpit-status').textContent = error.message;
    } finally {
      applying = false;
      if (!disposed && operation === generation) renderPreview();
    }
  });
  on($('cockpit-artifacts'), 'change', async event => {
    if (disposed || applying) return;
    const operation = ++generation;
    pending = null;
    clearDownloads();
    renderPreview();
    try {
      const files = [...(event.target.files ?? [])];
      if (files.length > 500 || files.some(file => file.size > 10 * 1024 * 1024) || files.reduce((total, file) => total + file.size, 0) > 25 * 1024 * 1024) throw new RangeError('Artifact files exceed exchange limits');
      const next = await Promise.all(files.map(async file => ({ filename: file.name, bytes: new Uint8Array(await file.arrayBuffer()) })));
      if (disposed || operation !== generation) return;
      artifactFiles = next;
      $('cockpit-status').textContent = `${next.length} local artifact files selected; exact hashes will be verified before export.`;
    } catch (error) { if (!disposed && operation === generation) $('cockpit-status').textContent = error.message; }
  });
  on($('cockpit-export'), 'click', async () => {
    if (disposed || applying) return;
    const operation = generation;
    try {
      const selected = Object.fromEntries(Object.entries(selection).map(([key, ids]) => [key, [...ids]]));
      const { bundle, files, addedDependencies } = await prepareSelectedResearchExport(state, selected, {
        bundleId: `bundle-export-${Math.abs([...state.hypotheses.map(h => h.id).join()].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)).toString(36)}`,
        createdAt: new Date().toISOString(),
        privacyClassification: 'selected-for-exchange',
        files: artifactFiles,
        runRegistry,
      });
      if (disposed || operation !== generation) return;
      clearDownloads();
      $('cockpit-export-output').value = JSON.stringify(bundle, null, 2);
      const downloads = [{ filename: 'bioprint-results.json', bytes: JSON.stringify(bundle, null, 2), type: 'application/json' }, ...files];
      for (const file of downloads) {
        const anchor = document.createElement('a');
        const url = URL.createObjectURL(new Blob([file.bytes], { type: file.type ?? 'application/octet-stream' }));
        downloadUrls.push(url);
        anchor.href = url;
        anchor.download = file.filename;
        anchor.textContent = `Download ${file.filename}`;
        $('cockpit-downloads').append(anchor);
      }
      $('cockpit-status').textContent = `Selected bundle ready as explicit downloads. Nothing is uploaded. Dependencies added: ${addedDependencies.join(', ') || 'none'}.`;
    } catch (error) {
      if (disposed || operation !== generation) return;
      $('cockpit-status').textContent = error.message;
    }
  });
  renderCards();
  renderSelection();
  renderPreview();
  return {
    getState: () => structuredClone(state),
    setState(next) {
      if (disposed) return;
      generation++;
      pending = null;
      state = structuredClone(next);
      artifactFiles = [];
      clearDownloads();
      for (const key of Object.keys(selection)) delete selection[key];
      renderCards();
      renderSelection();
      renderPreview();
    },
    dispose() {
      disposed = true;
      generation++;
      pending = null;
      artifactFiles = [];
      clearDownloads();
      for (const [target, name, fn] of listeners) target.removeEventListener(name, fn);
      listeners.length = 0;
    },
  };
}
