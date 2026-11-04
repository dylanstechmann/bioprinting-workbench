/** Inject an existing Playwright page: no runtime or browser package dependency.
 * Use an isolated page because this suite intentionally imports fixture records. */
export function createBrowserVerificationSuite({ baseURL, part = 'convergence', viewport = { width: 1280, height: 720 } }) {
  const url = new URL(baseURL);
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('Browser baseURL must be HTTP(S)');
  if (!['convergence', 'exchange', 'provenance'].includes(part)) throw new RangeError('Unknown browser verification part');
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