// Run with the connected Playwright code runner (no application dependency).
// Bounded halves for the 60 s runner cap: default runs part 'c-d';
// set globalThis.__BIOPRINT_SMOKE_PART = 'e' first for the exchange half.
async page => {
  const started = Date.now();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const waitFor = async (probe, message, timeoutMs = 30000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await page.evaluate(probe)) return;
      await page.waitForTimeout(150);
    }
    throw new Error(`timeout waiting for ${message}`);
  };
  await page.goto('http://127.0.0.1:8096/');
  // Part selection: page localStorage survives reloads and runner-call boundaries.
  const part = (await page.evaluate(() => localStorage.getItem('bioprintSmokePart'))) || globalThis.__BIOPRINT_SMOKE_PART || 'c-d';
  await page.evaluate(() => localStorage.removeItem('bioprintSmokePart'));
  await waitFor(() => Boolean(window.bioprintingWorkbench?.diagnostics().analyses.oxygen3d?.converged), 'oxygen3d convergence');
  const expect = (value, message) => { if (!value) throw new Error(message); };
  const diagnostics = () => page.evaluate(() => window.bioprintingWorkbench.diagnostics());
  const scenarioBytes = () => page.evaluate(() => JSON.stringify(window.bioprintingWorkbench.exportScenario()));
  const openArea = async area => page.evaluate(name => document.querySelector(`[data-workspace-target="${name}"]`).click(), area);
  const text = async selector => page.evaluate(sel => document.querySelector(sel)?.textContent ?? '', selector);
  const passed = [];
  const baseline = await scenarioBytes();

  if (part === 'c-d') {
    // Phase C: discrete scale switching with explicit unknown-scale labelling.
    await openArea('models');
    for (const scale of ['construct', 'cell', 'tissue-context', 'laboratory']) {
      await page.locator('#presentation-scale').selectOption(scale);
      expect((await diagnostics()).graphics.presentationScale === scale, `scale ${scale} applied`);
    }
    await page.locator('#presentation-scale').selectOption('cell');
    expect(/unknown/i.test(await text('#presentation-notice')), 'cell scale notice says scale unknown');
    await page.locator('#presentation-scale').selectOption('laboratory');
    passed.push('scale switching incl. scale-unknown label');

    // Overlays: <=4 active, complete legends, 5th rejected, no scenario writes.
    await page.evaluate(() => { for (const input of document.querySelectorAll('#presentation-overlay-list input')) input.click(); });
    const graphics = (await diagnostics()).graphics;
    expect(graphics.activeOverlays.length === 4, `overlay cap holds at 4 (got ${graphics.activeOverlays.length})`);
    expect((await text('#presentation-selection')).length > 0, '5th overlay rejection surfaced');
    expect((await text('#presentation-legend')).includes('unit'), 'legend rows carry units');
    await page.evaluate(() => { for (const input of document.querySelectorAll('#presentation-overlay-list input')) if (input.checked) input.click(); });
    expect((await text('#presentation-legend')).includes('No overlay active'), 'empty legend state');
    expect(await scenarioBytes() === baseline, 'presentation changes never touch scenario bytes');
    passed.push('overlay cap/legends; scenario bytes invariant');

    // Magnified inset toggle (studio) is diagnostics-visible and frame-labelled.
    await openArea('studio');
    await page.locator('#magnify-construct').check();
    const magnified = (await diagnostics()).graphics.magnified;
    expect(magnified.enabled === true && magnified.lastError === null, 'magnified inset enabled and fitting');
    expect(await page.locator('#magnifier-frame').isVisible(), 'inset frame visible');
    await page.locator('#magnify-construct').uncheck();
    expect((await diagnostics()).graphics.magnified.enabled === false, 'magnified inset disabled');
    expect(await scenarioBytes() === baseline, 'magnify never touches scenario bytes');
    passed.push('magnified construct inset toggle');

    // WebGL health (fallback banner stays hidden while WebGL works).
    expect((await diagnostics()).graphics.webgl === true, 'webgl active');
    expect(await page.locator('#webgl-error').isHidden(), 'fallback banner hidden');
    passed.push('webgl health + fallback banner state');
  }

  if (part === 'c-d') {
    // Phase D: bounded sweep completes with ranges-only summary and zero scenario writes.
    await openArea('models');
    await page.locator('#sweep-run').click();
    await waitFor(() => document.querySelector('#sweep-summary').textContent.length > 0, 'sweep summary');
    expect((await text('#sweep-summary')).includes('Ranges reported'), 'ranges/slopes-only summary');
    expect(await page.locator('#sweep-results tr').count() === 5, 'five sweep points rendered');
    expect(await scenarioBytes() === baseline, 'sweep never writes scenario');
    passed.push('sweep completion; ranges-only summary');

    // Cancel actually stops work: no results delivered, previous summary retained.
    // Axes accept 2..10 explicit values; run+cancel dispatch in one tick so the abort
    // always lands before any result can render, regardless of run duration.
    await page.evaluate(() => {
      document.querySelector('#sweep-values').value = Array.from({ length: 10 }, (_, i) => (i * 0.2).toFixed(1)).join(',');
      document.querySelector('#sweep-run').click();
      document.querySelector('#sweep-cancel').click();
    });
    await waitFor(() => document.querySelector('#sweep-status').textContent.includes('Sweep cancelled'), 'sweep cancel');
    expect((await text('#sweep-status')) === 'Sweep cancelled. No scenario values were changed.', 'cancel status verbatim');
    expect(await page.locator('#sweep-results tr').count() === 5, 'cancelled run delivered no rows');
    expect((await text('#sweep-summary')).includes('Ranges reported'), 'last valid summary retained');
    expect(await scenarioBytes() === baseline, 'cancel never writes scenario');
    passed.push('sweep cancel stops work without scenario writes');

    // Keyboard equivalence: activating a camera control by keyboard equals clicking it.
    await openArea('studio');
    await page.locator('[data-camera="construct"]').focus();
    await page.keyboard.press('Enter');
    expect((await diagnostics()).graphics.cameraMode === 'construct', 'keyboard activation switches camera');
    expect(await page.locator('[data-camera="construct"]').getAttribute('aria-pressed') === 'true', 'aria-pressed follows keyboard');
    passed.push('keyboard activation equivalence');
  }

  if (part === 'e') {
    // Phase E: import is preview-first and inert; hostile strings render as text.
    const hostile = {
      schema: 'bioprinting-workbench/research-exchange/1', bundleId: 'bundle-xss', createdAt: '2026-11-03T12:00:00Z',
      producer: { application: 'smoke', version: '1', executedBy: 'agent' },
      sourceRevision: { commit: null, dirty: true, implementationSha256: null },
      hypotheses: [{
        id: 'hyp-x', revision: 1, title: '<img src=x onerror=alert(1)>', question: 'q', scope: 's', claimBoundary: 'cb',
        status: 'draft', system: 'sys', mechanism: 'm',
        alternatives: [{ id: 'a1', prediction: 'p', falsifier: 'f' }, { id: 'a2', prediction: 'p', falsifier: 'f' }],
        predictions: [], falsifiers: [], confounders: [], missingMeasurements: [], modelIds: [],
        supportingEvidenceIds: [], contradictingEvidenceIds: [], queryPlanIds: [], parentHypothesisIds: [],
        authorship: { createdBy: 'agent', method: 'smoke', reviewedBy: null }, reviewStatus: 'unreviewed',
      }],
      queries: [], modelRuns: [], evidence: [], artifacts: [],
      privacyClassification: 'private', publicationReviewStatus: 'not-approved',
    };
    await openArea('research');
    await page.locator('#cockpit-import').setInputFiles({ name: 'bundle.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(hostile)) });
    await waitFor(() => document.querySelector('#cockpit-status').textContent.includes('Preview ready'), 'cockpit preview');
    expect((await text('#cockpit-status')).includes('Nothing has been applied'), 'preview is inert');
    expect(await scenarioBytes() === baseline, 'preview never touches scenario');
    expect(await page.locator('#cockpit-apply').isEnabled(), 'apply offered after clean preview');
    passed.push('preview inert; scenario unchanged');

    // Apply is explicit; export stays notes-free; reimport is an idempotent duplicate.
    await page.locator('#cockpit-apply').click();
    expect((await text('#cockpit-cards')).includes('<img src=x onerror=alert(1)>'), 'hostile title present as raw text');
    await page.locator('#cockpit-export').click();
    const exported = await page.locator('#cockpit-export-output').inputValue();
    const bundle = JSON.parse(exported);
    expect(bundle.schema === 'bioprinting-workbench/research-exchange/1', 'export bundle schema');
    expect(bundle.publicationReviewStatus === 'not-approved', 'exports stay not-approved');
    expect(await scenarioBytes() === baseline, 'apply/export never touch scenario');
    await page.locator('#cockpit-import').setInputFiles({ name: 'again.json', mimeType: 'application/json', buffer: Buffer.from(exported) });
    await waitFor(() => document.querySelector('#cockpit-preview').textContent.includes('identical duplicates'), 'idempotent duplicate preview');
    expect((await text('#cockpit-preview')).includes('1 identical duplicates (idempotent)'), 'reimport duplicate is idempotent');
    passed.push('explicit apply; export round-trip idempotent');

    // Explanatory cross-sections render with quoted bands and the standing disclaimer.
    await openArea('models');
    const sections = await text('#vascular-cross-sections');
    expect((sections.match(/Schematic cross-sections, not to scale/g) || []).length === 3, 'three disclaimers');
    expect(sections.includes('100–300 µm') && sections.includes('10–50 µm') && sections.includes('not modeled'), 'quoted bands and the gap');
    passed.push('cross-sections render with quoted bands + disclaimers');
  }

  // Responsive framing without horizontal overflow in every area (both halves).
  await page.setViewportSize({ width: 390, height: 844 });
  for (const area of ['studio', 'models', 'research', 'evidence']) {
    await openArea(area);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `390px overflow in ${area}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect(errors.length === 0, errors.join('\n'));
  const report = { part, elapsedMs: Date.now() - started, passed };
  await page.evaluate(r => { window.bioprintSmokeReport = r; }, report);
  return report;
};


