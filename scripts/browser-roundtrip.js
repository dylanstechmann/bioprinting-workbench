/** Two-application roundtrip adapter (Workbench -> ResearchDesk -> Workbench). Drives existing
 * Playwright pages only; no application or npm dependency. Parts are split so each stays inside
 * bounded runner calls: 'export' (Workbench bundle export + checkpoint), 'desk' (inert import,
 * reviewed query, mocked submission through the real queue, explicit-ID ZIP export), 'return'
 * (Workbench return import of manifest + extracted artifact files with preserved statuses),
 * 'desk-controls' (bounded download-failure matrix). Cross-call state passes through an explicit
 * checkpoint in page localStorage under the shared browser context; the checkpoint carries the
 * explicit export selection so no phase ever exports an empty `{}` selection. ZIP extraction runs
 * inside the page with the browser's DecompressionStream via the self-contained, unit-tested
 * functions in ./browser-roundtrip-archive.js; nothing is uploaded anywhere. */
import { extractRoundtripArchive, verifyRoundtripArtifacts, ROUNDTRIP_ARCHIVE_LIMITS } from './browser-roundtrip-archive.js';
import { readFile } from 'node:fs/promises';

const CHECKPOINT_KEY = 'roundtrip-checkpoint';
const CHECKPOINT_SCHEMA = 'bioprinting-workbench/roundtrip-checkpoint/1';
const TERMINAL_RUN_STATUSES = ['complete', 'partial', 'failed', 'interrupted'];

function requireHttpURL(value, name) {
  const parsed = new URL(value ?? '');
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new TypeError(`${name} must be HTTP(S)`);
  return parsed;
}

/** Explicit export selection derived from a bundle. Empty selections are refused. */
export function selectionFromBundle(bundle) {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) throw new TypeError('Roundtrip bundle must be a record');
  const selection = {};
  for (const [key, group] of [['hypothesisIds', 'hypotheses'], ['queryIds', 'queries'], ['modelRunIds', 'modelRuns'], ['evidenceIds', 'evidence']]) {
    const records = bundle[group];
    if (!Array.isArray(records)) throw new TypeError(`Roundtrip bundle ${group} must be an array`);
    selection[key] = records.map(record => {
      if (!record || typeof record.id !== 'string' || !record.id) throw new TypeError(`Roundtrip bundle ${group} records need ids`);
      return record.id;
    });
    if (new Set(selection[key]).size !== selection[key].length) throw new RangeError(`Roundtrip bundle ${group} ids must be unique`);
  }
  return selection;
}

export function createRoundtripCheckpoint({ sessionId, workbenchURL, deskURL, phase, bundleText, artifactExpectations = [], expectedScenarioSha256 = '', deskRunIds = [], expectedRunStatuses = [] }) {
  const workbench = requireHttpURL(workbenchURL, 'workbenchURL');
  const desk = requireHttpURL(deskURL, 'deskURL');
  if (typeof sessionId !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(sessionId)) throw new TypeError('sessionId must be short safe text');
  if (typeof bundleText !== 'string' || !bundleText || bundleText.length > 5 * 1024 * 1024) throw new RangeError('checkpoint bundle text must be bounded');
  const bundle = JSON.parse(bundleText);
  return validateRoundtripCheckpoint({
    schema: CHECKPOINT_SCHEMA,
    sessionId,
    workbenchOrigin: workbench.origin,
    deskOrigin: desk.origin,
    phase: ['export', 'desk', 'return', 'done'].includes(phase) ? phase : (() => { throw new RangeError('Unknown checkpoint phase'); })(),
    bundleText,
    ...selectionFromBundle(bundle),
    artifactExpectations,
    expectedScenarioSha256,
    deskRunIds,
    expectedRunStatuses,
  }, { sessionId, workbenchOrigin: workbench.origin, deskOrigin: desk.origin });
}

export function validateRoundtripCheckpoint(raw, { sessionId, workbenchOrigin, deskOrigin } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('Roundtrip checkpoint must be a record');
  if (raw.schema !== CHECKPOINT_SCHEMA) throw new TypeError('Roundtrip checkpoint schema mismatch');
  if (typeof raw.sessionId !== 'string' || !raw.sessionId) throw new TypeError('Roundtrip checkpoint session is missing');
  if (sessionId !== undefined && raw.sessionId !== sessionId) throw new RangeError('Roundtrip checkpoint belongs to a different session');
  for (const [key, expected] of [['workbenchOrigin', workbenchOrigin], ['deskOrigin', deskOrigin]]) {
    if (typeof raw[key] !== 'string' || !raw[key]) throw new TypeError(`Roundtrip checkpoint ${key} is missing`);
    if (expected !== undefined && raw[key] !== expected) throw new RangeError(`Roundtrip checkpoint ${key} does not match this run`);
  }
  if (!['export', 'desk', 'return', 'done'].includes(raw.phase)) throw new RangeError('Roundtrip checkpoint phase is invalid');
  if (typeof raw.bundleText !== 'string' || !raw.bundleText) throw new TypeError('Roundtrip checkpoint bundle is missing');
  for (const key of ['hypothesisIds', 'queryIds', 'modelRunIds', 'evidenceIds', 'deskRunIds']) {
    const ids = raw[key];
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new TypeError(`Roundtrip checkpoint ${key} must hold unique ids`);
    if (ids.length > 500) throw new RangeError(`Roundtrip checkpoint ${key} is unbounded`);
  }
  for (const runId of raw.deskRunIds) if (!/^[a-f0-9]{32}$/.test(runId)) throw new TypeError('Roundtrip checkpoint desk run ids must be 32-hex');
  if (!Array.isArray(raw.expectedRunStatuses) || raw.expectedRunStatuses.length > 100) throw new TypeError('Roundtrip checkpoint run statuses are invalid');
  for (const entry of raw.expectedRunStatuses) {
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || !/^[a-f0-9]{32}$/.test(entry.id)
      || typeof entry.status !== 'string' || !TERMINAL_RUN_STATUSES.includes(entry.status)) throw new TypeError('Roundtrip checkpoint run status entries are invalid');
    if (!raw.deskRunIds.includes(entry.id)) throw new RangeError('Roundtrip checkpoint run status is not part of the selection');
  }
  if (!Array.isArray(raw.artifactExpectations) || raw.artifactExpectations.length > 500) throw new TypeError('Roundtrip checkpoint artifact expectations are invalid');
  for (const entry of raw.artifactExpectations) {
    if (!entry || typeof entry !== 'object' || typeof entry.filename !== 'string' || !entry.filename
      || !Number.isInteger(entry.bytes) || entry.bytes < 0
      || typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new TypeError('Roundtrip checkpoint artifact expectation is invalid');
  }
  if (typeof raw.expectedScenarioSha256 !== 'string' || (raw.expectedScenarioSha256 && !/^[a-f0-9]{64}$/.test(raw.expectedScenarioSha256))) throw new TypeError('Roundtrip checkpoint scenario hash is invalid');
  return raw;
}

/** The Desk export request body. Never `{}`: at least one explicit stored id must be selected. */
export function deskExportBody(checkpoint) {
  const valid = validateRoundtripCheckpoint(checkpoint);
  const body = {
    hypothesisIds: [...valid.hypothesisIds],
    queryIds: [...valid.queryIds],
    modelRunIds: [...valid.modelRunIds],
    evidenceIds: [...valid.evidenceIds],
    deskRunIds: [...valid.deskRunIds],
  };
  if (!body.hypothesisIds.length && !body.queryIds.length && !body.modelRunIds.length && !body.evidenceIds.length && !body.deskRunIds.length) {
    throw new RangeError('Roundtrip export requires an explicit nonempty selection; refusing an empty export');
  }
  if (!body.deskRunIds.length) delete body.deskRunIds;
  return body;
}

async function pollUntil(step, { intervalMs = 250, timeoutMs = 20000, describe = 'condition' }) {
  const startedAt = Date.now();
  for (;;) {
    const value = await step();
    if (value) return value;
    if (Date.now() - startedAt > timeoutMs) throw new Error(`Timed out after ${timeoutMs}ms waiting for ${describe}`);
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

async function scenarioFingerprint(page) {
  return page.evaluate(async () => {
    const values = {};
    for (const id of ['spacing', 'layers', 'population', 'perfusion', 'channels', 'recipient', 'demand']) {
      const element = document.getElementById(id);
      values[id] = element ? element.value : null;
    }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(values)));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  });
}

async function readCheckpoint(page, viaURL, expectations) {
  await page.goto(new URL('/index.html', viaURL).href);
  const raw = await page.evaluate(key => localStorage.getItem(key), CHECKPOINT_KEY);
  if (!raw) throw new Error('Roundtrip checkpoint missing; run the export part in this browser context first');
  return validateRoundtripCheckpoint(JSON.parse(raw), expectations);
}

async function writeCheckpoint(page, checkpoint) {
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [CHECKPOINT_KEY, JSON.stringify(checkpoint)]);
}

export function createBrowserRoundtripSuite({ workbenchURL, deskURL, part = 'export', viewport = { width: 1280, height: 720 }, sessionId = 'roundtrip-1', blueprintId = null, checkpoint = null, runTimeoutMs = 20000 }) {
  const workbench = requireHttpURL(workbenchURL, 'workbenchURL');
  const desk = requireHttpURL(deskURL, 'deskURL');
  if (!['export', 'desk', 'return', 'desk-controls'].includes(part)) throw new RangeError('Unknown roundtrip part');
  if (!viewport || !Number.isInteger(viewport.width) || !Number.isInteger(viewport.height) || viewport.width < 320 || viewport.height < 240) throw new RangeError('viewport must be bounded pixels');
  const expectations = { sessionId, workbenchOrigin: workbench.origin, deskOrigin: desk.origin };
  return async ({ browser, page }) => {
    const startedAt = new Date().toISOString();
    const errors = [], checks = [];
    const captureError = error => errors.push(error.message);
    page.on('pageerror', captureError);
    let activeCheckpoint = checkpoint ? validateRoundtripCheckpoint(checkpoint, expectations) : null;
    try {
      await page.setViewportSize(viewport);
      if (part === 'export') {
        await page.goto(new URL('/index.html', workbench.href).href);
        await page.getByRole('tab', { name: 'Research library', exact: true }).click();
        const fixtureURL = new URL('tests/fixtures/research-exchange/roundtrip.json', workbench.href).href;
        const bytesURL = new URL('tests/fixtures/research-exchange/synthetic.json', workbench.href).href;
        const text = await page.evaluate(address => fetch(address).then(r => r.text()), fixtureURL);
        await page.locator('#cockpit-import').setInputFiles({ name: 'roundtrip.json', mimeType: 'application/json', buffer: Buffer.from(text) });
        await page.waitForFunction(() => !document.getElementById('cockpit-apply').disabled);
        await page.locator('#cockpit-apply').click();
        await page.waitForFunction(() => document.getElementById('cockpit-status').textContent.includes('Bundle applied'));
        const data = await page.evaluate(address => fetch(address).then(r => r.text()), bytesURL);
        await page.locator('#cockpit-artifacts').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(data) });
        await page.waitForFunction(() => document.getElementById('cockpit-status').textContent.includes('files selected'));
        await page.locator('#cockpit-export').click();
        await page.waitForFunction(() => document.querySelectorAll('#cockpit-downloads a').length === 2);
        const bundleText = await page.locator('#cockpit-export-output').inputValue();
        const bundle = JSON.parse(bundleText);
        activeCheckpoint = createRoundtripCheckpoint({
          sessionId,
          workbenchURL: workbench.href,
          deskURL: desk.href,
          phase: 'export',
          bundleText,
          artifactExpectations: (bundle.artifacts ?? []).map(({ filename, bytes, sha256 }) => ({ filename, bytes, sha256 })),
          expectedScenarioSha256: await scenarioFingerprint(page),
        });
        await writeCheckpoint(page, activeCheckpoint);
        checks.push({ id: 'workbench-export', status: 'pass', bytes: bundleText.length, selection: deskExportBody(activeCheckpoint) });
      } else if (part === 'desk') {
        activeCheckpoint = activeCheckpoint ?? await readCheckpoint(page, workbench.href, expectations);
        activeCheckpoint = await runDeskPart({ browser, page, desk, workbench, checkpoint: activeCheckpoint, blueprintId, runTimeoutMs, captureError, checks });
        await page.goto(new URL('/index.html', workbench.href).href);
        await writeCheckpoint(page, activeCheckpoint);
      } else if (part === 'return') {
        activeCheckpoint = activeCheckpoint ?? await readCheckpoint(page, workbench.href, expectations);
        await runReturnPart({ browser, page, desk, workbench, checkpoint: activeCheckpoint, runTimeoutMs, captureError, checks });
      } else {
        await runDeskControlsPart({ page, desk, captureError, checks });
      }
      if (errors.length) throw new Error(errors.join('; '));
      return { schema: 'bioprinting-workbench/browser-roundtrip/1', part, sessionId, workbenchURL, deskURL, viewport, startedAt, finishedAt: new Date().toISOString(), checks, errors, checkpoint: activeCheckpoint };
    } finally { page.off('pageerror', captureError); }
  };
}

async function runDeskPart({ page, desk, checkpoint, blueprintId, runTimeoutMs, captureError, checks }) {
  await page.goto(new URL('/', desk.href).href);
  await page.locator('#bioprint-file').setInputFiles({ name: 'bundle.json', mimeType: 'application/json', buffer: Buffer.from(checkpoint.bundleText) });
  await page.locator('#bioprint-preview').click();
  await page.waitForFunction(() => document.getElementById('bioprint-status').textContent.includes('"bundleSha256"'));
  await page.locator('#bioprint-apply').click();
  await page.waitForFunction(() => document.getElementById('bioprint-status').textContent.includes('"applied": true'));
  const queryId = checkpoint.queryIds[0];
  if (!queryId) throw new Error('Roundtrip checkpoint carries no imported query to review and submit');
  const blueprint = blueprintId ?? await page.evaluate(async () => {
    const response = await fetch('/api/state');
    if (!response.ok) throw new Error('Desk fixture needs a stored blueprint');
    const state = await response.json();
    return Array.isArray(state.blueprints) && state.blueprints[0]?.id ? state.blueprints[0].id : null;
  });
  if (!blueprint) throw new Error('Desk fixture needs a stored blueprint');
  await page.locator('#bioprint-query').selectOption(queryId);
  await page.locator('#bioprint-blueprint').selectOption(blueprint);
  await page.locator('#bioprint-review-query').click();
  await page.waitForFunction(() => document.getElementById('bioprint-status').textContent.includes('"reviewToken"'));
  await page.locator('#bioprint-submit-query').click();
  await page.waitForFunction(() => document.getElementById('bioprint-status').textContent.includes('"deskRunId"'));
  const uiStatus = await page.locator('#bioprint-status').innerText();
  // The exact receipt (with deskRunId) is read through the same reviewed token. The token
  // deduplication returns the stored receipt of the UI submission instead of queueing again.
  const receipt = await page.evaluate(async ({ queryId, blueprint }) => {
    const post = (route, body) => fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(async response => ({ ok: response.ok, body: await response.json() }));
    const review = await post('/api/bioprint/review-query', { queryId, blueprintId: blueprint });
    if (!review.ok) throw new Error(`Desk review failed: ${JSON.stringify(review.body).slice(0, 200)}`);
    const submit = await post('/api/bioprint/submit-query', { queryId, blueprintId: blueprint, reviewToken: review.body.reviewToken, confirmed: true });
    if (!submit.ok) throw new Error(`Desk submit receipt failed: ${JSON.stringify(submit.body).slice(0, 200)}`);
    return submit.body;
  }, { queryId, blueprint });
  if (receipt.status === 'submission-unknown') throw new Error('Desk receipt is ambiguous (submission-unknown); refusing to count it as a mocked run');
  if (!/^[a-f0-9]{32}$/.test(receipt.deskRunId ?? '')) throw new Error(`Desk receipt has no run id: ${JSON.stringify(receipt).slice(0, 200)}`);
  const repeated = await page.evaluate(async ({ queryId, blueprint }) => {
    const post = (route, body) => fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(async response => ({ ok: response.ok, body: await response.json() }));
    const review = await post('/api/bioprint/review-query', { queryId, blueprintId: blueprint });
    const submit = await post('/api/bioprint/submit-query', { queryId, blueprintId: blueprint, reviewToken: review.body.reviewToken, confirmed: true });
    return submit.body;
  }, { queryId, blueprint });
  if (repeated.deskRunId !== receipt.deskRunId || repeated.createdAt !== receipt.createdAt) throw new Error('Duplicate reviewed submission queued duplicate work');
  checks.push({ id: 'mocked-submission', status: 'pass', deskRunId: receipt.deskRunId, receiptStatus: receipt.status, duplicateSubmitDeduped: true });
  const finished = await pollUntil(() => page.evaluate(async id => {
    const response = await fetch(`/api/run/${id}`);
    if (!response.ok) return null;
    const run = await response.json();
    return ['complete', 'partial', 'failed', 'interrupted'].includes(run.status) ? run : null;
  }, receipt.deskRunId), { timeoutMs: runTimeoutMs, intervalMs: 250, describe: `Desk run ${receipt.deskRunId} to reach a terminal status` });
  if (finished.status !== 'complete') throw new Error(`Mocked Desk run ended ${finished.status}: ${String(finished.error ?? '').slice(0, 200)}`);
  checks.push({ id: 'desk-run-terminal', status: 'pass', deskRunId: finished.id, nativeStatus: finished.status });
  const updated = validateRoundtripCheckpoint({
    ...checkpoint,
    phase: 'desk',
    deskRunIds: [receipt.deskRunId],
    expectedRunStatuses: [{ id: receipt.deskRunId, status: finished.status }],
  }, { sessionId: checkpoint.sessionId, workbenchOrigin: checkpoint.workbenchOrigin, deskOrigin: checkpoint.deskOrigin });
  await page.evaluate(({ ids, deskRunId }) => {
    for (const input of document.querySelectorAll('#bioprint-selection input[type="checkbox"]')) input.checked = ids.includes(input.value);
    document.getElementById('bioprint-run-ids').value = deskRunId;
  }, { ids: [...updated.hypothesisIds, ...updated.queryIds, ...updated.modelRunIds, ...updated.evidenceIds], deskRunId: receipt.deskRunId });
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#bioprint-export').click()]);
  await page.waitForFunction(() => document.getElementById('bioprint-status').textContent.includes('Selected results downloaded'), null, { timeout: 15000 });
  if (download.suggestedFilename() !== 'bioprint-results.zip') throw new Error(`Desk export download filename mismatch: ${download.suggestedFilename()}`);
  const failure = await download.failure();
  if (failure) throw new Error(`Desk export download failed: ${failure}`);
  const zipBytes = await readFile(await download.path());
  if (zipBytes.length > ROUNDTRIP_ARCHIVE_LIMITS.maxArchiveBytes) throw new Error('Desk export exceeds bounded archive size');
  if (zipBytes[0] !== 0x50 || zipBytes[1] !== 0x4b) throw new Error('Desk export is not a ZIP archive');
  const entries = await extractRoundtripArchive(zipBytes, ROUNDTRIP_ARCHIVE_LIMITS);
  const manifestBytes = entries.get('bioprint-results.json');
  if (!manifestBytes) throw new Error('Desk export ZIP has no bioprint-results.json manifest');
  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
  const verified = await verifyRoundtripArtifacts(manifest, entries);
  checks.push({ id: 'desk-export-explicit-selection', status: 'pass', archiveBytes: zipBytes.length, artifacts: verified });
  return validateRoundtripCheckpoint({ ...updated, artifactExpectations: verified },
    { sessionId: updated.sessionId, workbenchOrigin: updated.workbenchOrigin, deskOrigin: updated.deskOrigin });
}

async function runReturnPart({ browser, page, desk, checkpoint, captureError, checks }) {
  if (!checkpoint.deskRunIds.length) throw new Error('Return import requires an explicit Desk run selection; refusing an empty export');
  const before = await scenarioFingerprint(page);
  if (checkpoint.expectedScenarioSha256 && before !== checkpoint.expectedScenarioSha256) throw new Error('Scenario state changed during the roundtrip');
  const deskPage = await browser.newPage();
  try {
    deskPage.on('pageerror', captureError);
    await deskPage.setViewportSize(page.viewportSize());
    await deskPage.goto(new URL('/', desk.href).href);
    const base64 = await deskPage.evaluate(async body => {
      const response = await fetch('/api/bioprint/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(`Desk export failed: ${(await response.text()).slice(0, 200)}`);
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 30 * 1024 * 1024) throw new Error('Desk export exceeds bounded archive size');
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let at = 0; at < bytes.length; at += 0x8000) binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
      return btoa(binary);
    }, deskExportBody(checkpoint));
    const zipBytes = Buffer.from(base64, 'base64');
    const entries = await extractRoundtripArchive(zipBytes, ROUNDTRIP_ARCHIVE_LIMITS);
    const manifestBytes = entries.get('bioprint-results.json');
    if (!manifestBytes) throw new Error('Desk return archive has no manifest');
    const manifestText = new TextDecoder().decode(manifestBytes);
    const manifest = JSON.parse(manifestText);
    const verified = await verifyRoundtripArtifacts(manifest, entries);
    const sameKey = list => [...list].map(({ filename, bytes, sha256 }) => ({ filename, bytes, sha256 })).sort((a, b) => a.filename.localeCompare(b.filename));
    if (JSON.stringify(sameKey(verified)) !== JSON.stringify(sameKey(checkpoint.artifactExpectations))) {
      throw new Error('Returned artifact bytes/hashes differ from the checkpointed Desk export expectations');
    }
    for (const expected of checkpoint.expectedRunStatuses) {
      const run = (manifest.modelRuns ?? []).find(item => item.deskRunId === expected.id);
      const mapped = expected.status === 'complete' ? 'succeeded' : expected.status;
      if (!run || run.status !== mapped) throw new Error(`Desk run status was not preserved for ${expected.id}: expected ${mapped}, got ${run?.status ?? 'missing'}`);
    }
    await page.locator('#cockpit-import').setInputFiles({ name: 'bioprint-results.json', mimeType: 'application/json', buffer: Buffer.from(manifestText) });
    await page.waitForFunction(() => !document.getElementById('cockpit-apply').disabled);
    await page.locator('#cockpit-apply').click();
    await page.waitForFunction(() => document.getElementById('cockpit-status').textContent.includes('Bundle applied'));
    const files = [...entries.entries()].filter(([name]) => name !== 'bioprint-results.json')
      .map(([name, bytes]) => ({ name, mimeType: 'application/json', buffer: Buffer.from(bytes) }));
    if (!files.length) throw new Error('Returned archive carried no artifact files to select');
    await page.locator('#cockpit-artifacts').setInputFiles(files);
    await page.waitForFunction(count => document.getElementById('cockpit-status').textContent.includes(`${count} local artifact files selected`), files.length);
    const cardsAfterFirst = await page.locator('#cockpit-cards').innerText();
    for (const expected of checkpoint.expectedRunStatuses) {
      if (!cardsAfterFirst.includes(`desk-${expected.id}`) || !cardsAfterFirst.includes('succeeded')) {
        throw new Error(`Workbench run panel lost the returned Desk run ${expected.id}`);
      }
    }
    const after = await scenarioFingerprint(page);
    if (after !== before) throw new Error('Return import mutated scenario state');
    // Idempotence: re-importing the same manifest must not duplicate or drop records.
    await page.locator('#cockpit-import').setInputFiles({ name: 'bioprint-results.json', mimeType: 'application/json', buffer: Buffer.from(manifestText) });
    await page.waitForFunction(() => !document.getElementById('cockpit-apply').disabled);
    await page.locator('#cockpit-apply').click();
    await page.waitForFunction(() => document.getElementById('cockpit-status').textContent.includes('Bundle applied'));
    const cardsAfterSecond = await page.locator('#cockpit-cards').innerText();
    if (cardsAfterSecond !== cardsAfterFirst) throw new Error('Re-import changed the Workbench record set; roundtrip import is not idempotent');
    checks.push({
      id: 'return-import', status: 'pass', manifestBytes: manifestText.length, artifactFiles: files.length,
      scenarioInvariant: true, idempotentReimport: true,
      runStatuses: (manifest.modelRuns ?? []).map(run => ({ id: run.id, deskRunId: run.deskRunId ?? null, status: run.status })),
    });
  } finally { await deskPage.close(); }
}

async function runDeskControlsPart({ page, desk, captureError, checks }) {
  await page.goto(new URL('/', desk.href).href);
  const before = await page.locator('#bioprint-status').innerText();
  await page.locator('#bioprint-run-ids').fill('ffffffffffffffffffffffffffffffff');
  await page.locator('#bioprint-export').click();
  await page.waitForFunction(previous => document.getElementById('bioprint-status').textContent !== previous, before, { timeout: 15000 });
  const after = await page.locator('#bioprint-status').innerText();
  if (!/Download failed|Unknown|missing/i.test(after)) throw new Error(`Expected a bounded download failure, got: ${after.slice(0, 200)}`);
  checks.push({ id: 'download-failure-unknown-run', status: 'pass', detail: after.slice(0, 300) });
  const beforeInvalid = await page.locator('#bioprint-status').innerText();
  await page.locator('#bioprint-run-ids').fill('not-hex');
  await page.locator('#bioprint-export').click();
  await page.waitForFunction(previous => document.getElementById('bioprint-status').textContent !== previous, beforeInvalid, { timeout: 15000 });
  const afterInvalid = await page.locator('#bioprint-status').innerText();
  if (!/Invalid Desk run ID|error/i.test(afterInvalid)) throw new Error(`Expected a bounded validation failure, got: ${afterInvalid.slice(0, 200)}`);
  checks.push({ id: 'download-failure-invalid-id', status: 'pass', detail: afterInvalid.slice(0, 300) });
}
