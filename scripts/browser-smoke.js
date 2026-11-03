// Run with the connected Playwright code runner (no application dependency).
async page => {
  const started = Date.now();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:8096/');
  await page.waitForFunction(() => window.bioprintingWorkbench?.diagnostics().analyses.oxygen3d?.converged);
  const expect = (value, message) => { if (!value) throw new Error(message); };
  const diagnostics = () => page.evaluate(() => window.bioprintingWorkbench.diagnostics());
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const openArea = async area => page.evaluate(name => document.querySelector(`[data-workspace-target="${name}"]`).click(), area);
  expect((await diagnostics()).workspace.activeArea === 'studio', 'studio opens by default');
  expect(await page.locator('.workspace').count() === 1, 'workspace layout');

  // Gated walkthrough lives in Studio.
  await page.locator('[data-check-id="expand-population"]').check();
  await page.locator('[data-check-id="expand-bench"]').check();
  await page.getByRole('button', { name: 'Scaffold deposition', exact: true }).click();
  const seek = async time => { await page.locator('#timeline').evaluate((el, time) => { el.value = time; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(time)); };
  await seek(1.25); const first = (await diagnostics()).graphics.printheadPosition;
  await seek(1.75); const second = (await diagnostics()).graphics.printheadPosition;
  expect(JSON.stringify(first) !== JSON.stringify(second), 'animated head');

  // Drawing suspends outside Studio and resumes inside it (measured, not assumed).
  // Switch first, then read: reading before the switch races one last in-flight frame.
  // Headless rAF can be heavily throttled, so the resume check polls instead of using a fixed window.
  await openArea('models');
  const framesInModels = (await diagnostics()).graphics.renderedFrames;
  await wait(900);
  const framesStillInModels = (await diagnostics()).graphics.renderedFrames;
  expect(framesStillInModels === framesInModels, `drawing suspended outside studio (${framesInModels} -> ${framesStillInModels})`);
  await openArea('studio');
  await page.waitForFunction(start => window.bioprintingWorkbench.diagnostics().graphics.renderedFrames > start, framesStillInModels, { timeout: 15000 });
  expect((await diagnostics()).graphics.renderedFrames > framesStillInModels, 'drawing resumed in studio');

  // Slab calibration stays in the Studio import panel; the 3D fit lives in Models.
  await openArea('studio');
  await page.locator('#load-example').click();
  expect((await diagnostics()).calibration.status === 'loaded', 'slab example');
  await page.locator('#clear-calibration').click();
  await openArea('models');
  await page.locator('#fit3d-example').click();
  await page.waitForFunction(() => window.bioprintingWorkbench.diagnostics().analyses.fit?.inDomain);
  await page.locator('#fit3d-apply').click();
  await page.waitForFunction(() => window.bioprintingWorkbench.diagnostics().analyses.oxygen3d?.converged);

  // Scenario round-trip: export, restart, reimport, compare canonical state.
  await openArea('studio');
  const saved = await page.evaluate(() => window.bioprintingWorkbench.exportScenario());
  await page.locator('#restart-walkthrough').click();
  await page.locator('#scenario-file').setInputFiles({ name: 'roundtrip.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
  await page.waitForFunction(() => document.querySelector('#scenario-status').textContent.includes('restored'));
  expect(JSON.stringify(saved) === JSON.stringify(await page.evaluate(() => window.bioprintingWorkbench.exportScenario())), 'scenario round-trip');
  await page.locator('#scenario-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await page.waitForFunction(() => document.querySelector('#scenario-status').textContent.startsWith('Not imported'));
  expect(JSON.stringify(saved) === JSON.stringify(await page.evaluate(() => window.bioprintingWorkbench.exportScenario())), 'atomic invalid import');

  // Responsive framing without horizontal overflow in every area.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const area of ['studio', 'models', 'research', 'evidence']) {
    await openArea(area);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `390px overflow in ${area}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openArea('studio');
  expect(errors.length === 0, errors.join('\n'));
  const report = { elapsedMs: Date.now() - started, passed: ['studio default', 'gates', 'animated head', 'frame suspension', 'slab example/clear', '3D fit/apply', 'scenario round-trip', 'invalid-import atomicity', '390px layout all areas', 'no page errors'] };
  await page.evaluate(r => { window.bioprintSmokeReport = r; }, report);
  return report;
};
