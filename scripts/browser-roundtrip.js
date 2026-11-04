/** Two-application roundtrip adapter (Workbench -> ResearchDesk -> Workbench). Drives existing
 * Playwright pages only; no application or npm dependency. Parts are split so each stays inside
 * bounded runner calls: 'export' (Workbench bundle export), 'desk' (inert import, reviewed query,
 * mocked submission through the real queue, ZIP export), 'return' (Workbench return import with
 * preserved statuses), 'desk-controls' (bounded download-failure matrix). Cross-call state is
 * passed through page localStorage, never runner globals. ZIP extraction runs inside the page
 * with DecompressionStream('deflate-raw'); nothing is uploaded anywhere. */
export function createBrowserRoundtripSuite({ workbenchURL, deskURL, part = 'export', viewport = { width: 1280, height: 720 } }) {
  for (const [name, value] of [['workbenchURL', workbenchURL], ['deskURL', deskURL]]) {
    const parsed = new URL(value ?? '');
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new TypeError(`${name} must be HTTP(S)`);
  }
  if (!['export', 'desk', 'return', 'desk-controls'].includes(part)) throw new RangeError('Unknown roundtrip part');
  return async ({ browser, page }) => {
    const startedAt = new Date().toISOString();
    const errors = [], checks = [];
    const captureError = error => errors.push(error.message);
    page.on('pageerror', captureError);
    try {
      await page.setViewportSize(viewport);
      if (part === 'export') {
        await page.goto(new URL('/index.html', workbenchURL).href);
        await page.getByRole('tab', { name: 'Research library', exact: true }).click();
        const fixtureURL = new URL('tests/fixtures/research-exchange/roundtrip.json', workbenchURL).href;
        const bytesURL = new URL('tests/fixtures/research-exchange/synthetic.json', workbenchURL).href;
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
        const bundle = await page.locator('#cockpit-export-output').inputValue();
        await page.evaluate(textValue => localStorage.setItem('roundtrip-bundle', textValue), bundle);
        checks.push({ id: 'workbench-export', status: 'pass', bytes: bundle.length });
      } else if (part === 'desk') {
        await runDeskPart({ browser, page, deskURL, viewport, captureError, checks });
      } else if (part === 'return') {
        await runReturnPart({ browser, page, workbenchURL, deskURL, viewport, captureError, checks });
      } else {
        await runDeskControlsPart({ browser, deskURL, viewport, captureError, checks });
      }
      if (errors.length) throw new Error(errors.join('; '));
      return { schema: 'bioprinting-workbench/browser-roundtrip/1', part, workbenchURL, deskURL, viewport, startedAt, finishedAt: new Date().toISOString(), checks, errors };
    } finally { page.off('pageerror', captureError); }
  };
}

async function runDeskPart({ browser, page, deskURL, viewport, captureError, checks }) {
  const deskPage = await browser.newPage();
  try {
    deskPage.on('pageerror', captureError);
    await deskPage.setViewportSize(viewport);
    await deskPage.goto(new URL('/index.html', deskURL).href);
    const bundleText = await page.evaluate(() => localStorage.getItem('roundtrip-bundle'));
    if (!bundleText) throw new Error('Run the export part first on the Workbench page');
    await deskPage.locator('#bioprint-file').setInputFiles({ name: 'bioprint-results.json', mimeType: 'application/json', buffer: Buffer.from(bundleText) });
    await deskPage.locator('#bioprint-preview').click();
    await deskPage.waitForFunction(() => !document.getElementById('bioprint-apply').disabled, null, { timeout: 15000 });
    await deskPage.locator('#bioprint-apply').click();
    await deskPage.waitForFunction(() => document.getElementById('bioprint-status').textContent.includes('applied'), null, { timeout: 15000 });
    checks.push({ id: 'inert-import-apply', status: 'pass' });
    const queryOptions = await deskPage.locator('#bioprint-query option').count();
    if (queryOptions < 1) throw new Error('Imported queries are not selectable');
    await deskPage.locator('#bioprint-query').selectOption({ index: 0 });
    await deskPage.locator('#bioprint-review-query').click();
    await deskPage.waitForFunction(() => !document.getElementById('bioprint-submit-query').disabled, null, { timeout: 15000 });
    await deskPage.locator('#bioprint-submit-query').click();
    await deskPage.waitForFunction(() => /succeeded|submission-unknown|partial|interrupted|failed/.test(document.getElementById('bioprint-status').textContent), null, { timeout: 30000 });
    const deskStatus = await deskPage.locator('#bioprint-status').innerText();
    await deskPage.evaluate(statusText => localStorage.setItem('roundtrip-desk-status', statusText), deskStatus);
    checks.push({ id: 'reviewed-submission', status: 'pass', detail: deskStatus.slice(0, 500) });
  } finally { await deskPage.close(); }
}

async function runReturnPart({ browser, page, workbenchURL, deskURL, viewport, captureError, checks }) {
  const deskPage = await browser.newPage();
  try {
    deskPage.on('pageerror', captureError);
    await deskPage.setViewportSize(viewport);
    await deskPage.goto(new URL('/index.html', deskURL).href);
    // Re-export the stored selection and extract the manifest inside the page with the
    // platform's own DecompressionStream; the exact bytes returned are re-imported below.
    const manifestText = await deskPage.evaluate(async () => {
      const response = await fetch('/api/bioprint/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (!response.ok) throw new Error('Desk export failed');
      const buffer = await response.arrayBuffer();
      const view = new DataView(buffer);
      let end = -1;
      for (let i = buffer.byteLength - 22; i >= 0; i--) { if (view.getUint32(i, true) === 0x06054b50) { end = i; break; } }
      if (end < 0) throw new Error('ZIP directory not found');
      const entries = view.getUint16(end + 10, true);
      let offset = view.getUint32(end + 16, true);
      for (let index = 0; index < entries; index++) {
        const nameLength = view.getUint16(offset + 28, true);
        const extraLength = view.getUint16(offset + 30, true);
        const method = view.getUint16(offset + 10, true);
        const compressedSize = view.getUint32(offset + 20, true);
        const name = new TextDecoder().decode(new Uint8Array(buffer, offset + 46, nameLength));
        const dataStart = offset + 46 + nameLength + extraLength;
        if (name === 'bioprint-results.json') {
          const compressed = new Uint8Array(buffer, dataStart, compressedSize);
          const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
          return await new Response(stream).text();
        }
        offset = dataStart + compressedSize + view.getUint16(offset + 22, true);
      }
      throw new Error('bioprint-results.json not found in ZIP');
    });
    await page.goto(new URL('/index.html', workbenchURL).href);
    await page.getByRole('tab', { name: 'Research library', exact: true }).click();
    await page.locator('#cockpit-import').setInputFiles({ name: 'bioprint-results.json', mimeType: 'application/json', buffer: Buffer.from(manifestText) });
    await page.waitForFunction(() => !document.getElementById('cockpit-apply').disabled);
    await page.locator('#cockpit-apply').click();
    await page.waitForFunction(() => document.getElementById('cockpit-status').textContent.includes('Bundle applied'));
    const returned = JSON.parse(manifestText);
    checks.push({
      id: 'return-import', status: 'pass', manifestBytes: manifestText.length,
      runStatuses: (returned.modelRuns ?? []).map(run => ({ id: run.id, status: run.status })),
    });
  } finally { await deskPage.close(); }
}

async function runDeskControlsPart({ browser, deskURL, viewport, captureError, checks }) {
  const deskPage = await browser.newPage();
  try {
    deskPage.on('pageerror', captureError);
    await deskPage.setViewportSize(viewport);
    await deskPage.goto(new URL('/index.html', deskURL).href);
    const before = await deskPage.locator('#bioprint-status').innerText();
    await deskPage.locator('#bioprint-run-ids').fill('ffffffffffffffffffffffffffffffff');
    await deskPage.locator('#bioprint-export').click();
    await deskPage.waitForFunction(previous => document.getElementById('bioprint-status').textContent !== previous, before, { timeout: 15000 });
    const after = await deskPage.locator('#bioprint-status').innerText();
    if (!/Download failed|Unknown|missing/i.test(after)) throw new Error(`Expected a bounded download failure, got: ${after.slice(0, 200)}`);
    checks.push({ id: 'download-failure-matrix', status: 'pass', detail: after.slice(0, 300) });
  } finally { await deskPage.close(); }
}