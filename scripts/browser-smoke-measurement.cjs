const assert = require('node:assert/strict');
const { once } = require('node:events');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright-core');

async function checkFit(browser, url, disableWebGL) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    if (disableWebGL) {
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null;
          return original.call(this, type, ...args);
        };
      });
    }
    await page.goto(url);
    await page.waitForFunction(() => window.bioprintingWorkbench?.diagnostics().analyses.oxygen3d?.converged);
    assert.equal(await page.locator('#webgl-error').isVisible(), disableWebGL);
    await page.locator('[data-workspace-target="models"]').first().click();
    const original = await page.evaluate(async () => {
      const { oxygen3DExample } = await import('/src/calibration3d.js');
      return oxygen3DExample();
    });
    const bytes = Buffer.from(original);
    await page.locator('#fit3d-file').setInputFiles({
      name: 'synthetic-example.json', mimeType: 'application/json', buffer: bytes,
    });
    await page.waitForFunction(() => !document.querySelector('#fit3d-apply').disabled);
    const apply = page.locator('#fit3d-apply');
    await apply.click();
    assert.equal(await apply.isDisabled(), true);
    const receipt = page.locator('#fit3d-provenance');
    const saved = await receipt.textContent();
    const { dataset, fitRun } = JSON.parse(saved);
    assert.equal(dataset.rawSha256, createHash('sha256').update(bytes).digest('hex'));
    assert.equal(dataset.normalizedSha256, fitRun.datasetSha256);
    assert.equal(fitRun.applied, true);
    await apply.dispatchEvent('click');
    assert.equal(await receipt.textContent(), saved);
    assert.deepEqual(errors, []);
    console.log('Synthetic measurement import and application passed, WebGL ' + (disableWebGL ? 'unavailable' : 'active'));
  } finally {
    await page.close();
  }
}

async function main() {
  const { createStaticServer } = await import('./serve.mjs');
  const server = createStaticServer({ root: path.resolve(__dirname, '..') });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });
    try {
      const url = 'http://127.0.0.1:' + server.address().port;
      await checkFit(browser, url, false);
      await checkFit(browser, url, true);
    } finally {
      await browser.close();
    }
  } finally {
    server.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
