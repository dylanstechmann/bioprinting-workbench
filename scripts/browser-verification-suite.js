/** Inject an existing Playwright page: no runtime or browser package dependency.
 * Use an isolated page because this suite intentionally imports fixture records. */
export function summarizeBrowserChecks(checks, errors) {
  if (!Array.isArray(checks)) throw new TypeError('Browser checks must be an array');
  if (!Array.isArray(errors)) throw new TypeError('Browser errors must be an array');
  const diagnostics = [];
  for (const check of checks) {
    if (!check || typeof check !== 'object' || Array.isArray(check) || typeof check.id !== 'string' || !check.id) throw new TypeError('Each browser check needs a nonempty id');
    if (!['pass', 'fail', 'blocked'].includes(check.status)) throw new RangeError(`Unknown browser check status for ${check.id}`);
  }
  for (const error of errors) {
    if (typeof error !== 'string') throw new TypeError('Browser errors must be strings');
    diagnostics.push(`Unexpected browser error: ${error}`);
  }
  for (const check of checks) {
    if (check.status === 'fail') diagnostics.push(`Failed browser check: ${check.id}${check.detail ? ` — ${check.detail}` : ''}`);
  }
  if (errors.length || checks.some(check => check.status === 'fail')) return { status: 'fail', diagnostics };
  const blocked = checks.filter(check => check.status === 'blocked');
  if (blocked.length) {
    for (const check of blocked) diagnostics.push(`Blocked browser check: ${check.id}${check.detail ? ` — ${check.detail}` : ''}`);
    return { status: 'blocked', diagnostics };
  }
  if (!checks.length) return { status: 'fail', diagnostics: ['No browser checks completed'] };
  return { status: 'pass', diagnostics };
}

async function readDownload(page, filename) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: `Download ${filename}`, exact: true }).click(),
  ]);
  if (download.suggestedFilename() !== filename || await download.failure()) throw new Error(`Download failed: ${filename}`);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export function createBrowserVerificationSuite({ baseURL, part = 'convergence', viewport = { width: 1280, height: 720 } }) {
  const url = new URL(baseURL);
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('Browser baseURL must be HTTP(S)');
  if (!['convergence', 'exchange', 'provenance', 'exploration', 'drafts', 'presentation'].includes(part)) throw new RangeError('Unknown browser verification part');
  if (!viewport || typeof viewport !== 'object' || Array.isArray(viewport)) throw new TypeError('Browser viewport must be a record');
  if (!Number.isInteger(viewport.width) || !Number.isInteger(viewport.height) || viewport.width < 1 || viewport.height < 1 || viewport.width > 10000 || viewport.height > 10000) throw new RangeError('Browser viewport dimensions must be bounded positive integers');
  return async page => {
    const startedAt = new Date().toISOString();
    const errors = [], checks = [];
    const captureError = error => errors.push(error.message);
    const report = () => ({
      schema: 'bioprinting-workbench/browser-check/1', ...summarizeBrowserChecks(checks, errors),
      part, baseURL: url.href, viewport, startedAt, finishedAt: new Date().toISOString(), checks, errors,
    });
    page.on('pageerror', captureError);
    try {
      await page.setViewportSize(viewport);
      await page.goto(url.href);
      if (part === 'convergence') {
        await page.getByRole('tab', { name: 'Models', exact: true }).click();
        for (const boundary of ['all-faces', 'slab-x']) {
          await page.locator('#oxygen3d-boundary').selectOption(boundary);
          await page.locator('#convergence-run').click();
          await page.waitForFunction(() => document.getElementById('convergence-status').textContent.startsWith('succeeded'), null, { timeout: 30000 });
          const rows = await page.locator('#convergence-results tr').count();
          const status = await page.locator('#convergence-status').innerText();
          if (rows !== 3) throw new Error('Study must produce three rows');
          if (boundary === 'all-faces' && !status.includes('not exact errors')) throw new Error('Grid difference limitation missing');
          if (boundary === 'slab-x' && !status.includes('Analytic slab')) throw new Error('Analytic reference missing');
          checks.push({ id: boundary, status: 'pass', rows, detail: status });
        }
      } else if (part === 'provenance') {
        await page.locator('#load-example').click();
        await page.waitForFunction(() => {
          try { return JSON.parse(document.getElementById('calibration-provenance').textContent).fitRun?.status === 'succeeded'; }
          catch { return false; }
        });
        const slab = JSON.parse(await page.locator('#calibration-provenance').textContent());
        if (!/^[a-f0-9]{64}$/.test(slab.dataset.rawSha256) || slab.fitRun.applied) throw new Error('Slab provenance or inert import failed');
        checks.push({ id: 'slab-byte-provenance', status: 'pass', rawSha256: slab.dataset.rawSha256 });
        await page.getByRole('tab', { name: 'Models', exact: true }).click();
        await page.locator('#fit3d-example').click();
        await page.waitForFunction(() => {
          try { return JSON.parse(document.getElementById('fit3d-provenance').textContent).fitRun?.status === 'succeeded'; }
          catch { return false; }
        });
        await page.locator('#fit3d-apply').click();
        const box = JSON.parse(await page.locator('#fit3d-provenance').textContent());
        if (!box.fitRun.applied || box.fitRun.application.demand !== box.fitRun.estimate) throw new Error('Explicit application receipt missing');
        await page.locator('#oxygen3d-demand').fill('0.5');
        await page.locator('#oxygen3d-demand').dispatchEvent('change');
        const invalidated = JSON.parse(await page.locator('#fit3d-provenance').textContent());
        if (invalidated.fitRun !== null || !await page.locator('#fit3d-apply').isDisabled()) throw new Error('Stale fit remains applicable');
        checks.push({ id: 'explicit-application-and-invalidation', status: 'pass', application: box.fitRun.application });
      } else if (part === 'exploration') {
        await runExplorationPart(page, checks);
      } else if (part === 'drafts') {
        await runDraftsPart(page, checks);
      } else if (part === 'presentation') {
        await runPresentationPart(page, checks);
      } else {
        await page.getByRole('tab', { name: 'Research library', exact: true }).click();
        const fixtureURL = new URL('tests/fixtures/research-exchange/roundtrip.json', url).href;
        const bytesURL = new URL('tests/fixtures/research-exchange/synthetic.json', url).href;
        const text = await page.evaluate(address => fetch(address).then(r => { if (!r.ok) throw new Error('Missing exchange fixture'); return r.text(); }), fixtureURL);
        await page.locator('#cockpit-import').setInputFiles({ name: 'roundtrip.json', mimeType: 'application/json', buffer: Buffer.from(text) });
        await page.waitForFunction(() => !document.getElementById('cockpit-apply').disabled);
        await page.locator('#cockpit-apply').click();
        await page.waitForFunction(() => document.getElementById('cockpit-status').textContent.includes('Bundle applied'));
        const data = await page.evaluate(address => fetch(address).then(r => r.text()), bytesURL);
        await page.locator('#cockpit-artifacts').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(data) });
        await page.waitForFunction(() => document.getElementById('cockpit-status').textContent.includes('files selected'));
        await page.locator('#cockpit-export').click();
        await page.waitForFunction(() => document.querySelectorAll('#cockpit-downloads a').length === 2);
        const preview = await page.locator('#cockpit-export-output').inputValue();
        const manifest = await readDownload(page, 'bioprint-results.json');
        if (!manifest.equals(Buffer.from(preview))) throw new Error('Downloaded manifest differs from export preview');
        const bundle = JSON.parse(manifest.toString('utf8'));
        for (const group of ['hypotheses', 'queries', 'modelRuns', 'evidence', 'artifacts']) {
          if (!bundle[group].length) throw new Error(`Export lost ${group}`);
        }
        const sidecar = await readDownload(page, 'synthetic.json');
        const descriptor = bundle.artifacts.find(item => item.filename === 'synthetic.json');
        const sha256 = Buffer.from(await crypto.subtle.digest('SHA-256', sidecar)).toString('hex');
        if (!sidecar.equals(Buffer.from(data)) || descriptor?.bytes !== sidecar.length || descriptor.sha256 !== sha256) {
          throw new Error('Downloaded artifact differs from the source file or manifest pin');
        }
        checks.push({ id: 'complete-selected-export', status: 'pass', groups: Object.fromEntries(['hypotheses', 'queries', 'modelRuns', 'evidence', 'artifacts'].map(key => [key, bundle[key].length])) });
      }
      return report();
    } catch (error) {
      captureError(error);
      return report();
    } finally { page.off('pageerror', captureError); }
  };
}

async function runExplorationPart(page, checks) {
  const runStatus = page.locator('#sweep-status');
  const runSweep = async () => {
    await page.locator('#sweep-run').click();
    await page.waitForFunction(() => !document.getElementById('sweep-run').disabled, null, { timeout: 30000, polling: 250 });
    const status = await runStatus.innerText();
    if (!status.startsWith('Sweep succeeded:')) throw new Error(`Sweep did not succeed: ${status.slice(0, 200)}`);
    return status;
  };
  await page.getByRole('tab', { name: 'Models', exact: true }).click();
  await page.waitForFunction(() => document.getElementById('sweep-model')?.options?.length > 0);
  const modelId = await page.evaluate(() => document.getElementById('sweep-model').value);
  await page.locator('#sweep-values').fill('0, 1');
  await page.locator('#sweep-axis2').selectOption('');
  const status = await runSweep();
  const points = await page.locator('#sweep-results tr').count();
  if (points < 2) throw new Error('Sweep must render its enumerated points');
  checks.push({ id: 'exploration-sweep', status: 'pass', modelId, points, detail: status.slice(0, 300) });
  // Retained runs can only be compared on the same axis grid and base inputs.
  await runSweep();
  const [runA, runB] = await page.evaluate(() => Array.from(
    document.getElementById('sweep-compare-a').options, option => option.value,
  ));
  if (!runA || !runB || runA === runB) throw new Error('Expected two distinct retained sweeps');
  await page.locator('#sweep-compare-a').selectOption(runA);
  await page.locator('#sweep-compare-b').selectOption(runB);
  await page.locator('#sweep-compare-run').click();
  const comparisonStatus = await runStatus.innerText();
  const rows = await page.locator('#sweep-compare tr').count();
  if (!comparisonStatus.startsWith(`Compared ${runA} and ${runB}:`) || rows === 0) {
    throw new Error(`Sweep comparison did not render results: ${comparisonStatus.slice(0, 200)}`);
  }
  checks.push({ id: 'exploration-comparison', status: 'pass', rows, detail: comparisonStatus.slice(0, 300) });
}


async function runDraftsPart(page, checks) {
  const scenarioBefore = await page.evaluate(() => JSON.stringify(window.bioprintingWorkbench.exportScenario()));
  await page.getByRole('tab', { name: 'Research library', exact: true }).click();
  await page.locator('#draft-id').fill('browser-draft');
  await page.locator('#draft-revision').fill('1');
  await page.locator('#draft-title').fill('Browser verification draft');
  await page.locator('#draft-question').fill('What does the browser check verify?');
  await page.locator('#draft-scope').fill('Software verification only.');
  await page.locator('#draft-claimBoundary').fill('No biological claim.');
  await page.locator('#draft-system').fill('normalized box');
  await page.locator('#draft-mechanism').fill('diffusion-consumption balance');
  await page.locator('#draft-alt-1-id').fill('alt-a');
  await page.locator('#draft-alt-1-prediction').fill('controls render');
  await page.locator('#draft-alt-1-falsifier').fill('controls missing');
  await page.locator('#draft-alt-2-id').fill('alt-b');
  await page.locator('#draft-alt-2-prediction').fill('status lies');
  await page.locator('#draft-alt-2-falsifier').fill('status truthful');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.waitForFunction(() => /saved as/i.test(document.getElementById('draft-status').textContent), null, { timeout: 10000, polling: 250 });
  const cards = await page.locator('#draft-cards').innerText();
  if (!cards.includes('browser-draft')) throw new Error('Saved draft is missing from the record list');
  checks.push({ id: 'draft-save', status: 'pass', detail: (await page.locator('#draft-status').innerText()).slice(0, 300) });

  await page.locator('#draft-edit-browser-draft').click();
  if (await page.locator('#draft-title').inputValue() !== 'Browser verification draft') throw new Error('Visible local edit did not load the complete draft');
  await page.locator('#draft-title').fill('Browser verification draft — visibly edited');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.waitForFunction(() => document.getElementById('draft-status').textContent.includes('saved as'));
  if (!(await page.locator('#draft-cards').innerText()).includes('visibly edited')) throw new Error('Visible local edit was not saved');
  checks.push({ id: 'draft-visible-local-edit', status: 'pass', revision: await page.locator('#draft-revision').inputValue() });

  await page.locator('#draft-title').fill('');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  const refused = await page.locator('#draft-status').innerText();
  if (!/not saved/i.test(refused)) throw new Error(`Invalid save was not refused: ${refused.slice(0, 200)}`);
  checks.push({ id: 'draft-validation-guard', status: 'pass', detail: refused.slice(0, 300) });

  const fixtureURL = new URL('tests/fixtures/research-exchange/minimal.json', await page.url()).href;
  const fixtureText = await page.evaluate(async address => {
    const response = await fetch(address);
    if (!response.ok) throw new Error('Missing minimal exchange fixture');
    return response.text();
  }, fixtureURL);
  const fixture = JSON.parse(fixtureText);
  const imported = fixture.hypotheses[0];
  await page.locator('#cockpit-import').setInputFiles({ name: 'minimal.json', mimeType: 'application/json', buffer: Buffer.from(fixtureText) });
  await page.waitForFunction(() => !document.getElementById('cockpit-apply').disabled);
  if ((await page.locator('#cockpit-cards').innerText()).includes(imported.id)) throw new Error('Preview mutated cockpit state before Apply');
  await page.locator('#cockpit-apply').click();
  await page.waitForFunction(() => document.getElementById('cockpit-status').textContent.includes('Bundle applied'));
  if (!(await page.locator('#cockpit-cards').innerText()).includes(imported.id)) throw new Error('Applied import is missing');
  checks.push({ id: 'draft-import-preview-apply', status: 'pass', importedId: imported.id });

  await page.locator(`#cockpit-edit-${imported.id}`).click();
  const populated = await page.evaluate(() => Object.fromEntries([
    'id', 'revision', 'title', 'question', 'scope', 'claimBoundary', 'system', 'mechanism', 'status',
    'authorshipCreatedBy', 'authorshipMethod', 'predictions', 'falsifiers', 'confounders',
    'missingMeasurements', 'modelIds', 'supportingEvidenceIds', 'contradictingEvidenceIds',
    'queryPlanIds', 'parentHypothesisIds',
  ].map(name => [name, document.getElementById(name === 'status' ? 'draft-card-status' : `draft-${name}`).value])));
  const expected = {
    id: imported.id, revision: String(imported.revision), title: imported.title, question: imported.question,
    scope: imported.scope, claimBoundary: imported.claimBoundary, system: imported.system,
    mechanism: imported.mechanism, status: imported.status, authorshipCreatedBy: imported.authorship.createdBy,
    authorshipMethod: imported.authorship.method, predictions: '', falsifiers: '', confounders: '',
    missingMeasurements: imported.missingMeasurements.join('\n'), modelIds: imported.modelIds.join(', '),
    supportingEvidenceIds: '', contradictingEvidenceIds: '', queryPlanIds: '', parentHypothesisIds: '',
  };
  if (JSON.stringify(populated) !== JSON.stringify(expected)) throw new Error(`Imported edit population incomplete: ${JSON.stringify(populated)}`);
  if (await page.locator('#draft-alt-1-id').inputValue() !== imported.alternatives[0].id || await page.locator('#draft-alt-2-prediction').inputValue() !== imported.alternatives[1].prediction) throw new Error('Imported alternatives were not fully loaded');
  if ((await page.locator('#draft-cards').innerText()).includes(imported.id)) throw new Error('External edit load persisted before explicit Save');
  const editedImportedTitle = `${imported.title} — visibly edited import`;
  await page.locator('#draft-title').fill(editedImportedTitle);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.waitForFunction(id => document.getElementById('draft-status').textContent.includes(`Draft ${id} saved as`), imported.id);
  const draftList = await page.locator('#draft-cards').innerText();
  if (!draftList.includes(imported.id) || !draftList.includes('browser-draft')) throw new Error('Imported Save dropped another draft');
  checks.push({ id: 'draft-imported-full-load-edit-save', status: 'pass', populatedFields: Object.keys(populated).length, alternatives: imported.alternatives.length, editedField: 'title', editedValue: editedImportedTitle });

  const externalRequests = [];
  const captureRequest = request => { if (new URL(request.url()).origin !== new URL(fixtureURL).origin) externalRequests.push(request.url()); };
  page.on('request', captureRequest);
  await page.getByRole('button', { name: 'Generate local query plans', exact: true }).click();
  await page.waitForFunction(() => /Generated .*query plans/i.test(document.getElementById('draft-status').textContent), null, { timeout: 10000, polling: 250 });
  page.off('request', captureRequest);
  if (externalRequests.length) throw new Error(`Query generation issued external requests: ${externalRequests.join(', ')}`);
  checks.push({ id: 'draft-query-plans', status: 'pass', externalRequests: externalRequests.length, detail: (await page.locator('#draft-status').innerText()).slice(0, 300) });

  const localChoice = page.locator('#cockpit-selection label').filter({ hasText: 'hypotheses: browser-draft' }).locator('input');
  await localChoice.uncheck();
  await page.locator('#cockpit-export').click();
  await page.waitForFunction(() => document.getElementById('cockpit-export-output').value.includes('bundle-minimal') || document.getElementById('cockpit-export-output').value.includes('"hyp-a"'));
  const expectedBytes = Buffer.from(await page.locator('#cockpit-export-output').inputValue(), 'utf8');
  const exported = JSON.parse(expectedBytes.toString('utf8'));
  if (exported.hypotheses.length !== 1 || exported.hypotheses[0].id !== imported.id) throw new Error('Selected export did not contain exactly the imported record');
  if (!exported.queries.length || exported.queries.some(query => query.executionStatus !== 'planned')) throw new Error('Export did not retain planned-only query status');
  const downloadedBytes = await readDownload(page, 'bioprint-results.json');
  if (!downloadedBytes.equals(expectedBytes)) throw new Error('Downloaded bundle bytes differ from the validated export');
  const downloaded = JSON.parse(downloadedBytes.toString('utf8'));
  const downloadedCard = downloaded.hypotheses[0];
  if (downloadedCard.title !== editedImportedTitle) throw new Error('Actual exported bytes lost the imported-field edit');
  if (downloadedCard.authorship.createdBy !== imported.authorship.createdBy) throw new Error('Imported creator changed during edit/Save/export');
  if (downloadedCard.revision !== imported.revision) throw new Error('Imported revision changed during edit/Save/export');
  if (downloadedCard.reviewStatus !== 'unreviewed' || downloadedCard.authorship.reviewedBy !== null) throw new Error('Edited import has misleading review metadata');
  for (const name of ['parentHypothesisIds', 'queryPlanIds', 'supportingEvidenceIds', 'contradictingEvidenceIds']) {
    if (JSON.stringify(downloadedCard[name]) !== JSON.stringify(imported[name])) throw new Error(`Imported lineage/reference field changed: ${name}`);
  }
  checks.push({ id: 'draft-selected-export-download-bytes', status: 'pass', bytes: downloadedBytes.length, hypotheses: exported.hypotheses.map(card => card.id), queries: exported.queries.length, editedTitle: downloadedCard.title, createdBy: downloadedCard.authorship.createdBy, revision: downloadedCard.revision, reviewStatus: downloadedCard.reviewStatus });

  const scenarioAfter = await page.evaluate(() => JSON.stringify(window.bioprintingWorkbench.exportScenario()));
  if (scenarioAfter !== scenarioBefore) throw new Error('Draft, import, edit, query or export operations changed canonical scenario bytes');
  checks.push({ id: 'draft-scenario-byte-invariance', status: 'pass', bytes: Buffer.byteLength(scenarioBefore, 'utf8') });
  const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  if (overflow.scrollWidth > overflow.innerWidth) throw new Error(`Horizontal overflow: ${overflow.scrollWidth} > ${overflow.innerWidth}`);
  checks.push({ id: 'draft-no-horizontal-overflow', status: 'pass', ...overflow });
}


async function runPresentationPart(page, checks) {
  const scenarioBefore = await page.evaluate(() => JSON.stringify(window.bioprintingWorkbench.exportScenario()));
  await page.getByRole('tab', { name: 'Models', exact: true }).click();
  await page.waitForFunction(() => Boolean(window.bioprintingWorkbench?.diagnostics()?.graphics), null, { timeout: 10000, polling: 250 });
  const readDiagnostics = () => page.evaluate(() => {
    const graphics = window.bioprintingWorkbench?.diagnostics()?.graphics;
    const fallback = document.getElementById('webgl-error');
    return {
      webgl: graphics?.webgl,
      presentationScale: graphics?.presentationScale,
      presentationState: graphics?.presentationState ? JSON.parse(JSON.stringify(graphics.presentationState)) : null,
      webglError: fallback && !fallback.hidden ? fallback.textContent : null,
    };
  });
  const diagnosticEvidence = diagnostics => ({
    webgl: diagnostics.webgl,
    presentationScale: diagnostics.presentationScale,
    presentationState: diagnostics.presentationState,
  });
  const assertDiagnostics = (diagnostics, expected, label) => {
    if (!diagnostics || diagnostics.webgl !== true || typeof diagnostics.presentationScale !== 'string' || !diagnostics.presentationState || typeof diagnostics.presentationState !== 'object' || Array.isArray(diagnostics.presentationState)) {
      throw new Error(`${label}: actual graphics.presentationScale/presentationState diagnostics are required`);
    }
    const state = diagnostics.presentationState;
    if (diagnostics.presentationScale !== state.scale) throw new Error(`${label}: contradictory scale diagnostics (${diagnostics.presentationScale} versus ${state.scale})`);
    const actual = { scale: state.scale, representation: state.representation, cutPlane: state.cutPlane, motion: state.motion };
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label}: presentation diagnostics expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
    return diagnosticEvidence(diagnostics);
  };
  const initial = await readDiagnostics();
  if (initial?.webgl === false) {
    checks.push({ id: 'presentation', status: 'blocked', diagnostics: diagnosticEvidence(initial), detail: (initial.webglError || 'Graphics diagnostics report WebGL unavailable; presentation controls were not exercised.').slice(0, 300) });
    return;
  }
  if (initial?.webglError) throw new Error(`WebGL fallback is visible despite graphics diagnostics: ${initial.webglError.slice(0, 300)}`);
  const initialExpected = { scale: 'laboratory', representation: 'illustration', cutPlane: null, motion: 'system' };
  checks.push({ id: 'presentation-graphics-diagnostics', status: 'pass', diagnostics: assertDiagnostics(initial, initialExpected, 'Initial presentation') });

  const pointerSelect = async (selector, value) => {
    const control = page.locator(selector);
    await control.click();
    await control.selectOption(value);
  };
  const keyboardSelect = async (selector, key) => {
    await page.locator(selector).focus();
    await page.keyboard.press(key);
  };
  const transition = async (id, activation, expected, activate) => {
    await activate();
    await page.waitForFunction(wanted => {
      const graphics = window.bioprintingWorkbench?.diagnostics()?.graphics;
      const state = graphics?.presentationState;
      return graphics?.webgl === true && graphics.presentationScale === wanted.scale && state?.scale === wanted.scale
        && state.representation === wanted.representation && state.motion === wanted.motion
        && JSON.stringify(state.cutPlane ?? null) === JSON.stringify(wanted.cutPlane);
    }, expected, { timeout: 10000, polling: 250 });
    const diagnostics = await readDiagnostics();
    checks.push({
      id, status: 'pass', activation,
      diagnostics: assertDiagnostics(diagnostics, expected, id),
      detail: (await page.locator('#presentation-notice').innerText()).slice(0, 300),
    });
  };

  await transition('presentation-scale-construct', 'pointer', { ...initialExpected, scale: 'construct' }, () => pointerSelect('#presentation-scale', 'construct'));
  const modelField = { scale: 'construct', representation: 'model-field', cutPlane: null, motion: 'system' };
  await transition('presentation-representation-model-field', 'keyboard:ArrowDown', modelField, () => keyboardSelect('#presentation-representation', 'ArrowDown'));
  const cutAndReduced = { ...modelField, cutPlane: { axis: 'x', fraction: 0.5 } };
  await transition('presentation-cut-plane-x', 'pointer', cutAndReduced, async () => {
    await pointerSelect('#presentation-cut-axis', 'x');
    await page.locator('#presentation-cut-fraction').fill('0.5');
  });
  await transition('presentation-motion-reduced', 'keyboard:ArrowDown', { ...cutAndReduced, motion: 'reduced' }, () => keyboardSelect('#presentation-motion', 'ArrowDown'));
  await transition('presentation-cut-plane-off', 'pointer', { ...cutAndReduced, cutPlane: null, motion: 'reduced' }, () => pointerSelect('#presentation-cut-axis', 'off'));
  await transition('presentation-motion-system', 'keyboard:ArrowUp', modelField, () => keyboardSelect('#presentation-motion', 'ArrowUp'));

  const scenarioAfter = await page.evaluate(() => JSON.stringify(window.bioprintingWorkbench.exportScenario()));
  if (scenarioAfter !== scenarioBefore) throw new Error('Presentation controls changed canonical scenario bytes');
  checks.push({ id: 'presentation-scenario-byte-invariance', status: 'pass', beforeBytes: Buffer.byteLength(scenarioBefore, 'utf8'), afterBytes: Buffer.byteLength(scenarioAfter, 'utf8') });
  const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  if (overflow.scrollWidth > overflow.innerWidth) throw new Error(`Horizontal overflow: ${overflow.scrollWidth} > ${overflow.innerWidth}`);
  checks.push({ id: 'presentation-no-horizontal-overflow', status: 'pass', ...overflow });
}
