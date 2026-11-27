import { createHash } from 'node:crypto';

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
        await runExchangePart(page, checks);
      }
      return report();
    } catch (error) {
      captureError(error);
      return report();
    } finally { page.off('pageerror', captureError); }
  };
}

async function runExchangePart(page, checks) {
  // The fixed wall clock makes this local synthetic exchange byte-comparable across graphics modes.
  // This verifies software serialization and identity only, never biological validity.
  await page.clock.setFixedTime(new Date('2026-11-27T00:00:00.000Z'));
  const readFixture = async name => {
    const address = new URL(`tests/fixtures/research-exchange/${name}`, page.url()).href;
    const bytes = await page.evaluate(async url => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Missing exchange fixture: ${url}`);
      return Array.from(new Uint8Array(await response.arrayBuffer()));
    }, address);
    return Buffer.from(bytes);
  };
  const roundtrip = await readFixture('roundtrip.json');
  const artifact = await readFixture('synthetic.json');
  const archivedDownload = await readFixture('browser-download.json');
  await page.getByRole('tab', { name: 'Research library', exact: true }).click();
  await page.locator('#cockpit-import').setInputFiles({ name: 'roundtrip.json', mimeType: 'application/json', buffer: roundtrip });
  await page.waitForFunction(() => !document.getElementById('cockpit-apply').disabled);
  await page.locator('#cockpit-apply').click();
  await page.waitForFunction(() => document.getElementById('cockpit-status').textContent.includes('Bundle applied'));

  const attachAndExport = async bytes => {
    await page.locator('#cockpit-artifacts').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: bytes });
    await page.waitForFunction(() => document.getElementById('cockpit-status').textContent.includes('files selected'));
    await page.locator('#cockpit-export').click();
  };
  await attachAndExport(artifact.subarray(0, artifact.length - 1));
  await page.waitForFunction(() => document.getElementById('cockpit-status').textContent.includes('size mismatch'));
  if (await page.locator('#cockpit-downloads a').count()) throw new Error('Wrong-size artifact produced a download');
  checks.push({ id: 'exchange-wrong-byte-size-rejected', status: 'pass', detail: await page.locator('#cockpit-status').innerText() });

  const wrongHash = Buffer.from(artifact);
  wrongHash[wrongHash.length - 1] ^= 1;
  await attachAndExport(wrongHash);
  await page.waitForFunction(() => document.getElementById('cockpit-status').textContent.includes('hash mismatch'));
  if (await page.locator('#cockpit-downloads a').count()) throw new Error('Wrong-hash artifact produced a download');
  checks.push({ id: 'exchange-wrong-sha256-rejected', status: 'pass', detail: await page.locator('#cockpit-status').innerText() });

  await attachAndExport(artifact);
  await page.waitForFunction(() => document.querySelectorAll('#cockpit-downloads a').length === 2);
  const output = await page.locator('#cockpit-export-output').inputValue();
  const bundle = JSON.parse(output);
  for (const group of ['hypotheses', 'queries', 'modelRuns', 'evidence', 'artifacts']) {
    if (!bundle[group].length) throw new Error(`Export lost ${group}`);
  }
  checks.push({ id: 'complete-selected-export', status: 'pass', groups: Object.fromEntries(['hypotheses', 'queries', 'modelRuns', 'evidence', 'artifacts'].map(key => [key, bundle[key].length])) });

  const download = async name => {
    const [received] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: `Download ${name}`, exact: true }).click(),
    ]);
    if (received.suggestedFilename() !== name || await received.failure()) throw new Error(`${name} download failed`);
    const chunks = [];
    for await (const chunk of await received.createReadStream()) chunks.push(chunk);
    return Buffer.concat(chunks);
  };
  const bundleBytes = await download('bioprint-results.json');
  const sidecarBytes = await download('synthetic.json');
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  if (!bundleBytes.equals(archivedDownload) || output !== bundleBytes.toString('utf8')) throw new Error('Downloaded bundle differs from the archived browser bytes or validated output');
  if (bundleBytes.length !== 3889 || digest(bundleBytes) !== 'ef4319aa7c213a0293a72ae94ca2ac773d50934522ff647161a961dddf2bf904') throw new Error('Archived browser bundle identity changed');
  checks.push({ id: 'exchange-archived-bundle-download', status: 'pass', bytes: bundleBytes.length, sha256: digest(bundleBytes) });
  if (!sidecarBytes.equals(artifact) || sidecarBytes.length !== 25 || digest(sidecarBytes) !== '91f6a1f8192c4fcbe810d51149109fbc22256486f55c20376f4638dff2dc4b07') throw new Error('Archived synthetic sidecar identity changed');
  const descriptor = bundle.artifacts.find(item => item.filename === 'synthetic.json');
  if (!descriptor || descriptor.bytes !== sidecarBytes.length || descriptor.sha256 !== digest(sidecarBytes)) throw new Error('Sidecar descriptor does not match the downloaded bytes');
  checks.push({ id: 'exchange-archived-sidecar-download', status: 'pass', bytes: sidecarBytes.length, sha256: digest(sidecarBytes) });

  const { nativeBytes, ...native } = await checkNativeExportIdentity(page);
  if (digest(Buffer.from(nativeBytes)) !== native.sha256) throw new Error('Native payload bytes do not match their descriptor');
  checks.push({ id: 'exchange-native-identity-rejections', status: 'pass', ...native });
}

async function checkNativeExportIdentity(page) {
  return page.evaluate(async () => {
    const { createRunRegistry, toArtifactDescriptor } = await import('/src/run-records.js');
    const { prepareSelectedResearchExport } = await import('/src/research-selection.js');
    const registry = createRunRegistry();
    const { record } = registry.add({
      id: 'sweep-slab-oxygen-1', kind: 'sweep-run', modelId: 'slab-oxygen', status: 'partial',
      createdAt: '2026-11-04T00:00:00Z', payload: { spec: { modelId: 'slab-oxygen' }, points: [] },
      artifactFileName: 'sweep-slab-oxygen-1.json',
    });
    const response = await fetch('/tests/fixtures/research-exchange/roundtrip.json');
    if (!response.ok) throw new Error('Missing native exchange fixture');
    const fixture = await response.json();
    const context = {
      bundleId: 'bundle-registry', createdAt: '2026-11-03T12:00:00Z',
      privacyClassification: 'selected-for-exchange', runRegistry: registry,
    };
    const selected = { modelRunIds: [record.id] };
    const result = await prepareSelectedResearchExport(fixture, selected, context);
    const descriptor = result.bundle.artifacts[0];
    const both = { ...selected, artifactIds: [descriptor.id] };
    const state = { ...fixture, artifacts: [descriptor] };
    const reused = await prepareSelectedResearchExport(state, both, { ...context, files: result.files });
    if (reused.files.length !== 1 || reused.files[0].bytes.length !== descriptor.bytes || result.bundle.modelRuns[0].status !== 'partial') throw new Error('Native reuse failed');
    const capture = async (promise, expected) => {
      try { await promise; }
      catch (error) {
        if (error.message.includes(expected)) return error.message;
        throw error;
      }
      throw new Error(`Expected rejection ${expected}`);
    };
    const conflict = await capture(prepareSelectedResearchExport(
      { ...state, artifacts: [{ ...descriptor, sha256: '0'.repeat(64) }] }, both, context,
    ), 'conflicts with native');
    const wrongSize = await capture(prepareSelectedResearchExport(state, both, {
      ...context, files: [{ filename: descriptor.filename, bytes: new Uint8Array([0]) }],
    }), 'size mismatch');
    const altered = new Uint8Array(reused.files[0].bytes);
    altered[altered.length - 1] ^= 1;
    const wrongHash = await capture(prepareSelectedResearchExport(state, both, {
      ...context, files: [{ filename: descriptor.filename, bytes: altered }],
    }), 'hash mismatch');
    const wrongPin = await capture(toArtifactDescriptor({ ...record, artifactSha256: '0'.repeat(64) }), 'Stored artifact SHA-256 differs');
    return {
      bytes: descriptor.bytes, sha256: descriptor.sha256, nativeBytes: Array.from(reused.files[0].bytes),
      conflict, wrongSize, wrongHash, wrongPin,
    };
  });
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
