/** Inject an existing Playwright page: no runtime or browser package dependency.
 * Use an isolated page because this suite intentionally imports fixture records. */
export function createBrowserVerificationSuite({ baseURL, part = 'convergence', viewport = { width: 1280, height: 720 } }) {
  const url = new URL(baseURL);
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('Browser baseURL must be HTTP(S)');
  if (!['convergence', 'exchange', 'provenance', 'exploration', 'drafts', 'presentation'].includes(part)) throw new RangeError('Unknown browser verification part');
  return async page => {
    const startedAt = new Date().toISOString();
    const errors = [], checks = [];
    const captureError = error => errors.push(error.message);
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
        const bundle = JSON.parse(await page.locator('#cockpit-export-output').inputValue());
        for (const group of ['hypotheses', 'queries', 'modelRuns', 'evidence', 'artifacts']) {
          if (!bundle[group].length) throw new Error(`Export lost ${group}`);
        }
        const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download bioprint-results.json', exact: true }).click()]);
        if (download.suggestedFilename() !== 'bioprint-results.json' || await download.failure()) throw new Error('Bundle download failed');
        checks.push({ id: 'complete-selected-export', status: 'pass', groups: Object.fromEntries(['hypotheses', 'queries', 'modelRuns', 'evidence', 'artifacts'].map(key => [key, bundle[key].length])) });
      }
      if (errors.length) throw new Error(errors.join('; '));
      return { schema: 'bioprinting-workbench/browser-check/1', part, baseURL: url.href, viewport, startedAt, finishedAt: new Date().toISOString(), checks, errors };
    } finally { page.off('pageerror', captureError); }
  };
}

async function runExplorationPart(page, checks) {
  await page.getByRole('tab', { name: 'Models', exact: true }).click();
  await page.waitForFunction(() => document.getElementById('sweep-model')?.options?.length > 0);
  const modelId = await page.evaluate(() => document.getElementById('sweep-model').value);
  await page.locator('#sweep-values').fill('0, 1');
  await page.locator('#sweep-axis2').selectOption('');
  await page.locator('#sweep-run').click();
  await page.waitForFunction(() => /succeeded|failed/.test(document.getElementById('sweep-status').textContent), null, { timeout: 30000, polling: 250 });
  const status = await page.locator('#sweep-status').innerText();
  if (!status.includes('succeeded')) throw new Error(`Sweep did not succeed: ${status.slice(0, 200)}`);
  const points = await page.locator('#sweep-results tr').count();
  if (points < 2) throw new Error('Sweep must render its enumerated points');
  checks.push({ id: 'exploration-sweep', status: 'pass', modelId, points, detail: status.slice(0, 300) });
  await page.locator('#sweep-values').fill('0, 2');
  await page.locator('#sweep-run').click();
  await page.waitForFunction(() => /succeeded|failed/.test(document.getElementById('sweep-status').textContent), null, { timeout: 30000, polling: 250 });
  await page.waitForFunction(() => document.getElementById('sweep-compare-a').options.length >= 2);
  const [runA, runB] = await page.evaluate(() => [
    document.getElementById('sweep-compare-a').options[0].value,
    document.getElementById('sweep-compare-b').options[1]?.value ?? document.getElementById('sweep-compare-b').options[0].value,
  ]);
  await page.locator('#sweep-compare-a').selectOption(runA);
  await page.locator('#sweep-compare-b').selectOption(runB);
  await page.locator('#sweep-compare-run').click();
  await page.waitForFunction(() => document.getElementById('sweep-compare').children.length > 0, null, { timeout: 15000, polling: 250 });
  const rows = await page.locator('#sweep-compare tr').count();
  checks.push({ id: 'exploration-comparison', status: 'pass', rows, detail: (await page.locator('#sweep-summary').innerText()).slice(0, 300) });
}


async function runDraftsPart(page, checks) {
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
  await page.getByRole('button', { name: 'Generate local query plans', exact: true }).click();
  await page.waitForFunction(() => /Generated .*query plans/i.test(document.getElementById('draft-status').textContent), null, { timeout: 10000, polling: 250 });
  checks.push({ id: 'draft-query-plans', status: 'pass', detail: (await page.locator('#draft-status').innerText()).slice(0, 300) });
  await page.locator('#draft-title').fill('');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  const refused = await page.locator('#draft-status').innerText();
  if (!/not saved/i.test(refused)) throw new Error(`Invalid save was not refused: ${refused.slice(0, 200)}`);
  checks.push({ id: 'draft-validation-guard', status: 'pass', detail: refused.slice(0, 300) });
}


async function runPresentationPart(page, checks) {
  const webglError = await page.evaluate(() => {
    const element = document.getElementById('webgl-error');
    return element && !element.hidden ? element.textContent : null;
  });
  if (webglError) {
    checks.push({ id: 'presentation', status: 'blocked', detail: webglError.slice(0, 300) });
    return;
  }
  const initialNotice = await page.locator('#presentation-notice').innerText();
  await page.locator('#presentation-scale').selectOption('construct');
  await page.waitForFunction(previous => document.getElementById('presentation-notice').textContent !== previous, initialNotice, { timeout: 10000, polling: 250 });
  checks.push({ id: 'presentation-scale', status: 'pass', detail: (await page.locator('#presentation-notice').innerText()).slice(0, 300) });
  await page.locator('#presentation-representation').selectOption('model-field');
  await page.locator('#presentation-cut-axis').selectOption('x');
  await page.locator('#presentation-cut-fraction').fill('0.5');
  await page.locator('#presentation-cut-fraction').dispatchEvent('change');
  await page.locator('#presentation-motion').selectOption('reduced');
  const cutNotice = await page.locator('#presentation-notice').innerText();
  if (!cutNotice) throw new Error('Cut plane and motion changes left no notice describing the representation limits');
  checks.push({ id: 'presentation-cut-motion', status: 'pass', detail: cutNotice.slice(0, 300) });
  await page.locator('#presentation-cut-axis').selectOption('off');
  await page.locator('#presentation-motion').selectOption('system');
  checks.push({ id: 'presentation-rollback', status: 'pass', detail: (await page.locator('#presentation-notice').innerText()).slice(0, 300) });
}
