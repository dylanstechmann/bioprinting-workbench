// Settled resource matrix (Phase A gap): 10 cycles x {lab,treedome} x {low,balanced,high}
// sampling renderer resource counts. Run five times via the code runner, parts 'm1'..'m5'
// (cycles 0-2, 2-4, 4-6, 6-8, 8-10; two cycles per run stay under the 60 s runner cap);
// select the part with localStorage 'bioprintSmokePart'. Settled = two identical
// consecutive samples 250 ms apart. Settled-cycle counts only, explicitly not a
// GPU-leak certificate and not an FPS or performance claim.
async page => {
  const started = Date.now();
  const waitFor = async (probe, message, timeoutMs = 30000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await page.evaluate(probe)) return;
      await page.waitForTimeout(150);
    }
    throw new Error(`timeout waiting for ${message}`);
  };
  await page.goto('http://127.0.0.1:8096/');
  const part = (await page.evaluate(() => localStorage.getItem('bioprintSmokePart'))) || 'm1';
  await page.evaluate(() => localStorage.removeItem('bioprintSmokePart'));
  await waitFor(() => Boolean(window.bioprintingWorkbench?.diagnostics().analyses.oxygen3d?.converged), 'oxygen3d convergence');
  await page.evaluate(() => document.querySelector('[data-workspace-target="studio"]').click());
  const sample = () => page.evaluate(() => {
    const g = window.bioprintingWorkbench.diagnostics().graphics;
    return { geometries: g.geometries, textures: g.textures, calls: g.calls };
  });
  const partIndex = Number(part.replace('m', '')) || 1;
  const [first, last] = [(partIndex - 1) * 2, partIndex * 2];
  const rows = [];
  for (let cycle = first; cycle < last; cycle++) {
    for (const environment of ['lab', 'treedome']) {
      for (const quality of ['low', 'balanced', 'high']) {
        await page.evaluate(([env, qual]) => {
          const set = (id, value) => { const el = document.getElementById(id); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); };
          set('environment', env);
          set('render-quality', qual);
        }, [environment, quality]);
        let settled = null;
        for (let attempt = 0; attempt < 4 && !settled; attempt++) {
          const a = await sample();
          await page.waitForTimeout(250);
          const b = await sample();
          if (JSON.stringify(a) === JSON.stringify(b)) settled = a;
        }
        if (!settled) throw new Error(`counts did not settle for cycle ${cycle} ${environment} ${quality}`);
        rows.push({ cycle, environment, quality, ...settled });
      }
    }
  }
  return { part, viewport: page.viewportSize(), rows, elapsedMs: Date.now() - started };
};
