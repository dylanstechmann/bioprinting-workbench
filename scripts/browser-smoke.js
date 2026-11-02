// Run with the connected Playwright code runner (no application dependency).
async page => {
  const started = Date.now();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:8096/');
  await page.waitForFunction(() => window.bioprintingWorkbench?.diagnostics().analyses.oxygen3d?.converged);
  const expect = (value, message) => { if (!value) throw new Error(message); };
  expect(await page.locator('.workspace').count() === 1, 'workspace layout');
  await page.locator('#load-example').click();
  expect((await page.evaluate(() => window.bioprintingWorkbench.diagnostics().calibration.status)) === 'loaded', 'slab example');
  await page.locator('#clear-calibration').click();
  await page.locator('[data-check-id="expand-population"]').check();
  await page.locator('[data-check-id="expand-bench"]').check();
  await page.getByRole('button', { name: 'Scaffold deposition', exact: true }).click();
  const seek = async time => { await page.locator('#timeline').evaluate((el, time) => { el.value = time; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(time)); };
  await seek(1.25); const first = await page.evaluate(() => window.bioprintingWorkbench.diagnostics().graphics.printheadPosition);
  await seek(1.75); const second = await page.evaluate(() => window.bioprintingWorkbench.diagnostics().graphics.printheadPosition);
  expect(JSON.stringify(first) !== JSON.stringify(second), 'animated head');
  await page.locator('#fit3d-example').click();
  await page.waitForFunction(() => window.bioprintingWorkbench.diagnostics().analyses.fit?.inDomain);
  await page.locator('#fit3d-apply').click();
  await page.waitForFunction(() => window.bioprintingWorkbench.diagnostics().analyses.oxygen3d?.converged);
  const saved = await page.evaluate(() => window.bioprintingWorkbench.exportScenario());
  await page.locator('#restart-walkthrough').click();
  await page.locator('#scenario-file').setInputFiles({ name: 'roundtrip.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
  await page.waitForFunction(() => document.querySelector('#scenario-status').textContent.startsWith('Version 4'));
  expect(JSON.stringify(saved) === JSON.stringify(await page.evaluate(() => window.bioprintingWorkbench.exportScenario())), 'scenario round-trip');
  await page.locator('#scenario-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await page.waitForFunction(() => document.querySelector('#scenario-status').textContent.startsWith('Not imported'));
  expect(JSON.stringify(saved) === JSON.stringify(await page.evaluate(() => window.bioprintingWorkbench.exportScenario())), 'atomic invalid import');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile overflow');
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect(errors.length === 0, errors.join('\n'));
  const report = { elapsedMs: Date.now() - started, passed: ['layout', 'legacy slab example/clear', 'gates', 'animated head', '3D fit/apply', 'v4 round-trip', 'invalid-import atomicity', '390px layout', 'no page errors'] };
  await page.evaluate(report => { window.bioprintSmokeReport = report; }, report);
  return report;
}
